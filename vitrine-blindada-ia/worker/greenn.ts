// Interpretação dos avisos (webhooks) da Greenn.
// A documentação pública da Greenn cita os campos "currentStatus"/"oldStatus" e os tipos "sale" e "contract".
// Como o formato pode variar por versão, a leitura é tolerante: procura o e-mail e o status em vários caminhos.
// Todo aviso é guardado em webhook_log para conferência.

export type GreennAction = 'liberar' | 'bloquear' | 'ignorar';

export interface GreennEvent {
  email?: string;
  status?: string;
  type?: string;
  ref?: string;
  product?: string;
  action: GreennAction;
}

// Status que liberam acesso
const GRANT = new Set(['paid', 'approved', 'trialing', 'active', 'completed']);
// Status que retiram acesso
const REVOKE = new Set(['refunded', 'chargedback', 'chargeback', 'canceled', 'cancelled', 'unpaid', 'ended', 'expired']);
// Demais (waiting_payment, refused, pending_payment, created...) não mudam o acesso.

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

function get(o: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((a, k) => (isObj(a) ? a[k] : undefined), o);
}

function firstString(o: unknown, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = get(o, p);
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}

/** Busca profunda por um e-mail de cliente, evitando e-mails do vendedor/produtor. */
function deepEmail(o: unknown, depth = 0): string | undefined {
  if (depth > 5 || !isObj(o)) return undefined;
  for (const [k, v] of Object.entries(o)) {
    if (/seller|producer|vendedor|produtor|affiliate|afiliado/i.test(k)) continue;
    if (typeof v === 'string' && /email/i.test(k) && /@/.test(v)) return v.trim();
  }
  for (const [k, v] of Object.entries(o)) {
    if (/seller|producer|vendedor|produtor|affiliate|afiliado/i.test(k)) continue;
    const r = deepEmail(v, depth + 1);
    if (r) return r;
  }
  return undefined;
}

export function parseGreenn(body: unknown): GreennEvent {
  const email = (
    firstString(body, ['client.email', 'buyer.email', 'customer.email', 'sale.client.email', 'contract.client.email', 'data.client.email', 'email']) ??
    deepEmail(body)
  )?.toLowerCase();
  const status = firstString(body, ['currentStatus', 'current_status', 'status', 'sale.status', 'contract.status', 'data.status'])?.toLowerCase();
  const type = firstString(body, ['type', 'event']);
  const ref = firstString(body, ['contract.id', 'sale.id', 'id', 'data.id']);
  const product = firstString(body, ['product.name', 'product.id', 'sale.product.name', 'contract.product.name', 'product_id']);
  let action: GreennAction = 'ignorar';
  if (status && GRANT.has(status)) action = 'liberar';
  if (status && REVOKE.has(status)) action = 'bloquear';
  if (!email) action = 'ignorar';
  return { email, status, type, ref, product, action };
}

/** Aceita JSON ou formulário (application/x-www-form-urlencoded). */
export async function readBody(req: Request): Promise<unknown> {
  const ct = req.headers.get('content-type') ?? '';
  const raw = await req.text();
  if (ct.includes('application/x-www-form-urlencoded')) {
    const out: Json = {};
    for (const [k, v] of new URLSearchParams(raw)) {
      // transforma client[email] em { client: { email } }
      const keys = k.replace(/\]/g, '').split('[');
      let cur: Json = out;
      keys.forEach((kk, i) => {
        if (i === keys.length - 1) cur[kk] = v;
        else cur = (cur[kk] = isObj(cur[kk]) ? cur[kk] : {}) as Json;
      });
    }
    return out;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}
