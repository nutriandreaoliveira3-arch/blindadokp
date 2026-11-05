import type { Product } from '../types';
import { plain } from './normalize';
import { extractQuantities } from './analyze';

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
export type VideoTool = 'flow' | 'gemini' | 'kling' | 'runway' | 'hailuo' | 'higgsfield' | 'heygen' | 'youtube' | 'outra';

export const VIDEO_TOOLS: Record<VideoTool, { label: string; negativeField: boolean; tip: string }> = {
  flow: { label: 'Google Flow', negativeField: false, tip: 'Anexe as fotos do anúncio como referência (ingredientes/quadros), escolha 9:16 e cole o prompt.' },
  gemini: { label: 'Gemini (vídeo)', negativeField: false, tip: 'Anexe as fotos do anúncio na conversa, peça vídeo vertical 9:16 e cole o prompt. Peça sem fala e sem música.' },
  kling: { label: 'Kling AI', negativeField: true, tip: 'Use o modo imagem para vídeo com a foto principal do anúncio. Se houver campo de prompt negativo, cole lá as restrições.' },
  runway: { label: 'Runway', negativeField: false, tip: 'Comece pela imagem de referência e descreva o movimento. Prefira frases afirmativas ("mantém o logo idêntico") a negações.' },
  hailuo: { label: 'Hailuo AI', negativeField: false, tip: 'Use imagem para vídeo com a foto do anúncio. Descreva movimento de câmera e da cena de forma simples.' },
  higgsfield: { label: 'Higgsfield', negativeField: false, tip: 'Use imagem para vídeo com as fotos do anúncio como referência. Evite presets de efeito chamativo: o produto precisa continuar idêntico.' },
  heygen: { label: 'HeyGen (avatar)', negativeField: false, tip: 'ATENÇÃO: avatar com voz de IA. Em LIVE é proibido (NO-4, CI-2). Em vídeo, o guia lista "áudio não humano (voz de IA)" como "o que não fazer" (CI-1), e o avatar precisa ser rotulado como IA e não pode dar depoimento de uso. Prefira usar só para cenas do produto, com a sua voz.' },
  youtube: { label: 'YouTube Create', negativeField: false, tip: 'Ferramenta pensada para o YouTube. Confira se o vídeo sai sem marca d’água ou selo visível antes de usar no TikTok.' },
  outra: { label: 'Outra IA', negativeField: true, tip: 'Use imagem para vídeo com as fotos do anúncio. Se a ferramenta tiver campo de prompt negativo, use a parte de restrições nele.' },
};

export interface VideoPromptOptions {
  style: VideoStyle;
  duration: number;
  scene: string;
  camera: string;
  lighting: string;
  person: 'nenhuma' | 'maos' | 'modelo_virtual';
  action: string;
  noSample?: boolean; // produto sem amostra: IA fiel ao anúncio
  tool?: VideoTool;
  variant?: string; // cor/variação vinculada
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
  const kit = extractQuantities([p.name, p.listingTitle ?? '', p.specs].join(' ')).find((q) => q.endsWith('un') && parseFloat(q) > 1);
  const sample = o.noSample
    ? [
        `Exact product: "${p.listingTitle || p.name}". Use ALL attached listing photos (front, back, details) together as the single source of truth for the product.`,
        o.variant ? `Variant shown: ${o.variant} only (same color and print as the listing photo of this variant).` : '',
        kit ? `This is a set of ${parseFloat(kit)} pieces: all ${parseFloat(kit)} pieces must be clearly visible together at least once, none missing, none added.` : '',
        'Create a NEW original scene: do NOT reproduce the composition, background, model, pose or framing of the listing photos.',
        'Only show logos, labels or text that are visible on the product in the reference photos; never invent or change them.',
        'Keep the product moving and in use the whole time (no still frames, no slow zoom on a static image).',
      ].filter(Boolean)
    : [];
  const en: string[] = [
    `Vertical 9:16 video, ${o.duration} seconds, single continuous shot, photorealistic.`,
    ...sample,
    `${STYLE[o.style].en}.`,
    `Product: "${p.name}"${p.brand ? ` (${p.brand})` : ''}. Use the attached reference image(s) as the exact product.`,
    o.action ? `Action: ${o.action}.` : 'Action: the product is picked up, rotated slowly to show its main details, then placed back.',
    o.scene ? `Setting: ${o.scene}.` : 'Setting: real, tidy home environment.',
    `Camera: ${o.camera || 'handheld but stable, slow push-in, eye level, shallow depth of field'}.`,
    `Lighting: ${o.lighting || 'soft natural window light, true-to-life colors'}.`,
    person,
    'Natural, physically plausible motion at real-world speed.',
    'PRODUCT FIDELITY (mandatory): exact shape, size, proportions, colors, print/pattern, materials, label text, logo and packaging as in the reference.',
    'Audio: none (voiceover will be recorded separately by a real person).',
  ];
  const negatives = [
    'morphing, sudden transitions, flashy effects, speed ramps, still frames',
    'added accessories, extra parts, extra units, missing pieces, changed or invented logos, changed label text, changed colors or print',
    'results on the body, before/after, body changes, weight changes, glowing skin, exaggerated effects',
    'on-screen text, prices, logos of other brands, watermarks, QR codes, social media handles, subtitles',
    'copying the listing photo composition, background, model or pose',
  ];
  const tool = VIDEO_TOOLS[o.tool ?? 'flow'];
  const negative = tool.negativeField ? negatives.join(', ') : '';
  const enText = tool.negativeField
    ? en.join('\n')
    : [...en, `Avoid: ${negatives.join('; ')}.`].join('\n');

  const warn: string[] = [
    `• ${tool.label}: ${tool.tip}`,
    '• Marca d’água: planos gratuitos de várias IAs colocam marca d’água ou logo no vídeo. No TikTok Shop, marca d’água ou logo de outra plataforma indica conteúdo não original (CP-3.13.1). Use plano sem marca d’água ou não publique.',
    '• Marque "Conteúdo gerado por IA" ao publicar e inclua "Vídeo gerado por IA" no texto ou legenda (PV-IA-1, pendente de confirmação oficial; CP-3.1).',
    '• Vídeo 100% IA, sem você aparecendo ou falando, tem risco de ser lido como "sem engajamento ativo" (CP-3.13.1, CI-1). Recomendado: use este clipe como apoio e grave sua voz explicando o produto, ou uma cena sua com o produto real.',
    '• Não use voz de IA. O guia de vídeos lista "áudio não humano (voz de IA, ASMR)" em "o que não fazer" (CI-1).',
    '• Confira quadro a quadro: se a IA mudou cor, estampa, formato, logotipo ou quantidade, descarte (PR-1.1, CP-3.10.1).',
  ];
  if (o.person === 'modelo_virtual')
    warn.push('• Modelo virtual realista: rotule como IA e não use para depoimento ("eu usei e amei"). Isso pode enganar o espectador (CP-3.1).');
  if (o.style === 'afiliado')
    warn.push('• Afiliado: o vídeo comprável precisa mostrar o produto e explicar como funciona. Só vincule o produto que aparece (VC-1).');

  if (o.noSample)
    warn.unshift(
      '• MODO SEM AMOSTRA: depois de gerar, use "Conferir anúncio x vídeo" antes de publicar. "Produto inconsistente" foi a causa de 62 dos 136 pontos da conta.',
      '• Estrutura mais segura (híbrida): [0–3s] você na câmera, ambiente real → [3–12s] cenas de IA do produto + SUA voz → [final] você: "toque no link do produto aqui no vídeo".',
      `• Fale o produto com as palavras do título do anúncio${p.listingTitle ? `: "${p.listingTitle}"` : ''}. Não diga "da [nome da loja]" logo depois do produto.`,
      '• Não fale preço nem desconto: diga "confira o preço no link".',
    );
  const pt = [
    `FERRAMENTA: ${tool.label} · ESTILO: ${STYLE[o.style].pt} · ${o.duration}s · 9:16${o.noSample ? ' · SEM AMOSTRA' : ''}`,
    '',
    'NARRAÇÃO SUGERIDA (grave com sua voz)',
    narration(p, o.duration),
    '',
    'AVISOS DE CONFORMIDADE',
    ...warn,
    f.mandatory.length ? `\nINFORMAÇÕES OBRIGATÓRIAS DO PRODUTO\n${f.mandatory.map((x) => '• ' + x).join('\n')}` : '',
  ].join('\n');
  return { en: enText, negative, pt, tool: tool.label };
}

function narration(p: Product, seconds: number) {
  const f = facts(p);
  const items = [...f.benefits, ...f.specs].slice(0, seconds <= 8 ? 2 : 4);
  const body = items.length ? items.join('. ') + '.' : '[Diga 1 ou 2 características reais do produto.]';
  return `Esse é o ${p.listingTitle || p.name}. ${body} Toque no link do produto aqui no vídeo para ver os detalhes.`;
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
    '• Voz de IA, avatar de IA (HeyGen ou similar), vídeo gravado, gravação de tela, slides ou imagem parada cobrindo mais de 50% da tela (NO-4, CI-2).',
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
  { id: 'l13b', group: 'Proibido', text: 'Não uso avatar de IA (HeyGen ou similar) no lugar de uma pessoa real ao vivo.', policyIds: ['NO-4', 'CI-2', 'CP-3.13.1'] },
  { id: 'l14', group: 'Proibido', text: 'Não uso gravação de tela, slides ou imagem parada em mais de 50% da tela.', policyIds: ['CI-2', 'NO-4'] },
  { id: 'l15', group: 'Proibido', text: 'Não cito outras plataformas, DM, WhatsApp, link na bio ou QR code.', policyIds: ['CP-3.12', 'CI-3', 'LV-1'] },
  { id: 'l16', group: 'Proibido', text: 'Não exagero nem invento benefícios. Sem "menor preço", "nº 1", "100%".', policyIds: ['CP-3.10.2', 'CP-3.10.3'] },
  { id: 'l17', group: 'Proibido', text: 'Não promovo emagrecimento, queima de gordura ou antes e depois.', policyIds: ['LV-1', 'CP-3.15', 'CP-3.16'] },
  { id: 'l18', group: 'Proibido', text: 'Não faço sorteio, aposta ou leilão fora do recurso oficial.', policyIds: ['CP-3.4', 'CP-3.2'] },
  { id: 'l19', group: 'Proibido', text: 'Não peço compra por pena ("me ajuda a bater a meta").', policyIds: ['CP-3.11'] },
];
