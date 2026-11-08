// Score Blindada (0–100) — um único score, explicado critério por critério.
// Dados ausentes valem zero. Nada é inferido de nome, foto, corpo ou renda pessoal.

const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CARGOS_DECISAO = ['fundadora', 'cofundadora', 'co-fundadora', 'socia', 'proprietaria', 'dona', 'ceo', 'presidente', 'diretora', 'founder', 'owner', 'partner', 'managing'];
const CARGOS_GESTAO = ['gerente', 'head', 'coordenadora', 'superintendente', 'executiva', 'vp', 'vice'];
const PROFISSOES_ALTA = ['medica', 'advogada', 'arquiteta', 'engenheira', 'dentista', 'cirurgia', 'juiza', 'promotora', 'desembargadora', 'empresaria', 'executiva', 'investidora', 'economista', 'auditora', 'contadora', 'psicologa', 'dermatologista', 'corretora de imoveis', 'consultora'];

export const SINAIS = {
  segue:      { label: 'Segue meu Instagram', pontos: 10 },
  interagiu:  { label: 'Curtiu/comentou meu conteúdo', pontos: 10 },
  respondeu:  { label: 'Respondeu Story ou mensagem', pontos: 5 },
  indicacao:  { label: 'Veio por indicação', pontos: 10 },
  bem_estar:  { label: 'Fala publicamente de saúde/bem-estar/rotina', pontos: 5 },
};

const has = (txt, lista) => lista.some((p) => norm(txt).includes(p));

export function calcularScore(lead = {}, sinais = []) {
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

  // 2) PROXIMIDADE E INTENÇÃO — até 35 (sinais marcados por você)
  let i = 0; const im = [];
  for (const [k, def] of Object.entries(SINAIS)) if (tipos.has(k)) { i += def.pontos; im.push(`${def.label} (+${def.pontos})`); }
  i = Math.min(i, 35);
  crit.push({ nome: 'Proximidade e intenção', pontos: i, max: 35, motivos: im.length ? im : ['nenhum sinal registrado — lead frio'] });

  // 3) FACILIDADE DE CONTATO — até 25
  let c = 0; const cm = [];
  if (lead.whatsapp) { c += 10; cm.push('WhatsApp/telefone profissional (+10)'); }
  if (lead.email) { c += 8; cm.push('e-mail profissional (+8)'); }
  if (lead.instagram || lead.linkedin) { c += 5; cm.push('rede social (+5)'); }
  if (lead.contato_direto) { c += 2; cm.push('contato direto confirmado (+2)'); }
  c = Math.min(c, 25);
  crit.push({ nome: 'Facilidade de contato', pontos: c, max: 25, motivos: cm.length ? cm : ['nenhum canal publicado'] });

  const total = p + i + c;
  return { total, classe: classificar(total), criterios: crit, proximaAcao: proximaAcao(lead, tipos, total) };
}

export function classificar(total) {
  if (total >= 75) return { letra: 'A', rotulo: 'Prioridade máxima', emoji: '🔥' };
  if (total >= 55) return { letra: 'B', rotulo: 'Alta', emoji: '🟠' };
  if (total >= 35) return { letra: 'C', rotulo: 'Média', emoji: '🟡' };
  return { letra: 'D', rotulo: 'Baixa', emoji: '❄️' };
}

export function proximaAcao(lead, tipos, total) {
  const etapa = lead.etapa || 'Novo lead';
  if (['Cliente', 'Sem interesse', 'Perdido'].includes(etapa)) return 'Nenhuma ação';
  if (etapa === 'Respondeu' || etapa === 'Conversa iniciada') return 'Enviar o formulário de aplicação';
  if (etapa === 'Formulário enviado' || etapa === 'Aplicou') return 'Agendar a call de diagnóstico';
  if (etapa === 'Contatado') return 'Follow-up em 4 dias se não responder';
  if (!lead.whatsapp && !lead.email && !lead.instagram && !lead.linkedin) return 'Encontrar um canal de contato publicado';
  if (tipos.size === 0) return 'Aquecer: seguir e interagir antes de abordar';
  if (total >= 55) return 'Abordar hoje com mensagem contextual';
  return 'Interagir mais 1 vez antes da mensagem';
}
