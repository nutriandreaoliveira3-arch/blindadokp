import { useState } from 'react';
import { Card, Choice, Field, PageHead } from '../components/ui';
import { exportBackup, importBackup } from '../db';
import { isCloud, logout } from '../mode';
import { download } from '../report';
import { useStore } from '../store';

export default function SettingsPage() {
  const { settings, saveSettings, reload, toast, account, refreshAccount } = useStore();
  const [provider, setProvider] = useState<'anthropic' | 'gemini'>(settings.provider ?? 'anthropic');
  const [gKey, setGKey] = useState(settings.geminiKey ?? '');
  const [gModel, setGModel] = useState(settings.geminiModel ?? 'gemini-2.5-flash');
  const [key, setKey] = useState(settings.apiKey ?? '');
  const [model, setModel] = useState(settings.model);
  const [visionModel, setVisionModel] = useState(settings.visionModel ?? 'claude-sonnet-5-5');
  const [effort, setEffort] = useState(settings.effort);

  return (
    <>
      <PageHead title="Configurações" />
      <div className="grid2">
        {isCloud() ? (
          <Card title="Minha conta">
            <p>
              Conectada como <b>{account.email}</b> ({account.role === 'admin' ? 'administradora' : 'assinante'}).
            </p>
            <p className="muted sm">
              Seus produtos e análises ficam salvos na nuvem. A IA já está incluída no plano{account.ai ? '' : ' (ainda não ativada pela administradora)'}.
            </p>
            <button type="button" className="btn" onClick={async () => { await logout(); await refreshAccount(); }}>
              Sair
            </button>
          </Card>
        ) : (
        <Card title="Inteligência artificial (opcional)">
          <p>
            A análise por regras funciona <b>sem IA e sem internet</b>. A IA (Claude, da Anthropic, ou Gemini, do Google) é um complemento para: achar riscos implícitos,
            reescrever textos e sugerir regras a partir de documentos novos.
          </p>
          <ul className="sm">
            <li>Exige uma chave própria: Anthropic (console.anthropic.com) ou Google Gemini (aistudio.google.com). O custo é por uso.</li>
            <li>A chave fica salva só neste navegador. As chamadas vão direto do navegador para a API.</li>
            <li>A IA só pode citar regras da biblioteca. Alertas com regra inexistente são descartados.</li>
          </ul>
          <div className="form">
            <Field label="Qual IA usar">
              <Choice value={provider} onChange={setProvider} options={[['anthropic', 'Claude (Anthropic)'], ['gemini', 'Gemini (Google)']]} />
            </Field>
            {provider === 'gemini' ? (
              <>
                <Field label="Chave do Gemini" hint="Crie em aistudio.google.com → Get API key. Fica salva só neste navegador.">
                  <input type="password" value={gKey} onChange={(e) => setGKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
                </Field>
                <Field label="Modelo do Gemini" hint="Use um modelo com visão disponível na sua conta (ex.: gemini-2.5-flash). Se der erro de modelo, troque pelo nome que aparece no AI Studio.">
                  <input value={gModel} onChange={(e) => setGModel(e.target.value)} />
                </Field>
              </>
            ) : (
              <>
            <Field label="Chave da API">
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
            </Field>
            <Field label="Modelo">
              <input value={model} onChange={(e) => setModel(e.target.value)} />
            </Field>
            <Field label="Modelo para comparar imagens" hint="Sonnet 5.5: cerca de R$ 0,15 por conferência. Haiku 5.5: mais barato. Opus 5.5: mais rigoroso.">
              <select value={visionModel} onChange={(e) => setVisionModel(e.target.value)}>
                <option value="claude-sonnet-5-5">Claude Sonnet 5.5 (recomendado)</option>
                <option value="claude-haiku-5-5">Claude Haiku 5.5 (mais barato)</option>
                <option value="claude-opus-5-5">Claude Opus 5.5 (mais rigoroso)</option>
              </select>
            </Field>
            <Field label="Esforço de raciocínio">
              <Choice value={effort} onChange={setEffort} options={[['low', 'Baixo (mais barato)'], ['medium', 'Médio'], ['high', 'Alto']]} />
            </Field>
              </>
            )}
            <div className="row">
              <button type="button" className="btn primary" onClick={async () => { await saveSettings({ provider, apiKey: key || undefined, geminiKey: gKey || undefined, geminiModel: gModel, model, effort, visionModel }); toast('Configurações salvas.'); }}>
                Salvar
              </button>
              <button type="button" className="btn ghost danger" onClick={async () => { setKey(''); setGKey(''); await saveSettings({ provider, geminiModel: gModel, model, effort, visionModel }); toast('Chaves removidas.'); }}>
                Remover chaves
              </button>
            </div>
          </div>
        </Card>
        )}
        <Card title="Backup dos dados">
          <p>
            {isCloud()
              ? 'Seus dados ficam na nuvem. O backup é uma cópia extra para guardar no seu computador.'
              : 'Produtos, políticas, documentos e histórico ficam salvos neste navegador. Se limpar os dados do navegador ou trocar de computador, eles não vão junto. Exporte um backup com frequência.'}
          </p>
          <div className="row">
            <button
              type="button"
              className="btn primary"
              onClick={async () => download(`backup-vitrine-blindada-ia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportBackup()), 'application/json')}
            >
              Exportar backup
            </button>
            <label className="btn">
              Importar backup
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    await importBackup(JSON.parse(await f.text()));
                    await reload();
                    toast('Backup importado.');
                  } catch (err) {
                    toast((err as Error).message);
                  }
                }}
              />
            </label>
          </div>
          <p className="hint">A chave da API não entra no backup.</p>
        </Card>
      </div>
    </>
  );
}
