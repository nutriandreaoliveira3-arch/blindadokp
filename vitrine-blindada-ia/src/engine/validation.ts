import type { Analysis, ValidationRecord } from '../types';

// Métricas de validação: o app acertou? Pode ir para a mensalidade?

export interface Metric {
  id: string;
  label: string;
  value: number | null; // null = sem dados suficientes
  display: string;
  target: string;
  ok: boolean | null;
  detail: string;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);

export const TARGETS = { minVideos: 50, recall: 90, greenViolated: 5, agreement: 90 };

export function computeMetrics(records: ValidationRecord[], analyses: Analysis[]): Metric[] {
  const done = records.filter((r) => r.outcome !== 'pendente');
  const violations = done.filter((r) => r.outcome === 'violacao');
  const caught = violations.filter((r) => r.appLevel === 'alto' || r.appLevel === 'atencao');
  const green = done.filter((r) => r.appLevel === 'baixo');
  const greenViolated = green.filter((r) => r.outcome === 'violacao');
  const compared = analyses.filter((a) => a.compare?.ai && a.compare?.manual);
  const agree = compared.filter((a) => a.compare!.ai === a.compare!.manual);

  const recall = pct(caught.length, violations.length);
  const gv = pct(greenViolated.length, green.length);
  const ag = pct(agree.length, compared.length);

  return [
    {
      id: 'volume',
      label: 'Vídeos testados',
      value: done.length,
      display: `${done.length} de ${TARGETS.minVideos}`,
      target: `${TARGETS.minVideos} ou mais`,
      ok: done.length >= TARGETS.minVideos,
      detail: `${records.length - done.length} aguardando resultado.`,
    },
    {
      id: 'recall',
      label: 'Violações que o app tinha apontado',
      value: recall,
      display: recall == null ? '—' : `${recall}%`,
      target: `${TARGETS.recall}% ou mais`,
      ok: recall == null ? null : recall >= TARGETS.recall,
      detail: violations.length
        ? `${caught.length} de ${violations.length} violações tinham 🟡 ou 🔴 antes de publicar.`
        : 'Nenhuma violação registrada ainda.',
    },
    {
      id: 'green',
      label: 'Vídeos 🟢 que levaram violação',
      value: gv,
      display: gv == null ? '—' : `${gv}%`,
      target: `${TARGETS.greenViolated}% ou menos`,
      ok: gv == null ? null : gv <= TARGETS.greenViolated,
      detail: green.length ? `${greenViolated.length} de ${green.length} vídeos com 🟢.` : 'Nenhum vídeo 🟢 com resultado ainda.',
    },
    {
      id: 'agreement',
      label: 'IA concorda com a conferência manual',
      value: ag,
      display: ag == null ? '—' : `${ag}%`,
      target: `${TARGETS.agreement}% ou mais`,
      ok: ag == null ? null : ag >= TARGETS.agreement,
      detail: compared.length
        ? `${agree.length} de ${compared.length} conferências com IA e manual completas.`
        : 'Faça conferências com IA E marque todos os itens manualmente para medir.',
    },
  ];
}

export function readyToLaunch(m: Metric[]) {
  return m.every((x) => x.ok === true);
}

export function toCsv(records: ValidationRecord[]) {
  const head = ['publicado_em', 'produto', 'nivel_app', 'resultado', 'motivo', 'pontos', 'observacoes'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [head.join(';'), ...records.map((r) => [r.publishedAt, r.productName, r.appLevel, r.outcome, r.violationReason, r.points, r.notes].map(esc).join(';'))].join('\n');
}
