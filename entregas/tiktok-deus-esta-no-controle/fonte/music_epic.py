import numpy as np, wave, sys
sr=44100; T=float(sys.argv[2]); n=int(sr*T); out=np.zeros(n)
def nf(m): return 440*2**((m-69)/12)
ch=[[45,52,57,60,64],[41,48,53,57,60],[48,55,60,64,67],[43,50,55,59,62]]  # Am F C G
bpm=80; beat=60/bpm; bar=4*beat
for i in range(int(T/bar)+1):
    c=ch[i%4]; s=int(i*bar*sr); e=min(n,int((i*bar+bar+0.8)*sr))
    if s>=n: break
    t=np.arange(e-s)/sr; env=np.minimum(1,t/0.8)*np.clip((bar+0.8-t)/0.8,0,1)
    for m in c[:4]:
        f=nf(m); out[s:e]+=0.045*env*(np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*f*1.005*t)+0.25*np.sin(4*np.pi*f*t))
    # bass
    f=nf(c[0]-12); out[s:e]+=0.12*env*np.sin(2*np.pi*f*t)
# drums: deep hit on beats 1 and 3, intensity grows
k=0; tm=0.0
while tm<T-1:
    s=int(tm*sr); L=int(1.2*sr); e=min(n,s+L); t=np.arange(e-s)/sr
    amp=0.35 if tm<6 else 0.55
    f=55*np.exp(-t*6)+38
    out[s:e]+=amp*np.exp(-t*5)*np.sin(2*np.pi*np.cumsum(f)/sr)
    if tm>10 and k%2==1:  # snare-ish noise on off beats later
        nz=np.random.randn(e-s)*np.exp(-t*18)*0.08; out[s:e]+=nz
    k+=1; tm+=beat*2 if tm<10 else beat
# piano motif
tm=2*bar
while tm<T-2:
    c=ch[int(tm//bar)%4]; s=int(tm*sr); e=min(n,s+int(2*sr)); t=np.arange(e-s)/sr
    f=nf(c[2]+12); out[s:e]+=0.10*np.exp(-t*2.5)*(np.sin(2*np.pi*f*t)+0.3*np.sin(4*np.pi*f*t))
    tm+=beat
rev=out.copy()
for d,g in [(0.04,0.45),(0.09,0.35),(0.15,0.25),(0.23,0.18),(0.33,0.12)]:
    sh=int(d*sr); rev[sh:]+=g*out[:-sh]
out=rev; fi=int(1.5*sr); fo=int(2.5*sr)
out[:fi]*=np.linspace(0,1,fi); out[-fo:]*=np.linspace(1,0,fo)
out/=np.abs(out).max()*1.1
d=(out*32767).astype(np.int16)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(np.stack([d,np.roll(d,70)],1).tobytes()); w.close()
