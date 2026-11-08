// Biblioteca de mensagens — Emagrecimento Blindado Elite
// Regras: nunca citar peso, corpo ou aparência; nunca falar preço; sempre oferecer a saída.

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Ganchos por profissão: falam da rotina dela, não do corpo.
const GANCHOS = [
  { chaves: ['advogad', 'juiz', 'promotor', 'desembargad'], rotina: 'prazos, audiências e dias que começam cedo e não têm hora para acabar' },
  { chaves: ['medic', 'dentista', 'dermatolog', 'cirurg', 'fisioterap', 'psicolog'], rotina: 'agenda cheia de pacientes e pouco tempo para cuidar de si' },
  { chaves: ['arquitet', 'engenheir', 'designer'], rotina: 'obras, clientes e projetos que tomam o dia inteiro' },
  { chaves: ['corretor', 'imove', 'comercial', 'vendas'], rotina: 'visitas, telefone tocando e refeições na correria' },
  { chaves: ['viage', 'turismo'], rotina: 'viagens, fusos e rotina que muda toda semana' },
  { chaves: ['ceo', 'fundador', 'socia', 'proprietari', 'empresari', 'diretor', 'executiv'], rotina: 'decisões o dia todo, reuniões em sequência e a empresa na cabeça até de noite' },
];
export function ganchoDe(lead) {
  const t = norm(`${lead.profissao} ${lead.cargo}`);
  return (GANCHOS.find((g) => g.chaves.some((k) => t.includes(k))) || { rotina: 'uma rotina intensa, com muita responsabilidade' }).rotina;
}

export const PASSOS = [
  { id: 'aquecer1', etapa: 'Aquecendo', titulo: 'Dia 0 · Seguir e curtir', dias: 2, proxima: 'Comentar algo genuíno sobre o trabalho dela',
    instrucao: 'Siga o perfil e curta 2 posts recentes sobre o trabalho dela. Não envie mensagem ainda.' },
  { id: 'aquecer2', etapa: 'Aquecendo', titulo: 'Dia 2 · Comentário genuíno', dias: 3, proxima: 'Enviar a primeira mensagem',
    instrucao: 'Comente um post profissional dela com algo específico (uma conquista, um projeto). Nunca sobre corpo ou aparência.',
    texto: (l) => `Que trabalho bonito${l.empresa ? ` na ${l.empresa}` : ''}! Admiro muito mulheres que constroem algo assim. 👏` },
  { id: 'contato1', etapa: 'Contatado', titulo: 'Dia 5 · Primeira mensagem', dias: 4, proxima: 'Follow-up se não responder',
    instrucao: 'Mensagem curta, sobre a rotina dela, oferecendo um material, sem vender.',
    texto: (l) => `Oi, ${primeiroNome(l)}! Tudo bem? Sou a Andréa, nutricionista. Acompanho seu trabalho${l.empresa ? ` na ${l.empresa}` : ''} e admiro muito.\n\nTenho atendido mulheres que vivem ${ganchoDe(l)}, e que querem mais energia e uma alimentação que caiba nessa agenda, sem dieta maluca.\n\nPreparei um material curto sobre isso. Posso te mandar? Se preferir não receber, é só me avisar. 💛` },
  { id: 'contato2', etapa: 'Contatado', titulo: 'Dia 9 · Follow-up leve', dias: 7, proxima: 'Encerrar se não responder',
    instrucao: 'Só se ela não respondeu. Leve, sem cobrança.',
    texto: (l) => `${primeiroNome(l)}, passando só para deixar o material aqui, sem compromisso nenhum: [link do material]\n\nSe fizer sentido para você, me conta. E se não for o momento, tudo bem também. 💛` },
  { id: 'resposta', etapa: 'Respondeu', titulo: 'Quando ela responder', dias: 1, proxima: 'Enviar o formulário de aplicação',
    instrucao: 'Faça perguntas e entenda a dor dela antes de oferecer qualquer coisa.',
    texto: (l) => `Que bom ter notícias suas, ${primeiroNome(l)}! 😊\n\nMe conta: no seu dia a dia hoje, o que mais pesa: a falta de tempo, de energia ou de constância?\n\nPergunto porque meu acompanhamento é individual e eu só atendo quando sei que consigo ajudar de verdade.` },
  { id: 'formulario', etapa: 'Formulário enviado', titulo: 'Convite para a aplicação', dias: 2, proxima: 'Conferir se ela aplicou',
    instrucao: 'Só para quem mostrou interesse claro (prioridade alta).',
    texto: (l, cfg) => `Pelo que você me contou, ${primeiroNome(l)}, acho que faz muito sentido conversarmos.\n\nTenho poucas vagas por mês no acompanhamento individual. Para eu entender melhor o seu momento, preenche esta aplicação rapidinho? Leva 3 minutos:\n${cfg?.link_formulario || '[link do formulário]'}\n\nDepois eu te chamo para uma conversa de 30 minutos. 💛` },
  { id: 'call', etapa: 'Call agendada', titulo: 'Agendar a call', dias: 1, proxima: 'Fazer a call de diagnóstico',
    instrucao: 'Ofereça 2 horários. O valor só aparece na call.',
    texto: (l) => `Oi, ${primeiroNome(l)}! Li sua aplicação com atenção e senti que consigo te ajudar de verdade.\n\nVamos marcar sua conversa de diagnóstico de 30 minutos? Tenho [dia] às [hora] ou [dia] às [hora]. Qual fica melhor para você?` },
];

export function primeiroNome(l) { return (l.nome || '').trim().split(/\s+/)[0] || ''; }

export function passoAtual(lead) {
  const pa = lead.proxima_acao || '';
  const ordem = {
    'Novo lead': 'aquecer1',
    'Aquecendo': pa.startsWith('Enviar a primeira') ? 'contato1' : 'aquecer2',
    'Contatado': pa.startsWith('Encerrar') ? null : 'contato2',
    'Respondeu': pa.startsWith('Enviar o formulário') ? 'formulario' : 'resposta',
    'Conversa iniciada': pa.startsWith('Enviar o formulário') ? 'formulario' : 'resposta',
    'Formulário enviado': 'call', 'Aplicou': 'call',
  };
  const id = ordem[lead.etapa];
  return PASSOS.find((p) => p.id === id) || null;
}

export const REGRAS = [
  'Nunca citar peso, corpo ou aparência, nem no primeiro contato nem depois, a menos que ela traga o assunto.',
  'Nunca falar o preço por mensagem. O valor só aparece na call, depois do diagnóstico.',
  'Sempre oferecer a saída ("se preferir não receber, é só me avisar"). Se ela pedir, use "Remover e não contatar".',
  'Uma mensagem por vez. Sem resposta depois do follow-up, encerre com elegância.',
  'Personalize sempre uma frase com algo real do trabalho dela.',
];
