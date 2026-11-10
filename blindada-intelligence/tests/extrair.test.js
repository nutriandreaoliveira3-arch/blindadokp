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
  assert.match(ps[0].cargo, /S[óo]cia/i);
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

test('nome do estúdio não vira pessoa; a fundadora sim', () => {
  const ps = extrairPessoas('https://estudio.com.br/quem-somos', 'Quem somos | Studio Exemplar', 'Studio Exemplar. Renata Exemplar é arquiteta e fundadora do escritório.');
  assert.deepEqual(ps.map((p) => p.nome), ['Renata Exemplar']);
  assert.equal(ps[0].profissao, 'Arquiteta'); // palavra exata da página
});

test('post com nome e cargo no título é aproveitado', () => {
  const it = processarResultados([{ url: 'https://www.instagram.com/p/abc', title: 'Quem somos. Paula Fictícia, sócia fundadora do BM ...', content: 'Fundou em 2014 o escritório.' }], 't');
  assert.equal(it[0].tipo, 'pessoa');
  assert.equal(it[0].nome, 'Paula Fictícia');
});

test('profissão no plural ("Arquitetos") também identifica pessoas', () => {
  const ps = extrairPessoas('https://x.com.br/quem-somos', 'Quem somos', 'Arquitetos Carolina Exemplo, Brasileira (RS), se conheceram em Barcelona.');
  assert.equal(ps[0].nome, 'Carolina Exemplo');
});

test('LinkedIn: título que começa pelo cargo usa o nome do endereço do perfil', () => {
  const ps = extrairPessoas('https://br.linkedin.com/in/larissa-exemplo-adv-1234', 'Sócia Fundadora do escritório Larissa Exemplo Advocacia', '');
  assert.equal(ps[0].nome, 'Larissa Exemplo');
  assert.match(ps[0].cargo, /Sócia Fundadora/);
});

test('LinkedIn: cargo vem do título do perfil, não de qualquer lugar do texto', () => {
  const ps = extrairPessoas('https://br.linkedin.com/in/joyce-x', 'Joyce Exemplo - Advogada Cível e Trabalhista | LinkedIn', 'Head de projetos no passado, sócia de um amigo');
  assert.equal(ps[0].cargo, 'Advogada Cível e Trabalhista');
});

test('Instagram: perfil vira pessoa com o @', () => {
  const it = processarResultados([{ url: 'https://www.instagram.com/dra.anaexemplo/', title: 'Ana Exemplo (@dra.anaexemplo) • Instagram photos and videos', content: 'Médica dermatologista | Fundadora da Clínica X' }], 't');
  assert.equal(it[0].tipo, 'pessoa');
  assert.equal(it[0].nome, 'Ana Exemplo');
  assert.equal(it[0].instagram, '@dra.anaexemplo');
});
