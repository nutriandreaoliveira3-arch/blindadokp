// Modelo de dados do Vitrine Blindada IA

export type Scope = 'tiktok_shop_br' | 'tiktok_geral';
export type Applies =
  | 'video'
  | 'live'
  | 'imagem'
  | 'legenda'
  | 'hashtag'
  | 'afiliado'
  | 'ia'
  | 'anuncio'
  | 'produto';
export type RuleType = 'proibicao' | 'restricao' | 'exigencia' | 'recomendacao' | 'procedimento';
export type SourceStatus = 'oficial' | 'nao_oficial';
export type PolicyStatus = 'ativa' | 'pendente_verificacao' | 'substituida' | 'revogada';

export interface PolicySource {
  id: string;
  title: string;
  date: string; // data publicada no documento (AAAA-MM-DD)
  status: SourceStatus;
  scope: Scope;
  file?: string; // arquivo de origem na pasta politicas-fonte
  url?: string;
  notes?: string;
  addedAt: string;
  version: number;
}

export interface Policy {
  id: string; // código estável, ex.: CP-3.12
  title: string;
  category: string;
  scope: Scope;
  appliesTo: Applies[];
  type: RuleType;
  status: PolicyStatus;
  sourceId: string;
  section?: string;
  excerpt: string; // trecho literal da fonte
  notes?: string; // observação interpretativa (sempre marcada como tal)
  customTerms?: string[]; // termos de risco adicionados pelo usuário
  version: number;
  updatedAt: string;
  createdBy: 'base_inicial' | 'usuario' | 'ia_revisada';
}

export type Severity = 'alto' | 'atencao';
export type RiskLevel = 'baixo' | 'atencao' | 'alto';

export type ContentField =
  | 'roteiro'
  | 'textoTela'
  | 'legenda'
  | 'hashtags'
  | 'imagem'
  | 'producao'
  | 'produto'
  | 'live';

export interface Finding {
  id: string;
  detectorId: string;
  field: ContentField;
  excerpt?: string; // trecho exato que gerou o alerta
  start?: number;
  end?: number;
  severity: Severity;
  policyIds: string[];
  title: string;
  explanation: string;
  suggestion?: string; // versão corrigida do trecho (se aplicável)
  fixMode?: 'match' | 'sentence' | 'manual';
  humanReview?: boolean;
  origin: 'regra' | 'checklist' | 'ia';
}

export interface ProductionContext {
  contentType: 'video' | 'live' | 'imagem' | 'anuncio';
  origem: 'gravado_real' | 'misto' | 'ia_parcial' | 'ia_total' | '';
  aiDisclosure: 'sim' | 'nao' | '';
  virtualModel: 'sim' | 'nao' | '';
  aiAlteredProduct: 'sim' | 'nao' | '';
  demonstration: 'real' | 'ilustrativa_rotulada' | 'ilustrativa_sem_rotulo' | 'nenhuma' | '';
  productShown: 'claro' | 'parcial' | 'nao' | '';
  productMostDuration: 'sim' | 'nao' | '';
  linkMatch: 'igual' | 'cor_diferente' | 'diferente' | 'sem_link' | '';
  presence: 'aparece_fala' | 'so_voz' | 'so_maos' | 'nenhuma' | '';
  audio: 'voz_humana' | 'voz_ia' | 'musica' | 'asmr' | 'sem_audio' | '';
  staticContent: 'nenhum' | 'parcial' | 'maior_parte' | '';
  originality: 'original' | 'repost_proprio' | 'terceiro_sem_edicao' | 'terceiro_com_contribuicao' | 'stitch_sem_comentario' | '';
  watermark: 'sim' | 'nao' | '';
  layeredEditing: 'sim' | 'nao' | '';
  beautyFilter: 'sim' | 'nao' | '';
  thirdPartyBrandOrPerson: 'sim' | 'nao' | '';
  reviewScreenshot: 'sim' | 'nao' | '';
  sameContentOtherAccounts: 'sim' | 'nao' | '';
  creatorAdult: 'sim' | 'nao' | '';
  preRecordedInLive: 'sim' | 'nao' | '';
  screenRecording: 'sim' | 'nao' | '';
  mediaSource?: 'propria' | 'vendedor' | 'terceiros' | 'referencia_ia' | '';
  educational?: 'sim' | 'nao' | '';
  aiProductCheck?: 'conferido' | 'nao_conferido' | '';
}

export interface ContentInput {
  roteiro: string;
  textoTela: string;
  legenda: string;
  hashtags: string;
  imagemDescricao: string;
}

export interface Analysis {
  id: string;
  createdAt: string;
  title: string;
  productId?: string;
  productName?: string;
  input: ContentInput;
  context: ProductionContext;
  findings: Finding[];
  level: RiskLevel;
  kbVersion: number;
  parentId?: string; // análise anterior (quando é reanálise após correção)
  aiUsed?: boolean;
}

export interface ProductPhoto {
  id: string;
  name: string;
  dataUrl: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  manufacturer: string;
  description: string;
  specs: string;
  benefits: string; // um benefício comprovável por linha
  restrictions: string;
  mandatoryInfo: string;
  shopLink: string;
  price: string;
  photos: ProductPhoto[];
  brandAuthorization: 'sim' | 'nao' | 'propria' | '';
  priceMuchLower: 'sim' | 'nao' | '';
  gate?: ProductGate;
  createdAt: string;
  updatedAt: string;
}

export interface ProductGate {
  level: RiskLevel;
  findings: Finding[];
  checkedAt: string;
  kbVersion: number;
  acknowledged?: boolean; // ciência das ressalvas (nível atenção)
}

export interface Settings {
  apiKey?: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
}

export interface Violation {
  id: string;
  date: string; // AAAA-MM-DD
  points: number;
  reason: string; // texto do motivo, como veio do TikTok
  contentRef: string; // vídeo/LIVE/produto
  penalties: string; // ex.: redução de visibilidade, remoção dos produtos
  appeal: 'nao_recorrido' | 'em_analise' | 'aprovado' | 'nao_aprovado';
  policyIds: string[];
  lesson: string; // o que fazer diferente
  createdAt: string;
}
