import type { Finding, Policy, Product, ProductGate } from '../types';
import { riskLevel, scanText } from './analyze';
import { plain } from './normalize';

export const PRODUCT_CATEGORIES = [
  'Moda e acessórios',
  'Beleza e maquiagem',
  'Cuidados com a pele',
  'Cabelos',
  'Perfumaria',
  'Alimentos',
  'Bebidas',
  'Suplementos',
  'Saúde e bem-estar',
  'Fitness e esporte',
  'Casa e cozinha',
  'Eletrônicos',
  'Infantil',
  'Pet',
  'Livros e papelaria',
  'Outros',
];

const SENSITIVE = ['Alimentos', 'Bebidas', 'Suplementos', 'Saúde e bem-estar'];
const COSMETIC = ['Beleza e maquiagem', 'Cuidados com a pele', 'Cabelos', 'Perfumaria'];

let n = 0;
const gid = () => `g${Date.now().toString(36)}${(n++).toString(36)}`;

function g(severity: 'alto' | 'atencao', policyIds: string[], title: string, explanation: string, suggestion?: string, humanReview?: boolean): Finding {
  return { id: gid(), detectorId: 'GATE', field: 'produto', severity, policyIds, title, explanation, suggestion, fixMode: 'manual', humanReview, origin: 'checklist' };
}

/** Análise do cadastro do produto. Libera (ou não) as etapas de criação. */
export function checkProduct(p: Product, policies: Policy[], kbVersion: number): ProductGate {
  const f: Finding[] = [];
  const text = [p.name, p.description, p.specs, p.benefits].join('\n');
  // Alegações no cadastro — campo "produto"
  f.push(...scanText(text, 'produto', policies, p.category).map((x) => ({ ...x, start: undefined, end: undefined, fixMode: 'manual' as const })));

  // Produto de peso no nome/descrição = produto proibido para promoção
  if (f.some((x) => x.detectorId === 'D-PESO' || x.detectorId === 'D-GLP1'))
    f.push(g('alto', ['CP-3.15', 'LV-1', 'VC-1'], 'Produto associado a perda de peso',
      'Produtos e suplementos que aleguem ajudar no controle de peso, redução de gordura ou objetivos semelhantes são estritamente proibidos no TikTok Shop. Não há conteúdo que torne a promoção permitida.',
      'Não promova este produto no TikTok Shop. Se o produto NÃO tiver essa finalidade, corrija o cadastro removendo os termos.'));

  // Campos obrigatórios
  const missing: string[] = [];
  if (!p.name.trim()) missing.push('nome');
  if (!p.category) missing.push('categoria');
  if (!p.brand.trim()) missing.push('marca');
  if (!p.description.trim()) missing.push('descrição oficial');
  if (!p.photos.length) missing.push('fotos originais');
  if (!p.shopLink.trim()) missing.push('link na TikTok Shop');
  if (missing.length)
    f.push(g('atencao', ['PR-1.1', 'CP-3.13.2'], 'Cadastro incompleto',
      `Falta: ${missing.join(', ')}. Sem esses dados o app não consegue garantir fidelidade ao produto nem correspondência com o anúncio.`,
      'Complete o cadastro.'));
  if (!p.listingTitle?.trim())
    f.push(g('atencao', ['EV-4', 'PR-1.1'], 'Título do anúncio não cadastrado',
      'O TikTok compara o nome, a marca e o tipo de produto que aparecem no vídeo com o anúncio vinculado. Sem o título, o app não confere isso.',
      'Copie o título exato do anúncio no cadastro.'));
  else {
    const t = plain(p.listingTitle);
    if (p.brand && !t.includes(plain(p.brand)))
      f.push(g('atencao', ['EV-4', 'PR-4.1', 'CP-3.10.1'], `A marca "${p.brand}" não está no título do anúncio`,
        `Se você falar ou mostrar "${p.brand}" no vídeo e o anúncio não tiver essa marca, o TikTok pode entender que é outro produto. Já aconteceu: "Seu conteúdo promove um conjunto da boneca de ferro, que não corresponde ao produto listado: roupas esportivas e moletom" (-8 pontos).`,
        'Confirme com o vendedor se o anúncio é desta marca. Se for, peça para incluir a marca no título. Se não for, não cite a marca no vídeo.', true));
    if (p.modelName && !t.includes(plain(p.modelName)))
      f.push(g('atencao', ['EV-4', 'PR-1.1'], `O nome "${p.modelName}" não está no título do anúncio`,
        'Nome de modelo que não aparece no anúncio pode ser lido como produto diferente.',
        `Fale também o tipo do produto como está no título (ex.: "${p.listingTitle}"), e mostre a peça durante o vídeo.`, true));
  }
  if (p.shopLink && !/tiktok/i.test(p.shopLink))
    f.push(g('atencao', ['CI-4', 'CP-3.12'], 'Link não parece ser do TikTok Shop',
      'O link vinculado deve ser a página do produto no TikTok Shop. Links externos são redirecionamento de tráfego.', 'Use o link do produto no TikTok Shop.'));
  if (!p.benefits.trim())
    f.push(g('atencao', ['CP-3.10.2', 'CP-3.10.5'], 'Sem benefícios comprováveis cadastrados',
      'Os geradores só usam benefícios desta lista. Sem ela, os roteiros ficam limitados a características.', 'Cadastre um benefício por linha, apenas o que o fabricante comprova.'));

  // Marca, autorização e preço
  if (p.brandAuthorization === 'nao')
    f.push(g('alto', ['PR-4.1', 'CP-3.7', 'CP-3.3'], 'Sem autorização da marca',
      'Se o produto apresenta identidade comercial de uma marca e o vendedor não tem autorização, não promova. Pode ser falsificação.', 'Peça ao vendedor a autorização da marca antes de produzir.'));
  if (p.brandAuthorization === '')
    f.push(g('atencao', ['PR-4.1'], 'Autorização da marca não informada', 'Confirme se o vendedor tem autorização da marca.', undefined, true));
  if (p.priceMuchLower === 'sim')
    f.push(g('alto', ['PR-4.1'], 'Preço muito abaixo do mercado',
      'Se o preço for significativamente inferior ao de produtos iguais ou semelhantes, não o promova. Pode ser falsificação ou imitação.', 'Confirme a origem do produto com o vendedor.'));

  // Categorias sensíveis
  if (SENSITIVE.includes(p.category))
    f.push(g('atencao', ['CP-3.5', 'CP-3.6', 'CP-4.2'], 'Categoria com regras adicionais',
      'Alimentos, bebidas e suplementos não podem ter propriedades medicinais, e alegações gerais de saúde exigem documentação. A Política de Produtos Proibidos e a de Produtos Restritos ainda não estão na biblioteca, então o app não confirma se este item é permitido.',
      'Confirme no Seller Center que o produto está aprovado e guarde a documentação das alegações.', true));
  if (COSMETIC.includes(p.category))
    f.push(g('atencao', ['CP-4.1', 'PI-2'], 'Cosmético: efeitos devem ser temporários',
      'Não é permitido alegar efeito farmacológico ou alteração fisiológica. Ao mostrar o produto aplicado, cite marca e produto.', undefined, true));
  if (p.category === 'Infantil')
    f.push(g('atencao', ['CP-3.8', 'CP-4.2-MENOR'], 'Produto infantil',
      'O conteúdo deve falar com o adulto comprador. Participação de menores pode exigir alvará no Brasil.', undefined, true));
  if (p.category === 'Fitness e esporte' || p.category === 'Suplementos')
    f.push(g('atencao', ['CP-3.15'], 'Atenção à estética corporal',
      'Produtos para ganho de peso e fortalecimento muscular usados para estética corporal específica não podem ser promovidos.', undefined, true));

  return { level: riskLevel(f), findings: f, checkedAt: new Date().toISOString(), kbVersion };
}

export function gateAllows(p?: Product): { ok: boolean; reason?: string } {
  if (!p) return { ok: false, reason: 'Selecione um produto cadastrado.' };
  if (!p.gate) return { ok: false, reason: 'Produto ainda não analisado.' };
  if (p.gate.level === 'alto') return { ok: false, reason: 'Produto com risco alto no cadastro. Corrija antes de criar conteúdo.' };
  if (p.gate.level === 'atencao' && !p.gate.acknowledged)
    return { ok: false, reason: 'Produto com ressalvas. Confirme a ciência das ressalvas na ficha do produto.' };
  return { ok: true };
}
