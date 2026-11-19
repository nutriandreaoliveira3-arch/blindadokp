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
