import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown, ExternalLink } from 'lucide-react';
import manifestData from '../../../public/frames/manifest.json';
import { FramesManifest, DeviceVariant } from '../../types/frames';
import { PRODUCT_DATA } from '../../config/product';
import styles from './HeroCanvas.module.css';

const manifest = manifestData as unknown as FramesManifest;
const TOTAL_FRAMES = manifest.frameCount; // 239 frames reais do vídeo

export const HeroCanvas: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Armazenamento em memória dos objetos Image dos frames
  const framesCacheRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const currentFrameRef = useRef<number>(0);
  const targetFrameRef = useRef<number>(0);
  const isRafActiveRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  // Refs dos painéis de narrativa sobreposta para manipulação direta de estilo
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const frameIndicatorRef = useRef<HTMLSpanElement>(null);

  // Estados
  const [deviceVariant, setDeviceVariant] = useState<DeviceVariant>('desktop');
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Base path seguro
  const basePath = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== './' ? import.meta.env.BASE_URL : '';
  const cleanBase = basePath.endsWith('/') || basePath === '' ? basePath : `${basePath}/`;

  // Detectar variante mobile/desktop
  useEffect(() => {
    const checkVariant = () => {
      const isMobile = window.innerWidth <= 768;
      setDeviceVariant(isMobile ? 'mobile' : 'desktop');
    };

    checkVariant();
    window.addEventListener('resize', checkVariant);
    return () => window.removeEventListener('resize', checkVariant);
  }, []);

  // Detectar prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Função para desenhar uma imagem no Canvas 2D
  const drawImageToCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth = canvasWidth;
    let drawHeight = canvasHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawHeight = canvasWidth / imgRatio;
      offsetY = (canvasHeight - drawHeight) * 0.5;
    } else {
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) * 0.5;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Retorna a URL de um frame específico
  const getFrameUrl = useCallback(
    (index: number) => {
      const folder = manifest[deviceVariant].folder;
      const padded = String(index + 1).padStart(3, '0');
      return `${cleanBase}${folder}/frame_${padded}.webp`;
    },
    [deviceVariant, cleanBase]
  );

  // Renderizar o frame atual ou o mais próximo já carregado
  const renderFrame = useCallback(
    (frameIndex: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex));
      const cache = framesCacheRef.current;

      // 1. Tentar frame exato
      const exactImg = cache[clamped];
      if (exactImg && exactImg.complete && exactImg.naturalWidth > 0) {
        drawImageToCanvas(exactImg);
        return;
      }

      // 2. Buscar o frame mais próximo já decodificado no cache
      let closestImg: HTMLImageElement | null = null;
      let minDiff = Infinity;

      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const item = cache[i];
        if (item && item.complete && item.naturalWidth > 0) {
          const diff = Math.abs(i - clamped);
          if (diff < minDiff) {
            minDiff = diff;
            closestImg = item;
          }
        }
      }

      if (closestImg) {
        drawImageToCanvas(closestImg);
      }
    },
    [drawImageToCanvas]
  );

  // Loop suave de renderização via requestAnimationFrame
  const requestRender = useCallback(() => {
    if (isRafActiveRef.current) return;
    isRafActiveRef.current = true;

    rafIdRef.current = requestAnimationFrame(() => {
      isRafActiveRef.current = false;
      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

      if (Math.abs(target - current) > 0.05) {
        // Interpolação suave para resposta instantânea ao scroll
        const next = current + (target - current) * 0.45;
        currentFrameRef.current = Math.abs(target - next) < 0.05 ? target : next;
        renderFrame(Math.round(currentFrameRef.current));
        requestRender();
      } else {
        currentFrameRef.current = target;
        renderFrame(Math.round(target));
      }

      // Atualiza o contador de frames do HUD sem re-renderizar o React
      if (frameIndicatorRef.current) {
        const frameNum = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(currentFrameRef.current) + 1));
        frameIndicatorRef.current.textContent = `${String(frameNum).padStart(3, '0')} / ${TOTAL_FRAMES}`;
      }
    });
  }, [renderFrame]);

  // Carregamento inteligente e progressivo de imagens
  const loadSingleFrame = useCallback(
    (index: number): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const cache = framesCacheRef.current;
        if (cache[index]) {
          resolve(cache[index]!);
          return;
        }

        const img = new Image();
        img.decoding = 'async';
        img.src = getFrameUrl(index);

        img.onload = () => {
          cache[index] = img;
          setLoadedCount((prev) => prev + 1);

          // Se for o frame que o usuário está visualizando agora, desenha imediatamente!
          if (Math.abs(index - targetFrameRef.current) <= 1) {
            renderFrame(targetFrameRef.current);
          }

          resolve(img);
        };

        img.onerror = () => {
          resolve(img);
        };
      });
    },
    [getFrameUrl, renderFrame]
  );

  // Inicialização: carrega o primeiro frame com prioridade máxima e depois os demais em lotes
  useEffect(() => {
    // Reset do cache se a variante mudar
    framesCacheRef.current = new Array(TOTAL_FRAMES).fill(null);

    let isCancelled = false;

    // 1. Carrega frame 0 imediatamente e desenha no canvas
    loadSingleFrame(0).then((img) => {
      if (!isCancelled && img.complete) {
        drawImageToCanvas(img);
      }
    });

    // 2. Carrega os primeiros 15 frames (primeira dobra de scroll)
    const initialBatch = Array.from({ length: Math.min(18, TOTAL_FRAMES) }, (_, i) => i);
    initialBatch.forEach((i) => loadSingleFrame(i));

    // 3. Carrega os demais frames progressivamente em background
    const loadRemaining = async () => {
      for (let i = 18; i < TOTAL_FRAMES; i++) {
        if (isCancelled) break;
        await loadSingleFrame(i);
      }
    };

    // Inicia após um pequeno delay para não travar a carga inicial da página
    const timer = setTimeout(loadRemaining, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [loadSingleFrame, drawImageToCanvas]);

  // Ajustar dimensões do Canvas e DPI
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    renderFrame(currentFrameRef.current);
  }, [renderFrame]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Atualizar as narrativas sobrepostas (0-25%, 25-45%, 45-70%, 70-100%)
  const updateOverlays = (progress: number) => {
    const calcPhase = (start: number, peakStart: number, peakEnd: number, end: number) => {
      if (progress < start || progress > end) return { opacity: 0, translateY: 24, pointerEvents: 'none' };
      let opacity = 1;
      let translateY = 0;

      if (progress < peakStart) {
        const t = (progress - start) / (peakStart - start);
        opacity = t;
        translateY = (1 - t) * 20;
      } else if (progress > peakEnd) {
        const t = (progress - peakEnd) / (end - peakEnd);
        opacity = 1 - t;
        translateY = -t * 20;
      }

      return {
        opacity: Math.max(0, Math.min(1, opacity)),
        translateY,
        pointerEvents: opacity > 0.3 ? 'auto' : 'none',
      };
    };

    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progress})`;
    }

    if (phase1Ref.current) {
      const p = calcPhase(-0.05, 0.02, 0.20, 0.28);
      phase1Ref.current.style.opacity = `${p.opacity}`;
      phase1Ref.current.style.transform = `translate3d(0, ${p.translateY}px, 0)`;
      phase1Ref.current.style.pointerEvents = p.pointerEvents;
    }

    if (phase2Ref.current) {
      const p = calcPhase(0.24, 0.30, 0.40, 0.47);
      phase2Ref.current.style.opacity = `${p.opacity}`;
      phase2Ref.current.style.transform = `translate3d(0, ${p.translateY}px, 0)`;
      phase2Ref.current.style.pointerEvents = p.pointerEvents;
    }

    if (phase3Ref.current) {
      const p = calcPhase(0.44, 0.50, 0.65, 0.72);
      phase3Ref.current.style.opacity = `${p.opacity}`;
      phase3Ref.current.style.transform = `translate3d(0, ${p.translateY}px, 0)`;
      phase3Ref.current.style.pointerEvents = p.pointerEvents;
    }

    if (phase4Ref.current) {
      const p = calcPhase(0.68, 0.76, 1.05, 1.15);
      phase4Ref.current.style.opacity = `${p.opacity}`;
      phase4Ref.current.style.transform = `translate3d(0, ${p.translateY}px, 0)`;
      phase4Ref.current.style.pointerEvents = p.pointerEvents;
    }
  };

  // Scroll listener de alta precisão que avança/recua os frames do vídeo
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const viewportHeight = window.innerHeight;
      const scrollableDistance = sectionHeight - viewportHeight;

      if (scrollableDistance <= 0) return;

      // Progresso 0.0 a 1.0
      const rawProgress = -rect.top / scrollableDistance;
      const progress = Math.max(0, Math.min(1, rawProgress));

      // Mapeia o scroll exatamente para o índice do frame correspondente
      const targetIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(progress * (TOTAL_FRAMES - 1))));
      targetFrameRef.current = targetIndex;

      // Pré-carrega ativamente os frames ao redor do alvo
      for (let offset = -3; offset <= 8; offset++) {
        const nearIdx = targetIndex + offset;
        if (nearIdx >= 0 && nearIdx < TOTAL_FRAMES) {
          loadSingleFrame(nearIdx);
        }
      }

      updateOverlays(progress);
      requestRender();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [loadSingleFrame, requestRender]);

  const handleScrollToNextSection = () => {
    const section = sectionRef.current;
    if (!section) return;
    const targetY = section.offsetTop + section.offsetHeight;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const posterSrc = `${cleanBase}frames/${deviceVariant}/poster.webp`;

  return (
    <section
      id="experiencia"
      ref={sectionRef}
      className={styles.heroSection}
      aria-label="Experiência interativa do Nike Air Force 1 Low QS Team Red controlada pelo scroll"
    >
      <div className={styles.stickyWrapper}>
        {/* =========================================================================
            CAMADA VISUAL DE FUNDO CONTROLADA PELO SCROLL:
            - Poster estático no milissegundo 0 (garante visual instantâneo)
            - Canvas 2D desenhando os 239 frames conforme a pessoa rola
           ========================================================================= */}
        <div className={styles.mediaContainer}>
          {/* Poster estático para tempo de montagem zero */}
          <img
            src={posterSrc}
            alt="Homem caminhando na rua noturna com o Nike Air Force 1 Low QS Team Red"
            className={styles.posterFallback}
            aria-hidden="true"
          />

          {/* Canvas 2D que avança e volta os frames com a rolagem do usuário */}
          <canvas
            ref={canvasRef}
            className={styles.heroCanvas}
            aria-hidden="true"
          />
        </div>

        {/* Vinhetas e gradientes de contraste para leitura dos textos */}
        <div className={styles.vignetteTop} />
        <div className={styles.vignetteBottom} />
        <div className={styles.vignetteSides} />

        {/* Barra de Progresso Cinematográfica do Scroll */}
        <div className={styles.progressBarTrack} aria-hidden="true">
          <div ref={progressBarRef} className={styles.progressBarFill} />
        </div>

        {/* HUD Técnico com Indicador de Quadro do Scroll */}
        <div className={styles.hudOverlay}>
          <div className={styles.hudBadge}>
            <span className={styles.hudDot} />
            <span className={styles.hudLabel}>SCROLL-DRIVEN 24FPS</span>
          </div>

          <div className={styles.hudCounter} aria-label="Quadro atual do vídeo">
            <span ref={frameIndicatorRef}>001 / {TOTAL_FRAMES}</span>
          </div>

          {loadedCount < TOTAL_FRAMES && (
            <div className={styles.hudLoading}>
              <span>{Math.round((loadedCount / TOTAL_FRAMES) * 100)}%</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            NARRATIVA SOBREPOSTA
           ========================================================================= */}

        {/* Fase 1: 0% a 25% - Título Principal e Apresentação do Modelo */}
        <div ref={phase1Ref} className={`${styles.phaseCard} ${styles.phase1}`}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowAccent}>EDITION QUICKSTRIKE</span>
            <span className={styles.eyebrowSeparator}>&bull;</span>
            <span>SKU {PRODUCT_DATA.sku}</span>
          </div>
          <h1 className={styles.heroMainTitle}>
            PRESENÇA EM <br />
            <span className={styles.titleHighlight}>CADA PASSO.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            {PRODUCT_DATA.name} &mdash; <span className={styles.colorAccent}>{PRODUCT_DATA.colorway}</span>.
          </p>
          <div className={styles.scrollHint}>
            <span className={styles.scrollMouse}>
              <span className={styles.scrollWheel} />
            </span>
            <span className={styles.scrollText}>Role para avançar o vídeo</span>
          </div>
        </div>

        {/* Fase 2: 25% a 45% - O Impacto e a Fumaça Bordô */}
        <div ref={phase2Ref} className={`${styles.phaseCard} ${styles.phase2}`}>
          <div className={styles.editorialBadge}>01 &bull; ATMOSFERA</div>
          <h2 className={styles.phaseHeading}>
            O IMPACTO <br />
            NO ASFALTO.
          </h2>
          <p className={styles.phaseDescription}>
            A fumaça bordô emerge sob os pés, envolvendo a noite em uma névoa densa.
            A cidade diminui o ritmo; a silhueta toma o controle do espaço.
          </p>
        </div>

        {/* Fase 3: 45% a 70% - Textura Tátil e Faux Pony Hair */}
        <div ref={phase3Ref} className={`${styles.phaseCard} ${styles.phase3}`}>
          <div className={styles.editorialBadge}>02 &bull; SENSORIAL</div>
          <h2 className={styles.phaseHeading}>
            TEXTURA <br />
            INCONFUNDÍVEL.
          </h2>
          <p className={styles.phaseDescription}>
            Pele sintética tátil (faux pony hair) sobreposta em tom vinho monocromático.
            Um diálogo tátil entre a herança do basquete e a vanguarda do streetwear contemporâneo.
          </p>
        </div>

        {/* Fase 4: 70% a 100% - Revelação do Produto e CTA de Conversão */}
        <div ref={phase4Ref} className={`${styles.phaseCard} ${styles.phase4}`}>
          <div className={styles.editorialBadge}>03 &bull; REVELAÇÃO</div>
          <h2 className={styles.productRevealTitle}>
            AIR FORCE 1 LOW QS
          </h2>
          <p className={styles.productRevealSubtitle}>
            A lenda urbana de 1982 refinada com acabamento tátil em Team Red integral.
          </p>

          <div className={styles.revealActions}>
            <a
              href={PRODUCT_DATA.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaPrimary}
              aria-label="Ver disponibilidade oficial na Nike Brasil (abre em nova aba)"
            >
              <span>Ver disponibilidade na Nike</span>
              <ExternalLink size={16} aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={handleScrollToNextSection}
              className={styles.ctaSecondary}
              aria-label="Explorar especificações detalhadas do produto"
            >
              <span>Explorar Detalhes</span>
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Fallback Acessível para Modo de Movimento Reduzido */}
        {reducedMotion && (
          <div className={styles.reducedMotionNotice} role="status">
            <span>Modo de movimento reduzido ativo. O vídeo está em pausa estática.</span>
          </div>
        )}
      </div>
    </section>
  );
};
