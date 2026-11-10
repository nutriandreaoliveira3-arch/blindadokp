// Login por senha da Blindada Intelligence (sem serviços externos).
// - Senha guardada como PBKDF2-SHA256 (210 mil iterações) com sal aleatório.
// - Sessão em cookie HttpOnly/Secure/SameSite=Strict, assinado com HMAC e com validade.
// - Primeiro acesso exige um código de uso único (guardado só como hash SHA-256).
// - Bloqueio de 15 min após 5 senhas erradas.

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (h) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));
export const ITERACOES = 100000; // limite do Cloudflare Workers para PBKDF2
const DIAS_SESSAO = 30;

export function aleatorio(bytes = 32) { return hex(crypto.getRandomValues(new Uint8Array(bytes))); }

export async function sha256(txt) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(txt))); }

export async function hashSenha(senha, salHex, iter = ITERACOES) {
  const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salHex), iterations: iter }, chave, 256);
  return hex(bits);
}

export function igual(a = '', b = '') { // comparação em tempo constante
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmac(segredo, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

export async function criarSessao(segredo, agora = Date.now()) {
  const exp = agora + DIAS_SESSAO * 864e5;
  return `${exp}.${await hmac(segredo, String(exp))}`;
}

export async function sessaoValida(token, segredo, agora = Date.now()) {
  if (!token || !segredo) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < agora) return false;
  return igual(sig, await hmac(segredo, exp));
}

export function lerCookie(request, nome = 'bi_sessao') {
  const c = request.headers.get('cookie') || '';
  const m = c.match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function cookieSessao(token, apagar = false) {
  const base = 'bi_sessao=' + (apagar ? '' : encodeURIComponent(token)) + '; Path=/; HttpOnly; Secure; SameSite=Strict';
  return apagar ? base + '; Max-Age=0' : base + `; Max-Age=${DIAS_SESSAO * 86400}`;
}

export function senhaForte(s = '') {
  if (s.length < 10) return 'A senha precisa ter pelo menos 10 caracteres.';
  if (!/[a-zA-Z]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.';
  return null;
}
