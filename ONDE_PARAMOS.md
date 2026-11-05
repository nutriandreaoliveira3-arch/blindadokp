# Onde paramos (atualizado em 17/10/2026)

## Feito
- Séries editadas e entregues em `entregas/` (espelho, músculo, dieta, cortes, série 1, lote 2 A–F)
- 40 roteiros no estilo Rony: `entregas/roteiros-estilo-rony/` + artefato https://claude.ai/artifact/XczzsAxnpbihqFqebmHnD3
- Pesquisa de concorrentes e fontes científicas (dentro do artefato)
- Skill `reels-blindado` + ferramentas em `ferramentas/` (legenda, capa JEJUM, montagem, música, fundo borrado)

## Próximo passo
1. Andréa grava os roteiros 1, 3, 10, 14 e 40 (lote de 5).
2. Edição no padrão série, com imagens por cima no estilo Rony e fundo borrado se ela pedir.
3. Capas para aprovação antes do final.

## Pendências a confirmar com ela
- Data do repost do vídeo "espelho" (sugestão: ter 10/11, 16h50)
- Resposta automática no direct para BLINDADA, PLANO, VAGA e PROTEÍNA (ManyChat ou Meta)
- Criar a lista grátis do CTA PROTEÍNA antes de postar os roteiros 26 e 27
- Preencher os [colchetes] dos roteiros 4, 11, 29 e 30 com dados reais

## Vitrine Blindada IA (05/11/2026) — antigo "TikTok Shop Safe AI"
- App em `vitrine-blindada-ia/`. Abrir: `vitrine-blindada-ia/dist/index.html` (duplo clique).
- Base v1: 64 regras de 10 documentos (TIK1–TIK12). 3 regras pendentes de verificação (vieram do TIK_12, não oficial).
- Lacunas e conflitos: `vitrine-blindada-ia/docs/LACUNAS-E-CONFLITOS.md`.
- Próximo: Andréa enviar os documentos oficiais de IA, Penalidades, Produtos Proibidos/Restritos e Diretrizes da Comunidade.
- Modo nuvem pronto (Cloudflare Workers + D1 + webhook da Green). Falta: criar o banco D1, publicar, cadastrar segredos e testar uma venda real (`docs/PUBLICAR-CLOUDFLARE.md`).
- Andréa vai mandar prints das violações recebidas: ligar cada uma a uma regra e ajustar os detectores.
- Prints analisados: 19 violações (~113 pts). Regras EV-1 a EV-4, checagem de peso/kit e tela "Minhas violações". Arquivo para importar: violacoes-andrea-importar.json (enviado na conversa).
- Falta: abrir as 13 violações sem motivo e copiar o texto; informar a nota atual do Índice de qualidade do criador.
- 30 prints analisados (doc CLAUDE_BLINDADA): 21 registros, 136 pts. Regras EV-5 a EV-8 e checagens de vídeo educativo, IA x anúncio, ofertas. 72 regras na base.
