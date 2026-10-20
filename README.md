# Nike Air Force 1 Low QS &ldquo;Team Red&rdquo; &mdash; Landing Page Editorial

Experiência editorial e cinematográfica interativa dedicada ao **Nike Air Force 1 Low QS &ldquo;Team Red&rdquo;** (SKU: `IR1940-600`), desenvolvida em **React 18 + TypeScript + Vite**, sincronizada com scroll em **Canvas 2D nativo** a 24 FPS.

---

## 👟 Sobre o Produto

- **Modelo:** Nike Air Force 1 Low
- **Edição Especial:** Quickstrike (QS) &ldquo;Team Red&rdquo;
- **SKU Oficial:** `IR1940-600`
- **Tonalidade:** Team Red / Vinho profundo monocromático
- **Material Chave:** Cabedal texturizado com acabamento em pele sintética (*faux pony hair*) de alta densidade sobre base de couro e amortecimento *Nike Air* encapsulado na entressola clássica de 1982.
- **Link Oficial SNKRS:** [nike.com.br/snkrs/nike-air-force-1-low-qs-122872.html](https://www.nike.com.br/snkrs/nike-air-force-1-low-qs-122872.html)
- **Nota de Transparência:** Projeto editorial e de portfólio de engenharia front-end independente, sem afiliação institucional direta ou vínculo comercial com a Nike, Inc.

---

## 🛠️ Stack Tecnológica

- **Framework & Runtime:** React 18, TypeScript 5, Vite 6
- **Renderização Gráfica:** Canvas 2D nativo com controle de densidade de pixels (`Math.min(window.devicePixelRatio, 2)`), sem acoplamento a engines 3D pesadas
- **Sincronização com Scroll:** Sistema de controle de progresso normalizado via `requestAnimationFrame` sem re-renderização desnecessária do React durante a rolagem
- **Design & Estilo:** CSS Moderno com CSS Modules, variáveis customizadas, Grid assimétrico e Flexbox
- **Ícones:** Lucide React com importações pontuais
- **Processamento de Mídia:** Script em Node.js com FFmpeg para extração de frames WebP de alta eficiência com variantes para Desktop (1440x810) e Mobile (720x1280 em proporção vertical 9:16 com enquadramento centrado na ação)

---

## 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js:** versão 18+ (recomendado Node 20 ou 22)
- **FFmpeg:** necessário apenas caso queira reprocessar ou trocar o vídeo original (já foram incluídos no projeto os frames WebP e o manifesto gerados a partir do vídeo oficial fornecido)

### Passos de Execução

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Executar em Modo de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador em `http://localhost:3000` ou no endereço informado pelo Vite.

3. **Gerar Build de Produção:**
   ```bash
   npm run build
   ```

4. **Visualizar Build de Produção Localmente:**
   ```bash
   npm run preview
   ```

---

## 🎬 Processamento e Substituição do Vídeo

O projeto inclui um script automatizado (`scripts/process-video.mjs`) que converte qualquer vídeo `.mp4` em uma sequência de frames WebP ultraleves e gera o manifesto `public/frames/manifest.json`.

### Como trocar ou reprocessar o vídeo:

1. Coloque o novo arquivo `.mp4` na raiz do projeto (ou passe o caminho relativo como argumento).
2. Execute o comando:
   ```bash
   npm run process-video
   ```
   Ou especificando um arquivo:
   ```bash
   npm run process-video meu-novo-video.mp4
   ```

### O que o script faz automaticamente:
- Inspeciona os metadados com `ffprobe` (resolução, taxa de quadros real, duração e total de frames).
- Extrai e codifica a variante **Desktop** (`1440x810`, WebP com qualidade 76).
- Extrai, enquadra com crop vertical e codifica a variante **Mobile** (`720x1280` proporção 9:16, WebP com qualidade 74).
- Gera posters estáticos de alta velocidade para carregamento instantâneo da primeira dobra (`poster.webp`).
- Cria o arquivo de configuração `public/frames/manifest.json`.

---

## ⚙️ Configuração dos Dados do Produto

Todas as informações técnicas, textos editoriais, imagens de galeria e links oficiais do tênis estão centralizados em:
👉 [`src/config/product.ts`](./src/config/product.ts)

Para atualizar a URL de destino da Nike, código SKU, materiais ou blocos narrativos, basta editar esse arquivo único sem alterar a lógica de renderização dos componentes.

---

## ⚡ Decisões de Arquitetura e Performance

1. **Canvas 2D Direto vs. Elemento `<video>`:**
   - A alteração contínua de `video.currentTime` durante o scroll provoca jank e atrasos de decodificação de keyframes na maioria dos navegadores (especialmente no Safari e navegadores mobile).
   - A renderização em Canvas 2D através de frames WebP pré-extraídos permite resposta instantânea de scroll tanto para a frente quanto para trás com precisão de frame individual.

2. **Zero Re-renders do React no Scroll:**
   - Durante o movimento de rolagem na seção Hero, o React **não re-renderiza** os componentes.
   - O índice do frame atual e de destino é gerenciado via `useRef`.
   - O desenho no Canvas ocorre através de um loop de `requestAnimationFrame` que só dispara quando o frame efetivamente muda ou há redimensionamento da viewport.
   - A opacidade e translação dos textos narrativos sobrepostos são alteradas via propriedades CSS no DOM com aceleração de hardware (`transform: translate3d(...)`).

3. **Carregamento Progressivo e Cache com Limite (LRU):**
   - A classe `FrameSequenceManager` (`src/utils/frameLoader.ts`) limita as requisições concorrentes a no máximo 4 downloads paralelos.
   - Aplica priorização na direção do movimento do usuário (se estiver rolando para baixo, busca os próximos quadros primeiro; se estiver voltando, busca os anteriores).
   - Possui cache LRU que descarta frames distantes da janela atual e libera memória de bitmaps através de `img.src = ''`.
   - Implementa **fallback para o frame disponível mais próximo**: se o usuário rolar rapidamente antes de um frame terminar de decodificar, a aplicação renderiza imediatamente o frame mais próximo já presente em memória, evitando qualquer tela preta ou piscar.

4. **Acessibilidade e Movimento Reduzido:**
   - Respeita a preferência de sistema `prefers-reduced-motion: reduce`, exibindo o frame chave estático e a narrativa acessível sem scrubs obrigatórios.
   - O conteúdo textual existe semanticamente no DOM em tags `<main>`, `<section>`, `<h1>`, `<h2>`, `<article>`, `<figure>`, `<blockquote>` e tabelas de dados para leitores de tela.
   - Suporte completo a navegação por teclado com foco visível de alto contraste e link acessível "Pular para o conteúdo principal".

---

## 📦 Build e Publicação

O arquivo `vite.config.ts` está configurado com suporte à variável `VITE_BASE_PATH`:
- Para publicação na raiz de um domínio (ex: Vercel, Netlify):
  ```bash
  npm run build
  ```
- Para publicação em subdiretórios (ex: GitHub Pages em `/NikeRed_LandingPage/`):
  ```bash
  VITE_BASE_PATH=/NikeRed_LandingPage/ npm run build
  ```
  *(Por padrão, usa `./` relativo para compatibilidade universal em qualquer host estático).*

---

## 👨‍💻 Autor

Desenvolvido com foco em estética streetwear, performance web e fidelidade de produto por **Victor Freitas**.

