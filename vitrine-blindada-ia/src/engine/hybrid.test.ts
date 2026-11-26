import { describe, expect, it } from 'vitest';
import { hybridPrompts } from './generators';
import type { Product } from '../types';

const p = { id: 'x', name: 'Kit Stronghorn', restrictions: '', components: [] } as unknown as Product;

describe('modelo híbrido', () => {
  it('kit trava contagem e itens', () => {
    const r = hybridPrompts(p, { container: 'kit', pose: 'bancada', productEn: '', labelText: '100% WHEY PROTEIN', kitItems: '2 bags, 1 shaker', kitCount: 3, speech: 'Esse é o kit.' });
    expect(r.mix).toContain('Count of items on the counter: 3');
    expect(r.video).toContain('Exactly 3 items');
    expect(r.pt).toContain('último quadro');
  });
  it('pote segurando não deixa objetos na bancada', () => {
    const r = hybridPrompts(p, { container: 'pote', pose: 'segurando', productEn: 'black protein jar', labelText: '', speech: 'Esse é o whey.' });
    expect(r.mix).toContain('counter is completely empty');
    expect(r.video).toContain('LOCKED PRODUCT SHOT');
  });
});

import { scanText } from './analyze';
import { SEED_POLICIES } from '../data/policies';
describe('lições de 19/11', () => {
  it('pega legenda de treino e de duração', () => {
    expect(scanText('💪 TREINA, MAS NÃO SABE SE CONSOME PROTEÍNA SUFICIENTE?', 'legenda', SEED_POLICIES).length).toBeGreaterThan(0);
    expect(scanText('SEU WHEY ACABA RÁPIDO?', 'legenda', SEED_POLICIES).length).toBeGreaterThan(0);
    expect(scanText('3 meses de uso', 'legenda', SEED_POLICIES).length).toBeGreaterThan(0);
  });
  it('legenda sugerida só com nome, sabor e peso passa limpa', () => {
    const r = hybridPrompts(p, { container: 'pote', pose: 'segurando', productEn: 'jar', labelText: '', speech: 'Esse é o Whey 100% HD da Black Skull, sabor baunilha, pote de 900 gramas.' });
    expect(r.caption).toBe('Whey 100% HD da Black Skull, sabor baunilha, pote de 900 gramas. Veja os detalhes no link do produto.');
    expect(scanText(r.caption, 'legenda', SEED_POLICIES)).toEqual([]);
  });
});

import { HOOKS } from '../data/hooks';
import { watermarkLine } from './generators';
describe('modo roupa (20/11)', () => {
  const dress = { id: 'v', name: 'Vestido longo tropical', restrictions: '', components: [] } as unknown as Product;
  it('gera mescla, 2 clipes sem fala, fechamento e legenda com hashtags', () => {
    const r = hybridPrompts(dress, {
      container: 'roupa', pose: 'segurando', productEn: '', labelText: '', speech: '',
      modelName: 'Bella', outfitEn: 'long tropical print dress', scene: 'terrace', blurBg: true, handSwipe: true,
      closing: ['Com bojo', '', 'Veste do 36 ao 42', 'Toque no link do produto'], captionBase: 'Vestido longo tropical', hashtags: '#vestidolongo #tiktokshop',
    });
    expect(r.mix).toContain('CHARACTER LOCK — BELLA');
    expect(r.mix).toContain('fully lined and opaque');
    expect(`${r.mix}\n${r.video}\n${r.video2}`).not.toMatch(/nude|sensual|see-through|bare/i);
    expect(r.video).toContain('no speech');
    expect(r.video).toContain('covers the camera lens');
    expect(r.video2).toContain('pulls her hand away');
    expect(r.video).toContain('heavily blurred');
    expect(r.closing).toEqual(['Com bojo', 'Veste do 36 ao 42', 'Toque no link do produto']);
    expect(r.caption).toBe('Vestido longo tropical. Veja os detalhes no link do produto.\n\n#vestidolongo #tiktokshop');
  });
  it('marca d\'água configurável', () => {
    expect(watermarkLine({ on: true, pos: 'rodape-esq', size: 'pequeno', text: 'Conteúdo gerado por IA' })).toContain('74%');
    expect(watermarkLine({ on: false, pos: 'topo', size: 'medio', text: '' })).toContain('desligada');
  });
  it('trava marca de terceiro e comparação, mas não nome de cor', () => {
    expect(scanText('Vestido estilo Farm', 'legenda', SEED_POLICIES).length).toBeGreaterThan(0);
    expect(scanText('#zara #modafeminina', 'legenda', SEED_POLICIES).length).toBeGreaterThan(0);
    expect(scanText('Parece de R$ 1000', 'legenda', SEED_POLICIES).length).toBeGreaterThan(0);
    expect(scanText('Cor Gelo Fendi', 'legenda', SEED_POLICIES)).toEqual([]);
    expect(scanText('Vestido com cara de rica', 'legenda', SEED_POLICIES)).toEqual([]);
  });
  it('ganchos da biblioteca sem aviso passam limpos', () => {
    const bad = HOOKS.filter((h) => !h.warn && scanText(h.text, 'legenda', SEED_POLICIES).length > 0).map((h) => h.text);
    expect(bad).toEqual([]);
  });
});

describe('suplemento com tamanho real e fala travada (26/11)', () => {
  const sup = { id: 's', name: 'Ômega 3', restrictions: '', components: [] } as unknown as Product;
  it('inclui tamanho real, uma mão e fala travada', () => {
    const r = hybridPrompts(sup, {
      container: 'pote', pose: 'segurando', productEn: 'small black jar', labelText: '', oneHand: true,
      realSize: 'about 6 cm wide and 9 cm tall, roughly the size of a small yogurt cup',
      speech: 'Antes de escolher o seu ômega 3, olha esse rótulo! Toque no carrinho laranja e confira!',
    });
    expect(r.mix).toContain('REAL SIZE (mandatory)');
    expect(r.mix).toContain('clearly smaller than her face');
    expect(r.mix).toContain('ONE hand only');
    expect(r.video).toContain('exactly these words and nothing else');
  });
  it('imagem 3 de referência de tamanho só entra quando pedida', () => {
    const base = { container: 'pote' as const, pose: 'segurando' as const, productEn: 'jar', labelText: '', speech: 'Olá.' };
    expect(hybridPrompts(sup, { ...base, sizeRefImage: true }).mix).toContain('Use image 3 only as a size reference');
    expect(hybridPrompts(sup, base).mix).not.toContain('image 3');
  });
  it('sem os novos campos o texto antigo continua', () => {
    const r = hybridPrompts(sup, { container: 'pote', pose: 'segurando', productEn: 'jar', labelText: '', speech: 'Olá.' });
    expect(r.mix).not.toContain('REAL SIZE');
    expect(r.mix).toContain('both hands');
  });
});
