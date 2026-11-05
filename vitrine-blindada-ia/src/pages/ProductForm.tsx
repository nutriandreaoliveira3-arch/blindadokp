import { useEffect, useState } from 'react';
import { Card, Choice, Field, FindingCard, LevelPanel, PageHead } from '../components/ui';
import { uid } from '../db';
import { PRODUCT_CATEGORIES, checkProduct, gateAllows } from '../engine/productGate';
import { useStore } from '../store';
import type { Product } from '../types';

const blank = (): Product => ({
  id: uid('prd'),
  name: '',
  category: '',
  brand: '',
  manufacturer: '',
  description: '',
  specs: '',
  benefits: '',
  restrictions: '',
  mandatoryInfo: '',
  shopLink: '',
  price: '',
  photos: [],
  brandAuthorization: '',
  priceMuchLower: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

async function resize(file: File, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((r, j) => {
    img.onload = r;
    img.onerror = j;
    img.src = url;
  });
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.85);
}

export default function ProductForm() {
  const { param, products, policies, kbVersion, saveProduct, go, toast } = useStore();
  const [p, setP] = useState<Product>(blank);
  useEffect(() => {
    const found = products.find((x) => x.id === param);
    setP(found ? structuredClone(found) : blank());
  }, [param]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((o) => ({ ...o, [k]: v, gate: undefined }));
  const t = (k: keyof Product) => ({
    value: p[k] as string,
    onChange: (e: { target: { value: string } }) => set(k, e.target.value as never),
  });

  const analyze = async () => {
    const gate = checkProduct(p, policies, kbVersion);
    const next = { ...p, gate, updatedAt: new Date().toISOString() };
    setP(next);
    await saveProduct(next);
    toast('Produto salvo e analisado.');
    if (!param) go('produto', next.id);
  };

  const ack = async () => {
    if (!p.gate) return;
    const next = { ...p, gate: { ...p.gate, acknowledged: true } };
    setP(next);
    await saveProduct(next);
  };

  const g = gateAllows(p);

  return (
    <>
      <PageHead title={param ? 'Ficha do produto' : 'Cadastrar produto'} sub="Nenhum conteúdo é criado antes da análise do produto." />
      <div className="grid2 wide-left">
        <Card title="Dados do produto">
          <div className="form">
            <Field label="Nome do produto *">
              <input {...t('name')} placeholder="Ex.: Garrafa Térmica Inox 500 ml" />
            </Field>
            <div className="grid2">
              <Field label="Categoria *">
                <select {...t('category')}>
                  <option value="">Selecione…</option>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Preço no TikTok Shop">
                <input {...t('price')} placeholder="R$ 0,00" />
              </Field>
              <Field label="Marca *">
                <input {...t('brand')} />
              </Field>
              <Field label="Fabricante">
                <input {...t('manufacturer')} />
              </Field>
            </div>
            <Field label="Título exato do anúncio no TikTok Shop" hint="Copie o título como aparece no anúncio vinculado. O TikTok compara o que você fala e mostra com ele.">
              <input value={p.listingTitle ?? ''} onChange={(e) => set('listingTitle', e.target.value)} placeholder="Ex.: Conjunto Fitness Top e Short Estampado com Bolso" />
            </Field>
            <Field label="Nome da loja que vende (opcional)" hint='Ex.: "Boneca de Ferro", "Pozze". Nome da loja NÃO é a marca do produto: no vídeo, o TikTok pode ler o nome da loja como marca.'>
              <input value={p.sellerName ?? ''} onChange={(e) => set('sellerName', e.target.value)} />
            </Field>
            <Field label="Nome do modelo dado pela loja (opcional)" hint='Ex.: "Gaia". Se esse nome não estiver no título do anúncio, evite usar só ele no vídeo.'>
              <input value={p.modelName ?? ''} onChange={(e) => set('modelName', e.target.value)} />
            </Field>
            <Field label="Link do produto na TikTok Shop *">
              <input {...t('shopLink')} placeholder="https://…tiktok…" />
            </Field>
            <Field label="Descrição oficial *" hint="Copie a descrição do fabricante ou do anúncio.">
              <textarea rows={4} {...t('description')} />
            </Field>
            <Field label="Características e especificações" hint="Uma por linha: tamanho, peso, material, cor, aroma, capacidade…">
              <textarea rows={4} {...t('specs')} />
            </Field>
            <Field label="Benefícios comprováveis" hint="Uma por linha. Só o que o fabricante comprova. Os geradores usam APENAS esta lista.">
              <textarea rows={4} {...t('benefits')} />
            </Field>
            <Field label="Restrições comerciais">
              <textarea rows={2} {...t('restrictions')} />
            </Field>
            <Field label="Informações obrigatórias" hint="Advertências do rótulo, modo de uso, faixa etária, registro…">
              <textarea rows={2} {...t('mandatoryInfo')} />
            </Field>
            <Field label="Autorização da marca">
              <Choice
                value={p.brandAuthorization}
                onChange={(v) => set('brandAuthorization', v)}
                options={[
                  ['propria', 'Marca própria'],
                  ['sim', 'Vendedor autorizado'],
                  ['nao', 'Sem autorização'],
                  ['', 'Não sei'],
                ]}
              />
            </Field>
            <Field label="O preço é muito menor que o de produtos iguais no mercado?">
              <Choice value={p.priceMuchLower} onChange={(v) => set('priceMuchLower', v)} options={[['nao', 'Não'], ['sim', 'Sim'], ['', 'Não sei']]} />
            </Field>
          </div>
        </Card>

        <div className="stack">
          <Card title="Fotos originais *">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                const photos = await Promise.all(files.map(async (f) => ({ id: uid('img'), name: f.name, dataUrl: await resize(f) })));
                set('photos', [...p.photos, ...photos]);
                e.target.value = '';
              }}
            />
            <div className="thumbs">
              {p.photos.map((ph) => (
                <figure key={ph.id}>
                  <img src={ph.dataUrl} alt={ph.name} />
                  <button type="button" className="x" aria-label="Remover foto" onClick={() => set('photos', p.photos.filter((x) => x.id !== ph.id))}>
                    ×
                  </button>
                </figure>
              ))}
            </div>
            <p className="hint">As fotos são a referência de fidelidade para imagens e vídeos com IA.</p>
          </Card>

          <Card title="Análise do produto">
            <button type="button" className="btn primary block" onClick={analyze} disabled={!p.name}>
              Salvar e analisar
            </button>
            {p.gate && (
              <>
                <LevelPanel level={p.gate.level} count={p.gate.findings.length} />
                {p.gate.level === 'atencao' && !p.gate.acknowledged && (
                  <div className="ack">
                    <p>Li as ressalvas abaixo e vou respeitá-las na criação do conteúdo.</p>
                    <button type="button" className="btn" onClick={ack}>
                      Confirmar ciência e liberar criação
                    </button>
                  </div>
                )}
                {g.ok ? (
                  <p className="ok">✅ Produção liberada para este produto.</p>
                ) : (
                  <p className="blocked">⛔ {g.reason}</p>
                )}
                {p.gate.findings.map((f) => (
                  <FindingCard key={f.id} f={f} />
                ))}
              </>
            )}
            {!p.gate && <p className="muted">Ainda não analisado (ou alterado após a última análise).</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
