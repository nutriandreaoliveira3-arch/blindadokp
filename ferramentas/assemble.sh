#!/bin/bash
# Uso (rodar na pasta de trabalho com capa/<capa>.jpg e <L>_body.mp4): assemble.sh <L> <capa> <e1..e4> "<Frase\\Nem linhas>"
T=$(cd "$(dirname "$0")" && pwd); B=$T/marca; M=$T/modelos
L=$1
sed "s#{\\\\pos(540,960)\\\\fad(400,300)}Quem desiste\\\\Nrecomeça.\\\\N\\\\NQuem cria estratégia\\\\Npermanece.#{\\\\pos(540,960)\\\\fad(400,300)}$4#" $M/frase.ass > frase_$L.ass
ffmpeg -nostdin -v error -y -f lavfi -i color=c=black:s=1080x1920:r=25:d=3.6 -f lavfi -t 3.6 -i anullsrc=r=44100:cl=stereo -filter_complex "[0:v]ass=frase_$L.ass,format=yuv420p,setsar=1[v]" -map "[v]" -map 1:a -c:v libx264 -crf 18 -c:a aac -shortest frase_$L.mp4
ffmpeg -nostdin -v error -y -loop 1 -framerate 25 -t 0.3 -i capa/$2.jpg -i $B/logo_card.mp4 -i ${L}_body.mp4 -i frase_$L.mp4 -i $B/logo_card.mp4 -f lavfi -t 0.3 -i anullsrc=r=44100:cl=stereo -filter_complex "[0:v]scale=1080:1920,format=yuv420p,setsar=1,fps=25[c];[1:v]setsar=1[l1];[2:v]setsar=1,fps=25[b];[3:v]setsar=1[f];[4:v]setsar=1[l2];[c][l1][b][f][l2]concat=n=5:v=1:a=0[v];[5:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[voz]" -map "[v]" -map "[voz]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k mont_$L.mp4
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 mont_$L.mp4); FO=$(python3 -c "print(round($D-2.5,2))")
ffmpeg -nostdin -v error -y -i mont_$L.mp4 -stream_loop -1 -i $T/musica/$3.mp3 -filter_complex "[1:a]atrim=0:$D,asetpts=PTS-STARTPTS,aresample=44100,loudnorm=I=-28:TP=-5,afade=t=in:d=0.8,afade=t=out:st=$FO:d=2.5[m];[0:a]aresample=44100,asplit[vo][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=500[md];[vo][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map 0:v -map "[a]" -c:v libx264 -preset slow -b:v 1700k -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart Reels_serie_$L.mp4
echo "$L $(ffprobe -v error -show_entries format=duration,size -of csv=p=0 Reels_serie_$L.mp4)"
