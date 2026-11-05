import type { ContentField, Severity } from '../types';

// Detectores de texto. Cada detector aponta para as regras (policyIds) da base.
// Padrões rodam sobre texto normalizado: minúsculo e sem acentos.
// Se todas as regras de um detector forem desativadas na biblioteca, ele deixa de rodar.

export interface Fix {
  mode: 'match' | 'sentence' | 'manual';
  replacement?: string;
}

export interface Detector {
  id: string;
  title: string;
  policyIds: string[];
  severity: Severity;
  patterns: RegExp[];
  /** Só dispara se este padrão também aparecer no mesmo campo. */
  requires?: RegExp;
  fields?: ContentField[];
  /** Só roda se a categoria do produto estiver aqui (ou sem produto vinculado). */
  categories?: string[];
  explanation: string;
  fix: Fix;
  humanReview?: boolean;
}

const TEXT_FIELDS: ContentField[] = ['roteiro', 'textoTela', 'legenda', 'hashtags', 'imagem', 'produto', 'live'];

const PESO =
  /\b(emagrec\w*|perde(r|u)? (de )?peso|perca (de )?peso|perda de peso|perder (\d+ ?)?(kg|quilos?)|(menos|eliminar?|elimine|perdi|perca|perder) \d+ ?(kg|quilos?|cm|centimetros|medidas)|queima(r|dor)? (de )?gordura|queima gordura|gordura (localizada|da barriga|abdominal)|secar (a )?barriga|seca barriga|barriga (chapada|negativa|lisa)|perder barriga|desinch\w*|reduz\w* (de )?medidas|reduz\w* (a )?gordura|acelera\w* (o )?metabolismo|termogenic\w*|inibidor (de )?apetite|corta (a )?fome|tira (a )?fome|controle de peso|controlar (o )?peso|obesidade|manequim \d+|secar em \d+|dieta (radical|relampago|da sopa)|detox (para|pra) (emagrecer|secar)|enxugar|definicao abdominal)/;

export const DETECTORS: Detector[] = [
  {
    id: 'D-PESO',
    title: 'Alegação de perda de peso ou queima de gordura',
    policyIds: ['CP-3.15', 'CP-3.16', 'WL-1', 'LV-1', 'VC-1'],
    severity: 'alto',
    fields: ['roteiro', 'textoTela', 'legenda', 'imagem', 'produto', 'live'],
    patterns: [PESO],
    explanation:
      'O TikTok Shop proíbe promover produtos para perda de peso ou redução de gordura e qualquer alegação de que um produto promovido causa perda de peso. Vale para fala, texto, legenda, hashtag e imagem.',
    fix: {
      mode: 'sentence',
      replacement:
        '[Substitua por uma característica verificável do produto: sabor, textura, modo de uso, rendimento ou composição conforme o rótulo — sem relação com peso.]',
    },
  },
  {
    id: 'D-GLP1',
    title: 'Referência a GLP-1 ou medicamentos para obesidade',
    policyIds: ['CP-3.16'],
    severity: 'alto',
    patterns: [/\b(glp-?1|ozempic|mounjaro|wegovy|saxenda|semaglutid\w*|tirzepatid\w*|liraglutid\w*|efeito (ozempic|mounjaro)|ozempic natural|caneta (emagrecedora|para emagrecer))/],
    explanation:
      'É proibido afirmar ou sugerir que um produto contém, atua como ou imita agonistas de GLP-1, inclusive "efeito equivalente" na perda de peso.',
    fix: { mode: 'sentence', replacement: '[Remova a comparação com medicamentos. Fale apenas das características reais do produto.]' },
  },
  {
    id: 'D-ANTES-DEPOIS',
    title: 'Comparação de antes e depois',
    policyIds: ['CP-3.16', 'CP-3.10.2', 'WL-2'],
    severity: 'alto',
    patterns: [/\b(antes e depois|antes x depois|antes vs\.? depois|antes\/depois|before (and|&) after)\b/],
    explanation:
      'Resultados de "antes e depois" são proibidos para controle de peso e citados como promessa exagerada (ex.: rugas desaparecendo).',
    fix: {
      mode: 'sentence',
      replacement: '[Troque o antes e depois por uma demonstração real do uso do produto, sem prometer resultado.]',
    },
  },
  {
    id: 'D-HASHTAG-PESO',
    title: 'Hashtag de perda de peso ou comportamento não saudável',
    policyIds: ['WL-2', 'CP-3.16'],
    severity: 'alto',
    patterns: [/#\w*(emagrec|perderpeso|percapeso|perdadepeso|queimagordura|queimadegordura|secarbarriga|barrigachapada|barriganegativa|morrendodefome|dietaradical|suplementoparaperderpeso|perderpesocompilulas|chaqueimagordura|antesedepois|ozempic|glp1|mounjaro|termogenico|inibidordeapetite|secandoabarriga|projetoverao|secar)\w*/],
    explanation: 'Hashtags que alegam perda de peso ou incentivam comportamento não saudável são citadas como proibidas.',
    fix: { mode: 'match', replacement: '' },
  },
  {
    id: 'D-INGREDIENTE-PESO',
    title: 'Ingrediente promovido com efeito no peso',
    policyIds: ['WL-4', 'CP-3.16'],
    severity: 'alto',
    patterns: [/\b(l-?carnitina|acido linoleico|cla\b|forscolina|picolinato|chitosana|quitosana|cafeina|cha verde|hibisco|cavalinha|dente-de-leao|psyllium|garcinia|faseolamina|cromo|diuretic\w*)/],
    requires: /(gordura|peso|emagrec|metabolismo|diuretic|incha|secar|medidas|queima)/,
    explanation:
      'É proibido destacar ingredientes como tendo efeito de controle de peso ("L-carnitina melhora a queima de gordura", "diuréticos naturais").',
    fix: { mode: 'sentence', replacement: '[Cite o ingrediente apenas como composição do rótulo, sem efeito no peso ou na gordura.]' },
  },
  {
    id: 'D-MUSCULO',
    title: 'Ganho de peso ou estética muscular',
    policyIds: ['CP-3.15'],
    severity: 'atencao',
    patterns: [/\b(ganh\w* (de )?(massa|peso|musculo)|hipertrofia|engordar|crescer (o )?(bumbum|gluteo|bunda)|ficar (sarad|trincad|marombad)\w*|shape (perfeito|dos sonhos)|corpo (perfeito|dos sonhos))/],
    explanation:
      'O TikTok Shop não permite promover produtos para ganho de peso e fortalecimento muscular usados para buscar uma estética corporal específica, nem imagem corporal doentia.',
    fix: { mode: 'sentence', replacement: '[Fale de uso, sabor, praticidade ou rotina, sem prometer mudança estética no corpo.]' },
    humanReview: true,
  },
  {
    id: 'D-MEDICO',
    title: 'Alegação médica (cura, tratamento ou prevenção)',
    policyIds: ['CP-3.10.6', 'CP-3.10.5', 'CP-4.1', 'CP-4.2'],
    severity: 'alto',
    patterns: [
      /\b(cura(r|s)?|curou|tratar|trata (a |o |as |os )?(doenca|infeccao|inflamacao|dor|sintoma)\w*|tratamento (de|para|da|do)|previne|prevenir|evita (o |a )?(cancer|diabetes|infarto|avc|doenca\w*)|combate (a |o )?(doenca|infeccao|inflamacao|ansiedade|depressao)|substitui (o )?remedio|nao precisa (mais )?de remedio|remedio natural)\b/,
    ],
    explanation:
      'Alegações de que um produto cura, trata ou previne doenças ou condições são proibidas ou restritas. Cosméticos não podem ter efeito farmacológico, imunológico ou metabólico; alimentos não podem ter propriedades medicinais.',
    fix: { mode: 'sentence', replacement: '[Remova a alegação de saúde. Descreva uso, sensação ou característica do produto, sem doença ou condição.]' },
  },
  {
    id: 'D-CONDICAO',
    title: 'Doença ou condição de saúde citada',
    policyIds: ['CP-3.10.6', 'CP-4.1', 'CP-4.2'],
    severity: 'atencao',
    patterns: [/\b(diabetes|hipertensao|pressao alta|colesterol|cancer|tumor|depressao|ansiedade|insonia|artrite|artrose|gastrite|enxaqueca|fibromialgia|candidiase|infeccao|inflamacao|imunidade|sistema imunologico|intestino preso|constipacao|refluxo|tpm|menopausa)\b/],
    explanation:
      'Citar doença ou condição de saúde junto de um produto pode ser lido como alegação médica. Se o produto não for tratamento autorizado, não relacione o produto à condição.',
    fix: { mode: 'sentence', replacement: '[Remova a relação entre o produto e a condição de saúde.]' },
    humanReview: true,
  },
  {
    id: 'D-ENDOSSO-SAUDE',
    title: 'Endosso de profissional ou estudo sem comprovação',
    policyIds: ['WL-3', 'CP-3.10.5'],
    severity: 'alto',
    patterns: [/\b((recomendad|aprovad|indicad|prescrit)\w* (por|pelos|pelas) (medic|nutricionist|dermatologist|especialist|profissionais)\w*|clinicamente (comprovad|aprovad|testad)\w*|cientificamente comprovad\w*|comprovad\w* (pela|por) (ciencia|estudos)|os medicos nao querem|medicos (recomendam|indicam|aprovam)|nutricionista(s)? (recomenda|indica|aprova)|como nutricionista,? (eu )?(recomendo|indico))/],
    explanation:
      'Usar profissionais ou instituições de saúde para dar credibilidade é proibido em alegações de controle de peso e exige prova em qualquer outra alegação. Se você é profissional de saúde, sua credencial não pode ser usada como endosso do produto.',
    fix: { mode: 'sentence', replacement: '[Retire o endosso profissional. Se houver laudo ou certificação real, guarde o documento e cite só o que ele comprova.]' },
    humanReview: true,
  },
  {
    id: 'D-CERTIFICACAO',
    title: 'Prêmio, certificação ou registro citado',
    policyIds: ['CP-3.10.5'],
    severity: 'atencao',
    patterns: [/\b(premiad\w*|premio|certificad\w*|certificacao|selo|patentead\w*|aprovad\w* (pela )?anvisa|registro (na )?anvisa|dermatologicamente testad\w*|testad\w* clinicamente|hipoalergenic\w*)\b/],
    explanation: 'Prêmios e certificações só podem ser citados se forem verdadeiros e comprováveis. Alegação falsa é proibida.',
    fix: { mode: 'manual' },
    humanReview: true,
  },
  {
    id: 'D-SAUDE-GERAL',
    title: 'Alegação geral de saúde que exige comprovação',
    policyIds: ['CP-4.2'],
    severity: 'atencao',
    categories: ['Alimentos', 'Bebidas', 'Suplementos', 'Saúde e bem-estar'],
    patterns: [/\b(superalimento\w*|super ?fruta\w*|detox\w*|desintox\w*|cheio de coisas boas|ingredientes de qualidade|bem-estar|bem estar|saudavel|funcional|nutritiv\w*|rico em (vitaminas|nutrientes|antioxidantes)|antioxidante\w*|fortalece\w*|energia (o dia todo|extra))\b/],
    explanation:
      'Para alimentos e suplementos, termos como "superalimento", "detox" e "bem-estar" precisam de documentação ou certificação de profissional de saúde autorizado.',
    fix: { mode: 'manual' },
    humanReview: true,
  },
  {
    id: 'D-ABSOLUTO',
    title: 'Afirmação absoluta sem prova',
    policyIds: ['CP-3.10.3'],
    severity: 'alto',
    patterns: [/\b(100 ?% (natural|eficaz|garantid\w*|seguro|organico|puro)|produto (n[o°º.]? ?1|numero 1|numero um)|o melhor (do|da) (mundo|brasil|mercado|tiktok)|melhor (produto|marca) (do|da)|o unico que (funciona|resolve)|resultado garantido|garantia de resultado|sem (nenhum )?efeito(s)? colatera\w*|sem contraindica\w*|nunca falha|infalivel|milagros\w*|milagre)/],
    explanation:
      'Descrições exageradas ou afirmações absolutas ("Produto nº 1", "100% Natural") são proibidas sem provas válidas e objetivas.',
    fix: { mode: 'sentence', replacement: '[Troque por um dado verificável: o que o rótulo ou a ficha técnica informa.]' },
  },
  {
    id: 'D-PRECO',
    title: 'Promessa sobre preço (menor, mais barato)',
    policyIds: ['CP-3.10.2', 'CP-3.10.5'],
    severity: 'alto',
    patterns: [/\b(menor preco|mais barat\w*|melhor preco|preco mais baixo|preco imbativel|ninguem (vende|tem) mais barato|nao (vai|vao) encontrar (mais barato|esse preco)|em nenhum (outro )?lugar|preco de custo|abaixo do custo)\b/],
    explanation: 'Dizer que é "o menor preço" ou "o mais barato" é citado como promessa exagerada proibida. Todas as declarações de preço devem ser precisas.',
    fix: { mode: 'sentence', replacement: 'O preço está especial aqui no TikTok Shop: confira o valor atual no link do produto.' },
  },
  {
    id: 'D-DESCONTO',
    title: 'Preço, desconto ou urgência citados',
    policyIds: ['CP-3.10.1', 'CP-3.10.5'],
    severity: 'atencao',
    patterns: [/(\d+ ?% (de )?(off|desconto)|de r\$ ?\d+[\d.,]* por r\$ ?\d+|r\$ ?\d+[\d.,]*|frete gratis|so hoje|ultimas unidades|ultimas horas|estoque acabando|acaba (hoje|em \d+))/],
    explanation: 'Preço, desconto, frete e urgência precisam bater exatamente com o que está no TikTok Shop no momento da publicação ou da LIVE.',
    fix: { mode: 'manual' },
    humanReview: true,
  },
  {
    id: 'D-PROMESSA',
    title: 'Promessa de resultado rápido ou exagerado',
    policyIds: ['CP-3.10.2'],
    severity: 'alto',
    patterns: [/\b(imediatamente|instantane\w*|em poucos dias|da noite para o dia|da noite pro dia|elimina (de vez|totalmente|completamente|a acne|as rugas|a celulite|as estrias|as manchas)|acaba com (a |as |o |os )?\w+|some com (a |as |o |os )?\w+|transforma (sua|seu) (pele|cabelo|corpo|vida))\b/],
    explanation:
      'Promessas exageradas sobre desempenho ou efeito são proibidas ("pernas mais finas imediatamente", "elimina a acne em apenas alguns dias").',
    fix: { mode: 'sentence', replacement: '[Descreva a experiência de uso sem prazo ou resultado garantido. Ex.: "Eu uso assim no meu dia a dia" + modo de uso.]' },
  },
  {
    id: 'D-PRAZO',
    title: 'Prazo de resultado citado',
    policyIds: ['CP-3.10.2'],
    severity: 'atencao',
    patterns: [/\b(em (apenas |so |ate )?\d+ (dias?|semanas?|meses|horas?)|na primeira (semana|aplicacao)|desde o primeiro (dia|uso))\b/],
    explanation: 'Prazo de resultado pode virar promessa exagerada. Só mantenha se for informação do fabricante e não prometer efeito.',
    fix: { mode: 'manual' },
    humanReview: true,
  },
  {
    id: 'D-COSMETICO',
    title: 'Cosmético com efeito fisiológico ou permanente',
    policyIds: ['CP-4.1', 'CP-3.10.2'],
    severity: 'alto',
    patterns: [/\b(regenera\w*|repara (o )?dna|estimula (o )?colageno|produz colageno|elimina (a )?celulite|elimina (as )?estrias|remove (as )?rugas|apaga (as )?rugas|efeito botox|botox natural|preenchimento|lifting|efeito permanente|resultado permanente|para sempre|definitivo|cura (a )?acne|trata (a )?acne|reverte\w*|rejuvenesce\w* \d+ anos|faz crescer cabelo|para (a )?queda de cabelo)\b/],
    explanation:
      'Cosméticos não podem alegar alterar função fisiológica nem efeito farmacológico, e seus efeitos devem ser temporários.',
    fix: { mode: 'sentence', replacement: '[Use linguagem de efeito temporário e sensorial: "deixa a pele com sensação de...", "aspecto mais...", conforme o fabricante.]' },
  },
  {
    id: 'D-REDIRECIONAMENTO',
    title: 'Redirecionamento para fora do TikTok Shop',
    policyIds: ['CP-3.12', 'CP-3.11', 'CI-3', 'LV-1', 'VC-1'],
    severity: 'alto',
    patterns: [
      /(https?:\/\/|www\.|\b[\w-]+\.(com|com\.br|net|org|shop|store|link|site|online)\b|bit\.ly|linktr\.ee)/,
      /\b(whats ?app|whats\b|zap\b|wpp\b|telegram|instagram|\binsta\b|youtube|kwai|facebook|pinterest|discord|shopee|mercado ?livre|amazon|magalu|shein|hotmart|kiwify|paypal|pix\b|link (na|da) bio|link do perfil|site oficial|minha loja (no|na)|chama (no|na) (direct|dm|pv|privado|inbox)|me chama (no|na|em)|manda (uma )?(mensagem|dm|direct)|no (meu )?(direct|privado|pv|inbox)|e-?mail|qr ?code|codigo qr)\b/,
      /\B@[a-z0-9._]{3,}/,
      /\(?\b\d{2}\)? ?9?\d{4}[- ]?\d{4}\b/,
      /\bcomenta\w* .{0,40}(que (eu )?(te )?(mando|envio|passo)|pra (eu )?(te )?(mandar|enviar))/,
    ],
    explanation:
      'Links externos, perfis de outras redes, telefones, e-mails, QR codes e convites para mensagem direta (inclusive DM do TikTok) para comprar são proibidos. A compra deve acontecer pelo link do produto no TikTok Shop.',
    fix: { mode: 'sentence', replacement: 'Toque no link do produto aqui no vídeo para ver todos os detalhes no TikTok Shop.' },
  },
  {
    id: 'D-IMITACAO',
    title: 'Termo que indica imitação ou falsificação',
    policyIds: ['PR-4.2', 'PR-4.1', 'CP-3.7'],
    severity: 'alto',
    patterns: [/\b(inspirad\w* (n[ao]|em) |similar (a|ao)|semelhante (a|ao)|tao bom quanto|mesmas caracteristicas|funciona (igual|da mesma forma)|tem o mesmo cheiro|copia (do|da|de|fiel)|replica|clone|igual ao original|como o original|primeira linha|imitacao|1:1|versao de luxo|vazamento de fabrica|dupe|contratipo)\b/],
    explanation:
      'Frases como "inspirado na marca X", "igual ao original", "réplica", "1:1" ou "dupe" indicam imitação ou falsificação, proibidas mesmo com 50% a 60% de semelhança.',
    fix: { mode: 'sentence', replacement: '[Apresente o produto pelo que ele é (marca, características próprias), sem citar semelhança com outra marca.]' },
  },
  {
    id: 'D-COMPARACAO',
    title: 'Comparação depreciativa com concorrentes',
    policyIds: ['CP-3.10.4'],
    severity: 'atencao',
    patterns: [/\b((melhor|superior) (que|do que) (a|o|as|os|qualquer) (marca|concorrente|outr)\w*|as outras marcas (sao|nao)|nao compre (da|na|no|o|a) |marca (ruim|lixo|pessima)|esquece (a|o) (marca|concorrente)|joga fora (o|a) seu)\b/],
    explanation: 'Comparações infundadas ou depreciativas contra outros produtos, marcas ou sites são proibidas.',
    fix: { mode: 'sentence', replacement: '[Fale das qualidades do seu produto, sem atacar outras marcas. Comparação técnica só com evidência.]' },
  },
  {
    id: 'D-FAMOSO',
    title: 'Endosso de famoso ou outro criador',
    policyIds: ['CP-3.7', 'CP-3.10.5', 'PR-4.4'],
    severity: 'atencao',
    patterns: [/\b((usad|recomendad|aprovad)\w* (por|pelas|pelos) (famos|celebridade|influencer|artista|atriz|ator|blogueir)\w*|o mesmo que (a|o) \w+ usa|queridinho das famosas|que (a|o) \w+ (usa|ama|indicou))\b/],
    explanation: 'Usar nome, imagem ou suposta preferência de pessoa famosa ou outro criador sem permissão expressa é proibido.',
    fix: { mode: 'sentence', replacement: '[Remova a menção a terceiros. Use sua própria experiência com o produto.]' },
    humanReview: true,
  },
  {
    id: 'D-MENORES',
    title: 'Conteúdo direcionado a menores',
    policyIds: ['CP-3.8', 'CP-4.2-MENOR'],
    severity: 'alto',
    patterns: [/\b(pe[cç]a (pros|para os|aos) (seus )?pais|pede (pra|para) (sua )?(mae|pai)|criancada|galerinha|para (as )?criancas comprarem|crianca(s)? (vao|vai) amar|seus pais compram)\b/],
    explanation: 'É proibido conteúdo para persuadir menores a comprar ou pedir que adultos comprem. O TikTok Shop é restrito a maiores de 18 anos.',
    fix: { mode: 'sentence', replacement: '[Fale com o adulto comprador, sem apelo direto a crianças.]' },
  },
  {
    id: 'D-JOGOS',
    title: 'Sorteio, aposta ou gamificação',
    policyIds: ['CP-3.4', 'CP-3.3', 'CP-3.2'],
    severity: 'alto',
    patterns: [/\b(sorteio|sortear|rifa|aposta\w*|bet\b|cassino|roleta|raspadinha|tigrinho|quem comentar primeiro ganha|primeir\w* a comentar ganha|leilao|lance minimo|deem seus lances)\b/],
    explanation: 'Jogos de azar e atividades similares são proibidos em vídeos e LIVEs. Leilões só com o recurso oficial de lances com contagem regressiva.',
    fix: { mode: 'sentence', replacement: '[Remova a dinâmica de sorteio ou aposta. Para leilão em LIVE, use apenas o recurso oficial de lances com contagem regressiva.]' },
    humanReview: true,
  },
  {
    id: 'D-PIRAMIDE',
    title: 'Renda extra, pirâmide ou investimento',
    policyIds: ['CP-3.3'],
    severity: 'atencao',
    patterns: [/\b(renda extra|ganhe dinheiro|ganhar dinheiro|seja (um |uma )?revendedor\w*|marketing multinivel|retorno garantido|lucro garantido|investimento (seguro|garantido)|multiplique (seu|o) dinheiro)\b/],
    explanation: 'Esquemas de pirâmide, marketing multinível e investimentos que prometem altos retornos são proibidos.',
    fix: { mode: 'sentence', replacement: '[Remova a promessa de ganho financeiro.]' },
    humanReview: true,
  },
  {
    id: 'D-POLITICO',
    title: 'Referência política',
    policyIds: ['CP-3.17'],
    severity: 'alto',
    patterns: [/\b(eleic\w*|candidat\w*|partido|presidente|governador|deputad\w*|senador\w*|prefeit\w*|lula|bolsonaro|vote em|campanha eleitoral|esquerda|direita)\b/],
    explanation: 'Conteúdo do TikTok Shop com referências políticas é proibido.',
    fix: { mode: 'sentence', replacement: '[Remova a referência política.]' },
    humanReview: true,
  },
  {
    id: 'D-SIMPATIA',
    title: 'Venda por apelo à pena ou simpatia',
    policyIds: ['CP-3.11'],
    severity: 'alto',
    patterns: [/\b(me ajud\w* a (pagar|vender|bater)|compra (pra|para) me ajudar|estou passando necessidade|preciso (muito )?vender|ajuda (a )?(minha|essa) (familia|mae)|so faltam \d+ vendas|por favor compr\w*)\b/],
    explanation: 'Promover produtos induzindo simpatia do cliente é proibido.',
    fix: { mode: 'sentence', replacement: '[Troque o apelo emocional pelo motivo real de comprar: utilidade e características do produto.]' },
  },
  {
    id: 'D-ENGAJAMENTO-ARTIFICIAL',
    title: 'Troca de engajamento ou avaliação',
    policyIds: ['CP-3.11'],
    severity: 'alto',
    patterns: [/\b(sigo de volta|segue que eu sigo|curte que eu curto|curtiu,? sigo|avali\w* com 5 estrelas (que|e) (eu )?(te )?(dou|mando|devolvo)|5 estrelas (ganha|e ganha)|deixa (sua )?avaliacao (que|e) (ganha|leva))\b/],
    explanation: 'Manipular curtidas, seguidores ou avaliações é proibido.',
    fix: { mode: 'sentence', replacement: 'Se gostar, conta nos comentários o que achou.' },
  },
  {
    id: 'D-SENSIVEL',
    title: 'Conteúdo chocante ou sexual',
    policyIds: ['CP-3.9'],
    severity: 'atencao',
    patterns: [/\b(sangue|ferida aberta|machucad\w* grave|cadaver|morte|nud\w*|pelad\w*|sensual|excitad\w*|fetiche)\b/],
    explanation: 'Conteúdo sensacionalista, chocante, sexual ou com violência gráfica é proibido.',
    fix: { mode: 'sentence', replacement: '[Remova o elemento chocante ou sexual.]' },
    humanReview: true,
  },
  {
    id: 'D-LINGUAGEM',
    title: 'Linguagem inadequada',
    policyIds: ['CP-3.13.1'],
    severity: 'atencao',
    patterns: [/\b(porra|caralho|merda|foda\w*|puta|cacete|bosta)\b/],
    explanation: 'Conteúdo com uso inadequado de linguagem é citado como proibido.',
    fix: { mode: 'match', replacement: '[termo removido]' },
  },
  {
    id: 'D-FILTRO',
    title: 'Filtro de beleza mencionado',
    policyIds: ['CP-3.10.7'],
    severity: 'atencao',
    patterns: [/\b(filtro (de beleza|de pele|que afina|que emagrece)|com filtro|efeito beauty|pele de porcelana)\b/],
    explanation: 'Filtros de beleza enganosos são proibidos, principalmente quando o produto é de pele, maquiagem ou corpo.',
    fix: { mode: 'manual' },
    humanReview: true,
  },
  {
    id: 'D-HASHTAG-MARCA',
    title: 'Hashtag com marca de terceiros',
    policyIds: ['PR-4.2', 'CP-3.7'],
    severity: 'atencao',
    fields: ['hashtags', 'legenda'],
    patterns: [/#(nike|adidas|apple|iphone|samsung|natura|boticario|oboticario|loreal|nivea|dior|chanel|gucci|prada|zara|shein|stanley|lancome|maccosmetics|sephora|vichy|laroche\w*|cerave|eudora|avon|havaianas|melissa|crocs|lv|louisvuitton|herbalife|growth|maxtitanium)\b/],
    explanation:
      'Não use nomes de marcas em hashtags para aumentar o tráfego. Só é aceitável se a marca for a do próprio produto anunciado (com autorização).',
    fix: { mode: 'match', replacement: '' },
    humanReview: true,
  },
  {
    id: 'D-VOZ-IA-LIVE',
    title: 'Voz de IA ou trecho gravado em LIVE',
    policyIds: ['NO-4', 'CI-2'],
    severity: 'alto',
    fields: ['live'],
    patterns: [/\b(voz (de|da) ia|narracao (de|da|por) ia|voz sintetica|audio gerado|video (pre-?)?gravado|clipe gravado|soltar (o )?video|passar (o )?video gravado)\b/],
    explanation: 'Em LIVE não se usa áudio ou narração de IA, nem clipes pré-gravados.',
    fix: { mode: 'sentence', replacement: '[Faça este trecho ao vivo, com sua voz, mostrando o produto em tempo real.]' },
  },
  {
    id: 'D-PLACEHOLDER',
    title: 'Trecho de correção ainda não preenchido',
    policyIds: ['CP-1'],
    severity: 'atencao',
    patterns: [/\[(substitua|troque|remova|retire|descreva|apresente|cite|use|fale|faca|diga|termo removido|sem beneficios|mostre)[^\]]*\]/],
    explanation: 'O texto ainda tem uma instrução de correção entre colchetes. Escreva o trecho final antes de publicar.',
    fix: { mode: 'manual' },
  },
];

export const DEFAULT_FIELDS = TEXT_FIELDS;
