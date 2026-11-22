"""Gera a pasta de prompts de todos os looks pendentes (mescla + 2 clipes + textos + legenda) e zipa."""
import os, shutil, zipfile

OUT = '/tmp/claude-0/-home-user-blindadokp/1ee8f564-c481-5f05-98a2-fb44b8e2bb97/scratchpad/prompts-looks'
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)

TAIL = 'AUDIO: no speech, no voice. Only soft ambient sound.\nNo added text, subtitles, watermark or logos. Vertical 9:16, 8 seconds, realistic, soft natural light.'
NEG = ('talking, lip movement, color change, different shade, changed print or texture, different outfit, shorter or longer length, '
       'extra accessories, earrings, necklace, bracelets, rings, bag, other people, outfit changing shape')
# palavras que costumam acionar o filtro do Flow: trocadas por termos neutros de catálogo
SAFE = [('bare open back', 'open back'), ('bare back', 'open back'), ('lined bust', 'lined bodice'), ('bust', 'bodice'), (' with built-in cups', ''),
        ('strategic cut-outs', 'cut-outs'), ('nude-colored', 'matching-tone')]


def safe(s):
    for a, b in SAFE:
        s = s.replace(a, b)
    return s

LOOKS = [
 dict(id='01-calca-verde', nome='Calça pantalona verde (amarração na frente)', status='REFAZER clipe do giro (a tira apareceu nas costas)',
  outfit='sage green wide-leg trousers: high elastic waist with a drawstring tied in a bow at the FRONT only, wide straight legs, side pockets. The back of the waistband is plain, nothing hanging at the back',
  styling='She wears a plain white fitted cropped tank top with it (not the product, keep it plain and unbranded).',
  scene='bright minimalist room with soft daylight', blur=False, extra_neg='drawstring at the back, tie hanging at the back',
  hook='Um look, várias possibilidades!', closing=['Pantalona de cintura alta', 'Amarração na frente', 'Bolsos funcionais', 'Tamanhos do 36 ao 48', 'Toque no link do produto'],
  caption='Calça pantalona de cintura alta com amarração frontal, em alfaiataria leve, com bolsos funcionais. Tamanhos do 36 ao 48. Veja os detalhes no link do produto.',
  tags='#calcapantalona #alfaiataria #modafeminina #lookdodia #lookelegante #tiktokshop',
  avisos=['O anúncio vende só a calça: nunca cite o top branco.', 'Confira no giro: a amarração só pode aparecer na frente.']),
 dict(id='02-conjunto-vermelho', nome='Conjunto de tricô rendado (top + saia longa)', status='REFAZER mescla e clipes (o top do anúncio tem babado)',
  outfit='two-piece crochet set: a cropped camisole top with thin straps, square neckline, crochet eyelet pattern and a FLARED RUFFLED hem (the top is not straight), plus a long high-waisted crochet skirt with a large openwork flower pattern, a solid panel near the hem and a lace edge',
  styling='', scene='clean modern living room with soft daylight', blur=False, extra_neg='straight boxy top, small crochet holes',
  hook='Esse look tem presença!', closing=['Conjunto de tricô rendado', 'Top e saia longa', 'Tamanho único: 36 ao 42', 'Toque no link do produto'],
  caption='Conjunto resort de tricô rendado: top e saia longa. Tamanho único, veste do 36 ao 42, com elasticidade. Veja os detalhes no link do produto.',
  tags='#conjuntoresort #tricorendado #conjuntofeminino #modafeminina #lookdeverao #tiktokshop',
  avisos=['Não cite a cor.', 'Composição do anúncio: 60% polipropileno, 30% acrílico, 8% poliéster, 2% elastano: não escreva "algodão" nem "linho".']),
 dict(id='03-vestido-rosa', nome='Vestido tomara que caia midi com fenda', status='GERAR o 2º clipe (já existe 1)',
  outfit='strapless midi dress: straight neckline with a folded band, fitted through the body, a side slit, ending at mid-calf',
  styling='', scene='bright minimalist room with soft daylight', blur=False, extra_neg='long floor-length dress, no slit, straps',
  hook='Elegância em cada detalhe!', closing=['Decote ombro a ombro', 'Fenda lateral', 'Toque no link do produto'],
  caption='Vestido com decote ombro a ombro e fenda lateral. Veja os tamanhos e detalhes no link do produto.',
  tags='#vestidomidi #vestidoelegante #modafeminina #lookdefesta #lookelegante #tiktokshop',
  avisos=['O anúncio diz "vestido longo" mas a foto é midi: não fale de comprimento.', 'Evite "sensualidade" e "ousadia" (palavras do anúncio).', 'Confira a altura da fenda: no anúncio ela começa na coxa.']),
 dict(id='04-macacao-3-cores', nome='Macacão pantalona frente única (azul, preto, caramelo)', status='Vídeo pronto. Use estes prompts para gerar outras cores',
  outfit='halter jumpsuit: crossed straps at the neck, fitted structured bodice with built-in cups, waistband, wide-leg trousers with front pleats, open back with an elastic band, fully lined',
  styling='', scene='minimalist bedroom with soft daylight', blur=False, extra_neg='closed back, short pants',
  hook='Difícil escolher uma cor!', closing=['Bojo e lastex nas costas', 'Tecido duna premium', 'Totalmente forrado', 'Tamanhos P e M, do 36 ao 40', 'Toque no link do produto'],
  caption='Macacão pantalona com bojo e lastex nas costas, em tecido duna premium, totalmente forrado. Tamanhos P e M. Disponível em diversas cores. Veja no link do produto.',
  tags='#macacaopantalona #macacao #modafeminina #lookelegante #lookdefesta #tiktokshop',
  avisos=['Uma mescla por cor (use a foto de cada cor como imagem 2).', 'Vincule a variante igual à cor que mais aparece no vídeo.']),
 dict(id='05-macacao-v-marrom', nome='Macacão pantalona com decote em V e faixa na cintura', status='NOVO: falta tudo',
  outfit='sleeveless V-neck jumpsuit: wide fluid fit, a fabric sash tied at the waist, side pockets, wide-leg pantalona trousers, light flowing fabric, opaque',
  styling='', scene='minimalist bedroom with soft daylight', blur=False, extra_neg='halter neckline, fitted legs',
  hook='Olha o caimento dessa peça!', closing=['Decote em V', 'Faixa para ajuste na cintura', 'Bolsos laterais', 'Tecido leve e fluido', 'Toque no link do produto'],
  caption='Macacão pantalona com decote em V, faixa para amarração na cintura e bolsos laterais. Tecido leve e fluido. Veja os tamanhos no link do produto.',
  tags='#macacaopantalona #macacao #decotev #modafeminina #lookelegante #tiktokshop',
  avisos=['A descrição não lista tamanhos: confira a aba "Tamanho".', 'Composição: 90% viscose e 10% poliéster. O anúncio diz "não é transparente".', 'Não cite a cor se o anúncio tiver várias.']),
 dict(id='06-calca-linho', nome='Calça pantalona cintura alta com pregas e forro', status='NOVO: falta tudo',
  outfit='high-waisted wide-leg pantalona trousers with front pleats, an internal lining and a visible natural slightly textured weave',
  styling='She wears a plain white fitted cropped tank top with it (not the product, keep it plain and unbranded).',
  scene='bright minimalist room with soft daylight', blur=False, extra_neg='drawstring, elastic waist, shorts, jeans',
  hook='Simplesmente olha essa peça!', closing=['Cintura alta', 'Pantalona com pregas frontais', 'Forro interno', 'Com linho na composição', 'Toque no link do produto'],
  caption='Calça pantalona de cintura alta, com pregas frontais e forro interno. Tecido com linho na composição. Veja os tamanhos no link do produto.',
  tags='#calcapantalona #calcadelinho #modafeminina #lookdodia #lookelegante #tiktokshop',
  avisos=['Composição: 70% poliéster, 16% viscose, 11% linho, 3% algodão. NÃO escreva "100% linho": diga "com linho na composição".', 'O anúncio vende só a calça: não cite o top.', 'Confira a aba de tamanhos (a descrição corta no meio).']),
 dict(id='07-vestido-branco-texturizado', nome='Vestido longo texturizado, top com pico e recorte', status='GERAR os 2 clipes (a imagem da Bella já foi aprovada)',
  outfit='long fitted column dress in textured knit: thin halter straps tied at the back of the neck, fitted textured top with a pointed hem at the front, a side waist cut-out, long skirt to the ankles',
  styling='', scene='minimalist bedroom with soft daylight', blur=False, extra_neg='smooth fabric, missing cut-out, missing pointed hem, sleeves',
  hook='Look de festa chique', closing=['Tecido modal', 'Amarração nas costas', 'Diversas cores', 'Toque no link do produto'],
  caption='Vestido longo de modal com top de pico, recorte na cintura e amarração nas costas para ajuste personalizado. Disponível em diversas cores. Veja no link do produto.',
  tags='#vestidolongo #vestidodemodal #frenteunica #modafeminina #lookdefesta #tiktokshop',
  avisos=['Não cite cor; vincule a variante branco.', 'Gancho alternativo: "O luxo da delicadeza".']),
]


def mescla(L):
    return '\n'.join([
        'CHARACTER LOCK — BELLA: use exactly the same woman from image 1. Same face, hair and natural makeup. Do not change her identity.',
        f"OUTFIT: she wears the product from image 2, exactly as shown: {L['outfit']}. Same color, print, texture, cut, length and details as image 2. {L['styling']} The garment is fully lined and opaque. Do not add any clothing item, bag, jewelry or accessory that is not part of the look.".replace('  ', ' '),
        f"BACKGROUND: {L['scene']}. No clothing racks, no other clothes, no shelves with products, no other people." + (' Strong background blur.' if L['blur'] else ''),
        'Professional e-commerce fashion catalog photo of an adult woman, modest and elegant. Full body visible, natural standing pose, vertical 9:16, realistic photo. No necklace, no earrings, no bracelets, no rings.',
    ])


def clip(L, n):
    o = f"{L['outfit']}" + (f". {L['styling']}" if L['styling'] else '')
    lock = 'The outfit keeps exactly the same color, print, texture, details, cut and length as the first frame in every frame. Full body always visible.'
    neg = f"NEGATIVE: {NEG}, {L['extra_neg']}" + (', sharp background, recognizable clothes in background' if L['blur'] else ', background changing') + (', full spin.' if n == 1 else ', spinning, close-up that crops the outfit.')
    if n == 1:
        body = f"LOCKED OUTFIT SHOT. Bella stands in the same place wearing exactly the same outfit as the first frame for the entire 8 seconds, in exactly the same color as the first frame: {o}. She does not speak. She smiles at the camera, then makes a slow half-turn to show the side and the back and returns to the front, one hand on her waist. Very slight slow push-in."
    else:
        body = f"LOCKED OUTFIT SHOT. Bella wears exactly the same outfit as the first frame for the entire 8 seconds, in exactly the same color as the first frame: {o}. She does not speak.\n0-1s: she turns her head to the camera with a confident smile.\n1-6s: she walks slowly toward the camera, elegant and relaxed.\n6-8s: she stops, puts one hand on her waist and smiles."
    return '\n'.join([body, lock + (' The background stays heavily blurred for the entire video, never in focus.' if L['blur'] else ''), TAIL, neg])


# ───────── looks lidos da pasta ROUPAS-FOTOS do Drive (22/11/2026): (id, nome, peça em inglês, gancho, fechamento, legenda, hashtags, avisos)
CT = ['Toque no link do produto']
CM = ' #modafeminina #lookdodia #tiktokshop'
DRIVE = [
 ('08-vestido-degrade', 'Vestido longo degradê laranja e azul, decote V, costas nuas', 'long dress with a smooth orange-to-blue gradient, V neckline, bare open back', 'Olha que coisa linda!', ['Degradê laranja e azul', 'Decote V', 'Costas nuas'], 'Vestido longo degradê em laranja e azul, com decote V e costas nuas. Veja os detalhes no link do produto.', '#vestidolongo #degrade #lookdefesta', ['Aqui a cor É o produto (degradê): pode citar.', 'Anúncio sem tamanhos na descrição: veja a aba "Tamanho".']),
 ('09-conjunto-pantalona-diana', 'Conjunto Diana: top cropped + calça pantalona', 'two-piece set: a fitted cropped top and high-waisted wide-leg pantalona trousers in a flowing viscose fabric', 'Esse conjunto é um charme!', ['Top cropped + pantalona', 'Calça em viscose', 'Caimento elegante'], 'Conjunto de top cropped e calça pantalona em viscose. Veja os tamanhos e detalhes no link do produto.', '#conjuntopantalona #conjuntofeminino #lookelegante', ['O anúncio usa "promoção por tempo LIMITADO" e "pedidos até as 15h": NÃO repita no vídeo.', 'Sem tamanhos na descrição.']),
 ('10-vestido-um-ombro-so', 'Vestido longo assimétrico de um ombro só', 'long asymmetric one-shoulder dress with a side waist cut-out and a high waist with gathered detail', 'Esse vestido chama atenção!', ['Um ombro só', 'Recorte lateral na cintura', 'Cintura alta com franzido', 'Do 36 (P) ao 42 (G)'], 'Vestido longo de um ombro só, com recorte lateral na cintura e cintura alta franzida. Tamanhos do 36 ao 42. Veja no link do produto.', '#vestidolongo #umombrosó #lookdefesta', ['Tem tabela de medidas: busto, cintura e quadril do 36 ao 42.']),
 ('11-conjunto-saida-de-praia', 'Conjunto saída de praia: calça + colete rendado', 'beach cover-up set: relaxed loose-fit trousers and a lace vest', 'Look de férias na praia', ['Calça e colete rendado', 'Modelagem soltinha', 'Estilo praia'], 'Conjunto de saída de praia com calça e colete rendado, modelagem soltinha. Veja os detalhes no link do produto.', '#saidadepraia #conjuntofeminino #lookdeverao', ['Sem tamanhos na descrição: veja a aba "Tamanho".']),
 ('12-conjunto-alfaiataria-tomara-que-caia', 'Conjunto de alfaiataria tomara que caia', 'tailored two-piece set in a structured fabric with a strapless neckline', 'Elegância em cada detalhe!', ['Tomara que caia', 'Alfaiataria', 'Caimento estruturado'], 'Conjunto de alfaiataria tomara que caia, com caimento estruturado. Veja os detalhes no link do produto.', '#conjuntoalfaiataria #tomaraquecaia #lookelegante', ['Sem tamanhos nem composição na descrição.']),
 ('13-macaquinho-poa', 'Macaquinho crepe GGT com estampa poá', 'short jumpsuit in premium crepe with a polka dot print, thin straps, a wrap-effect V neckline and a defined waist', 'Me apaixonei nesse modelo!', ['Estampa poá', 'Decote V transpassado', 'Alças finas e cintura marcada', 'Tamanhos M e G'], 'Macaquinho em crepe GGT premium com estampa poá, decote em V transpassado e cintura marcada. Tamanhos M e G. Veja no link do produto.', '#macaquinho #poa #lookdodia', ['M veste 38 a 40; G veste 40 a 42.', 'Mostre só a estampa do anúncio (não troque a cor dos poás).']),
 ('14-calca-cintura-alta-corte-largo', 'Calça feminina cintura alta, corte largo', 'high-waisted wide-cut trousers in a soft fabric', 'Simplesmente olha essa peça!', ['Cintura alta', 'Corte largo', 'Tecido suave'], 'Calça feminina de cintura alta e corte largo, em tecido suave. Veja os detalhes no link do produto.', '#calcafeminina #cinturaalta #lookdodia', ['⚠️ Anúncio fraco: sem tamanhos, sem composição, e o texto tem erro ("design marrante"). Prefira outra calça.']),
 ('15-vestido-bicolor-halter', 'Vestido longo bicolor, halter com alças cruzadas', 'long two-tone dress with a halter neckline, crossed straps, a cut-out detail at the bust and a side slit', 'Esse modelo é um arraso!', ['Decote halter, alças cruzadas', 'Detalhe vazado no busto', 'Fenda lateral'], 'Vestido longo bicolor em tecido Marrant, com decote halter, detalhe vazado no busto e fenda lateral. Veja no link do produto.', '#vestidolongo #bicolor #lookdefesta', ['Sem tamanhos na descrição.', 'As duas cores do vestido fazem parte do produto: mantenha as duas fiéis à foto.']),
 ('16-vestido-alfaiataria-torcido', 'Vestido de alfaiataria premium com detalhe torcido', 'tailored premium dress with a twisted detail at the side, a back slit and an invisible zipper at the back, opaque structured fabric', 'Look de chefe', ['Alfaiataria premium', 'Detalhe torcido lateral', 'Fenda traseira', 'Não fica transparente'], 'Vestido de alfaiataria premium com detalhe torcido lateral e fenda traseira. Veja os tamanhos no link do produto.', '#vestidoalfaiataria #lookelegante #trabalho', ['Sem tamanhos na descrição.', 'Para mostrar a fenda traseira, o giro de costas é essencial.']),
 ('17-vestido-curto-listrado', 'Vestido curto listrado com faixa na cintura', 'short striped dress with vertical stripes, thin straps, a waist sash tied at the waist and a tiered ruffled skirt', 'Você usaria esse?', ['Estampa listrada vertical', 'Faixa de amarração na cintura', 'Saia em camadas com babado', 'Short interno'], 'Vestido curto listrado com alças finas, faixa de amarração na cintura e saia em camadas com babado. Tem short interno. Veja os tamanhos no link do produto.', '#vestidocurto #listrado #lookdeverao', ['Só aparece o tamanho P (36-38) na descrição: confira a aba "Tamanho".']),
 ('18-macaquinho-camisa', 'Macaquinho camisa com mangas longas', 'long-sleeve shirt-style short jumpsuit in flowing crepe: shirt collar, front button closure, defined waist, loose skirt-like lower part', 'Parece saia, mas é macaquinho', ['Gola de camisa e botões', 'Mangas longas', 'Tamanho único: 36 ao 42'], 'Macaquinho camisa em crepe GGT, com gola de camisa, botões frontais e mangas longas. Tamanho único, veste do 36 ao 42. Veja as cores no link do produto.', '#macaquinhocamisa #macaquinho #lookelegante', ['Cores no anúncio: marrom e azul-marinho: não cite a cor.', 'Tem short por baixo (o anúncio confirma).']),
 ('19-macaquinho-chiffon-babado', 'Macaquinho chiffon frente única com babados', 'short chiffon jumpsuit with a halter neckline tied at the neck, delicate ruffles and an open back', 'Esse detalhe faz diferença!', ['Frente única com amarração', 'Babados delicados', 'Costas abertas', 'Tamanhos P, M e G'], 'Macaquinho de chiffon com frente única, babados e costas abertas. Tamanhos P, M e G. Veja no link do produto.', '#macaquinhochiffon #frenteunica #lookdefesta', ['P veste 38, M veste 40, G veste 42.', 'Os dois prints (6775 e 6777) são o mesmo anúncio.']),
 ('20-vestido-chiffon-recortes', 'Vestido longo de chiffon com recortes e babados', 'long chiffon dress with a fully lined bust with a central detail, side waist cut-outs, thin adjustable straps with metal sliders and ruffles', 'Vestido com cara de rica', ['Busto todo forrado', 'Alças finas reguláveis', 'Recortes laterais na cintura', 'Forrado até a barra'], 'Vestido longo de chiffon, forrado até a barra, com alças finas reguláveis e recortes laterais na cintura. Veja os tamanhos no link do produto.', '#vestidolongo #chiffon #lookdefesta', ['Composição: 100% poliéster. Costas com lastex.', 'Sem tamanhos na descrição.']),
 ('21-macaquinho-alca-no-pescoco', 'Macacão curto com alça no pescoço e barra franzida', 'short jumpsuit with a halter neck strap and a gathered hem that looks like a dress, opaque fabric', 'Parece vestido, mas é macaquinho', ['Alça no pescoço', 'Barra franzida', 'Sem transparência', 'Tamanho único'], 'Macacão curto com alça no pescoço e barra franzida, que parece vestido. Tecido sensorial Marrant, sem transparência. Tamanho único. Veja no link do produto.', '#macaquinho #parecevestido #lookdodia', ['Tamanho único: cintura 72-88, busto 88-100, quadril 96-110.']),
 ('22-conjunto-acetinado-gola-alta', 'Conjunto acetinado: blusa gola alta costas abertas + saia midi', 'satin-finish two-piece set: a high-neck top with an open back and a midi skirt', 'Esse look tem presença!', ['Acabamento acetinado', 'Blusa de gola alta', 'Costas abertas + saia midi', 'Tamanhos P, M e G'], 'Conjunto acetinado com blusa de gola alta e costas abertas e saia midi. Tamanhos P, M e G. Veja no link do produto.', '#conjuntoacetinado #saiamidi #lookdefesta', ['P veste 36/38, M veste 40, G veste 42.', 'Evite "sensualidade" (palavra do anúncio).']),
 ('23-vestido-cherry-trico', 'Vestido de tricô vazado, um ombro só, com fenda', 'open-knit crochet-look dress with one shoulder, strategic cut-outs and a side slit, fluid fit', 'O luxo da delicadeza', ['Tricô vazado', 'Um ombro só', 'Recortes e fenda lateral'], 'Vestido de tricô vazado com um ombro só, recortes e fenda lateral. Veja os tamanhos no link do produto.', '#vestidodetrico #trico #lookresort', ['Tricô vazado: exija FORRO COR DA PELE na mescla (já incluso no prompt).', 'Medidas do anúncio são só de busto, cava e largura.']),
 ('24-vestido-curto-trico-rendado', 'Vestido curto de tricô rendado, frente única, costas abertas', 'short fitted lace-knit dress with a halter neckline and an open back tied with a bow, 90 cm long', 'Difícil escolher uma cor!', ['Tricô rendado', 'Frente única', 'Costas abertas com amarração', 'Tamanho único: 36 ao 42'], 'Vestido curto de tricô rendado, frente única, com costas abertas e amarração. Tamanho único, veste do 36 ao 42. Disponível em várias cores. Veja no link do produto.', '#vestidocurto #tricorendado #frenteunica', ['O anúncio lista 9 cores: o gancho "Difícil escolher uma cor!" vale.', 'Não cite a cor; vincule a variante igual à do vídeo.']),
 ('25-vestido-ombro-a-ombro-canelado', 'Vestido longo canelado ombro a ombro', 'long fitted ribbed-knit dress with an off-the-shoulder (bardot) neckline', 'Olha o caimento dessa peça!', ['Tecido canelado elástico', 'Ombro a ombro', 'Modelagem ajustada', 'Comprimento longo'], 'Vestido longo canelado com decote ombro a ombro e modelagem ajustada. Veja os tamanhos no link do produto.', '#vestidocanelado #ombroaombro #lookelegante', ['Sem tamanhos na descrição.', 'O anúncio fala em "inverno/quentinho": não use no vídeo de verão.']),
 ('26-vestido-costa-nua-soltinho', 'Vestido longo costa nua, soltinho', 'long loose-fit dress with a bare back, a lined bust, light flowing duna premium fabric', 'Elegante sem esforço', ['Costa nua', 'Modelagem soltinha', 'Seios forrados', 'Tamanhos P, M, G e GG'], 'Vestido longo costa nua, soltinho, em tecido duna premium, com seios forrados. Tamanhos P, M, G e GG. Veja no link do produto.', '#vestidolongo #costanua #lookdeverao', ['NÃO diga "bojo": o anúncio diz "sem bojo" (seios forrados).', 'Não mostre nem cite a "bermuda de proteção" do anúncio.']),
 ('27-vestido-frente-unica-pedraria', 'Vestido longo Fluit frente única com pedraria no pescoço', 'long flowing dress in soft fluid fabric with a halter neckline and rhinestone appliqué at the neck', 'Olha esse acabamento!', ['Frente única', 'Pedrarias no pescoço', 'Caimento fluido', 'Tamanho único'], 'Vestido longo de tecido Fluit com frente única e pedrarias no pescoço. Tamanho único. Disponível em várias cores. Veja no link do produto.', '#vestidolongo #frenteunica #lookdefesta', ['Pedrarias no pescoço fazem parte do produto: copie o detalhe.', 'Várias cores: não cite a cor.']),
 ('28-vestido-frente-unica-costas-nuas', 'Vestido longo frente única com costas nuas', 'long halter dress with a bare back in light flowing fabric, opaque', 'Look de festa chique', ['Frente única', 'Costas nuas', 'Não é transparente', 'Comprimento longo'], 'Vestido longo frente única com costas nuas, em tecido leve. Veja os tamanhos no link do produto.', '#vestidolongo #frenteunica #lookdefesta', ['O anúncio diz "sem bojo": não cite bojo.', 'Mensagem sazonal (Natal e Réveillon): use só em dezembro.']),
 ('29-vestido-poliamida', 'Vestido longo de poliamida com dupla camada', 'long fitted dress in soft stretch polyamide with a double layer of fabric from bust to hip', 'Básico que salva qualquer dia', ['Poliamida com elastano', 'Dupla camada do busto ao quadril', 'Não fica transparente'], 'Vestido longo em poliamida com elastano e dupla camada do busto ao quadril. Veja os tamanhos no link do produto.', '#vestidolongo #poliamida #basico', ['"Ajuda a não marcar": não prometa; diga só "dupla camada".']),
 ('30-vestido-canelado-amarracao', 'Vestido liso canelado de tricô modal com amarração nas costas', 'smooth ribbed modal-knit dress with a tie at the back', 'Esse look tem presença!', ['Tricô modal canelado', 'Amarração nas costas', 'Veste do 38 ao 42'], 'Vestido liso canelado em tricô modal, com amarração nas costas. Veste do 38 ao 42. Veja no link do produto.', '#vestidocanelado #tricomodal #lookelegante', ['USE ESTE anúncio (IMG_6738). Os outros três do "Agnes" (6716, 6732, 6735) citam manga de 60 cm e não batem com a foto sem manga.']),
 ('31-vestido-midi-viscolinho', 'Vestido midi viscolinho solto, forrado, com alça', 'loose midi dress in natural-touch viscolinho fabric with straps, fully lined', 'Qual cor você escolheria?', ['Midi solto e forrado', '100% viscose', 'Tamanhos P, M e G', 'Diversas cores'], 'Vestido midi solto em viscolinho, forrado, 100% viscose. Tamanhos P, M e G. Disponível em diversas cores. Veja no link do produto.', '#vestidomidi #viscolinho #lookdeverao', ['O anúncio lista 4 cores (amarelo, azul, rosa, vermelho).', 'Tem tabela completa de medidas.']),
 ('32-vestido-floral-costas-abertas', 'Vestido floral de costas abertas', 'dress with a delicate floral print and an open back', 'Olha que coisa linda!', ['Estampa floral delicada', 'Costas abertas'], 'Vestido com estampa floral delicada e costas abertas. Veja os tamanhos no link do produto.', '#vestidofloral #costasabertas #lookdeverao', ['⚠️ Anúncio fraco: sem tamanhos, tecido ou comprimento.', 'A estampa precisa ser copiada da foto real.']),
 ('33-vestido-listrado-assimetrico', 'Vestido longo listrado assimétrico, costas abertas', 'long fluid asymmetric striped dress with a waist cut-out and an open back with a tie', 'Simplesmente olha essa peça!', ['Estampa listrada', 'Design assimétrico', 'Recorte na cintura', 'Costas abertas com amarração'], 'Vestido longo listrado assimétrico, com recorte na cintura e costas abertas com amarração. Veja os tamanhos no link do produto.', '#vestidolongo #listrado #lookdeverao', ['Sem tamanhos na descrição.', 'Listras: copie a direção e a espessura da foto.']),
 ('34-vestido-franjas-fivela', 'Vestido midi de tricô rayon com franjas e fivela dourada', 'midi rayon-knit dress with a halter neckline, side waist cut-outs, a round gold buckle at the center, open-work knit and long fringes on the skirt', 'O luxo da delicadeza', ['Frente única', 'Fivela dourada central', 'Franjas longas na saia', 'Recortes laterais'], 'Vestido midi de tricô rayon com frente única, fivela dourada, recortes laterais e franjas. Veja os tamanhos no link do produto.', '#vestidomidi #trico #lookresort', ['Preço alto (R$ 250): confira se vende na sua faixa.', 'Forro cor da pele no tricô vazado.']),
 ('35-vestido-maite', 'Vestido Maitê longo de suplex, costas abertas', 'long fitted suplex dress with an open back, thin tie straps and two side slits, opaque', 'Pra ser o centro das atenções', ['Costas abertas', 'Alças finas com amarração', 'Duas fendas laterais', 'Suplex premium'], 'Vestido longo de suplex premium com costas abertas, alças finas com amarração e duas fendas laterais. Veja os tamanhos no link do produto.', '#vestidolongo #suplex #lookdefesta', ['O anúncio diz "5 amarrações em 1": NÃO mostre a transformação (a IA deforma). Só cite "alças com amarração".', 'Evite "sensualidade" (palavra do anúncio).', 'Composição: 92% poliéster, 8% elastano.']),
 ('36-calca-wide-leg-alfaiataria', 'Calça wide leg de alfaiataria cintura alta', 'high-waisted wide-leg tailored trousers', 'Olha o caimento dessa peça!', ['Cintura alta', 'Perna ampla (wide leg)', 'Tamanhos do 36 ao 44'], 'Calça wide leg de alfaiataria com cintura alta. Tamanhos P ao GG, do 36 ao 44. Veja as medidas no link do produto.', '#calcawideleg #alfaiataria #lookelegante', ['A busca do anúncio usa nome de loja: NÃO use o nome da loja.', 'Tem medidas completas.']),
 ('37-body-regata-gola-alta', 'Body regata duplo de gola alta em poliamida', 'sleeveless double-layer high-neck bodysuit in smooth stretch polyamide, second-skin fit', 'Básico que salva qualquer dia', ['Gola alta e modelo regata', 'Tecido duplo até a base', 'Poliamida com elastano', 'Botões de pressão no entrepernas'], 'Body regata de gola alta em poliamida com elastano e tecido duplo. Modelagem ajustada. Veja as cores e tamanhos no link do produto.', '#body #bodyfeminino #basico', ['Vende só o body: combine com peça lisa e neutra para não confundir a oferta.', '"Toque gelado": não prometa sensação.']),
 ('38-kit-2-regatas', 'Kit com 2 regatas decote quadrado', 'two sleeveless tank tops with a square neckline, closed back, in light soft suplex fabric', 'Peça curinga pra qualquer look', ['Kit com 2 regatas', 'Decote quadrado', 'Suplex fresquinho'], 'Kit com 2 regatas de decote quadrado em suplex leve. Combine com jeans, alfaiataria, shorts ou saias. Veja as cores no link do produto.', '#regata #kitregatas #basico', ['É KIT DE 2: mostre sempre as DUAS peças (uma vestida, outra na mão ou em cabide) e cite "2 regatas".', 'Não escreva "2 pelo preço de 1" nem preço.']),
 ('39-blusa-drapeada', 'Blusa feminina drapeada', 'fitted draped blouse with a gathered drape detail', 'Esse detalhe faz diferença!', ['Detalhe drapeado', 'Tecido macio e elástico', 'Não fica transparente'], 'Blusa feminina drapeada em tecido macio e elástico. Veja os tamanhos e cores no link do produto.', '#blusadrapeada #blusafeminina #lookdodia', ['Vende só a blusa: use calça ou saia lisa e neutra.', 'Sem tamanhos na descrição.']),
]
for (i, nome, outfit, hook, closing, caption, tags, avisos) in DRIVE:
    LOOKS.append(dict(id=i, nome=nome, status='NOVO (da pasta ROUPAS-FOTOS): falta mescla e clipes', outfit=outfit, styling='',
                      scene='bright minimalist room with soft daylight', blur=False, extra_neg='', hook=hook, closing=closing + CT,
                      caption=caption, tags=tags + CM, avisos=avisos + ['A peça em inglês veio do TEXTO do anúncio: confira com a foto real.']))

for L in LOOKS:
    t = [f"LOOK: {L['nome']}", f"STATUS: {L['status']}", '', 'AVISOS']
    t += [f'- {a}' for a in L['avisos']] + ['- Nunca cite marca ("estilo Farm"), preço nem "não amassa".', '']
    t += ['=== 1. MESCLA (imagem 1 = Bella, imagem 2 = foto do anúncio) ===', mescla(L), '',
          '=== 2. CLIPE 1: parada, meio giro (primeiro quadro = imagem aprovada) ===', clip(L, 1), '',
          '=== 3. CLIPE 2: caminhando (mesmo primeiro quadro) ===', clip(L, 2), '',
          '=== 4. GANCHO (só na capa, 1º segundo) ===', L['hook'], '',
          '=== 5. TEXTOS DO FECHAMENTO (um por vez, centralizados) ===', '\n'.join(L['closing']), '',
          '=== 6. LEGENDA + HASHTAGS ===', L['caption'] + '\n\n' + L['tags'], '']
    open(f"{OUT}/{L['id']}.txt", 'w', encoding='utf-8').write(safe('\n'.join(t)))

idx = ['# Prompts dos looks (loja da Bella)', '', 'Cada arquivo tem: mescla, clipe 1, clipe 2, gancho, textos do fechamento e legenda. É só copiar e colar. Nada para acrescentar.', '',
       '## Como usar', '1. Mescla: imagem 1 = foto da Bella; imagem 2 = foto do anúncio. Confira estampa, cor e comprimento.',
       '2. Gere os 2 clipes com a imagem aprovada como primeiro quadro.', '3. Mande os clipes aqui (zip) com a foto do anúncio. A montagem sai com gancho, textos e marca d\'água.',
       '4. Música: Biblioteca de Música Comercial do TikTok. Ative o selo "Conteúdo gerado por IA".', '', '## Looks neste pacote', '']
idx += [f"- **{L['id']}**: {L['nome']} | {L['status']}" for L in LOOKS]
idx += ['', '## Já prontos (vídeo montado)', 'tropical, amarelo 2 em 1, macaquinho preto, tricô branco, macaquinho bege, tricô vermelho, conjunto de alfaiataria, vinho, jeans, conjunto amarelo, macacão 3 cores.',
        '', '## Não promover', '- Vestido azul-marinho (tricô modal): a descrição fala em manga de 60 cm e a foto não tem manga. Anúncio inconsistente.',
        '', '## Regras de ouro', '- Só o que o anúncio diz. Várias cores: não cite a cor e vincule a variante do vídeo.', '- Fundo sem araras nem outras roupas.', '- Sem colar, brinco, bolsa ou pulseira que não estão à venda.',
        '- No máximo 2 vídeos por dia por conta.']
open(f'{OUT}/00-LEIA-ME.md', 'w', encoding='utf-8').write('\n'.join(idx))

zp = f'{OUT}.zip'
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir(OUT)):
        z.write(f'{OUT}/{f}', f'prompts-looks/{f}')
print(zp, len(LOOKS), 'looks')
