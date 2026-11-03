import subprocess, sys
IMG=sys.argv[1]; FPS=30; X=0.7
# (image, duration, zoom start, zoom end, flip, extra filter)
segs=[
 ("1.jpg", 6, 1.00,1.12,False,""),
 ("4.jpg",11, 1.05,1.20,False,""),
 ("4.jpg", 7, 1.35,1.50,True ,",eq=gamma_r=1.08:gamma_b=0.92:saturation=0.9"),
 ("3.jpg", 8, 1.00,1.14,False,""),
 ("1.jpg", 7, 1.45,1.30,False,",eq=saturation=0.75:brightness=-0.04"),
 ("2.jpg", 6, 1.00,1.15,False,""),
 ("5.jpg",12.7,1.18,1.00,False,""),
]
inputs=[];fc=[]
for i,(f,d,z0,z1,flip,ex) in enumerate(segs):
    L=d+(X if i<len(segs)-1 else 0); N=int(L*FPS)
    inputs+=["-i",f"{IMG}/{f}"]
    fl=",hflip" if flip else ""
    fc.append(f"[{i}:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840{fl},"
              f"zoompan=z='{z0}+({z1}-{z0})*on/{N}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1080x1920:fps={FPS}{ex},"
              f"trim=end_frame={N},setsar=1,format=yuv420p[v{i}]")
prev="v0"; off=0
for i in range(1,len(segs)):
    off+=segs[i-1][1]
    fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={X}:offset={off}[x{i}]"); prev=f"x{i}"
fc.append(f"[{prev}]ass=legendas.ass,fade=t=out:st=55.7:d=1[vout]")
fc.append(f"[{len(segs)}:a]volume=0.9,afade=t=out:st=54.5:d=2.2[aout]")
cmd=["ffmpeg","-y","-hide_banner","-loglevel","error"]+inputs+["-i","music.wav","-filter_complex",";".join(fc),
     "-map","[vout]","-map","[aout]","-t","57.7","-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p",
     "-c:a","aac","-b:a","192k","-movflags","+faststart",sys.argv[2]]
subprocess.run(cmd,check=True)
