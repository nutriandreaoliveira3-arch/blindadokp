import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiCompareImages, aiConfigured } from './ai';
import type { Settings } from './types';

const s: Settings = { provider: 'gemini', geminiKey: 'chave-teste', geminiModel: 'gemini-2.5-flash', model: '', effort: 'medium' };
const img = 'data:image/jpeg;base64,AAAA';

afterEach(() => vi.unstubAllGlobals());

describe('Gemini', () => {
  it('considera configurado com a chave do Gemini', () => {
    expect(aiConfigured(s)).toBe(true);
    expect(aiConfigured({ ...s, geminiKey: undefined })).toBe(false);
  });
  it('monta a requisição e lê a resposta', async () => {
    const answer = { itens: [{ atributo: 'cor', status: 'diferente', detalhe: 'rosa no anúncio, vermelho no vídeo' }], veredito: 'divergente', resumo: 'Cor diferente.' };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answer) }] } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await aiCompareImages(s, [img], [img, img]);
    expect(r.veredito).toBe('divergente');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/models/gemini-2.5-flash:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('chave-teste');
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts.filter((p: { inline_data?: unknown }) => p.inline_data).length).toBe(3);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });
  it('mostra o erro do Gemini em português', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 })));
    await expect(aiCompareImages(s, [img], [img])).rejects.toThrow('Gemini: API key not valid');
  });
  it('rejeita resposta fora do formato', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"x":1}' }] } }] }), { status: 200 })));
    await expect(aiCompareImages(s, [img], [img])).rejects.toThrow('fora do formato');
  });
});
