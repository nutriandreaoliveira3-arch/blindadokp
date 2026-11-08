import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificarFonte, extrairPessoas, processarResultados } from '../functions/lib/extrair.js';

test('matéria de portal é fonte, não pessoa', () => {
  assert.equal(classificarFonte('https://exame.com/negocios/mulheres-ceos', 'Mulheres são apenas 5,2% dos CEOs no Brasil', ''), 'fonte');
  assert.equal(classificarFonte('https://site.com.br/blog/lideranca', 'Liderança feminina', 'texto'), 'fonte');
});

test('perfil do LinkedIn é pessoa e extrai nome, cargo e empresa', () => {
  const ps = extrairPessoas('https://br.linkedin.com/in/ana-exemplo', 'Ana Exemplo – Sócia-fundadora – Exemplo Advocacia | LinkedIn', 'São Paulo, SP');
  assert.equal(ps.length, 1);
  assert.equal(ps[0].nome, 'Ana Exemplo');
  assert.equal(ps[0].empresa, 'Exemplo Advocacia');
  assert.match(ps[0].cargo, /Socia/i);
});

test('página de equipe extrai a pessoa perto do cargo e o e-mail nominal', () => {
  const txt = 'Nossa equipe. Beatriz Ilustrativa é sócia fundadora e advogada há 14 anos. Contato: beatriz@ficticio.com.br ou contato@ficticio.com.br. Recife/PE';
  const ps = extrairPessoas('https://ficticio.com.br/equipe', 'Equipe | Escritório Fictício', txt);
  assert.equal(ps[0].nome, 'Beatriz Ilustrativa');
  assert.equal(ps[0].email, 'beatriz@ficticio.com.br');
  assert.equal(ps[0].uf, 'PE');
});

test('e-mail genérico (contato@) não vira e-mail da pessoa', () => {
  const ps = extrairPessoas('https://x.com.br/sobre', 'Sobre', 'Carla Fictícia, fundadora. Escreva para contato@x.com.br');
  assert.equal(ps[0].email, null);
});

test('processar resultados separa pessoas e fontes', () => {
  const itens = processarResultados([
    { url: 'https://g1.globo.com/economia/noticia/x.ghtml', title: '10 mulheres empresárias', content: 'Maria Silva, fundadora' },
    { url: 'https://arq.com.br/quem-somos', title: 'Quem somos', content: 'Paula Modelo é arquiteta e fundadora do estúdio.' },
  ], 'teste');
  assert.equal(itens[0].tipo, 'fonte');
  assert.equal(itens[1].tipo, 'pessoa');
  assert.equal(itens[1].nome, 'Paula Modelo');
});
