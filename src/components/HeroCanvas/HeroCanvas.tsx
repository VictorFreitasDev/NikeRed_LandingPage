import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown, ExternalLink, Play, Sliders } from 'lucide-react';
import manifestData from '../../../public/frames/manifest.json';
import { FramesManifest, DeviceVariant } from '../../types/frames';
import { PRODUCT_DATA } from '../../config/product';
import { FrameSequenceManager } from '../../utils/frameLoader';
import styles from './HeroCanvas.module.css';

const manifest = manifestData as unknown as FramesManifest;

export const HeroCanvas: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const managerRef = useRef<FrameSequenceManager | null>(null);

  // Modo de visualização: 'scroll' (controlado por scroll) ou 'loop' (vídeo contínuo)
  const [playbackMode, setPlaybackMode] = useState<'scroll' | 'loop'>('scroll');
  const [isCanvasDrawn, setIsCanvasDrawn] = useState(false);

  // Base path seguro
  const basePath = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== './' ? import.meta.env.BASE_URL : '';
  const cleanBase = basePath.endsWith('/') || basePath === '' ? basePath : `${basePath}/`;

  // Refs de controle de performance (sem re-render no scroll)
  const currentFrameRef = useRef<number>(0);
  const targetFrameRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const isRafActiveRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  // Refs dos painéis de narrativa sobreposta
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const frameIndicatorRef = useRef<HTMLSpanElement>(null);

  // Estados estruturais
  const [deviceVariant, setDeviceVariant] = useState<DeviceVariant>('desktop');
  const [isReady, setIsReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detectar variante mobile/desktop
  useEffect(() => {
    const checkVariant = () => {
      const isMobile = window.innerWidth <= 768;
      const newVariant: DeviceVariant = isMobile ? 'mobile' : 'desktop';
      setDeviceVariant(newVariant);
      if (managerRef.current) {
        managerRef.current.setVariant(newVariant);
      }
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

  // Função principal de desenho no Canvas 2D
  const renderCanvasFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const manager = managerRef.current;
    if (!canvas || !manager) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const img = manager.getFrameOrClosest(frameIndex);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calcular enquadramento "cover" com ponto focal no calçado
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
    setIsCanvasDrawn(true);
  }, []);

  // Loop de renderização suave via requestAnimationFrame
  const requestRender = useCallback(() => {
    if (isRafActiveRef.current) return;
    isRafActiveRef.current = true;

    rafIdRef.current = requestAnimationFrame(() => {
      isRafActiveRef.current = false;
      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

      if (Math.abs(target - current) > 0.05) {
        const next = current + (target - current) * 0.35;
        currentFrameRef.current = Math.abs(target - next) < 0.05 ? target : next;
        renderCanvasFrame(Math.round(currentFrameRef.current));
        requestRender();
      } else {
        currentFrameRef.current = target;
        renderCanvasFrame(Math.round(target));
      }

      if (frameIndicatorRef.current) {
        const frameNum = Math.min(manifest.frameCount, Math.max(1, Math.round(currentFrameRef.current) + 1));
        frameIndicatorRef.current.textContent = `${String(frameNum).padStart(3, '0')} / ${manifest.frameCount}`;
      }
    });
  }, [renderCanvasFrame]);

  // Inicializar FrameSequenceManager e listeners reativos
  useEffect(() => {
    const manager = new FrameSequenceManager(manifest, deviceVariant, cleanBase);
    managerRef.current = manager;

    const unsubscribeReady = manager.onReady(() => {
      setIsReady(true);
      requestRender();
    });

    // Quando um frame termina de carregar, se for o frame atual, força renderização imediata
    const unsubscribeFrame = manager.onFrameLoaded((loadedIndex) => {
      if (Math.abs(loadedIndex - targetFrameRef.current) <= 2) {
        requestRender();
      }
    });

    manager.startInitialLoad();

    return () => {
      unsubscribeReady();
      unsubscribeFrame();
      manager.destroy();
      managerRef.current = null;
    };
  }, [deviceVariant, cleanBase, requestRender]);

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

    renderCanvasFrame(currentFrameRef.current);
  }, [renderCanvasFrame]);

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

  // Scroll listener de alta precisão
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const viewportHeight = window.innerHeight;
      const scrollableDistance = sectionHeight - viewportHeight;

      if (scrollableDistance <= 0) return;

      const rawProgress = -rect.top / scrollableDistance;
      const progress = Math.max(0, Math.min(1, rawProgress));

      const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
      const direction = currentScrollTop >= lastScrollTopRef.current ? 'forward' : 'backward';
      lastScrollTopRef.current = currentScrollTop;

      const totalFrames = manifest.frameCount;
      const targetIndex = Math.round(progress * (totalFrames - 1));
      targetFrameRef.current = targetIndex;

      // Sincronizar também o vídeo nativo caso esteja ativo ou em pausa de scroll
      if (videoRef.current && playbackMode === 'scroll') {
        const videoDuration = manifest.duration || 9.96;
        if (!isNaN(videoRef.current.duration)) {
          videoRef.current.currentTime = progress * videoDuration;
        }
      }

      if (managerRef.current) {
        managerRef.current.preloadSurrounding(targetIndex, direction);
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
  }, [requestRender, playbackMode]);

  // Alternar entre modo scroll e reprodução contínua do vídeo
  const togglePlaybackMode = () => {
    setPlaybackMode((prev) => {
      const next = prev === 'scroll' ? 'loop' : 'scroll';
      if (videoRef.current) {
        if (next === 'loop') {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      }
      return next;
    });
  };

  const handleScrollToNextSection = () => {
    const section = sectionRef.current;
    if (!section) return;
    const targetY = section.offsetTop + section.offsetHeight;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const posterSrc = `${cleanBase}frames/${deviceVariant}/poster.webp`;
  const videoSrc = `${cleanBase}video.mp4`;

  return (
    <section
      id="experiencia"
      ref={sectionRef}
      className={styles.heroSection}
      aria-label="Experiência interativa do Nike Air Force 1 Low QS Team Red"
    >
      <div className={styles.stickyWrapper}>
        {/* =========================================================================
            CAMADA VISUAL DE FUNDO COM TRIPLA GARANTIA:
            1. Poster estático imediato (milissegundo 0)
            2. Vídeo nativo mp4 de 8 segundos com fumaça bordô
            3. Canvas 2D nativo desenhando os 239 frames no scroll
           ========================================================================= */}
        <div className={styles.mediaContainer}>
          {/* 1. Imagem Poster Instantânea */}
          <img
            src={posterSrc}
            alt="Cena urbana noturna do Nike Air Force 1 Low QS Team Red"
            className={styles.posterFallback}
            aria-hidden="true"
          />

          {/* 2. Elemento de Vídeo Real no Fundo */}
          <video
            ref={videoRef}
            className={`${styles.heroVideo} ${playbackMode === 'loop' ? styles.heroVideoActive : ''}`}
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />

          {/* 3. Canvas 2D Sincronizado pelo Scroll */}
          <canvas
            ref={canvasRef}
            className={`${styles.heroCanvas} ${isCanvasDrawn && playbackMode === 'scroll' ? styles.heroCanvasVisible : ''}`}
            aria-hidden="true"
          />
        </div>

        {/* Gradientes sutis para contraste e legibilidade editorial */}
        <div className={styles.vignetteTop} />
        <div className={styles.vignetteBottom} />
        <div className={styles.vignetteSides} />

        {/* Barra de Progresso Cinematográfica */}
        <div className={styles.progressBarTrack} aria-hidden="true">
          <div ref={progressBarRef} className={styles.progressBarFill} />
        </div>

        {/* HUD Técnico e Controles Interativos */}
        <div className={styles.hudOverlay}>
          <button
            type="button"
            onClick={togglePlaybackMode}
            className={styles.modeToggleBtn}
            aria-label={`Alternar modo de visualização. Modo atual: ${playbackMode === 'scroll' ? 'Scroll Interativo' : 'Vídeo em Loop'}`}
            title="Clique para alternar entre Scroll Interativo e Vídeo Contínuo"
          >
            {playbackMode === 'scroll' ? (
              <>
                <Sliders size={13} className={styles.modeIcon} />
                <span>MODO SCROLL 24FPS</span>
              </>
            ) : (
              <>
                <Play size={13} className={styles.modeIcon} />
                <span>VÍDEO EM LOOP</span>
              </>
            )}
          </button>

          <div className={styles.hudBadge}>
            <span className={`${styles.hudDot} ${!isReady ? styles.hudDotLoading : ''}`} />
            <span className={styles.hudLabel}>
              {isReady ? 'SYNC ATIVO' : 'CARREGANDO...'}
            </span>
          </div>

          <div className={styles.hudCounter} aria-label="Contador de quadros">
            <span ref={frameIndicatorRef}>001 / {manifest.frameCount}</span>
          </div>
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
            <span className={styles.scrollText}>Role para interagir com o vídeo</span>
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
