/// <reference types="@cloudflare/workers-types" />
// Servidor da Vitrine Blindada IA (Cloudflare Workers + D1).
// Serve o app (pasta dist) e a API: login, dados na nuvem, IA no servidor e webhook da Greenn.

import { aiCompareImages, aiExtractPolicies, aiReview, aiRewrite } from '../src/ai';
import { CATEGORIES, SEED_POLICIES } from '../src/data/policies';
import { SEED_SOURCES } from '../src/data/sources';
import type { Policy, Settings } from '../src/types';
import { parseGreenn, readBody } from './greenn';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAIL: string;
  GREENN_TOKEN: string;
  ANTHROPIC_API_KEY?: string;
  AI_MODEL?: string;
  AI_MONTHLY_LIMIT?: string;
  AI_VISION_MODEL?: string;
}

const GLOBAL = '__global__';
const USER_STORES = new Set(['products', 'analyses', 'docs', 'violations']);
const GLOBAL_STORES = new Set(['policies', 'sources']);
const GLOBAL_META = new Set(['kbVersion', 'kbUpdatedAt', 'seedVersion']);
const USER_META = new Set(['settings']);
const SEED_VERSION = 2;
const SESSION_DAYS = 30;
const MAX_ROW = 1_900_000; // limite de linha do D1 é ~2 MB

type User = { id: string; email: string; role: 'admin' | 'assinante' };

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const err = (status: number, message: string) => json({ error: message }, status);
const now = () => new Date().toISOString();

// ───────── senhas e sessões
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const randHex = (n: number) => hex(crypto.getRandomValues(new Uint8Array(n)).buffer);

async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256);
  return hex(bits);
}
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function cookie(req: Request, name: string) {
  const m = (req.headers.get('cookie') ?? '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m?.[1];
}

async function currentUser(req: Request, env: Env): Promise<User | null> {
  const t = cookie(req, 'vb_session');
  if (!t) return null;
  const row = await env.DB.prepare(
    'SELECT u.id, u.email, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?',
  )
    .bind(await sha256(t))
    .first<User & { expires_at: string }>();
  if (!row || row.expires_at < now()) return null;
  return { id: row.id, email: row.email, role: row.role };
}

async function startSession(env: Env, userId: string, secure: boolean) {
  const token = randHex(32);
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), userId, exp).run();
  return `vb_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

async function hasAccess(env: Env, email: string) {
  if (email === env.ADMIN_EMAIL?.toLowerCase()) return true;
  const s = await env.DB.prepare('SELECT active FROM subscriptions WHERE email = ?').bind(email).first<{ active: number }>();
  return s?.active === 1;
}

// ───────── base global (políticas)
async function ensureSeed(env: Env) {
  const v = await env.DB.prepare('SELECT value FROM meta WHERE owner = ? AND key = ?').bind(GLOBAL, 'seedVersion').first<{ value: string }>();
  if (v && JSON.parse(v.value) >= SEED_VERSION) return;
  const t = now();
  const stmts = [
    ...SEED_SOURCES.map((s) =>
      env.DB.prepare('INSERT OR IGNORE INTO docs (owner, store, id, data, updated_at) VALUES (?, ?, ?, ?, ?)').bind(GLOBAL, 'sources', s.id, JSON.stringify(s), t),
    ),
    ...SEED_POLICIES.map((p) =>
      env.DB.prepare('INSERT OR IGNORE INTO docs (owner, store, id, data, updated_at) VALUES (?, ?, ?, ?, ?)').bind(GLOBAL, 'policies', p.id, JSON.stringify(p), t),
    ),
    env.DB.prepare('INSERT OR REPLACE INTO meta (owner, key, value) VALUES (?, ?, ?)').bind(GLOBAL, 'seedVersion', JSON.stringify(SEED_VERSION)),
    env.DB.prepare('INSERT OR IGNORE INTO meta (owner, key, value) VALUES (?, ?, ?)').bind(GLOBAL, 'kbVersion', '1'),
  ];
  await env.DB.batch(stmts);
}

async function bumpKb(env: Env) {
  const v = await env.DB.prepare('SELECT value FROM meta WHERE owner = ? AND key = ?').bind(GLOBAL, 'kbVersion').first<{ value: string }>();
  const next = (v ? JSON.parse(v.value) : 1) + 1;
  await env.DB.batch([
    env.DB.prepare('INSERT OR REPLACE INTO meta (owner, key, value) VALUES (?, ?, ?)').bind(GLOBAL, 'kbVersion', JSON.stringify(next)),
    env.DB.prepare('INSERT OR REPLACE INTO meta (owner, key, value) VALUES (?, ?, ?)').bind(GLOBAL, 'kbUpdatedAt', JSON.stringify(now())),
  ]);
}

async function globalPolicies(env: Env): Promise<Policy[]> {
  const r = await env.DB.prepare('SELECT data FROM docs WHERE owner = ? AND store = ?').bind(GLOBAL, 'policies').all<{ data: string }>();
  return r.results.map((x) => JSON.parse(x.data));
}

// ───────── IA no servidor
async function aiQuota(env: Env, user: User) {
  const limit = Number(env.AI_MONTHLY_LIMIT ?? '200');
  if (user.role === 'admin') return true;
  const month = now().slice(0, 7);
  const row = await env.DB.prepare('SELECT calls FROM ai_usage WHERE user_id = ? AND month = ?').bind(user.id, month).first<{ calls: number }>();
  if ((row?.calls ?? 0) >= limit) return false;
  await env.DB.prepare('INSERT INTO ai_usage (user_id, month, calls) VALUES (?, ?, 1) ON CONFLICT(user_id, month) DO UPDATE SET calls = calls + 1')
    .bind(user.id, month)
    .run();
  return true;
}

async function handleAI(req: Request, env: Env, user: User, kind: string) {
  if (!env.ANTHROPIC_API_KEY) return err(503, 'IA não configurada no servidor.');
  if (kind === 'extract' && user.role !== 'admin') return err(403, 'Somente a administradora atualiza a base de políticas.');
  if (!(await aiQuota(env, user))) return err(429, 'Limite mensal de uso da IA atingido no seu plano.');
  const settings: Settings = { apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL || 'claude-opus-5-5', effort: 'medium' };
  const body = (await req.json()) as Record<string, never>;
  const policies = await globalPolicies(env);
  try {
    if (kind === 'review') return json(await aiReview(settings, body.input, policies, body.product));
    if (kind === 'rewrite') return json(await aiRewrite(settings, body.text, body.findings, policies, body.product));
    if (kind === 'extract') return json(await aiExtractPolicies(settings, body.text, CATEGORIES));
    if (kind === 'compare') {
      const vs = { ...settings, visionModel: env.AI_VISION_MODEL || 'claude-sonnet-5-5' };
      const l = (body.listing as unknown as string[]) ?? [];
      const fr = (body.frames as unknown as string[]) ?? [];
      if (!l.length || !fr.length || l.length + fr.length > 10) return err(400, 'Envie de 1 a 4 fotos do anúncio e de 1 a 6 quadros.');
      return json(await aiCompareImages(vs, l, fr, body.product));
    }
  } catch (e) {
    return err(502, (e as Error).message);
  }
  return err(404, 'Função de IA desconhecida.');
}

// ───────── webhook Greenn
async function handleGreenn(req: Request, env: Env, url: URL) {
  const token = url.searchParams.get('token') ?? req.headers.get('x-webhook-token') ?? '';
  if (!env.GREENN_TOKEN || !safeEqual(token, env.GREENN_TOKEN)) return err(401, 'Token inválido.');
  const body = await readBody(req);
  const ev = parseGreenn(body);
  const raw = JSON.stringify(body).slice(0, 50_000);
  let action = ev.action === 'liberar' ? 'liberado' : ev.action === 'bloquear' ? 'bloqueado' : 'ignorado';
  try {
    if (ev.email && ev.action !== 'ignorar') {
      await env.DB.prepare(
        `INSERT INTO subscriptions (email, active, status, source, ref, product, updated_at) VALUES (?, ?, ?, 'greenn', ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET active = excluded.active, status = excluded.status, source = 'greenn', ref = excluded.ref, product = excluded.product, updated_at = excluded.updated_at`,
      )
        .bind(ev.email, ev.action === 'liberar' ? 1 : 0, ev.status ?? null, ev.ref ?? null, ev.product ?? null, now())
        .run();
      if (ev.action === 'bloquear') {
        await env.DB.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)').bind(ev.email).run();
      }
    }
  } catch (e) {
    action = 'erro';
    console.error(e);
  }
  await env.DB.prepare('INSERT INTO webhook_log (received_at, email, status, action, payload) VALUES (?, ?, ?, ?, ?)')
    .bind(now(), ev.email ?? null, ev.status ?? null, action, raw)
    .run();
  return json({ ok: true, action });
}

// ───────── roteador
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(req);
    const secure = url.protocol === 'https:';

    try {
      if (path === '/api/webhook/greenn' && req.method === 'POST') return await handleGreenn(req, env, url);

      // ── autenticação
      if (path === '/api/auth/register' && req.method === 'POST') {
        const { email: e, password } = (await req.json()) as { email?: string; password?: string };
        const email = (e ?? '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(400, 'E-mail inválido.');
        if (!password || password.length < 8) return err(400, 'A senha precisa ter pelo menos 8 caracteres.');
        if (!(await hasAccess(env, email)))
          return err(403, 'Não encontramos assinatura ativa para este e-mail. Use o mesmo e-mail da compra na Green.');
        const existing = await env.DB.prepare('SELECT id, pass_hash FROM users WHERE email = ?').bind(email).first<{ id: string; pass_hash: string }>();
        const salt = randHex(16);
        if (existing && existing.pass_hash) return err(409, 'Este e-mail já tem cadastro. Faça login.');
        if (existing) {
          // senha resetada pela administradora: mantém a conta e os dados
          await env.DB.prepare('UPDATE users SET pass_hash = ?, pass_salt = ? WHERE id = ?').bind(await hashPassword(password, salt), salt, existing.id).run();
          return json({ email }, 200, { 'set-cookie': await startSession(env, existing.id, secure) });
        }
        const id = 'usr_' + randHex(8);
        const role = email === env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'assinante';
        await env.DB.prepare('INSERT INTO users (id, email, pass_hash, pass_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, email, await hashPassword(password, salt), salt, role, now())
          .run();
        return json({ email, role }, 200, { 'set-cookie': await startSession(env, id, secure) });
      }
      if (path === '/api/auth/login' && req.method === 'POST') {
        const { email: e, password } = (await req.json()) as { email?: string; password?: string };
        const email = (e ?? '').trim().toLowerCase();
        const u = await env.DB.prepare('SELECT id, role, pass_hash, pass_salt FROM users WHERE email = ?')
          .bind(email)
          .first<{ id: string; role: string; pass_hash: string; pass_salt: string }>();
        if (!u || !u.pass_hash || !safeEqual(await hashPassword(password ?? '', u.pass_salt), u.pass_hash)) return err(401, 'E-mail ou senha incorretos.');
        if (!(await hasAccess(env, email))) return err(403, 'Sua assinatura não está ativa. Verifique o pagamento na Green.');
        return json({ email, role: u.role }, 200, { 'set-cookie': await startSession(env, u.id, secure) });
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        const t = cookie(req, 'vb_session');
        if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(t)).run();
        return json({ ok: true }, 200, { 'set-cookie': 'vb_session=; Path=/; HttpOnly; Max-Age=0' });
      }

      const user = await currentUser(req, env);
      if (!user) return err(401, 'Faça login.');
      if (!(await hasAccess(env, user.email))) return err(403, 'Assinatura inativa.');

      if (path === '/api/me') return json({ email: user.email, role: user.role, ai: !!env.ANTHROPIC_API_KEY });

      // ── dados
      const m = path.match(/^\/api\/data\/(\w+)(?:\/(.+))?$/);
      if (m) {
        const [, store, rawId] = m;
        const id = rawId ? decodeURIComponent(rawId) : undefined;
        const isGlobal = GLOBAL_STORES.has(store);
        if (!isGlobal && !USER_STORES.has(store)) return err(404, 'Coleção desconhecida.');
        if (isGlobal) await ensureSeed(env);
        const owner = isGlobal ? GLOBAL : user.id;
        if (req.method === 'GET' && !id) {
          const r = await env.DB.prepare('SELECT data FROM docs WHERE owner = ? AND store = ?').bind(owner, store).all<{ data: string }>();
          return json(r.results.map((x) => JSON.parse(x.data)));
        }
        if (isGlobal && req.method !== 'GET' && user.role !== 'admin') return err(403, 'Somente a administradora altera a base de políticas.');
        if (req.method === 'PUT' && id) {
          const data = await req.text();
          if (data.length > MAX_ROW) return err(413, 'Arquivo grande demais (limite de ~1,9 MB por item). Reduza as fotos ou o documento.');
          await env.DB.prepare('INSERT OR REPLACE INTO docs (owner, store, id, data, updated_at) VALUES (?, ?, ?, ?, ?)').bind(owner, store, id, data, now()).run();
          if (isGlobal) await bumpKb(env);
          return json({ ok: true });
        }
        if (req.method === 'DELETE' && id) {
          await env.DB.prepare('DELETE FROM docs WHERE owner = ? AND store = ? AND id = ?').bind(owner, store, id).run();
          if (isGlobal) await bumpKb(env);
          return json({ ok: true });
        }
        return err(405, 'Método não permitido.');
      }

      const mm = path.match(/^\/api\/meta\/(\w+)$/);
      if (mm) {
        const key = mm[1];
        const isGlobal = GLOBAL_META.has(key);
        if (!isGlobal && !USER_META.has(key)) return err(404, 'Chave desconhecida.');
        if (isGlobal) await ensureSeed(env);
        const owner = isGlobal ? GLOBAL : user.id;
        if (req.method === 'GET') {
          const r = await env.DB.prepare('SELECT value FROM meta WHERE owner = ? AND key = ?').bind(owner, key).first<{ value: string }>();
          return json(r ? JSON.parse(r.value) : null);
        }
        if (req.method === 'PUT') {
          if (isGlobal) return err(403, 'A versão da base é controlada pelo servidor.');
          await env.DB.prepare('INSERT OR REPLACE INTO meta (owner, key, value) VALUES (?, ?, ?)').bind(owner, key, await req.text()).run();
          return json({ ok: true });
        }
      }

      const ai = path.match(/^\/api\/ai\/(\w+)$/);
      if (ai && req.method === 'POST') return await handleAI(req, env, user, ai[1]);

      // ── administração
      if (path.startsWith('/api/admin/')) {
        if (user.role !== 'admin') return err(403, 'Acesso restrito.');
        if (path === '/api/admin/subscribers' && req.method === 'GET') {
          const r = await env.DB.prepare(
            `SELECT s.email, s.active, s.status, s.source, s.product, s.updated_at, (u.id IS NOT NULL) AS registered
             FROM subscriptions s LEFT JOIN users u ON u.email = s.email ORDER BY s.updated_at DESC`,
          ).all();
          return json(r.results);
        }
        if (path === '/api/admin/access' && req.method === 'POST') {
          const { email: e, active } = (await req.json()) as { email?: string; active?: boolean };
          const email = (e ?? '').trim().toLowerCase();
          if (!email) return err(400, 'Informe o e-mail.');
          await env.DB.prepare(
            `INSERT INTO subscriptions (email, active, status, source, updated_at) VALUES (?, ?, 'manual', 'manual', ?)
             ON CONFLICT(email) DO UPDATE SET active = excluded.active, status = 'manual', source = 'manual', updated_at = excluded.updated_at`,
          )
            .bind(email, active ? 1 : 0, now())
            .run();
          if (!active) await env.DB.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)').bind(email).run();
          return json({ ok: true });
        }
        if (path === '/api/admin/reset-user' && req.method === 'POST') {
          const { email: e } = (await req.json()) as { email?: string };
          const email = (e ?? '').trim().toLowerCase();
          await env.DB.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)').bind(email).run();
          await env.DB.prepare("UPDATE users SET pass_hash = '' WHERE email = ? AND role != 'admin'").bind(email).run();
          return json({ ok: true });
        }
        if (path === '/api/admin/webhooks' && req.method === 'GET') {
          const r = await env.DB.prepare('SELECT id, received_at, email, status, action, payload FROM webhook_log ORDER BY id DESC LIMIT 100').all();
          return json(r.results);
        }
      }
      return err(404, 'Rota não encontrada.');
    } catch (e) {
      console.error(e);
      return err(500, 'Erro interno.');
    }
  },
};
