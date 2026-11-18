import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSenha, criarSessao, sessaoValida, senhaForte, aleatorio, igual, lerCookie } from '../functions/lib/auth.js';

test('mesma senha e sal geram o mesmo hash; senha diferente não', async () => {
  const sal = aleatorio(16);
  const a = await hashSenha('Blindada2026', sal, 1000);
  assert.equal(a, await hashSenha('Blindada2026', sal, 1000));
  assert.notEqual(a, await hashSenha('Blindada2027', sal, 1000));
});

test('sessão válida, adulterada e vencida', async () => {
  const seg = aleatorio();
  const t = await criarSessao(seg);
  assert.equal(await sessaoValida(t, seg), true);
  assert.equal(await sessaoValida(t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), seg), false);
  assert.equal(await sessaoValida(t, aleatorio()), false);
  const velho = await criarSessao(seg, Date.now() - 40 * 864e5);
  assert.equal(await sessaoValida(velho, seg), false);
});

test('regras de senha forte', () => {
  assert.ok(senhaForte('curta1'));
  assert.ok(senhaForte('semnumeroaqui'));
  assert.equal(senhaForte('Blindada2026'), null);
});

test('utilitários', () => {
  assert.equal(igual('abc', 'abc'), true);
  assert.equal(igual('abc', 'abd'), false);
  const req = { headers: new Map([['cookie', 'x=1; bi_sessao=123.abc; y=2']]) };
  req.headers.get = req.headers.get.bind(req.headers);
  assert.equal(lerCookie(req), '123.abc');
});
