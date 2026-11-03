import numpy as np, wave, sys
sr=44100; T=float(sys.argv[2]) if len(sys.argv)>2 else 60.0; n=int(sr*T); t=np.arange(n)/sr
out=np.zeros(n)
def note(f):  return 440*2**((f-69)/12)
# progression: C  G/B  Am  F  (4 s each, loops)
chords=[[48,55,60,64,67],[47,55,59,62,67],[45,52,57,60,64],[41,53,57,60,65]]
beat=60/70
# soft pad
for i in range(int(T/4)+1):
    c=chords[i%4]; s=int(i*4*sr); e=min(n,int((i*4+4.6)*sr))
    if s>=n: break
    tt=np.arange(e-s)/sr
    env=np.minimum(1,tt/1.2)*np.minimum(1,(4.6-tt)/1.0).clip(0)
    for m in c[:3]:
        f=note(m)
        out[s:e]+=0.05*env*(np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*f*1.003*tt))
# piano arpeggio (enters at 8s, denser after 30s)
step=beat/2
k=0; tm=2.0
while tm<T-3:
    ci=int(tm//4)%4; c=chords[ci]
    pat=[2,3,4,3] if tm<30 else [2,3,4,5,4,3]
    idx=pat[k%len(pat)]; m=c[min(idx,4)]+ (12 if idx==5 else 0)
    f=note(m+12)
    s=int(tm*sr); L=int(2.5*sr); e=min(n,s+L); tt=np.arange(e-s)/sr
    vel=0.10 if tm<30 else 0.13
    env=np.exp(-tt*2.2)*np.minimum(1,tt/0.005)
    out[s:e]+=vel*env*(np.sin(2*np.pi*f*tt)+0.4*np.sin(4*np.pi*f*tt)*np.exp(-tt*3)+0.15*np.sin(6*np.pi*f*tt)*np.exp(-tt*5))
    k+=1; tm+=step if tm>=8 else beat
# bass on each chord
for i in range(int(T/4)):
    s=int(i*4*sr); e=min(n,s+int(3.9*sr)); tt=np.arange(e-s)/sr
    f=note(chords[i%4][0]-12)
    out[s:e]+=0.09*np.exp(-tt*0.8)*np.sin(2*np.pi*f*tt)
# simple reverb (multi-tap)
rev=out.copy()
for d,g in [(0.031,0.5),(0.067,0.4),(0.113,0.3),(0.173,0.25),(0.251,0.18),(0.347,0.12)]:
    sh=int(d*sr); rev[sh:]+=g*out[:-sh]
out=rev
fade=np.ones(n); fi=int(2*sr); fo=int(4*sr)
fade[:fi]=np.linspace(0,1,fi); fade[-fo:]=np.linspace(1,0,fo)
out*=fade; out/=np.abs(out).max()*1.12
d=(out*32767).astype(np.int16)
st=np.stack([d,np.roll(d,90)],1)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(st.tobytes()); w.close()
