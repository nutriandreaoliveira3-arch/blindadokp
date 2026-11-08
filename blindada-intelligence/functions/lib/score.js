// Score Blindada (0–100) — feito para PROSPECÇÃO FRIA.
// Vale quem combina com o perfil ideal e tem contato direto. Sinais do Instagram são só bônus.
// Dados ausentes valem zero. Nada é inferido de nome, foto, corpo ou renda pessoal.

const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CARGOS_DECISAO = ['fundadora', 'cofundadora', 'co-fundadora', 'socia', 'proprietaria', 'dona', 'ceo', 'presidente', 'diretora', 'founder', 'owner', 'partner', 'managing'];
const CARGOS_GESTAO = ['gerente', 'head', 'coordenadora', 'superintendente', 'executiva', 'vp', 'vice'];
const PROFISSOES_ALTA = ['medic', 'advogad', 'advoca', 'arquitet', 'engenheir', 'engenhar', 'dentista', 'odontolog', 'contabil', 'cirurgi', 'juiza', 'promotor', 'desembargador', 'empresari',
  'executiv', 'investidor', 'economista', 'auditor', 'contador', 'psicolog', 'dermatolog', 'corretora de imoveis', 'consultor'];

// Padrão do público-alvo (editável em Configurações). Radicais, sem acento.
export const ALVO_PADRAO = {
  profissoes: ['advogad', 'advoca', 'medic', 'arquitet', 'engenheir', 'engenhar', 'dentista', 'odontolog', 'empresari', 'executiv', 'psicolog', 'dermatolog'],
  regioes: [], // vazio = Brasil inteiro
};

export const SINAIS = {
  segue:      { label: 'Segue meu Instagram', pontos: 5 },
  interagiu:  { label: 'Curtiu/comentou meu conteúdo', pontos: 5 },
  respondeu:  { label: 'Respondeu Story ou mensagem', pontos: 5 },
  indicacao:  { label: 'Veio por indicação', pontos: 10 },
  bem_estar:  { label: 'Fala publicamente de saúde/bem-estar/rotina', pontos: 5 },
};

const has = (txt, lista) => lista.some((p) => p && norm(txt).includes(norm(p)));
const FONTES_OFICIAIS = ['linkedin.com/in/', '/equipe', '/team', '/sobre', '/about', '/quem-somos', '/nossa-equipe', '/socios', '/socias', '/profissionais'];

export function parseAlvo(cfg = {}) {
  const lista = (v, padrao) => {
    if (v === undefined || v === null) return padrao;
    return String(v).split(/[,;\n]/).map((x) => norm(x).trim()).filter(Boolean);
  };
  return { profissoes: lista(cfg.profissoes_alvo, ALVO_PADRAO.profissoes), regioes: lista(cfg.regioes_alvo, ALVO_PADRAO.regioes) };
}

export function calcularScore(lead = {}, sinais = [], alvo = ALVO_PADRAO) {
  const tipos = new Set(sinais.map((s) => (typeof s === 'string' ? s : s.tipo)));
  const crit = [];

  // 1) PODER DE COMPRA — até 40
  let p = 0; const pm = [];
  if (has(lead.cargo, CARGOS_DECISAO)) { p += 15; pm.push('cargo de decisão (+15)'); }
  else if (has(lead.cargo, CARGOS_GESTAO)) { p += 8; pm.push('cargo de gestão (+8)'); }
  if (has(`${lead.profissao} ${lead.cargo}`, PROFISSOES_ALTA)) { p += 10; pm.push('profissão de alta renda (+10)'); }
  const anos = Number(lead.anos_atuacao) || 0;
  if (anos >= 10) { p += 5; pm.push(`${anos} anos de atuação (+5)`); }
  else if (anos >= 5) { p += 3; pm.push(`${anos} anos de atuação (+3)`); }
  if (lead.site_empresa) { p += 5; pm.push('empresa com site (+5)'); }
  if (lead.porte && !['', '1-10'].includes(lead.porte)) { p += 5; pm.push(`empresa ${lead.porte} pessoas (+5)`); }
  p = Math.min(p, 40);
  crit.push({ nome: 'Poder de compra', pontos: p, max: 40, motivos: pm.length ? pm : ['sem dados profissionais registrados'] });

  // 2) ADERÊNCIA AO PÚBLICO-ALVO — até 20
  let a = 0; const am = [];
  if (has(`${lead.profissao} ${lead.cargo}`, alvo.profissoes)) { a += 10; am.push('profissão do seu público-alvo (+10)'); }
  if (!alvo.regioes.length) { if (lead.cidade || lead.uf) { a += 5; am.push('localização informada · alvo: Brasil (+5)'); } }
  else if (has(`${lead.cidade} ${lead.uf}`, alvo.regioes)) { a += 5; am.push('na sua região-alvo (+5)'); }
  if (lead.fonte_url && has(lead.fonte_url, FONTES_OFICIAIS)) { a += 5; am.push('dados de fonte oficial (equipe/LinkedIn) (+5)'); }
  a = Math.min(a, 20);
  crit.push({ nome: 'Aderência ao público-alvo', pontos: a, max: 20, motivos: am.length ? am : ['fora do perfil configurado ou sem dados'] });

  // 3) CONTATO DIRETO — até 30
  let c = 0; const cm = [];
  if (lead.whatsapp) { c += 12; cm.push('WhatsApp/telefone profissional (+12)'); }
  if (lead.email) { c += 10; cm.push('e-mail profissional (+10)'); }
  if (lead.instagram || lead.linkedin) { c += 5; cm.push('rede social (+5)'); }
  if (lead.contato_direto) { c += 3; cm.push('contato é da própria pessoa (+3)'); }
  c = Math.min(c, 30);
  crit.push({ nome: 'Contato direto', pontos: c, max: 30, motivos: cm.length ? cm : ['nenhum canal publicado'] });

  // 4) BÔNUS (opcional) — até 10
  let b = 0; const bm = [];
  for (const [k, def] of Object.entries(SINAIS)) if (tipos.has(k)) { b += def.pontos; bm.push(`${def.label} (+${def.pontos})`); }
  b = Math.min(b, 10);
  crit.push({ nome: 'Bônus: sinais (opcional)', pontos: b, max: 10, motivos: bm.length ? bm : ['sem sinais — normal na prospecção fria'] });

  const total = p + a + c + b;
  return { total, classe: classificar(total), criterios: crit, proximaAcao: proximaAcao(lead, total) };
}

export function classificar(total) {
  if (total >= 75) return { letra: 'A', rotulo: 'Prioridade máxima', emoji: '🔥' };
  if (total >= 55) return { letra: 'B', rotulo: 'Alta', emoji: '🟠' };
  if (total >= 35) return { letra: 'C', rotulo: 'Média', emoji: '🟡' };
  return { letra: 'D', rotulo: 'Baixa', emoji: '❄️' };
}

export function proximaAcao(lead, total) {
  const etapa = lead.etapa || 'Novo lead';
  if (['Cliente', 'Sem interesse', 'Perdido'].includes(etapa)) return 'Nenhuma ação';
  if (etapa === 'Respondeu' || etapa === 'Conversa iniciada') return 'Enviar o formulário de aplicação';
  if (etapa === 'Formulário enviado' || etapa === 'Aplicou') return 'Agendar a call de diagnóstico';
  if (etapa === 'Contatado') return 'Follow-up em 4 dias se não responder';
  if (!lead.whatsapp && !lead.email && !lead.instagram && !lead.linkedin) return 'Encontrar um canal de contato publicado';
  if (total >= 55) return 'Abordar com a primeira mensagem';
  return 'Completar dados (cargo, contato) antes de abordar';
}
