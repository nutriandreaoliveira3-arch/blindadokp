import { useMemo, useState } from 'react';
import { Card, CopyButton, Field, FindingCard, PageHead, PolicyRef } from '../components/ui';
import { scanText } from '../engine/analyze';
import { LIVE_CHECKLIST, liveScript } from '../engine/generators';
import { gateAllows } from '../engine/productGate';
import { useStore } from '../store';

export default function LivePrep() {
  const { products, policies, setDraft, go } = useStore();
  const [sel, setSel] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const ok = products.filter((p) => gateAllows(p).ok);
  const blocked = products.filter((p) => !gateAllows(p).ok);
  const chosen = ok.filter((p) => sel.includes(p.id));
  const [edited, setEdited] = useState<string | null>(null);
  const gen = chosen.length ? liveScript(chosen, minutes) : null;
  const script = edited ?? gen?.script ?? '';
  const alerts = useMemo(() => scanText(script, 'live', policies), [script, policies]);

  const groups = ['Antes da LIVE', 'Durante a LIVE', 'Proibido'] as const;
  const pct = Math.round((done.size / LIVE_CHECKLIST.length) * 100);

  const preventive = [
    ...chosen.flatMap((p) => (p.gate?.findings ?? []).filter((f) => f.severity === 'atencao').map((f) => ({ ...f, title: `${p.name}: ${f.title}` }))),
  ];

  return (
    <>
      <PageHead title="Preparar LIVE" sub="Checklist, roteiro e alertas preventivos para transmissões de venda." />
      <div className="grid2">
        <div className="stack">
          <Card title={`Checklist · ${pct}%`} actions={<button type="button" className="btn ghost sm" onClick={() => setDone(new Set())}>Reiniciar</button>}>
            <div className="progress"><span style={{ width: pct + '%' }} /></div>
            {groups.map((g) => (
              <fieldset key={g} className="qgroup">
                <legend>{g}</legend>
                {LIVE_CHECKLIST.filter((i) => i.group === g).map((i) => (
                  <div key={i.id} className="chk-item">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={done.has(i.id)}
                        onChange={(e) => {
                          const s = new Set(done);
                          if (e.target.checked) s.add(i.id);
                          else s.delete(i.id);
                          setDone(s);
                        }}
                      />{' '}
                      {i.text}
                    </label>
                    <button type="button" className="link sm" onClick={() => setOpen(open === i.id ? null : i.id)}>
                      {i.policyIds.join(', ')}
                    </button>
                    {open === i.id && i.policyIds.map((id) => <PolicyRef key={id} id={id} />)}
                  </div>
                ))}
              </fieldset>
            ))}
          </Card>
        </div>
        <div className="stack">
          <Card title="Produtos da LIVE">
            {ok.map((p) => (
              <label key={p.id} className="check">
                <input
                  type="checkbox"
                  checked={sel.includes(p.id)}
                  onChange={(e) => {
                    setEdited(null);
                    setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id));
                  }}
                />{' '}
                {p.name}
              </label>
            ))}
            {!ok.length && <p className="muted">Nenhum produto liberado. Cadastre e analise produtos antes.</p>}
            {blocked.length > 0 && <p className="blocked sm">Fora da LIVE (bloqueados ou sem ciência): {blocked.map((p) => p.name).join(', ')}</p>}
            <Field label={`Duração: ${minutes} min`}>
              <input type="range" min={10} max={180} step={5} value={minutes} onChange={(e) => { setEdited(null); setMinutes(+e.target.value); }} />
            </Field>
          </Card>
          {script && (
            <Card title="Roteiro da LIVE" actions={<CopyButton text={script} />}>
              <textarea className="mono" rows={20} value={script} onChange={(e) => setEdited(e.target.value)} />
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setDraft({ productId: chosen[0]?.id, title: `LIVE — ${chosen.map((p) => p.name).join(', ')}`, input: { roteiro: script }, context: { contentType: 'live' } });
                  go('analisar');
                }}
              >
                Analisar roteiro da LIVE
              </button>
              {gen && <pre className="rules">{gen.rules}</pre>}
            </Card>
          )}
          <Card title="Alertas preventivos">
            {alerts.map((f) => <FindingCard key={f.id} f={f} />)}
            {preventive.map((f) => <FindingCard key={f.id} f={f} />)}
            {!alerts.length && !preventive.length && <p className="muted">Sem alertas para os produtos e o roteiro atuais.</p>}
            <p className="hint">
              Pontos de violação: segundo fonte não oficial enviada, 24 pontos revogam o acesso ao Shop e cada ponto zera após 90 dias (PV-PEN-1, pendente de verificação).
              Antes de entrar ao vivo, confira o Status da Conta no Centro de Criadores (LV-1).
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
