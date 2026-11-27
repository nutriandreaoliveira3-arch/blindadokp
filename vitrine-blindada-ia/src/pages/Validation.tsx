import { useEffect, useMemo, useState } from 'react';
import { Card, Choice, Field, LevelBadge, PageHead, fmtDate } from '../components/ui';
import { all, del, put, uid } from '../db';
import { LEVEL_INFO } from '../engine/analyze';
import { computeMetrics, readyToLaunch, toCsv } from '../engine/validation';
import { download } from '../report';
import { useStore } from '../store';
import type { ValidationRecord } from '../types';

const OUT: Record<ValidationRecord['outcome'], string> = { pendente: '⏳ Aguardando', passou: '✅ Passou', violacao: '⛔ Violação' };

const blank = (): ValidationRecord => ({
  id: uid('val'),
  publishedAt: new Date().toISOString().slice(0, 10),
  productName: '',
  appLevel: 'sem_analise',
  outcome: 'pendente',
  createdAt: new Date().toISOString(),
});

export default function Validation() {
  const { products, analyses, toast } = useStore();
  const [list, setList] = useState<ValidationRecord[]>([]);
  const [edit, setEdit] = useState<ValidationRecord | null>(null);
  const load = async () => setList((await all<ValidationRecord>('validations')).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => computeMetrics(list, analyses), [list, analyses]);
  const ready = readyToLaunch(metrics);
  const candidates = analyses.filter((a) => !edit?.productId || a.productId === edit.productId);
  const due = list.filter((r) => r.outcome === 'pendente' && (Date.now() - new Date(r.publishedAt + 'T12:00:00').getTime()) / 36e5 >= 48);

  const save = async () => {
    if (!edit) return;
    await put('validations', edit);
    setEdit(null);
    toast('Registro salvo.');
    load();
  };

  return (
    <>
      <PageHead
        title="Validação"
        sub="Teste até dezembro: cada vídeo publicado entra aqui, com o resultado real no TikTok. Os números dizem se o app está pronto para virar mensalidade."
        actions={
          <>
            <button type="button" className="btn" onClick={() => download('validacao.csv', toCsv(list), 'text/csv')}>Exportar planilha</button>
            <button type="button" className="btn primary" onClick={() => setEdit(blank())}>+ Registrar vídeo publicado</button>
          </>
        }
      />

      <div className={`level-panel ${ready ? 'lvl-baixo' : 'lvl-atencao'}`}>
        <div className="level-emoji">{ready ? '🟢' : '🧪'}</div>
        <div>
          <strong>{ready ? 'Metas batidas: pronto para avaliar o lançamento' : 'Em teste'}</strong>
          <p>{metrics.filter((m) => m.ok).length} de {metrics.length} metas batidas. Mesmo com todas batidas, o app não garante aprovação do TikTok: os números mostram a confiança medida na sua conta.</p>
        </div>
      </div>

      <div className="stats">
        {metrics.map((m) => (
          <div key={m.id} className={`stat ${m.ok === true ? '' : m.ok === false ? 'bad' : 'warn'}`}>
            <b>{m.display}</b>
            <span>{m.label}</span>
            <span className="sm">Meta: {m.target} {m.ok === true ? '✅' : m.ok === false ? '❌' : '⏳'}</span>
            <span className="muted sm">{m.detail}</span>
          </div>
        ))}
      </div>

      {due.length > 0 && (
        <p className="notice">⏳ {due.length} vídeo(s) publicados há mais de 48 horas estão sem resultado. Abra o Centro do Criador e registre se passaram.</p>
      )}

      {edit && (
        <Card title="Vídeo publicado">
          <div className="form">
            <div className="grid2">
              <Field label="Data de publicação"><input type="date" value={edit.publishedAt} onChange={(e) => setEdit({ ...edit, publishedAt: e.target.value })} /></Field>
              <Field label="Produto">
                <select
                  value={edit.productId ?? ''}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setEdit({ ...edit, productId: p?.id, productName: p?.name ?? edit.productName, analysisId: undefined, appLevel: 'sem_analise' });
                  }}
                >
                  <option value="">Selecione…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Análise feita antes de publicar" hint="O nível que o app deu antes de publicar é o que conta para medir o acerto.">
              <select
                value={edit.analysisId ?? ''}
                onChange={(e) => {
                  const a = analyses.find((x) => x.id === e.target.value);
                  setEdit({ ...edit, analysisId: a?.id, appLevel: a?.level ?? 'sem_analise', productName: edit.productName || a?.productName || a?.title || '' });
                }}
              >
                <option value="">Nenhuma (publicado sem análise)</option>
                {candidates.map((a) => (
                  <option key={a.id} value={a.id}>{LEVEL_INFO[a.level].emoji} {a.title} — {fmtDate(a.createdAt)}</option>
                ))}
              </select>
            </Field>
            {!edit.productId && (
              <Field label="Nome do produto ou do vídeo" hint="Use se o produto não estiver cadastrado.">
                <input value={edit.productName} onChange={(e) => setEdit({ ...edit, productName: e.target.value })} />
              </Field>
            )}
            <Field label="Resultado no TikTok">
              <Choice value={edit.outcome} onChange={(v) => setEdit({ ...edit, outcome: v })} options={Object.entries(OUT) as [ValidationRecord['outcome'], string][]} />
            </Field>
            {edit.outcome === 'violacao' && (
              <div className="grid2">
                <Field label="Motivo (copie do TikTok)"><input value={edit.violationReason ?? ''} onChange={(e) => setEdit({ ...edit, violationReason: e.target.value })} /></Field>
                <Field label="Pontos"><input type="number" min={0} value={edit.points ?? 0} onChange={(e) => setEdit({ ...edit, points: +e.target.value })} /></Field>
              </div>
            )}
            <Field label="Observações"><input value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Ex.: feito com Flow, sem amostra, narração com minha voz" /></Field>
            <div className="row">
              <button type="button" className="btn primary" disabled={!edit.productName && !edit.productId} onClick={save}>Salvar</button>
              <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
            {edit.outcome === 'violacao' && <p className="hint">Registre também em "Minhas violações" para manter o histórico de pontos.</p>}
          </div>
        </Card>
      )}

      <Card title={`Vídeos (${list.length})`}>
        <table className="table">
          <thead>
            <tr><th>Publicado</th><th>Produto</th><th>App antes</th><th>Resultado</th><th>Acerto</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const hit =
                r.outcome === 'pendente' || r.appLevel === 'sem_analise'
                  ? '—'
                  : r.outcome === 'violacao'
                    ? r.appLevel === 'baixo' ? '❌ App deixou passar' : '✅ App tinha avisado'
                    : r.appLevel === 'baixo' ? '✅' : '🟡 Passou com alerta';
              return (
                <tr key={r.id}>
                  <td>{fmtDate(r.publishedAt)}</td>
                  <td>{r.productName}{r.violationReason && <div className="muted sm">{r.violationReason}</div>}</td>
                  <td>{r.appLevel === 'sem_analise' ? 'Sem análise' : <LevelBadge level={r.appLevel} />}</td>
                  <td>{OUT[r.outcome]}{r.points ? ` (-${r.points})` : ''}</td>
                  <td>{hit}</td>
                  <td className="row">
                    <button type="button" className="btn ghost sm" onClick={() => setEdit(structuredClone(r))}>Editar</button>
                    <button type="button" className="btn ghost sm danger" onClick={async () => { if (confirm('Excluir?')) { await del('validations', r.id); load(); } }}>Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <p className="muted">Nenhum vídeo registrado. A cada vídeo publicado, clique em "+ Registrar vídeo publicado".</p>}
      </Card>
      <p className="hint">
        "Passou com alerta" (🟡) não conta como erro do app: o alerta pode ter sido cuidado antes. Vídeos publicados sem análise não entram no cálculo de acerto.
      </p>
    </>
  );
}
