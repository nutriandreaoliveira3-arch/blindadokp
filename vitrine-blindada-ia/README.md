# Vitrine Blindada IA — Central de Conformidade e Criação

Aplicativo web em português para criar e revisar conteúdo de TikTok Shop com menos risco de violação.
**Não garante aprovação do TikTok.** Identifica riscos, cita a regra e a fonte, e sugere correção.

## Duas formas de usar
- **Site para assinantes (Cloudflare + Green):** ver `docs/PUBLICAR-CLOUDFLARE.md`.
- **Arquivo local:** para uso próprio, sem internet.

## Como abrir o arquivo local (sem instalar nada)
1. Baixe o arquivo `dist/index.html`.
2. Dê dois cliques. Abre no navegador (Chrome ou Edge recomendados).
3. Os dados ficam salvos nesse navegador. Faça **Configurações → Exportar backup** com frequência.

## Módulos
Painel · Cadastrar produto · Biblioteca de produtos · Criar imagem · Prompt de vídeo (Google Flow) · Roteiro de vendas ·
Legenda e hashtags · Analisar conteúdo · Corrigir riscos · Preparar LIVE · Biblioteca de políticas · Histórico · Configurações.

## Classificação de risco
- 🟢 **Baixo risco:** nenhuma violação identificada na análise disponível.
- 🟡 **Atenção:** há elementos que precisam de revisão.
- 🔴 **Alto risco:** possível violação. Corrigir antes de publicar.

## Documentação
- `docs/PUBLICAR-CLOUDFLARE.md`: passo a passo para publicar e ligar a Green.
- `docs/ARQUITETURA.md`: fluxo, camadas, o que depende de API.
- `docs/POLITICAS-ESTRUTURADAS.md`: regras por categoria e por formato.
- `docs/LACUNAS-E-CONFLITOS.md`: conflitos, documentos que faltam e interpretações.
- `politicas-fonte/`: texto integral dos documentos recebidos.

## Desenvolvimento
```bash
npm install
```
```bash
npm run dev
```
```bash
npm test
```
```bash
npm run build
```
O build gera `dist/index.html`, um único arquivo com tudo embutido.
