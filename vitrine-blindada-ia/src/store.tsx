import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as db from './db';
import { detectMode, getAccount, type Account } from './mode';
import type { Analysis, ContentInput, Policy, PolicySource, Product, ProductionContext, Settings } from './types';

export type Page =
  | 'painel'
  | 'produto'
  | 'produtos'
  | 'imagem'
  | 'video'
  | 'roteiro'
  | 'legenda'
  | 'analisar'
  | 'corrigir'
  | 'live'
  | 'politicas'
  | 'historico'
  | 'config'
  | 'admin';

export interface Draft {
  productId?: string;
  title?: string;
  input?: Partial<ContentInput>;
  context?: Partial<ProductionContext>;
}

interface Store {
  ready: boolean;
  account: Account;
  refreshAccount: () => Promise<void>;
  aiReady: boolean;
  products: Product[];
  policies: Policy[];
  sources: PolicySource[];
  analyses: Analysis[];
  kbVersion: number;
  settings: Settings;
  page: Page;
  param?: string;
  draft: Draft | null;
  go: (p: Page, param?: string) => void;
  setDraft: (d: Draft | null) => void;
  reload: () => Promise<void>;
  saveProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  savePolicy: (p: Policy) => Promise<void>;
  saveSource: (s: PolicySource) => Promise<void>;
  saveAnalysis: (a: Analysis) => Promise<void>;
  deleteAnalysis: (id: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  toast: (msg: string) => void;
  toastMsg: string;
}

const Ctx = createContext<Store | null>(null);

function readHash(): { page: Page; param?: string } {
  const [page, param] = location.hash.replace(/^#\/?/, '').split('/');
  return { page: (page as Page) || 'painel', param: param ? decodeURIComponent(param) : undefined };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account>(getAccount());
  const [products, setProducts] = useState<Product[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [sources, setSources] = useState<PolicySource[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [kbVersion, setKb] = useState(1);
  const [settings, setSettings] = useState<Settings>({ model: 'claude-opus-5-5', effort: 'medium' });
  const [route, setRoute] = useState(readHash());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toastMsg, setToast] = useState('');

  const reload = useCallback(async () => {
    const [pr, po, so, an, kb, st] = await Promise.all([
      db.all<Product>('products'),
      db.all<Policy>('policies'),
      db.all<PolicySource>('sources'),
      db.all<Analysis>('analyses'),
      db.getMeta<number>('kbVersion'),
      db.getSettings(),
    ]);
    setProducts(pr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setPolicies(po.sort((a, b) => a.id.localeCompare(b.id, 'pt', { numeric: true })));
    setSources(so.sort((a, b) => a.id.localeCompare(b.id)));
    setAnalyses(an.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setKb(kb ?? 1);
    setSettings(st);
  }, []);

  useEffect(() => {
    (async () => {
      const acc = await detectMode();
      setAccount(acc);
      if (acc.loggedIn) {
        await db.ensureSeed();
        await reload();
      }
      setReady(true);
    })();
    const onHash = () => setRoute(readHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [reload]);

  const toast = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  }, []);

  const refreshAccount = useCallback(async () => {
    const acc = await detectMode();
    setAccount(acc);
    if (acc.loggedIn) await reload();
  }, [reload]);

  const value: Store = {
    ready,
    account,
    refreshAccount,
    aiReady: account.mode === 'nuvem' ? !!account.ai : !!settings.apiKey,
    products,
    policies,
    sources,
    analyses,
    kbVersion,
    settings,
    page: route.page,
    param: route.param,
    draft,
    setDraft,
    go: (p, param) => {
      location.hash = `#/${p}${param ? '/' + encodeURIComponent(param) : ''}`;
      scrollTo(0, 0);
    },
    reload,
    saveProduct: async (p) => {
      await db.put('products', p);
      await reload();
    },
    deleteProduct: async (id) => {
      await db.del('products', id);
      await reload();
    },
    savePolicy: async (p) => {
      await db.put('policies', p);
      await db.bumpKb();
      await reload();
    },
    saveSource: async (s) => {
      await db.put('sources', s);
      await db.bumpKb();
      await reload();
    },
    saveAnalysis: async (a) => {
      await db.put('analyses', a);
      await reload();
    },
    deleteAnalysis: async (id) => {
      await db.del('analyses', id);
      await reload();
    },
    saveSettings: async (s) => {
      await db.saveSettings(s);
      setSettings(s);
    },
    toast,
    toastMsg,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
}
