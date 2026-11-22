"""Monta os vídeos do lote de 22/11 (3 clipes por peça): vermelho, listrado, franjas, preto, rosa, verde."""
import os, subprocess, sys

S = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad'
LOT = f'{S}/lotes2'
B = f'{S}/bella'
T, OUT = f'{B}/tmp/v5', f'{B}/final5'
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
for d in (T, OUT, f'{B}/blur5'):
    os.makedirs(d, exist_ok=True)
P = {}
for l in open(f'{LOT}/uniq.txt'):
    n, _, _, path = l.rstrip('\n').split('|', 3)
    P[n] = f'{LOT}/{path[2:]}' if path.startswith('./') else path
os.environ.setdefault('BLUR_SIGMA', '8')

LOOKS = {
    'vermelho': dict(clips=['01'], blur=False, hook=['Esse look tem', 'presença!'],
                     closing=[['Conjunto de', 'tricô rendado'], ['Top e', 'saia longa'], ['Tamanho único:', '36 ao 42'], ['Toque no link', 'do produto']]),
    'listrado': dict(clips=['02', '15'], blur=True, hook=['Simplesmente', 'olha essa peça!'],
                     closing=[['Estampa', 'listrada'], ['Design', 'assimétrico'], ['Recorte', 'na cintura'], ['Toque no link', 'do produto']]),
    'franjas': dict(clips=['06', '16', '19'], blur=False, hook=['O luxo da', 'delicadeza'],
                    closing=[['Frente', 'única'], ['Fivela', 'central'], ['Franjas longas', 'na saia'], ['Recortes', 'laterais'], ['Toque no link', 'do produto']]),
    'preto': dict(clips=['07', '10', '17'], blur=True, hook=['Pra ser o centro', 'das atenções'],
                  closing=[['Alças', 'finas'], ['Fenda', 'lateral'], ['Suplex', 'premium'], ['Toque no link', 'do produto']]),
    'rosa': dict(clips=['08', '09', '12'], blur=False, hook=['Elegância em', 'cada detalhe!'],
                 closing=[['Decote', 'ombro a ombro'], ['Fenda', 'lateral'], ['Toque no link', 'do produto']]),
    'verde': dict(clips=['11', '13', '14'], blur=True, hook=['Um look, várias', 'possibilidades!'],
                  closing=[['Pantalona de', 'cintura alta'], ['Amarração', 'na frente'], ['Do 36', 'ao 48'], ['Toque no link', 'do produto']]),
}
import glob as _g
_U = '/root/.claude/uploads/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/'
P['b1'] = _g.glob(_U + 'adb695a7*.mp4')[0]   # branco: frente, alças finas em V
P['b2'] = _g.glob(_U + 'b1fb3335*.mp4')[0]   # branco: costas e giro
LOOKS['branco'] = dict(clips=['b1', 'b2'], blur=False, win=[(0.0, 6.0), (0.0, 7.9)], hook=['O luxo da', 'delicadeza'],
                       closing=[['Tricô', 'modal'], ['Alças cruzadas', 'nas costas'], ['Veste do', '38 ao 44'], ['Toque no link', 'do produto']])
WIN = [(0.0, 5.2), (0.5, 5.7), (2.0, 7.3)]
WINS = {1: [(0.0, 7.9)], 2: WIN[:2], 3: WIN}


def run(c, check=True):
    r = subprocess.run(c, capture_output=True, text=True)
    if r.returncode and check:
        print(r.stderr[-1500:]); sys.exit(1)
    return r


def blur(n):
    out = f'{B}/blur5/c{n}.mp4'
    if not os.path.exists(out):
        run(['python3', f'{S}/tools/blurbg.py', P[n], out], check=False)
        assert os.path.exists(out), f'falhou o borrão do clipe {n}'
    return out


def tf(n, s):
    p = f'{T}/{n}.txt'; open(p, 'w', encoding='utf-8').write(s); return p


def dt(p, fs, y, en, box=True):
    st = 'box=1:boxcolor=black@0.6:boxborderw=16' if box else 'borderw=5:bordercolor=black@0.85'
    return f"drawtext=textfile={p}:expansion=none:fontfile={F}:fontsize={fs}:fontcolor=white:{st}:x=(w-text_w)/2:y={y}:enable='{en}'"


def build(key, spec):
    srcs = [blur(n) if spec['blur'] else P[n] for n in spec['clips']]
    parts = []
    for i, (src, (ss, to)) in enumerate(zip(srcs, spec.get('win') or WINS[len(srcs)])):
        vf = 'scale=720:1280,fps=30'
        if i == 0:
            vf += ',' + ','.join(dt(tf(f'{key}h{j}', l), 52, f'h*0.30+{j*64}', 'lt(t,1.2)', box=False) for j, l in enumerate(spec['hook']))
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-to', str(to), '-i', src, '-vf', vf + ',format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '18', f'{T}/{key}_s{i}.mp4'])
        parts.append(f'{T}/{key}_s{i}.mp4')
    img = f'{T}/{key}.png'
    run(['ffmpeg', '-v', 'error', '-y', '-ss', '0.6', '-i', srcs[0], '-frames:v', '1', img])
    step = 1.9; cl = spec['closing']; dur = 0.3 + step * len(cl) + 0.6
    f = []
    for k, ls in enumerate(cl):
        a = 0.3 + k * step
        en = f'between(t,{a:.1f},{a+step:.1f})' if k < len(cl) - 1 else f'gte(t,{a:.1f})'
        for i, l in enumerate(ls):
            f.append(dt(tf(f'{key}t{k}{i}', l), 46, f'h*0.63+{i*82}', en))
    d = int(dur * 30)
    vf = f"[0:v]scale=1440:2560,zoompan=z='min(1+0.0008*on,1.15)':x='iw/2-(iw/zoom/2)':y='ih*0.5-(ih/zoom/2)':d={d}:s=720x1280:fps=30," + ','.join(f) + ',format=yuv420p[v]'
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', img, '-filter_complex', vf, '-map', '[v]', '-t', f'{dur:.1f}', '-c:v', 'libx264', '-crf', '19', f'{T}/{key}_t.mp4'])
    parts.append(f'{T}/{key}_t.mp4')
    mk = f"drawtext=textfile={tf('marca', 'Conteúdo gerado por IA')}:expansion=none:fontfile={F}:fontsize=20:fontcolor=white@0.85:borderw=2:bordercolor=black@0.6:x=w*0.04:y=h*0.74"
    n = len(parts)
    inp = sum([['-i', p] for p in parts], []) + ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
    fc = ''.join(f'[{i}:v]' for i in range(n)) + f'concat=n={n}:v=1:a=0[v0];[v0]{mk},format=yuv420p[v]'
    run(['ffmpeg', '-v', 'error', '-y'] + inp + ['-filter_complex', fc, '-map', '[v]', '-map', f'{n}:a', '-shortest', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', f'{OUT}/{key}.mp4'])
    print('ok', key, flush=True)


for k in (sys.argv[1:] or list(LOOKS)):
    build(k, LOOKS[k])
