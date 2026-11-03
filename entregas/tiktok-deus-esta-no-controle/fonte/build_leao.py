import re, subprocess, sys
ass, voz, musica, saida = sys.argv[1:5]
L="/tmp/claude-0/-home-user-blindadokp/9fe8d854-c742-5b37-b5f1-5b6030b0324a/images/leoes"
ev=[]
for line in open(ass):
    m=re.match(r"Dialogue: 0,(\S+?),(\S+?),\w,,0,0,0,,\{.*?\}(.*)",line.strip())
    if m:
        def t(s): h,mi,se=s.split(':'); return int(h)*3600+int(mi)*60+float(se)
        ev.append((t(m.group(1)),m.group(3)))
words=[w for _,w in ev]
def idx(seq,start=0):
    for i in range(start,len(words)-len(seq)+1):
        if words[i:i+len(seq)]==seq: return i
    raise SystemExit(f"nao achei {seq}")
marks=[idx(["PORQUE","AINDA"]),idx(["SE","DEUS","TÁ","DIZENDO"]),idx(["PORQUE","ELE"]),idx(["QUANDO"]),idx(["ELE","CONSEGUE"]),
       idx(["ELE","TE","PEDE"]),idx(["RESPIRA,"]),idx(["SE","VOCÊ","CONFIA,"])]
TOT=ev[-1][0]+2.2
cuts=[0]+[ev[m][0]-0.08 for m in marks]+[TOT]
imgs=[1,2,3,4,5,3,6,7,8]
zoom=[(1.0,1.15),(1.12,1.0),(1.0,1.18),(1.0,1.15),(1.15,1.0),(1.45,1.25),(1.0,1.15),(1.0,1.12),(1.0,1.2)]
K=len(imgs)
FPS=30; X=0.25; inputs=[]; fc=[]
for i in range(K):
    d=cuts[i+1]-cuts[i]; N=int((d+(X if i<K-1 else 0))*FPS); z0,z1=zoom[i]
    inputs+=["-i",f"{L}/L{imgs[i]}.jpg"]
    fc.append(f"[{i}:v]scale=2160:3840,zoompan=z='{z0}+({z1}-{z0})*on/{N}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1080x1920:fps={FPS},"
              f"eq=contrast=1.06:saturation=1.08,trim=end_frame={N},setsar=1,format=yuv420p[v{i}]")
prev="v0"; off=0
for i in range(1,K):
    off+=cuts[i]-cuts[i-1]; fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={X}:offset={off:.2f}[x{i}]"); prev=f"x{i}"
fc.append(f"[{prev}]vignette=PI/5,ass={ass},fade=t=out:st={TOT-0.8}:d=0.8[vout]")
n=K; ins=["-i",musica]
if voz!='-':
    ins=["-i",voz,"-i",musica]
    fc.append(f"[{n}:a]loudnorm=I=-14:TP=-1.5:LRA=8,adelay=0|0,apad[v]")
    fc.append(f"[{n+1}:a]volume=0.22,afade=t=out:st={TOT-2}:d=2[m]")
    fc.append("[v][m]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[aout]")
else:
    fc.append(f"[{n}:a]volume=0.8,afade=t=out:st={TOT-2}:d=2[aout]")
cmd=["ffmpeg","-y","-hide_banner","-loglevel","error"]+inputs+ins+["-filter_complex",";".join(fc),"-map","[vout]","-map","[aout]",
     "-t",f"{TOT:.2f}","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart",saida]
subprocess.run(cmd,check=True); print("TOT",round(TOT,2),"cuts",[round(c,2) for c in cuts])
