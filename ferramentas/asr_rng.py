import sherpa_onnx, soundfile as sf, glob, sys
d=glob.glob(__import__('os').environ.get('MODEL_DIR','model')+'/*/turbo-encoder.int8.onnx')[0].rsplit('/',1)[0]+'/'
rec=sherpa_onnx.OfflineRecognizer.from_whisper(encoder=d+'turbo-encoder.int8.onnx',decoder=d+'turbo-decoder.int8.onnx',tokens=d+'turbo-tokens.txt',language='pt',task='transcribe',num_threads=8)
x,sr=sf.read(sys.argv[1],dtype='float32')
for r in sys.argv[2:]:
    a,b=map(float,r.split(':')); s=rec.create_stream(); s.accept_waveform(sr,x[int(a*sr):int(b*sr)]); rec.decode_stream(s); print(r,s.result.text.strip())
