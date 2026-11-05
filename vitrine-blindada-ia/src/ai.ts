import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { plain } from './engine/normalize';
import { api, isCloud } from './mode';
import type { ContentField, ContentInput, Finding, Policy, Product, Settings } from './types';

// Integração OPCIONAL com a API da Anthropic (Claude).
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

export async function aiReview(
  s: Settings,
  input: ContentInput,
  policies: Policy[],
  product?: Product,
): Promise<{ findings: Finding[]; gaps: string[]; discarded: number }> {
  if (isCloud()) return api('/api/ai/review', { method: 'POST', body: JSON.stringify({ input, product }) });
  const c = client(s);
  const user = `BASE DE REGRAS:\n${kb(policies)}\n\nPRODUTO:\n${product ? JSON.stringify({ nome: product.name, categoria: product.category, marca: product.brand, descricao: product.description, especificacoes: product.specs, beneficios_comprovaveis: product.benefits }) : 'não informado'}\n\nCONTEÚDO:\nRoteiro/fala: ${input.roteiro}\nTexto na tela: ${input.textoTela}\nLegenda: ${input.legenda}\nHashtags: ${input.hashtags}\nImagem (descrição): ${input.imagemDescricao}\n\nTarefa: aponte riscos que uma análise por palavras-chave poderia perder (sentido implícito, combinação de elementos, promessa indireta). Para cada alerta, copie o trecho exato e proponha a correção.`;
  const r = await c.messages.parse({
    model: s.model,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: s.effort, format: zodOutputFormat(ReviewSchema) },
    messages: [{ role: 'user', content: user }],
  });
  guardStop(r);
  const out = r.parsed_output;
  if (!out) throw new Error('A IA não retornou um resultado válido.');
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
  const c = client(s);
  const issues = findings.map((f) => `- "${f.excerpt ?? ''}" → ${f.title} [${f.policyIds.join(', ')}]`).join('\n');
  const r = await c.messages.parse({
    model: s.model,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: s.effort, format: zodOutputFormat(RewriteSchema) },
    messages: [
      {
        role: 'user',
        content: `BASE DE REGRAS:\n${kb(policies)}\n\nPRODUTO (use apenas estes dados):\n${product ? `${product.name} | ${product.brand} | ${product.specs} | Benefícios comprováveis: ${product.benefits}` : 'não informado'}\n\nPROBLEMAS:\n${issues}\n\nTEXTO ORIGINAL:\n${text}\n\nReescreva o texto corrigindo todos os problemas, mantendo tom, ritmo e força de venda. Não acrescente benefícios que não estejam nos dados do produto. Liste as mudanças feitas.`,
      },
    ],
  });
  guardStop(r);
  if (!r.parsed_output) throw new Error('A IA não retornou um resultado válido.');
  return r.parsed_output;
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
  const c = client(s);
  const r = await c.messages.parse({
    model: s.model,
    max_tokens: 32000,
    system: SYSTEM,
    output_config: { effort: s.effort, format: zodOutputFormat(ExtractSchema) },
    messages: [
      {
        role: 'user',
        content: `Extraia as regras deste documento de política. Para cada regra copie o trecho LITERAL (sem resumir). Use uma destas categorias quando couber: ${categories.join('; ')}.\n\nDOCUMENTO:\n${docText}`,
      },
    ],
  });
  guardStop(r);
  if (!r.parsed_output) throw new Error('A IA não retornou um resultado válido.');
  const doc = plain(docText).replace(/\s+/g, ' ');
  // Marca se o trecho é realmente literal (proteção contra regra inventada)
  return r.parsed_output.regras.map((x) => ({
    ...x,
    literal: doc.includes(plain(x.trecho_literal).replace(/\s+/g, ' ').slice(0, 120)),
  }));
}
