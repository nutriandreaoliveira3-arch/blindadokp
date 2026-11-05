import { Card, LevelBadge, PageHead, fmtDate } from '../components/ui';
import { useStore, type Page } from '../store';

const FLOW: [string, string, Page][] = [
  ['1', 'Cadastrar produto', 'produto'],
  ['2', 'Análise do produto', 'produtos'],
  ['3', 'Criar imagem, vídeo, roteiro ou legenda', 'roteiro'],
  ['4', 'Conferir anúncio x vídeo e analisar', 'comparar'],
  ['5', 'Corrigir riscos', 'corrigir'],
  ['6', 'Publicar (fora do app)', 'historico'],
];

const TILES: [Page, string, string][] = [
  ['produto', '➕', 'Cadastrar produto'],
  ['produtos', '📦', 'Biblioteca de produtos'],
  ['imagem', '🖼️', 'Criar imagem'],
  ['video', '🎬', 'Prompt de vídeo (Flow)'],
  ['roteiro', '📝', 'Roteiro de vendas'],
  ['legenda', '#️⃣', 'Legenda e hashtags'],
  ['comparar', '🖼️', 'Conferir anúncio x vídeo'],
  ['analisar', '🔎', 'Analisar conteúdo'],
  ['corrigir', '🛠️', 'Corrigir riscos'],
  ['live', '🔴', 'Preparar LIVE'],
  ['politicas', '📚', 'Biblioteca de políticas'],
  ['historico', '🗂️', 'Histórico de análises'],
  ['violacoes', '⚠️', 'Minhas violações'],
  ['config', '⚙️', 'Configurações'],
];

export default function Dashboard() {
  const { products, policies, sources, analyses, kbVersion, go } = useStore();
  const pend = policies.filter((p) => p.status === 'pendente_verificacao').length;
  const high = analyses.filter((a) => a.level === 'alto').length;
  return (
    <>
      <PageHead title="Painel" sub="Primeiro conformidade, depois criação e publicação." />
      <div className="stats">
        <div className="stat"><b>{products.length}</b><span>produtos</span></div>
        <div className="stat"><b>{policies.filter((p) => p.status === 'ativa').length}</b><span>regras ativas</span></div>
        <div className="stat warn"><b>{pend}</b><span>regras pendentes de verificação</span></div>
        <div className="stat"><b>{analyses.length}</b><span>análises</span></div>
        <div className="stat bad"><b>{high}</b><span>análises em alto risco</span></div>
      </div>

      <Card title="Fluxo de trabalho">
        <ol className="flow">
          {FLOW.map(([n, t, p]) => (
            <li key={n}>
              <button type="button" onClick={() => go(p)}>
                <span className="flow-n">{n}</span>
                {t}
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <div className="tiles">
        {TILES.map(([p, i, t]) => (
          <button key={p} type="button" className="tile" onClick={() => go(p)}>
            <span className="tile-i">{i}</span>
            {t}
          </button>
        ))}
      </div>

      <div className="grid2">
        <Card title="Últimas análises">
          {analyses.slice(0, 6).map((a) => (
            <button key={a.id} type="button" className="list-row" onClick={() => go('historico', a.id)}>
              <LevelBadge level={a.level} /> <span className="grow">{a.title}</span>
              <span className="muted sm">{fmtDate(a.createdAt)}</span>
            </button>
          ))}
          {!analyses.length && <p className="muted">Nenhuma análise ainda.</p>}
        </Card>
        <Card title="Base de conhecimento">
          <p>
            Versão <b>v{kbVersion}</b> · {sources.length} documentos · {policies.length} regras.
          </p>
          <p className="muted sm">
            Escopo atual: somente TikTok Shop Brasil. Diretrizes da Comunidade do TikTok (geral), Política de Produtos Proibidos, Produtos
            Restritos, Propriedade Intelectual, Jogos de Azar, Conteúdo gerado por IA (oficial) e Penalidades ainda não foram enviadas.
          </p>
          <button type="button" className="btn" onClick={() => go('politicas')}>
            Abrir biblioteca
          </button>
        </Card>
      </div>
    </>
  );
}
