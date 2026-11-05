import { useEffect, useState } from 'react';
import { aiReview } from '../ai';
import { Card, Choice, Field, FindingCard, LevelPanel, PageHead, ProductPicker } from '../components/ui';
import { uid } from '../db';
import { analyzeContent, riskLevel } from '../engine/analyze';
import { useStore } from '../store';
import type { Analysis, ContentInput, ProductionContext } from '../types';

export const emptyInput = (): ContentInput => ({ roteiro: '', textoTela: '', legenda: '', hashtags: '', imagemDescricao: '' });
export const emptyCtx = (): ProductionContext => ({
  contentType: 'video', origem: '', aiDisclosure: '', virtualModel: '', aiAlteredProduct: '', demonstration: '', productShown: '',
  productMostDuration: '', linkMatch: '', presence: '', audio: '', staticContent: '', originality: '', watermark: '', layeredEditing: '',
  beautyFilter: '', thirdPartyBrandOrPerson: '', reviewScreenshot: '', sameContentOtherAccounts: '', creatorAdult: '', preRecordedInLive: '',
  screenRecording: '',
});

type Q = [keyof ProductionContext, string, [string, string][], ('video' | 'live' | 'imagem' | 'anuncio')[]?];
const YN: [string, string][] = [['nao', 'Não'], ['sim', 'Sim']];
const QUESTIONS: [string, Q[]][] = [
  ['Produto', [
    ['productShown', 'O produto aparece de forma clara?', [['claro', 'Claro, em foco'], ['parcial', 'Parcial/fundo'], ['nao', 'Não aparece']]],
    ['productMostDuration', 'O produto está presente na maior parte do conteúdo?', [['sim', 'Sim'], ['nao', 'Não']], ['video', 'live']],
    ['linkMatch', 'O produto mostrado é igual ao vinculado?', [['igual', 'Igual'], ['cor_diferente', 'Só a cor muda'], ['diferente', 'Diferente'], ['sem_link', 'Sem link']]],
  ]],
  ['Produção e IA', [
    ['origem', 'Como foi produzido?', [['gravado_real', 'Gravado real'], ['misto', 'Real + IA leve'], ['ia_parcial', 'IA significativa'], ['ia_total', '100% IA']]],
    ['aiDisclosure', 'Vai marcar como "Conteúdo gerado por IA"?', [['sim', 'Sim'], ['nao', 'Não']]],
    ['virtualModel', 'Tem modelo virtual realista?', YN],
    ['aiAlteredProduct', 'A IA mudou cor, estampa, formato, logo ou acessórios?', YN],
    ['demonstration', 'A demonstração é…', [['real', 'Real'], ['ilustrativa_rotulada', 'Ilustrativa com aviso'], ['ilustrativa_sem_rotulo', 'Ilustrativa sem aviso'], ['nenhuma', 'Não há']]],
  ]],
  ['Presença e áudio', [
    ['presence', 'Você aparece?', [['aparece_fala', 'Apareço e falo'], ['so_voz', 'Só minha voz'], ['so_maos', 'Só mãos'], ['nenhuma', 'Ninguém']]],
    ['audio', 'Áudio', [['voz_humana', 'Voz humana'], ['voz_ia', 'Voz de IA'], ['musica', 'Só música'], ['asmr', 'ASMR'], ['sem_audio', 'Sem áudio']]],
    ['staticContent', 'Imagens paradas / slides', [['nenhum', 'Nenhum'], ['parcial', 'Alguns trechos'], ['maior_parte', 'Maior parte (ou >50% da tela)']]],
  ]],
  ['Originalidade e direitos', [
    ['originality', 'Origem do material', [['original', 'Original'], ['repost_proprio', 'Repost meu'], ['terceiro_com_contribuicao', 'Terceiro + minha contribuição'], ['terceiro_sem_edicao', 'Terceiro sem edição'], ['stitch_sem_comentario', 'Costura/Dueto sem comentário']]],
    ['watermark', 'Tem marca d’água de outra plataforma?', YN],
    ['layeredEditing', 'Tem camadas, barras ou quadros inseridos?', YN],
    ['sameContentOtherAccounts', 'O mesmo conteúdo vai para outras contas?', YN],
    ['thirdPartyBrandOrPerson', 'Aparece marca/pessoa de terceiros sem permissão?', YN],
    ['reviewScreenshot', 'Usa print de avaliação de cliente?', YN],
    ['beautyFilter', 'Usa filtro de beleza?', YN],
    ['creatorAdult', 'O criador tem 18 anos ou mais?', [['sim', 'Sim'], ['nao', 'Não']]],
  ]],
  ['LIVE', [
    ['preRecordedInLive', 'Vai inserir trecho gravado?', YN, ['live']],
    ['screenRecording', 'Vai usar gravação ou captura de tela?', YN, ['live']],
  ]],
];

export default function Analyzer() {
  const { draft, setDraft, products, policies, kbVersion, settings, aiReady, saveAnalysis, go, toast } = useStore();
  const [pid, setPid] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [input, setInput] = useState<ContentInput>(emptyInput);
  const [ctx, setCtx] = useState<ProductionContext>(emptyCtx);
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

  useEffect(() => {
    if (!draft) return;
    setPid(draft.productId);
    setTitle(draft.title ?? '');
    setInput({ ...emptyInput(), ...draft.input });
    setCtx({ ...emptyCtx(), ...draft.context });
    setResult(null);
    setDraft(null);
  }, [draft, setDraft]);

  const product = products.find((p) => p.id === pid);
  const set = (k: keyof ContentInput) => ({ value: input[k], onChange: (e: { target: { value: string } }) => setInput({ ...input, [k]: e.target.value }) });

  const run = async () => {
    const r = analyzeContent(input, ctx, policies, product);
    const a: Analysis = {
      id: uid('anl'),
      createdAt: new Date().toISOString(),
      title: title || `Análise ${new Date().toLocaleString('pt-BR')}`,
      productId: product?.id,
      productName: product?.name,
      input,
      context: ctx,
      findings: r.findings,
      level: r.level,
      kbVersion,
    };
    await saveAnalysis(a);
    setResult(a);
    setAiMsg('');
    toast('Análise registrada no histórico.');
  };

  const runAI = async () => {
    if (!result) return;
    setBusy(true);
    setAiMsg('');
    try {
      const r = await aiReview(settings, input, policies, product);
      const findings = [...result.findings, ...r.findings];
      const a = { ...result, findings, level: riskLevel(findings), aiUsed: true };
      await saveAnalysis(a);
      setResult(a);
      setAiMsg(
        `IA: ${r.findings.length} alerta(s) adicional(is).` +
          (r.discarded ? ` ${r.discarded} descartado(s) por não citar regra da base.` : '') +
          (r.gaps.length ? ` Lacunas apontadas: ${r.gaps.join(' | ')}` : ''),
      );
    } catch (e) {
      setAiMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const visible = (q: Q) => !q[3] || q[3].includes(ctx.contentType);

  return (
    <>
      <PageHead title="Analisar conteúdo" sub="Verifica imagem, roteiro, texto na tela, legenda, hashtags, correspondência com o produto, IA e regras do Shop." />
      <div className="grid2 wide-left">
        <div className="stack">
          <Card title="1. Identificação">
            <ProductPicker value={pid} onChange={setPid} requireGate={false} />
            <Field label="Título da análise">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Vídeo POV garrafa — versão 1" />
            </Field>
            <Field label="Tipo de conteúdo">
              <Choice value={ctx.contentType} onChange={(v) => setCtx({ ...ctx, contentType: v })} options={[['video', 'Vídeo'], ['live', 'LIVE'], ['imagem', 'Imagem'], ['anuncio', 'Anúncio']]} />
            </Field>
          </Card>
          <Card title="2. Conteúdo">
            <div className="form">
              <Field label={ctx.contentType === 'live' ? 'Roteiro da LIVE' : 'Roteiro e fala'}>
                <textarea rows={6} {...set('roteiro')} />
              </Field>
              <Field label="Texto na tela">
                <textarea rows={2} {...set('textoTela')} />
              </Field>
              <Field label="Legenda">
                <textarea rows={3} {...set('legenda')} />
              </Field>
              <Field label="Hashtags">
                <input {...set('hashtags')} />
              </Field>
              <Field label="Imagem utilizada (descreva ou cole o prompt usado)" hint="O app não interpreta pixels. Descreva o que aparece na imagem ou vídeo.">
                <textarea rows={3} {...set('imagemDescricao')} />
              </Field>
            </div>
          </Card>
          <Card title="3. Checklist de produção">
            {QUESTIONS.map(([g, qs]) => {
              const vis = qs.filter(visible);
              if (!vis.length) return null;
              return (
                <fieldset key={g} className="qgroup">
                  <legend>{g}</legend>
                  {vis.map(([k, label, opts]) => (
                    <Field key={k} label={label}>
                      <Choice value={ctx[k] as string} onChange={(v) => setCtx({ ...ctx, [k]: v })} options={opts} />
                    </Field>
                  ))}
                </fieldset>
              );
            })}
          </Card>
          <button type="button" className="btn primary block big" onClick={run}>
            Analisar e registrar
          </button>
        </div>

        <div className="stack sticky">
          <Card title="Resultado">
            {!result && <p className="muted">Preencha e clique em “Analisar e registrar”.</p>}
            {result && (
              <>
                <LevelPanel level={result.level} count={result.findings.length} />
                <div className="row">
                  {result.findings.some((f) => f.fixMode !== 'manual' || f.suggestion) && (
                    <button type="button" className="btn primary" onClick={() => go('corrigir', result.id)}>
                      Corrigir riscos
                    </button>
                  )}
                  <button type="button" className="btn" onClick={runAI} disabled={busy}>
                    {busy ? 'Analisando com IA…' : 'Análise complementar com IA'}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => go('historico', result.id)}>
                    Ver no histórico / exportar
                  </button>
                </div>
                {!aiReady && <p className="hint">A análise com IA é opcional e ainda não está configurada.</p>}
                {aiMsg && <p className="notice">{aiMsg}</p>}
                {result.findings
                  .slice()
                  .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'alto' ? -1 : 1))
                  .map((f) => (
                    <FindingCard key={f.id} f={f} />
                  ))}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
