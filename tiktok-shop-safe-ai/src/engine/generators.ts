import type { Product } from '../types';
import { plain } from './normalize';

// Geradores determinísticos. Usam SOMENTE dados cadastrados do produto.
// Nenhum benefício é inventado: se não houver benefício cadastrado, o texto fica em características.

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function facts(p: Product) {
  return {
    benefits: lines(p.benefits),
    specs: lines(p.specs),
    mandatory: lines(p.mandatoryInfo),
    restrictions: lines(p.restrictions),
  };
}

// ───────────────────────── Imagem
export interface ImagePromptOptions {
  purpose: 'vitrine' | 'lifestyle' | 'detalhe' | 'capa_video';
  scene: string;
  lighting: string;
  aspect: '9:16' | '1:1' | '4:5';
  showPerson: boolean;
}

export function imagePrompt(p: Product, o: ImagePromptOptions) {
  const purpose = {
    vitrine: 'clean e-commerce product photo on a neutral seamless background',
    lifestyle: 'realistic lifestyle photo of the product in real use',
    detalhe: 'macro close-up photo showing real texture and details',
    capa_video: 'vertical cover frame for a short product video',
  }[o.purpose];
  const en = [
    `Use the attached reference photo(s) of "${p.name}"${p.brand ? ` by ${p.brand}` : ''} as the exact product.`,
    `Create a ${purpose}, aspect ratio ${o.aspect}.`,
    o.scene ? `Setting: ${o.scene}.` : '',
    o.lighting ? `Lighting: ${o.lighting}.` : 'Lighting: soft natural daylight, true-to-life colors.',
    o.showPerson ? 'A person may hold or use the product naturally; the product stays in sharp focus and fully visible.' : 'No people.',
    'PRODUCT FIDELITY (mandatory): keep the exact shape, proportions, size, colors, print/pattern, materials, label text, logo and packaging from the reference.',
    'Do NOT add, remove or change any feature, accessory, part, color variant or quantity. Do NOT redesign the label or logo.',
    'Do NOT show results, before/after, body transformation, glowing effects or exaggerated effects.',
    'No text overlays, no prices, no badges like "No.1" or "100%", no third-party brands, no watermarks, no QR codes, no social media handles.',
    'Photorealistic, natural colors, no beauty filter.',
  ].filter(Boolean).join('\n');
  const pt = [
    'COMO USAR',
    '1. Anexe as fotos originais do produto na ferramenta de imagem.',
    '2. Cole o prompt em inglês (as ferramentas seguem melhor).',
    '3. Compare o resultado com a foto real: cor, estampa, formato, logotipo, rótulo, quantidade.',
    '4. Se qualquer detalhe mudou, descarte. Não corrija "no olho".',
    '',
    'AVISOS DE CONFORMIDADE',
    '• Imagem gerada por IA não substitui a foto real na página do produto.',
    '• Ao usar em vídeo, marque "Conteúdo gerado por IA" e/ou escreva "Imagem ilustrativa gerada por IA" (regra PV-IA-1, pendente de confirmação oficial; CP-3.1).',
    '• Vídeo feito só de imagens paradas é citado como não permitido (CI-1, VC-1). Use a imagem como apoio, não como o vídeo inteiro.',
    '• Imagens genéricas que não representam o produto com precisão devem ser evitadas (PR-1.2).',
  ].join('\n');
  return { en, pt };
}

// ───────────────────────── Vídeo (Google Flow)
export type VideoStyle = 'pov' | 'demonstracao' | 'apresentacao' | 'afiliado';

export interface VideoPromptOptions {
  style: VideoStyle;
  duration: number;
  scene: string;
  camera: string;
  lighting: string;
  person: 'nenhuma' | 'maos' | 'modelo_virtual';
  action: string;
}

const STYLE: Record<VideoStyle, { en: string; pt: string }> = {
  pov: { en: 'First-person POV shot, as if the viewer is holding and using the product', pt: 'POV (primeira pessoa)' },
  demonstracao: { en: 'Product demonstration showing how the product is actually used, step by step', pt: 'Demonstração de uso' },
  apresentacao: { en: 'Commercial presentation: slow reveal of the product from multiple angles', pt: 'Apresentação comercial' },
  afiliado: { en: 'Authentic UGC-style b-roll of the product in a real home setting', pt: 'Conteúdo de afiliado (apoio/b-roll)' },
};

export function videoPrompt(p: Product, o: VideoPromptOptions) {
  const f = facts(p);
  const person = {
    nenhuma: 'No people in frame; only the product and the setting.',
    maos: 'Only hands appear, handling the product naturally; no face.',
    modelo_virtual: 'A realistic virtual model handles the product (this is AI-generated and must be labeled as AI).',
  }[o.person];
  const en = [
    `Vertical 9:16 video, ${o.duration} seconds, single continuous shot, photorealistic.`,
    `${STYLE[o.style].en}.`,
    `Product: "${p.name}"${p.brand ? ` (${p.brand})` : ''}. Use the attached reference image(s) as the exact product.`,
    o.action ? `Action: ${o.action}.` : 'Action: the product is picked up, rotated slowly to show its main details, then placed back.',
    o.scene ? `Setting: ${o.scene}.` : 'Setting: real, tidy home environment.',
    `Camera: ${o.camera || 'handheld but stable, slow push-in, eye level, shallow depth of field'}.`,
    `Lighting: ${o.lighting || 'soft natural window light, true-to-life colors'}.`,
    person,
    'Natural, physically plausible motion at real-world speed. No morphing, no sudden transitions, no flashy effects, no speed ramps.',
    'PRODUCT FIDELITY (mandatory): exact shape, size, proportions, colors, print/pattern, materials, label text, logo and packaging as in the reference. Do not add accessories, parts, extra units or features. Do not change the label.',
    'Do NOT depict results, before/after, body changes, glowing skin effects, weight changes or any exaggerated effect.',
    'No on-screen text, no prices, no logos of other brands, no watermarks, no QR codes, no social handles.',
    'Audio: none (voiceover will be recorded separately by a real person).',
  ].join('\n');

  const warn: string[] = [
    '• Marque "Conteúdo gerado por IA" ao publicar e inclua "Vídeo gerado por IA" no texto ou legenda (PV-IA-1, pendente de confirmação oficial; CP-3.1).',
    '• Vídeo 100% IA, sem você aparecendo ou falando, tem risco de ser lido como "sem engajamento ativo" (CP-3.13.1, CI-1). Recomendado: use este clipe como apoio e grave sua voz explicando o produto, ou uma cena sua com o produto real.',
    '• Não use voz de IA. O guia de vídeos lista "áudio não humano (voz de IA, ASMR)" em "o que não fazer" (CI-1).',
    '• Confira quadro a quadro: se a IA mudou cor, estampa, formato, logotipo ou quantidade, descarte (PR-1.1, CP-3.10.1).',
  ];
  if (o.person === 'modelo_virtual')
    warn.push('• Modelo virtual realista: rotule como IA e não use para depoimento ("eu usei e amei"). Isso pode enganar o espectador (CP-3.1).');
  if (o.style === 'afiliado')
    warn.push('• Afiliado: o vídeo comprável precisa mostrar o produto e explicar como funciona. Só vincule o produto que aparece (VC-1).');

  const pt = [
    `ESTILO: ${STYLE[o.style].pt} · ${o.duration}s · 9:16`,
    '',
    'NARRAÇÃO SUGERIDA (grave com sua voz)',
    narration(p, o.duration),
    '',
    'AVISOS DE CONFORMIDADE',
    ...warn,
    f.mandatory.length ? `\nINFORMAÇÕES OBRIGATÓRIAS DO PRODUTO\n${f.mandatory.map((x) => '• ' + x).join('\n')}` : '',
  ].join('\n');
  return { en, pt };
}

function narration(p: Product, seconds: number) {
  const f = facts(p);
  const items = [...f.benefits, ...f.specs].slice(0, seconds <= 8 ? 2 : 4);
  const body = items.length ? items.join('. ') + '.' : '[Diga 1 ou 2 características reais do produto.]';
  return `Esse é o ${p.name}${p.brand ? ', da ' + p.brand : ''}. ${body} O link do produto está aqui no vídeo.`;
}

// ───────────────────────── Roteiro de vendas
export type Hook = 'pergunta' | 'problema' | 'curiosidade' | 'demonstracao';

export function salesScript(p: Product, hook: Hook, seconds: number) {
  const f = facts(p);
  const hooks: Record<Hook, string> = {
    pergunta: `Você já conhece o ${p.name}?`,
    problema: `Se você procura ${p.category.toLowerCase()} prático pro dia a dia, olha isso.`,
    curiosidade: `Deixa eu te mostrar um detalhe do ${p.name} que pouca gente repara.`,
    demonstracao: `Olha como eu uso o ${p.name}.`,
  };
  const max = seconds <= 15 ? 2 : seconds <= 30 ? 3 : 5;
  const pts = [...f.benefits, ...f.specs].slice(0, max);
  const blocks = [
    `[0–3s] GANCHO (você na câmera, com o produto na mão)\n${hooks[hook]}`,
    `[3–${Math.round(seconds * 0.6)}s] DEMONSTRAÇÃO (produto em foco, vários ângulos, em uso real)\n` +
      (pts.length ? pts.map((x) => `• ${x}`).join('\n') : '• [Mostre o produto e diga uma característica real.]'),
    `[${Math.round(seconds * 0.6)}–${seconds - 3}s] DETALHES\n` +
      `Marca: ${p.brand || '[marca]'}. ${p.price ? `Preço: confira o valor atualizado no link (cadastrado: ${p.price}).` : 'Fale do preço só se for o valor atual do TikTok Shop.'}`,
    `[${seconds - 3}–${seconds}s] CHAMADA\nToque no link do produto aqui no vídeo para ver tudo no TikTok Shop.`,
  ];
  const tips = [
    'BOAS PRÁTICAS (PR-1.3, VC-1, NO-5)',
    '• Apareça e fale. Mostre o produto real, em movimento.',
    '• O produto deve ocupar a maior parte do vídeo (PI-1).',
    '• Varie cenário e roteiro a cada vídeo. Não repita o mesmo vídeo (NO-1).',
    '• Não cite Instagram, WhatsApp, DM ou link na bio (CP-3.12).',
  ];
  return { script: blocks.join('\n\n'), tips: tips.join('\n') };
}

// ───────────────────────── Legenda e hashtags
const BLOCKED_HASHTAG = /(emagrec|perderpeso|queimagordura|secar|barriga|detox|ozempic|antesedepois|dieta|fitness|shape)/;

export function captionAndTags(p: Product, extraTags: string) {
  const f = facts(p);
  const highlight = f.benefits[0] || f.specs[0] || '';
  const caption = `${p.name}${p.brand ? ' — ' + p.brand : ''}${highlight ? '. ' + highlight : ''}. Veja os detalhes no link do produto aqui no TikTok Shop.`;
  const base = [
    'tiktokshop',
    'achadinhos',
    plain(p.category).replace(/[^a-z0-9]/g, ''),
    plain(p.name).split(/\s+/).slice(0, 2).join('').replace(/[^a-z0-9]/g, ''),
    p.brand ? plain(p.brand).replace(/[^a-z0-9]/g, '') : '',
  ];
  const extra = extraTags.split(/[\s,]+/).map((t) => plain(t).replace(/^#/, '').replace(/[^a-z0-9_]/g, ''));
  const all = [...new Set([...base, ...extra].filter(Boolean))];
  const removed = all.filter((t) => BLOCKED_HASHTAG.test(t));
  const tags = all.filter((t) => !BLOCKED_HASHTAG.test(t)).map((t) => '#' + t).join(' ');
  return { caption, tags, removed };
}

// ───────────────────────── LIVE
export function liveScript(products: Product[], minutes: number) {
  const per = Math.max(3, Math.floor((minutes - 6) / Math.max(1, products.length)));
  const out: string[] = [
    `ROTEIRO DE LIVE · ${minutes} min · ${products.length} produto(s)`,
    '',
    '[0–3 min] ABERTURA AO VIVO',
    '• Cumprimente quem está chegando pelo nome. Diga o que vai mostrar hoje.',
    '• Peça para comentarem dúvidas. Responda em tempo real.',
  ];
  let t = 3;
  products.forEach((p, i) => {
    const f = facts(p);
    out.push(
      '',
      `[${t}–${t + per} min] PRODUTO ${i + 1}: ${p.name}${p.brand ? ' (' + p.brand + ')' : ''}`,
      '• Fixe o produto certo no carrinho ANTES de mostrar. O que aparece = o que está vinculado (PR-1.1).',
      '• Mostre o produto físico na câmera, perto e em foco, por vários ângulos.',
      '• Demonstre o uso ao vivo.',
      ...(f.specs.length ? ['• Características: ' + f.specs.join('; ')] : []),
      ...(f.benefits.length ? ['• Benefícios comprováveis: ' + f.benefits.join('; ')] : ['• [Sem benefícios cadastrados: fale só de características.]']),
      ...(f.mandatory.length ? ['• Informações obrigatórias: ' + f.mandatory.join('; ')] : []),
      '• Preço: leia o valor que está no carrinho agora. Não diga "menor preço" (CP-3.10.2).',
      '• Responda 2 ou 3 perguntas sobre este produto.',
    );
    t += per;
  });
  out.push(
    '',
    `[${t}–${minutes} min] ENCERRAMENTO`,
    '• Recapitule os produtos mostrando cada um de novo.',
    '• Chamada: "Os produtos estão no carrinho aqui da LIVE."',
  );
  const rules = [
    'NUNCA NA LIVE',
    '• Voz de IA, vídeo gravado, gravação de tela, slides ou imagem parada cobrindo mais de 50% da tela (NO-4, CI-2).',
    '• Sair da frente da câmera sem usar "pausar" (CI-2).',
    '• Citar Instagram, WhatsApp, DM, link externo ou QR code (CP-3.12, LV-1).',
    '• Produto para emagrecimento ou queima de gordura (LV-1, CP-3.15).',
    '• Sorteio, aposta ou leilão fora do recurso oficial (CP-3.4, CP-3.2).',
    '• Repetir a mesma LIVE com o mesmo cenário e roteiro (NO-2).',
  ];
  return { script: out.join('\n'), rules: rules.join('\n') };
}

export interface ChecklistItem {
  id: string;
  group: 'Antes da LIVE' | 'Durante a LIVE' | 'Proibido';
  text: string;
  policyIds: string[];
}

export const LIVE_CHECKLIST: ChecklistItem[] = [
  { id: 'l1', group: 'Antes da LIVE', text: 'Conferi o Status da Conta no Centro de Criadores (violações ativas).', policyIds: ['LV-1'] },
  { id: 'l2', group: 'Antes da LIVE', text: 'Todos os produtos do carrinho passaram na análise de cadastro.', policyIds: ['CP-3.5', 'CP-3.6'] },
  { id: 'l3', group: 'Antes da LIVE', text: 'Os produtos físicos estão comigo e são idênticos aos vinculados (tamanho, estampa, quantidade, logo).', policyIds: ['PR-1.1'] },
  { id: 'l4', group: 'Antes da LIVE', text: 'Preços e descontos que vou falar batem com o carrinho.', policyIds: ['CP-3.10.1', 'CP-3.10.5'] },
  { id: 'l5', group: 'Antes da LIVE', text: 'Cenário e roteiro diferentes da última LIVE (não só troca de roupa).', policyIds: ['NO-2', 'NO-5'] },
  { id: 'l6', group: 'Antes da LIVE', text: 'Sem logotipos de outras marcas ou pessoas famosas no fundo.', policyIds: ['CP-3.7', 'PR-4.4'] },
  { id: 'l7', group: 'Antes da LIVE', text: 'Tenho 18 anos ou mais.', policyIds: ['LV-1', 'CP-4.2-MENOR'] },
  { id: 'l8', group: 'Durante a LIVE', text: 'Estou na câmera, falando em tempo real.', policyIds: ['CI-2', 'CP-3.13.1'] },
  { id: 'l9', group: 'Durante a LIVE', text: 'Mostro e explico cada produto vinculado, em foco.', policyIds: ['LV-1', 'CP-3.13.2'] },
  { id: 'l10', group: 'Durante a LIVE', text: 'Respondo perguntas dos espectadores.', policyIds: ['LV-1'] },
  { id: 'l11', group: 'Durante a LIVE', text: 'Uso "pausar" quando preciso sair.', policyIds: ['CI-2'] },
  { id: 'l12', group: 'Durante a LIVE', text: 'O produto ocupa a maior parte da LIVE.', policyIds: ['PI-1'] },
  { id: 'l13', group: 'Proibido', text: 'Não uso voz de IA, áudio ou clipe pré-gravado.', policyIds: ['NO-4', 'CI-2'] },
  { id: 'l14', group: 'Proibido', text: 'Não uso gravação de tela, slides ou imagem parada em mais de 50% da tela.', policyIds: ['CI-2', 'NO-4'] },
  { id: 'l15', group: 'Proibido', text: 'Não cito outras plataformas, DM, WhatsApp, link na bio ou QR code.', policyIds: ['CP-3.12', 'CI-3', 'LV-1'] },
  { id: 'l16', group: 'Proibido', text: 'Não exagero nem invento benefícios. Sem "menor preço", "nº 1", "100%".', policyIds: ['CP-3.10.2', 'CP-3.10.3'] },
  { id: 'l17', group: 'Proibido', text: 'Não promovo emagrecimento, queima de gordura ou antes e depois.', policyIds: ['LV-1', 'CP-3.15', 'CP-3.16'] },
  { id: 'l18', group: 'Proibido', text: 'Não faço sorteio, aposta ou leilão fora do recurso oficial.', policyIds: ['CP-3.4', 'CP-3.2'] },
  { id: 'l19', group: 'Proibido', text: 'Não peço compra por pena ("me ajuda a bater a meta").', policyIds: ['CP-3.11'] },
];
