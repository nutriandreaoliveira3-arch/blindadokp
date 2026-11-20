import { useState } from 'react';
import { Card, Choice, Empty, Field, PageHead, fmtDate } from '../components/ui';
import { uid } from '../db';
import { ITEM_STATUS } from '../engine/kit';
import { scanText } from '../engine/analyze';
import { useStore } from '../store';
import type { CatalogItem } from '../types';

const blank = (): CatalogItem => ({
  id: uid('itm'), name: '', brand: '', labelText: '', contents: '', ingredients: '', usage: '', warnings: '', visual: '',
  safeToSay: '', avoid: '', status: 'pendente', statusNote: '', photos: [], reviewedAt: '', createdAt: new Date().toISOString(),
});

async function toDataUrl(file: File, max = 1024) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.85);
}

export default function Items() {
  const { items, products, policies, saveItem, deleteItem, toast } = useStore();
  const [edit, setEdit] = useState<CatalogItem | null>(null);
  const [q, setQ] = useState('');
  const usedIn = (id: string) => products.filter((p) => p.components?.some((c) => c.itemId === id));
  const list = items.filter((i) => (i.name + i.brand + i.labelText).toLowerCase().includes(q.toLowerCase()));

  if (edit) {
    const t = (k: keyof CatalogItem) => ({ value: edit[k] as string, onChange: (e: { target: { value: string } }) => setEdit({ ...edit, [k]: e.target.value }) });
    const risks = scanText([edit.labelText, edit.safeToSay].join('\n'), 'produto', policies);
    return (
      <>
        <PageHead title={edit.name || 'Novo item'} sub="Avalie o item uma vez. Todos os kits que usam este item herdam a avaliação." actions={<button type="button" className="btn ghost" onClick={() => setEdit(null)}>← Voltar</button>} />
        <div className="grid2 wide-left">
          <Card title="Dados do item">
            <div className="form">
              <div className="grid2">
                <Field label="Nome do item *"><input {...t('name')} placeholder="Ex.: NAC 600mg" /></Field>
                <Field label="Marca"><input {...t('brand')} placeholder="Ex.: AlwaysFit" /></Field>
              </div>
              <Field label="Texto da frente do rótulo" hint="Copie exatamente. É a referência para conferir se a IA mudou alguma letra."><textarea rows={3} {...t('labelText')} /></Field>
              <Field label="Conteúdo" hint="Ex.: 30 cápsulas de 750mg"><input {...t('contents')} /></Field>
              <Field label="Ingredientes / composição"><textarea rows={2} {...t('ingredients')} /></Field>
              <Field label="Modo de uso (do rótulo)"><input {...t('usage')} /></Field>
              <Field label="Avisos obrigatórios" hint="Ex.: pode conter glúten. Um por linha."><textarea rows={2} {...t('warnings')} /></Field>
              <Field label="Como é (visual)" hint="Ex.: pote preto, tampa preta, rótulo branco com letras azul-marinho"><input {...t('visual')} /></Field>
              <Field label="Frases liberadas para o vídeo" hint="Uma por linha. Só o que está no rótulo. A primeira é usada na narração do kit."><textarea rows={3} {...t('safeToSay')} /></Field>
              <Field label="O que NÃO falar sobre este item" hint="Uma por linha. Ex.: sono, ansiedade, imunidade, metabolismo"><textarea rows={3} {...t('avoid')} /></Field>
            </div>
          </Card>
          <div className="stack">
            <Card title="Fotos originais">
              <input type="file" accept="image/*" multiple onChange={async (e) => {
                const fs = [...(e.target.files ?? [])];
                const ph = await Promise.all(fs.map(async (f) => ({ id: uid('img'), name: f.name, dataUrl: await toDataUrl(f) })));
                setEdit({ ...edit, photos: [...edit.photos, ...ph] });
                e.target.value = '';
              }} />
              <div className="thumbs">
                {edit.photos.map((ph) => (
                  <figure key={ph.id}>
                    <img src={ph.dataUrl} alt={ph.name} />
                    <button type="button" className="x" aria-label="Remover" onClick={() => setEdit({ ...edit, photos: edit.photos.filter((x) => x.id !== ph.id) })}>×</button>
                  </figure>
                ))}
              </div>
              <p className="hint">Use as fotos originais da loja, não imagens refeitas por IA.</p>
            </Card>
            <Card title="Avaliação">
              {risks.length > 0 && (
                <div className="blocked sm">
                  Termos de risco no rótulo ou nas frases liberadas: {risks.map((r) => `"${r.excerpt}" (${r.title})`).join('; ')}
                </div>
              )}
              <Field label="Situação">
                <Choice value={edit.status} onChange={(v) => setEdit({ ...edit, status: v })} options={Object.entries(ITEM_STATUS).map(([k, v]) => [k, `${v.emoji} ${v.label}`]) as [CatalogItem['status'], string][]} />
              </Field>
              <Field label="Motivo / observação"><textarea rows={3} {...t('statusNote')} /></Field>
              <button type="button" className="btn primary" disabled={!edit.name} onClick={async () => { await saveItem({ ...edit, reviewedAt: new Date().toISOString() }); toast('Item salvo.'); setEdit(null); }}>Salvar item</button>
              <p className="hint">Avaliação interna. Para suplementos e outras categorias restritas, confirme também no Seller Center que o produto está aprovado.</p>
              {usedIn(edit.id).length > 0 && <p className="muted sm">Usado em: {usedIn(edit.id).map((p) => p.name).join(', ')}</p>}
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="Itens do catálogo" sub="Cada item é avaliado uma vez e reaproveitado em todos os kits." actions={<button type="button" className="btn primary" onClick={() => setEdit(blank())}>+ Novo item</button>} />
      <input className="search" placeholder="Buscar item…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!list.length && <Empty>Nenhum item. Cadastre os itens que se repetem nos kits.</Empty>}
      <div className="cards">
        {list.map((i) => (
          <Card key={i.id} className="product-card">
            {i.photos[0] ? <img className="cover" src={i.photos[0].dataUrl} alt="" /> : <div className="cover none">sem foto</div>}
            <h3>{i.name}</h3>
            <p className="muted sm">{i.brand} · {i.contents}</p>
            <p><span className={`badge ${i.status === 'aprovado' ? 'lvl-baixo' : i.status === 'bloqueado' ? 'lvl-alto' : 'lvl-atencao'}`}>{ITEM_STATUS[i.status].emoji} {ITEM_STATUS[i.status].label}</span></p>
            {i.statusNote && <p className="sm">{i.statusNote}</p>}
            <p className="muted sm">Em {usedIn(i.id).length} kit(s){i.reviewedAt ? ` · avaliado em ${fmtDate(i.reviewedAt)}` : ''}</p>
            <div className="row">
              <button type="button" className="btn sm" onClick={() => setEdit(structuredClone(i))}>Abrir</button>
              <button type="button" className="btn ghost sm danger" disabled={usedIn(i.id).length > 0} title={usedIn(i.id).length ? 'Item usado em kits' : ''} onClick={() => confirm(`Excluir "${i.name}"?`) && deleteItem(i.id)}>Excluir</button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
