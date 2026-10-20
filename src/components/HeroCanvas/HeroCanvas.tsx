import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown, ExternalLink } from 'lucide-react';
import manifestData from '../../../public/frames/manifest.json';
import { FramesManifest, DeviceVariant } from '../../types/frames';
import { PRODUCT_DATA } from '../../config/product';
import { FrameSequenceManager } from '../../utils/frameLoader';
import styles from './HeroCanvas.module.css';

const manifest = manifestData as unknown as FramesManifest;

export const HeroCanvas: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<FrameSequenceManager | null>(null);

  // Refs de animação direta (sem re-render do React durante o scroll)
  const currentFrameRef = useRef<number>(0);
  const targetFrameRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const isRafActiveRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  // Refs dos painéis de narrativa sobreposta para manipulação direta de estilo
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const frameIndicatorRef = useRef<HTMLSpanElement>(null);

  // Estados apenas para flags estruturais
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

  // Inicializar FrameSequenceManager
  useEffect(() => {
    const basePath = import.meta.env.BASE_URL || './';
    const manager = new FrameSequenceManager(manifest, deviceVariant, basePath);
    managerRef.current = manager;

    const unsubscribeReady = manager.onReady(() => {
      setIsReady(true);
      requestRender();
    });

    manager.startInitialLoad();

    return () => {
      unsubscribeReady();
      manager.destroy();
      managerRef.current = null;
    };
  }, []);

  // Ajustar dimensões do Canvas e DPI
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limita DPR a 2 para controle de memória
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    renderCanvasFrame(currentFrameRef.current);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Função principal de desenho no Canvas 2D
  const renderCanvasFrame = (frameIndex: number) => {
    const canvas = canvasRef.current;
    const manager = managerRef.current;
    if (!canvas || !manager) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const img = manager.getFrameOrClosest(frameIndex);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calcular enquadramento "cover" com ponto focal inteligente
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth = canvasWidth;
    let drawHeight = canvasHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      // Canvas é mais largo que a imagem
      drawHeight = canvasWidth / imgRatio;
      offsetY = (canvasHeight - drawHeight) * 0.5; // Centraliza verticalmente
    } else {
      // Canvas é mais alto que a imagem (mobile ou telas estreitas)
      drawWidth = canvasHeight * imgRatio;
      // No mobile, centralizar no calçado (que se move ligeiramente no centro-baixo)
      offsetX = (canvasWidth - drawWidth) * 0.5;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // Loop de renderização suave via requestAnimationFrame
  const requestRender = useCallback(() => {
    if (isRafActiveRef.current) return;
    isRafActiveRef.current = true;

    rafIdRef.current = requestAnimationFrame(() => {
      isRafActiveRef.current = false;
      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

      // Interpolação suave quando há diferença
      if (Math.abs(target - current) > 0.05) {
        // Passo de suavização proporcional
        const next = current + (target - current) * 0.35;
        currentFrameRef.current = Math.abs(target - next) < 0.05 ? target : next;
        renderCanvasFrame(Math.round(currentFrameRef.current));
        requestRender(); // continua até convergir
      } else {
        currentFrameRef.current = target;
        renderCanvasFrame(Math.round(target));
      }

      // Atualiza indicador de frame no HUD sem re-renderizar React
      if (frameIndicatorRef.current) {
        const frameNum = Math.min(manifest.frameCount, Math.max(1, Math.round(currentFrameRef.current) + 1));
        frameIndicatorRef.current.textContent = `${String(frameNum).padStart(3, '0')} / ${manifest.frameCount}`;
      }
    });
  }, []);

  // Atualizar as narrativas sobrepostas (0-25%, 25-45%, 45-70%, 70-100%)
  const updateOverlays = (progress: number) => {
    // Helper de opacidade e translação baseado no intervalo [start, peakStart, peakEnd, end]
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

    // Barra de progresso da seção
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progress})`;
    }

    // Fase 1: 0% a 25% (Apresentação do modelo e título)
    if (phase1Ref.current) {
      const p = calcPhase(-0.05, 0.02, 0.20, 0.28);
      phase1Ref.current.style.opacity = `${p.opacity}`;
      phase1Ref.current.style.transform = `translate3d(0, ${p.translateY}px, 0)`;
      phase1Ref.current.style.pointerEvents = p.pointerEvents;
    }

    // Fase 2: 25% a 45% (O impacto e a fumaça bordô)
    if (phase2Ref.current) {
      const p = calcPhase(0.24, 0.30, 0.40, 0.47);
      phase2Ref.current.style.opacity = `${p.opacity}`;
      phase2Ref.current.style.transform = `translate3d(0, ${p.translateY}px, 0)`;
      phase2Ref.current.style.pointerEvents = p.pointerEvents;
    }

    // Fase 3: 45% a 70% (Textura e acabamento pony hair)
    if (phase3Ref.current) {
      const p = calcPhase(0.44, 0.50, 0.65, 0.72);
      phase3Ref.current.style.opacity = `${p.opacity}`;
      phase3Ref.current.style.transform = `translate3d(0, ${p.translateY}px, 0)`;
      phase3Ref.current.style.pointerEvents = p.pointerEvents;
    }

    // Fase 4: 70% a 100% (Revelação clara do tênis e CTA)
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

      // Progresso normalizado 0 a 1
      const rawProgress = -rect.top / scrollableDistance;
      const progress = Math.max(0, Math.min(1, rawProgress));

      // Determinar direção
      const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
      const direction = currentScrollTop >= lastScrollTopRef.current ? 'forward' : 'backward';
      lastScrollTopRef.current = currentScrollTop;

      // Mapear para índice de frame real
      const totalFrames = manifest.frameCount;
      const targetIndex = Math.round(progress * (totalFrames - 1));
      targetFrameRef.current = targetIndex;

      // Solicitar prefetch inteligente na direção do movimento
      if (managerRef.current) {
        managerRef.current.preloadSurrounding(targetIndex, direction);
      }

      // Atualizar overlays e disparar render
      updateOverlays(progress);
      requestRender();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Execução inicial

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [requestRender]);

  // Função para avançar suavemente pelo botão ou teclado
  const handleScrollToNextSection = () => {
    const section = sectionRef.current;
    if (!section) return;
    const targetY = section.offsetTop + section.offsetHeight;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  return (
    <section
      id="experiencia"
      ref={sectionRef}
      className={styles.heroSection}
      aria-label="Experiência interativa do Nike Air Force 1 Low QS Team Red"
    >
      <div className={styles.stickyWrapper}>
        {/* Canvas de alta performance */}
        <canvas
          ref={canvasRef}
          className={styles.heroCanvas}
          aria-hidden="true"
        />

        {/* Gradientes sutis para contraste e legibilidade editorial */}
        <div className={styles.vignetteTop} />
        <div className={styles.vignetteBottom} />
        <div className={styles.vignetteSides} />

        {/* Barra de Progresso Cinematográfica */}
        <div className={styles.progressBarTrack} aria-hidden="true">
          <div ref={progressBarRef} className={styles.progressBarFill} />
        </div>

        {/* HUD e Indicador de Frame Técnico */}
        <div className={styles.hudOverlay} aria-hidden="true">
          <div className={styles.hudBadge}>
            <span className={`${styles.hudDot} ${!isReady ? styles.hudDotLoading : ''}`} />
            <span className={styles.hudLabel}>
              {isReady ? 'SCROLL SEQUENCE 24FPS' : 'CARREGANDO SEQUÊNCIA...'}
            </span>
          </div>
          <div className={styles.hudCounter}>
            <span ref={frameIndicatorRef}>001 / {manifest.frameCount}</span>
          </div>
        </div>

        {/* =========================================================================
            NARRATIVA SOBREPOSTA (DOM Semântico Acessível com Transições em GPU)
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
            <span className={styles.scrollText}>Role para iniciar a sequência</span>
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
            <span>Modo de movimento reduzido ativo. O vídeo está em pausa representativa.</span>
          </div>
        )}
      </div>
    </section>
  );
};
