#!/bin/bash
# Marca d'água "Conteúdo gerado por IA" durante o vídeo inteiro, no topo, em todos os vídeos com gancho.
W=/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/whey
IN=$W/com-gancho
OUT=$W/com-ia
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
mkdir -p "$OUT"
printf 'Conteúdo gerado por IA' > "$OUT/marca.txt"
for f in "$IN"/[0-9]*.mp4; do
  n=$(basename "$f")
  ffmpeg -v error -y -i "$f" -vf "drawtext=textfile=$OUT/marca.txt:expansion=none:fontfile=$F:fontsize=30:fontcolor=white@0.9:borderw=3:bordercolor=black@0.7:box=1:boxcolor=black@0.35:boxborderw=10:x=(w-text_w)/2:y=h*0.012,format=yuv420p" -c:v libx264 -crf 20 -c:a copy "$OUT/$n"
done
ls "$OUT"/*.mp4 | wc -l
