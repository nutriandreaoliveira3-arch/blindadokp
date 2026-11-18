import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteDaFonte, profissaoDoTexto, anosDoTexto, completarGratis, completarComResultados, consultaPara } from '../functions/lib/completar.js';

test('site vem do domínio da fonte, exceto redes sociais e agregadores', () => {
  assert.equal(siteDaFonte('https://www.kairosexemplo.com.br/quem-somos'), 'kairosexemplo.com.br');
  assert.equal(siteDaFonte('https://www.instagram.com/p/abc'), null);
  assert.equal(siteDaFonte('https://www.doctoralia.com.br/x'), null);
});

test('profissão e anos lidos do texto da evidência', () => {
  assert.equal(profissaoDoTexto('Fundadora', 'identifica Ana como farmacêutica e fundadora'), 'Farmácia');
  assert.equal(anosDoTexto('atua há 15 anos no mercado'), 15);
  assert.equal(anosDoTexto('Fundou em 2014 o escritório', 2026), 12);
  assert.equal(anosDoTexto('telefone (19) 2014-5555'), null);
});

test('completar grátis só preenche o que está vazio', () => {
  const r = completarGratis({ cargo: 'Fundadora', profissao: 'Já tem', fonte_url: 'https://clinica-exemplo.com.br/sobre', fonte_desc: 'psicóloga há 8 anos' });
  assert.equal(r.novo.site_empresa, 'clinica-exemplo.com.br');
  assert.equal(r.novo.profissao, undefined);
  assert.equal(r.novo.anos_atuacao, 8);
});

test('busca: LinkedIn só com nome completo no título; homônimo parcial é ignorado', () => {
  const lead = { nome: 'Ana Paula Exemplo', empresa: 'Exemplo Adv' };
  const r = completarComResultados(lead, [
    { url: 'https://br.linkedin.com/in/ana-outra', title: 'Ana Souza – Advogada | LinkedIn', content: '' },
    { url: 'https://br.linkedin.com/in/anapaulaexemplo?trk=x', title: 'Ana Paula Exemplo – Sócia | LinkedIn', content: 'Advogada há 12 anos' },
    { url: 'https://www.instagram.com/anapaula.exemplo/', title: 'Ana Paula Exemplo (@anapaula.exemplo)', content: '' },
  ]);
  assert.equal(r.novo.linkedin, 'https://br.linkedin.com/in/anapaulaexemplo');
  assert.equal(r.novo.instagram, '@anapaula.exemplo');
  assert.equal(r.novo.anos_atuacao, undefined); // busca só preenche redes sociais
});

test('consulta usa nome entre aspas + empresa + cidade', () => {
  assert.equal(consultaPara({ nome: 'Ana Exemplo', empresa: 'X', cidade: 'Recife' }), '"Ana Exemplo" X Recife');
});

test('dado da empresa longe do nome NÃO é atribuído à pessoa', () => {
  const lead = { nome: 'Carla Exemplo Souza', empresa: 'Opção Contábil' };
  const txt = 'Carla Exemplo Souza é sócia da Opção Contábil. ' + 'x'.repeat(300) + ' Atendemos clínicas de medicina há 7 anos.';
  const r = completarComResultados(lead, [{ url: 'https://contabil-exemplo.com.br', title: 'Opção Contábil | Carla Exemplo Souza', content: txt }]);
  assert.equal(r.novo.profissao, undefined);
  assert.equal(r.novo.anos_atuacao, undefined);
});
