import { useState } from 'react';
import { Card, Empty, LevelBadge, PageHead, fmtDate } from '../components/ui';
import { checkProduct } from '../engine/productGate';
import { useStore } from '../store';

export default function ProductLibrary() {
  const { products, policies, kbVersion, go, deleteProduct, saveProduct, toast } = useStore();
  const [q, setQ] = useState('');
  const list = products.filter((p) => ((p.name ?? "") + (p.brand ?? "") + (p.category ?? "")).toLowerCase().includes(q.toLowerCase()));
  const outdated = products.filter((p) => p.gate && p.gate.kbVersion < kbVersion).length;

  return (
    <>
      <PageHead
        title="Biblioteca de produtos"
        actions={
          <>
            {outdated > 0 && (
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  for (const p of products) await saveProduct({ ...p, gate: checkProduct(p, policies, kbVersion) });
                  toast('Produtos reanalisados com a base atual.');
                }}
              >
                Reanalisar {outdated} com a base v{kbVersion}
              </button>
            )}
            <button type="button" className="btn primary" onClick={() => go('produto')}>
              + Cadastrar produto
            </button>
          </>
        }
      />
      <input className="search" placeholder="Buscar produto…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!list.length && <Empty>Nenhum produto. Comece cadastrando o primeiro.</Empty>}
      <div className="cards">
        {list.map((p) => (
          <Card key={p.id} className="product-card">
            {p.photos?.[0] ? <img className="cover" src={p.photos[0].dataUrl} alt="" /> : <div className="cover none">sem foto</div>}
            <h3>{p.name}</h3>
            <p className="muted sm">
              {p.brand} · {p.category}
            </p>
            <p>
              {p.gate ? <LevelBadge level={p.gate.level} /> : <span className="badge">⚪ Não analisado</span>}
              {p.gate && p.gate.kbVersion < kbVersion && <span className="tag warn">base desatualizada</span>}
            </p>
            <p className="muted sm">Atualizado em {fmtDate(p.updatedAt)}</p>
            <div className="row">
              <button type="button" className="btn sm" onClick={() => go('produto', p.id)}>
                Abrir
              </button>
              <button type="button" className="btn ghost sm" onClick={() => go('roteiro', p.id)}>
                Criar conteúdo
              </button>
              <button
                type="button"
                className="btn ghost sm danger"
                onClick={() => confirm(`Excluir "${p.name}"?`) && deleteProduct(p.id)}
              >
                Excluir
              </button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
