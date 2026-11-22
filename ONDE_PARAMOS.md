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
- Nova tela "Conferir anúncio x vídeo": tira quadros do vídeo no navegador, compara lado a lado (manual ou com IA) e guarda a prova no histórico para recurso. Prompt do Flow com modo "sem amostra".
- Tela Validação: cada vídeo publicado com o nível do app antes e o resultado no TikTok. Metas para lançar a mensalidade: 50 vídeos, 90% das violações apontadas, no máximo 5% de 🟢 com violação, 90% de concordância IA x manual. Teste até o fim de dezembro.
- Itens do catálogo: cada item avaliado uma vez e reaproveitado nos kits (AlwaysFit: NAC e Pro3 liberados, Fit Dreams com ressalva, Complexo B pendente; kit bloqueado por imagem x descrição diferentes).

## 19/11/2026
- 18 vídeos de proteína prontos (pasta scratchpad whey/final-v3): gancho só na capa, marca d'água de IA o vídeo inteiro, textos centralizados na área segura.
- App: modelo híbrido (cena travada) com mescla, kit e legenda sugerida; trava que bloqueia o prompt com termo de risco; detectores novos (músculo, treino, proteína suficiente, duração/rendimento); regra EV-10 (violação de 19/11, -8 pontos); guia em vitrine-blindada-ia/docs/GUIA-VIDEO-HIBRIDO.md.
- Cloudflare: site em young-sunset-7aa6.nutriandreaoliveira3.workers.dev (upload manual); banco D1 vitrine-blindada-ia criado; domínio vitrineblindada.com.br em registro (pedido 32685334).
- Falta: Black Skull 100% HD (vídeo sem o texto de músculo), Max Whey Pro, FTW; botão no app para gerar o trecho com foto real; versão com login (GitHub → Cloudflare).

## 20 e 22/11/2026 — loja de moda da Bella (outra conta do TikTok Shop)
- A conta de suplementos foi derrubada em 19-20/11 (motivo desconhecido): recorrer e pegar o motivo antes de criar outra conta. Não criar conta nova para burlar o bloqueio.
- Loja da Bella: só moda feminina e acessórios. **Sempre a mesma modelo** (Bella, loira), 9:16, **sem fala, só música** (Biblioteca de Música Comercial do TikTok).
- Método: mescla (imagem 1 = Bella, imagem 2 = foto do anúncio) → 2 clipes de 8 s (parada com meio giro + caminhando) → fechamento de ~8 s com os textos do anúncio. Gancho só na capa (1,2 s), marca d'água "Conteúdo gerado por IA" pequena no canto esquerdo (~74% da altura).
- Regras aprendidas: fundo sem araras nem outras roupas (ou bem borrado, script `scratchpad/tools/blurbg.py`); tricô/renda vazados com forro cor da pele; sem colar, brinco, bolsa ou pulseira que não estão à venda; não escrever a cor no prompt ("same color as first frame"); modal = tecido fosco; nunca marca ("estilo Farm"); anúncio sem material ou tamanhos = não promover; várias cores = não citar a cor e vincular a variante do vídeo; não prometer "não amassa".
- Ganchos de desejo/estilo aprovados pela Andréa, por exemplo "O luxo da delicadeza" (assinatura dela), "Vestido com cara de rica", "Difícil escolher uma cor!" (só com várias cores). Lista de 51 em `src/data/hooks.ts`.
- Vídeos prontos (scratchpad/bella): tropical, amarelo 2 em 1, macaquinho preto, tricô branco, macaquinho bege, tricô vermelho, conjunto de alfaiataria, vinho (cara de rica), macacão pantalona em 3 cores. Zip com ganchos novos: bella/videos-bella-v2.zip. Pendentes: vestido branco texturizado (aguarda clipes), vinho (confirmar descrição do anúncio), macacão (confirmar as 3 cores e mandar a descrição).
- Bermuda jeans tirada da vitrine (anúncio sem material e sem tamanho).
- Scripts de montagem copiados para `vitrine-blindada-ia/tools/video/` (ver LEIA-ME.md). Os vídeos prontos NÃO estão no repositório: estão no computador da Andréa.
- App (commits 3c07cb4 e ef82a81): modo Roupa/acessório no Modelo híbrido, biblioteca de ganchos, marca d'água configurável (liga/desliga, posição, tamanho, texto), detectores D-MARCA-ESTILO e D-PARECE, guia atualizado. 46 testes passando. Zip: scratchpad/vitrine-blindada-site.zip.
- Falta: (1) enviar o index.html novo na Cloudflare (Workers & Pages → vitrineblindada); (2) trocar os nameservers no Registro.br e ligar vitrineblindada.com.br; (3) alerta de "anúncio incompleto" como campo próprio; (4) botão de borrar fundo no app; (5) versão com login; (6) validar resultados após 48 h.
- Economia de créditos: uma sessão por dia/lote, modelo mais barato no dia a dia, desligar conectores sem uso, mandar tudo junto e com poucas imagens, usar o app para gerar prompts.
