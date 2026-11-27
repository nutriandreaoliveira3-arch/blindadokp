"""Vestido tropical (loja Bella): A1 + A2 + trecho final, sem música, gancho na capa, marca d'água IA."""
import os, subprocess, sys

U = '/root/.claude/uploads/1ee8f564-c481-5f05-98a2-fb44b8e2bb97'
S = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/bella'
T = f'{S}/tmp'
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
os.makedirs(T, exist_ok=True)
P = {
    'tropical': dict(a1='8fec1a2b-Woman_posing_in_tropical_dress_b06d1289.mp4', a2='bfe036ce-Woman_walking_in_dress_1743ce93.mp4',
                     hook=['Look de férias', 'na praia'],
                     texts=[['Com bojo:', 'dispensa sutiã'], ['Totalmente', 'forrado'], ['Veste do', '36 ao 42'], ['Toque no link', 'do produto']]),
    'amarelo': dict(a1='5d367231-Woman_in_yellow_dress_posing_1feb4388.mp4', a2='1d8d8a2a-Woman_walks_toward_camera_dcb2e944.mp4',
                    hook=['Um vestido,', 'dois looks'],
                    texts=[['Tomara que caia', 'ou frente única'], ['Elastex', 'nas costas'], ['Tamanhos', 'M e G'], ['Toque no link', 'do produto']]),
    'macaquinho-preto': dict(a1='c1f5d362-Woman_posing_in_black_romper_174d17b4.mp4', a2='424aca34-Woman_walks_toward_camera_smiling_67a19659.mp4',
                    hook=['Básico que salva', 'qualquer dia'],
                    texts=[['Alças', 'reguláveis'], ['Bolsos', 'frontais'], ['Bojo e elástico', 'nas costas'], ['Toque no link', 'do produto']]),
    'tricot': dict(a1='/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/bella/tricot-c1.mp4', a2='/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/bella/tricot-c2.mp4',
                    hook=['O luxo da', 'delicadeza'],
                    texts=[['Tricô', 'modal vazado'], ['Recortes', 'na cintura'], ['Fenda', 'lateral'], ['Toque no link', 'do produto']]),
    'macaquinho-bege': dict(a1='/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/bella/bege-c1.mp4', a2='/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/bella/bege-c2.mp4',
                    hook=['Elegante', 'sem esforço'],
                    texts=[['Alfaiataria', 'tomara que caia'], ['Cinto', 'incluso'], ['Bolsos', 'funcionais'], ['Toque no link', 'do produto']]),
    'vermelho': dict(a1='801d30ac-Woman_walking_in_dress_525563bd_1080p.mp4', a2='63998dd7-Woman_walking_toward_camera_538dedf9_1080p.mp4',
                    hook=['Pra ser o centro', 'das atenções'],
                    texts=[['Tricô', 'rendado'], ['Totalmente', 'forrado'], ['Tamanho único:', '36 ao 42'], ['Toque no link', 'do produto']]),
    'conjunto': dict(a1='24f5846f-Woman_posing_in_outfit_63aed5f6_1080p.mp4', a2='06676830-Woman_walks_toward_camera_b02919aa_1080p.mp4',
                    hook=['Look de', 'chefe'],
                    texts=[['Colete cropped', 'com zíper'], ['Pantalona de', 'cós alto'], ['Tamanhos', 'do P ao GG'], ['Toque no link', 'do produto']]),
    'vinho-modal': dict(a1='5088a90f-Woman_wearing_dress_turning_around_b45f7525_1080p.mp4', a2='7556e946-Woman_walking_toward_camera_ddceb3bb_1080p.mp4',
                    hook=['Vestido com', 'cara de rica'],
                    texts=[['Amarração', 'nas costas'], ['Comprimento', 'longo'], ['Diversas', 'cores'], ['Toque no link', 'do produto']]),
}
key = sys.argv[1]
c = P[key]
A1, A2 = [x if x.startswith('/') else f"{U}/{x}" for x in (c['a1'], c['a2'])]
BG = sys.argv[2] if len(sys.argv) > 2 else None
OUT = f'{S}/vestido-{key}.mp4'
T = f'{T}/{key}'; os.makedirs(T, exist_ok=True)

def run(c):
    r = subprocess.run(c, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:]); sys.exit(1)

def tf(n, s):
    p = f'{T}/{n}.txt'; open(p, 'w', encoding='utf-8').write(s); return p

def dt(p, fs, y, en, box=True):
    st = 'box=1:boxcolor=black@0.6:boxborderw=16' if box else 'borderw=5:bordercolor=black@0.85'
    return f"drawtext=textfile={p}:expansion=none:fontfile={F}:fontsize={fs}:fontcolor=white:{st}:x=(w-text_w)/2:y={y}:enable='{en}'"

# fundo do trecho: foto enviada ou o 1º quadro do A1
bg = BG or f'{T}/bg.png'
if not BG:
    run(['ffmpeg', '-v', 'error', '-y', '-i', A1, '-frames:v', '1', bg])

# cenas sem áudio da IA
hook = c['hook']
g = [dt(tf(f'h{i}', l), 52, f'h*0.30+{i*64}', 'lt(t,1.2)', box=False) for i, l in enumerate(hook)]
run(['ffmpeg', '-v', 'error', '-y', '-i', A1, '-vf', 'scale=720:1280,fps=30,' + ','.join(g) + ',format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '18', f'{T}/a1.mp4'])
run(['ffmpeg', '-v', 'error', '-y', '-i', A2, '-vf', 'scale=720:1280,fps=30,format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '18', f'{T}/a2.mp4'])

# trecho final: zoom lento + 4 textos
texts = list(zip(c['texts'], [0.3, 2.3, 4.3, 6.3], [2.3, 4.3, 6.3, None]))
f = []
for k, (ls, a, b) in enumerate(texts):
    en = f'between(t,{a},{b})' if b else f'gte(t,{a})'
    for i, l in enumerate(ls):
        f.append(dt(tf(f't{k}{i}', l), 46, f'h*0.63+{i*82}', en))
vf = "[0:v]scale=1440:2560,zoompan=z='min(1+0.0008*on,1.15)':x='iw/2-(iw/zoom/2)':y='ih*0.5-(ih/zoom/2)':d=255:s=720x1280:fps=30," + ','.join(f) + ',format=yuv420p[v]'
run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', bg, '-filter_complex', vf, '-map', '[v]', '-t', '8.5', '-c:v', 'libx264', '-crf', '19', f'{T}/t.mp4'])

# junta + marca d'água + áudio silencioso (música entra pelo TikTok)
mk = f"drawtext=textfile={tf('marca', 'Conteúdo gerado por IA')}:expansion=none:fontfile={F}:fontsize=20:fontcolor=white@0.85:borderw=2:bordercolor=black@0.6:x=w*0.04:y=h*0.74"
run(['ffmpeg', '-v', 'error', '-y', '-i', f'{T}/a1.mp4', '-i', f'{T}/a2.mp4', '-i', f'{T}/t.mp4', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
     '-filter_complex', f'[0:v][1:v][2:v]concat=n=3:v=1:a=0[v0];[v0]{mk},format=yuv420p[v]', '-map', '[v]', '-map', '3:a', '-shortest', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', OUT])
print('ok', OUT)
