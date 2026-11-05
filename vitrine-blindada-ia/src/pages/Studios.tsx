import { useMemo, useState } from 'react';
import { Card, Choice, CopyButton, Field, FindingCard, PageHead, ProductPicker, useGate } from '../components/ui';
import { scanText } from '../engine/analyze';
import {
  captionAndTags,
  imagePrompt,
  salesScript,
  videoPrompt,
  type Hook,
  type ImagePromptOptions,
  type VideoPromptOptions,
} from '../engine/generators';
import { useStore } from '../store';

function Locked() {
  return <p className="muted">Selecione um produto liberado na análise de cadastro para gerar o conteúdo.</p>;
}

function Output({ title, text }: { title: string; text: string }) {
  return (
    <div className="out">
      <div className="out-head">
        <b>{title}</b>
        <CopyButton text={text} />
      </div>
      <pre>{text}</pre>
    </div>
  );
}

function QuickCheck({ text, field }: { text: string; field: 'roteiro' | 'legenda' | 'hashtags' }) {
  const { policies } = useStore();
  const f = useMemo(() => scanText(text, field, policies), [text, field, policies]);
  if (!f.length) return <p className="ok sm">✅ Verificação rápida do texto: nenhum termo de risco.</p>;
  return (
    <div>
      <p className="blocked sm">Verificação rápida encontrou {f.length} ponto(s):</p>
      {f.map((x) => (
        <FindingCard key={x.id} f={x} />
      ))}
    </div>
  );
}

function usePid() {
  const { param, draft } = useStore();
  return useState<string | undefined>(param?.startsWith('prd_') ? param : draft?.productId);
}

// ─────────────── Imagem
export function ImageStudio() {
  const [pid, setPid] = usePid();
  const { product, ok } = useGate(pid);
  const [o, setO] = useState<ImagePromptOptions>({ purpose: 'lifestyle', scene: '', lighting: '', aspect: '9:16', showPerson: false });
  const out = product && ok ? imagePrompt(product, o) : null;
  return (
    <>
      <PageHead title="Criar imagem" sub="Prompts para ferramentas externas, travando a identidade visual do produto real." />
      <div className="grid2 wide-left">
        <Card title="Configuração">
          <ProductPicker value={pid} onChange={setPid} />
          {product && ok && (
            <div className="form">
              <div className="thumbs">
                {product.photos.map((ph) => (
                  <figure key={ph.id}>
                    <img src={ph.dataUrl} alt={ph.name} />
                  </figure>
                ))}
              </div>
              <Field label="Finalidade">
                <Choice
                  value={o.purpose}
                  onChange={(v) => setO({ ...o, purpose: v })}
                  options={[['vitrine', 'Vitrine'], ['lifestyle', 'Em uso'], ['detalhe', 'Detalhe'], ['capa_video', 'Capa de vídeo']]}
                />
              </Field>
              <Field label="Formato">
                <Choice value={o.aspect} onChange={(v) => setO({ ...o, aspect: v })} options={[['9:16', '9:16'], ['4:5', '4:5'], ['1:1', '1:1']]} />
              </Field>
              <Field label="Cenário (em inglês ou português)">
                <input value={o.scene} onChange={(e) => setO({ ...o, scene: e.target.value })} placeholder="kitchen counter, morning" />
              </Field>
              <Field label="Iluminação">
                <input value={o.lighting} onChange={(e) => setO({ ...o, lighting: e.target.value })} placeholder="soft daylight" />
              </Field>
              <label className="check">
                <input type="checkbox" checked={o.showPerson} onChange={(e) => setO({ ...o, showPerson: e.target.checked })} /> Mostrar mãos/pessoa usando
              </label>
            </div>
          )}
        </Card>
        <Card title="Prompt">
          {out ? (
            <>
              <Output title="Prompt (inglês)" text={out.en} />
              <Output title="Instruções e avisos" text={out.pt} />
              <div className="notice">
                <b>Integração com gerador de imagens:</b> não está ativa. Gerar imagens dentro do app exige uma API externa paga (por exemplo,
                Google Gemini/Imagen ou similar) e credenciais próprias. A arquitetura já está preparada (ver docs/ARQUITETURA.md). Por enquanto,
                use o prompt em Google Flow, Gemini, ChatGPT ou outra ferramenta.
              </div>
            </>
          ) : (
            <Locked />
          )}
        </Card>
      </div>
    </>
  );
}

// ─────────────── Vídeo
export function VideoStudio() {
  const [pid, setPid] = usePid();
  const { product, ok } = useGate(pid);
  const { setDraft, go } = useStore();
  const [o, setO] = useState<VideoPromptOptions>({ style: 'pov', duration: 8, scene: '', camera: '', lighting: '', person: 'maos', action: '', noSample: true, variant: '' });
  const out = product && ok ? videoPrompt(product, o) : null;
  return (
    <>
      <PageHead title="Gerar prompt de vídeo — Google Flow" sub="Vertical 9:16, movimento natural, fidelidade total ao produto." />
      <div className="grid2 wide-left">
        <Card title="Configuração">
          <ProductPicker value={pid} onChange={setPid} />
          {product && ok && (
            <div className="form">
              <label className="check">
                <input type="checkbox" checked={!!o.noSample} onChange={(e) => setO({ ...o, noSample: e.target.checked })} /> Não tenho amostra (vídeo por IA fiel ao anúncio)
              </label>
              {o.noSample && (
                <Field label="Cor/variação vinculada" hint="Exatamente como está na variação do anúncio.">
                  <input value={o.variant ?? ''} onChange={(e) => setO({ ...o, variant: e.target.value })} placeholder="Ex.: rosa, tamanho M" />
                </Field>
              )}
              <Field label="Estilo">
                <Choice
                  value={o.style}
                  onChange={(v) => setO({ ...o, style: v })}
                  options={[['pov', 'POV'], ['demonstracao', 'Demonstração'], ['apresentacao', 'Apresentação'], ['afiliado', 'Afiliado']]}
                />
              </Field>
              <Field label={`Duração: ${o.duration}s`}>
                <input type="range" min={4} max={30} value={o.duration} onChange={(e) => setO({ ...o, duration: +e.target.value })} />
              </Field>
              <Field label="Pessoa em cena">
                <Choice
                  value={o.person}
                  onChange={(v) => setO({ ...o, person: v })}
                  options={[['nenhuma', 'Só produto'], ['maos', 'Só mãos'], ['modelo_virtual', 'Modelo virtual']]}
                />
              </Field>
              <Field label="Ação (o que acontece)">
                <input value={o.action} onChange={(e) => setO({ ...o, action: e.target.value })} placeholder="pouring hot coffee into the bottle and closing the lid" />
              </Field>
              <Field label="Cenário">
                <input value={o.scene} onChange={(e) => setO({ ...o, scene: e.target.value })} />
              </Field>
              <Field label="Câmera">
                <input value={o.camera} onChange={(e) => setO({ ...o, camera: e.target.value })} placeholder="slow push-in, eye level" />
              </Field>
              <Field label="Iluminação">
                <input value={o.lighting} onChange={(e) => setO({ ...o, lighting: e.target.value })} />
              </Field>
            </div>
          )}
        </Card>
        <Card title="Prompt para o Flow">
          {out ? (
            <>
              <Output title="Prompt (inglês)" text={out.en} />
              <Output title="Narração e avisos" text={out.pt} />
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setDraft({
                    productId: pid,
                    title: `Vídeo ${o.style} — ${product!.name}`,
                    input: { imagemDescricao: out.en, roteiro: out.pt.split('\n')[3] ?? '' },
                    context: { contentType: 'video', origem: 'ia_total', virtualModel: o.person === 'modelo_virtual' ? 'sim' : 'nao' },
                  });
                  go('analisar');
                }}
              >
                Enviar para análise
              </button>
              <button type="button" className="btn" onClick={() => go('comparar')}>
                Conferir anúncio x vídeo
              </button>
            </>
          ) : (
            <Locked />
          )}
        </Card>
      </div>
    </>
  );
}

// ─────────────── Roteiro
export function ScriptStudio() {
  const [pid, setPid] = usePid();
  const { product, ok } = useGate(pid);
  const { setDraft, go } = useStore();
  const [hook, setHook] = useState<Hook>('demonstracao');
  const [sec, setSec] = useState(30);
  const gen = product && ok ? salesScript(product, hook, sec) : null;
  const base = gen?.script ?? '';
  const [text, setText] = useState('');
  const shown = text || base;
  return (
    <>
      <PageHead title="Criar roteiro de vendas" sub="Usa só características e benefícios comprováveis do cadastro." />
      <div className="grid2 wide-left">
        <Card title="Configuração">
          <ProductPicker value={pid} onChange={(v) => { setPid(v); setText(''); }} />
          {product && ok && (
            <div className="form">
              <Field label="Gancho">
                <Choice value={hook} onChange={(v) => { setHook(v); setText(''); }} options={[['demonstracao', 'Demonstração'], ['pergunta', 'Pergunta'], ['problema', 'Situação de uso'], ['curiosidade', 'Curiosidade']]} />
              </Field>
              <Field label={`Duração: ${sec}s`}>
                <input type="range" min={8} max={90} step={1} value={sec} onChange={(e) => { setSec(+e.target.value); setText(''); }} />
              </Field>
            </div>
          )}
        </Card>
        <Card title="Roteiro" actions={shown ? <CopyButton text={shown} /> : undefined}>
          {product && ok ? (
            <>
              <textarea className="mono" rows={18} value={shown} onChange={(e) => setText(e.target.value)} />
              <QuickCheck text={shown} field="roteiro" />
              {gen && <pre className="rules">{gen.tips}</pre>}
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setDraft({ productId: pid, title: `Roteiro — ${product.name}`, input: { roteiro: shown }, context: { contentType: 'video' } });
                  go('analisar');
                }}
              >
                Enviar para análise completa
              </button>
            </>
          ) : (
            <Locked />
          )}
        </Card>
      </div>
    </>
  );
}

// ─────────────── Legenda
export function CaptionStudio() {
  const [pid, setPid] = usePid();
  const { product, ok } = useGate(pid);
  const { setDraft, go } = useStore();
  const [extra, setExtra] = useState('');
  const out = product && ok ? captionAndTags(product, extra) : null;
  const [cap, setCap] = useState<string | null>(null);
  const caption = cap ?? out?.caption ?? '';
  return (
    <>
      <PageHead title="Criar legenda e hashtags" />
      <div className="grid2 wide-left">
        <Card title="Configuração">
          <ProductPicker value={pid} onChange={(v) => { setPid(v); setCap(null); }} />
          {product && ok && (
            <Field label="Hashtags extras" hint="Separadas por espaço. Hashtags de peso, dieta e marcas de terceiros são filtradas.">
              <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="#cozinha #organizacao" />
            </Field>
          )}
        </Card>
        <Card title="Resultado">
          {out ? (
            <>
              <Field label="Legenda">
                <textarea rows={4} value={caption} onChange={(e) => setCap(e.target.value)} />
              </Field>
              <div className="row">
                <CopyButton text={caption} label="Copiar legenda" />
                <CopyButton text={out.tags} label="Copiar hashtags" />
              </div>
              <pre>{out.tags}</pre>
              {out.removed.length > 0 && (
                <p className="blocked sm">Removidas por risco: {out.removed.map((x) => '#' + x).join(' ')} (WL-2, PR-4.2)</p>
              )}
              <QuickCheck text={caption} field="legenda" />
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setDraft({ productId: pid, title: `Legenda — ${product!.name}`, input: { legenda: caption, hashtags: out.tags } });
                  go('analisar');
                }}
              >
                Enviar para análise completa
              </button>
            </>
          ) : (
            <Locked />
          )}
        </Card>
      </div>
    </>
  );
}
