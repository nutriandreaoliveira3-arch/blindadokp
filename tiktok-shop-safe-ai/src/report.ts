import { DISCLAIMER, FIELD_LABEL, LEVEL_INFO } from './engine/analyze';
import type { Analysis, Policy, PolicySource } from './types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function reportHtml(a: Analysis, policies: Policy[], sources: PolicySource[]) {
  const pol = new Map(policies.map((p) => [p.id, p]));
  const src = new Map(sources.map((s) => [s.id, s]));
  const L = LEVEL_INFO[a.level];
  const rows = a.findings
    .map((f) => {
      const refs = f.policyIds
        .map((id) => {
          const p = pol.get(id);
          const s = p && src.get(p.sourceId);
          return `<li><b>${esc(id)}</b> — ${esc(p?.title ?? 'regra removida da base')}${s ? ` <i>(${esc(s.title)}, ${s.date}${s.status === 'nao_oficial' ? ', NÃO OFICIAL' : ''})</i>` : ''}${p ? `<blockquote>${esc(p.excerpt)}</blockquote>` : ''}</li>`;
        })
        .join('');
      return `<section class="f ${f.severity}"><h3>${f.severity === 'alto' ? '🔴' : '🟡'} ${esc(f.title)}</h3>
<p><b>Elemento:</b> ${esc(FIELD_LABEL[f.field])}${f.excerpt ? ` — “${esc(f.excerpt)}”` : ''}</p>
<p>${esc(f.explanation)}</p>${f.suggestion ? `<p><b>Correção sugerida:</b> ${esc(f.suggestion || '(remover o trecho)')}</p>` : ''}
${f.humanReview ? '<p><b>Revisão humana recomendada.</b></p>' : ''}<p><b>Origem:</b> ${f.origin === 'ia' ? 'IA (validada contra a base)' : f.origin}</p><ul>${refs}</ul></section>`;
    })
    .join('');
  const field = (k: string, v: string) => (v ? `<h4>${k}</h4><pre>${esc(v)}</pre>` : '');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de conformidade — ${esc(a.title)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#1b1b1f}h1{font-size:22px}pre{white-space:pre-wrap;background:#f5f5f7;padding:10px;border-radius:8px}.f{border:1px solid #ddd;border-left:6px solid #e0a800;border-radius:8px;padding:8px 14px;margin:12px 0}.f.alto{border-left-color:#d7263d}blockquote{margin:6px 0;color:#555;font-size:12px;border-left:3px solid #ccc;padding-left:8px}.lvl{font-size:20px;font-weight:700}.disc{font-size:12px;color:#666;border-top:1px solid #ddd;margin-top:24px;padding-top:8px}</style></head><body>
<h1>Relatório de conformidade — ${esc(a.title)}</h1>
<p>${new Date(a.createdAt).toLocaleString('pt-BR')} · Produto: ${esc(a.productName ?? '—')} · Tipo: ${a.context.contentType} · Base de regras v${a.kbVersion}</p>
<p class="lvl">${L.emoji} ${L.label}</p><p>${L.desc}</p>
<h2>Alertas (${a.findings.length})</h2>${rows || '<p>Nenhum alerta.</p>'}
<h2>Conteúdo analisado</h2>${field('Roteiro e fala', a.input.roteiro)}${field('Texto na tela', a.input.textoTela)}${field('Legenda', a.input.legenda)}${field('Hashtags', a.input.hashtags)}${field('Imagem', a.input.imagemDescricao)}
<p class="disc">${esc(DISCLAIMER)}</p></body></html>`;
}
