// Modo de funcionamento do app.
// local  = arquivo aberto no computador (dados no navegador, IA com chave própria)
// nuvem  = site publicado na Cloudflare (login, dados no servidor, IA no servidor)

export type Mode = 'local' | 'nuvem';

export interface Account {
  mode: Mode;
  email?: string;
  role?: 'admin' | 'assinante';
  ai?: boolean;
  loggedIn: boolean;
}

let current: Account = { mode: 'local', loggedIn: true };

export const getAccount = () => current;
export const isCloud = () => current.mode === 'nuvem';
export const isAdmin = () => current.mode === 'local' || current.role === 'admin';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const opts = { credentials: 'same-origin', ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } } as RequestInit;
  const r = await fetch(path, opts);
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new ApiError(r.status, data?.error ?? `Erro ${r.status}`);
  return data as T;
}

/** Detecta o modo. Em arquivo local ou sem API, fica em modo local. */
export async function detectMode(): Promise<Account> {
  if ((globalThis as { location?: { protocol: string } }).location?.protocol === 'file:') return (current = { mode: 'local', loggedIn: true });
  try {
    const me = await api<{ email: string; role: 'admin' | 'assinante'; ai: boolean }>('/api/me');
    current = { mode: 'nuvem', loggedIn: true, ...me };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) current = { mode: 'nuvem', loggedIn: false };
    else current = { mode: 'local', loggedIn: true };
  }
  return current;
}

export async function login(email: string, password: string, register: boolean) {
  const me = await api<{ email: string; role: 'admin' | 'assinante' }>(register ? '/api/auth/register' : '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return detectMode().then(() => me);
}

export async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  current = { mode: 'nuvem', loggedIn: false };
}
