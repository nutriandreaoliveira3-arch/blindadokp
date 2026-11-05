// Normaliza texto (minúsculas, sem acentos) mantendo o mapa de posições
// para que o trecho original possa ser destacado.

export interface Normalized {
  text: string;
  map: number[]; // map[iNormalizado] = índice no texto original
}

const MARKS = /[̀-ͯ]/g;

export function normalize(original: string): Normalized {
  let text = '';
  const map: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const n = original[i].normalize('NFD').replace(MARKS, '').toLowerCase();
    for (let k = 0; k < n.length; k++) {
      text += n[k];
      map.push(i);
    }
  }
  return { text, map };
}

export function plain(s: string): string {
  return normalize(s).text;
}

/** Limites da frase que contém [start,end) no texto original. */
export function sentenceBounds(original: string, start: number, end: number): [number, number] {
  const stop = /[.!?\n]/;
  let s = start;
  while (s > 0 && !stop.test(original[s - 1])) s--;
  let e = end;
  while (e < original.length && !stop.test(original[e])) e++;
  if (e < original.length) e++; // inclui a pontuação
  while (s < e && /\s/.test(original[s])) s++;
  return [s, e];
}
