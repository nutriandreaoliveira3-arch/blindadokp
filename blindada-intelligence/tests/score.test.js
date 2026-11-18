import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularScore, parseAlvo, ALVO_PADRAO } from '../functions/lib/score.js';

test('lead vazio vale zero e é classe D', () => {
  const s = calcularScore({ nome: 'X' }, []);
  assert.equal(s.total, 0);
  assert.equal(s.classe.letra, 'D');
});

test('lead FRIO bem qualificado chega a 90 sem nenhum sinal (classe A)', () => {
  const lead = { cargo: 'Sócia-fundadora', profissao: 'Advogada', anos_atuacao: 15, site_empresa: 'x.com.br', porte: '11-50',
    cidade: 'São Paulo', uf: 'SP', fonte_url: 'https://x.com.br/equipe', whatsapp: '11 9', email: 'ana@x.com.br', linkedin: 'in/ana', contato_direto: 1 };
  const s = calcularScore(lead, []);
  assert.equal(s.total, 90);
  assert.equal(s.classe.letra, 'A');
});

test('sinais são só bônus, com teto de 10', () => {
  const s = calcularScore({}, ['segue', 'interagiu', 'respondeu', 'indicacao', 'bem_estar']);
  assert.equal(s.total, 10);
});

test('poder de compra é limitado a 40', () => {
  const s = calcularScore({ cargo: 'CEO', profissao: 'Empresária', anos_atuacao: 20, site_empresa: 'a', porte: '51-200' }, []);
  assert.equal(s.criterios[0].pontos, 40);
});

test('região-alvo configurada: dentro pontua, fora não', () => {
  const alvo = parseAlvo({ profissoes_alvo: 'advogad', regioes_alvo: 'SP, Curitiba' });
  assert.equal(calcularScore({ profissao: 'Advogada', uf: 'SP' }, [], alvo).criterios[1].pontos, 15);
  assert.equal(calcularScore({ profissao: 'Advogada', uf: 'BA' }, [], alvo).criterios[1].pontos, 10);
});

test('profissão fora do público-alvo não ganha aderência', () => {
  const alvo = parseAlvo({ profissoes_alvo: 'medic', regioes_alvo: '' });
  assert.equal(calcularScore({ profissao: 'Arquiteta' }, [], alvo).criterios[1].pontos, 0);
});

test('config ausente usa o público-alvo padrão', () => {
  assert.deepEqual(parseAlvo({}), ALVO_PADRAO);
});

test('acentos não atrapalham o reconhecimento do cargo', () => {
  assert.ok(calcularScore({ cargo: 'SÓCIA PROPRIETÁRIA' }, []).criterios[0].pontos >= 15);
});

test('profissão gravada como área ("Advocacia", "Odontologia") também pontua', () => {
  assert.equal(calcularScore({ profissao: 'Advocacia' }, []).criterios[0].pontos, 10);
  assert.equal(calcularScore({ profissao: 'Odontologia' }, []).criterios[1].pontos, 10);
});
