// Biblioteca de ganchos para a CAPA do vídeo (primeiro segundo).
// Todos são opinião, curiosidade ou estilo: sem promessa, preço ou marca.
// "warn" explica quando usar com cuidado.

export type HookGroup = 'Parar a rolagem' | 'Desejo' | 'Roupa feminina' | 'Estilo e identidade' | 'Suplementos';

export interface HookIdea {
  text: string;
  group: HookGroup;
  warn?: string;
}

const PESSOAL = 'Soa como experiência pessoal. Ok na capa, mas nunca com fala ou texto do tipo "comprei e amei" (com modelo de IA vira depoimento falso).';
const CORES = 'Use só se o anúncio tiver várias cores.';

export const HOOKS: HookIdea[] = [
  // Parar a rolagem
  { group: 'Parar a rolagem', text: 'Para tudo e olha isso!' },
  { group: 'Parar a rolagem', text: 'Você precisa ver isso!' },
  { group: 'Parar a rolagem', text: 'Espera... olha esse detalhe!' },
  { group: 'Parar a rolagem', text: 'Eu não esperava por essa!', warn: PESSOAL },
  { group: 'Parar a rolagem', text: 'Como eu não vi isso antes?', warn: PESSOAL },
  { group: 'Parar a rolagem', text: 'Olha o que eu encontrei!' },
  { group: 'Parar a rolagem', text: 'Não passa sem ver!' },
  { group: 'Parar a rolagem', text: 'Isso aqui me surpreendeu!', warn: PESSOAL },
  { group: 'Parar a rolagem', text: 'Presta atenção nisso!' },
  { group: 'Parar a rolagem', text: 'Olha só essa descoberta!' },
  // Desejo
  { group: 'Desejo', text: 'Eu quero um desse!' },
  { group: 'Desejo', text: 'Olha que coisa linda!' },
  { group: 'Desejo', text: 'Esse detalhe faz diferença!' },
  { group: 'Desejo', text: 'Difícil escolher uma cor!', warn: CORES },
  { group: 'Desejo', text: 'Você usaria esse?' },
  { group: 'Desejo', text: 'Me apaixonei nesse modelo!' },
  { group: 'Desejo', text: 'Que achado é esse?' },
  { group: 'Desejo', text: 'Olha esse acabamento!' },
  { group: 'Desejo', text: 'Qual cor você escolheria?', warn: CORES },
  { group: 'Desejo', text: 'Esse entrou na minha lista!' },
  // Roupa feminina
  { group: 'Roupa feminina', text: 'Esse look tem presença!' },
  { group: 'Roupa feminina', text: 'Olha o caimento dessa peça!' },
  { group: 'Roupa feminina', text: 'Elegância em cada detalhe!' },
  { group: 'Roupa feminina', text: 'Esse conjunto é um charme!' },
  { group: 'Roupa feminina', text: 'Olha como fica no corpo!', warn: 'O corpo é de IA. Prefira "Olha o caimento dessa peça!".' },
  { group: 'Roupa feminina', text: 'Um look, várias possibilidades!' },
  { group: 'Roupa feminina', text: 'Esse vestido chama atenção!' },
  { group: 'Roupa feminina', text: 'Simplesmente olha essa peça!' },
  { group: 'Roupa feminina', text: 'Esse modelo é um arraso!' },
  { group: 'Roupa feminina', text: 'Você sairia assim?' },
  // Estilo e identidade (validados em 20/11/2026)
  { group: 'Estilo e identidade', text: 'O luxo da delicadeza' },
  { group: 'Estilo e identidade', text: 'Vestido com cara de rica' },
  { group: 'Estilo e identidade', text: 'Look de férias na praia' },
  { group: 'Estilo e identidade', text: 'Um vestido, dois looks' },
  { group: 'Estilo e identidade', text: 'Básico que salva qualquer dia' },
  { group: 'Estilo e identidade', text: 'Look de resort pra arrasar' },
  { group: 'Estilo e identidade', text: 'Elegante sem esforço' },
  { group: 'Estilo e identidade', text: 'Pra ser o centro das atenções' },
  { group: 'Estilo e identidade', text: 'Look de chefe' },
  { group: 'Estilo e identidade', text: 'Look de festa chique' },
  { group: 'Estilo e identidade', text: 'Parece vestido de milhões', warn: 'Pode, mas "cara de rica" é mais seguro: não fala de valor.' },
  // Suplementos
  { group: 'Suplementos', text: 'Olha essa opção aqui!' },
  { group: 'Suplementos', text: 'Conhece essa marca?' },
  { group: 'Suplementos', text: 'Vem conferir esse produto!' },
  { group: 'Suplementos', text: 'Olha essa apresentação!' },
  { group: 'Suplementos', text: 'Você conhece esse sabor?' },
  { group: 'Suplementos', text: 'Vamos conferir o rótulo?' },
  { group: 'Suplementos', text: 'Olha quais sabores tem!' },
  { group: 'Suplementos', text: 'Conheça esse produto!' },
  { group: 'Suplementos', text: 'Já viu essa embalagem?' },
  { group: 'Suplementos', text: 'Qual sabor você prefere?' },
];

/** Grupos que fazem sentido para cada tipo de produto. */
export function hookGroupsFor(container: string): HookGroup[] {
  return container === 'roupa'
    ? ['Estilo e identidade', 'Roupa feminina', 'Desejo', 'Parar a rolagem']
    : ['Suplementos', 'Parar a rolagem', 'Desejo'];
}

/** O que nunca usar no gancho (o app também bloqueia pelos detectores). */
export const HOOK_NEVER = [
  'Comparar com marca: "parece de grife", "igual da Zara", "estilo Farm"',
  'Comparar preço: "parece de R$ 1.000"',
  'Prometer outro material: "parece seda" quando é modal',
  'Escassez falsa: "últimas peças", "só hoje" (só se for verdade e estiver no anúncio)',
  'Superlativos: "o mais vendido", "o melhor"',
];
