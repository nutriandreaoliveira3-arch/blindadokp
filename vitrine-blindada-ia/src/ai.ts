import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { plain } from './engine/normalize';
import { api, isCloud } from './mode';
import type { ContentField, ContentInput, Finding, Policy, Product, Settings } from './types';

// Integração OPCIONAL com IA: Claude (Anthropic) ou Gemini (Google).
// Só funciona com uma chave de API própria, cadastrada em Configurações.
// A chave fica salva apenas neste navegador e as chamadas saem direto do navegador para a API.
// Regra de ouro: a IA só pode citar regras que existem na biblioteca. Citações inválidas são descartadas.

export class AiUnavailable extends Error {}

function client(s: Settings) {
  if (!s.apiKey) throw new AiUnavailable('Cadastre sua chave da API da Anthropic em Configurações para usar a IA.');
  return new Anthropic({ apiKey: s.apiKey, dangerouslyAllowBrowser: true });
}

function kb(policies: Policy[]) {
  return policies
    .filter((p) => p.status === 'ativa' || p.status === 'pendente_verificacao')
    .map((p) => `[${p.id}]${p.status === 'pendente_verificacao' ? ' (PENDENTE DE VERIFICAÇÃO)' : ''} ${p.title} — ${p.excerpt}`)
    .join('\n');
}

const SYSTEM = `Você é um revisor de conformidade de conteúdo para o TikTok Shop Brasil.
Regras obrigatórias:
- Use SOMENTE as regras da BASE fornecida. Cite cada regra pelo código entre colchetes, exatamente como está.
- Não invente regras, interpretações sem fundamento, nem afirme que o TikTok vai aprovar algo.
- Se a regra relevante não estiver na base, não crie alerta; registre em "lacunas".
- Nunca sugira formas de enganar a moderação, esconder violações ou burlar detecção.
- Preserve o potencial comercial: proponha alternativas persuasivas e verdadeiras, usando apenas dados do produto informados.
- Responda em português do Brasil, frases curtas.`;

const ReviewSchema = z.object({
  alertas: z.array(
    z.object({
      campo: z.enum(['roteiro', 'textoTela', 'legenda', 'hashtags', 'imagem', 'producao']),
      trecho: z.string(),
      gravidade: z.enum(['alto', 'atencao']),
      regras: z.array(z.string()),
      titulo: z.string(),
      explicacao: z.string(),
      correcao: z.string(),
    }),
  ),
  lacunas: z.array(z.string()),
});

function guardStop(r: { stop_reason: string | null }) {
  if (r.stop_reason === 'refusal') throw new Error('A IA recusou esta solicitação. Use a análise por regras.');
  if (r.stop_reason === 'max_tokens') throw new Error('Resposta da IA incompleta (limite de tamanho). Tente com um texto menor.');
}

// ───────── Chamada genérica: Claude (Anthropic) ou Gemini (Google)
type Part = string | { image: string };

function aiProvider(s: Settings) {
  return s.provider === 'gemini' ? 'gemini' : 'anthropic';
}

export function aiConfigured(s: Settings) {
  return aiProvider(s) === 'gemini' ? !!s.geminiKey : !!s.apiKey;
}

async function ask<T>(s: Settings, o: { system: string; parts: Part[]; schema: z.ZodType<T>; maxTokens: number; vision?: boolean }): Promise<T> {
  if (aiProvider(s) === 'gemini') return askGemini(s, o);
  const c = client(s);
  const content = o.parts.map((p) => (typeof p === 'string' ? { type: 'text' as const, text: p } : b64(p.image)));
  const r = await c.messages.parse({
    model: o.vision ? s.visionModel || 'claude-sonnet-5-5' : s.model,
    max_tokens: o.maxTokens,
    system: o.system,
    output_config: o.vision ? { format: zodOutputFormat(o.schema) } : { effort: s.effort, format: zodOutputFormat(o.schema) },
    messages: [{ role: 'user', content }],
  });
  guardStop(r);
  if (!r.parsed_output) throw new Error('A IA não retornou um resultado válido.');
  return r.parsed_output as T;
}

/** Gemini via API REST oficial (generativelanguage.googleapis.com). A resposta é validada com o mesmo esquema. */
async function askGemini<T>(s: Settings, o: { system: string; parts: Part[]; schema: z.ZodType<T>; maxTokens: number }): Promise<T> {
  if (!s.geminiKey) throw new AiUnavailable('Cadastre sua chave do Google Gemini em Configurações para usar a IA.');
  const model = s.geminiModel || 'gemini-2.5-flash';
  const jsonSchema = JSON.stringify(z.toJSONSchema(o.schema));
  const parts = [
    ...o.parts.map((p) => {
      if (typeof p === 'string') return { text: p };
      const m = p.image.match(/^data:(image\/[a-z]+);base64,(.*)$/);
      if (!m) throw new Error('Imagem inválida.');
      return { inline_data: { mime_type: m[1], data: m[2] } };
    }),
    { text: `Responda SOMENTE com um JSON válido que siga exatamente este JSON Schema:\n${jsonSchema}` },
  ];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': s.geminiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: o.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: o.maxTokens },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok) throw new Error(`Gemini: ${data.error?.message ?? `erro ${res.status}`}`);
  if (data.promptFeedback?.blockReason) throw new Error('O Gemini recusou esta solicitação. Use a análise por regras.');
  const cand = data.candidates?.[0];
  if (cand?.finishReason === 'MAX_TOKENS') throw new Error('Resposta da IA incompleta (limite de tamanho). Tente com um texto menor.');
  const text = cand?.content?.parts?.map((x) => x.text ?? '').join('') ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new Error('O Gemini não retornou um JSON válido. Tente de novo.');
  }
  const v = o.schema.safeParse(parsed);
  if (!v.success) throw new Error('A resposta do Gemini veio fora do formato esperado. Tente de novo.');
  return v.data;
}

export async function aiReview(
  s: Settings,
  input: ContentInput,
  policies: Policy[],
  product?: Product,
): Promise<{ findings: Finding[]; gaps: string[]; discarded: number }> {
  if (isCloud()) return api('/api/ai/review', { method: 'POST', body: JSON.stringify({ input, product }) });
  const user = `BASE DE REGRAS:\n${kb(policies)}\n\nPRODUTO:\n${product ? JSON.stringify({ nome: product.name, categoria: product.category, marca: product.brand, descricao: product.description, especificacoes: product.specs, beneficios_comprovaveis: product.benefits }) : 'não informado'}\n\nCONTEÚDO:\nRoteiro/fala: ${input.roteiro}\nTexto na tela: ${input.textoTela}\nLegenda: ${input.legenda}\nHashtags: ${input.hashtags}\nImagem (descrição): ${input.imagemDescricao}\n\nTarefa: aponte riscos que uma análise por palavras-chave poderia perder (sentido implícito, combinação de elementos, promessa indireta). Para cada alerta, copie o trecho exato e proponha a correção.`;
  const out = await ask(s, { system: SYSTEM, parts: [user], schema: ReviewSchema, maxTokens: 16000 });
  const valid = new Set(policies.map((p) => p.id));
  let discarded = 0;
  const findings: Finding[] = [];
  for (const a of out.alertas) {
    const regras = a.regras.map((x) => x.replace(/[[\]]/g, '').trim()).filter((x) => valid.has(x));
    if (!regras.length) {
      discarded++;
      continue; // sem regra válida = descartado (não inventar)
    }
    const field = a.campo as ContentField;
    const src = field === 'imagem' ? input.imagemDescricao : field === 'producao' ? '' : (input as unknown as Record<string, string>)[field] ?? '';
    const pos = a.trecho ? src.indexOf(a.trecho) : -1;
    findings.push({
      id: `ai${Date.now().toString(36)}${findings.length}`,
      detectorId: 'IA',
      field,
      excerpt: a.trecho,
      start: pos >= 0 ? pos : undefined,
      end: pos >= 0 ? pos + a.trecho.length : undefined,
      severity: a.gravidade,
      policyIds: regras,
      title: a.titulo,
      explanation: a.explicacao,
      suggestion: a.correcao,
      fixMode: pos >= 0 ? 'match' : 'manual',
      humanReview: true,
      origin: 'ia',
    });
  }
  return { findings, gaps: out.lacunas, discarded };
}

const RewriteSchema = z.object({ texto: z.string(), mudancas: z.array(z.string()) });

export async function aiRewrite(s: Settings, text: string, findings: Finding[], policies: Policy[], product?: Product): Promise<{ texto: string; mudancas: string[] }> {
  if (isCloud()) return api('/api/ai/rewrite', { method: 'POST', body: JSON.stringify({ text, findings, product }) });
  const issues = findings.map((f) => `- "${f.excerpt ?? ''}" → ${f.title} [${f.policyIds.join(', ')}]`).join('\n');
  return ask(s, { system: SYSTEM, parts: [`BASE DE REGRAS:\n${kb(policies)}\n\nPRODUTO (use apenas estes dados):\n${product ? `${product.name} | ${product.brand} | ${product.specs} | Benefícios comprováveis: ${product.benefits}` : 'não informado'}\n\nPROBLEMAS:\n${issues}\n\nTEXTO ORIGINAL:\n${text}\n\nReescreva o texto corrigindo todos os problemas, mantendo tom, ritmo e força de venda. Não acrescente benefícios que não estejam nos dados do produto. Liste as mudanças feitas.`], schema: RewriteSchema, maxTokens: 16000 });
}

const ExtractSchema = z.object({
  regras: z.array(
    z.object({
      titulo: z.string(),
      categoria: z.string(),
      tipo: z.enum(['proibicao', 'restricao', 'exigencia', 'recomendacao', 'procedimento']),
      aplica: z.array(z.enum(['video', 'live', 'imagem', 'legenda', 'hashtag', 'afiliado', 'ia', 'anuncio', 'produto'])),
      secao: z.string(),
      trecho_literal: z.string(),
    }),
  ),
});

export type ExtractedRule = z.infer<typeof ExtractSchema>['regras'][number] & { literal: boolean };

/** Sugere regras a partir de um documento. Cada sugestão precisa ser revisada e confirmada pela usuária. */
export async function aiExtractPolicies(s: Settings, docText: string, categories: string[]): Promise<ExtractedRule[]> {
  if (isCloud()) return api('/api/ai/extract', { method: 'POST', body: JSON.stringify({ text: docText }) });
  const out = await ask(s, { system: SYSTEM, parts: [`Extraia as regras deste documento de política. Para cada regra copie o trecho LITERAL (sem resumir). Use uma destas categorias quando couber: ${categories.join('; ')}.\n\nDOCUMENTO:\n${docText}`], schema: ExtractSchema, maxTokens: 32000 });
  const doc = plain(docText).replace(/\s+/g, ' ');
  // Marca se o trecho é realmente literal (proteção contra regra inventada)
  return out.regras.map((x) => ({
    ...x,
    literal: doc.includes(plain(x.trecho_literal).replace(/\s+/g, ' ').slice(0, 120)),
  }));
}

// ───────── Comparação visual anúncio x vídeo
const CompareSchema = z.object({
  itens: z.array(
    z.object({
      atributo: z.enum(['tipo', 'cor', 'estampa', 'logo_rotulo', 'formato', 'quantidade_pecas', 'detalhes', 'itens_extras', 'texto_na_imagem']),
      status: z.enum(['igual', 'diferente', 'incerto']),
      detalhe: z.string(),
    }),
  ),
  veredito: z.enum(['compativel', 'divergente', 'incerto']),
  resumo: z.string(),
});
export type CompareResult = z.infer<typeof CompareSchema>;

const b64 = (dataUrl: string) => {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.*)$/);
  if (!m) throw new Error('Imagem inválida.');
  return { type: 'image' as const, source: { type: 'base64' as const, media_type: m[1] as 'image/jpeg', data: m[2] } };
};

/** Compara fotos do anúncio com quadros do vídeo. Não decide aprovação: só aponta diferenças visíveis. */
export async function aiCompareImages(s: Settings, listing: string[], frames: string[], product?: Product): Promise<CompareResult> {
  if (isCloud()) return api('/api/ai/compare', { method: 'POST', body: JSON.stringify({ listing, frames, product }) });
  const parts: Part[] = [`FOTOS DO ANÚNCIO (referência oficial)${product ? ` — ${product.listingTitle || product.name}` : ''}:`, ...listing.map((image) => ({ image })), 'QUADROS DO VÍDEO:', ...frames.map((image) => ({ image })), `Compare o produto dos quadros do vídeo com o produto das fotos do anúncio. Para cada atributo (tipo, cor, estampa, logo_rotulo, formato, quantidade_pecas, detalhes como costura/recortes/bolsos/alças, itens_extras que não existem no anúncio, texto_na_imagem), diga igual, diferente ou incerto, com o detalhe observado e em qual quadro. Seja rigoroso: diferença pequena de logo, estampa, costura ou número de peças conta como diferente. Não avalie a qualidade do vídeo nem dê opinião sobre aprovação do TikTok.${product ? ` Dados do anúncio: título "${product.listingTitle ?? ''}", especificações: ${product.specs}.` : ''}`];
  return ask(s, { system: 'Você é um conferente visual de produtos para e-commerce. Responda em português do Brasil, frases curtas, apenas sobre o que é visível.', parts, schema: CompareSchema, maxTokens: 8000, vision: true });
}
