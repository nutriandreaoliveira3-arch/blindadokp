"""Monta os vídeos de moda de 22/11: jeans, amarelo, rosa e macacão (textos reais do anúncio). Sem música."""
import glob, os, re, subprocess, sys

S = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad'
Z, B = f'{S}/zips', f'{S}/bella'
T, OUT = f'{B}/tmp/v4', f'{B}/final4'
U = '/root/.claude/uploads/1ee8f564-c481-5f05-98a2-fb44b8e2bb97'
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
for d in (T, OUT, f'{B}/blur'):
    os.makedirs(d, exist_ok=True)
L = {l.split(' | ')[0]: f"{Z}/{l.strip().split(' | ')[1]}" for l in open(f'{Z}/list.txt')}


def run(c, check=True):
    r = subprocess.run(c, capture_output=True, text=True)
    if r.returncode and check:
        print(r.stderr[-1500:]); sys.exit(1)
    return r


def blur(n):
    out = f'{B}/blur/c{n}.mp4'
    if not os.path.exists(out):
        run(['python3', f'{S}/tools/blurbg.py', L[n], out], check=False)
        assert os.path.exists(out), f'falhou o borrão do clipe {n}'
    return out


def psnr(a, b):
    r = run(['ffmpeg', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-'], check=False)
    m = re.search(r'average:([\d.]+|inf)', r.stderr)
    return 99.0 if not m or m.group(1) == 'inf' else float(m.group(1))


def tf(n, s):
    p = f'{T}/{n}.txt'; open(p, 'w', encoding='utf-8').write(s); return p


def dt(p, fs, y, en, box=True):
    st = 'box=1:boxcolor=black@0.6:boxborderw=16' if box else 'borderw=5:bordercolor=black@0.85'
    return f"drawtext=textfile={p}:expansion=none:fontfile={F}:fontsize={fs}:fontcolor=white:{st}:x=(w-text_w)/2:y={y}:enable='{en}'"


def build(key, segs, hook, closing, closing_img):
    parts = []
    for i, (src, ss, to) in enumerate(segs):
        vf = 'scale=720:1280,fps=30'
        if i == 0:
            vf += ',' + ','.join(dt(tf(f'{key}h{j}', l), 52, f'h*0.30+{j*64}', 'lt(t,1.2)', box=False) for j, l in enumerate(hook))
        cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', str(ss)] + (['-to', str(to)] if to else []) + ['-i', src, '-vf', vf + ',format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '18', f'{T}/{key}_s{i}.mp4']
        run(cmd); parts.append(f'{T}/{key}_s{i}.mp4')
    step = 1.9
    dur = 0.3 + step * len(closing) + 0.6
    f = []
    for k, ls in enumerate(closing):
        a = 0.3 + k * step
        en = f'between(t,{a:.1f},{a+step:.1f})' if k < len(closing) - 1 else f'gte(t,{a:.1f})'
        for i, l in enumerate(ls):
            f.append(dt(tf(f'{key}t{k}{i}', l), 46, f'h*0.63+{i*82}', en))
    d = int(dur * 30)
    vf = f"[0:v]scale=1440:2560,zoompan=z='min(1+0.0008*on,1.15)':x='iw/2-(iw/zoom/2)':y='ih*0.5-(ih/zoom/2)':d={d}:s=720x1280:fps=30," + ','.join(f) + ',format=yuv420p[v]'
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', closing_img, '-filter_complex', vf, '-map', '[v]', '-t', f'{dur:.1f}', '-c:v', 'libx264', '-crf', '19', f'{T}/{key}_t.mp4'])
    parts.append(f'{T}/{key}_t.mp4')
    mk = f"drawtext=textfile={tf('marca', 'Conteúdo gerado por IA')}:expansion=none:fontfile={F}:fontsize=20:fontcolor=white@0.85:borderw=2:bordercolor=black@0.6:x=w*0.04:y=h*0.74"
    n = len(parts)
    inp = sum([['-i', p] for p in parts], []) + ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
    fc = ''.join(f'[{i}:v]' for i in range(n)) + f'concat=n={n}:v=1:a=0[v0];[v0]{mk},format=yuv420p[v]'
    run(['ffmpeg', '-v', 'error', '-y'] + inp + ['-filter_complex', fc, '-map', '[v]', '-map', f'{n}:a', '-shortest', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', f'{OUT}/{key}.mp4'])
    print('ok', key, flush=True)


def frame(src, t, out):
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', src, '-frames:v', '1', out]); return out


want = sys.argv[1:] or ['jeans', 'amarelo', 'rosa', 'macacao']

if 'jeans' in want:
    a, b = blur('01'), blur('02')
    build('jeans', [(a, 0, None), (b, 0, None)], ['Esse detalhe', 'faz diferença!'],
          [['Tomara', 'que caia'], ['Bolsos laterais', 'funcionais'], ['100%', 'algodão'], ['Toque no link', 'do produto']], frame(a, 0.5, f'{T}/jeans.png'))

if 'amarelo' in want:
    ids = ['03', '04', '07']
    best = min(((psnr(L[x], L[y]), x, y) for i, x in enumerate(ids) for y in ids[i + 1:]))
    print('par amarelo menos parecido (psnr, a, b):', best, flush=True)
    a, b = blur(best[1]), blur(best[2])
    build('amarelo', [(a, 0, None), (b, 0, None)], ['Esse conjunto', 'é um charme!'],
          [['Blusa e', 'short saia'], ['Em', 'alfaiataria'], ['Toque no link', 'do produto']], frame(a, 0.5, f'{T}/amarelo.png'))

if 'rosa' in want:
    a = blur('13')
    build('rosa', [(a, 0, None)], ['Elegância em', 'cada detalhe!'],
          [['Decote', 'ombro a ombro'], ['Fenda', 'lateral'], ['Toque no link', 'do produto']], frame(a, 0.5, f'{T}/rosa.png'))

if 'macacao' in want:
    g = lambda p: glob.glob(f'{U}/{p}*.mp4')[0]
    build('macacao', [(g('c7c44413'), 0, 4.4), (g('1b1f6c18'), 0, 4.2), (g('ee3bbc54'), 4.1, 8.0)], ['Difícil escolher', 'uma cor!'],
          [['Bojo e lastex', 'nas costas'], ['Tecido', 'duna premium'], ['Totalmente', 'forrado'], ['Tamanhos P e M', 'do 36 ao 40'], ['Toque no link', 'do produto']],
          '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/images/195.jpg')
