# Como publicar a Vitrine Blindada IA na Cloudflare e ligar a Green

Tempo estimado: 30 a 40 minutos. Os nomes dos menus podem mudar um pouco no painel da Cloudflare.

## Como funciona

```
Cliente compra na Green ──► Green avisa o site (webhook) ──► e-mail liberado
                                                                 │
Cliente abre o site ──► "Primeiro acesso" com o e-mail da compra ─┘ ──► usa o app
Cancelou, reembolsou ou deu chargeback ──► Green avisa ──► acesso bloqueado
```

Você (e-mail `nutriandreaoliveira3@gmail.com`) é a **administradora**: só você edita a base de políticas e vê a tela **Assinantes**.

## Passo 1 — Criar o banco de dados
1. Entre em dash.cloudflare.com.
2. Menu **Storage & Databases → D1 SQL Database → Create**.
3. Nome: `vitrine-blindada-ia`. Crie.
4. Copie o **Database ID** e me envie (ou cole no arquivo `wrangler.toml`, no lugar de `COLE_AQUI_O_ID_DO_BANCO_D1`).
5. Abra o banco → aba **Console**. Cole todo o conteúdo de `migrations/0001_inicial.sql` e execute.

## Passo 2 — Publicar o site
1. Menu **Workers & Pages → Create → Import a repository**.
2. Conecte o GitHub e escolha o repositório `blindadokp`.
3. Configure:
   - **Root directory:** `vitrine-blindada-ia`
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
4. Salve e publique. O site fica em um endereço `https://vitrine-blindada-ia.SEU-USUARIO.workers.dev`.
5. Domínio próprio (opcional): **Settings → Domains & Routes → Add custom domain**.

A cada alteração aprovada no GitHub, o site é publicado de novo automaticamente.

## Passo 3 — Segredos (senhas do servidor)
No Worker publicado → **Settings → Variables and Secrets → Add** (tipo **Secret**):

| Nome | Valor | Obrigatório |
|---|---|---|
| `GREENN_TOKEN` | Uma senha longa inventada por você (ex.: 30 letras e números) | Sim |
| `ANTHROPIC_API_KEY` | Sua chave da API da Anthropic (IA incluída no plano dos clientes) | Não. Sem ela, o app funciona sem IA |

## Passo 4 — Ligar a Green
1. Na Green, abra **o produto da assinatura** → área de integrações/webhook. Configure em **cada produto ou plano**.
2. URL do webhook:
   `https://SEU-SITE/api/webhook/greenn?token=O_MESMO_GREENN_TOKEN`
3. Marque os eventos de **venda** e de **assinatura/contrato**: pago, cancelado, reembolsado, chargeback, não pago.
4. Faça uma compra de teste e confira em **Assinantes → Avisos recebidos da Green**. Se aparecer "sem e-mail" ou "ignorado", me mande o conteúdo do aviso: ajusto a leitura em minutos.

## Passo 5 — Primeiro acesso
1. Abra o site → **Primeiro acesso? Criar senha** → use `nutriandreaoliveira3@gmail.com`.
2. Você entra como administradora. A base de 64 regras é carregada sozinha.

## Regras de acesso

| Status recebido da Green | O que acontece |
|---|---|
| `paid`, `trialing` | Libera |
| `refunded`, `chargedback`, `canceled`, `unpaid` | Bloqueia e desconecta |
| `waiting_payment`, `refused`, `pending_payment` | Não muda nada |

Você sempre pode **liberar ou bloquear manualmente** em Assinantes. Isso importa porque a documentação pública da Green é de 2021 e não deixa claro se ela avisa a cada renovação mensal.

## Custos estimados (confirmar nos sites oficiais)
- Cloudflare Workers + D1: plano gratuito costuma bastar no início. Plano pago a partir de US$ 5/mês.
- IA (Anthropic): cobrada por uso, na sua chave. O limite por cliente está em `AI_MONTHLY_LIMIT` (200 usos/mês). Ajuste conforme o preço do plano.

## Limites desta versão
- Sem "esqueci a senha" automático (precisa de serviço de e-mail). Hoje: Assinantes → **Resetar senha** e a cliente cria uma nova em "Primeiro acesso". Os dados dela são mantidos.
- Cada item (produto com fotos, documento) pode ter até ~1,9 MB.
