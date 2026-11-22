"""Macacão pantalona em 3 cores: azul -> caramelo -> (mão cobre a câmera) -> preto + fechamento. Sem música."""
import os, subprocess, sys, glob

U = '/root/.claude/uploads/1ee8f564-c481-5f05-98a2-fb44b8e2bb97'
S = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/bella'
IMG = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/images/195.jpg'
T = f'{S}/tmp/macacao'
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
os.makedirs(T, exist_ok=True)
g = lambda p: glob.glob(f'{U}/{p}*.mp4')[0]
AZUL, CARAMELO, PRETO = g('c7c44413'), g('1b1f6c18'), g('ee3bbc54')
OUT = f'{S}/macacao-3-cores.mp4'
HOOK = ['Difícil escolher', 'uma cor!']
CLOSING = [['Macacão', 'pantalona'], ['Frente', 'única'], ['Diversas', 'cores'], ['Toque no link', 'do produto']]


def run(c):
    r = subprocess.run(c, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:]); sys.exit(1)


def tf(n, s):
    p = f'{T}/{n}.txt'; open(p, 'w', encoding='utf-8').write(s); return p


def dt(p, fs, y, en, box=True):
    st = 'box=1:boxcolor=black@0.6:boxborderw=16' if box else 'borderw=5:bordercolor=black@0.85'
    return f"drawtext=textfile={p}:expansion=none:fontfile={F}:fontsize={fs}:fontcolor=white:{st}:x=(w-text_w)/2:y={y}:enable='{en}'"


def seg(name, src, ss, to, hook=False):
    vf = 'scale=720:1280,fps=30'
    if hook:
        vf += ',' + ','.join(dt(tf(f'h{i}', l), 52, f'h*0.30+{i*64}', 'lt(t,1.2)', box=False) for i, l in enumerate(HOOK))
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-to', str(to), '-i', src, '-vf', vf + ',format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '18', f'{T}/{name}.mp4'])


seg('s1', AZUL, 0, 4.4, hook=True)       # azul: apresentação + beijo
seg('s2', CARAMELO, 0, 4.2, hook=False)  # caramelo: termina com a mão cobrindo a câmera
seg('s3', PRETO, 4.1, 8.0, hook=False)   # preto: começa com a mão saindo, mostra as costas

# fechamento: imagem aprovada (caramelo) com zoom lento e textos
f = []
for k, (ls, a, b) in enumerate(zip(CLOSING, [0.3, 2.3, 4.3, 6.3], [2.3, 4.3, 6.3, None])):
    en = f'between(t,{a},{b})' if b else f'gte(t,{a})'
    for i, l in enumerate(ls):
        f.append(dt(tf(f't{k}{i}', l), 46, f'h*0.63+{i*82}', en))
vf = "[0:v]scale=1440:2560,zoompan=z='min(1+0.0008*on,1.15)':x='iw/2-(iw/zoom/2)':y='ih*0.5-(ih/zoom/2)':d=255:s=720x1280:fps=30," + ','.join(f) + ',format=yuv420p[v]'
run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', IMG, '-filter_complex', vf, '-map', '[v]', '-t', '8.5', '-c:v', 'libx264', '-crf', '19', f'{T}/t.mp4'])

mk = f"drawtext=textfile={tf('marca', 'Conteúdo gerado por IA')}:expansion=none:fontfile={F}:fontsize=20:fontcolor=white@0.85:borderw=2:bordercolor=black@0.6:x=w*0.04:y=h*0.74"
run(['ffmpeg', '-v', 'error', '-y', '-i', f'{T}/s1.mp4', '-i', f'{T}/s2.mp4', '-i', f'{T}/s3.mp4', '-i', f'{T}/t.mp4', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
     '-filter_complex', f'[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0[v0];[v0]{mk},format=yuv420p[v]', '-map', '[v]', '-map', '4:a', '-shortest', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', OUT])
print('ok', OUT)
