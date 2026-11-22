# Scripts de montagem de vídeo (TikTok Shop)

Usados em 19 a 22/11/2026. Os caminhos dentro dos scripts apontam para a pasta temporária da sessão antiga:
ao reutilizar, troque as constantes do topo (`U` = pasta dos clipes, `S` = pasta de saída, `IMG` = imagem do fechamento).
Os vídeos prontos NÃO estão no repositório (ficam no computador da Andréa).

| Script | Para quê |
|---|---|
| `bella.py <chave> [imagem]` | Moda: clipe 1 + clipe 2 + fechamento (~8 s) com 4 textos, gancho só na capa, marca d'água pequena no canto esquerdo, sem música. Chaves: tropical, amarelo, macaquinho-preto, tricot, macaquinho-bege, vermelho, conjunto, vinho-modal. Cada chave guarda gancho e textos |
| `bella3.py` | Macacão em 3 cores, com transição pela mão cobrindo a câmera |
| `blurbg.py entrada.mp4 saida.mp4` | Borra o fundo e mantém a pessoa nítida (mediapipe + modelo `selfie_multiclass_256x256.tflite`; precisa de `libegl1`) |
| `refaz.py` | Suplementos: 18 vídeos finais (cena + trecho real com foto do anúncio) |
| `marca-ia.sh` | Marca d'água antiga (topo). Hoje o padrão é pequena, no canto esquerdo, ~74% da altura |

Requisitos: ffmpeg, python3, fonte DejaVuSans-Bold.
Regras de conteúdo: `docs/GUIA-VIDEO-HIBRIDO.md`.
