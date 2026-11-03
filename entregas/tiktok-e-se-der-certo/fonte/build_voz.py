import subprocess, sys
IMG=sys.argv[1]; FPS=30; X=0.6; TOT=42.6
segs=[("1.jpg",5.0,1.00,1.12,""),("4.jpg",7.4,1.05,1.20,""),("8.jpg",5.2,1.00,1.15,""),
      ("3.jpg",7.8,1.00,1.14,""),("1.jpg",5.4,1.45,1.30,",eq=saturation=0.75:brightness=-0.04"),
      ("2.jpg",3.2,1.00,1.10,""),("5.jpg",8.6,1.18,1.00,"")]
inputs=[];fc=[]
for i,(f,d,z0,z1,ex) in enumerate(segs):
    N=int((d+(X if i<len(segs)-1 else 0))*FPS)
    inputs+=["-i",f"{IMG}/{f}"]
    fc.append(f"[{i}:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,"
      f"zoompan=z='{z0}+({z1}-{z0})*on/{N}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1080x1920:fps={FPS}{ex},"
      f"trim=end_frame={N},setsar=1,format=yuv420p[v{i}]")
prev="v0";off=0
for i in range(1,len(segs)):
    off+=segs[i-1][1]; fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={X}:offset={off:.2f}[x{i}]"); prev=f"x{i}"
n=len(segs)
fc.append(f"[{prev}]ass=legendas_voz.ass,fade=t=out:st={TOT-0.9}:d=0.9[vout]")
fc.append(f"[{n}:a]loudnorm=I=-15:TP=-1.5:LRA=9,adelay=300|300,apad[voz]")
fc.append(f"[{n+1}:a]volume=0.20,afade=t=out:st={TOT-2.4}:d=2.4[mus]")
fc.append(f"[voz][mus]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[aout]")
cmd=["ffmpeg","-y","-hide_banner","-loglevel","error"]+inputs+["-i","voz.wav","-i","music.wav","-filter_complex",";".join(fc),
 "-map","[vout]","-map","[aout]","-t",str(TOT),"-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p",
 "-c:a","aac","-b:a","192k","-ar","44100","-movflags","+faststart",sys.argv[2]]
subprocess.run(cmd,check=True)
