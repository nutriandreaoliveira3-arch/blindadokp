# Blindada Intelligence™ v2: especificação da reconstrução

> Base: 65 prints do app atual (ChatGPT Sites), lidos em 08/11/2026.
> Objetivo: app próprio, sem mensalidade, que substitui Apollo, Clay e Origami no que importa.

## 1. Retrato do app atual

| Área | O que existe | Situação |
|---|---|---|
| Base | 371 leads (368 "Novo lead", 2 Pesquisado, 1 Qualificado) | **0 contatados, 0 respostas** |
| Busca | "Pesquisar na internet", cache de 24 h, limite de 900/mês, fila Pendentes/Aprovados/Descartados | Entram matérias como se fossem pessoas |
| Conferência | Dossiê (nome, cargo, profissão, empresa, cidade, UF), contato publicado + URL + vínculo, conclusão | Bom, mas manual e lento |
| Score | **Dois scores**: v1 (Capacidade 25, Autoridade 20, Maturidade 15, Afinidade 25, Contato 15) e v2 (Cargo 30, Aderência 25, Empresa/geo 15, Dados 15, Sinais 15; A/B/C/D) | Confunde. Afinidade = 0 em todos |
| Pipeline | 14 etapas (Novo lead → Cliente, Sem interesse, Follow-up futuro) | Ok |
| Central de Prospecção | Contatos de hoje, follow-ups, copiar mensagem, marcar contatado | Ótima ideia, quase sem uso |
| Campanhas | Rascunhos, revisão antes de enviar | Vazio |
| Mensagem | Modelo genérico ("acompanhamento individualizado… posso enviar uma apresentação?") | Fraco para R$ 15–20 mil |
| Radar / sinais | Sinais com fonte, manual | Vazio |
| Analytics | Por canal, cidade, profissão, origem, funil | Ok |
| Blindada AI | Chat com regras locais | Só respostas prontas |
| Qualificação e custos | Filtros, duplicatas, alertas, orçamento, Laboratório Apollo, Origami, simulador de créditos, conferência de saldos | **Metade do app gira em torno de ferramentas pagas** |
| Integrações | CSV ativo. Hunter, Apollo, Clay e outros pendentes | Depende de pagar |
| Configurações | Retenção de 90 dias, dados de demonstração, histórico | Ok |
| Privacidade | Sem inferir saúde, renda ou aparência; opt-out; fonte registrada | **Excelente, manter** |

## 2. Diagnóstico
1. **Muito controle e pouca ação**: 371 leads, nenhum contato feito.
2. **Falta intenção**: o app sabe quem pode pagar, não quem quer comprar.
3. **Dependência de ferramentas pagas** em telas inteiras, justo o que se quer eliminar.
4. **Dois scores** e telas demais (11 menus).
5. **A mensagem não gera conversa.**

## 3. O que muda na v2

| Antes | Depois |
|---|---|
| 11 menus | 6: **Hoje · Descobrir · Revisar · Leads · Mensagens · Painel** (+ Configurações) |
| 2 scores | **1 Score Blindada (0–100)** = Poder de compra 40 + Proximidade/intenção 35 + Contato 25 |
| Afinidade sempre 0 | Sinais rápidos com 1 clique: segue o perfil, interagiu, respondeu Story, indicação, fala de saúde ou bem-estar |
| Busca que traz matérias | Busca grátis (Tavily, 1.000/mês) + **separação automática**: pessoa × fonte para investigar. Extrai nome, cargo e empresa |
| Conferência manual longa | Formulário curto com o que o robô já preencheu. Você só confirma |
| Apollo, Origami, simulador de créditos, Laboratório | **Removidos.** Fica só a importação de CSV (para trazer listas antigas) |
| Central de Prospecção | Vira a tela inicial **"Hoje"**: até 10 ações por dia, por prioridade, com aquecimento (seguir → comentar → mensagem → follow-up) |
| Mensagem genérica | Biblioteca contextual por profissão. Nunca cita peso ou corpo. Nunca fala preço |
| Blindada AI de regras | Mantida grátis com regras melhores ("quem abordar hoje?", "por que esse score?") |
| Exportar | + formato da Planilha do funil e link do formulário de aplicação |
| Privacidade | Mantida: fonte e data, retenção de 90 dias, lista "Não contatar", sem dados de saúde |

## 4. Arquitetura (custo zero)
- **Cloudflare Pages + Functions + D1** (plano grátis), com login protegido por Cloudflare Access (grátis).
- **Tavily** para a busca (1.000/mês grátis). Trava rígida em 900/mês.
- Chave guardada como segredo no Cloudflare, nunca no código nem no chat.

## 5. Fases
1. Estrutura, banco, importação do backup (371 leads), score único, tela de Leads e Revisar. *(sem chave)*
2. Descobrir: busca Tavily + extração automática. *(precisa da chave Tavily)*
3. Hoje + aquecimento + mensagens + pipeline.
4. Painel, exportações, privacidade e publicação online com login.
