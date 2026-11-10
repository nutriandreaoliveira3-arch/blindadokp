# Blindada Intelligence™ — Plano para finalizar a máquina de prospecção

> Baseado nos 3 prints do app (Dashboard, Fila de revisão e Radar).
> O app pede login do ChatGPT, então não consegui abrir as outras telas.
> Para finalizar: cole os prompts abaixo, **um por vez**, no botão **"Solicitar alteração"** do app, nesta ordem.

---

## 1. Diagnóstico

### O que já está bom ✅
| Ponto | Por quê |
|---|---|
| Público certo | Empresárias, fundadoras, sócias e diretoras: têm poder de compra para R$ 15–20 mil |
| Exclusão de nutricionistas (`-nutricionista`) | Evita concorrentes na lista |
| Fila de revisão humana (Pendentes → Aprovados → Descartados) | Você valida antes de abordar |
| Registro de evidência e da fonte | Base para a LGPD |
| Limite de 900 buscas/mês e cache de 24 h | Controla o custo |
| Visual premium | Combina com o posicionamento Elite |

### O que impede o resultado ❌
| # | Problema | Prova no print | Impacto |
|---|---|---|---|
| 1 | **Encontra quem PODE pagar, mas não quem QUER emagrecer** | Radar: "Interesses: **A confirmar**" em 100% dos leads | Lead frio. Para R$ 15–20 mil, a abordagem fria converte muito pouco |
| 2 | **Fontes que não são pessoas entram na fila** | Fila: "Mulheres são apenas 5,2% dos CEOs no Brasil" (uma matéria), com o dossiê vazio | Você perde tempo revisando lixo |
| 3 | **Sem pontuação** | Os leads aparecem todos iguais | Você não sabe por quem começar |
| 4 | **Sem sequência de abordagem** | Não aparece nenhuma etapa depois de "salvar" | O lead fica parado no pipeline |
| 5 | **Risco no primeiro contato** | Ainda não existe um script definido | Falar de peso com uma desconhecida ofende e queima a marca. Peso é um tema sensível |
| 6 | **Não conversa com o funil** | Não tem ligação com o formulário nem com a planilha | O processo quebra no meio |

### Conclusão
A máquina hoje é um **bom buscador de perfis**. Ela ainda **não é uma máquina de vendas**. Para chegar lá, faltam 3 camadas:

```
PODER DE COMPRA (já tem)  ×  INTENÇÃO (falta)  ×  PROXIMIDADE (falta)
            ↓
   Pontuação → Aquecimento → Contato → Formulário → Call → Venda
```

---

## 2. Prompts para colar em "Solicitar alteração" (em ordem)

### Prompt 1: limpar a fila (fontes que não são pessoas)
```
Na Fila de revisão, antes de criar um item pendente, classifique a fonte em:
"Pessoa" (perfil, página pessoal, LinkedIn, site com nome e cargo de uma mulher específica)
ou "Fonte para investigar" (matéria, ranking, lista, página de empresa sem pessoa nomeada).
Só itens "Pessoa" entram em Pendentes. Itens "Fonte para investigar" vão para uma nova aba
"Fontes" com o link e um botão "Extrair pessoas desta fonte", que lista as mulheres citadas
com nome e cargo, para eu escolher quais viram dossiê. Nunca crie dossiê com Nome vazio.
```

### Prompt 2: pontuação do lead (0 a 14)
```
Adicione ao dossiê e ao Radar uma pontuação de 0 a 14, visível como coluna ordenável:

PODER DE COMPRA (0–5)
- Cargo: fundadora/sócia/CEO = 2, diretora = 1, outros = 0
- Empresa com site próprio e equipe = 1
- Região de alto poder aquisitivo informada na fonte (ex.: Alphaville, Jardim Paulista) = 1
- Profissão liberal de alta renda (médica, advogada, engenheira, arquiteta, empresária) = 1

INTENÇÃO (0–5), marcada por mim na revisão, com caixas de seleção:
- Segue o @emagrecimentoblindado = 2
- Já curtiu, comentou ou respondeu Story meu = 2
- Fala publicamente de saúde, bem-estar, treino ou rotina = 1

PROXIMIDADE (0–4)
- Tem contato profissional publicado (WhatsApp ou e-mail nominal) = 2
- Temos conexão em comum ou indicação = 2

Classificação: 11–14 "🔥 Quente", 7–10 "🟡 Morna", 0–6 "❄️ Fria".
Ordene o Radar pela pontuação, do maior para o menor.
Substitua a coluna "Interesses: A confirmar" pela classificação.
```

### Prompt 3: etapas do pipeline
```
Crie no pipeline estas etapas fixas, com data em cada mudança:
1. Aprovado  2. Aquecendo  3. Contato feito  4. Respondeu  5. Formulário enviado
6. Aplicou  7. Call agendada  8. Call feita  9. Proposta  10. FECHOU  11. Perdido.
Em "Perdido", peça o motivo: Preço, Momento, Sem resposta, Escolheu outro, Não qualificada, Pediu remoção.
Mostre no Dashboard: quantidade por etapa, taxa de resposta, taxa call→venda e faturamento fechado.
```

### Prompt 4: aquecimento antes do contato
```
Para cada lead em "Aquecendo", crie uma sequência de tarefas com data:
- Dia 0: seguir no Instagram e curtir 2 posts recentes
- Dia 2: comentar algo genuíno sobre o trabalho dela (nunca sobre corpo ou peso)
- Dia 5: primeira mensagem (modelo "Contato 1")
- Dia 9: se não respondeu, mensagem "Contato 2"
- Dia 16: se não respondeu, mover para "Perdido – Sem resposta"
Mostre no Dashboard uma lista "Tarefas de hoje" com botão "Feito".
Se ela responder em qualquer momento, pare a sequência e mova para "Respondeu".
```

### Prompt 5: modelos de mensagem (prontos)
```
Crie uma biblioteca de mensagens com campos {nome}, {empresa} e {cargo}, e um botão "Copiar":

Contato 1:
"Oi, {nome}! Sou a Andréa, nutricionista. Acompanho o trabalho da {empresa} e admiro
mulheres que constroem negócios como o seu. Tenho trabalhado com empresárias que querem
mais energia e uma rotina de alimentação que caiba na agenda corrida. Posso te mandar um
material curto que preparei para quem vive essa rotina?"

Contato 2:
"{nome}, passando só para deixar o material aqui, sem compromisso: [link].
Se fizer sentido para você, me conta. 💛"

Depois que ela responder:
"Que bom que gostou! Pelo que você vive hoje, o que mais pesa: falta de tempo, de energia
ou de constância? Pergunto porque meu acompanhamento é individual e eu só atendo quando
sei que consigo ajudar de verdade."

Regras fixas mostradas na tela: nunca citar peso, corpo ou aparência no primeiro contato;
nunca falar preço por mensagem; o valor só aparece na call.
```

### Prompt 6: LGPD e privacidade
```
Para cada lead, guarde automaticamente: link da fonte, data da coleta e base legal
"legítimo interesse – contato profissional publicado".
Não guarde nenhum dado de saúde, peso ou aparência inferido da internet.
Adicione o botão "Remover meus dados": apaga o lead e registra só a data do pedido,
numa lista de "Não contatar" que bloqueia novas importações da mesma pessoa.
Em todo primeiro contato, se ela pedir para não receber mensagens, mova para
"Perdido – Pediu remoção" e adicione à lista "Não contatar".
```

### Prompt 7: ligar ao funil (formulário e planilha)
```
Adicione o campo "Link do formulário de aplicação" nas configurações.
Na etapa "Formulário enviado", gere a mensagem com esse link.
No botão Exportar, ofereça o formato "Planilha do funil" com estas colunas, nesta ordem:
Data 1º contato, Nome, @ Instagram, WhatsApp, Cidade/UF, Profissão, Origem, Etapa,
Pontuação, Classificação, Próxima ação, Data próxima ação, Observações.
```

---

## 3. Teste de 1 semana antes de escalar

| Dia | Ação | Meta |
|---|---|---|
| 1 | Aplicar os prompts 1, 2 e 3 | Fila só com pessoas |
| 2 | Aplicar os prompts 4 a 7 | Pipeline completo |
| 3 | Aprovar **20 leads**: priorize quem já te segue ou interagiu | 20 em "Aquecendo" |
| 3–7 | Fazer as "Tarefas de hoje" (15 min/dia) | 100% das tarefas feitas |
| 7 | Medir no Dashboard | Ver a tabela abaixo |

**O que medir no dia 7:**
- [ ] Quantos dos 20 responderam? (taxa de resposta)
- [ ] Quantos pediram o material?
- [ ] Quantos receberam o formulário?
- [ ] Alguém pediu remoção? (se sim, revisar o tom da mensagem)
- [ ] Quanto tempo você gastou por dia?

**Decisão:** se a taxa de resposta ficar baixa, o problema é **intenção**. Aumente o peso de quem já interage com o seu Instagram e reduza a busca fria. Não existe um número mágico: defina a sua meta antes de começar e compare.

---

## 4. Recomendação de sócio
A melhor fonte para um ticket de R$ 15–20 mil continua sendo **quem já consome o seu conteúdo**. Use a máquina para **qualificar e organizar** essas pessoas, e a busca fria só como complemento. Os Reels com CTA "comente BLINDADA" alimentam a máquina com leads que já têm intenção.
