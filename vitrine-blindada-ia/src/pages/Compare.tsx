import { useState } from 'react';
import { aiCompareImages, type CompareResult } from '../ai';
import { Card, Choice, Field, FindingCard, LevelPanel, PageHead, ProductPicker } from '../components/ui';
import { uid } from '../db';
import { riskLevel } from '../engine/analyze';
import { useStore } from '../store';
import type { Analysis, Finding } from '../types';
import { emptyCtx, emptyInput } from './Analyzer';

// Conferência anúncio x vídeo: a causa de mais pontos na conta ("promoção de produto inconsistente").

const ATTRS: [string, string][] = [
  ['tipo', 'Tipo de produto (ex.: macacão x conjunto)'],
  ['cor', 'Cor da variação vinculada'],
  ['estampa', 'Estampa / textura'],
  ['logo_rotulo', 'Logo, etiqueta ou rótulo'],
  ['formato', 'Formato, modelagem, tamanho'],
  ['quantidade_pecas', 'Quantidade de peças / unidades'],
  ['detalhes', 'Detalhes (costura, recortes, bolsos, alças, tampa)'],
  ['itens_extras', 'Itens que NÃO estão no anúncio'],
  ['texto_na_imagem', 'Textos que aparecem no produto'],
];
type Mark = 'igual' | 'diferente' | 'incerto' | '';

async function shrink(src: string, max = 640): Promise<string> {
  const img = new Image();
  await new Promise((r, j) => {
    img.onload = r;
    img.onerror = j;
    img.src = src;
  });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

const readFile = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

/** Extrai N quadros distribuídos ao longo do vídeo, direto no navegador. */
async function extractFrames(file: File, n: number): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  await new Promise((r, j) => {
    v.onloadedmetadata = r;
    v.onerror = () => j(new Error('Não foi possível ler este vídeo. Tente MP4.'));
  });
  const out: string[] = [];
  const c = document.createElement('canvas');
  const k = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
  c.width = Math.round(v.videoWidth * k);
  c.height = Math.round(v.videoHeight * k);
  for (let i = 0; i < n; i++) {
    const t = (v.duration * (i + 0.5)) / n;
    await new Promise<void>((r) => {
      v.onseeked = () => r();
      v.currentTime = t;
    });
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    out.push(c.toDataURL('image/jpeg', 0.82));
  }
  URL.revokeObjectURL(url);
  return out;
}

export default function Compare() {
  const { products, policies, kbVersion, settings, aiReady, saveAnalysis, setDraft, go, toast } = useStore();
  const [pid, setPid] = useState<string | undefined>();
  const product = products.find((p) => p.id === pid);
  const [extraListing, setExtraListing] = useState<string[]>([]);
  const [useProductPhotos, setUseProductPhotos] = useState(true);
  const [frames, setFrames] = useState<string[]>([]);
  const [nFrames, setNFrames] = useState(6);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [ai, setAi] = useState<CompareResult | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState<Analysis | null>(null);

  const listing = [...(useProductPhotos ? product?.photos.map((p) => p.dataUrl) ?? [] : []), ...extraListing].slice(0, 4);

  const findings: Finding[] = (() => {
    const f: Finding[] = [];
    const label = (a: string) => ATTRS.find((x) => x[0] === a)?.[1] ?? a;
    for (const [a] of ATTRS) {
      const fromAi = ai?.itens.find((x) => x.atributo === a);
      const st = marks[a] || fromAi?.status || '';
      if (st === 'diferente' || st === 'incerto')
        f.push({
          id: `cmp${a}`,
          detectorId: 'CMP',
          field: 'imagem',
          severity: st === 'diferente' ? 'alto' : 'atencao',
          policyIds: ['EV-4', 'PR-1.1', 'CP-3.10.1'],
          title: `${st === 'diferente' ? 'Diferente do anúncio' : 'Não foi possível confirmar'}: ${label(a)}`,
          explanation:
            (fromAi?.detalhe ? `IA: ${fromAi.detalhe}. ` : '') +
            'O TikTok compara tipo, tamanho, peso, imagens e logotipos do vídeo com o anúncio vinculado. Diferença gera "promoção de produto inconsistente".',
          suggestion: st === 'diferente' ? 'Gere de novo a cena ou grave com o produto real. Não publique com esta diferença.' : 'Mostre esse detalhe de perto e em foco, ou confira manualmente.',
          fixMode: 'manual',
          humanReview: st === 'incerto' || !!fromAi,
          origin: fromAi && !marks[a] ? 'ia' : 'checklist',
        });
    }
    return f;
  })();
  const allChecked = ATTRS.every(([a]) => marks[a] || ai?.itens.some((x) => x.atributo === a));
  const level = findings.length ? riskLevel(findings) : allChecked ? 'baixo' : 'atencao';

  /** Veredito só da conferência manual (para medir a concordância com a IA). */
  const manualVerdict = (): 'compativel' | 'divergente' | 'incerto' | undefined => {
    const vals = ATTRS.map(([a]) => marks[a]).filter(Boolean);
    if (vals.length < ATTRS.length) return undefined;
    if (vals.includes('diferente')) return 'divergente';
    if (vals.includes('incerto')) return 'incerto';
    return 'compativel';
  };

  const runAI = async () => {
    setBusy('Comparando com IA…');
    setMsg('');
    try {
      setAi(await aiCompareImages(settings, listing, frames, product));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    const evidence = { listing: await Promise.all(listing.map((x) => shrink(x))), frames };
    const a: Analysis = {
      id: uid('anl'),
      createdAt: new Date().toISOString(),
      title: `Conferência anúncio x vídeo — ${product?.name ?? 'sem produto'}`,
      productId: product?.id,
      productName: product?.name,
      input: { ...emptyInput(), imagemDescricao: ai ? `Comparação com IA: ${ai.veredito}. ${ai.resumo}` : 'Comparação manual quadro a quadro.' },
      context: { ...emptyCtx(), aiProductCheck: 'conferido', aiAlteredProduct: findings.some((f) => f.severity === 'alto') ? 'sim' : 'nao' },
      findings,
      level,
      kbVersion,
      aiUsed: !!ai,
      evidence,
      compare: { ai: ai?.veredito, manual: manualVerdict() },
    };
    await saveAnalysis(a);
    setSaved(a);
    toast('Conferência salva no histórico, com as imagens como prova.');
  };

  return (
    <>
      <PageHead title="Conferir anúncio x vídeo" sub="Compare o produto do vídeo (inclusive gerado por IA) com as fotos do anúncio antes de publicar." />
      <div className="grid2">
        <Card title="1. Anúncio">
          <ProductPicker value={pid} onChange={setPid} requireGate={false} />
          {product && (
            <label className="check">
              <input type="checkbox" checked={useProductPhotos} onChange={(e) => setUseProductPhotos(e.target.checked)} /> Usar as fotos do cadastro do produto
            </label>
          )}
          <Field label="Fotos ou prints do anúncio (opcional)" hint="Print da página do produto no TikTok Shop mostrando foto, título e variação. Até 4 imagens no total.">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const fs = [...(e.target.files ?? [])];
                const imgs = await Promise.all(fs.map(async (f) => shrink(await readFile(f), 1024)));
                setExtraListing([...extraListing, ...imgs]);
                e.target.value = '';
              }}
            />
          </Field>
          <div className="thumbs">
            {listing.map((src, i) => (
              <figure key={i}><img src={src} alt={`anúncio ${i + 1}`} /></figure>
            ))}
          </div>
          {product?.listingTitle && <p className="muted sm">Título do anúncio: {product.listingTitle}</p>}
        </Card>
        <Card title="2. Vídeo">
          <Field label={`Quadros a extrair: ${nFrames}`}>
            <input type="range" min={3} max={6} value={nFrames} onChange={(e) => setNFrames(+e.target.value)} />
          </Field>
          <Field label="Arquivo do vídeo (MP4)" hint="Os quadros são tirados no seu navegador. O vídeo não é enviado para nenhum lugar.">
            <input
              type="file"
              accept="video/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy('Extraindo quadros…');
                setMsg('');
                try {
                  setFrames(await extractFrames(f, nFrames));
                  setAi(null);
                } catch (er) {
                  setMsg((er as Error).message);
                } finally {
                  setBusy('');
                }
              }}
            />
          </Field>
          <Field label="Ou envie prints do vídeo">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const fs = [...(e.target.files ?? [])].slice(0, 6);
                setFrames(await Promise.all(fs.map(async (f) => shrink(await readFile(f)))));
                setAi(null);
              }}
            />
          </Field>
          <div className="thumbs">
            {frames.map((src, i) => (
              <figure key={i}><img src={src} alt={`quadro ${i + 1}`} /></figure>
            ))}
          </div>
          {busy && <p className="notice">{busy}</p>}
          {msg && <p className="blocked sm">{msg}</p>}
        </Card>
      </div>

      {listing.length > 0 && frames.length > 0 && (
        <>
          <Card title="3. Lado a lado">
            <div className="compare">
              <div>
                <span className="field-label">Anúncio</span>
                {listing.map((src, i) => <img key={i} src={src} alt="" />)}
              </div>
              <div>
                <span className="field-label">Vídeo</span>
                <div className="frames">{frames.map((src, i) => <img key={i} src={src} alt="" />)}</div>
              </div>
            </div>
          </Card>
          <div className="grid2">
            <Card
              title="4. Conferência"
              actions={
                <button type="button" className="btn primary" disabled={!aiReady || !!busy} onClick={runAI} title={aiReady ? '' : 'Exige chave da API em Configurações'}>
                  {busy || 'Comparar com IA'}
                </button>
              }
            >
              {!aiReady && <p className="hint">Sem chave de IA: confira você mesma cada item abaixo, olhando as imagens lado a lado.</p>}
              {ai && (
                <p className={ai.veredito === 'compativel' ? 'ok' : 'blocked'}>
                  IA: {ai.veredito === 'compativel' ? 'compatível' : ai.veredito === 'divergente' ? 'divergente' : 'incerto'}. {ai.resumo}
                </p>
              )}
              {ATTRS.map(([a, l]) => {
                const fromAi = ai?.itens.find((x) => x.atributo === a);
                return (
                  <Field key={a} label={l} hint={fromAi ? `IA: ${fromAi.status} — ${fromAi.detalhe}` : undefined}>
                    <Choice
                      value={marks[a] ?? ''}
                      onChange={(v) => setMarks({ ...marks, [a]: v })}
                      options={[['igual', 'Igual'], ['diferente', 'Diferente'], ['incerto', 'Não dá para ver'], ['', fromAi ? 'Usar a da IA' : '—']]}
                    />
                  </Field>
                );
              })}
            </Card>
            <Card title="Resultado">
              <LevelPanel level={level} count={findings.length} />
              {!allChecked && !findings.length && <p className="hint">Marque todos os itens (ou use a IA) para concluir.</p>}
              {findings.map((f) => <FindingCard key={f.id} f={f} />)}
              <div className="row">
                <button type="button" className="btn" onClick={save} disabled={!allChecked && !findings.length}>
                  Salvar como prova no histórico
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setDraft({
                      productId: pid,
                      title: `Vídeo — ${product?.name ?? ''}`,
                      input: { imagemDescricao: ai ? `Conferido com IA: ${ai.resumo}` : 'Conferido manualmente com o anúncio.' },
                      context: { aiProductCheck: 'conferido', aiAlteredProduct: findings.some((f) => f.severity === 'alto') ? 'sim' : 'nao' },
                    });
                    go('analisar');
                  }}
                >
                  Continuar na análise completa
                </button>
              </div>
              {saved && (
                <p className="ok sm">
                  Salvo.{' '}
                  <button type="button" className="link" onClick={() => go('historico', saved.id)}>Abrir relatório com as imagens</button>
                </p>
              )}
              <p className="hint">
                A conferência reduz o risco, mas não garante aprovação. Guarde o relatório: ele serve de prova num recurso, mesmo se o TikTok remover os links.
              </p>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
