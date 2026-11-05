import { describe, expect, it } from 'vitest';
import { SEED_POLICIES } from '../data/policies';
import type { ContentInput, Product, ProductionContext } from '../types';
import { analyzeContent, applyFixes, scanText } from './analyze';
import { checkProduct, gateAllows } from './productGate';
import { DETECTORS } from './detectors';

const ids = (t: string, field: 'roteiro' | 'hashtags' | 'legenda' = 'roteiro') =>
  scanText(t, field, SEED_POLICIES).map((f) => f.detectorId);

const okCtx: ProductionContext = {
  contentType: 'video', origem: 'gravado_real', aiDisclosure: 'nao', virtualModel: 'nao', aiAlteredProduct: 'nao',
  demonstration: 'real', productShown: 'claro', productMostDuration: 'sim', linkMatch: 'igual', presence: 'aparece_fala',
  audio: 'voz_humana', staticContent: 'nenhum', originality: 'original', watermark: 'nao', layeredEditing: 'nao',
  beautyFilter: 'nao', thirdPartyBrandOrPerson: 'nao', reviewScreenshot: 'nao', sameContentOtherAccounts: 'nao',
  creatorAdult: 'sim', preRecordedInLive: 'nao', screenRecording: 'nao',
};

const product: Product = {
  id: 'p1', name: 'Garrafa Térmica Inox 500ml', category: 'Casa e cozinha', brand: 'Termik', manufacturer: 'Termik',
  description: 'Garrafa térmica de aço inox.', specs: 'Capacidade 500 ml\nAço inox', benefits: 'Mantém bebidas quentes por até 12 horas (fabricante)',
  restrictions: '', mandatoryInfo: '', shopLink: 'https://shop.tiktok.com/x', price: 'R$ 59,90', photos: [{ id: 'a', name: 'a', dataUrl: 'x' }],
  brandAuthorization: 'propria', priceMuchLower: 'nao', createdAt: '', updatedAt: '',
};

describe('detectores', () => {
  it('todos os detectores apontam para regras existentes', () => {
    const all = new Set(SEED_POLICIES.map((p) => p.id));
    for (const d of DETECTORS) for (const id of d.policyIds) expect(all.has(id), `${d.id} -> ${id}`).toBe(true);
  });
  it('perda de peso', () => {
    expect(ids('Esse chá ajuda a emagrecer')).toContain('D-PESO');
    expect(ids('Perdi 5 kg em um mês')).toContain('D-PESO');
    expect(ids('Queima gordura rápido')).toContain('D-PESO');
    expect(ids('efeito Ozempic natural')).toContain('D-GLP1');
    expect(ids('#emagrecimento #chaqueimagordura', 'hashtags')).toContain('D-HASHTAG-PESO');
  });
  it('ingrediente só dispara com contexto de peso', () => {
    expect(ids('Contém L-carnitina que acelera a queima de gordura')).toContain('D-INGREDIENTE-PESO');
    expect(ids('Contém cafeína')).not.toContain('D-INGREDIENTE-PESO');
  });
  it('redirecionamento', () => {
    expect(ids('Chama no WhatsApp')).toContain('D-REDIRECIONAMENTO');
    expect(ids('link na bio')).toContain('D-REDIRECIONAMENTO');
    expect(ids('me segue no @minhaloja')).toContain('D-REDIRECIONAMENTO');
    expect(ids('Comenta EU QUERO que eu te mando o link')).toContain('D-REDIRECIONAMENTO');
    expect(ids('acesse www.site.com.br')).toContain('D-REDIRECIONAMENTO');
  });
  it('preço, absolutos e imitação', () => {
    expect(ids('É o menor preço do TikTok')).toContain('D-PRECO');
    expect(ids('Produto nº 1 do Brasil, 100% natural')).toContain('D-ABSOLUTO');
    expect(ids('Inspirado no perfume da marca X')).toContain('D-IMITACAO');
  });
  it('texto neutro não gera alertas', () => {
    expect(ids('Essa garrafa tem 500 ml e tampa com trava. Eu levo para o trabalho todo dia.')).toEqual([]);
  });
  it('não confunde "se trata de" com alegação médica', () => {
    expect(ids('Se trata de uma garrafa de inox.')).not.toContain('D-MEDICO');
  });
});

describe('análise completa', () => {
  const input: ContentInput = {
    roteiro: 'Olha essa garrafa térmica da Termik. Tem 500 ml e é de aço inox. Toque no link do produto aqui no vídeo.',
    textoTela: 'Garrafa Termik 500 ml', legenda: 'Garrafa Térmica Inox 500ml — Termik', hashtags: '#tiktokshop #garrafatermica', imagemDescricao: '',
  };
  it('conteúdo limpo = baixo risco', () => {
    const p = { ...product, gate: checkProduct(product, SEED_POLICIES, 1) };
    const r = analyzeContent(input, okCtx, SEED_POLICIES, p);
    expect(r.findings.map((f) => f.title)).toEqual([]);
    expect(r.level).toBe('baixo');
  });
  it('IA sem rótulo = alto risco', () => {
    const r = analyzeContent(input, { ...okCtx, origem: 'ia_total', aiDisclosure: 'nao' }, SEED_POLICIES, product);
    expect(r.level).toBe('alto');
  });
  it('correção substitui redirecionamento e reanálise fica limpa', () => {
    const t = 'Gostou? Chama no WhatsApp. Tem 500 ml.';
    const f = scanText(t, 'roteiro', SEED_POLICIES);
    const fixed = applyFixes(t, f);
    expect(fixed).toContain('link do produto');
    expect(scanText(fixed, 'roteiro', SEED_POLICIES)).toEqual([]);
  });
  it('marcador de correção pendente impede baixo risco', () => {
    const t = 'Produto nº 1 do Brasil. Tem 500 ml.';
    const fixed = applyFixes(t, scanText(t, 'roteiro', SEED_POLICIES));
    expect(scanText(fixed, 'roteiro', SEED_POLICIES).map((f) => f.detectorId)).toEqual(['D-PLACEHOLDER']);
  });
});

describe('portão do produto', () => {
  it('produto de emagrecimento fica bloqueado', () => {
    const g = checkProduct({ ...product, name: 'Chá Seca Barriga', category: 'Bebidas', description: 'Chá para emagrecer' }, SEED_POLICIES, 1);
    expect(g.level).toBe('alto');
    expect(gateAllows({ ...product, gate: g }).ok).toBe(false);
  });
  it('produto comum é liberado', () => {
    const g = checkProduct(product, SEED_POLICIES, 1);
    expect(g.findings.map((f) => f.title)).toEqual([]);
    expect(gateAllows({ ...product, gate: g }).ok).toBe(true);
  });
});
