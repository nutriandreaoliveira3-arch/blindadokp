import type { ContentField, ContentInput, Finding, Policy, Product, ProductionContext, RiskLevel } from '../types';
import { DETECTORS, type Detector } from './detectors';
import { normalize, plain, sentenceBounds } from './normalize';

let seq = 0;
const fid = () => `f${Date.now().toString(36)}${(seq++).toString(36)}`;

export const FIELD_LABEL: Record<ContentField, string> = {
  roteiro: 'Roteiro e fala',
  textoTela: 'Texto na tela',
  legenda: 'Legenda',
  hashtags: 'Hashtags',
  imagem: 'Imagem / descrição visual',
  producao: 'Produção e uso de IA',
  produto: 'Cadastro do produto',
  live: 'Roteiro da LIVE',
};

export function activePolicyIds(policies: Policy[]): Set<string> {
  return new Set(policies.filter((p) => p.status === 'ativa' || p.status === 'pendente_verificacao').map((p) => p.id));
}

function detectorEnabled(d: Detector, active: Set<string>) {
  return d.policyIds.some((id) => active.has(id));
}

/** Roda os detectores de texto em um campo. */
export function scanText(
  text: string,
  field: ContentField,
  policies: Policy[],
  productCategory?: string,
): Finding[] {
  if (!text || !text.trim()) return [];
  const active = activePolicyIds(policies);
  const norm = normalize(text);
  const out: Finding[] = [];
  const seen = new Set<string>();

  const push = (d: Pick<Detector, 'id' | 'title' | 'severity' | 'explanation' | 'fix' | 'humanReview'>, policyIds: string[], s: number, e: number) => {
    const start = norm.map[s] ?? 0;
    const end = (norm.map[e - 1] ?? start) + 1;
    const key = `${d.id}:${start}`;
    if (seen.has(key)) return;
    seen.add(key);
    const excerpt = text.slice(start, end);
    let suggestion: string | undefined;
    if (d.fix.mode === 'match') suggestion = d.fix.replacement ?? '';
    if (d.fix.mode === 'sentence') suggestion = d.fix.replacement;
    out.push({
      id: fid(),
      detectorId: d.id,
      field,
      excerpt,
      start,
      end,
      severity: d.severity,
      policyIds: policyIds.filter((id) => active.has(id)),
      title: d.title,
      explanation: d.explanation,
      suggestion,
      fixMode: d.fix.mode,
      humanReview: d.humanReview,
      origin: 'regra',
    });
  };

  for (const d of DETECTORS) {
    if (!detectorEnabled(d, active)) continue;
    if (d.fields && !d.fields.includes(field)) continue;
    if (d.categories && productCategory && !d.categories.includes(productCategory)) continue;
    if (d.requires && !d.requires.test(norm.text)) continue;
    for (const re of d.patterns) {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      let m: RegExpExecArray | null;
      while ((m = g.exec(norm.text))) {
        if (m[0].length === 0) {
          g.lastIndex++;
          continue;
        }
        push(d, d.policyIds, m.index, m.index + m[0].length);
      }
    }
  }

  // Termos personalizados cadastrados pela usuária nas políticas
  for (const pol of policies) {
    if (!pol.customTerms?.length || !(pol.status === 'ativa' || pol.status === 'pendente_verificacao')) continue;
    for (const term of pol.customTerms) {
      const t = plain(term).trim();
      if (!t) continue;
      let idx = norm.text.indexOf(t);
      while (idx >= 0) {
        push(
          {
            id: `T-${pol.id}`,
            title: `Termo de risco: "${term}"`,
            severity: pol.type === 'proibicao' ? 'alto' : 'atencao',
            explanation: `Termo cadastrado na regra ${pol.id} (${pol.title}).`,
            fix: { mode: 'manual' },
            humanReview: true,
          },
          [pol.id],
          idx,
          idx + t.length,
        );
        idx = norm.text.indexOf(t, idx + t.length);
      }
    }
  }
  return out;
}

const C = (
  severity: 'alto' | 'atencao',
  policyIds: string[],
  title: string,
  explanation: string,
  suggestion?: string,
  humanReview?: boolean,
): Finding => ({
  id: fid(),
  detectorId: 'CHK',
  field: 'producao',
  severity,
  policyIds,
  title,
  explanation,
  suggestion,
  fixMode: 'manual',
  humanReview,
  origin: 'checklist',
});

/** Regras baseadas nas respostas do checklist de produção. */
export function checkContext(ctx: ProductionContext, input: ContentInput, product?: Product): Finding[] {
  const f: Finding[] = [];
  const isLive = ctx.contentType === 'live';
  const isAI = ctx.origem === 'ia_total' || ctx.origem === 'ia_parcial';

  const unanswered = (
    ['origem', 'productShown', 'linkMatch', 'presence', 'audio', 'originality', 'creatorAdult'] as (keyof ProductionContext)[]
  ).filter((k) => !ctx[k]);
  if (unanswered.length)
    f.push(C('atencao', ['CP-1'], 'Checklist de produção incompleto',
      `Há ${unanswered.length} pergunta(s) sem resposta. Sem essas informações a análise não consegue verificar correspondência do produto, uso de IA e originalidade.`,
      'Responda todas as perguntas do checklist antes de publicar.', true));

  if (ctx.creatorAdult === 'nao')
    f.push(C('alto', ['LV-1', 'VC-1', 'CP-4.2-MENOR'], 'Criador menor de 18 anos',
      'Apenas criadores com 18 anos ou mais podem fazer LIVEs ou promover produtos.', 'O conteúdo deve ser publicado por um criador maior de idade.'));

  // Produto
  if (product?.gate?.level === 'alto')
    f.push(C('alto', ['CP-3.5', 'CP-3.15'], 'Produto bloqueado na análise de cadastro',
      'O produto vinculado tem risco alto no cadastro. Nenhum conteúdo deve ser publicado antes de corrigir o cadastro ou trocar de produto.', 'Revise o produto em "Biblioteca de produtos".'));
  if (!product)
    f.push(C('atencao', ['CP-3.13.2'], 'Nenhum produto vinculado',
      'Sem produto cadastrado, a análise não confere a correspondência entre o conteúdo e o produto anunciado.', 'Vincule um produto da biblioteca.', true));

  if (ctx.productShown === 'nao')
    f.push(C('alto', ['CP-3.13.2', 'PI-3', 'VC-1', 'LV-1'], 'Produto não aparece no conteúdo',
      'O produto vinculado precisa ser mostrado de forma explícita e completa. Sem produto, não vincule link.', 'Mostre o produto físico na câmera e explique como funciona.'));
  if (ctx.productShown === 'parcial')
    f.push(C('atencao', ['CP-3.13.2', 'PR-1.2'], 'Produto mostrado parcialmente',
      'Produto fora de foco, em segundo plano ou incompleto é citado como promoção irrelevante.', 'Mostre o produto em foco, por vários ângulos, com os detalhes principais.'));
  if (ctx.productMostDuration === 'nao')
    f.push(C('alto', ['PI-1'], 'Produto não ocupa a maior parte do conteúdo',
      'Com produto em âncora, ele deve ser apresentado ou promovido durante a maior parte da duração.', 'Reduza o trecho fora do tema e traga o produto para o início.'));
  if (ctx.linkMatch === 'diferente')
    f.push(C('alto', ['PR-1.1', 'CP-3.13.2', 'CP-3.10.1'], 'Produto mostrado diferente do vinculado',
      'Produtos não correspondem quando diferem em tamanho, peso, padrão, quantidade, ilustrações, logotipo, imagem ou estampa.', 'Vincule exatamente o produto que aparece, ou grave com o produto do anúncio.'));
  if (ctx.linkMatch === 'cor_diferente')
    f.push(C('atencao', ['PR-1.1', 'CI-4'], 'Cor diferente do anúncio',
      'Cor diferente é aceita, mas o guia recomenda informar a variação.', 'Diga na fala ou no texto que o produto está disponível em outras cores.'));
  if (ctx.linkMatch === 'sem_link' && ctx.contentType !== 'imagem')
    f.push(C('atencao', ['PI-3'], 'Conteúdo sem link de produto',
      'Sem link, as regras de vídeo comprável não se aplicam, mas o conteúdo não gera venda pelo Shop.', undefined, true));

  // Presença, áudio e estático
  if (ctx.presence === 'nenhuma' && ctx.demonstration !== 'real')
    f.push(C('alto', ['CP-3.13.1', 'CI-1'], 'Sem presença humana e sem demonstração real',
      'É proibido conteúdo sem engajamento ativo: criador que não fala, não aparece e não demonstra o produto de forma significativa. O guia de vídeos pede não omitir presença humana ou exibição do produto.',
      'Inclua você mostrando ou usando o produto, ou sua voz explicando em tempo real.'));
  else if (ctx.presence === 'nenhuma')
    f.push(C('atencao', ['CP-3.13.1', 'CI-1'], 'Sem presença humana',
      'Há demonstração do produto, mas sem criador. O guia recomenda mostrar seu rosto ou o produto físico com engajamento. Interpretação incerta.',
      'Prefira incluir sua voz ou suas mãos usando o produto.', true));
  if (ctx.audio === 'voz_ia' || ctx.audio === 'asmr')
    f.push(C(isLive ? 'alto' : 'atencao', isLive ? ['NO-4', 'CI-2'] : ['CI-1'],
      isLive ? 'Voz de IA ou ASMR na LIVE' : 'Áudio não humano (voz de IA ou ASMR)',
      isLive
        ? 'Em LIVE é proibido usar áudio ou narração gerada por IA.'
        : 'O guia de vídeos lista "usar áudio não humano (voz de IA, ASMR)" em "o que não fazer". A Política de Conteúdo não proíbe isso de forma expressa para vídeos. Risco real, mas não confirmado.',
      'Grave a narração com sua própria voz.', !isLive));
  if (ctx.audio === 'musica' || ctx.audio === 'sem_audio') {
    if (ctx.presence !== 'aparece_fala')
      f.push(C('atencao', ['CP-3.13.1', 'PR-1.2'], 'Sem fala explicando o produto',
        'Sem fala, o conteúdo depende só de texto para informar o produto. Pode ser lido como falta de engajamento ativo.',
        'Adicione narração com sua voz ou texto na tela com as características do produto.', true));
    if (ctx.audio === 'musica')
      f.push(C('atencao', ['NO-3'], 'Música no vídeo',
        'Música protegida por direitos autorais só é permitida nas exceções da política.', 'Use músicas da biblioteca comercial do TikTok.', true));
  }
  if (ctx.staticContent === 'maior_parte')
    f.push(C('alto', isLive ? ['CI-2', 'CP-3.13.1'] : ['CI-1', 'VC-1', 'CP-3.13.1', 'EV-5'],
      isLive ? 'Elementos estáticos em mais de 50% da tela' : 'Vídeo feito de imagens estáticas',
      isLive
        ? 'Não permita que elementos visuais estáticos cubram mais de 50% da tela; não use slides, imagens paradas ou figuras animadas.'
        : 'Vídeos inteiros de imagens estáticas, slideshows ou rolagens são citados como não permitidos.',
      'Grave o produto em movimento, em ambiente real.'));
  if (ctx.staticContent === 'parcial')
    f.push(C('atencao', ['CI-1', 'VC-1', 'EV-5'], 'Trechos com imagem parada',
      'Imagens paradas e slideshows devem ser evitados. Use só como apoio curto.', 'Substitua trechos parados por cenas do produto em uso.', true));

  // Originalidade
  const o = ctx.originality;
  if (o === 'repost_proprio')
    f.push(C('alto', ['NO-1'], 'Republicação do próprio conteúdo', 'Não republique seu próprio conteúdo.', 'Grave uma nova versão com roteiro, cenário e exibição do produto diferentes.'));
  if (o === 'terceiro_sem_edicao')
    f.push(C('alto', ['CP-3.13.1', 'NO-1', 'CP-3.7'], 'Conteúdo de terceiros sem contribuição',
      'Conteúdo de outros criadores ou fontes protegidas, sem alterações significativas, é não original e pode violar direitos.', 'Use material próprio.'));
  if (o === 'stitch_sem_comentario')
    f.push(C('alto', ['NO-2', 'CP-3.13.1'], 'Costura/Dueto sem promoção do produto',
      'Usar Costura ou Dueto sem promoção verbal ou textual do produto é exemplo de violação.', 'Apareça e comente o produto com sua perspectiva.'));
  if (o === 'terceiro_com_contribuicao')
    f.push(C('atencao', ['NO-5', 'NO-1'], 'Usa conteúdo de terceiros', 'Exige contribuição significativa e crédito ao criador original.', 'Dê crédito e garanta que sua parte seja a principal.', true));
  if (ctx.watermark === 'sim')
    f.push(C('alto', ['CP-3.13.1', 'NO-1'], 'Marca d’água de outra plataforma', 'Marca d’água, adesivo ou logotipo de outra plataforma indica conteúdo não original.', 'Exporte o vídeo original sem marca d’água.'));
  if (ctx.layeredEditing === 'sim')
    f.push(C('alto', ['PR-3'], 'Edição em camadas ou quadros inseridos',
      'Vídeos em camadas, quadros sanduíche ou disfarce de formato são táticas evasivas e podem gerar ação disciplinar.', 'Publique o vídeo em formato único e contínuo.'));
  if (ctx.sameContentOtherAccounts === 'sim')
    f.push(C('alto', ['NO-2', 'CI-5'], 'Mesmo conteúdo em várias contas', 'Publicar conteúdo idêntico em várias contas é violação.', 'Crie uma versão original para cada conta.'));
  if (ctx.thirdPartyBrandOrPerson === 'sim')
    f.push(C('alto', ['CP-3.7', 'PR-4.4'], 'Marca ou pessoa de terceiros sem permissão', 'Marcas, logotipos, nomes ou imagens de pessoas exigem permissão expressa.', 'Remova ou obtenha autorização por escrito.'));
  if (ctx.reviewScreenshot === 'sim')
    f.push(C('alto', ['PR-4.4'], 'Print de avaliação de cliente', 'Incluir captura de tela de avaliação de cliente sem permissão é exemplo de violação.', 'Remova o print ou tenha autorização do cliente.'));
  if (ctx.beautyFilter === 'sim')
    f.push(C('alto', ['CP-3.10.7'], 'Filtro de beleza', 'Filtros de beleza enganosos são proibidos.', 'Grave sem filtro que altere pele, rosto ou corpo.'));

  // LIVE
  if (isLive) {
    f.push(C('atencao', ['EV-7', 'LV-1'], 'LIVE: produto o tempo todo',
      'A conta já foi punida em LIVE por conversa fora do produto ("experiências com transmissões ao vivo e preferências musicais", "pedi a opinião dos espectadores... e não demonstrei nem descrevi" o produto).',
      'Sempre com um produto vinculado na mão. Responda comentários trazendo o assunto de volta para o produto. O título da LIVE deve combinar com os produtos (ex.: não usar "Achadinhas Fitness" com kit de shampoo).', true));
    if (ctx.preRecordedInLive === 'sim')
      f.push(C('alto', ['NO-4', 'NO-2'], 'Trecho pré-gravado na LIVE', 'Não pré-grave nem insira clipes pré-gravados na LIVE.', 'Faça tudo ao vivo. Use o recurso "pausar" ao se ausentar.'));
    if (ctx.screenRecording === 'sim')
      f.push(C('alto', ['NO-4', 'CI-2'], 'Gravação de tela na LIVE', 'Não use gravações de tela ou capturas de páginas de produtos na LIVE.', 'Mostre o produto físico.'));
  }

  // IA
  if (isAI) {
    f.push(C('atencao', ['CP-3.1', 'CP-3.13.1'], 'Conteúdo com uso significativo de IA',
      'IA é permitida se não enganar, não assumir identidade de outra pessoa e respeitar as demais regras. Como o vídeo não é gravado em ambiente real, há incerteza sobre engajamento ativo e originalidade. Revisão humana recomendada.',
      'Combine cenas reais suas com o produto e use IA só como apoio.', true));
    if (ctx.aiDisclosure !== 'sim')
      f.push(C('alto', ['PV-IA-1', 'CP-3.1'], 'IA sem identificação',
        'Segundo a fonte secundária enviada, conteúdo totalmente gerado ou significativamente modificado por IA precisa ser identificado (opção "Conteúdo gerado por IA", texto na tela ou descrição). Regra pendente de confirmação no documento oficial; rotular por precaução evita engano.',
        'Ative "Conteúdo gerado por IA" ao publicar e escreva "Imagens geradas por IA" na tela ou na legenda.', true));
    if (ctx.virtualModel === 'sim')
      f.push(C('atencao', ['PV-IA-1', 'CP-3.1', 'CP-3.11'], 'Modelo virtual realista',
        'Modelo virtual realista exige identificação como IA e não pode se passar por pessoa real nem dar depoimento de uso.', 'Não use o modelo virtual para dizer "eu usei e aprovei".', true));
  }
  if (ctx.aiAlteredProduct === 'sim')
    f.push(C('alto', ['CP-3.1', 'CP-3.10.1', 'PR-1.1'], 'IA alterou características do produto',
      'Alterar cor, estampa, formato, logotipo ou inventar acessórios torna a demonstração falsa e o produto deixa de corresponder ao anúncio.', 'Gere novamente a partir da foto real, travando aparência do produto.'));
  if (ctx.demonstration === 'ilustrativa_sem_rotulo')
    f.push(C('alto', ['CP-3.10.1', 'CP-3.1', 'PR-1.2'], 'Demonstração ilustrativa sem aviso',
      'Uma cena ilustrativa apresentada como uso real pode ser demonstração enganosa.', 'Escreva na tela "Imagem ilustrativa" ou substitua por demonstração real.'));

  // Vídeo educativo com produto — evidência EV-6
  if (ctx.educational === 'sim' && ctx.linkMatch !== 'sem_link')
    f.push(C(ctx.productMostDuration === 'sim' ? 'atencao' : 'alto', ['EV-6', 'PI-1', 'PI-3', 'CP-3.13.2'], 'Vídeo educativo com produto vinculado',
      'A conta já recebeu 3 violações em um dia por vídeos educativos ("fome emocional") com suplemento vinculado: "Parece que seu vídeo não apresentou nenhum produto promovido."',
      'Duas opções: (1) publique o vídeo educativo SEM link de produto; ou (2) faça um vídeo sobre o produto: mostre, use, explique tipo, tamanho e ingredientes durante a maior parte do vídeo.'));
  // IA: conferência com o anúncio — evidência EV-4
  if ((ctx.origem === 'ia_total' || ctx.origem === 'ia_parcial' || ctx.origem === 'misto') && ctx.aiProductCheck !== 'conferido')
    f.push(C('alto', ['EV-4', 'PR-1.1', 'CP-3.1'], 'Vídeo com IA sem conferência com o anúncio',
      '"Promoção de produto inconsistente" é a violação mais frequente da conta (de 8 a 15 pontos). O TikTok compara tipo, tamanho, peso, imagens e logotipos do vídeo com o anúncio vinculado. Vídeos com IA costumam alterar logo, rótulo, cor ou número de peças.',
      'Antes de publicar, pause o vídeo em 3 ou 4 momentos e compare com a foto principal do anúncio: logo, rótulo, cor, formato e quantidade de peças. Qualquer diferença: gere de novo ou grave com o produto real.'));
  // Origem das imagens — evidência EV-2
  if (ctx.mediaSource === 'terceiros')
    f.push(C('alto', ['EV-2', 'NO-1', 'CP-3.13.1', 'CP-3.7'], 'Imagens de outro criador ou da internet',
      'O TikTok já aplicou violação de conteúdo não original anexando frames que pareciam copiados de outro criador. Fotos e vídeos de terceiros, sem permissão, são proibidos.',
      'Grave ou fotografe o produto você mesma. Use só material próprio.'));
  if (ctx.mediaSource === 'referencia_ia')
    f.push(C('alto', ['EV-2', 'NO-2', 'CP-3.1'], 'IA gerada a partir de vídeo/foto de outro criador',
      'Usar cenas de outro criador como referência para a IA pode reproduzir enquadramento, cenário e poses, e ser detectado como cópia ("recriar o estilo de vídeo de outro criador").',
      'Use como referência apenas fotos que você mesma fez do produto real.'));
  if (ctx.mediaSource === 'vendedor')
    f.push(C('atencao', ['EV-2', 'NO-1', 'PR-1.2'], 'Imagens fornecidas pelo vendedor',
      'Fotos do anúncio ou do fornecedor podem já ter sido usadas por outros criadores e ser lidas como conteúdo não original.',
      'Use como apoio e inclua cenas suas com o produto físico. Guarde a autorização do vendedor.', true));

  // Nome e marca falados x anúncio — evidência EV-4 (Boneca de Ferro)
  if (ctx.nameMatch === 'nao')
    f.push(C('alto', ['EV-4', 'PR-4.1', 'CP-3.10.1'], 'Marca ou nome no vídeo diferente do anúncio',
      'O TikTok lê a marca e o nome do produto no vídeo (fala, texto e etiqueta) e compara com o anúncio vinculado. Exemplo real: "conjunto da boneca de ferro, que não corresponde ao produto listado: roupas esportivas e moletom" (-8 pontos).',
      'Use no vídeo a mesma marca e o mesmo nome do título do anúncio, ou vincule o anúncio da marca que aparece.'));
  if (product?.listingTitle) {
    const said = plain([input.roteiro, input.textoTela, input.legenda].join(' '));
    const title = plain(product.listingTitle);
    const bad = [product.brand, product.modelName].filter((x): x is string => !!x && said.includes(plain(x)) && !title.includes(plain(x)));
    if (bad.length)
      f.push(C('atencao', ['EV-4', 'PR-1.1'], `"${bad.join('", "')}" é citado no vídeo, mas não está no título do anúncio`,
        'O TikTok pode não reconhecer esse nome como o produto vinculado.',
        `Cite também o produto como está no título: "${product.listingTitle}".`, true));
  }

  // Produto x conteúdo: peso/quantidade
  if (product) f.push(...checkQuantities(input, product));

  // Produto x conteúdo: marca e nome mencionados
  if (product) {
    const all = plain([input.roteiro, input.textoTela, input.legenda].join(' '));
    const name = plain(product.name).split(/\s+/).filter((w) => w.length > 3);
    const hit = name.some((w) => all.includes(w)) || (product.brand && all.includes(plain(product.brand)));
    if (!hit && (input.roteiro || input.legenda))
      f.push(C('atencao', ['PR-1.2', 'PI-2', 'CP-3.13.2'], 'Produto não é citado no texto',
        'Nome e marca do produto não aparecem no roteiro, texto na tela nem legenda. Para maquiagem e skincare aplicados, é obrigatório mencionar marca e produto.',
        `Cite "${product.name}${product.brand ? ' — ' + product.brand : ''}" na fala ou no texto.`, true));
  }
  return f;
}

// ───────── Quantidades (peso, volume, unidades) — evidência EV-1
const UNIT: Record<string, string> = {
  g: 'g', gr: 'g', grama: 'g', gramas: 'g', kg: 'kg', quilo: 'kg', quilos: 'kg', mg: 'mg',
  ml: 'ml', l: 'l', litro: 'l', litros: 'l', lb: 'lb', lbs: 'lb', oz: 'oz',
  un: 'un', und: 'un', unid: 'un', unidade: 'un', unidades: 'un', pecas: 'un', peca: 'un', itens: 'un',
};

/** Extrai quantidades como "900g", "1,5 l", "kit com 3", "3 unidades". Retorna valores normalizados ("900g"). */
export function extractQuantities(text: string): string[] {
  const t = plain(text);
  const out = new Set<string>();
  const re = /(\d+(?:[.,]\d+)?)\s?(kg|g|gr|gramas?|quilos?|mg|ml|l|litros?|lbs?|oz|unidades?|unid|und|un|pecas?|itens)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const n = parseFloat(m[1].replace(',', '.'));
    if (!isFinite(n) || n === 0) continue;
    out.add(`${n}${UNIT[m[2]] ?? m[2]}`);
  }
  const kit = /\b(?:kit|combo|pack|conjunto)\s+(?:com|de)\s+(\d+)\b/g;
  while ((m = kit.exec(t))) out.add(`${parseInt(m[1])}un`);
  return [...out];
}

function toBase(q: string): [number, string] {
  const m = q.match(/^([\d.]+)(\w+)$/);
  if (!m) return [NaN, q];
  const n = parseFloat(m[1]);
  const u = m[2];
  if (u === 'kg') return [n * 1000, 'g'];
  if (u === 'mg') return [n / 1000, 'g'];
  if (u === 'l') return [n * 1000, 'ml'];
  if (u === 'lb') return [n * 453.6, 'g'];
  if (u === 'oz') return [n * 28.35, 'g'];
  return [n, u];
}

/** Uma quantidade do conteúdo bate com alguma do produto (tolerância de 3% para conversões como 900 g = 1,98 lb). */
function matches(q: string, product: string[]) {
  const [a, ua] = toBase(q);
  return product.some((p) => {
    const [b, ub] = toBase(p);
    return ua === ub && Math.abs(a - b) <= Math.max(1, b * 0.03);
  });
}

export function checkQuantities(input: ContentInput, product: Product): Finding[] {
  const content = [input.roteiro, input.textoTela, input.legenda, input.imagemDescricao].join('\n');
  const inContent = extractQuantities(content);
  const inProduct = extractQuantities([product.name, product.specs, product.description].join('\n'));
  const kit = inProduct.map(toBase).find(([n, u]) => u === 'un' && n > 1);
  if (kit && !inContent.some((q) => matches(q, inProduct.filter((x) => x.endsWith('un')))))
    return [C('atencao', ['EV-4', 'EV-1', 'PR-1.1'], `Kit com ${kit[0]} itens: o conteúdo não confirma a quantidade`,
      `O anúncio é de ${kit[0]} unidades/peças. Produtos não correspondem quando a quantidade é diferente. Em 04/11/2026 a conta recebeu -8 pontos por "promoção de produto inconsistente" logo após vídeos de kits passarem na pré-verificação.`,
      `Mostre as ${kit[0]} peças juntas na câmera, uma a uma, na mesma cor da variação vinculada, e diga ou escreva "kit com ${kit[0]} peças: …".`, true)];
  if (!inContent.length) return [];
  if (!inProduct.length)
    return [C('atencao', ['EV-1', 'PR-1.1'], 'Quantidade citada, mas não cadastrada no produto',
      `O conteúdo cita ${inContent.join(', ')}, mas o cadastro do produto não informa peso, volume ou quantidade. O TikTok já aplicou violação por peso divergente do anúncio.`,
      'Cadastre peso/volume/quantidade exatamente como está no anúncio do TikTok Shop e analise de novo.', true)];
  const wrong = inContent.filter((q) => !matches(q, inProduct));
  if (!wrong.length) return [];
  return [C('alto', ['EV-1', 'PR-1.1', 'CP-3.13.2', 'CP-3.10.1'], 'Peso ou quantidade diferente do anúncio',
    `O conteúdo cita ${wrong.join(', ')}, mas o produto cadastrado tem ${inProduct.join(', ')}. Produtos não correspondem quando diferem em tamanho, peso ou quantidade. Já houve violação real por isso (-4 pontos, produtos removidos do vídeo).`,
    `Use no vídeo, no texto e na legenda exatamente o que está no anúncio: ${inProduct.join(', ')}. Se o produto mostrado for outro tamanho, vincule o anúncio correto.`)];
}

export function riskLevel(findings: Finding[]): RiskLevel {
  if (findings.some((x) => x.severity === 'alto')) return 'alto';
  if (findings.length) return 'atencao';
  return 'baixo';
}

export function analyzeContent(
  input: ContentInput,
  ctx: ProductionContext,
  policies: Policy[],
  product?: Product,
): { findings: Finding[]; level: RiskLevel } {
  const cat = product?.category;
  const textField: ContentField = ctx.contentType === 'live' ? 'live' : 'roteiro';
  const findings = [
    ...scanText(input.roteiro, textField, policies, cat),
    ...scanText(input.textoTela, 'textoTela', policies, cat),
    ...scanText(input.legenda, 'legenda', policies, cat),
    ...scanText(input.hashtags, 'hashtags', policies, cat),
    ...scanText(input.imagemDescricao, 'imagem', policies, cat),
    ...checkContext(ctx, input, product),
  ];
  return { findings, level: riskLevel(findings) };
}

export const LEVEL_INFO: Record<RiskLevel, { emoji: string; label: string; desc: string }> = {
  baixo: { emoji: '🟢', label: 'Baixo risco', desc: 'Nenhuma violação identificada na análise disponível.' },
  atencao: { emoji: '🟡', label: 'Atenção', desc: 'Existem elementos que precisam de revisão.' },
  alto: { emoji: '🔴', label: 'Alto risco', desc: 'Possível violação de política. Corrija antes de publicar.' },
};

export const DISCLAIMER =
  'Classificação interna e estimada, baseada apenas nas regras cadastradas na biblioteca. Não representa aprovação do TikTok. A plataforma pode aplicar critérios não documentados aqui.';

/** Aplica as sugestões de correção a um texto. */
export function applyFixes(text: string, findings: Finding[]): string {
  const edits: { s: number; e: number; r: string }[] = [];
  for (const f of findings) {
    if (f.start == null || f.end == null || f.suggestion == null) continue;
    if (f.fixMode === 'match') edits.push({ s: f.start, e: f.end, r: f.suggestion });
    else if (f.fixMode === 'sentence') {
      const [s, e] = sentenceBounds(text, f.start, f.end);
      edits.push({ s, e, r: f.suggestion + (text[e - 1] === '\n' ? '\n' : ' ') });
    }
  }
  // Remove sobreposições (mantém a primeira, maior trecho)
  edits.sort((a, b) => a.s - b.s || b.e - a.e);
  const kept: typeof edits = [];
  for (const ed of edits) {
    const last = kept[kept.length - 1];
    if (last && ed.s < last.e) {
      if (ed.e > last.e) last.e = ed.e;
      continue;
    }
    kept.push({ ...ed });
  }
  let out = text;
  for (const ed of kept.reverse()) out = out.slice(0, ed.s) + ed.r + out.slice(ed.e);
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}
