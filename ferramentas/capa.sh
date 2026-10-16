#!/bin/bash
# Gera a capa estilo JEJUM a partir de um quadro do vídeo.
# Uso: capa.sh <video> <segundo> "<PALAVRA>" "<LINHA MENOR>" <saida.jpg> [tam_palavra=330] [tam_sub=100]
# Palavra gigante embaixo à esquerda (Bodoni), linha menor à direita. Ajuste tam_palavra para a palavra caber na largura.
set -e
T=$(cd "$(dirname "$0")" && pwd)
V=$1; S=$2; BIG=$3; SUB=$4; OUT=$5; BS=${6:-330}; SS=${7:-100}
A=$(mktemp --suffix=.ass)
sed -e "s#^Style: Big,Bodoni Moda 11pt Medium,330,#Style: Big,Bodoni Moda 11pt Medium,$BS,#" \
    -e "s#^Style: Sub,Bodoni Moda 11pt Medium,100,#Style: Sub,Bodoni Moda 11pt Medium,$SS,#" \
    -e "s#}VOLTAR\$#}$BIG#" -e "s#}A SER QUEM ERA?\$#}$SUB#" "$T/modelos/capa_jejum.ass" > "$A"
ffmpeg -nostdin -v error -y -ss "$S" -i "$V" -frames:v 1 -vf "scale=1080:1920:flags=lanczos,crop=982:1744:49:49,scale=1080:1920:flags=lanczos,split[o][s];[s]bilateral=sigmaS=6:sigmaR=0.06[sm];[o][sm]blend=all_mode=normal:all_opacity=0.45,eq=contrast=1.05:brightness=0.015:saturation=0.97:gamma=1.02,colorbalance=rs=0.02:bs=-0.02:rm=0.01:bm=-0.01,unsharp=5:5:0.45:5:5:0,ass=$A" -q:v 2 "$OUT"
rm -f "$A"; echo "$OUT"
