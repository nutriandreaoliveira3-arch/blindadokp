import type React from 'react';
import { useState } from 'react';
import Analyzer from './pages/Analyzer';
import Corrector from './pages/Corrector';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import LivePrep from './pages/LivePrep';
import PolicyLibrary from './pages/PolicyLibrary';
import ProductForm from './pages/ProductForm';
import ProductLibrary from './pages/ProductLibrary';
import SettingsPage from './pages/Settings';
import { CaptionStudio, ImageStudio, ScriptStudio, VideoStudio } from './pages/Studios';
import { useStore, type Page } from './store';

const NAV: [string, [Page, string, string][]][] = [
  ['', [['painel', '🏠', 'Painel']]],
  ['Produtos', [['produto', '➕', 'Cadastrar produto'], ['produtos', '📦', 'Biblioteca de produtos']]],
  ['Criação', [['imagem', '🖼️', 'Criar imagem'], ['video', '🎬', 'Prompt de vídeo'], ['roteiro', '📝', 'Roteiro de vendas'], ['legenda', '#️⃣', 'Legenda e hashtags']]],
  ['Conformidade', [['analisar', '🔎', 'Analisar conteúdo'], ['corrigir', '🛠️', 'Corrigir riscos'], ['live', '🔴', 'Preparar LIVE']]],
  ['Base', [['politicas', '📚', 'Biblioteca de políticas'], ['historico', '🗂️', 'Histórico'], ['config', '⚙️', 'Configurações']]],
];

const PAGES: Record<Page, () => React.ReactElement> = {
  painel: Dashboard,
  produto: ProductForm,
  produtos: ProductLibrary,
  imagem: ImageStudio,
  video: VideoStudio,
  roteiro: ScriptStudio,
  legenda: CaptionStudio,
  analisar: Analyzer,
  corrigir: Corrector,
  live: LivePrep,
  politicas: PolicyLibrary,
  historico: History,
  config: SettingsPage,
};

export default function App() {
  const { ready, page, param, go, toastMsg } = useStore();
  const [menu, setMenu] = useState(false);
  const P = PAGES[page] ?? Dashboard;
  return (
    <div className={`app ${menu ? 'menu-open' : ''}`}>
      <aside className="side">
        <div className="brand">
          <span className="logo">◆</span>
          <div>
            <b>TikTok Shop Safe AI</b>
            <small>Central de Conformidade e Criação</small>
          </div>
        </div>
        <nav>
          {NAV.map(([g, items]) => (
            <div key={g || 'top'} className="nav-group">
              {g && <span className="nav-title">{g}</span>}
              {items.map(([p, i, l]) => (
                <button
                  key={p}
                  type="button"
                  className={page === p ? 'active' : ''}
                  onClick={() => {
                    go(p);
                    setMenu(false);
                  }}
                >
                  <span className="nav-i">{i}</span>
                  {l}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <p className="side-foot">Ferramenta de apoio. Não garante aprovação do TikTok.</p>
      </aside>
      <div className="main">
        <div className="topbar">
          <button type="button" className="btn ghost sm" onClick={() => setMenu(!menu)} aria-label="Menu">
            ☰
          </button>
          <b>TikTok Shop Safe AI</b>
        </div>
        <main className="content">{ready ? <P key={page + (param ?? '')} /> : <p className="muted">Carregando base de conhecimento…</p>}</main>
      </div>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
