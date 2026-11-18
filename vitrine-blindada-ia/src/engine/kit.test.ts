import { describe, expect, it } from 'vitest';
import { SEED_POLICIES } from '../data/policies';
import type { CatalogItem, Product } from '../types';
import { kitFindings, kitNarration, kitVisual } from './kit';
import { checkProduct } from './productGate';
import { videoPrompt } from './generators';

const item = (id: string, name: string, status: CatalogItem['status'], extra: Partial<CatalogItem> = {}): CatalogItem => ({
  id, name, brand: 'AlwaysFit', labelText: name, contents: '30 cápsulas', ingredients: '', usage: '', warnings: '', visual: 'black jar',
  safeToSay: `${name}, 30 cápsulas`, avoid: '', status, statusNote: '', photos: [], reviewedAt: '', createdAt: '', ...extra,
});
const items = [
  item('nac', 'NAC 600mg', 'aprovado'),
  item('mag', 'Pro3 Magnésio', 'aprovado', { warnings: 'Pode conter glúten' }),
  item('fd', 'Fit Dreams', 'ressalva', { statusNote: 'Confirmar melatonina no Seller Center', avoid: 'sono\nansiedade' }),
  item('x', 'Produto X', 'bloqueado', { statusNote: 'Categoria proibida' }),
];
const kit: Product = {
  id: 'k', name: 'Kit AlwaysFit', listingTitle: 'Kit AlwaysFit NAC Pro3 Magnésio Fit Dreams', category: 'Suplementos', brand: 'AlwaysFit', manufacturer: '',
  description: 'Kit com 3 suplementos', specs: '', benefits: 'x', restrictions: '', mandatoryInfo: '', shopLink: 'https://shop.tiktok.com/x', price: '',
  photos: [{ id: '1', name: '', dataUrl: '' }], brandAuthorization: 'sim', priceMuchLower: 'nao', createdAt: '', updatedAt: '',
  components: [{ itemId: 'nac', qty: 1 }, { itemId: 'mag', qty: 1 }, { itemId: 'fd', qty: 1 }], listingConsistency: 'igual',
};

describe('kits', () => {
  it('herda a ressalva do item', () => {
    const f = kitFindings(kit, items);
    expect(f.map((x) => x.title)).toEqual(['Ressalva do item: Fit Dreams']);
  });
  it('item bloqueado bloqueia o kit', () => {
    const g = checkProduct({ ...kit, components: [...kit.components!, { itemId: 'x', qty: 1 }] }, SEED_POLICIES, 1, items);
    expect(g.level).toBe('alto');
  });
  it('imagem x descrição diferentes = alto', () => {
    expect(kitFindings({ ...kit, listingConsistency: 'diferente' }, items).some((x) => x.severity === 'alto')).toBe(true);
  });
  it('narração e prompt usam os itens', () => {
    expect(kitNarration(kit, items)).toContain('kit com 3 itens');
    expect(kitVisual(kit, items)[0]).toContain('exactly 3 items');
    const v = videoPrompt(kit, { style: 'pov', duration: 8, scene: '', camera: '', lighting: '', person: 'maos', action: '', noSample: true, tool: 'flow' }, items);
    expect(v.en).toContain('exactly 3 items');
    expect(v.pt).toContain('NÃO FALAR SOBRE ESTE KIT');
  });
});
