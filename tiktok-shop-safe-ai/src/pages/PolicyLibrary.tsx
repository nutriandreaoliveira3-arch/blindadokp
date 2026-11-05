import { useEffect, useMemo, useRef, useState } from 'react';
import { aiExtractPolicies } from '../ai';
import { Card, Choice, Field, PageHead, fmtDate } from '../components/ui';
import { CATEGORIES } from '../data/policies';
import * as db from '../db';
import { useStore } from '../store';
import type { Applies, Policy, PolicySource, PolicyStatus, RuleType } from '../types';

const TYPE: Record<RuleType, string> = {
  proibicao: 'Proibição',
  restricao: 'Restrição',
  exigencia: 'Exigência',
  recomendacao: 'Recomendação',
  procedimento: 'Procedimento',
};
const STATUS: Record<PolicyStatus, string> = {
  ativa: 'Ativa',
  pendente_verificacao: 'Pendente de verificação',
  substituida: 'Substituída',
  revogada: 'Revogada',
};
const APPLIES: [Applies, string][] = [
  ['video', 'Vídeo'], ['live', 'LIVE'], ['imagem', 'Imagem'], ['legenda', 'Legenda'], ['hashtag', 'Hashtag'],
  ['afiliado', 'Afiliado'], ['ia', 'IA'], ['anuncio', 'Anúncio'], ['produto', 'Produto'],
];

export default function PolicyLibrary() {
  const { param, policies, sources, kbVersion, go } = useStore();
  const [tab, setTab] = useState<'regras' | 'fontes' | 'documento'>('regras');
  const [f, setF] = useState({ q: '', cat: '', app: '', type: '', status: '', scope: '' });
  const selected = policies.find((p) => p.id === param);

  const list = useMemo(
    () =>
      policies.filter(
        (p) =>
          (!f.q || (p.id + p.title + p.excerpt).toLowerCase().includes(f.q.toLowerCase())) &&
          (!f.cat || p.category === f.cat) &&
          (!f.app || p.appliesTo.includes(f.app as Applies)) &&
          (!f.type || p.type === f.type) &&
          (!f.status || p.status === f.status) &&
          (!f.scope || p.scope === f.scope),
      ),
    [policies, f],
  );
  const byCat = CATEGORIES.map((c) => [c, list.filter((p) => p.category === c)] as const).filter(([, l]) => l.length);
  const other = list.filter((p) => !CATEGORIES.includes(p.category));

  if (selected) return <PolicyEditor policy={selected} onClose={() => go('politicas')} />;
  if (param === 'nova') return <PolicyEditor onClose={() => go('politicas')} />;

  return (
    <>
      <PageHead
        title="Biblioteca de políticas"
        sub={`Base v${kbVersion} · ${policies.length} regras · ${sources.length} documentos. Cada regra traz o trecho literal, a fonte, a data e a versão.`}
        actions={
          <button type="button" className="btn primary" onClick={() => go('politicas', 'nova')}>
            + Nova regra
          </button>
        }
      />
      <Choice value={tab} onChange={setTab} options={[['regras', 'Regras'], ['fontes', 'Documentos-fonte'], ['documento', 'Enviar novo documento']]} />

      {tab === 'regras' && (
        <>
          <div className="filters">
            <input placeholder="Buscar…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={f.app} onChange={(e) => setF({ ...f, app: e.target.value })}>
              <option value="">Qualquer aplicação</option>
              {APPLIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="">Qualquer tipo</option>
              {Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="">Qualquer status</option>
              {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
              <option value="">Qualquer escopo</option>
              <option value="tiktok_shop_br">TikTok Shop Brasil</option>
              <option value="tiktok_geral">TikTok (geral)</option>
            </select>
          </div>
          {[...byCat, ...(other.length ? ([['Outras', other]] as const) : [])].map(([c, l]) => (
            <Card key={c} title={`${c} (${l.length})`}>
              {l.map((p) => {
                const s = sources.find((x) => x.id === p.sourceId);
                return (
                  <button key={p.id} type="button" className="policy-row" onClick={() => go('politicas', p.id)}>
                    <code>{p.id}</code>
                    <span className="grow">
                      <b>{p.title}</b>
                      <span className="muted sm"> · {TYPE[p.type]} · {p.appliesTo.join(', ')}</span>
                      <span className="clamp">{p.excerpt}</span>
                    </span>
                    <span className="sm right">
                      <span className={`tag ${p.status === 'ativa' ? '' : 'warn'}`}>{STATUS[p.status]}</span>
                      <br />
                      <span className="muted">{s ? `${p.sourceId} · ${fmtDate(s.date)}` : p.sourceId}</span>
                    </span>
                  </button>
                );
              })}
            </Card>
          ))}
          {!list.length && <p className="muted">Nenhuma regra com esses filtros.</p>}
        </>
      )}
      {tab === 'fontes' && <Sources />}
      {tab === 'documento' && <NewDocument />}
    </>
  );
}

function Sources() {
  const { sources, policies } = useStore();
  const [docs, setDocs] = useState<db.StoredDoc[]>([]);
  useEffect(() => {
    db.all<db.StoredDoc>('docs').then(setDocs);
  }, [sources]);
  return (
    <Card title="Documentos-fonte">
      <table className="table">
        <thead>
          <tr><th>ID</th><th>Documento</th><th>Data</th><th>Status</th><th>Regras</th><th>Arquivo</th></tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const d = docs.filter((x) => x.sourceId === s.id);
            return (
              <tr key={s.id}>
                <td><code>{s.id}</code></td>
                <td>{s.title}{s.notes && <div className="muted sm">{s.notes}</div>}{s.url && <div className="sm"><a href={s.url} target="_blank" rel="noreferrer">{s.url}</a></div>}</td>
                <td>{fmtDate(s.date)}</td>
                <td><span className={`tag ${s.status === 'oficial' ? '' : 'warn'}`}>{s.status === 'oficial' ? 'Oficial' : 'Não oficial'}</span></td>
                <td>{policies.filter((p) => p.sourceId === s.id).length}</td>
                <td className="sm">
                  {s.file && <div className="muted">{s.file}</div>}
                  {d.map((x) => <a key={x.id} href={x.dataUrl} download={x.name}>{x.name}</a>)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

async function fileText(file: File): Promise<string | undefined> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md')) return file.text();
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }
  return undefined; // PDF e imagens: texto precisa ser colado manualmente
}

const toDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

type Candidate = Awaited<ReturnType<typeof aiExtractPolicies>>[number] & { accepted?: boolean };

function NewDocument() {
  const { sources, settings, saveSource, savePolicy, go, toast } = useStore();
  const [src, setSrc] = useState({ title: '', date: new Date().toISOString().slice(0, 10), status: 'oficial' as 'oficial' | 'nao_oficial', url: '', notes: '' });
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  const nextId = () => {
    const n = Math.max(0, ...sources.map((s) => +s.id.replace(/\D/g, '') || 0)) + 1;
    return 'S' + String(n).padStart(2, '0');
  };

  const save = async () => {
    const id = savedId ?? nextId();
    const s: PolicySource = { id, title: src.title, date: src.date, status: src.status, scope: 'tiktok_shop_br', url: src.url || undefined, notes: src.notes || undefined, file: file?.name, addedAt: new Date().toISOString(), version: 1 };
    await saveSource(s);
    if (file) await db.put('docs', { id: db.uid('doc'), sourceId: id, name: file.name, type: file.type, size: file.size, dataUrl: await toDataUrl(file), text, addedAt: new Date().toISOString() });
    setSavedId(id);
    toast(`Documento ${id} registrado. Agora cadastre as regras.`);
  };

  const newFromSelection = () => {
    const el = ta.current;
    const sel = el ? text.slice(el.selectionStart, el.selectionEnd).trim() : '';
    if (!sel) return setMsg('Selecione no texto o trecho literal da regra.');
    sessionStorage.setItem('policyDraft', JSON.stringify({ sourceId: savedId, excerpt: sel }));
    go('politicas', 'nova');
  };

  const extract = async () => {
    setBusy(true);
    setMsg('');
    try {
      setCands(await aiExtractPolicies(settings, text, CATEGORIES));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async (c: Candidate, i: number) => {
    const id = `${savedId}-${i + 1}`;
    await savePolicy({
      id, title: c.titulo, category: c.categoria, scope: 'tiktok_shop_br', appliesTo: c.aplica, type: c.tipo,
      status: c.literal ? 'ativa' : 'pendente_verificacao', sourceId: savedId!, section: c.secao, excerpt: c.trecho_literal,
      notes: c.literal ? 'Extraída com IA e confirmada pela usuária.' : 'Extraída com IA. O trecho NÃO foi encontrado literalmente no documento: conferir.',
      version: 1, updatedAt: new Date().toISOString(), createdBy: 'ia_revisada',
    });
    setCands(cands.map((x, k) => (k === i ? { ...x, accepted: true } : x)));
  };

  return (
    <div className="grid2 wide-left">
      <Card title="1. Registrar documento">
        <div className="form">
          <Field label="Título do documento *"><input value={src.title} onChange={(e) => setSrc({ ...src, title: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="Data publicada *"><input type="date" value={src.date} onChange={(e) => setSrc({ ...src, date: e.target.value })} /></Field>
            <Field label="Origem"><Choice value={src.status} onChange={(v) => setSrc({ ...src, status: v })} options={[['oficial', 'Oficial'], ['nao_oficial', 'Não oficial']]} /></Field>
          </div>
          <Field label="Link oficial"><input value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} placeholder="https://seller-br.tiktok.com/…" /></Field>
          <Field label="Arquivo (DOCX, TXT, MD, PDF, imagem)" hint="DOCX/TXT/MD: texto extraído automaticamente. PDF e imagem: o arquivo fica guardado, mas cole o texto abaixo.">
            <input
              type="file"
              accept=".docx,.txt,.md,.pdf,image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFile(f);
                if (!src.title) setSrc((o) => ({ ...o, title: f.name.replace(/\.[^.]+$/, '') }));
                const t = await fileText(f);
                if (t != null) setText(t);
                else setMsg('Texto de PDF/imagem não é extraído automaticamente nesta versão. Cole o texto no campo abaixo.');
              }}
            />
          </Field>
          <Field label="Observações"><input value={src.notes} onChange={(e) => setSrc({ ...src, notes: e.target.value })} /></Field>
          <button type="button" className="btn primary" disabled={!src.title || !src.date} onClick={save}>
            {savedId ? `Atualizar ${savedId}` : 'Registrar documento'}
          </button>
          {msg && <p className="notice">{msg}</p>}
        </div>
      </Card>
      <Card title="2. Texto e regras">
        <textarea ref={ta} className="mono" rows={16} value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto integral do documento" />
        <div className="row">
          <button type="button" className="btn" disabled={!savedId} onClick={newFromSelection}>Nova regra com o trecho selecionado</button>
          <button type="button" className="btn" disabled={!savedId || !text || busy} onClick={extract}>{busy ? 'Extraindo…' : 'Sugerir regras com IA'}</button>
        </div>
        {!savedId && <p className="hint">Registre o documento antes de cadastrar regras.</p>}
        {!settings.apiKey && <p className="hint">Sugestão com IA exige chave da API em Configurações. Sem ela, selecione o trecho e cadastre manualmente.</p>}
        {cands.map((c, i) => (
          <div key={i} className={`finding ${c.literal ? '' : 'sev-atencao'}`}>
            <b>{c.titulo}</b> <span className="tag">{c.categoria}</span> <span className="tag">{TYPE[c.tipo]}</span>
            {!c.literal && <span className="tag warn">trecho não encontrado no documento</span>}
            <blockquote>{c.trecho_literal}</blockquote>
            <button type="button" className="btn sm" disabled={c.accepted} onClick={() => accept(c, i)}>
              {c.accepted ? '✓ Adicionada' : 'Revisei — adicionar à base'}
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PolicyEditor({ policy, onClose }: { policy?: Policy; onClose: () => void }) {
  const { sources, policies, savePolicy, toast, go } = useStore();
  const init = (): Policy => {
    if (policy) return structuredClone(policy);
    const d = JSON.parse(sessionStorage.getItem('policyDraft') ?? '{}');
    sessionStorage.removeItem('policyDraft');
    return {
      id: '', title: '', category: CATEGORIES[0], scope: 'tiktok_shop_br', appliesTo: ['video'], type: 'proibicao', status: 'ativa',
      sourceId: d.sourceId ?? '', excerpt: d.excerpt ?? '', version: 1, updatedAt: new Date().toISOString(), createdBy: 'usuario',
    };
  };
  const [p, setP] = useState<Policy>(init);
  const [terms, setTerms] = useState((policy?.customTerms ?? []).join(', '));
  const src = sources.find((s) => s.id === p.sourceId);
  const dup = !policy && policies.some((x) => x.id === p.id);
  const valid = p.id && p.title && p.sourceId && p.excerpt && !dup;

  const save = async () => {
    const next: Policy = {
      ...p,
      customTerms: terms.split(',').map((t) => t.trim()).filter(Boolean),
      version: policy ? policy.version + 1 : 1,
      updatedAt: new Date().toISOString(),
    };
    await savePolicy(next);
    toast(`Regra ${next.id} salva (v${next.version}). Base atualizada.`);
    go('politicas', next.id);
  };

  return (
    <>
      <PageHead title={policy ? `Regra ${policy.id}` : 'Nova regra'} actions={<button type="button" className="btn ghost" onClick={onClose}>← Voltar</button>} />
      <div className="grid2 wide-left">
        <Card title="Dados da regra">
          <div className="form">
            <div className="grid2">
              <Field label="Código *" hint={dup ? 'Código já existe.' : 'Ex.: S11-3.2'}>
                <input value={p.id} disabled={!!policy} onChange={(e) => setP({ ...p, id: e.target.value.trim() })} />
              </Field>
              <Field label="Documento-fonte *">
                <select value={p.sourceId} onChange={(e) => setP({ ...p, sourceId: e.target.value })}>
                  <option value="">Selecione…</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.id} — {s.title}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Título *"><input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>
            <div className="grid2">
              <Field label="Categoria">
                <select value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Seção do documento"><input value={p.section ?? ''} onChange={(e) => setP({ ...p, section: e.target.value })} /></Field>
            </div>
            <Field label="Escopo"><Choice value={p.scope} onChange={(v) => setP({ ...p, scope: v })} options={[['tiktok_shop_br', 'TikTok Shop Brasil'], ['tiktok_geral', 'TikTok (geral)']]} /></Field>
            <Field label="Tipo"><Choice value={p.type} onChange={(v) => setP({ ...p, type: v })} options={Object.entries(TYPE) as [RuleType, string][]} /></Field>
            <Field label="Status"><Choice value={p.status} onChange={(v) => setP({ ...p, status: v })} options={Object.entries(STATUS) as [PolicyStatus, string][]} /></Field>
            <Field label="Aplica-se a">
              <div className="choice">
                {APPLIES.map(([v, l]) => (
                  <button key={v} type="button" className={p.appliesTo.includes(v) ? 'on' : ''} onClick={() => setP({ ...p, appliesTo: p.appliesTo.includes(v) ? p.appliesTo.filter((x) => x !== v) : [...p.appliesTo, v] })}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Trecho literal da fonte *" hint="Copie exatamente do documento. Não resuma."><textarea rows={8} value={p.excerpt} onChange={(e) => setP({ ...p, excerpt: e.target.value })} /></Field>
            <Field label="Observação (interpretação, conflito, lacuna)"><textarea rows={3} value={p.notes ?? ''} onChange={(e) => setP({ ...p, notes: e.target.value })} /></Field>
            <Field label="Termos de risco (separados por vírgula)" hint="Ao aparecerem no conteúdo, geram alerta ligado a esta regra.">
              <input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="ex.: renda garantida, frete grátis vitalício" />
            </Field>
            <button type="button" className="btn primary" disabled={!valid} onClick={save}>{policy ? 'Salvar nova versão' : 'Adicionar à base'}</button>
          </div>
        </Card>
        <Card title="Fonte">
          {src ? (
            <>
              <p><b>{src.title}</b></p>
              <p className="muted">{fmtDate(src.date)} · {src.status === 'oficial' ? 'Oficial' : 'NÃO OFICIAL'} · {src.file}</p>
              {src.notes && <p className="note">{src.notes}</p>}
            </>
          ) : (
            <p className="muted">Selecione o documento-fonte.</p>
          )}
          {policy && (
            <p className="muted sm">
              Versão {policy.version} · atualizada em {fmtDate(policy.updatedAt)} · origem: {policy.createdBy === 'base_inicial' ? 'base inicial' : policy.createdBy === 'usuario' ? 'cadastrada pela usuária' : 'IA revisada pela usuária'}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
