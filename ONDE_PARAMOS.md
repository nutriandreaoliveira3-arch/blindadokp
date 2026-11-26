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

## 22/11/2026 (tarde): pasta ROUPAS-FOTOS no Google Drive
- Pasta id 15WU82a-TRAAod1oBBtLwzd_zVbcFUWsn, criada em 22/11 14:04. Tem ~38 prints de descrição (PNG) e fotos (JPG, IMG_xxxx).
- O conector do Drive lê o TEXTO dos prints (read_file_content, barato). As fotos JPG voltam vazias, e baixar imagem pelo conector custa muitos créditos. Listar a pasta também é caro: prefira pedir um zip.
- Os 39 looks (7 antigos + 32 da pasta) têm prompts prontos em `vitrine-blindada-ia/tools/video/prompts_looks.py` (gera a pasta `prompts-looks` + zip). Cada look: mescla, clipe 1, clipe 2, gancho, textos do fechamento, legenda, avisos.
- Avisos importantes: usar o anúncio IMG_6738 do vestido canelado (os outros "Agnes" citam manga); body, regatas, blusa e calça lisa vendem uma peça só; kit de 2 regatas mostra as 2; "5 amarrações em 1" nunca mostrar a transformação; "sensualidade" e "sem bojo" nunca citar errado.
- Vídeos feitos em 22/11: jeans, amarelo (blusa + short saia), rosa (1 clipe), macacão 3 cores (textos reais). Borrão leve de fundo: `BLUR_SIGMA=8`.

## 24 e 25/11/2026 — fábrica de vídeos da Bella
- 12 looks prontos (Jeans 1, 2, 3, 5, 6, laranja, babados, vermelho sem laço, verde tricô, assimétrico, floral, conjunto branco), cada um em 4 versões (A original, B, C, D) para postar em dias alternados. Ferramentas no scratchpad: `tools/lote.py` (edita uma pasta por look), `tools/versoes.py` (gera B, C, D), `tools/looks.json` (ganchos e fechamentos).
- Marca "Conteúdo gerado por IA" agora no rodapé esquerdo (y=90% da altura). Aviso dado: a legenda da TikTok pode cobrir; testar e subir um pouco se cobrir.
- Prompt de mesclagem da Andréa funciona bem: só trocar a Description do cenário (arquivo com 12 cenários sem móveis; "escritório" e "café" foram retirados porque a Bella sentava). Clipes de 16 s: `durationSeconds` 16.
- Jeans 4 (halter com franzido na frente) NÃO saiu: o Flow repete o top de alças com botões. Próximo teste: prompt curto só com frases positivas, ou imagem como primeiro quadro (JEANS4-frente.png). Jeans 3: Andréa vai refazer 3 clipes.
- Planilha de looks descartada (trabalhosa). Meta da Andréa: 15 vídeos por dia, ela mesma gera. Proposta aberta: editor em lote dentro da Vitrine Blindada, no navegador (aguarda o sim).
- Vitrine: ainda faltam domínio vitrineblindada.com.br (Cloudflare/Registro.br) e a chave do Gemini (dentro do site, em Configurações, no endereço final).
- Suplementos: continuar Black Skull 100% HD, Max Whey Pro e FTW; recurso da conta derrubada e da violação EV-10 ainda em aberto.

## 25/11/2026 — suplementos com a avatar Isa (conta Valentina Moretti)
- Pasta do Drive **SUPLEMENTOS** (~27 produtos, foto + print do anúncio) e pasta da AlwaysFit **13. Briefing dos produtos** (15 briefings com rótulo oficial em PDF). Os briefings trazem tabelas "Dores e aplicações" com queixas/sintomas: NÃO usar.
- Método que funcionou (a Andréa confirmou que o prompt deixou de ser recusado): foto da Isa em 6 looks/ambientes (edição de imagem mantendo rosto e cabelo) → mescla com a foto do pote (só o pote, sem selos de alegação) → vídeo de 8 s com fala curta (só nome, marca, forma, nº de cápsulas) → close com a foto real do rótulo, gancho só na capa, marca no rodapé esquerdo.
- Ambientes sem móveis para sentar (a Bella/Isa sentou em "escritório" e "café"); sem academia para produto não esportivo.
- Triagem de risco: 🟢 whey simples; 🟡 produtos com alegação no texto do anúncio; 🔴 composto antifúngico, Biosil (manipulado), Constilivre, Melatonina e Meno só após a regra oficial da TikTok Shop (a Andréa conferiu a melatonina; guardar o print).
- Roteiros: gancho de curiosidade sem preço/queda de preço/gramas não confirmadas; formato "carrinho laranja" e POV (ação neutra: abrir, conferir rótulo, escolher). O detector D-MUSCULO pega "funcionamento muscular".
- Fila: Vitamina D3+K2 e Pro Curcumin com clipes OK; NAC refazer (rótulo trocava); Ômega 3 (60 cáps) e Luteína & Zeaxantina (30 cáps de 500 mg) a gerar. Entregar tudo no fim do dia, em um zip por produto.

## 26/11/2026 — prompts de suplemento com tamanho real e fala com gancho
- `hybridPrompts` ganhou `realSize` (tamanho real do pote em inglês, vira a linha "REAL SIZE (mandatory)") e `oneHand` (segura com uma mão). A linha de áudio agora termina com "She says exactly these words and nothing else." Testes em `hybrid.test.ts` (48 passando).
- Regra de trabalho: toda mescla nova de suplemento já sai com REAL SIZE, pose de uma mão ou na bancada, resolução 1080x1920 e fala no formato gancho + corpo + CTA (arquivo falas-gancho-cta). Estimativas de tamanho: cápsulas ~6 cm x 9-10 cm; colágeno 200 g ~9 x 11 cm; conta-gotas 30 mL ~3 x 8 cm.
- Falta ainda expor `realSize` e `oneHand` como campos na tela do app (Studios.tsx).
