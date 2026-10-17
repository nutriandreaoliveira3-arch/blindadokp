---
name: reels-blindado
description: Edita os Reels da nutricionista Andréa (Emagrecimento Blindado) no padrão aprovado. Faz capa JEJUM, logo, legendas, frase final e música, e escreve roteiros no estilo Rony. Use quando ela mandar vídeos para editar, pedir capas ou pedir roteiros.
---

# Reels Emagrecimento Blindado

Cliente: Andréa Oliveira, nutricionista (@nutriandreaoliveira). Responder em português do Brasil, direto, com tabelas e checklists.

## 0. Antes de tudo (container novo)
1. `bash ferramentas/setup.sh $HOME/reels` instala as fontes, o sherpa-onnx e o modelo Whisper turbo (~1 GB).
2. `export MODEL_DIR=$HOME/reels/model`
3. Ler `padrao-visual/PADRAO_VISUAL.md`. É a fonte da verdade das regras visuais.

## 1. Regras dela (nunca quebrar)
- Texto **sempre branco**.
- Capa estilo **JEJUM**: palavra gigante em Bodoni embaixo à esquerda e linha menor embaixo à direita. Nada de layout novo sem ela pedir.
- Na capa ela aparece **sorrindo** ou com **postura de autoridade** (ombros abertos, olhar firme, boca fechada).
- Conferir **olhos abertos** num recorte do rosto em resolução cheia. Evitar quadros a menos de 0,4 s de uma piscada.
- **Capas vão para aprovação antes** do vídeo final, todas do lote juntas ("deixa eu aprovar").
- A capa entra **embutida nos primeiros 0,3 s**. No Meta, ela escolhe o primeiro quadro em Miniatura e não mexe em "Editar".
- **Vídeo repetido é descartado.** Se for repetido de um já publicado, sugerir repost 3–4 semanas depois.
- Ela manda em **lotes de 5**.
- **Não usar a foto P&B** na abertura.
- Letras grandes, para ler num piscar: legenda 68, frase final ~118.
- A frase final **varia a cada vídeo**, combinando com o tema. Sempre fecha com o logo.

## 2. Estrutura do vídeo (modelo série)
Capa (0,3 s) → logo dourado no preto (2,2 s) → corpo com legenda DejaVu Sans 68 → tela preta com a frase em Bodoni ~118 (3,6 s) → logo → música ElevenLabs abaixando sob a voz.

## 3. Passo a passo de um lote
1. **Dedupe**: `cmp` entre arquivos e comparar transcrições com envios anteriores. Avisar o que é repetido.
2. **Fundo borrado** (quando ela gravar sem a parede do logo, ou pedir): `python3 ferramentas/fundo_borrado.py in.mp4 in_blur.mp4 [forca=35]`. Leva ~12 s por segundo de vídeo, então rodar em segundo plano. Daí em diante usar `in_blur.mp4` como fonte. Conferir as bordas do cabelo num quadro.
3. **Áudio**: `ffmpeg -i in.mp4 -ac 1 -ar 16000 a.wav`
4. **Transcrever**: `python3 ferramentas/asr_fine.py a.wav 0 <dur> fine.json`. Para trechos: `asr_rng.py a.wav 3.2:7.9 ...`
5. **Escolher a melhor tomada** de cada frase. Ela regrava frases, então descartar repetições e erros.
6. **Montar o JSON** `{"src":"in.mp4","out":"A_body.mp4","chunks":[[ini,fim,"Texto da legenda"],...]}`. O texto vai corrigido, com frase inteira. Depois rodar `python3 ferramentas/build_body.py spec.json`.
7. **Capa**: escolher o quadro (sorriso ou autoridade, olhos abertos) e rodar `ferramentas/capa.sh in.mp4 <seg> "PALAVRA" "LINHA MENOR" capa/A.jpg [tam]`. Palavra longa: diminuir tam (ex.: 260). Mandar todas as capas para aprovação.
8. **Montagem final** (na pasta com `capa/` e `A_body.mp4`): `ferramentas/assemble.sh A A e1 "Frase\\Nem linhas"`. Músicas e1 a e4: alternar entre vídeos. Para vídeo acima de 60 s, a música entra em loop sozinha.
9. Conferir a duração e quadros de amostra, copiar para `entregas/<lote>/`, fazer commit e push.

### Frases finais (rodízio)
1. Blindar o corpo é transformar a vida.
2. Mais do que emagrecer. É nunca mais voltar atrás.
3. Quem desiste recomeça. Quem cria estratégia permanece.
4. Emagrecer é uma decisão. Permanecer é uma estratégia.
5. O emagrecimento começa antes da balança.
6. Você merece viver no corpo em que se sente bem.
7. Disciplina pesa menos que o arrependimento.
8. Emagrecimento Blindado. Porque emagrecer é fácil. Difícil é permanecer. Nós ensinamos os dois.

## 4. Roteiros estilo Rony
- 40 roteiros prontos: `entregas/roteiros-estilo-rony/40_ROTEIROS.md` e o artefato https://claude.ai/artifact/XczzsAxnpbihqFqebmHnD3
- Fórmula: gancho contra o senso comum → autoridade → lista numerada → objeção encenada ("Ah, nutri…" / "Calma, linda, calma.") → CTA de comentário → "Blindou."
- CTA: **nunca** "toque em saiba mais" (ela acha cafona). Usar comentário com palavra: BLINDADA (comportamental), PLANO (objeção), VAGA (escassez), PROTEÍNA (isca).
- Imagens por cima: título "LEI 1" no topo, ilustração no terço superior sem cobrir o rosto, objeção riscada e CTA fixo nos 8 s finais.
- Nunca inventar número de vagas, prazo, história ou caso de paciente. Pedir o dado real.

## 5. Ferramentas externas
- Instagram e o CDN dele são bloqueados pelo proxy. Para ler Reels, usar Apify (conector gerador_de_leads):
  - `apify/instagram-scraper` para metadados
  - `steadyfetch/instagram-reel-transcript-scraper` para transcrição
- Música nova: ElevenLabs (eleven_music), instrumental de piano e cordas, 60 s. Avisar que gasta créditos.
- Commits com `git -c user.email=nutriandreaoliveira3@gmail.com -c user.name="Andréa"`.
