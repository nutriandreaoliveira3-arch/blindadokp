# Blindada Intelligence™ v2

Máquina de prospecção própria do Emagrecimento Blindado: sem mensalidade e sem Apollo, Clay ou Origami.
Especificação completa: [`../entregas/maquina-prospeccao/especificacao.md`](../entregas/maquina-prospeccao/especificacao.md).

## O que já funciona (Fase 1)
- **Hoje**: follow-ups vencidos, quem abordar hoje (score ≥ 55) e quem aquecer.
- **Leads**: lista e pipeline, busca, filtro por prioridade e etapa.
- **Score Blindada (0–100)**: Poder de compra (40) + Proximidade e intenção (35) + Contato (25), explicado critério por critério.
- **Sinais com 1 clique**: segue, interagiu, respondeu, indicação, bem-estar.
- **Revisar**: fila que separa pessoa × fonte. Só pessoa vira lead.
- **Importar CSV** (vírgula ou ponto e vírgula; colunas reconhecidas automaticamente). Duplicados e "Não contatar" são ignorados.
- **Exportar**: formato da planilha do funil ou backup completo.
- **Privacidade**: fonte e data registradas, retenção configurável (90 dias), "Remover e não contatar mais".
- **Painel** e **Configurações** (link do formulário, retenção, limpar dados de teste).

## Fase 2 (construída, aguardando a chave ser validada)
- **Descobrir**: busca grátis (Tavily) com cache de 24 h e trava mensal (900). Separa pessoa × matéria, extrai nome, cargo, empresa, e-mail nominal, telefone, Instagram e UF, e manda tudo para **Revisar**.
- Segredo de produção: `TAVILY_API_KEY` nas variáveis seguras do Cloudflare. Localmente, em `.dev.vars` (fora do Git).

## Próximas fases
3. Mensagens por profissão + sequência de aquecimento.
4. Publicação no Cloudflare com login (Cloudflare Access).

## Rodar localmente
```bash
npm install
npx wrangler d1 execute blindada --local --file=schema.sql
npx wrangler d1 execute blindada --local --file=seed.sql   # dados fictícios (opcional)
npm run dev        # http://localhost:8788
npm test           # testes do score
```

## Estrutura
| Caminho | O que é |
|---|---|
| `public/` | Interface (HTML, CSS e JS puro, sem build) |
| `functions/api/[[path]].js` | API (Cloudflare Pages Functions) |
| `functions/lib/score.js` | Regra única do Score Blindada |
| `schema.sql` / `seed.sql` | Banco (D1/SQLite) e dados fictícios |
| `tests/` | Testes automáticos do score |

## Regras que o código garante
- Não infere saúde, peso, aparência, idade, gênero ou renda pessoal.
- Dados ausentes valem zero no score.
- Nenhum envio automático de mensagens.
- Nenhuma chave ou senha fica no código: segredos vão para as variáveis seguras do Cloudflare.

## Publicação (Cloudflare Pages)
- Site: https://blindada-intelligence.pages.dev · Banco D1: `blindada`.
- Publicar uma nova versão: `node scripts/build-worker.mjs` gera `dist/_worker.js` (API + interface num arquivo só), enviado ao projeto Pages pelo modo avançado.
- Segredo `TAVILY_API_KEY`: configurado no painel do Cloudflare (Settings → Variables and Secrets), nunca no código.
- Login: Cloudflare Access (Zero Trust), liberado só para o e-mail autorizado.
