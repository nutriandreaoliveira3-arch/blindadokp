import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularScore } from '../functions/lib/score.js';

test('lead vazio vale zero e é classe D', () => {
  const s = calcularScore({ nome: 'X' }, []);
  assert.equal(s.total, 0);
  assert.equal(s.classe.letra, 'D');
});

test('poder de compra é limitado a 40', () => {
  const s = calcularScore({ cargo: 'Sócia-fundadora', profissao: 'Advogada', anos_atuacao: 20, site_empresa: 'x.com', porte: '11-50' }, []);
  assert.equal(s.criterios[0].pontos, 40);
});

test('sinais somam intenção com teto de 35', () => {
  const s = calcularScore({}, ['segue', 'interagiu', 'respondeu', 'indicacao', 'bem_estar']);
  assert.equal(s.criterios[1].pontos, 35);
});

test('lead completo e quente chega a 100 e classe A', () => {
  const lead = { cargo: 'CEO', profissao: 'Empresária', anos_atuacao: 15, site_empresa: 'a.com', porte: '51-200',
    whatsapp: '11 9', email: 'a@a.com', instagram: '@a', contato_direto: 1 };
  const s = calcularScore(lead, ['segue', 'interagiu', 'indicacao', 'respondeu']);
  assert.equal(s.total, 100);
  assert.equal(s.classe.letra, 'A');
});

test('lead sem sinal recebe ação de aquecimento', () => {
  const s = calcularScore({ instagram: '@a', cargo: 'Fundadora' }, []);
  assert.match(s.proximaAcao, /Aquecer/);
});

test('acentos não atrapalham o reconhecimento do cargo', () => {
  const s = calcularScore({ cargo: 'SÓCIA PROPRIETÁRIA' }, []);
  assert.ok(s.criterios[0].pontos >= 15);
});
