import { useEffect, useMemo, useState } from 'react';
import { Card, Choice, Field, PageHead, PolicyRef, fmtDate } from '../components/ui';
import { all, del, put, uid } from '../db';
import { useStore } from '../store';
import type { Violation } from '../types';

const APPEAL: Record<Violation['appeal'], string> = {
  nao_recorrido: 'Sem recurso',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  nao_aprovado: 'Não aprovado',
};

const blank = (): Violation => ({
  id: uid('vio'),
  date: new Date().toISOString().slice(0, 10),
  points: 0,
  reason: '',
  contentRef: '',
  penalties: '',
  appeal: 'nao_recorrido',
  policyIds: [],
  lesson: '',
  createdAt: new Date().toISOString(),
});

const daysAgo = (d: string) => (Date.now() - new Date(d + 'T12:00:00').getTime()) / 864e5;

export default function Violations() {
  const { policies, toast } = useStore();
  const [list, setList] = useState<Violation[]>([]);
  const [edit, setEdit] = useState<Violation | null>(null);
  const load = async () => setList((await all<Violation>('violations')).sort((a, b) => b.date.localeCompare(a.date)));
  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const sum = (n: number) => list.filter((v) => daysAgo(v.date) <= n).reduce((a, v) => a + v.points, 0);
    const byRule = new Map<string, number>();
    for (const v of list) for (const id of v.policyIds.length ? v.policyIds : ['sem regra']) byRule.set(id, (byRule.get(id) ?? 0) + 1);
    return {
      d30: sum(30),
      d90: sum(90),
      total: list.reduce((a, v) => a + v.points, 0),
      noReason: list.filter((v) => !v.reason.trim()).length,
      byRule: [...byRule.entries()].sort((a, b) => b[1] - a[1]),
      appealsLost: list.filter((v) => v.appeal === 'nao_aprovado').length,
    };
  }, [list]);

  const save = async () => {
    if (!edit) return;
    await put('violations', edit);
    toast('Violação registrada.');
    setEdit(null);
    load();
  };

  return (
    <>
      <PageHead
        title="Minhas violações"
        sub="Registre cada violação recebida. Isso mostra os padrões e calibra as regras do app."
        actions={
          <button type="button" className="btn primary" onClick={() => setEdit(blank())}>
            + Registrar violação
          </button>
        }
      />
      <div className="stats">
        <div className="stat bad"><b>{stats.d30}</b><span>pontos em 30 dias</span></div>
        <div className="stat bad"><b>{stats.d90}</b><span>pontos em 90 dias</span></div>
        <div className="stat"><b>{list.length}</b><span>violações registradas</span></div>
        <div className="stat warn"><b>{stats.noReason}</b><span>sem motivo anotado</span></div>
        <div className="stat"><b>{stats.appealsLost}</b><span>recursos negados</span></div>
      </div>
      <p className="hint">
        O TikTok desconta os pontos do "Índice de qualidade do criador". A regra de quantos pontos levam ao bloqueio e quando eles expiram ainda não foi
        confirmada em documento oficial (PV-PEN-1).
      </p>

      {edit && (
        <Card title="Violação">
          <div className="form">
            <div className="grid2">
              <Field label="Data"><input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
              <Field label="Pontos descontados"><input type="number" min={0} value={edit.points} onChange={(e) => setEdit({ ...edit, points: +e.target.value })} /></Field>
            </div>
            <Field label="Motivo (copie o texto do TikTok)" hint='Abra a violação no Centro do Criador e copie o campo "Motivo".'>
              <textarea rows={4} value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} />
            </Field>
            <Field label="Conteúdo (vídeo, LIVE ou produto)"><input value={edit.contentRef} onChange={(e) => setEdit({ ...edit, contentRef: e.target.value })} /></Field>
            <Field label="Penalidades"><input value={edit.penalties} onChange={(e) => setEdit({ ...edit, penalties: e.target.value })} placeholder="Redução de visibilidade, remoção dos produtos" /></Field>
            <Field label="Recurso">
              <Choice value={edit.appeal} onChange={(v) => setEdit({ ...edit, appeal: v })} options={Object.entries(APPEAL) as [Violation['appeal'], string][]} />
            </Field>
            <Field label="Regras relacionadas">
              <select
                multiple
                size={6}
                value={edit.policyIds}
                onChange={(e) => setEdit({ ...edit, policyIds: [...e.target.selectedOptions].map((o) => o.value) })}
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} — {p.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Lição (o que fazer diferente)"><textarea rows={2} value={edit.lesson} onChange={(e) => setEdit({ ...edit, lesson: e.target.value })} /></Field>
            <div className="row">
              <button type="button" className="btn primary" onClick={save}>Salvar</button>
              <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid2">
        <Card title="Histórico">
          {list.map((v) => (
            <article key={v.id} className={`finding ${v.points >= 8 ? 'sev-alto' : ''}`}>
              <div className="finding-head">
                <strong>-{v.points} pontos</strong>
                <span className="muted sm">{fmtDate(v.date)}</span>
                <span className="tag">{APPEAL[v.appeal]}</span>
                {v.contentRef && <span className="tag">{v.contentRef}</span>}
              </div>
              {v.reason ? <p>{v.reason}</p> : <p className="blocked sm">Motivo não anotado. Abra a violação no TikTok e copie o motivo.</p>}
              {v.penalties && <p className="muted sm">{v.penalties}</p>}
              {v.lesson && <p className="sugg"><b>Lição:</b> {v.lesson}</p>}
              {v.policyIds.map((id) => <PolicyRef key={id} id={id} />)}
              <div className="row">
                <button type="button" className="btn ghost sm" onClick={() => setEdit(structuredClone(v))}>Editar</button>
                <button type="button" className="btn ghost sm danger" onClick={async () => { if (confirm('Excluir registro?')) { await del('violations', v.id); load(); } }}>Excluir</button>
              </div>
            </article>
          ))}
          {!list.length && <p className="muted">Nenhuma violação registrada. Você também pode importar uma lista em Configurações → Importar backup.</p>}
        </Card>
        <Card title="Padrões">
          {stats.byRule.map(([id, n]) => (
            <div key={id} className="list-row">
              <span className="grow">{id === 'sem regra' ? 'Sem regra identificada' : <PolicyRef id={id} />}</span>
              <b>{n}×</b>
            </div>
          ))}
          {!stats.byRule.length && <p className="muted">Os padrões aparecem depois dos primeiros registros.</p>}
        </Card>
      </div>
    </>
  );
}
