# Arquitetura do TikTok Shop Safe AI

## Princípio
**Primeiro conformidade, depois criação e publicação.** Nenhum gerador funciona com produto bloqueado. Toda análise cita a regra e a fonte.

## Fluxo completo

```
[1] Cadastrar produto ──► [2] Análise do produto (portão)
                               │
                 🔴 bloqueado ──┤── 🟡 ressalvas → confirmar ciência
                               │
                               ▼ 🟢 liberado
[3] Criar: imagem · vídeo Flow · roteiro · legenda · LIVE
        (verificação rápida do texto em tempo real)
                               │
                               ▼
[4] Analisar conteúdo: 5 campos de texto + checklist de produção (21 perguntas)
        → regras (detectores) + checklist + IA opcional
        → 🟢 / 🟡 / 🔴 → registrado no histórico
                               │
                 🟡/🔴 ────────┤
                               ▼
[5] Corrigir riscos: original x corrigido, por trecho, com regra e fonte
        → editar → "Aplicar e reanalisar" (nova versão ligada à anterior)
                               │
                               ▼ 🟢
[6] Exportar relatório → publicar no TikTok (fora do app)
```

## Camadas

| Camada | Arquivo | Função |
|---|---|---|
| Base de conhecimento | `src/data/sources.ts`, `src/data/policies.ts` | Documentos e regras com trecho literal, fonte, data, versão, status |
| Motor de regras | `src/engine/detectors.ts` | 33 detectores de texto. Cada um aponta para regras. Regra desativada = detector desligado |
| Análise | `src/engine/analyze.ts` | Texto + checklist → alertas, nível de risco, correções |
| Portão do produto | `src/engine/productGate.ts` | Análise do cadastro. Libera ou bloqueia a criação |
| Geradores | `src/engine/generators.ts` | Prompts e roteiros. Usam **só** dados cadastrados |
| IA (opcional) | `src/ai.ts` | Claude via API: análise complementar, reescrita, extração de regras |
| Persistência | `src/db.ts` | IndexedDB no navegador + backup/importação JSON |
| Interface | `src/pages/*`, `src/components/ui.tsx` | 13 telas em React |
| Relatórios | `src/report.ts` | HTML, impressão/PDF e JSON |

## Proteções contra "inventar regras"
1. Cada alerta exige ao menos uma regra existente na base.
2. Alertas da IA que citam regra inexistente são **descartados** (e contados).
3. Regras extraídas por IA só entram após revisão da usuária. Se o trecho não aparece literalmente no documento, entram como "pendente de verificação".
4. Regras de fonte não oficial ficam marcadas como "pendente de verificação" em todas as telas.
5. O nível 🟢 nunca é apresentado como aprovação. O aviso aparece em toda análise.

## Atualizar a base (quando chegarem novas políticas)
1. Biblioteca de políticas → **Enviar novo documento** (DOCX/TXT/MD extraem texto; PDF/imagem: colar texto).
2. Registrar título, data, origem (oficial ou não) e link.
3. Selecionar o trecho e **Nova regra com o trecho selecionado**, ou **Sugerir regras com IA** e revisar uma a uma.
4. Para regras antigas: editar e marcar como "Substituída" ou "Revogada". Cada edição cria nova versão.
5. Termos de risco cadastrados numa regra passam a gerar alertas automaticamente.
6. A versão da base sobe. Produtos analisados em versão antiga mostram "base desatualizada" e podem ser reanalisados em lote.

## Dependências externas (o que NÃO está simulado)

| Função | Status | O que precisa |
|---|---|---|
| Análise por regras, geradores, histórico, relatórios | ✅ Funciona offline | Nada |
| Análise complementar e reescrita com IA | ✅ Implementado, opcional | Chave da API da Anthropic (paga por uso) |
| Extração de regras de documentos com IA | ✅ Implementado, opcional | Mesma chave |
| Gerar imagens dentro do app | ❌ Não implementado | API de imagem (ex.: Google Gemini/Imagen) + chave + servidor para proteger a chave |
| Gerar vídeo no Google Flow pelo app | ❌ Não existe API pública do Flow para isso nesta data | O app gera o prompt; a geração é feita no Flow |
| Ler pixels de imagem/vídeo | ❌ Não implementado | Modelo de visão (possível via Claude com envio da imagem) |
| Texto de PDF | ❌ Não extrai automaticamente | Biblioteca pdf.js (pode ser adicionada) |
| Sincronizar entre computadores / equipe | ❌ Dados ficam no navegador | Backend (ex.: Supabase/Firebase) + login |
| Consultar status da conta no TikTok | ❌ | API oficial do TikTok Shop (Partner) |

## Próximas evoluções recomendadas
1. **Visão computacional:** enviar a foto real + a imagem gerada para a IA comparar e apontar divergências (cor, logo, estampa).
2. **Backend com login** para equipe e sincronização, guardando a chave de API no servidor.
3. **pdf.js** para extrair texto de PDFs de política.
4. **Integração de geração de imagem** via API, mantendo o portão e a análise obrigatória.
