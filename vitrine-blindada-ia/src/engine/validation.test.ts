import { describe, expect, it } from 'vitest';
import type { Analysis, ValidationRecord } from '../types';
import { computeMetrics, readyToLaunch } from './validation';

const r = (appLevel: ValidationRecord['appLevel'], outcome: ValidationRecord['outcome']): ValidationRecord => ({
  id: Math.random().toString(), publishedAt: '2026-11-10', productName: 'x', appLevel, outcome, createdAt: '',
});

describe('métricas de validação', () => {
  it('calcula acerto, 🟢 violados e concordância', () => {
    const recs = [
      ...Array.from({ length: 45 }, () => r('baixo', 'passou')),
      r('baixo', 'violacao'),
      ...Array.from({ length: 9 }, () => r('alto', 'violacao')),
      r('atencao', 'pendente'),
    ];
    const an = [
      ...Array.from({ length: 9 }, () => ({ compare: { ai: 'divergente', manual: 'divergente' } })),
      { compare: { ai: 'compativel', manual: 'divergente' } },
    ] as unknown as Analysis[];
    const m = Object.fromEntries(computeMetrics(recs, an).map((x) => [x.id, x]));
    expect(m.volume.value).toBe(55);
    expect(m.recall.value).toBe(90); // 9 de 10 violações tinham alerta
    expect(m.green.value).toBe(2.2); // 1 de 46 vídeos 🟢
    expect(m.agreement.value).toBe(90);
    expect(readyToLaunch(Object.values(m))).toBe(true);
  });
  it('sem dados não aprova', () => {
    expect(readyToLaunch(computeMetrics([], []))).toBe(false);
  });
});
