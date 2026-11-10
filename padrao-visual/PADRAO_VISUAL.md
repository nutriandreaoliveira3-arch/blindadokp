# Padrão visual dos Reels: Nutricionista Andréa

## Cores
- Texto **somente branco**. Sem dourado, amarelo ou cores de destaque.
- Sem contorno grosso. Só uma sombra suave para dar leitura.

## Capa
| Linha | Fonte | Tamanho | Exemplo |
|---|---|---|---|
| Linha de apoio (acima) | Bodoni Moda, maiúsculas, espaçada | pequena (~46 px) | VOCÊ JÁ PAROU DE SE OLHAR NO |
| **Palavra-chave** | Bodoni Moda Regular, maiúsculas | gigante (~230 px) | **ESPELHO** |
| Complemento (abaixo) | Bodoni Moda, maiúsculas | média (~74 px) | DE CORPO INTEIRO? |

- O texto fica abaixo do queixo, nunca sobre o rosto.
- Foto: a nutricionista sorrindo de boca fechada, com olhar acolhedor.
- Referência: as capas "JEJUM / INTERMITENTE" e "CANSADA da Balança".
- A capa entra **embutida nos primeiros 0,3 s do vídeo**. O Meta bloqueia o agendamento quando a capa é enviada como imagem.

## Capa: estilo "JEJUM INTERMITENTE" (preferido)
- **Palavra-chave enorme** (Bodoni Moda Medium, ~330 px, levemente condensada), alinhada à **esquerda**, colada na margem.
- **Linha menor logo abaixo** (~90–100 px), alinhada à **direita**.
- Sem linha em cima. Texto sobre o corpo (blusa), nunca sobre o rosto.
- Modelo: `modelo_capa_estilo_jejum.ass`.

## Aprovação da capa (regra da cliente)
- Foto da capa: **sempre com ela sorrindo**, com o rosto acolhedor.
- Mandar a capa para **aprovação antes** de embutir no vídeo final.
- Conferir os **olhos bem abertos** num recorte do rosto em resolução cheia (miniaturas escondem piscadas). Evitar quadros a menos de 0,4 s de uma piscada.

## Vídeos repetidos (regra da cliente)
- Antes de editar, comparar com os envios anteriores (arquivo idêntico ou mesmo roteiro regravado).
- Se for repetido de um Reels **já publicado**: avisar e sugerir a data para **repostar 3–4 semanas depois** da publicação original, no melhor horário (ter 17h / dom 17h / seg 19h, agendando ~10 min antes).
- Agendamento só depois da confirmação dela.

## Legendas do vídeo
- Fonte serifada (Playfair Display), branca, palavra por palavra.
- A palavra falada cresce 10%, sem mudar de cor.
- Posição: na altura do peito, sem cobrir o rosto nem o logo.

## Área segura do Instagram (vale para todo texto)
| Zona | Medida (tela 1080×1920) | Motivo |
|---|---|---|
| Topo | não usar os 300 px de cima | nome do perfil e botão voltar |
| Base | texto termina em y = 1440 | descrição, áudio e botões cobrem os 480 px de baixo |
| Laterais | 130 px de cada lado, igual | botões curtir/comentar à direita; mantém o texto centralizado |

- A legenda simples (`ferramentas/modelos/legendas.ass`) já segue isso: margens 130/130 e MarginV 480.
- **Capa:** a grade do perfil mostra um recorte 3:4 do centro (y 240 a 1680). Texto da capa abaixo de y 1680 some na grade. Por isso o modelo JEJUM (`ferramentas/modelos/capa_jejum.ass`) sobe o texto 70 px (palavra em y 1590, linha menor em y 1652), aprovado pela cliente. Conferir em toda capa nova que a linha menor termina acima de y 1680.

## Exportação final
- H.264 High 4.2, 12 Mbps (máx. 16), GOP fechado de 2 s, BT.709.
- Áudio AAC 256k, 48 kHz, voz em −14 LUFS e pico máximo −1,5 dB.
- Já configurado no último passo do `ferramentas/assemble.sh`.

## Publicação no Meta Business Suite
1. Criar reel → vídeo → Miniatura: escolher o **primeiro quadro** (a capa).
2. Etapa "Editar": **não mexer em nada**.
3. Programar.

## Modelo "série" (aprovado pela cliente)
1. Capa estilo JEJUM (0,3 s) → 2. Logo dourado em fundo preto (2,2 s). **NÃO usar a foto P&B (cliente pediu para tirar).**
4. Vídeo com legenda simples embaixo (DejaVu Sans 68, branca, frase inteira — letras grandes, leitura num piscar)
5. Tela preta com frase em letra branca (Bodoni ~118, grande), escolhida conforme o tema do vídeo → 6. Fecha com o logo.
- Música: ElevenLabs (piano + cordas, instrumental), abaixando sob a voz.
- **Variar a frase final a cada vídeo** (não repetir em sequência). Ordem de rodízio:
  1. Blindar o corpo é transformar a vida.
  2. Mais do que emagrecer. É nunca mais voltar atrás.
  3. Quem desiste recomeça. Quem cria estratégia permanece.
  4. Emagrecer é uma decisão. Permanecer é uma estratégia.
  5. O emagrecimento começa antes da balança.
  6. Você merece viver no corpo em que se sente bem.
  7. Disciplina pesa menos que o arrependimento.
  8. Emagrecimento Blindado. Porque emagrecer é fácil. Difícil é permanecer. Nós ensinamos os dois.
- Logo oficial: padrao-visual/marca/logo_emagrecimento_blindado.png
