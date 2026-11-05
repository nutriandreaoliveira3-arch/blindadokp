import { useState } from 'react';
import { Field } from '../components/ui';
import { login } from '../mode';
import { useStore } from '../store';

export default function Login() {
  const { refreshAccount } = useStore();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await login(email, password, register);
      await refreshAccount();
    } catch (er) {
      setMsg((er as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <div className="brand dark">
          <span className="logo">◆</span>
          <div>
            <b>Vitrine Blindada IA</b>
            <small>Conformidade e criação para TikTok Shop</small>
          </div>
        </div>
        <h1>{register ? 'Criar acesso' : 'Entrar'}</h1>
        <p className="muted sm">{register ? 'Use o mesmo e-mail da sua compra na Green.' : 'Acesso exclusivo para assinantes.'}</p>
        <div className="form">
          <Field label="E-mail">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Senha" hint={register ? 'Mínimo de 8 caracteres.' : undefined}>
            <input type="password" required minLength={register ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} />
          </Field>
          {msg && <p className="blocked sm">{msg}</p>}
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Aguarde…' : register ? 'Criar acesso' : 'Entrar'}
          </button>
          <button type="button" className="link" onClick={() => { setRegister(!register); setMsg(''); }}>
            {register ? 'Já tenho acesso — entrar' : 'Primeiro acesso? Criar senha'}
          </button>
        </div>
        <p className="hint">Esqueceu a senha? Fale com o suporte para liberar um novo cadastro.</p>
      </form>
    </div>
  );
}
