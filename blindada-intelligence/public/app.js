// Blindada Intelligence v2 — interface (sem build, JS puro)
import { PASSOS, REGRAS, passoAtual, ganchoDe } from './mensagens.js';
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { meta: null, view: 'hoje', testes: false, leadsModo: 'lista' };

async function api(path, opts = {}) {
  const r = await fetch('/api/' + path, { headers: { 'content-type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : await r.text();
  if (r.status === 401 && !path.startsWith('auth/')) { telaLogin(); throw new Error('Entre com sua senha.'); }
  if (!r.ok && r.status !== 409) throw new Error(data.erro || 'Erro');
  return { status: r.status, data };
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 2600); }
function classe(score) {
  if (score >= 75) return { l: 'A', r: 'Prioridade máxima', e: '🔥' };
  if (score >= 55) return { l: 'B', r: 'Alta', e: '🟠' };
  if (score >= 35) return { l: 'C', r: 'Média', e: '🟡' };
  return { l: 'D', r: 'Baixa', e: '❄️' };
}
const scoreBadge = (s) => { const c = classe(s); return `<span class="score ${c.l}">${c.e} ${s}<small>/100</small></span>`; };
const local = (l) => [l.cidade, l.uf].filter(Boolean).join(' / ') || '<span class="muted">Não informado</span>';
const qs = () => (state.testes ? '&testes=1' : '');

// ---------- Navegação ----------
const VIEWS = { hoje: viewHoje, descobrir: viewDescobrir, revisar: viewRevisar, leads: viewLeads, mensagens: viewMensagens, painel: viewPainel, config: viewConfig };
const TITULOS = { hoje: 'Hoje', descobrir: 'Descobrir', revisar: 'Revisar', leads: 'Leads', mensagens: 'Mensagens', painel: 'Painel', config: 'Configurações' };
function ir(view) {
  state.view = VIEWS[view] ? view : 'hoje';
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('ativo', a.dataset.view === state.view));
  $('#crumb').textContent = TITULOS[state.view];
  $('#sidebar').classList.remove('aberta');
  location.hash = state.view;
  VIEWS[state.view]().catch((e) => ($('#view').innerHTML = `<div class="card aviso">Erro: ${esc(e.message)}</div>`));
  atualizarBadge();
}
async function atualizarBadge() {
  try { const { data } = await api('revisao?status=pendente'); $('#badge-revisar').textContent = data.length || ''; } catch {}
}

// ---------- HOJE ----------
async function viewHoje() {
  const { data: leads } = await api('leads?x=1' + qs());
  const hoje = new Date().toISOString().slice(0, 10);
  const ativos = leads.filter((l) => !['Cliente', 'Sem interesse', 'Perdido'].includes(l.etapa));
  const vencidas = ativos.filter((l) => l.data_proxima && l.data_proxima <= hoje).slice(0, 10);
  const idsV = new Set(vencidas.map((l) => l.id));
  const quentes = ativos.filter((l) => !idsV.has(l.id) && l.score >= 55 && l.etapa === 'Novo lead').slice(0, Math.max(0, 10 - vencidas.length));
  const aquecer = ativos.filter((l) => !idsV.has(l.id) && l.score < 55 && l.etapa === 'Novo lead' && (l.instagram || l.linkedin)).slice(0, 5);
  const card = (l, acao) => `<tr class="click" data-lead="${l.id}"><td class="pessoa"><b>${esc(l.nome)}${l.teste ? '<span class="tag-teste">teste</span>' : ''}</b><small>${esc([l.cargo, l.empresa].filter(Boolean).join(' · '))}</small></td>
    <td>${scoreBadge(l.score)}</td><td class="hide-m">${esc(l.etapa)}</td><td><b>${esc(acao)}</b></td></tr>`;
  const tabela = (lista, acao, vazio) => lista.length ? `<table><tbody>${lista.map((l) => card(l, typeof acao === 'function' ? acao(l) : acao)).join('')}</tbody></table>` : `<div class="vazio">${vazio}</div>`;
  $('#view').innerHTML = `
    <div class="kicker">Sua agenda de conexões</div><h1>${(() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })()}, Andréa.</h1>
    <p class="sub">No máximo 10 ações por dia, em ordem de prioridade. Constância vale mais que volume.</p>
    <div class="grid" style="margin-bottom:18px">
      <div class="metric"><b>${vencidas.length}</b><span>Follow-ups vencidos</span></div>
      <div class="metric"><b>${quentes.length}</b><span>Prontas para abordar</span></div>
      <div class="metric"><b>${aquecer.length}</b><span>Para aquecer hoje</span></div>
      <div class="metric"><b>${ativos.length}</b><span>Leads ativos</span></div>
    </div>
    <div class="card"><h2>1. Próximos passos vencidos</h2>${tabela(vencidas, (l) => passoAtual(l)?.titulo || l.proxima_acao || 'Fazer follow-up', 'Nada vencido. 👏')}</div>
    <div class="card"><h2>2. Começar hoje (score ≥ 55)</h2><p class="muted">Abra a lead e siga o "Próximo passo". Com Instagram/LinkedIn: seguir e comentar antes. Só com WhatsApp/e-mail: mensagem direta.</p>${tabela(quentes, (l) => passoAtual(l)?.titulo || 'Primeira mensagem', 'Ninguém com score ≥ 55 ainda. Use Descobrir para buscar perfis com cargo de decisão e contato publicado.')}</div>
    <div class="card"><h2>3. Aquecer (seguir e interagir)</h2><p class="muted">Siga e curta 2 posts recentes. Não fale de corpo ou peso.</p>${tabela(aquecer, 'Seguir + curtir 2 posts', 'Nada para aquecer agora.')}</div>`;
}

// ---------- DESCOBRIR (Fase 2) ----------
const SUGESTOES = ['advogada sócia fundadora escritório equipe', 'arquiteta fundadora estúdio quem somos', 'médica proprietária clínica equipe',
  'empresária fundadora CEO empresa Brasil', 'diretora executiva LinkedIn São Paulo', 'dentista proprietária clínica sobre'];
async function viewDescobrir() {
  const { data: st } = await api('descobrir');
  const pct = Math.min(100, (st.usadas / st.limite) * 100);
  $('#view').innerHTML = `
    <div class="kicker">Encontrar novas mulheres</div><h1>Descobrir</h1>
    <p class="sub">Busca grátis na internet. O robô separa <b>pessoas</b> de <b>matérias</b> e pré-preenche o dossiê. Tudo vai para <b>Revisar</b> antes de virar lead.</p>
    ${st.configurada ? '' : '<div class="card aviso">⚠️ A chave da busca ainda não está configurada neste ambiente.</div>'}
    <div class="card">
      <form id="f-busca" class="row"><input type="search" id="consulta" placeholder="Ex.: advogada sócia fundadora escritório Curitiba" style="flex:1;min-width:240px">
        <button class="btn" type="submit" id="b-buscar">🔎 Pesquisar na internet</button></form>
      <div style="margin-top:10px">${SUGESTOES.map((s) => `<button class="chip" data-sug="${esc(s)}" style="cursor:pointer">${esc(s)}</button>`).join('')}</div>
      <p class="muted" style="margin-top:12px"><b>Dicas que funcionam:</b> profissão + cargo + palavra de página de equipe ("equipe", "quem somos", "sobre"). Adicione a cidade para focar. Inclua "LinkedIn" para achar perfis.</p>
      <div class="crit"><div class="top"><span>Buscas usadas este mês</span><span>${st.usadas} / ${st.limite}</span></div><div class="bar"><i style="width:${pct}%"></i></div>
        <small>Repetir a mesma busca em 24 h não gasta crédito. Ao chegar no limite, a busca trava sozinha.</small></div>
      <div id="res-busca"></div></div>
    ${st.ultimas.length ? `<div class="card"><h2>Últimas buscas</h2>${st.ultimas.map((u) => `<div class="muted">${esc(u.criado_em)} — <b>${esc(u.consulta)}</b> (${u.qtd} resultados)</div>`).join('')}</div>` : ''}
    <div class="card"><h2>Adicionar agora</h2><div class="row">
      <button class="btn" id="b-novo">+ Adicionar lead</button>
      <button class="btn sec" id="b-imp">⬆ Importar CSV / Excel (CSV)</button>
      <input type="file" id="f-csv" accept=".csv,text/csv" hidden></div>
      <p class="muted">Dica: no app antigo, use <b>Exportar</b> e importe o arquivo aqui. Duplicados e pessoas na lista "Não contatar" são ignorados automaticamente.</p></div>`;
  $('#b-novo').onclick = () => abrirForm();
  $('#b-imp').onclick = () => $('#f-csv').click();
  $('#f-csv').onchange = (e) => importarCSV(e.target.files[0]);
  document.querySelectorAll('[data-sug]').forEach((b) => (b.onclick = () => { $('#consulta').value = b.dataset.sug; $('#consulta').focus(); }));
  $('#f-busca').onsubmit = async (e) => {
    e.preventDefault();
    const consulta = $('#consulta').value.trim(); if (!consulta) return;
    const btn = $('#b-buscar'); btn.disabled = true; btn.textContent = 'Pesquisando…';
    try {
      const r = await fetch('/api/descobrir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consulta }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      $('#res-busca').innerHTML = `<div class="aviso" style="margin-top:12px">${d.doCache ? '♻️ Resultado da mesma busca nas últimas 24 h (não gastou crédito). ' : '✅ Busca feita. '}
        <b>${d.pessoas}</b> pessoa(s) e <b>${d.fontes}</b> fonte(s) foram para <b>Revisar</b>${d.ignorados ? ` · ${d.ignorados} já conhecido(s) ou bloqueado(s), ignorado(s)` : ''}.
        <div style="margin-top:8px"><button class="btn sm" id="b-ir-rev">Revisar agora →</button></div></div>`;
      $('#b-ir-rev').onclick = () => ir('revisar');
      atualizarBadge();
    } catch (err) { $('#res-busca').innerHTML = `<div class="aviso" style="margin-top:12px">⚠️ ${esc(err.message)}</div>`; }
    finally { btn.disabled = false; btn.textContent = '🔎 Pesquisar na internet'; }
  };
}

// ---------- REVISAR ----------
async function viewRevisar(status = 'pendente') {
  const { data: itens } = await api('revisao?status=' + status);
  $('#view').innerHTML = `
    <div class="kicker">Antes de entrar na base</div><h1>Revisar</h1>
    <p class="sub">Só pessoas viram lead. Matérias e listas ficam como <b>fontes para investigar</b>.</p>
    <div class="tabs">${['pendente', 'aprovado', 'descartado'].map((s) => `<button data-st="${s}" class="${s === status ? 'on' : ''}">${s[0].toUpperCase() + s.slice(1)}s</button>`).join('')}</div>
    <div id="rev-lista">${itens.length ? itens.map(itemRevisao).join('') : '<div class="card vazio">Nada aqui.</div>'}</div>`;
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => viewRevisar(b.dataset.st)));
  document.querySelectorAll('[data-aprovar]').forEach((b) => (b.onclick = async () => {
    const id = b.dataset.aprovar; const box = b.closest('.card');
    const dados = Object.fromEntries([...box.querySelectorAll('[name]')].map((i) => [i.name, i.value]));
    try {
      const { status: st, data } = await api(`revisao/${id}/aprovar`, { method: 'POST', body: dados });
      toast(data.status === 'duplicado' ? 'Já existia um lead igual. Marquei como aprovado.' : st === 409 ? data.erro : 'Aprovado e salvo nos Leads ✅');
      viewRevisar(status); atualizarBadge();
    } catch (e) { toast(e.message); }
  }));
  document.querySelectorAll('[data-descartar]').forEach((b) => (b.onclick = async () => {
    await api(`revisao/${b.dataset.descartar}/descartar`, { method: 'POST' }); toast('Descartado'); viewRevisar(status); atualizarBadge();
  }));
}
function itemRevisao(it) {
  const pend = it.status === 'pendente';
  const fonte = it.tipo === 'fonte';
  const campo = (n, rot) => `<label class="f">${rot}<input type="text" name="${n}" value="${esc(it[n])}" ${pend ? '' : 'disabled'}></label>`;
  return `<div class="card">
    <div class="row"><span class="chip ${fonte ? '' : 'on'}">${fonte ? '📰 Fonte para investigar' : '👤 Pessoa'}</span>
      <b>${esc(it.titulo || it.nome || 'Sem título')}</b><span class="spacer"></span>
      ${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener" class="muted">Conferir fonte ↗</a>` : ''}</div>
    ${it.trecho ? `<p class="muted">“${esc(it.trecho)}”</p>` : ''}
    ${fonte && pend ? '<div class="aviso">Isto não é uma pessoa. Se a fonte citar alguém, preencha o nome abaixo para criar o dossiê, ou descarte.</div>' : ''}
    <div class="form" style="margin-top:12px">${campo('nome', 'Nome *')}${campo('cargo', 'Cargo')}${campo('empresa', 'Empresa')}${campo('cidade', 'Cidade')}${campo('uf', 'UF')}
      ${campo('email', 'E-mail profissional')}${campo('whatsapp', 'WhatsApp profissional')}${campo('instagram', 'Instagram')}</div>
    ${pend ? `<div class="row" style="margin-top:12px"><button class="btn" data-aprovar="${it.id}">Aprovar como lead</button>
      <button class="btn ghost" data-descartar="${it.id}">Descartar</button></div>` : ''}</div>`;
}

// ---------- LEADS ----------
async function viewLeads() {
  const q = state.filtroQ || ''; const cl = state.filtroClasse || ''; const et = state.filtroEtapa || '';
  const { data: leads } = await api(`leads?q=${encodeURIComponent(q)}&classe=${cl}&etapa=${encodeURIComponent(et)}${qs()}`);
  const etapas = state.meta.etapas;
  $('#view').innerHTML = `
    <div class="row"><div><div class="kicker">Sua base</div><h1>Leads</h1></div><span class="spacer"></span>
      <button class="btn" id="b-novo">+ Adicionar</button><button class="btn sec" id="b-imp">⬆ Importar</button>
      <a class="btn ghost" href="/api/exportar?formato=funil">⬇ Exportar (planilha do funil)</a>
      <input type="file" id="f-csv" accept=".csv,text/csv" hidden></div>
    <div class="card"><h2>✨ Completar dados</h2>
      <p class="muted">Dados que faltam valem zero no score. O app completa sem apagar nada e registra a fonte no histórico de cada lead.</p>
      <div class="row">
        <button class="btn" id="b-gratis">✨ Completar grátis (todas)</button>
        <select id="cp-classe" style="max-width:190px"><option value="C">🟡 Faixa C (média)</option><option value="B">🟠 Faixa B (alta)</option><option value="D">❄️ Faixa D (baixa)</option><option value="">Todas</option></select>
        <select id="cp-qtd" style="max-width:120px"><option>10</option><option>25</option><option>5</option></select>
        <button class="btn sec" id="b-lote">🔎 Completar com a busca</button></div>
      <p class="muted">Grátis: site, profissão e anos de atuação tirados da fonte que você já tem. Com a busca: LinkedIn e Instagram, só quando o nome completo aparece no resultado (1 busca por lead).</p>
      <div id="cp-res"></div></div>
    <div class="card"><div class="row">
      <input type="search" id="q" placeholder="Buscar por nome, empresa, cargo, cidade…" value="${esc(q)}" style="flex:2;min-width:200px">
      <select id="cl" style="flex:1;min-width:150px"><option value="">Todas as prioridades</option>
        ${['A', 'B', 'C', 'D'].map((c) => `<option value="${c}" ${cl === c ? 'selected' : ''}>${classe({ A: 80, B: 60, C: 40, D: 0 }[c]).e} ${c} · ${classe({ A: 80, B: 60, C: 40, D: 0 }[c]).r}</option>`).join('')}</select>
      <select id="et" style="flex:1;min-width:150px"><option value="">Todas as etapas</option>${etapas.map((e) => `<option ${et === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
      <div class="tabs" style="margin:0"><button data-modo="lista" class="${state.leadsModo === 'lista' ? 'on' : ''}">Lista</button><button data-modo="pipeline" class="${state.leadsModo === 'pipeline' ? 'on' : ''}">Pipeline</button></div>
    </div></div>
    <div id="lista"></div>`;
  const lista = $('#lista');
  if (!leads.length) lista.innerHTML = '<div class="card vazio">Nenhum lead encontrado. Importe sua base ou adicione o primeiro.</div>';
  else if (state.leadsModo === 'lista') {
    lista.innerHTML = `<div class="card" style="padding:6px 10px"><table><thead><tr><th>Prospect</th><th>Score</th><th class="hide-m">Local</th><th class="hide-m">Contato</th><th>Etapa</th></tr></thead><tbody>
      ${leads.map((l) => `<tr class="click" data-lead="${l.id}"><td class="pessoa"><b>${esc(l.nome)}${l.teste ? '<span class="tag-teste">teste</span>' : ''}</b><small>${esc([l.cargo, l.empresa].filter(Boolean).join(' · ') || 'Cargo não informado')}</small></td>
        <td>${scoreBadge(l.score)}</td><td class="hide-m">${local(l)}</td>
        <td class="hide-m">${[l.whatsapp && '📱', l.email && '✉️', (l.instagram || l.linkedin) && '🔗'].filter(Boolean).join(' ') || '<span class="muted">sem contato</span>'}</td>
        <td>${esc(l.etapa)}</td></tr>`).join('')}</tbody></table></div><p class="muted">${leads.length} lead(s), ordenados pelo score.</p>`;
  } else {
    const usadas = etapas.filter((e) => leads.some((l) => l.etapa === e) || ['Novo lead', 'Aquecendo', 'Contatado', 'Respondeu', 'Call agendada', 'Proposta', 'Cliente'].includes(e));
    lista.innerHTML = `<div class="kanban">${usadas.map((e) => { const ls = leads.filter((l) => l.etapa === e);
      return `<div class="col"><h3>${e}<span>${ls.length}</span></h3>${ls.map((l) => `<div class="kcard" data-lead="${l.id}"><b>${esc(l.nome)}</b><div class="muted">${esc(l.cargo || '')}</div>${scoreBadge(l.score)}</div>`).join('')}</div>`; }).join('')}</div>`;
  }
  let t; $('#q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { state.filtroQ = e.target.value; viewLeads().then(() => { const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 300); };
  $('#cl').onchange = (e) => { state.filtroClasse = e.target.value; viewLeads(); };
  $('#et').onchange = (e) => { state.filtroEtapa = e.target.value; viewLeads(); };
  document.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => { state.leadsModo = b.dataset.modo; viewLeads(); }));
  $('#b-novo').onclick = () => abrirForm();
  $('#b-imp').onclick = () => $('#f-csv').click();
  $('#f-csv').onchange = (e) => importarCSV(e.target.files[0]);
  $('#b-gratis').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = 'Completando…';
    try { const { data } = await api('completar/gratis', { method: 'POST' });
      $('#cp-res').innerHTML = `<div class="aviso">✅ ${data.atualizados} de ${data.total} leads ganharam dados: ${data.contagem.site_empresa} sites, ${data.contagem.profissao} profissões, ${data.contagem.anos_atuacao} anos de atuação. Nenhuma busca gasta.</div>`;
      setTimeout(viewLeads, 2500);
    } catch (err) { toast(err.message); } finally { e.target.disabled = false; e.target.textContent = '✨ Completar grátis (todas)'; }
  };
  $('#b-lote').onclick = async (e) => {
    const qtd = $('#cp-qtd').value; const cl = $('#cp-classe').value;
    if (!confirm(`Completar ${qtd} leads com a busca? Gasta até ${qtd} das buscas do mês.`)) return;
    e.target.disabled = true; e.target.textContent = 'Buscando… (pode levar 1 min)';
    try { const { data } = await api('completar/lote', { method: 'POST', body: { quantidade: qtd, classe: cl } });
      $('#cp-res').innerHTML = `<div class="aviso">🔎 ${data.processados} pesquisadas · ${data.comNovidade} com dados novos (${data.linkedin} LinkedIn, ${data.instagram} Instagram). Faltam ${data.restantes} nesta faixa. Confira os perfis encontrados antes de abordar.</div>`;
      setTimeout(viewLeads, 3500);
    } catch (err) { $('#cp-res').innerHTML = `<div class="aviso">⚠️ ${esc(err.message)}</div>`; } finally { e.target.disabled = false; e.target.textContent = '🔎 Completar com a busca'; }
  };
}

// ---------- DETALHE DO LEAD ----------
async function abrirLead(id) {
  const { data: l } = await api('leads/' + id);
  const a = l.analise; const c = classe(l.score);
  const sinaisOn = new Set(l.sinais.map((s) => s.tipo));
  $('#drawer-panel').innerHTML = `
    <div class="row"><button class="btn ghost sm" data-close>✕ Fechar</button><span class="spacer"></span>
      <button class="btn ghost sm" id="b-completar">🔎 Completar dados (1 busca)</button>
      <button class="btn sec sm" id="b-editar">Editar</button></div>
    <h1 style="margin-top:14px">${esc(l.nome)}${l.teste ? '<span class="tag-teste">teste</span>' : ''}</h1>
    <p class="sub">${esc([l.cargo, l.profissao, l.empresa].filter(Boolean).join(' · ') || 'Dados profissionais não informados')} — ${local(l)}</p>
    <div class="card"><div class="row"><h2 style="margin:0">Score Blindada</h2><span class="spacer"></span>${scoreBadge(l.score)}</div>
      <p class="muted">${c.e} ${c.r}. <b>Próxima ação:</b> ${esc(passoAtual(l)?.titulo || a.proximaAcao)}</p>
      ${a.criterios.map((k) => `<div class="crit"><div class="top"><span>${k.nome}</span><span>${k.pontos}/${k.max}</span></div>
        <div class="bar"><i style="width:${(k.pontos / k.max) * 100}%"></i></div><small>${k.motivos.map(esc).join(' · ')}</small></div>`).join('')}
      <p class="muted">Não estima renda pessoal, saúde, peso ou necessidade de emagrecimento.</p></div>
    ${(() => { const p = passoAtual(l); if (!p) return `<div class="card"><h2>Sequência</h2><p class="muted">${l.etapa === 'Contatado' ? 'Sem resposta depois do follow-up. Sugestão: mover para "Follow-up futuro" ou "Sem interesse".' : 'Nenhum passo automático nesta etapa.'}</p></div>`;
      return `<div class="card" style="border-color:var(--dourado)"><div class="row"><h2 style="margin:0">Próximo passo: ${esc(p.titulo)}</h2></div>
      <p class="muted">${esc(p.instrucao)}</p>
      ${p.texto ? `<textarea id="d-msg" style="min-height:150px">${esc(p.texto(l, state.meta.config))}</textarea>` : ''}
      <div class="row" style="margin-top:8px">${p.texto ? '<button class="btn sec" id="b-copiar">📋 Copiar mensagem</button>' : ''}
        <button class="btn" id="b-passo">✓ Feito, avançar</button></div>
      <p class="muted">Ao marcar como feito, o app agenda o próximo passo para daqui a ${p.dias} dia(s).</p></div>`; })()}
    <div class="card"><h2>Bônus (opcional)</h2><p class="muted">Só se acontecer. A prospecção fria funciona sem isso.</p>
      <div>${Object.entries(state.meta.sinais).map(([k, d]) => `<button class="chip ${sinaisOn.has(k) ? 'on' : ''}" data-sinal="${k}" style="cursor:pointer;padding:6px 12px">${sinaisOn.has(k) ? '✓ ' : '+ '}${esc(d.label)} (+${d.pontos})</button>`).join('')}</div></div>
    <div class="card"><h2>Etapa e próxima ação</h2><div class="form">
      <label class="f">Etapa<select id="d-etapa">${state.meta.etapas.map((e) => `<option ${e === l.etapa ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
      <label class="f">Próxima ação<input type="text" id="d-acao" value="${esc(l.proxima_acao)}" placeholder="${esc(a.proximaAcao)}"></label>
      <label class="f">Data<input type="date" id="d-data" value="${esc(l.data_proxima)}"></label>
      <label class="f">Valor da proposta (R$)<input type="text" id="d-valor" value="${esc(l.valor_proposta)}"></label></div>
      <label class="f" style="margin-top:10px">Anotações<textarea id="d-notas">${esc(l.anotacoes)}</textarea></label>
      <div class="row" style="margin-top:10px"><button class="btn" id="b-salvar">Salvar</button>
        <button class="btn ghost" id="b-contato">📨 Registrar contato feito</button><button class="btn ghost" id="b-resp">💬 Registrar resposta</button></div></div>
    <div class="card"><h2>Contato e fonte</h2>
      <p>${l.whatsapp ? `📱 ${esc(l.whatsapp)}<br>` : ''}${l.email ? `✉️ ${esc(l.email)}<br>` : ''}${l.instagram ? `📷 ${esc(l.instagram)}<br>` : ''}${l.linkedin ? `in ${esc(l.linkedin)}<br>` : ''}${!l.whatsapp && !l.email && !l.instagram && !l.linkedin ? '<span class="muted">Nenhum canal publicado.</span>' : ''}</p>
      <p class="muted">Fonte: ${l.fonte_url ? `<a href="${esc(l.fonte_url)}" target="_blank" rel="noopener">${esc(l.fonte_url)}</a>` : 'não registrada'} · coletado em ${esc(l.coletado_em)} · origem: ${esc(l.origem)}${l.fonte_desc ? `<br>${esc(l.fonte_desc)}` : ''}</p></div>
    <div class="card"><h2>Histórico</h2>${l.atividades.length ? l.atividades.map((x) => `<div class="muted">${esc(x.criado_em)} — <b>${esc(x.tipo)}</b> ${esc(x.canal || '')} ${esc(x.descricao || '')}</div>`).join('') : '<p class="muted">Sem atividades.</p>'}</div>
    <div class="card"><h2>Privacidade</h2><div class="row"><button class="btn perigo sm" id="b-remover">Remover e não contatar mais</button>
      <button class="btn ghost sm" id="b-apagar">Apenas apagar</button></div>
      <p class="muted">"Remover e não contatar" bloqueia a mesma pessoa em importações futuras (LGPD).</p></div>`;
  $('#drawer').hidden = false;
  document.querySelectorAll('[data-sinal]').forEach((b) => (b.onclick = async () => {
    const k = b.dataset.sinal;
    if (sinaisOn.has(k)) await api(`leads/${id}/sinais/${k}`, { method: 'DELETE' }); else await api(`leads/${id}/sinais`, { method: 'POST', body: { tipo: k } });
    abrirLead(id); recarregar();
  }));
  $('#b-salvar').onclick = async () => {
    await api('leads/' + id, { method: 'PUT', body: { etapa: $('#d-etapa').value, proxima_acao: $('#d-acao').value, data_proxima: $('#d-data').value, valor_proposta: $('#d-valor').value, anotacoes: $('#d-notas').value } });
    toast('Salvo ✅'); abrirLead(id); recarregar();
  };
  const registrar = async (tipo, etapa, dias) => {
    const canal = prompt('Por qual canal? (Instagram, WhatsApp, E-mail, LinkedIn)', 'Instagram'); if (canal === null) return;
    await api(`leads/${id}/atividades`, { method: 'POST', body: { tipo, canal } });
    const d = new Date(); d.setDate(d.getDate() + dias);
    await api('leads/' + id, { method: 'PUT', body: { etapa, data_proxima: d.toISOString().slice(0, 10), proxima_acao: tipo === 'contato' ? 'Follow-up se não responder' : 'Enviar formulário de aplicação' } });
    toast('Registrado ✅'); abrirLead(id); recarregar();
  };
  const passo = passoAtual(l);
  if (passo) {
    if ($('#b-copiar')) $('#b-copiar').onclick = () => copiar($('#d-msg').value);
    $('#b-passo').onclick = async () => {
      const d = new Date(); d.setDate(d.getDate() + passo.dias);
      await api(`leads/${id}/atividades`, { method: 'POST', body: { tipo: passo.id, descricao: passo.titulo } });
      await api('leads/' + id, { method: 'PUT', body: { etapa: passo.etapa, proxima_acao: passo.proxima, data_proxima: d.toISOString().slice(0, 10) } });
      toast(`Feito ✅ Próximo: ${passo.proxima}`); abrirLead(id); recarregar();
    };
  }
  $('#b-contato').onclick = () => registrar('contato', 'Contatado', 4);
  $('#b-resp').onclick = () => registrar('resposta', 'Respondeu', 1);
  $('#b-editar').onclick = () => abrirForm(l);
  $('#b-completar').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = 'Buscando…';
    try { const { data } = await api(`leads/${id}/completar`, { method: 'POST' });
      toast(data.completados.length ? `Completado: ${data.completados.join(', ')} ✅ Confira no histórico.` : 'Nada novo encontrado para esta pessoa.');
      abrirLead(id); recarregar();
    } catch (err) { toast(err.message); e.target.disabled = false; e.target.textContent = '🔎 Completar dados (1 busca)'; }
  };
  $('#b-remover').onclick = async () => { if (!confirm('Remover esta pessoa e bloquear contatos futuros?')) return; await api(`leads/${id}?nao_contatar=1`, { method: 'DELETE' }); fecharDrawer(); toast('Removida e bloqueada'); recarregar(); };
  $('#b-apagar').onclick = async () => { if (!confirm('Apagar este lead?')) return; await api('leads/' + id, { method: 'DELETE' }); fecharDrawer(); toast('Apagado'); recarregar(); };
}
function fecharDrawer() { $('#drawer').hidden = true; }
function recarregar() { VIEWS[state.view](); }

// ---------- FORMULÁRIO ----------
function abrirForm(l = {}) {
  const campo = (n, rot, tipo = 'text', ph = '') => `<label class="f">${rot}<input type="${tipo}" name="${n}" value="${esc(l[n])}" placeholder="${ph}"></label>`;
  $('#drawer-panel').innerHTML = `<div class="row"><button class="btn ghost sm" data-close>✕ Fechar</button></div>
    <h1 style="margin-top:14px">${l.id ? 'Editar lead' : 'Novo lead'}</h1>
    <p class="sub">Registre só dados com origem conhecida. O score é calculado ao salvar.</p>
    <form id="form-lead" class="card"><div class="form">
      ${campo('nome', 'Nome completo *')}${campo('cargo', 'Cargo', 'text', 'Sócia, Fundadora, Diretora…')}${campo('profissao', 'Profissão', 'text', 'Advogada, Arquiteta…')}
      ${campo('empresa', 'Empresa')}${campo('site_empresa', 'Site da empresa')}
      <label class="f">Porte da empresa<select name="porte">${['', '1-10', '11-50', '51-200', '200+'].map((p) => `<option ${l.porte === p ? 'selected' : ''} value="${p}">${p || 'Não informado'}</option>`).join('')}</select></label>
      ${campo('anos_atuacao', 'Anos de atuação', 'number')}${campo('cidade', 'Cidade')}${campo('uf', 'UF')}
      ${campo('instagram', 'Instagram', 'text', '@usuario')}${campo('linkedin', 'LinkedIn (URL)')}${campo('email', 'E-mail profissional', 'email')}${campo('whatsapp', 'WhatsApp profissional')}
      ${campo('fonte_url', 'Onde encontrou (URL da fonte)', 'url')}${campo('fonte_desc', 'O que a fonte comprova')}
      <label class="f">Origem<select name="origem">${['manual', 'instagram', 'indicacao', 'busca', 'importacao'].map((o) => `<option ${l.origem === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="contato_direto" ${l.contato_direto ? 'checked' : ''}> Contato é da própria pessoa (confirmado)</label>
    </div><div class="row" style="margin-top:14px"><button class="btn" type="submit">Salvar</button></div></form>`;
  $('#drawer').hidden = false;
  $('#form-lead').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target; const body = Object.fromEntries(new FormData(f)); body.contato_direto = f.contato_direto.checked;
    try {
      const r = l.id ? await api('leads/' + l.id, { method: 'PUT', body }) : await api('leads', { method: 'POST', body });
      if (r.status === 409) { toast(r.data.erro || r.data.aviso); if (r.data.id) abrirLead(r.data.id); return; }
      toast('Salvo ✅'); abrirLead(r.data.id); recarregar();
    } catch (err) { toast(err.message); }
  };
}

// ---------- IMPORTAR CSV ----------
const MAPA = [
  ['nome', ['nome', 'name', 'prospect', 'pessoa']], ['cargo', ['cargo', 'title', 'titulo', 'funcao']], ['profissao', ['profissao', 'profession', 'ocupacao']],
  ['empresa', ['empresa', 'company', 'organizacao']], ['site_empresa', ['site', 'website', 'dominio', 'domain']], ['porte', ['porte', 'funcionarios', 'employees']],
  ['anos_atuacao', ['anos', 'experiencia']], ['cidade', ['cidade', 'city']], ['uf', ['uf', 'estado', 'state']], ['instagram', ['instagram']],
  ['linkedin', ['linkedin']], ['email', ['email', 'e-mail', 'mail']], ['whatsapp', ['whatsapp', 'telefone', 'phone', 'celular', 'fone']],
  ['fonte_url', ['fonte', 'source', 'url']], ['etapa', ['etapa', 'stage', 'status']], ['anotacoes', ['anotac', 'observ', 'notas', 'notes']],
];
const n = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function parseCSV(txt) {
  txt = txt.replace(/^﻿/, '');
  const prim = txt.split(/\r?\n/)[0]; const sep = (prim.match(/;/g) || []).length > (prim.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
async function importarCSV(file) {
  if (!file) return;
  const rows = parseCSV(await file.text());
  if (rows.length < 2) return toast('Arquivo vazio ou sem cabeçalho.');
  const cab = rows[0].map(n);
  const idx = {};
  for (const [campo, chaves] of MAPA) { const i = cab.findIndex((h) => chaves.some((k) => h.includes(k))); if (i >= 0 && !Object.values(idx).includes(i)) idx[campo] = i; }
  if (idx.nome === undefined) return toast('Não achei a coluna "Nome" no arquivo.');
  const linhas = rows.slice(1).map((r) => Object.fromEntries(Object.entries(idx).map(([c, i]) => [c, r[i]])));
  if (!confirm(`Importar ${linhas.length} linha(s)? Colunas reconhecidas: ${Object.keys(idx).join(', ')}.`)) return;
  toast('Importando…');
  const tot = { criados: 0, duplicados: 0, bloqueados: 0, invalidos: 0 };
  for (let i = 0; i < linhas.length; i += 200) {
    const { data } = await api('importar', { method: 'POST', body: { linhas: linhas.slice(i, i + 200) } });
    for (const k in tot) tot[k] += data[k] || 0;
  }
  alert(`Importação concluída:\n✅ ${tot.criados} novos\n🔁 ${tot.duplicados} duplicados ignorados\n⛔ ${tot.bloqueados} na lista "Não contatar"\n⚠️ ${tot.invalidos} inválidos`);
  ir('leads');
}

// ---------- MENSAGENS (Fase 3) ----------
async function viewMensagens() {
  const exemplo = { nome: 'Helena Exemplo', cargo: 'Sócia-fundadora', profissao: 'Advogada', empresa: 'Exemplo & Associadas' };
  $('#view').innerHTML = `<div class="kicker">Abordagens que geram conversa</div><h1>Mensagens</h1>
    <p class="sub">A sequência completa, do primeiro "seguir" até a call. Dentro de cada lead, o app já preenche o nome, a empresa e a rotina da profissão.</p>
    <div class="card"><h2>Regras fixas</h2><ul>${REGRAS.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
    <p class="muted">Exemplo com uma lead fictícia (${esc(exemplo.cargo)}, ${esc(exemplo.profissao)}). Rotina usada: “${esc(ganchoDe(exemplo))}”.</p>
    ${PASSOS.map((p) => `<div class="card"><div class="row"><h2 style="margin:0">${esc(p.titulo)}</h2><span class="spacer"></span><span class="chip">etapa: ${esc(p.etapa)}</span></div>
      <p class="muted">${esc(p.instrucao)}</p>
      ${p.texto ? `<textarea readonly style="min-height:120px">${esc(p.texto(exemplo, state.meta.config))}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn sm sec" data-copiar="${p.id}">Copiar modelo</button></div>` : ''}</div>`).join('')}`;
  document.querySelectorAll('[data-copiar]').forEach((b) => (b.onclick = () => {
    const p = PASSOS.find((x) => x.id === b.dataset.copiar); copiar(p.texto(exemplo, state.meta.config));
  }));
}
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copiado ✅ Agora cole no Instagram/WhatsApp'); }
  catch { prompt('Copie o texto abaixo:', txt); }
}

// ---------- PAINEL ----------
async function viewPainel() {
  const { data: p } = await api('painel');
  const et = Object.fromEntries(p.porEtapa.map((x) => [x.etapa, x.n]));
  const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  $('#view').innerHTML = `<div class="kicker">Sua estratégia, em perspectiva</div><h1>Painel</h1><p class="sub">Dados de teste ficam fora destes números.</p>
    <div class="grid" style="margin-bottom:18px">
      <div class="metric"><b>${p.total}</b><span>Leads na base</span></div>
      <div class="metric"><b>${p.classes.a || 0}</b><span>🔥 Prioridade máxima</span></div>
      <div class="metric"><b>${p.classes.b || 0}</b><span>🟠 Alta</span></div>
      <div class="metric"><b>${p.comSinal}</b><span>Com sinal de proximidade</span></div>
      <div class="metric"><b>${p.pendentes}</b><span>Para revisar</span></div>
      <div class="metric"><b>${p.vencidas}</b><span>Ações vencidas</span></div>
      <div class="metric"><b>${fmt(p.faturamento)}</b><span>Faturamento fechado</span></div></div>
    <div class="card"><h2>Funil</h2>${state.meta.etapas.map((e) => { const v = et[e] || 0; const pct = p.total ? (v / p.total) * 100 : 0;
      return `<div class="crit"><div class="top"><span>${e}</span><span>${v}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`; }).join('')}</div>`;
}

// ---------- CONFIG ----------
async function viewConfig() {
  const cfg = state.meta.config;
  $('#view').innerHTML = `<div class="kicker">Workspace</div><h1>Configurações</h1>
    <div class="card"><div class="form">
      <label class="f">Link do formulário de aplicação<input type="url" id="c-form" value="${esc(cfg.link_formulario)}" placeholder="https://forms.gle/..."></label>
      <label class="f">Seu Instagram<input type="text" id="c-ig" value="${esc(cfg.instagram_proprio)}"></label>
      <label class="f">Retenção de dados (dias)<select id="c-ret">${['30', '60', '90', '180', '365'].map((d) => `<option ${cfg.retencao_dias === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="f">Limite de buscas por mês<input type="number" id="c-lim" value="${esc(cfg.limite_buscas_mes)}"></label></div>
      <h2 style="margin-top:18px">Seu público-alvo</h2>
      <p class="muted">Usado no score (Aderência ao público-alvo). Separe por vírgula. Pode escrever só o começo da palavra: "advogad" pega advogada e advogado.</p>
      <div class="form">
        <label class="f">Profissões-alvo<textarea id="c-prof">${esc(cfg.profissoes_alvo)}</textarea></label>
        <label class="f">Regiões-alvo (cidades ou UFs; vazio = Brasil inteiro)<textarea id="c-reg" placeholder="SP, RJ, Curitiba">${esc(cfg.regioes_alvo)}</textarea></label></div>
      <p class="muted">Leads coletados há mais tempo que a retenção saem da lista e da exportação.</p>
      <button class="btn" id="c-salvar">Salvar</button></div>
    <div class="card"><h2>Busca automática (Tavily)</h2>
      <p class="muted">${cfg.tavily_configurada ? '✅ Chave configurada. Ela fica guardada e nunca aparece na tela.' : '⚠️ Sem chave: a busca da tela Descobrir não funciona.'}</p>
      <div class="row"><input type="password" id="c-tav" placeholder="Cole aqui a chave (tvly-...)" autocomplete="off" style="flex:1;min-width:220px">
        <button class="btn" id="c-tav-salvar">Salvar chave</button></div>
      <p class="muted">Em app.tavily.com, clique no ícone 👁 e depois no ícone 📋 de copiar. Não selecione com o mouse.</p></div>
    <div class="card"><h2>Dados de demonstração</h2><p class="muted">Remova os perfis fictícios antes de usar com dados reais.</p><button class="btn ghost" id="c-demo">Remover dados de teste</button></div>
    <div class="card"><h2>Backup</h2><a class="btn sec" href="/api/exportar?formato=completo">⬇ Exportar backup completo (CSV)</a></div>
    <div class="card"><h2>Sessão</h2><button class="btn ghost" id="c-sair">Sair do app</button></div>`;
  $('#c-sair').onclick = async () => { await api('auth/sair', { method: 'POST' }); telaLogin(); };
  $('#c-salvar').onclick = async () => {
    await api('config', { method: 'PUT', body: { link_formulario: $('#c-form').value, instagram_proprio: $('#c-ig').value, retencao_dias: $('#c-ret').value, limite_buscas_mes: $('#c-lim').value, profissoes_alvo: $('#c-prof').value, regioes_alvo: $('#c-reg').value } });
    state.meta = (await api('meta')).data; toast('Configurações salvas ✅');
  };
  $('#c-tav-salvar').onclick = async () => {
    const v = $('#c-tav').value.trim(); if (!v) return toast('Cole a chave primeiro.');
    try { const r = await api('config', { method: 'PUT', body: { tavily_key: v } }); if (r.status !== 200) throw new Error(r.data.erro);
      $('#c-tav').value = ''; state.meta = (await api('meta')).data; toast('Chave salva ✅'); viewConfig(); } catch (e) { toast(e.message); }
  };
  $('#c-demo').onclick = async () => { if (!confirm('Remover todos os dados de teste?')) return; const { data } = await api('demo', { method: 'DELETE' }); toast(`${data.removidos} perfis de teste removidos`); };
}

// ---------- Início ----------
document.addEventListener('click', (e) => {
  const nav = e.target.closest('nav a'); if (nav) return ir(nav.dataset.view);
  if (e.target.closest('[data-close]')) return fecharDrawer();
  const lead = e.target.closest('[data-lead]'); if (lead) return abrirLead(lead.dataset.lead);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharDrawer(); });
$('#menu-btn').onclick = () => $('#sidebar').classList.toggle('aberta');
$('#chk-testes').onchange = (e) => { state.testes = e.target.checked; recarregar(); };
async function telaLogin() {
  const { data: est } = await api('auth/estado');
  document.querySelector('.app').hidden = true;
  let box = $('#login'); if (!box) { box = document.createElement('div'); box.id = 'login'; document.body.appendChild(box); }
  box.hidden = false;
  box.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--verde)">
    <form id="f-login" class="card" style="width:min(420px,100%);margin:0">
      <div class="brand" style="margin-bottom:14px"><div class="brand-mark">B</div><div><div class="brand-name" style="color:var(--verde)">BLINDADA</div><div class="brand-sub">INTELLIGENCE™</div></div></div>
      <h2>${est.configurada ? 'Entrar' : 'Primeiro acesso'}</h2>
      <p class="muted">${est.configurada ? 'Digite sua senha.' : 'Use o código de primeiro acesso que o Claude te passou e crie sua senha (mín. 10 caracteres, com letras e números).'}</p>
      ${est.configurada ? '' : '<label class="f">Código de primeiro acesso<input type="text" id="l-cod" autocomplete="off" required></label>'}
      <label class="f" style="margin-top:10px">${est.configurada ? 'Senha' : 'Crie sua senha'}<input type="password" id="l-senha" autocomplete="${est.configurada ? 'current-password' : 'new-password'}" required></label>
      ${est.configurada ? '' : '<label class="f" style="margin-top:10px">Repita a senha<input type="password" id="l-senha2" autocomplete="new-password" required></label>'}
      <button class="btn" type="submit" style="margin-top:14px;width:100%">${est.configurada ? 'Entrar' : 'Criar senha e entrar'}</button>
      <p class="muted" id="l-msg" style="margin-top:10px"></p></form></div>`;
  $('#f-login').onsubmit = async (e) => {
    e.preventDefault(); const msg = $('#l-msg');
    const senha = $('#l-senha').value;
    if (!est.configurada && senha !== $('#l-senha2').value) { msg.textContent = 'As senhas não são iguais.'; return; }
    const r = await api(est.configurada ? 'auth/login' : 'auth/setup', { method: 'POST', body: est.configurada ? { senha } : { senha, codigo: $('#l-cod').value } }).catch((err) => ({ status: 0, data: { erro: err.message } }));
    if (r.status === 200) { box.hidden = true; document.querySelector('.app').hidden = false; iniciar(); }
    else msg.textContent = r.data?.erro || 'Não foi possível entrar.';
  };
}
async function iniciar() {
  state.meta = (await api('meta')).data;
  state.testes = false; $('#chk-testes').checked = false;
  ir(location.hash.slice(1) || 'hoje');
}
(async () => {
  const { data: est } = await api('auth/estado');
  if (!est.logado) return telaLogin();
  iniciar();
})();
