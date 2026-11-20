# Guia do vídeo híbrido (aprendizados de 18 e 19/11/2026)

Método validado na produção de 18 vídeos de proteína. Está implementado em **Prompt de vídeo → Modelo híbrido (cena travada)**.

## Princípio
IA só para a pessoa e o ambiente. Produto **parado**. Close **sempre com a foto real do anúncio**.

## Por que
| Problema visto nos testes | Regra |
|---|---|
| A IA trocou letras do rótulo e traduziu para o inglês ("RECOMMENDED USE") | Prompt com "Do not translate", textos do rótulo copiados letra por letra; close só com foto real |
| A IA perdeu e duplicou potes quando a pessoa pegava ou colocava produto | Produto parado; kit em pé na bancada; mesma imagem como primeiro e último quadro |
| Coqueteleira, frutas, faca e kiwi apareceram na bancada | "Counter is completely empty"; recortar o quadro quando escapar |
| Kit com 1 pacote na imagem, anúncio com 2 + coqueteleira | Kit: contar os itens e travar a contagem no prompt |
| Vídeo chegou sem som (o problema foi no envio) | Conferir o áudio antes de montar; enviar o .mp4 original, não pelo WhatsApp |

## Montagem final (15 s)
1. **0–8 s:** cena da IA com a fala (só nome, sabor e peso).
2. **8–15,5 s:** foto real do anúncio com zoom lento e 3 textos (proteína → sabor e peso → "Toque no link do produto").
3. **Gancho:** só na **capa**, no primeiro segundo. Some quando a pessoa começa a falar.
4. **Marca d'água:** "Conteúdo gerado por IA" do início ao fim, logo abaixo da barra do topo do TikTok.
5. **Textos:** linhas centralizadas, entre ~12% e ~75% da altura (fora das barras do TikTok).

## Legenda
Só **nome, sabor, peso e "veja no link"**. O app gera a legenda sugerida.

Violação de 19/11/2026 (-8 pontos, "Promoção de produto inconsistente"): a legenda era "💪 TREINA, MAS NÃO SABE SE CONSOME PROTEÍNA SUFICIENTE?". Outra legenda do dia: "SEU WHEY ACABA RÁP…". As duas agora são bloqueadas pelo app (detectores D-MUSCULO e D-DURACAO; regra EV-10).

## Publicação
- Ativar o selo **"Conteúdo gerado por IA"** do TikTok, além da marca d'água.
- Vincular o anúncio exato; guardar print do anúncio.
- No máximo **2 vídeos por dia** por conta; registrar na **Validação**.
- Nunca o mesmo arquivo em duas contas: usar versões diferentes (ex.: Nyer v1 e v2).

## Roupa e acessório (aprendizados de 20/11/2026)
Implementado em **Prompt de vídeo → Modelo híbrido → Roupa / acessório**.

| Regra | Por quê |
|---|---|
| Sempre a **mesma modelo** na loja (ficha "CHARACTER LOCK") | Identidade e reconhecimento |
| **Sem fala, só música** (Biblioteca Comercial do TikTok) | Sem boca dessincronizada; é o padrão da moda |
| 2 clipes de 8 s: parada com meio giro + caminhando | Mostra caimento, costas e movimento |
| Fundo **sem araras nem outras roupas** (ou bem borrado) | Evita "produto inconsistente" |
| Tricô/renda vazados: **forro cor da pele** no prompt | Pele aparecendo pode ser lida como conteúdo sexual |
| Sem colar, brinco, bolsa ou pulseira que não estão à venda | Acessório extra confunde a oferta |
| Não escrever a cor no prompt: "exactly the same color as the first frame" | A IA puxa o tom (vermelho virou laranja) |
| Tecido: descrever "matte" quando for modal | A IA deixou brilhante, como cetim |
| Fechamento: só o que o anúncio diz (tecido, bojo, forro, tamanhos, "diversas cores") | "Não amassa" é promessa |
| Várias cores no anúncio: não citar a cor e vincular a variante do vídeo | O carrinho precisa mostrar o que o vídeo mostrou |
| Nunca nome de marca ("estilo Farm") no anúncio, vídeo, legenda ou hashtags | Propriedade intelectual (detector D-MARCA-ESTILO) |
| Anúncio sem material ou sem tabela de tamanhos: não promover | Devolução e nota baixa |
| Ganchos de desejo e estilo ("O luxo da delicadeza", "Vestido com cara de rica") | Opinião prende mais e não é promessa; "parece de R$…" é bloqueado (D-PARECE) |
| Marca d'água configurável (padrão: pequena, rodapé esquerdo, ~74% da altura) | Discreta e fora da área da legenda do TikTok |

## Produtos a evitar por enquanto
- **Black Skull Whey Turbo**: selo "Immunity" e "Fast absorption" na embalagem.
- **Colágeno Revita Beauty**: "beleza e nutrição para o corpo"; a IA também escreveu "COLÁGENC".
- **Dark Lab**: pode usar, mas por último (a embalagem mostra "100% pura" e "rápida absorção").
