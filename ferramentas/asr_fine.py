import sherpa_onnx, soundfile as sf, glob, subprocess, re, json, sys
d=glob.glob(__import__('os').environ.get('MODEL_DIR','model')+'/*/turbo-encoder.int8.onnx')[0].rsplit('/',1)[0]+'/'
rec=sherpa_onnx.OfflineRecognizer.from_whisper(encoder=d+'turbo-encoder.int8.onnx',decoder=d+'turbo-decoder.int8.onnx',tokens=d+'turbo-tokens.txt',language='pt',task='transcribe',num_threads=8)
W=sys.argv[1]; A=float(sys.argv[2]); B=float(sys.argv[3])
x,sr=sf.read(W,dtype='float32')
out=subprocess.run(['ffmpeg','-hide_banner','-nostats','-ss',str(A),'-to',str(B),'-i',W,'-af','silencedetect=n=-30dB:d=0.07','-f','null','-'],capture_output=True,text=True).stderr
st=[float(v)+A for v in re.findall(r'silence_start: ([\d.]+)',out)]; en=[float(v)+A for v in re.findall(r'silence_end: ([\d.]+)',out)]
regs=[];t=A
for a,b in zip(st,en):
    if a>t+0.05: regs.append([t,a])
    t=b
if t<B-0.05: regs.append([t,B])
ch=[]
for r in regs:
    if ch and r[1]-ch[-1][0]<=2.6: ch[-1][1]=r[1]
    else: ch.append(list(r))
res=[]
for a,b in ch:
    s=rec.create_stream(); s.accept_waveform(sr,x[max(0,int((a-0.04)*sr)):int((b+0.04)*sr)]); rec.decode_stream(s)
    res.append([round(a,3),round(b,3),s.result.text.strip()]); print(f"{a:6.2f}-{b:6.2f} {s.result.text.strip()}")
json.dump(res,open(sys.argv[4],'w'),ensure_ascii=False)
