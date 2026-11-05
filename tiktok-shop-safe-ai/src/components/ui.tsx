import { useState, type ReactNode } from 'react';
import { DISCLAIMER, FIELD_LABEL, LEVEL_INFO } from '../engine/analyze';
import { gateAllows } from '../engine/productGate';
import { useStore } from '../store';
import type { Finding, Product, RiskLevel } from '../types';

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function Card({ title, children, className = '', actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="choice" role="radiogroup">
      {options.map(([v, l]) => (
        <button type="button" key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn ghost sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const t = document.createElement('textarea');
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          t.remove();
        }
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? '✓ Copiado' : label}
    </button>
  );
}

export function LevelBadge({ level, big }: { level: RiskLevel; big?: boolean }) {
  const L = LEVEL_INFO[level];
  return (
    <span className={`badge lvl-${level} ${big ? 'big' : ''}`}>
      {L.emoji} {L.label}
    </span>
  );
}

export function LevelPanel({ level, count }: { level: RiskLevel; count: number }) {
  const L = LEVEL_INFO[level];
  return (
    <div className={`level-panel lvl-${level}`}>
      <div className="level-emoji">{L.emoji}</div>
      <div>
        <strong>{L.label}</strong> · {count} alerta(s)
        <p>{L.desc}</p>
        <p className="disc">{DISCLAIMER}</p>
      </div>
    </div>
  );
}

export function PolicyRef({ id }: { id: string }) {
  const { policies, sources, go } = useStore();
  const [open, setOpen] = useState(false);
  const p = policies.find((x) => x.id === id);
  const s = p && sources.find((x) => x.id === p.sourceId);
  return (
    <div className="pref">
      <button type="button" className="pref-btn" onClick={() => setOpen(!open)}>
        <code>{id}</code> {p?.title ?? 'regra não encontrada'}
        {p?.status === 'pendente_verificacao' && <span className="tag warn">pendente de verificação</span>}
        <span className="chev">{open ? '▴' : '▾'}</span>
      </button>
      {open && p && (
        <div className="pref-body">
          <blockquote>{p.excerpt}</blockquote>
          {p.notes && <p className="note">Observação: {p.notes}</p>}
          <p className="muted sm">
            Fonte: {s?.title ?? p.sourceId}
            {s && ` · ${fmtDate(s.date)}`}
            {s?.status === 'nao_oficial' && ' · NÃO OFICIAL'}
            {p.section && ` · seção ${p.section}`} · v{p.version}{' '}
            <button type="button" className="link" onClick={() => go('politicas', p.id)}>
              abrir na biblioteca
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export function FindingCard({ f, actions }: { f: Finding; actions?: ReactNode }) {
  return (
    <article className={`finding sev-${f.severity}`}>
      <div className="finding-head">
        <span>{f.severity === 'alto' ? '🔴' : '🟡'}</span>
        <strong>{f.title}</strong>
        <span className="tag">{FIELD_LABEL[f.field]}</span>
        {f.origin === 'ia' && <span className="tag ia">IA</span>}
        {f.humanReview && <span className="tag warn">revisão humana</span>}
      </div>
      {f.excerpt && (
        <p className="excerpt">
          Trecho: <mark>{f.excerpt}</mark>
        </p>
      )}
      <p>{f.explanation}</p>
      {f.suggestion !== undefined && f.fixMode !== 'manual' && (
        <p className="sugg">
          <b>Versão corrigida:</b> {f.suggestion || '(remover este trecho)'}
        </p>
      )}
      {f.suggestion && f.fixMode === 'manual' && (
        <p className="sugg">
          <b>Como corrigir:</b> {f.suggestion}
        </p>
      )}
      <div className="refs">
        {f.policyIds.map((id) => (
          <PolicyRef key={id} id={id} />
        ))}
      </div>
      {actions}
    </article>
  );
}

export function fmtDate(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-');
  return day ? `${day}/${m}/${y}` : d;
}

/** Seleção de produto com verificação do portão de conformidade. */
export function ProductPicker({ value, onChange, requireGate = true }: { value?: string; onChange: (id: string) => void; requireGate?: boolean }) {
  const { products, go } = useStore();
  const p = products.find((x) => x.id === value);
  const gate = gateAllows(p);
  return (
    <div className="picker">
      <Field label="Produto">
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecione…</option>
          {products.map((x) => (
            <option key={x.id} value={x.id}>
              {x.gate ? LEVEL_INFO[x.gate.level].emoji : '⚪'} {x.name}
            </option>
          ))}
        </select>
      </Field>
      {!products.length && (
        <p className="muted">
          Nenhum produto cadastrado.{' '}
          <button type="button" className="link" onClick={() => go('produto')}>
            Cadastrar produto
          </button>
        </p>
      )}
      {p && requireGate && !gate.ok && (
        <div className="blocked">
          ⛔ {gate.reason}{' '}
          <button type="button" className="link" onClick={() => go('produto', p.id)}>
            Abrir ficha
          </button>
        </div>
      )}
    </div>
  );
}

export function useGate(productId?: string): { product?: Product; ok: boolean } {
  const { products } = useStore();
  const product = products.find((x) => x.id === productId);
  return { product, ok: gateAllows(product).ok };
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
