import { openDB, type IDBPDatabase } from 'idb';
import { SEED_POLICIES } from './data/policies';
import { SEED_SOURCES } from './data/sources';
import { api, isCloud } from './mode';
import type { Analysis, Policy, PolicySource, Product, Settings } from './types';

// Armazenamento persistente no navegador (IndexedDB).
// Os dados ficam no computador da usuária. Use Exportar backup para guardar cópia.

const DB_NAME = 'vitrine-blindada-ia';
const SEED_VERSION = 1;

type Stores = 'products' | 'policies' | 'sources' | 'analyses' | 'meta' | 'docs';

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp)
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        for (const s of ['products', 'policies', 'sources', 'analyses', 'docs'] as const) d.createObjectStore(s, { keyPath: 'id' });
        d.createObjectStore('meta');
      },
    });
  return dbp;
}

// Em modo nuvem, as mesmas funções gravam no servidor (Cloudflare D1).
export async function all<T>(store: Exclude<Stores, 'meta'>): Promise<T[]> {
  if (isCloud()) return api<T[]>(`/api/data/${store}`);
  return (await db()).getAll(store) as Promise<T[]>;
}
export async function put<T extends { id: string }>(store: Exclude<Stores, 'meta'>, v: T) {
  if (isCloud()) return void (await api(`/api/data/${store}/${encodeURIComponent(v.id)}`, { method: 'PUT', body: JSON.stringify(v) }));
  await (await db()).put(store, v);
}
export async function del(store: Exclude<Stores, 'meta'>, id: string) {
  if (isCloud()) return void (await api(`/api/data/${store}/${encodeURIComponent(id)}`, { method: 'DELETE' }));
  await (await db()).delete(store, id);
}
export async function getMeta<T>(key: string): Promise<T | undefined> {
  if (isCloud()) return ((await api<T | null>(`/api/meta/${key}`)) ?? undefined) as T | undefined;
  return (await db()).get('meta', key) as Promise<T | undefined>;
}
export async function setMeta(key: string, v: unknown) {
  if (isCloud()) return void (await api(`/api/meta/${key}`, { method: 'PUT', body: JSON.stringify(v) }));
  await (await db()).put('meta', v, key);
}

/** Carrega a base inicial na primeira execução. Não sobrescreve edições da usuária. */
export async function ensureSeed() {
  if (isCloud()) return; // o servidor carrega a base inicial
  const seeded = await getMeta<number>('seedVersion');
  if (seeded && seeded >= SEED_VERSION) return;
  const d = await db();
  const tx = d.transaction(['policies', 'sources', 'meta'], 'readwrite');
  for (const s of SEED_SOURCES) if (!(await tx.objectStore('sources').get(s.id))) await tx.objectStore('sources').put(s);
  for (const p of SEED_POLICIES) if (!(await tx.objectStore('policies').get(p.id))) await tx.objectStore('policies').put(p);
  await tx.objectStore('meta').put(SEED_VERSION, 'seedVersion');
  if (!(await tx.objectStore('meta').get('kbVersion'))) await tx.objectStore('meta').put(1, 'kbVersion');
  await tx.done;
}

export async function bumpKb(): Promise<number> {
  if (isCloud()) return (await getMeta<number>('kbVersion')) ?? 1; // o servidor sobe a versão
  const v = ((await getMeta<number>('kbVersion')) ?? 1) + 1;
  await setMeta('kbVersion', v);
  await setMeta('kbUpdatedAt', new Date().toISOString());
  return v;
}

export interface StoredDoc {
  id: string;
  sourceId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  text?: string;
  addedAt: string;
}

export interface Backup {
  app: 'vitrine-blindada-ia';
  exportedAt: string;
  products: Product[];
  policies: Policy[];
  sources: PolicySource[];
  analyses: Analysis[];
  docs: StoredDoc[];
  kbVersion: number;
}

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'vitrine-blindada-ia',
    exportedAt: new Date().toISOString(),
    products: await all('products'),
    policies: await all('policies'),
    sources: await all('sources'),
    analyses: await all('analyses'),
    docs: await all('docs'),
    kbVersion: (await getMeta<number>('kbVersion')) ?? 1,
  };
}

export async function importBackup(b: Backup) {
  if (b.app !== 'vitrine-blindada-ia' && (b.app as string) !== 'tiktok-shop-safe-ai') throw new Error('Arquivo não é um backup da Vitrine Blindada IA.');
  if (isCloud()) {
    for (const p of b.products ?? []) await put('products', p);
    for (const p of b.analyses ?? []) await put('analyses', p);
    for (const p of b.docs ?? []) await put('docs', p);
    return; // a base de políticas na nuvem é gerida pela administradora
  }
  const d = await db();
  const tx = d.transaction(['products', 'policies', 'sources', 'analyses', 'docs', 'meta'], 'readwrite');
  for (const p of b.products ?? []) await tx.objectStore('products').put(p);
  for (const p of b.policies ?? []) await tx.objectStore('policies').put(p);
  for (const p of b.sources ?? []) await tx.objectStore('sources').put(p);
  for (const p of b.analyses ?? []) await tx.objectStore('analyses').put(p);
  for (const p of b.docs ?? []) await tx.objectStore('docs').put(p);
  await tx.objectStore('meta').put(Math.max(b.kbVersion ?? 1, ((await tx.objectStore('meta').get('kbVersion')) as number) ?? 1), 'kbVersion');
  await tx.done;
}

const SETTINGS_KEY = 'settings';
export async function getSettings(): Promise<Settings> {
  return (await getMeta<Settings>(SETTINGS_KEY)) ?? { model: 'claude-opus-5-5', effort: 'medium' };
}
export async function saveSettings(s: Settings) {
  await setMeta(SETTINGS_KEY, s);
}

export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
