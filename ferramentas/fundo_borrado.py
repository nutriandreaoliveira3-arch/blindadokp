# Desfoca o fundo do vídeo (estilo "modo retrato"), mantendo a pessoa nítida.
# Uso: python3 fundo_borrado.py entrada.mp4 saida.mp4 [forca=35]
# Modelo: MediaPipe selfie_multiclass (baixado pelo setup.sh em ferramentas/modelos/seg.tflite)
import sys, os, subprocess, cv2, numpy as np, mediapipe as mp
src, out = sys.argv[1], sys.argv[2]; K = int(sys.argv[3]) if len(sys.argv) > 3 else 35
M = os.environ.get('SEG_MODEL', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos', 'seg.tflite'))
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 30
w, h = int(cap.get(3)), int(cap.get(4))
BaseOptions = mp.tasks.BaseOptions; IS = mp.tasks.vision.ImageSegmenter
opt = mp.tasks.vision.ImageSegmenterOptions(base_options=BaseOptions(model_asset_path=M),
      running_mode=mp.tasks.vision.RunningMode.VIDEO, output_confidence_masks=True)
enc = subprocess.Popen(['ffmpeg','-nostdin','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{w}x{h}','-r',str(fps),'-i','-',
      '-i',src,'-map','0:v','-map','1:a?','-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','-c:a','copy','-shortest',out], stdin=subprocess.PIPE)
prev = None; i = 0; s = max(1, (min(w, h) // 1080))
with IS.create_from_options(opt) as seg:
    while True:
        ok, f = cap.read()
        if not ok: break
        rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
        r = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
        m = 1.0 - r.confidence_masks[0].numpy_view()          # 1 = pessoa (cabelo, pele, roupa, óculos)
        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)
        prev = m if prev is None else 0.55 * m + 0.45 * prev    # suaviza tremido entre quadros
        a = cv2.GaussianBlur(np.clip((prev - 0.35) / 0.4, 0, 1), (0, 0), 3 * s)[..., None]
        sm = cv2.resize(f, (w // 8, h // 8), interpolation=cv2.INTER_AREA)
        bg = cv2.resize(cv2.GaussianBlur(sm, (0, 0), K * s / 8), (w, h), interpolation=cv2.INTER_LINEAR)
        enc.stdin.write((f * a + bg * (1 - a)).astype(np.uint8).tobytes()); i += 1
enc.stdin.close(); enc.wait(); print(out, i, 'quadros')
