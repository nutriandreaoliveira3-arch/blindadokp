import { useEffect, useState } from 'react';
import { Card, Field, PageHead, fmtDate } from '../components/ui';
import { api, isAdmin, isCloud } from '../mode';
import { useStore } from '../store';

interface Sub {
  email: string;
  active: number;
  status: string | null;
  source: string | null;
  product: string | null;
  updated_at: string;
  registered: number;
}
interface Hook {
  id: number;
  received_at: string;
  email: string | null;
  status: string | null;
  action: string;
  payload: string;
}

export default function Admin() {
  const { toast } = useStore();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      setSubs(await api<Sub[]>('/api/admin/subscribers'));
      setHooks(await api<Hook[]>('/api/admin/webhooks'));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  useEffect(() => {
    if (isCloud() && isAdmin()) load();
  }, []);

  if (!isCloud())
    return (
      <>
        <PageHead title="Assinantes" />
        <Card>
          <p>Esta área funciona apenas no site publicado (modo nuvem). No arquivo local não há assinantes.</p>
        </Card>
      </>
    );
  if (!isAdmin()) return <PageHead title="Acesso restrito" />;

  const setAccess = async (e: string, active: boolean) => {
    await api('/api/admin/access', { method: 'POST', body: JSON.stringify({ email: e, active }) });
    toast(active ? 'Acesso liberado.' : 'Acesso bloqueado.');
    load();
  };

  const webhookUrl = `${location.origin}/api/webhook/greenn?token=SEU_TOKEN`;

  return (
    <>
      <PageHead title="Assinantes" sub="Acesso liberado automaticamente pela Green, com controle manual." actions={<button type="button" className="btn" onClick={load}>Atualizar</button>} />
      {err && <p className="blocked">{err}</p>}
      <div className="grid2">
        <Card title="Liberar acesso manualmente">
          <div className="form">
            <Field label="E-mail do cliente">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <div className="row">
              <button type="button" className="btn primary" disabled={!email} onClick={() => setAccess(email, true)}>Liberar</button>
              <button type="button" className="btn danger" disabled={!email} onClick={() => setAccess(email, false)}>Bloquear</button>
            </div>
          </div>
        </Card>
        <Card title="Endereço do webhook na Green">
          <pre>{webhookUrl}</pre>
          <p className="hint">Troque SEU_TOKEN pelo mesmo valor cadastrado no segredo GREENN_TOKEN da Cloudflare. Configure em cada produto/plano na Green.</p>
        </Card>
      </div>
      <Card title={`Assinantes (${subs.length})`}>
        <table className="table">
          <thead>
            <tr><th>E-mail</th><th>Acesso</th><th>Último status</th><th>Origem</th><th>Cadastro no app</th><th>Atualizado</th><th></th></tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.email}>
                <td>{s.email}</td>
                <td>{s.active ? '🟢 Ativo' : '🔴 Bloqueado'}</td>
                <td>{s.status ?? '—'}</td>
                <td>{s.source}{s.product ? ` · ${s.product}` : ''}</td>
                <td>{s.registered ? 'Sim' : 'Ainda não'}</td>
                <td>{fmtDate(s.updated_at)}</td>
                <td className="row">
                  <button type="button" className="btn sm" onClick={() => setAccess(s.email, !s.active)}>{s.active ? 'Bloquear' : 'Liberar'}</button>
                  {!!s.registered && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      title="A cliente cria nova senha em Primeiro acesso. Os dados dela são mantidos."
                      onClick={async () => {
                        if (!confirm(`Resetar a senha de ${s.email}? Ela vai criar uma nova em "Primeiro acesso".`)) return;
                        await api('/api/admin/reset-user', { method: 'POST', body: JSON.stringify({ email: s.email }) });
                        toast('Login resetado.');
                        load();
                      }}
                    >
                      Resetar senha
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!subs.length && <p className="muted">Nenhum assinante ainda.</p>}
      </Card>
      <Card title="Avisos recebidos da Green (últimos 100)">
        <p className="hint">Use esta lista para conferir se o formato enviado pela Green está sendo lido corretamente.</p>
        {hooks.map((h) => (
          <div key={h.id} className="chk-item">
            <button type="button" className="list-row" onClick={() => setOpen(open === h.id ? null : h.id)}>
              <span className="grow">
                {new Date(h.received_at).toLocaleString('pt-BR')} · {h.email ?? 'sem e-mail'} · status: {h.status ?? '—'}
              </span>
              <span className={`tag ${h.action === 'liberado' ? '' : 'warn'}`}>{h.action}</span>
            </button>
            {open === h.id && <pre className="sm">{JSON.stringify(JSON.parse(h.payload), null, 2)}</pre>}
          </div>
        ))}
        {!hooks.length && <p className="muted">Nenhum aviso recebido ainda.</p>}
      </Card>
    </>
  );
}
