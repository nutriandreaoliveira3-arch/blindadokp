import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { aiRewrite } from '../ai';
import { Card, Empty, FindingCard, LevelBadge, LevelPanel, PageHead, fmtDate } from '../components/ui';
import { uid } from '../db';
import { FIELD_LABEL, analyzeContent, applyFixes } from '../engine/analyze';
import { useStore } from '../store';
import type { Analysis, ContentField, ContentInput } from '../types';

const FIELDS: [keyof ContentInput, ContentField[]][] = [
  ['roteiro', ['roteiro', 'live']],
  ['textoTela', ['textoTela']],
  ['legenda', ['legenda']],
  ['hashtags', ['hashtags']],
  ['imagemDescricao', ['imagem']],
];

export default function Corrector() {
  const { param, analyses, products, policies, kbVersion, settings, saveAnalysis, go, toast, setDraft: setStoreDraft } = useStore();
  const base = analyses.find((a) => a.id === param);
  const [draft, setDraft] = useState<ContentInput | null>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [aiNotes, setAiNotes] = useState<string[]>([]);

  const auto = useMemo(() => {
    if (!base) return null;
    const out = { ...base.input };
    for (const [k, fs] of FIELDS) {
      const f = base.findings.filter((x) => fs.includes(x.field) && !skip.has(x.id));
      out[k] = applyFixes(base.input[k], f);
    }
    return out;
  }, [base, skip]);

  useEffect(() => {
    setDraft(null);
    setSkip(new Set());
    setAiNotes([]);
  }, [param]);

  if (!base)
    return (
      <>
        <PageHead title="Corrigir riscos" sub="Escolha uma análise para corrigir." />
        <Card>
          {analyses.filter((a) => a.level !== 'baixo').slice(0, 20).map((a) => (
            <button key={a.id} type="button" className="list-row" onClick={() => go('corrigir', a.id)}>
              <LevelBadge level={a.level} /> <span className="grow">{a.title}</span>
              <span className="muted sm">{fmtDate(a.createdAt)}</span>
            </button>
          ))}
          {!analyses.some((a) => a.level !== 'baixo') && <Empty>Nenhuma análise com riscos.</Empty>}
        </Card>
      </>
    );

  const cur = draft ?? auto!;
  const product = products.find((p) => p.id === base.productId);
  const manual = base.findings.filter((f) => f.fixMode === 'manual' || f.start == null);

  const reanalyze = async () => {
    const r = analyzeContent(cur, base.context, policies, product);
    const a: Analysis = {
      ...base,
      id: uid('anl'),
      createdAt: new Date().toISOString(),
      title: base.title.replace(/ \(correção \d+\)$/, '') + ` (correção ${analyses.filter((x) => x.parentId === base.id).length + 1})`,
      input: cur,
      findings: r.findings,
      level: r.level,
      kbVersion,
      parentId: base.id,
      aiUsed: false,
    };
    await saveAnalysis(a);
    toast('Nova análise registrada.');
    go('corrigir', a.id);
  };

  const rewriteAI = async () => {
    setBusy('Reescrevendo com IA…');
    try {
      const next = { ...cur };
      const notes: string[] = [];
      for (const [k, fs] of FIELDS) {
        const f = base.findings.filter((x) => fs.includes(x.field));
        if (!f.length || !base.input[k]) continue;
        const r = await aiRewrite(settings, base.input[k], f, policies, product);
        next[k] = r.texto;
        notes.push(...r.mudancas.map((m) => `${k}: ${m}`));
      }
      setDraft(next);
      setAiNotes(notes);
    } catch (e) {
      setAiNotes([(e as Error).message]);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHead
        title="Corrigir riscos"
        sub={`${base.title} · ${fmtDate(base.createdAt)}`}
        actions={
          <>
            <button type="button" className="btn" onClick={rewriteAI} disabled={!!busy}>
              {busy || 'Reescrever com IA (opcional)'}
            </button>
            <button type="button" className="btn primary" onClick={reanalyze}>
              Aplicar e reanalisar
            </button>
          </>
        }
      />
      <LevelPanel level={base.level} count={base.findings.length} />
      {base.parentId && (
        <p className="muted sm">
          Reanálise de{' '}
          <button type="button" className="link" onClick={() => go('corrigir', base.parentId)}>
            análise anterior
          </button>
        </p>
      )}
      {aiNotes.length > 0 && (
        <div className="notice">
          <b>Mudanças feitas pela IA (revise antes de aplicar):</b>
          <ul>{aiNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}

      {FIELDS.map(([k, fs]) => {
        const f = base.findings.filter((x) => fs.includes(x.field));
        if (!base.input[k] && !f.length) return null;
        return (
          <Card key={k} title={FIELD_LABEL[fs[0]]}>
            <div className="diff">
              <div>
                <span className="field-label">Original</span>
                <pre className="orig">{highlight(base.input[k], f.filter((x) => x.start != null))}</pre>
              </div>
              <div>
                <span className="field-label">Versão corrigida (editável)</span>
                <textarea rows={Math.max(3, Math.ceil(cur[k].length / 60))} value={cur[k]} onChange={(e) => setDraft({ ...cur, [k]: e.target.value })} />
              </div>
            </div>
            {f.map((x) => (
              <FindingCard
                key={x.id}
                f={x}
                actions={
                  x.start != null && x.fixMode !== 'manual' ? (
                    <label className="check sm">
                      <input
                        type="checkbox"
                        checked={!skip.has(x.id)}
                        onChange={(e) => {
                          const s = new Set(skip);
                          if (e.target.checked) s.delete(x.id);
                          else s.add(x.id);
                          setSkip(s);
                          setDraft(null);
                        }}
                      />{' '}
                      Aplicar esta correção
                    </label>
                  ) : undefined
                }
              />
            ))}
          </Card>
        );
      })}

      {manual.filter((f) => f.field === 'producao' || f.field === 'produto').length > 0 && (
        <Card title="Ajustes de produção (não são texto)">
          <p className="muted">Estes pontos dependem de regravar, editar o vídeo ou mudar configurações. Depois, atualize o checklist em uma nova análise.</p>
          {manual
            .filter((f) => f.field === 'producao' || f.field === 'produto')
            .map((f) => (
              <FindingCard key={f.id} f={f} />
            ))}
          <button
            type="button"
            className="btn"
            onClick={() => {
              setStoreDraft({ productId: base.productId, title: base.title, input: cur, context: base.context });
              go('analisar');
            }}
          >
            Refazer checklist com este conteúdo
          </button>
        </Card>
      )}
    </>
  );
}

function highlight(text: string, f: { start?: number; end?: number }[]) {
  const ranges = f.filter((x) => x.start != null).map((x) => [x.start!, x.end!] as [number, number]).sort((a, b) => a[0] - b[0]);
  const parts: (string | React.ReactElement)[] = [];
  let i = 0;
  ranges.forEach(([s, e], n) => {
    if (s < i) return;
    parts.push(text.slice(i, s));
    parts.push(<mark key={n}>{text.slice(s, e)}</mark>);
    i = e;
  });
  parts.push(text.slice(i));
  return parts;
}
