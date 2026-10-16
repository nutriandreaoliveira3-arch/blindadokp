import json,sys,subprocess
spec=json.load(open(sys.argv[1])); src=spec['src']; out=spec['out']
ch=spec['chunks']; cuts=spec.get('cuts')
if not cuts:
    segs=[]
    for a,b,t in ch:
        a2,b2=a-0.08,b+0.10
        if segs and a2-segs[-1][1]<=0.45: segs[-1][1]=max(segs[-1][1],b2)
        else: segs.append([a2,b2])
else: segs=cuts
def m(t):
    acc=0
    for a,b in segs:
        if t<a: return acc
        if t<=b: return acc+(t-a)
        acc+=b-a
    return acc
zs=[1.10]+[1.0 if i%2 else 1.07 for i in range(1,len(segs))]
W,H=1080,1920;n=len(segs)
fc=("[0:v]fps=25,scale=1080:1920:flags=lanczos,hqdn3d=1.5:1.5:4:4,split[o][s];[s]bilateral=sigmaS=6:sigmaR=0.06,format=yuv420p[sm];"
    "[o][sm]blend=all_mode=normal:all_opacity=0.45,eq=contrast=1.05:brightness=0.015:saturation=0.97:gamma=1.02,"
    "colorbalance=rs=0.02:bs=-0.02:rm=0.01:bm=-0.01,unsharp=5:5:0.45:5:5:0,format=yuv420p,split=%d"%n+"".join(f"[v{i}]" for i in range(n))+";")
fc+="[0:a]highpass=f=80,afftdn=nf=-25,equalizer=f=3000:t=q:w=1.2:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,asplit=%d"%n+"".join(f"[a{i}]" for i in range(n))+";"
cat=""
for i,((a,b),z) in enumerate(zip(segs,zs)):
    cw=int(W/z)//2*2; chh=int(H/z)//2*2; x=(W-cw)//2; y=int((H-chh)*0.28)
    fc+=f"[v{i}]trim={a}:{b},setpts=PTS-STARTPTS,crop={cw}:{chh}:{x}:{y},scale={W}:{H}:flags=lanczos,setsar=1[vv{i}];"
    fc+=f"[a{i}]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b-a-0.03:.3f}:d=0.03[aa{i}];"
    cat+=f"[vv{i}][aa{i}]"
def ts(t):
    t=max(0,t); return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
hdr=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'modelos','legendas.ass')).read().split('[Events]')[0]+"[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
ev=[]
for i,(a,b,t) in enumerate(ch):
    s=m(a); e=m(ch[i+1][0]) if i+1<len(ch) else m(b)+0.4
    e=min(e,m(b)+0.6)
    ev.append(f"Dialogue: 0,{ts(s)},{ts(e)},Ref,,0,0,0,,{t}\n")
ass=out.replace('.mp4','.ass'); open(ass,'w').write(hdr+"".join(ev))
fc+=cat+f"concat=n={n}:v=1:a=1[cv][ca];[cv]ass={ass},format=yuv420p[v];[ca]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100,aformat=channel_layouts=stereo[a]"
subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-i",src,"-filter_complex",fc,"-map","[v]","-map","[a]","-r","25","-c:v","libx264","-preset","slow","-crf","18","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k",out],check=True)
print(out, round(sum(b-a for a,b in segs),2), "segs",n)
