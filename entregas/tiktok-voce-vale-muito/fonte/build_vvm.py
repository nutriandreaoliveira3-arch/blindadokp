import subprocess, sys
IMG=sys.argv[1]; FPS=30; X=0.6; TOT=103.7
cuts=[0,8.98,15.06,22.10,32.90,39.14,50.24,57.90,65.50,74.70,84.30,89.90,TOT]
seq=[("1.jpg",1.00,1.12,False,""),("4.jpg",1.05,1.18,False,""),("porta.jpg",1.00,1.12,False,""),
     ("4.jpg",1.40,1.55,True,",eq=saturation=0.7"),("5.jpg",1.00,1.14,False,""),("2.jpg",1.00,1.16,False,""),
     ("3.jpg",1.00,1.12,False,""),("porta.jpg",1.35,1.20,False,""),("8.jpg",1.00,1.16,False,""),
     ("1.jpg",1.45,1.30,False,",eq=gamma_r=1.05"),("3.jpg",1.35,1.50,False,""),("5.jpg",1.30,1.00,False,"")]
segs=[(f,cuts[i+1]-cuts[i],z0,z1,fl,ex) for i,(f,z0,z1,fl,ex) in enumerate(seq)]
inputs=[];fc=[]
for i,(f,d,z0,z1,fl,ex) in enumerate(segs):
    N=int((d+(X if i<len(segs)-1 else 0))*FPS); inputs+=["-i",f"{IMG}/{f}"]
    fc.append(f"[{i}:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840{',hflip' if fl else ''},"
      f"zoompan=z='{z0}+({z1}-{z0})*on/{N}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1080x1920:fps={FPS}{ex},"
      f"trim=end_frame={N},setsar=1,format=yuv420p[v{i}]")
prev="v0";off=0
for i in range(1,len(segs)):
    off+=segs[i-1][1]; fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={X}:offset={off:.2f}[x{i}]"); prev=f"x{i}"
n=len(segs)
fc.append(f"[{prev}]ass=legendas_vvm.ass,fade=t=out:st={TOT-1}:d=1[vout]")
fc.append(f"[{n}:a]loudnorm=I=-15:TP=-1.5:LRA=9,adelay=300|300,apad[voz]")
fc.append(f"[{n+1}:a]volume=0.20,afade=t=out:st={TOT-3}:d=3[mus]")
fc.append("[voz][mus]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[aout]")
cmd=["ffmpeg","-y","-hide_banner","-loglevel","error"]+inputs+["-i","voz2.wav","-i","music105.wav","-filter_complex",";".join(fc),
 "-map","[vout]","-map","[aout]","-t",str(TOT),"-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p",
 "-c:a","aac","-b:a","192k","-ar","44100","-movflags","+faststart",sys.argv[2]]
subprocess.run(cmd,check=True)
