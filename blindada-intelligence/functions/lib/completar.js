// Completar dados de um lead — sem inventar nada.
// Camada 1 (grátis): usa a fonte e a evidência que o lead já tem.
// Camada 2 (1 busca): interpreta resultados de busca pelo nome da pessoa.
// Nunca sobrescreve campos preenchidos.

const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PROFISSOES = [
  ['advogad', 'Advocacia'], ['arquitet', 'Arquitetura'], ['engenheir', 'Engenharia'], ['medic', 'Medicina'], ['dentist', 'Odontologia'],
  ['odontolog', 'Odontologia'], ['psicolog', 'Psicologia'], ['psicanalis', 'Psicanálise'], ['fisioterap', 'Fisioterapia'], ['veterinari', 'Medicina veterinária'],
  ['farmaceutic', 'Farmácia'], ['nutricionist', 'Nutrição'], ['dermatolog', 'Dermatologia'], ['contador', 'Contabilidade'], ['contabil', 'Contabilidade'],
  ['economista', 'Economia'], ['designer', 'Design'], ['corretor', 'Corretagem de imóveis'], ['imobiliari', 'Mercado imobiliário'], ['consultor', 'Consultoria'],
  ['professor', 'Educação'], ['idiomas', 'Educação (idiomas)'], ['turismo', 'Turismo'], ['viage', 'Turismo'], ['empresari', 'Empresária'], ['executiv', 'Executiva'],
];
const DOMINIOS_NAO_SITE = ['instagram.com', 'facebook.com', 'linkedin.com', 'wa.me', 'whatsapp.com', 'youtube.com', 'tiktok.com', 'google.', 'doctoralia',
  'jusbrasil', 'linktr.ee', 'bit.ly', 'wikipedia', 'gov.br', 'escavador', 'econodata', 'cnpj', 'reclameaqui', 'olx.', 'mercadolivre'];

export function dominio(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
}

export function siteDaFonte(fonteUrl) {
  const d = dominio(fonteUrl);
  if (!d || DOMINIOS_NAO_SITE.some((x) => d.includes(x))) return null;
  return d;
}

export function profissaoDoTexto(...textos) {
  const t = norm(textos.filter(Boolean).join(' '));
  const achada = PROFISSOES.find(([k]) => t.includes(k));
  return achada ? achada[1] : null;
}

export function anosDoTexto(texto, anoAtual = new Date().getFullYear()) {
  const t = norm(texto);
  let m = t.match(/\bha (?:mais de )?(\d{1,2}) anos\b/) || t.match(/\b(\d{1,2}) anos de (?:experiencia|atuacao|carreira|mercado)\b/);
  if (m) { const n = Number(m[1]); if (n >= 1 && n <= 60) return n; }
  m = t.match(/\b(?:desde|fundad[ao] em|fundou(?: a \w+)? em|em) (19[6-9]\d|20[0-2]\d)\b/);
  if (m) { const n = anoAtual - Number(m[1]); if (n >= 1 && n <= 60) return n; }
  return null;
}

// Camada 1: retorna só os campos que estão vazios e puderam ser deduzidos
export function completarGratis(lead) {
  const novo = {}; const motivos = [];
  if (!lead.site_empresa) { const s = siteDaFonte(lead.fonte_url); if (s) { novo.site_empresa = s; motivos.push(`site da empresa a partir da fonte (${s})`); } }
  if (!lead.profissao) { const p = profissaoDoTexto(lead.cargo, lead.fonte_desc, lead.empresa); if (p) { novo.profissao = p; motivos.push(`profissão “${p}” lida no cargo/evidência`); } }
  if (!lead.anos_atuacao) { const a = anosDoTexto(`${lead.fonte_desc || ''} ${lead.cargo || ''}`); if (a) { novo.anos_atuacao = a; motivos.push(`${a} anos de atuação citados na evidência`); } }
  return { novo, motivos };
}

// Camada 2: interpreta resultados de busca pelo nome da pessoa
function nomeBate(texto, nome) {
  const partes = norm(nome).split(/\s+/).filter((p) => p.length > 2);
  if (partes.length < 2) return false;
  const t = norm(texto);
  return t.includes(partes[0]) && t.includes(partes[partes.length - 1]);
}

export function consultaPara(lead) {
  return [`"${lead.nome}"`, lead.empresa, lead.cidade].filter(Boolean).join(' ').slice(0, 300);
}

export function completarComResultados(lead, resultados = []) {
  const novo = {}; const motivos = []; const fontes = [];
  for (const r of resultados) {
    const url = r.url || ''; const u = norm(url); const texto = `${r.title || ''} ${r.content || ''}`;
    if (!nomeBate(r.title || '', lead.nome) && !nomeBate(texto, lead.nome)) continue;
    if (!lead.linkedin && !novo.linkedin && u.includes('linkedin.com/in/') && nomeBate(r.title || '', lead.nome)) {
      novo.linkedin = url.split('?')[0]; motivos.push('LinkedIn com o nome completo no título'); fontes.push(url);
    }
    if (!lead.instagram && !novo.instagram && /instagram\.com\/[a-z0-9._]{3,30}\/?$/i.test(url.split('?')[0]) && nomeBate(r.title || '', lead.nome)) {
      novo.instagram = '@' + url.split('?')[0].replace(/\/$/, '').split('/').pop(); motivos.push('Instagram com o nome completo no título'); fontes.push(url);
    }
    // Profissão e anos NÃO são deduzidos da busca: os testes com dados reais mostraram erros (dados da empresa atribuídos à pessoa).
  }
  return { novo, motivos, fontes: [...new Set(fontes)] };
}
