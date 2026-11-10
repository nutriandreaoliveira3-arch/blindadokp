---
name: carrossel-blindado
description: Cria carrosséis de Instagram da nutricionista Andréa (Emagrecimento Blindado) no padrão visual dela. Faz capa, texto slide a slide, recap, CTA, legenda e os arquivos 1080x1350. Use quando ela pedir carrossel, slides, post de arrastar, ou tiver uma ideia em lista ou passos que não cabe numa imagem só.
---

# Carrossel Emagrecimento Blindado

Cliente: Andréa Oliveira, nutricionista (@nutriandreaoliveira). Responder em português do Brasil, direto, com tabelas e checklists.
Adaptado de `ig-carousel` (postzen-dev/instagram-agent-skill, licença MIT).

## Carrossel ou Reels?
| Ideia | Formato |
|---|---|
| Tem passos, lista, "leis", antes e depois, algo para salvar e reler | **Carrossel** |
| Tem rosto, emoção, movimento, uma virada que precisa ser vista | **Reels** (skill `reels-blindado`) |
| É uma frase só | Nenhum dos dois. Vira gancho de Reels |

## Estrutura (6 a 10 slides)
| # | Slide | Regra |
|---|---|---|
| 1 | **CAPA** | Gancho em até 6 palavras, letra gigante (Bodoni). Uma linha de promessa embaixo. É 80% do resultado |
| 2 | **POR QUE IMPORTA** | Uma frase. Precisa funcionar sozinha: o Instagram pode mostrar o carrossel de novo começando pelo slide 2 |
| 3 a N | **UMA IDEIA POR SLIDE** | Título de 3 a 7 palavras + no máximo 25 palavras. Passou disso, vira dois slides |
| N+1 | **RECAP** | Tudo em lista. É o slide que as pessoas printam e enviam (envio é o sinal mais forte) |
| Último | **CTA** | Uma ação só: comentar a palavra |

## Regras dela (nunca quebrar)
- Texto **sempre branco**. Sem dourado, amarelo ou cor de destaque. Só sombra suave.
- Títulos em **Bodoni Moda**, maiúsculas. Corpo em DejaVu Sans, mínimo 32 px (é lido no celular a 1/3 do tamanho).
- Capa com foto: ela **sorrindo** ou com **postura de autoridade**, olhos abertos (conferir em resolução cheia). Texto abaixo do queixo, nunca no rosto.
- CTA: **nunca** "toque em saiba mais". Usar comentário com palavra: BLINDADA (comportamental), PLANO (objeção), VAGA (escassez), PROTEÍNA (isca).
- **Nunca inventar** número de vagas, prazo, história ou caso de paciente. Pedir o dado real.
- Estilo de texto dos roteiros Rony: gancho contra o senso comum, lista numerada ("LEI 1"), objeção encenada ("Ah, nutri…" / "Calma, linda, calma."), fecha com "Blindou."
- `@nutriandreaoliveira` pequeno em todo slide (print viaja sem você) e numeração `3/8` (mais gente chega ao fim quando vê o fim).
- Último slide com o logo: `padrao-visual/marca/logo_emagrecimento_blindado.png`.
- Margem de 120 px em todos os lados: a grade do perfil recorta as bordas.

## Passo a passo
1. **Texto primeiro.** Entregar a lista numerada slide a slide (formato abaixo) + legenda. Esperar ela aprovar ou ajustar.
2. **Montar o HTML.** Copiar `ferramentas/modelos/carrossel.html` para a mesma pasta (`ferramentas/modelos/carrossel_<tema>.html`) para os caminhos de fonte e logo funcionarem. Uma `<section class="slide">` por slide, tipos `capa | stake | ideia | recap | cta`. Foto de fundo: `class="slide capa foto" style="--foto:url('foto.jpg')"`.
3. **Renderizar:** `node ferramentas/render_carrossel.js ferramentas/modelos/carrossel_<tema>.html entregas/carrossel-<tema>/`. Sai `slide_01.jpg`, `slide_02.jpg`... em 1080×1350 JPEG.
4. **Conferir** cada slide: texto cortado, palavra estourando a largura (diminuir `font-size` do `h1`), fonte Bodoni carregada.
5. Mandar as imagens para aprovação. Depois: commit e push em `entregas/`.

## Formato da entrega do texto
```
CARROSSEL · 7 slides

1  CAPA     PROTEÍNA NÃO ENGORDA
            O erro que trava o seu resultado.
2  STAKE    Você corta proteína com medo da balança e perde músculo.
3  LEI 1    PROTEÍNA SEGURA A FOME
            ...
6  RECAP    As 3 leis, em ordem.
7  CTA      Comenta PROTEÍNA que eu te mando a lista.

Legenda: gancho na 1ª linha, um pedido só, 3 a 5 hashtags.
```

## Legenda do carrossel
- 1ª linha = gancho diferente da capa (a capa já usou as 6 palavras).
- Corpo curto, frases curtas, sem enrolação.
- Um único pedido, igual ao CTA do último slide.
- Alt text na capa: descrever a foto e o título (ela adiciona no app ao publicar).

## Publicação
- Instagram aceita até 20 imagens; o ideal é 6 a 10.
- Publicação manual pelo Meta Business Suite, ou agendamento pelo Metricool se estiver conectado. Agendar só depois da confirmação dela.
- Commits com `git -c user.email=nutriandreaoliveira3@gmail.com -c user.name="Andréa"`.
