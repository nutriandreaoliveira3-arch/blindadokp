// API da Blindada Intelligence v2 (Cloudflare Pages Functions + D1)
import { calcularScore, SINAIS, parseAlvo } from '../lib/score.js';
import { processarResultados } from '../lib/extrair.js';
import { completarGratis, completarComResultados, consultaPara } from '../lib/completar.js';
import { aleatorio, sha256, hashSenha, igual, criarSessao, sessaoValida, lerCookie, cookieSessao, senhaForte, ITERACOES } from '../lib/auth.js';

// Chaves internas que nunca saem do servidor
const SECRETAS = ['senha_hash', 'senha_sal', 'senha_iter', 'sessao_segredo', 'setup_codigo_hash', 'tavily_key', 'login_falhas', 'login_bloqueio_ate'];
const getCfg = async (db, k) => (await db.prepare('SELECT valor FROM config WHERE chave = ?').bind(k).first())?.valor ?? null;
const setCfg = (db, k, v) => db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(k, v === null ? null : String(v)).run();
const tavilyKey = async (env, db) => env.TAVILY_API_KEY || (await getCfg(db, 'tavily_key'));

async function rotasAuth(db, request, sub, body, m) {
  const temSenha = Boolean(await getCfg(db, 'senha_hash'));
  if (sub === 'estado' && m === 'GET') {
    const seg = await getCfg(db, 'sessao_segredo');
    return json({ configurada: temSenha, logado: temSenha && await sessaoValida(lerCookie(request), seg) });
  }
  if (sub === 'setup' && m === 'POST') {
    if (temSenha) return erro('A senha já foi criada. Use a tela de entrar.', 409);
    const codHash = await getCfg(db, 'setup_codigo_hash');
    const cod = String(body.codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); // aceita minúsculas, espaços e sem traços
    if (!codHash || !igual(await sha256(cod), codHash)) return erro('Código de primeiro acesso inválido. Confira letra por letra (pode digitar sem os traços).', 403);
    const fraca = senhaForte(body.senha || ''); if (fraca) return erro(fraca);
    const sal = aleatorio(16); const seg = aleatorio(32);
    await setCfg(db, 'senha_sal', sal);
    await setCfg(db, 'senha_iter', ITERACOES);
    await setCfg(db, 'senha_hash', await hashSenha(body.senha, sal));
    await setCfg(db, 'sessao_segredo', seg);
    await db.prepare("DELETE FROM config WHERE chave = 'setup_codigo_hash'").run(); // código vale uma vez só
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': cookieSessao(await criarSessao(seg)) } });
  }
  if (sub === 'login' && m === 'POST') {
    if (!temSenha) return erro('Crie a senha primeiro.', 409);
    const ate = Number(await getCfg(db, 'login_bloqueio_ate') || 0);
    if (ate > Date.now()) return erro(`Muitas tentativas. Tente de novo em ${Math.ceil((ate - Date.now()) / 60000)} min.`, 429);
    const sal = await getCfg(db, 'senha_sal'); const iter = Number(await getCfg(db, 'senha_iter') || ITERACOES);
    const ok = igual(await hashSenha(String(body.senha || ''), sal, iter), await getCfg(db, 'senha_hash'));
    if (!ok) {
      const f = Number(await getCfg(db, 'login_falhas') || 0) + 1;
      await setCfg(db, 'login_falhas', f >= 5 ? 0 : f);
      if (f >= 5) await setCfg(db, 'login_bloqueio_ate', Date.now() + 15 * 60000);
      return erro('Senha incorreta.', 401);
    }
    await setCfg(db, 'login_falhas', 0);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': cookieSessao(await criarSessao(await getCfg(db, 'sessao_segredo'))) } });
  }
  if (sub === 'sair' && m === 'POST') {
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': cookieSessao('', true) } });
  }
  return erro('Rota não encontrada.', 404);
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const erro = (msg, status = 400) => json({ erro: msg }, status);

const CAMPOS = ['nome', 'cargo', 'profissao', 'empresa', 'site_empresa', 'porte', 'anos_atuacao', 'cidade', 'uf',
  'instagram', 'linkedin', 'email', 'whatsapp', 'contato_direto', 'fonte_url', 'fonte_desc', 'origem', 'etapa',
  'motivo_perda', 'proxima_acao', 'data_proxima', 'valor_proposta', 'anotacoes', 'teste', 'coletado_em'];

export const ETAPAS = ['Novo lead', 'Aquecendo', 'Contatado', 'Respondeu', 'Conversa iniciada', 'Formulário enviado',
  'Aplicou', 'Call agendada', 'Call feita', 'Proposta', 'Cliente', 'Follow-up futuro', 'Sem interesse', 'Perdido'];

const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const soDigitos = (s) => (s || '').toString().replace(/\D/g, '');
function chavesBloqueio(l) {
  const k = [];
  if (l.email) k.push('e:' + norm(l.email));
  if (l.whatsapp && soDigitos(l.whatsapp).length >= 8) k.push('t:' + soDigitos(l.whatsapp).slice(-9));
  if (l.nome) k.push('n:' + norm(l.nome) + '|' + norm(l.empresa));
  return k;
}

function limpar(body) {
  const o = {};
  for (const c of CAMPOS) if (body[c] !== undefined) {
    let v = body[c];
    if (typeof v === 'string') v = v.trim();
    if (v === '') v = null;
    if (['anos_atuacao'].includes(c) && v !== null) v = parseInt(v, 10) || null;
    if (['valor_proposta'].includes(c) && v !== null) v = Number(String(v).replace(/[^\d.,]/g, '').replace(',', '.')) || null;
    if (['contato_direto', 'teste'].includes(c)) v = v ? 1 : 0;
    o[c] = v;
  }
  if (o.etapa && !ETAPAS.includes(o.etapa)) delete o.etapa;
  return o;
}

async function sinaisDe(db, id) {
  return (await db.prepare('SELECT * FROM sinais WHERE lead_id = ? ORDER BY criado_em').bind(id).all()).results;
}

async function alvoDe(db) {
  const rows = (await db.prepare("SELECT chave, valor FROM config WHERE chave IN ('profissoes_alvo','regioes_alvo')").all()).results;
  return parseAlvo(Object.fromEntries(rows.map((r) => [r.chave, r.valor])));
}

async function recalcular(db, id) {
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!lead) return null;
  const sinais = await sinaisDe(db, id);
  const s = calcularScore(lead, sinais, await alvoDe(db));
  await db.prepare('UPDATE leads SET score = ?, atualizado_em = datetime(\'now\') WHERE id = ?').bind(s.total, id).run();
  return { ...lead, score: s.total, sinais, analise: s };
}

async function bloqueado(db, l) {
  for (const k of chavesBloqueio(l)) {
    if (await db.prepare('SELECT 1 FROM nao_contatar WHERE chave = ?').bind(k).first()) return true;
  }
  return false;
}

async function duplicado(db, l) {
  if (l.email) { const r = await db.prepare('SELECT id FROM leads WHERE lower(email) = lower(?)').bind(l.email).first(); if (r) return r.id; }
  // Telefone igual NÃO é duplicata: sócias do mesmo escritório costumam dividir o número.
  if (l.nome) {
    const rows = (await db.prepare('SELECT id, nome, empresa FROM leads WHERE lower(nome) = lower(?)').bind(l.nome).all()).results;
    const r = rows.find((x) => norm(x.empresa) === norm(l.empresa)); if (r) return r.id;
  }
  return null;
}

async function inserirLead(db, dados) {
  const l = limpar(dados);
  if (!l.nome) throw new Error('Nome é obrigatório.');
  if (await bloqueado(db, l)) return { status: 'bloqueado' };
  const dup = await duplicado(db, l);
  if (dup) return { status: 'duplicado', id: dup };
  const cols = Object.keys(l);
  const r = await db.prepare(`INSERT INTO leads (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
    .bind(...cols.map((c) => l[c])).run();
  const id = r.meta.last_row_id;
  await db.prepare('INSERT INTO atividades (lead_id, tipo, descricao) VALUES (?, ?, ?)').bind(id, 'criado', `Origem: ${l.origem || 'manual'}`).run();
  await recalcular(db, id);
  return { status: 'criado', id };
}

async function retencao(db) {
  const dias = parseInt((await db.prepare("SELECT valor FROM config WHERE chave='retencao_dias'").first())?.valor || '90', 10);
  return dias;
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}


// Busca na Tavily com cache de 24 h e trava mensal (compartilhado por Descobrir e Completar)
async function buscarTavily(env, db, consulta, max = 6) {
  const cache = await db.prepare("SELECT resultado FROM buscas WHERE lower(consulta) = lower(?) AND criado_em >= datetime('now', '-1 day') ORDER BY criado_em DESC").bind('raw:' + consulta).first();
  if (cache) return { resultados: JSON.parse(cache.resultado || '[]'), doCache: true };
  const chave = await tavilyKey(env, db);
  if (!chave) throw Object.assign(new Error('Cole a chave da Tavily em Configurações para usar a busca.'), { status: 503 });
  const limite = parseInt((await getCfg(db, 'limite_buscas_mes')) || '900', 10);
  const usadas = (await db.prepare("SELECT COUNT(*) n FROM buscas WHERE strftime('%Y-%m', criado_em) = strftime('%Y-%m', 'now')").first()).n;
  if (usadas >= limite) throw Object.assign(new Error(`Limite de ${limite} buscas do mês atingido.`), { status: 429 });
  let r;
  try {
    r = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${chave}` },
      body: JSON.stringify({ query: consulta, search_depth: 'basic', max_results: max, country: 'brazil' }) });
  } catch { throw Object.assign(new Error('Não consegui conectar ao serviço de busca (nenhum crédito gasto).'), { status: 502 }); }
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('A chave da Tavily foi recusada. Confira em Configurações.'), { status: 502 });
  if (!r.ok) throw Object.assign(new Error(`A busca falhou (Tavily ${r.status}).`), { status: 502 });
  const resultados = (await r.json()).results || [];
  await db.prepare('INSERT INTO buscas (consulta, resultado, qtd) VALUES (?, ?, ?)').bind('raw:' + consulta, JSON.stringify(resultados), resultados.length).run();
  return { resultados, doCache: false };
}

async function aplicarCompletar(db, id, novo, descricao) {
  const cols = Object.keys(novo);
  if (!cols.length) return false;
  await db.prepare(`UPDATE leads SET ${cols.map((c) => `${c} = ?`).join(', ')}, atualizado_em = datetime('now') WHERE id = ?`).bind(...cols.map((c) => novo[c]), id).run();
  await db.prepare('INSERT INTO atividades (lead_id, tipo, descricao) VALUES (?, ?, ?)').bind(id, 'dados completados', descricao).run();
  return true;
}

async function completarUmComBusca(env, db, lead) {
  const { resultados } = await buscarTavily(env, db, consultaPara(lead));
  const { novo, motivos, fontes } = completarComResultados(lead, resultados);
  await db.prepare('INSERT INTO atividades (lead_id, tipo, descricao) VALUES (?, ?, ?)').bind(lead.id, 'busca de dados', motivos.length ? 'Encontrado' : 'Nada novo encontrado').run();
  if (Object.keys(novo).length) await aplicarCompletar(db, lead.id, novo, `${motivos.join('; ')}. Fontes: ${fontes.join(' ')}. Confira antes de usar.`);
  return { campos: Object.keys(novo), motivos };
}

// ---------------- Rotas ----------------
export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return erro('Banco de dados não configurado (binding DB).', 500);
  const url = new URL(request.url);
  const partes = (params.path || []);
  const [rec, id, sub, subId] = partes;
  const m = request.method;
  let body = {};
  if (['POST', 'PUT', 'PATCH'].includes(m)) { try { body = await request.json(); } catch { body = {}; } }

  try {
    // ----- Login (rotas abertas) -----
    if (rec === 'auth') return rotasAuth(db, request, id, body, m);
    // Tudo o resto exige sessão válida
    if (!(await sessaoValida(lerCookie(request), await getCfg(db, 'sessao_segredo')))) return erro('Entre com sua senha.', 401);

    // ----- Meta -----
    if (rec === 'meta' && m === 'GET') {
      const rows = (await db.prepare('SELECT chave, valor FROM config').all()).results;
      const cfg = Object.fromEntries(rows.filter((r) => !SECRETAS.includes(r.chave)).map((r) => [r.chave, r.valor]));
      cfg.tavily_configurada = Boolean(await tavilyKey(env, db));
      return json({ etapas: ETAPAS, sinais: SINAIS, config: cfg });
    }

    // ----- Leads -----
    if (rec === 'leads') {
      if (!id && m === 'GET') {
        const q = norm(url.searchParams.get('q'));
        const etapa = url.searchParams.get('etapa');
        const classe = url.searchParams.get('classe');
        const testes = url.searchParams.get('testes') === '1';
        const dias = await retencao(db);
        let sql = `SELECT * FROM leads WHERE date(coletado_em) >= date('now', ?)`;
        const b = [`-${dias} days`];
        if (!testes) sql += ' AND teste = 0';
        if (etapa) { sql += ' AND etapa = ?'; b.push(etapa); }
        sql += ' LIMIT 5000';
        let rows = (await db.prepare(sql).bind(...b).all()).results;
        if (q) rows = rows.filter((r) => norm([r.nome, r.empresa, r.cargo, r.profissao, r.cidade, r.uf].join(' ')).includes(q));
        const sinais = (await db.prepare('SELECT lead_id, tipo FROM sinais').all()).results;
        const porLead = {};
        for (const s of sinais) (porLead[s.lead_id] ||= []).push(s.tipo);
        // Recalcula o score (regra única) e corrige o que estiver desatualizado no banco
        const desatualizados = [];
        const alvo = await alvoDe(db);
        rows = rows.map((r) => {
          const sg = porLead[r.id] || [];
          const total = calcularScore(r, sg, alvo).total;
          if (total !== r.score) desatualizados.push(db.prepare('UPDATE leads SET score = ? WHERE id = ?').bind(total, r.id));
          return { ...r, score: total, sinais: sg };
        });
        if (desatualizados.length) await db.batch(desatualizados);
        const faixa = { A: [75, 101], B: [55, 75], C: [35, 55], D: [0, 35] }[classe];
        if (faixa) rows = rows.filter((r) => r.score >= faixa[0] && r.score < faixa[1]);
        rows.sort((x, y) => y.score - x.score || String(y.atualizado_em).localeCompare(String(x.atualizado_em)));
        return json(rows.slice(0, 2000));
      }
      if (!id && m === 'POST') {
        const r = await inserirLead(db, body);
        if (r.status === 'bloqueado') return erro('Esta pessoa está na lista "Não contatar".', 409);
        if (r.status === 'duplicado') return json({ ...r, aviso: 'Já existe um lead parecido.' }, 409);
        return json(await recalcular(db, r.id), 201);
      }
      const leadId = parseInt(id, 10);
      if (!leadId) return erro('Lead inválido.');

      if (!sub && m === 'GET') {
        const l = await recalcular(db, leadId);
        if (!l) return erro('Lead não encontrado.', 404);
        l.atividades = (await db.prepare('SELECT * FROM atividades WHERE lead_id = ? ORDER BY criado_em DESC LIMIT 100').bind(leadId).all()).results;
        return json(l);
      }
      if (!sub && m === 'PUT') {
        const antes = await db.prepare('SELECT etapa FROM leads WHERE id = ?').bind(leadId).first();
        if (!antes) return erro('Lead não encontrado.', 404);
        const l = limpar(body);
        const cols = Object.keys(l);
        if (cols.length) {
          await db.prepare(`UPDATE leads SET ${cols.map((c) => `${c} = ?`).join(', ')}, atualizado_em = datetime('now') WHERE id = ?`)
            .bind(...cols.map((c) => l[c]), leadId).run();
        }
        if (l.etapa && l.etapa !== antes.etapa) {
          await db.prepare('INSERT INTO atividades (lead_id, tipo, descricao) VALUES (?, ?, ?)').bind(leadId, 'etapa', `${antes.etapa} → ${l.etapa}`).run();
        }
        return json(await recalcular(db, leadId));
      }
      if (!sub && m === 'DELETE') {
        const l = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
        if (!l) return erro('Lead não encontrado.', 404);
        if (url.searchParams.get('nao_contatar') === '1') {
          for (const k of chavesBloqueio(l)) await db.prepare('INSERT OR IGNORE INTO nao_contatar (chave) VALUES (?)').bind(k).run();
        }
        await db.prepare('DELETE FROM sinais WHERE lead_id = ?').bind(leadId).run();
        await db.prepare('DELETE FROM atividades WHERE lead_id = ?').bind(leadId).run();
        await db.prepare('DELETE FROM leads WHERE id = ?').bind(leadId).run();
        return json({ ok: true });
      }
      if (sub === 'sinais' && m === 'POST') {
        if (!SINAIS[body.tipo]) return erro('Tipo de sinal inválido.');
        await db.prepare('INSERT OR IGNORE INTO sinais (lead_id, tipo, nota, fonte_url) VALUES (?, ?, ?, ?)')
          .bind(leadId, body.tipo, body.nota || null, body.fonte_url || null).run();
        return json(await recalcular(db, leadId));
      }
      if (sub === 'sinais' && m === 'DELETE' && subId) {
        await db.prepare('DELETE FROM sinais WHERE lead_id = ? AND tipo = ?').bind(leadId, subId).run();
        return json(await recalcular(db, leadId));
      }
      if (sub === 'completar' && m === 'POST') {
        const l = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
        if (!l) return erro('Lead não encontrado.', 404);
        const g = completarGratis(l);
        if (Object.keys(g.novo).length) { await aplicarCompletar(db, leadId, g.novo, g.motivos.join('; ') + ' (sem busca)'); Object.assign(l, g.novo); }
        const r = await completarUmComBusca(env, db, l);
        return json({ ...(await recalcular(db, leadId)), completados: [...Object.keys(g.novo), ...r.campos] });
      }
      if (sub === 'atividades' && m === 'POST') {
        if (!body.tipo) return erro('Informe o tipo da atividade.');
        await db.prepare('INSERT INTO atividades (lead_id, tipo, canal, descricao) VALUES (?, ?, ?, ?)')
          .bind(leadId, body.tipo, body.canal || null, body.descricao || null).run();
        return json(await recalcular(db, leadId));
      }
    }

    // ----- Importação (linhas já convertidas do CSV no navegador) -----
    if (rec === 'importar' && m === 'POST') {
      const linhas = Array.isArray(body.linhas) ? body.linhas.slice(0, 5000) : [];
      const res = { criados: 0, duplicados: 0, bloqueados: 0, invalidos: 0 };
      for (const ln of linhas) {
        try {
          const r = await inserirLead(db, { ...ln, origem: ln.origem || 'importacao' });
          if (r.status === 'criado') res.criados++; else if (r.status === 'duplicado') res.duplicados++; else res.bloqueados++;
        } catch { res.invalidos++; }
      }
      return json(res);
    }

    // ----- Fila de revisão -----
    if (rec === 'revisao') {
      if (!id && m === 'GET') {
        const st = url.searchParams.get('status') || 'pendente';
        return json((await db.prepare('SELECT * FROM revisao WHERE status = ? ORDER BY criado_em DESC LIMIT 500').bind(st).all()).results);
      }
      if (!id && m === 'POST') {
        const r = await db.prepare(`INSERT INTO revisao (tipo, titulo, url, trecho, nome, cargo, empresa, cidade, uf, email, whatsapp, instagram, linkedin, consulta)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(body.tipo || 'pessoa', body.titulo || null, body.url || null, body.trecho || null,
          body.nome || null, body.cargo || null, body.empresa || null, body.cidade || null, body.uf || null, body.email || null,
          body.whatsapp || null, body.instagram || null, body.linkedin || null, body.consulta || null).run();
        return json({ id: r.meta.last_row_id }, 201);
      }
      const rid = parseInt(id, 10);
      if (sub === 'aprovar' && m === 'POST') {
        const item = await db.prepare('SELECT * FROM revisao WHERE id = ?').bind(rid).first();
        if (!item) return erro('Item não encontrado.', 404);
        const dados = { ...item, ...body, fonte_url: body.fonte_url || item.url, origem: 'busca' };
        if (!dados.nome) return erro('Preencha o nome da pessoa antes de aprovar.');
        const r = await inserirLead(db, dados);
        if (r.status === 'bloqueado') return erro('Esta pessoa está na lista "Não contatar".', 409);
        await db.prepare("UPDATE revisao SET status = 'aprovado' WHERE id = ?").bind(rid).run();
        return json({ ...r });
      }
      if (sub === 'descartar' && m === 'POST') {
        await db.prepare("UPDATE revisao SET status = 'descartado' WHERE id = ?").bind(rid).run();
        return json({ ok: true });
      }
    }

    // ----- Descobrir: busca grátis na internet (Tavily) -----
    if (rec === 'descobrir' && m === 'GET') {
      const mes = await db.prepare("SELECT COUNT(*) n FROM buscas WHERE strftime('%Y-%m', criado_em) = strftime('%Y-%m', 'now')").first();
      const limite = parseInt((await db.prepare("SELECT valor FROM config WHERE chave='limite_buscas_mes'").first())?.valor || '900', 10);
      const ultimas = (await db.prepare('SELECT consulta, qtd, criado_em FROM buscas ORDER BY criado_em DESC LIMIT 10').all()).results;
      return json({ usadas: mes.n, limite, configurada: Boolean(await tavilyKey(env, db)), ultimas });
    }
    if (rec === 'descobrir' && m === 'POST') {
      const consulta = (body.consulta || '').toString().trim().slice(0, 300);
      if (consulta.length < 3) return erro('Descreva quem você quer encontrar.');
      const chaveTavily = await tavilyKey(env, db);
      if (!chaveTavily) return erro('A busca ainda não está configurada. Cole a chave da Tavily em Configurações.', 503);
      // Cache de 24 h: repetir a mesma busca não gasta crédito
      const cache = await db.prepare("SELECT resultado FROM buscas WHERE lower(consulta) = lower(?) AND criado_em >= datetime('now', '-1 day') ORDER BY criado_em DESC").bind(consulta).first();
      let itens;
      let doCache = false;
      if (cache) { itens = JSON.parse(cache.resultado || '[]'); doCache = true; }
      else {
        const limite = parseInt((await db.prepare("SELECT valor FROM config WHERE chave='limite_buscas_mes'").first())?.valor || '900', 10);
        const usadas = (await db.prepare("SELECT COUNT(*) n FROM buscas WHERE strftime('%Y-%m', criado_em) = strftime('%Y-%m', 'now')").first()).n;
        if (usadas >= limite) return erro(`Limite de ${limite} buscas do mês atingido. Ele renova no dia 1º.`, 429);
        let r;
        try {
          r = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${chaveTavily}` },
            body: JSON.stringify({ query: consulta, search_depth: 'basic', max_results: 10, country: 'brazil', include_answer: false }),
          });
        } catch {
          return erro('Não consegui conectar ao serviço de busca. Verifique a internet e tente de novo (nenhum crédito foi gasto).', 502);
        }
        if (r.status === 401 || r.status === 403) return erro('A chave da Tavily foi recusada. Confira se ela está correta e ativa.', 502);
        if (!r.ok) return erro(`A busca falhou (Tavily ${r.status}). Tente de novo em instantes.`, 502);
        const dados = await r.json();
        itens = processarResultados(dados.results || [], consulta);
        await db.prepare('INSERT INTO buscas (consulta, resultado, qtd) VALUES (?, ?, ?)').bind(consulta, JSON.stringify(itens), itens.length).run();
      }
      // Coloca na fila de revisão (sem repetir a mesma URL+nome pendente, sem quem está em "Não contatar")
      let novos = 0, pessoas = 0, fontes = 0, ignorados = 0;
      for (const it of itens) {
        if (it.tipo === 'pessoa' && await bloqueado(db, it)) { ignorados++; continue; }
        if (it.tipo === 'pessoa' && it.nome && await duplicado(db, it)) { ignorados++; continue; }
        const existe = await db.prepare('SELECT 1 FROM revisao WHERE url IS ? AND nome IS ?').bind(it.url || null, it.nome || null).first();
        if (existe) { ignorados++; continue; }
        await db.prepare(`INSERT INTO revisao (tipo, titulo, url, trecho, nome, cargo, empresa, cidade, uf, email, whatsapp, instagram, linkedin, consulta)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(it.tipo, it.titulo || null, it.url || null, it.trecho || null, it.nome || null,
          it.cargo || it.profissao || null, it.empresa || null, it.cidade || null, it.uf || null, it.email || null, it.whatsapp || null,
          it.instagram || null, it.linkedin || null, consulta).run();
        novos++; if (it.tipo === 'pessoa') pessoas++; else fontes++;
      }
      return json({ doCache, total: itens.length, novos, pessoas, fontes, ignorados });
    }

    // ----- Completar dados -----
    if (rec === 'completar' && id === 'gratis' && m === 'POST') {
      const leads = (await db.prepare('SELECT * FROM leads').all()).results;
      let atualizados = 0; const contagem = { site_empresa: 0, profissao: 0, anos_atuacao: 0 };
      for (const l of leads) {
        const { novo, motivos } = completarGratis(l);
        if (await aplicarCompletar(db, l.id, novo, motivos.join('; ') + ' (sem busca)')) { atualizados++; for (const k of Object.keys(novo)) contagem[k]++; }
      }
      return json({ total: leads.length, atualizados, contagem });
    }
    if (rec === 'completar' && id === 'lote' && m === 'POST') {
      const qtd = Math.min(Math.max(parseInt(body.quantidade, 10) || 10, 1), 25);
      const faixa = { A: [75, 101], B: [55, 75], C: [35, 55], D: [0, 35] }[body.classe] || [0, 101];
      const cands = (await db.prepare(`SELECT * FROM leads WHERE teste = 0 AND score >= ? AND score < ?
          AND id NOT IN (SELECT lead_id FROM atividades WHERE tipo = 'busca de dados') ORDER BY score DESC LIMIT ?`).bind(faixa[0], faixa[1], qtd).all()).results;
      const res = { processados: 0, comNovidade: 0, linkedin: 0, instagram: 0, outros: 0 };
      for (const l of cands) {
        const r = await completarUmComBusca(env, db, l);
        res.processados++; if (r.campos.length) res.comNovidade++;
        if (r.campos.includes('linkedin')) res.linkedin++; if (r.campos.includes('instagram')) res.instagram++;
        res.outros += r.campos.filter((c) => !['linkedin', 'instagram'].includes(c)).length;
        await recalcular(db, l.id);
      }
      const restantes = (await db.prepare(`SELECT COUNT(*) n FROM leads WHERE teste = 0 AND score >= ? AND score < ? AND id NOT IN (SELECT lead_id FROM atividades WHERE tipo = 'busca de dados')`).bind(faixa[0], faixa[1]).first()).n;
      return json({ ...res, restantes });
    }

    // ----- Painel -----
    if (rec === 'painel' && m === 'GET') {
      const base = 'FROM leads WHERE teste = 0';
      const total = (await db.prepare(`SELECT COUNT(*) n ${base}`).first()).n;
      const porEtapa = (await db.prepare(`SELECT etapa, COUNT(*) n ${base} GROUP BY etapa`).all()).results;
      const classes = (await db.prepare(`SELECT
          SUM(score >= 75) a, SUM(score >= 55 AND score < 75) b, SUM(score >= 35 AND score < 55) c, SUM(score < 35) d ${base}`).first());
      const pendentes = (await db.prepare("SELECT COUNT(*) n FROM revisao WHERE status = 'pendente'").first()).n;
      const vencidas = (await db.prepare(`SELECT COUNT(*) n ${base} AND data_proxima IS NOT NULL AND date(data_proxima) <= date('now')
          AND etapa NOT IN ('Cliente','Sem interesse','Perdido')`).first()).n;
      const comSinal = (await db.prepare('SELECT COUNT(DISTINCT lead_id) n FROM sinais s JOIN leads l ON l.id = s.lead_id WHERE l.teste = 0').first()).n;
      const faturamento = (await db.prepare(`SELECT COALESCE(SUM(valor_proposta),0) v ${base} AND etapa = 'Cliente'`).first()).v;
      return json({ total, porEtapa, classes, pendentes, vencidas, comSinal, faturamento });
    }

    // ----- Exportar CSV -----
    if (rec === 'exportar' && m === 'GET') {
      const formato = url.searchParams.get('formato') || 'completo';
      const rows = (await db.prepare('SELECT * FROM leads WHERE teste = 0 ORDER BY score DESC').all()).results;
      let cab, linha;
      if (formato === 'funil') {
        cab = ['Data 1º contato', 'Nome', '@ Instagram', 'WhatsApp', 'Cidade/UF', 'Profissão', 'Origem', 'Etapa', 'Pontuação', 'Classificação', 'Próxima ação', 'Data próxima ação', 'Observações'];
        const alvo = await alvoDe(db);
        linha = (r) => {
          const s = calcularScore(r, [], alvo);
          return [r.coletado_em, r.nome, r.instagram, r.whatsapp, [r.cidade, r.uf].filter(Boolean).join('/'), r.profissao || r.cargo, r.origem, r.etapa, r.score, s.classe.rotulo, r.proxima_acao, r.data_proxima, r.anotacoes];
        };
      } else {
        cab = CAMPOS.concat(['score']);
        linha = (r) => cab.map((c) => r[c]);
      }
      const csv = '﻿' + [cab, ...rows.map(linha)].map((l) => l.map(csvEscape).join(';')).join('\r\n');
      return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="blindada-leads-${formato}.csv"` } });
    }

    // ----- Configurações -----
    if (rec === 'config' && m === 'PUT') {
      const permitidas = ['retencao_dias', 'link_formulario', 'instagram_proprio', 'limite_buscas_mes', 'profissoes_alvo', 'regioes_alvo'];
      for (const [k, v] of Object.entries(body)) if (permitidas.includes(k)) await setCfg(db, k, String(v ?? ''));
      if (typeof body.tavily_key === 'string' && body.tavily_key.trim()) {
        const k = body.tavily_key.trim();
        if (!/^tvly-[A-Za-z0-9_-]{10,}$/.test(k)) return erro('A chave da Tavily deve começar com "tvly-" e estar completa (copie pelo ícone de copiar).');
        await setCfg(db, 'tavily_key', k);
      }
      if (body.tavily_key === null) await db.prepare("DELETE FROM config WHERE chave = 'tavily_key'").run();
      return json({ ok: true });
    }
    if (rec === 'demo' && m === 'DELETE') {
      const ids = (await db.prepare('SELECT id FROM leads WHERE teste = 1').all()).results.map((r) => r.id);
      for (const i of ids) {
        await db.prepare('DELETE FROM sinais WHERE lead_id = ?').bind(i).run();
        await db.prepare('DELETE FROM atividades WHERE lead_id = ?').bind(i).run();
      }
      await db.prepare('DELETE FROM leads WHERE teste = 1').run();
      return json({ removidos: ids.length });
    }

    return erro('Rota não encontrada.', 404);
  } catch (e) {
    return erro(e.message || 'Erro inesperado.', e.status || 500);
  }
}
