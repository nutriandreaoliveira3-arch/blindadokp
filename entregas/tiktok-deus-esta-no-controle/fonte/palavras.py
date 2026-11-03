# gera legenda palavra-por-palavra. Modo estimado (sem voz) ou alinhado a trechos de fala (segs.json)
import json, sys, re
texto=open(sys.argv[1]).read()
frases=[l.strip() for l in texto.split('\n') if l.strip()]
DEST={"ESPERA.","CALMA","DEUS","CONFIA","ENTREGA...","DESESPERADA.","CONTROLE.","CONFIO.","RAINHA.","CERTO."}
def ass_time(x):
    h=int(x//3600); m=int(x%3600//60); s=x%60; return f"{h}:{m:02d}:{s:05.2f}"
def peso(w): return 0.5+len(re.sub(r'[^\w]','',w))*0.11
segs=json.load(open(sys.argv[2])) if len(sys.argv)>2 and sys.argv[2]!='-' else None
ev=[]
if segs is None:
    t=0.5
    for f in frases:
        for w in f.split():
            d=0.10+0.055*len(w); ev.append((t,t+d,w)); t+=d
            if w.endswith('...'): t+=0.45
            elif w[-1] in '.!?': t+=0.35
            elif w[-1] in ',:': t+=0.15
        t+=0.25
else:
    # distribui as frases nos trechos de fala por proporção de peso
    palavras=[w for f in frases for w in f.split()]
    tot=sum(peso(w) for w in palavras); fala=sum(b-a for a,b in segs)
    # atribui palavras sequencialmente preenchendo cada trecho
    i=0
    for a,b in segs:
        cap=(b-a)/fala*tot; acc=0; grupo=[]
        while i<len(palavras) and (acc+peso(palavras[i])*0.5<=cap or not grupo):
            grupo.append(palavras[i]); acc+=peso(palavras[i]); i+=1
        gp=sum(peso(w) for w in grupo); t=a
        for w in grupo:
            d=(b-a)*peso(w)/gp; ev.append((t,t+d,w)); t+=d
    for w in palavras[i:]:
        t=ev[-1][1]; ev.append((t,t+0.35,w))
head="""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: W,Inter Display Black,118,&H00FFFFFF,&H00FFFFFF,&H00D0203C,&H90000000,0,0,0,0,100,100,1,0,1,9,4,2,40,40,520,1
Style: D,Inter Display Black,132,&H0060D8FF,&H00FFFFFF,&H00D0203C,&H90000000,0,0,0,0,100,100,1,0,1,10,4,2,40,40,520,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
out=head
for k,(a,b,w) in enumerate(ev):
    nb=ev[k+1][0] if k+1<len(ev) else b+0.6
    end=min(nb, b+0.5) if nb-b<0.6 else b+0.15
    W=w.upper().strip('"'); st="D" if W.strip('",') in DEST or W in DEST else "W"
    out+=f"Dialogue: 0,{ass_time(a)},{ass_time(end)},{st},,0,0,0,,{{\\fscx80\\fscy80\\t(0,90,\\fscx100\\fscy100)}}{W}\n"
open(sys.argv[3],'w').write(out)
print("fim:",round(ev[-1][1],2),"palavras:",len(ev))
