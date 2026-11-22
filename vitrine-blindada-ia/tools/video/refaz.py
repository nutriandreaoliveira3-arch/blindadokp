"""Refaz todos os vídeos finais com o texto do trecho real centralizado linha a linha,
gancho centralizado (8 s) e marca d'água "Conteúdo gerado por IA" o vídeo inteiro."""
import os, subprocess, sys

S = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad'
U = '/root/.claude/uploads/1ee8f564-c481-5f05-98a2-fb44b8e2bb97'
C1, C2, AN = f'{S}/whey/clips', f'{S}/whey/clips2', f'{S}/animal'
OUT = f'{S}/whey/final-v3'
TMP = f'{OUT}/tmp'
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
os.makedirs(TMP, exist_ok=True)

def rd(p):
    return open(p, encoding='utf-8').read().strip().split('\n')

def txt3(d, base):
    return [rd(f'{d}/{base}_{i}.txt') for i in (1, 2, 3)]

# (nº, nome, vídeo da cena, crop da cena, fundo do trecho, [linhas t1,t2,t3], gancho [l1,l2], estilo do gancho)
V = [
    ('01', 'toddy', f'{U}/4dbf54c8-WhatsApp_Video_2026-11-19_at_14.37.14.mp4', None, f'{C1}/toddy.jpg', txt3(C1, 'toddy'), ['Whey sabor', 'Toddy?'], 'n'),
    ('02', 'integralmedica', f'{U}/246d6182-WhatsApp_Video_2026-11-19_at_10.32.14.mp4', None, f'{C1}/integralmedica.jpg', txt3(C1, 'integralmedica'), ['Conhece o Whey', 'da Integralmédica?'], 'n'),
    ('03', 'growth', f'{U}/1c4ee455-Woman_holding_protein_bag_972388d0.mp4', None, f'{C1}/growth.jpg', txt3(C1, 'growth'), ['Whey sabor baunilha', 'da Growth'], 'n'),
    ('04', 'forster', f'{U}/365c7f40-Woman_holding_protein_jar_6ea56cac.mp4', None, f'{C2}/04-forster.jpg', txt3(C2, '04-forster'), ['Whey sabor morango,', 'conhece?'], 'n'),
    ('05', 'tasty', f'{U}/02be8736-Woman_holding_protein_jar_d2d67b4b.mp4', None, f'{C2}/03-adaptogen-tasty.jpg', txt3(C2, '03-adaptogen-tasty'), ['Tasty Whey', 'sabor original'], 'n'),
    ('06', 'isolate', f'{U}/db61789d-Woman_holding_protein_jar_02207043.mp4', 'crop=600:1066:60:0,', f'{C2}/02-adaptogen-isolate.jpg', txt3(C2, '02-adaptogen-isolate'), ['Whey sabor', 'morango e kiwi?'], 'n'),
    ('07', 'dg', f'{U}/531eb25b-Woman_holding_protein_jar_7023beab.mp4', None, f'{C2}/06-dg.jpg', txt3(C2, '06-dg'), ['Whey isolado', 'sabor morango'], 'n'),
    ('08', 'nyer', f'{U}/8f36f9db-Woman_holding_protein_bag_941dfc58.mp4', None, f'{C2}/10-nyer.jpg', txt3(C2, '10-nyer'), ['Milk Protein', 'sabor chocolate'], 'n'),
    ('09', 'darklab', f'{U}/755cf1d3-Woman_holding_product_in_kitchen_6b4a5233.mp4', None, f'{C2}/11-darklab.jpg', txt3(C2, '11-darklab'), ['Whey baunilha', 'da Dark Lab'], 'n'),
    ('10', 'maxblend', f'{U}/4f258d1a-Woman_holding_protein_bag_bbc53ec4.mp4', None, f'{C2}/08-maxblend.jpg', txt3(C2, '08-maxblend'), ['Whey Blend', 'da Max Titanium'], 'n'),
    ('11', 'forcesens', f'{U}/58d7dda2-Woman_presenting_protein_jar_46844935.mp4', None, f'{C2}/07-forcesens.jpg', txt3(C2, '07-forcesens'), ['Whey sabor', 'pistache?'], 'n'),
    ('12', 'horse', f'{U}/0edb238c-Woman_holding_protein_product_shot_e2fac409.mp4', None, f'{C2}/12-horse.jpg', txt3(C2, '12-horse'), ['Horse Whey', 'sabor baunilha'], 'n'),
    ('13', 'stronghorn', f'{U}/59731b68-Woman_presenting_protein_product__14b71d1c.mp4', None, f'{C2}/sh.jpg', txt3(C2, 'sh'), ['Kit: 2 pacotes', '+ coqueteleira'], 'n'),
    ('14', 'animal', f'{U}/b2b4c62c-Woman_holding_protein_bag_56c511ba.mp4', None, f'{AN}/real_animal.jpg', [rd(f'{AN}/l1.txt'), rd(f'{AN}/l2.txt'), rd(f'{AN}/l3.txt')], ['Whey sabor', 'banoffee pie?'], 'n'),
    ('15', 'svseven', f'{U}/d576cac8-Woman_presenting_protein_jars_64ff3b32.mp4', None, f'{C2}/sv.jpg', txt3(C2, 'sv'), ['Kit com 2 potes', 'Gourmet Protein'], 'n'),
    ('16', 'rnutrition', f'{U}/5b93f575-Woman_holding_protein_jar_d57cd807.mp4', None, f'{C2}/05-rnutrition.jpg', txt3(C2, '05-rnutrition'), ['Iso Protein Fusion', 'sabor chocolate'], 'p'),
    ('17', 'nyer-v2', f'{U}/2238f1f6-Woman_holding_product_in_kitchen_93279540.mp4', None, f'{C2}/10-nyer.jpg', txt3(C2, '10-nyer'), ['Milk Protein 80', 'sabor chocolate'], 't'),
    ('18', 'rnutrition-v2', f'{U}/0ec10ef6-Woman_holding_protein_jar_aa2058f8.mp4', None, f'{C2}/05-rnutrition.jpg', txt3(C2, '05-rnutrition'), ['Iso Protein Fusion', 'sabor chocolate'], 'p'),
]

def tf(name, s):
    p = f'{TMP}/{name}.txt'
    open(p, 'w', encoding='utf-8').write(s)
    return p

def lines_filter(key, lines, start, end, y0, fs):
    out = []
    for i, ln in enumerate(lines):
        p = tf(f'{key}_{i}', ln)
        en = f"between(t,{start},{end})" if end else f"gte(t,{start})"
        out.append(f"drawtext=textfile={p}:expansion=none:fontfile={F}:fontsize={fs}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=16:x=(w-text_w)/2:y=h*{y0}+{i*(fs+36)}:enable='{en}'")
    return out

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-800:]); sys.exit(1)

marca = tf('marca', 'Conteúdo gerado por IA')
only = sys.argv[1:]
for n, name, scene, crop, bg, (t1, t2, t3), hook, hs in V:
    if only and n not in only:
        continue
    key = f'{n}-{name}'
    # trecho real
    f = []
    f += lines_filter(f'{key}_t1', t1, 0.3, 2.6, 0.17, 46)
    f += lines_filter(f'{key}_t2', t2, 2.6, 4.9, 0.17, 46)
    f += lines_filter(f'{key}_t3', t3, 4.9, None, 0.17, 44)
    vf = "[0:v]scale=1440:2560,zoompan=z='min(1+0.0008*on,1.15)':x='iw/2-(iw/zoom/2)':y='ih*0.58-(ih/zoom/2)':d=225:s=720x1280:fps=30," + ','.join(f) + ',format=yuv420p[v]'
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', bg, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '7.5', '-filter_complex', vf, '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-crf', '19', '-c:a', 'aac', '-shortest', f'{TMP}/{key}_t.mp4'])
    # cena (primeiros 8 s) com gancho
    hy, hf, hstep = {'n': (0.345, 50, 62), 'p': (0.345, 44, 54), 't': (0.20, 50, 62)}[hs]
    g = []
    for i, ln in enumerate(hook):
        p = tf(f'{key}_h{i}', ln)
        g.append(f"drawtext=textfile={p}:expansion=none:fontfile={F}:fontsize={hf}:fontcolor=white:borderw=5:bordercolor=black@0.85:x=(w-text_w)/2:y=h*{hy}+{i*hstep}:enable='lt(t,1.2)'")
    run(['ffmpeg', '-v', 'error', '-y', '-t', '7.93', '-i', scene, '-vf', (crop or '') + 'scale=720:1280,fps=30,' + ','.join(g) + ',format=yuv420p', '-af', 'afade=t=out:st=7.4:d=0.5', '-c:v', 'libx264', '-crf', '18', '-c:a', 'aac', '-ar', '48000', '-ac', '2', f'{TMP}/{key}_c.mp4'])
    # junta e aplica a marca d'água no vídeo inteiro
    mk = f"drawtext=textfile={marca}:expansion=none:fontfile={F}:fontsize=30:fontcolor=white@0.9:borderw=3:bordercolor=black@0.7:box=1:boxcolor=black@0.35:boxborderw=10:x=(w-text_w)/2:y=h*0.115"
    run(['ffmpeg', '-v', 'error', '-y', '-i', f'{TMP}/{key}_c.mp4', '-i', f'{TMP}/{key}_t.mp4', '-filter_complex', f'[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v0][a];[v0]{mk},format=yuv420p[v]', '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', f'{OUT}/{key}.mp4'])
    print('ok', key, flush=True)
