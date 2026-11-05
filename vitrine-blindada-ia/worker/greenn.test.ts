import { describe, expect, it } from 'vitest';
import { parseGreenn, readBody } from './greenn';

describe('webhook Green', () => {
  it('venda paga libera', () => {
    const e = parseGreenn({ type: 'sale', event: 'saleUpdated', oldStatus: 'waiting_payment', currentStatus: 'paid', sale: { id: 9 }, client: { email: 'A@B.com' } });
    expect(e).toMatchObject({ email: 'a@b.com', status: 'paid', action: 'liberar' });
  });
  it('reembolso, chargeback e cancelamento bloqueiam', () => {
    for (const s of ['refunded', 'chargedback', 'canceled', 'unpaid'])
      expect(parseGreenn({ currentStatus: s, client: { email: 'a@b.com' } }).action).toBe('bloquear');
  });
  it('aguardando pagamento não muda acesso', () => {
    expect(parseGreenn({ currentStatus: 'waiting_payment', client: { email: 'a@b.com' } }).action).toBe('ignorar');
  });
  it('ignora e-mail do vendedor e acha o do cliente em outro caminho', () => {
    const e = parseGreenn({ currentStatus: 'paid', seller: { email: 'vendedor@x.com' }, data: { comprador: { email: 'cliente@x.com' } } });
    expect(e.email).toBe('cliente@x.com');
  });
  it('sem e-mail não faz nada', () => {
    expect(parseGreenn({ currentStatus: 'paid' }).action).toBe('ignorar');
  });
  it('lê formulário com colchetes', async () => {
    const r = new Request('http://x', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'currentStatus=paid&client[email]=c@d.com' });
    expect(parseGreenn(await readBody(r))).toMatchObject({ email: 'c@d.com', action: 'liberar' });
  });
});
