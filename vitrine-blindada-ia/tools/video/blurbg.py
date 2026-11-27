"""Borra o fundo de um vídeo mantendo a pessoa nítida. uso: blurbg.py entrada.mp4 saida.mp4"""
import os, sys, cv2, numpy as np, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions

M = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/models/seg.tflite'
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=M), running_mode=vision.RunningMode.VIDEO, output_confidence_masks=True))
cap = cv2.VideoCapture(sys.argv[1])
fps = cap.get(cv2.CAP_PROP_FPS) or 30
w, h = int(cap.get(3)), int(cap.get(4))
out = cv2.VideoWriter(sys.argv[2], cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))
i = 0
prev = None
while True:
    ok, fr = cap.read()
    if not ok:
        break
    rgb = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
    r = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
    bg = r.confidence_masks[0].numpy_view()  # classe 0 = fundo
    person = 1.0 - bg
    person = cv2.GaussianBlur(person, (0, 0), 3)
    person = np.clip((person - 0.3) / 0.4, 0, 1)
    if prev is not None:
        person = 0.6 * person + 0.4 * prev  # suaviza tremida da máscara
    prev = person
    blur = cv2.GaussianBlur(fr, (0, 0), float(os.environ.get('BLUR_SIGMA', 22)))
    m = person[..., None]
    out.write((fr * m + blur * (1 - m)).astype(np.uint8))
    i += 1
out.release()
print('frames', i)
