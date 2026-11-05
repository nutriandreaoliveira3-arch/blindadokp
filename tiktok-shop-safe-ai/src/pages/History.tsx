import { useState } from 'react';
import { Card, Empty, FindingCard, LevelBadge, LevelPanel, PageHead, fmtDate } from '../components/ui';
import { FIELD_LABEL } from '../engine/analyze';
import { download, reportHtml } from '../report';
import { useStore } from '../store';
import type { RiskLevel } from '../types';

export default function History() {
  const { param, analyses, policies, sources, go, deleteAnalysis } = useStore();
  const [lvl, setLvl] = useState<RiskLevel | ''>('');
  const [q, setQ] = useState('');
  const a = analyses.find((x) => x.id === param);

  if (a) {
    const html = reportHtml(a, policies, sources);
    const children = analyses.filter((x) => x.parentId === a.id);
    return (
      <>
        <PageHead
          title={a.title}
          sub={`${new Date(a.createdAt).toLocaleString('pt-BR')} · ${a.productName ?? 'sem produto'} · base v${a.kbVersion}${a.aiUsed ? ' · com IA' : ''}`}
          actions={
            <>
              <button type="button" className="btn ghost" onClick={() => go('historico')}>← Histórico</button>
              <button type="button" className="btn" onClick={() => download(`relatorio-${a.id}.html`, html, 'text/html')}>Exportar relatório (HTML)</button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(html);
                    w.document.close();
                    w.print();
                  }
                }}
              >
                Imprimir / PDF
              </button>
              <button type="button" className="btn" onClick={() => download(`analise-${a.id}.json`, JSON.stringify(a, null, 2), 'application/json')}>JSON</button>
              {a.level !== 'baixo' && <button type="button" className="btn primary" onClick={() => go('corrigir', a.id)}>Corrigir</button>}
            </>
          }
        />
        <LevelPanel level={a.level} count={a.findings.length} />
        {(a.parentId || children.length > 0) && (
          <Card title="Versões">
            {a.parentId && <button type="button" className="link" onClick={() => go('historico', a.parentId)}>← versão anterior</button>}
            {children.map((c) => (
              <button key={c.id} type="button" className="list-row" onClick={() => go('historico', c.id)}>
                <LevelBadge level={c.level} /> <span className="grow">{c.title}</span>
              </button>
            ))}
          </Card>
        )}
        <div className="grid2">
          <Card title="Alertas">
            {a.findings.map((f) => <FindingCard key={f.id} f={f} />)}
            {!a.findings.length && <p className="muted">Nenhum alerta.</p>}
          </Card>
          <Card title="Conteúdo analisado">
            {(['roteiro', 'textoTela', 'legenda', 'hashtags', 'imagemDescricao'] as const).map((k) =>
              a.input[k] ? (
                <div key={k}>
                  <span className="field-label">{FIELD_LABEL[k === 'imagemDescricao' ? 'imagem' : k]}</span>
                  <pre>{a.input[k]}</pre>
                </div>
              ) : null,
            )}
            <span className="field-label">Checklist</span>
            <pre className="sm">{Object.entries(a.context).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>
          </Card>
        </div>
        <button type="button" className="btn ghost danger" onClick={() => confirm('Excluir esta análise?') && deleteAnalysis(a.id).then(() => go('historico'))}>
          Excluir análise
        </button>
      </>
    );
  }

  const list = analyses.filter((x) => (!lvl || x.level === lvl) && (x.title + (x.productName ?? '')).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead
        title="Histórico de análises"
        actions={
          <button type="button" className="btn" onClick={() => download('historico-analises.json', JSON.stringify(analyses, null, 2), 'application/json')}>
            Exportar tudo (JSON)
          </button>
        }
      />
      <div className="filters">
        <input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={lvl} onChange={(e) => setLvl(e.target.value as RiskLevel | '')}>
          <option value="">Todos os níveis</option>
          <option value="alto">🔴 Alto risco</option>
          <option value="atencao">🟡 Atenção</option>
          <option value="baixo">🟢 Baixo risco</option>
        </select>
      </div>
      <Card>
        {list.map((x) => (
          <button key={x.id} type="button" className="list-row" onClick={() => go('historico', x.id)}>
            <LevelBadge level={x.level} />
            <span className="grow">
              {x.title}
              <span className="muted sm"> · {x.productName ?? 'sem produto'} · {x.findings.length} alerta(s){x.parentId ? ' · reanálise' : ''}</span>
            </span>
            <span className="muted sm">{fmtDate(x.createdAt)}</span>
          </button>
        ))}
        {!list.length && <Empty>Nenhuma análise registrada.</Empty>}
      </Card>
    </>
  );
}
