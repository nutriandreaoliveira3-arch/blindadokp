// Extração de pessoas a partir de resultados de busca — sem IA paga, só regras.
// Objetivo: separar "pessoa" de "fonte para investigar" e pré-preencher o dossiê.
// Só usa o que está escrito na página; nada é inferido.

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CARGOS = ['socia-fundadora', 'socia fundadora', 'cofundadora', 'co-fundadora', 'fundadora', 'socia', 'proprietaria', 'ceo',
  'diretora', 'presidente', 'founder', 'partner', 'gerente', 'head', 'coordenadora', 'superintendente', 'executiva', 'dona'];
const PROFISSOES = ['advogada', 'arquiteta', 'engenheira', 'medica', 'dentista', 'empresaria', 'psicologa', 'contadora', 'economista',
  'designer', 'consultora', 'corretora', 'fisioterapeuta', 'dermatologista', 'juiza', 'promotora'];
const DOMINIOS_FONTE = ['g1.globo', 'globo.com', 'exame.com', 'forbes', 'folha.uol', 'uol.com', 'estadao', 'valor.globo', 'infomoney',
  'cnnbrasil', 'terra.com', 'r7.com', 'metropoles', 'veja.abril', 'wikipedia', 'youtube.com', 'gov.br', 'jusbrasil'];
const CAMINHOS_FONTE = ['/noticia', '/noticias', '/news', '/blog/', '/artigo', '/materia', '/ranking', '/lista', '/tag/', '/categoria'];
const CAMINHOS_PESSOA = ['/equipe', '/team', '/sobre', '/about', '/quem-somos', '/nossa-equipe', '/socios', '/socias', '/profissionais', '/advogad', '/arquitet'];

// Nome: 2 a 4 palavras capitalizadas (aceita "da", "de", "dos")
const RE_NOME = /\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?: +(?:d[aeo]s? +)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){1,3})\b/g;
const PALAVRAS_ORG = ['escritorio', 'equipe', 'nossa', 'nosso', 'clinica', 'estudio', 'advocacia', 'arquitetura', 'engenharia', 'ltda',
  'associados', 'associadas', 'consultoria', 'grupo', 'instituto', 'empresa', 'servicos', 'projetos', 'imoveis', 'contato', 'sobre', 'quem'];
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const RE_TEL = /(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g;
const RE_IG = /(?:instagram\.com\/|(?<![A-Za-z0-9._%+-])@)([A-Za-z0-9._]{3,30})/g;
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const PALAVRAS_RUINS = new Set(['sao paulo', 'rio de janeiro', 'belo horizonte', 'porto alegre', 'brasil', 'linkedin', 'instagram', 'google',
  'quem somos', 'nossa equipe', 'fale conosco', 'saiba mais', 'leia mais', 'politica de privacidade', 'todos os direitos']);
const EMAIL_GENERICO = /^(contato|contact|info|atendimento|comercial|vendas|sac|faleconosco|financeiro|rh|adm|administrativo|suporte|noreply|no-reply)@/i;

export function classificarFonte(url = '', titulo = '', conteudo = '') {
  const u = norm(url); const t = norm(titulo);
  if (u.includes('linkedin.com/in/')) return 'pessoa';
  if (DOMINIOS_FONTE.some((d) => u.includes(d))) return 'fonte';
  if (CAMINHOS_FONTE.some((c) => u.includes(c))) return 'fonte';
  if (/\b(\d+|top)\s+(mulheres|empresarias|executivas|lideres)\b/.test(t)) return 'fonte';
  if (/\b(mulheres sao|pesquisa|estudo|levantamento|ranking)\b/.test(t)) return 'fonte';
  if (CAMINHOS_PESSOA.some((c) => u.includes(c))) return 'pessoa';
  const c = norm(conteudo);
  if (CARGOS.some((k) => c.includes(k))) return 'pessoa';
  return 'fonte';
}

function acharCargo(texto) {
  const t = norm(texto);
  const cargo = CARGOS.find((k) => t.includes(k));
  const prof = PROFISSOES.find((k) => t.includes(k));
  const cap = (s) => s && s.split(/[\s-]/).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return { cargo: cap(cargo), profissao: cap(prof) };
}

export function extrairPessoas(url = '', titulo = '', conteudo = '') {
  const texto = `${titulo}\n${conteudo}`;
  const tn = norm(texto);
  const pessoas = [];

  // LinkedIn: o título costuma ser "Nome Sobrenome – Cargo – Empresa | LinkedIn"
  if (norm(url).includes('linkedin.com/in/')) {
    const partes = titulo.split(/\s[-–|]\s/).map((s) => s.trim());
    const nome = partes[0];
    if (nome && nome.split(' ').length >= 2) {
      const { cargo, profissao } = acharCargo(texto);
      pessoas.push({ nome, cargo: cargo || partes[1] || null, profissao, empresa: partes[2] && !/linkedin/i.test(partes[2]) ? partes[2] : null, linkedin: url });
    }
    return pessoas.map((p) => completar(p, texto));
  }

  // Páginas: procura nomes perto de cargos (janela de 80 caracteres)
  const vistos = new Set();
  for (const m of texto.matchAll(RE_NOME)) {
    const nome = m[1].trim();
    const nn = norm(nome);
    if (PALAVRAS_RUINS.has(nn) || vistos.has(nn) || nome.split(' ').length < 2) continue;
    if (nn.split(' ').some((w) => PALAVRAS_ORG.includes(w))) continue;
    const janela = norm(texto.slice(Math.max(0, m.index - 60), m.index + nome.length + 80));
    if (!CARGOS.some((k) => janela.includes(k)) && !PROFISSOES.some((k) => janela.includes(k))) continue;
    vistos.add(nn);
    const { cargo, profissao } = acharCargo(janela);
    pessoas.push({ nome, cargo, profissao });
    if (pessoas.length >= 5) break;
  }
  if (!pessoas.length && tn) return [];
  return pessoas.map((p) => completar(p, texto));
}

function completar(p, texto) {
  const emails = [...new Set((texto.match(RE_EMAIL) || []).filter((e) => !EMAIL_GENERICO.test(e)))];
  const primeiro = norm(p.nome.split(' ')[0]);
  const emailNominal = emails.find((e) => norm(e).startsWith(primeiro)) || null;
  const tel = (texto.match(RE_TEL) || [])[0] || null;
  const ig = [...texto.matchAll(RE_IG)].map((x) => x[1]).find((h) => !/^(p|reel|explore|stories)$/i.test(h));
  const uf = UFS.find((u) => new RegExp(`[\\s/,-]${u}\\b`).test(texto)) || null;
  return { ...p, email: emailNominal, whatsapp: tel, instagram: ig ? '@' + ig : null, uf };
}

export function processarResultados(resultados = [], consulta = '') {
  const itens = [];
  for (const r of resultados) {
    const tipo = classificarFonte(r.url, r.title, r.content);
    const base = { titulo: r.title, url: r.url, trecho: (r.content || '').slice(0, 400), consulta };
    if (tipo === 'pessoa') {
      const ps = extrairPessoas(r.url, r.title, r.content);
      if (ps.length) { for (const p of ps) itens.push({ ...base, tipo: 'pessoa', ...p }); continue; }
    }
    itens.push({ ...base, tipo: 'fonte' });
  }
  return itens;
}
