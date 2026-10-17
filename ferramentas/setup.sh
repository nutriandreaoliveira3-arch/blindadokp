#!/bin/bash
# Prepara um container novo: fontes, transcrição (sherpa-onnx + Whisper turbo) e checagens.
# Uso: bash ferramentas/setup.sh [pasta_de_trabalho]   (padrão: $HOME/reels)
set -e
T=$(cd "$(dirname "$0")" && pwd); W=${1:-$HOME/reels}; mkdir -p "$W" ~/.fonts
cp "$T"/fontes/*.ttf ~/.fonts/ && fc-cache -f >/dev/null
fc-list | grep -qi "Bodoni Moda" && echo "fonte Bodoni ok"
fc-list | grep -qi "DejaVu Sans" || echo "ATENÇÃO: instalar DejaVu Sans (apt-get install -y fonts-dejavu-core)"
command -v ffmpeg >/dev/null || echo "ATENÇÃO: ffmpeg não encontrado (apt-get install -y ffmpeg)"
pip install -q sherpa-onnx soundfile mediapipe opencv-python-headless
apt-get install -y -q libegl1 libgles2 >/dev/null 2>&1 || echo "ATENÇÃO: instalar libegl1 libgles2 (fundo borrado)"
if ! ls "$W"/model/*/turbo-encoder.int8.onnx >/dev/null 2>&1; then
  mkdir -p "$W/model" && cd "$W/model"
  curl -sSL -o m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2
  tar xjf m.tar.bz2 && rm m.tar.bz2
fi
echo "pronto. export MODEL_DIR=$W/model"
