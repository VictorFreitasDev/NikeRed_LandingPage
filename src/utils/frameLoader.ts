import { DeviceVariant, FramesManifest } from '../types/frames';

interface CachedImage {
  img: HTMLImageElement;
  lastUsed: number;
}

interface QueueItem {
  index: number;
  priority: number;
  resolve?: (img: HTMLImageElement) => void;
  reject?: (err: Error) => void;
}

export class FrameSequenceManager {
  private manifest: FramesManifest;
  private variant: DeviceVariant;
  private basePath: string;
  private totalFrames: number;

  // Cache LRU
  private cache: Map<number, CachedImage> = new Map();
  private maxCacheSize: number = 75; // Limite seguro para consumo de memória

  // Controle de Concorrência
  private activeRequests: number = 0;
  private maxConcurrent: number = 4;
  private queue: QueueItem[] = [];
  private loadingIndices: Set<number> = new Set();

  // Poster pré-carregado
  private posterImage: HTMLImageElement | null = null;
  private isPosterLoaded: boolean = false;

  // Listeners de progresso e disponibilidade
  private onReadyCallbacks: Set<() => void> = new Set();
  private onProgressCallbacks: Set<(loaded: number, total: number) => void> = new Set();
  private onFrameLoadedCallbacks: Set<(index: number) => void> = new Set();

  constructor(manifest: FramesManifest, variant: DeviceVariant, basePath: string = '') {
    this.manifest = manifest;
    this.variant = variant;
    // Assegura caminho de base normalizado sem duplicação de barras
    const cleanBase = basePath.endsWith('/') || basePath === '' ? basePath : `${basePath}/`;
    this.basePath = cleanBase === './' ? '' : cleanBase;
    this.totalFrames = manifest.frameCount;

    this.loadPoster();
  }

  public setVariant(newVariant: DeviceVariant): void {
    if (this.variant === newVariant) return;
    this.variant = newVariant;
    this.clearCache();
    this.loadPoster();
  }

  public getVariant(): DeviceVariant {
    return this.variant;
  }

  public getTotalFrames(): number {
    return this.totalFrames;
  }

  public getAspectRatio(): number {
    const config = this.manifest[this.variant];
    return config.aspectRatio || (config.width / config.height);
  }

  private getFrameUrl(index: number): string {
    const config = this.manifest[this.variant];
    // frame_%03d.webp (index 1-based no ffmpeg)
    const padded = String(index + 1).padStart(3, '0');
    const filename = `frame_${padded}.webp`;
    return `${this.basePath}${config.folder}/${filename}`;
  }

  private getPosterUrl(): string {
    const config = this.manifest[this.variant];
    return `${this.basePath}${config.poster}`;
  }

  private loadPoster(): void {
    const img = new Image();
    img.decoding = 'async';
    img.src = this.getPosterUrl();
    img.onload = () => {
      this.posterImage = img;
      this.isPosterLoaded = true;
      this.notifyReady();
    };
  }

  public getPoster(): HTMLImageElement | null {
    return this.posterImage;
  }

  /**
   * Retorna a imagem do frame desejado se disponível no cache.
   * Caso ainda não esteja decodificada, retorna o frame carregado mais próximo
   * para evitar telas pretas, piscadas ou delays visuais.
   */
  public getFrameOrClosest(targetIndex: number): HTMLImageElement | null {
    const clamped = Math.max(0, Math.min(this.totalFrames - 1, targetIndex));

    // Se estiver em cache
    const cached = this.cache.get(clamped);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.img;
    }

    // Solicitar carregamento do alvo se ainda não estiver sendo carregado
    this.requestFrame(clamped, 0);

    // Buscar o mais próximo já carregado
    let closestIndex = -1;
    let minDiff = Infinity;

    for (const [idx] of this.cache.entries()) {
      const diff = Math.abs(idx - clamped);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    }

    if (closestIndex !== -1) {
      const fallback = this.cache.get(closestIndex);
      if (fallback) {
        fallback.lastUsed = Date.now();
        return fallback.img;
      }
    }

    // Caso nenhum frame esteja em cache ainda, retorna o poster
    return this.posterImage;
  }

  /**
   * Agenda pré-carregamento com prioridade na direção do scroll
   */
  public preloadSurrounding(currentIndex: number, direction: 'forward' | 'backward' | 'idle' = 'forward', forwardCount: number = 18, backwardCount: number = 6): void {
    const clamped = Math.max(0, Math.min(this.totalFrames - 1, currentIndex));

    // 1. O próprio frame atual (prioridade máxima)
    this.requestFrame(clamped, 0);

    if (direction === 'forward' || direction === 'idle') {
      // Prioridade nos próximos frames
      for (let i = 1; i <= forwardCount; i++) {
        const next = clamped + i;
        if (next < this.totalFrames) {
          this.requestFrame(next, i);
        }
      }
      // Menor prioridade para alguns anteriores
      for (let i = 1; i <= backwardCount; i++) {
        const prev = clamped - i;
        if (prev >= 0) {
          this.requestFrame(prev, forwardCount + i);
        }
      }
    } else {
      // Rolando para trás
      for (let i = 1; i <= forwardCount; i++) {
        const prev = clamped - i;
        if (prev >= 0) {
          this.requestFrame(prev, i);
        }
      }
      for (let i = 1; i <= backwardCount; i++) {
        const next = clamped + i;
        if (next < this.totalFrames) {
          this.requestFrame(next, forwardCount + i);
        }
      }
    }
  }

  /**
   * Inicialização progressiva: carrega primeiros quadros e marcos de referência
   */
  public startInitialLoad(): void {
    // Frames 0 a 12 (primeira dobra do scroll)
    for (let i = 0; i <= 12 && i < this.totalFrames; i++) {
      this.requestFrame(i, i);
    }

    // Marcos chave distribuídos para dar suporte a rolagem rápida
    const checkpoints = [
      Math.floor(this.totalFrames * 0.25),
      Math.floor(this.totalFrames * 0.5),
      Math.floor(this.totalFrames * 0.75),
      this.totalFrames - 1,
    ];

    checkpoints.forEach((cp, idx) => {
      if (cp < this.totalFrames) {
        this.requestFrame(cp, 20 + idx);
      }
    });
  }

  private requestFrame(index: number, priority: number): void {
    if (this.cache.has(index) || this.loadingIndices.has(index)) {
      return;
    }

    // Se já estiver na fila, atualizar prioridade se a nova for maior
    const existing = this.queue.find((q) => q.index === index);
    if (existing) {
      if (priority < existing.priority) {
        existing.priority = priority;
        this.sortQueue();
      }
      return;
    }

    this.queue.push({ index, priority });
    this.sortQueue();
    this.processQueue();
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  private processQueue(): void {
    while (this.activeRequests < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      const { index } = item;
      if (this.cache.has(index) || this.loadingIndices.has(index)) {
        continue;
      }

      this.activeRequests++;
      this.loadingIndices.add(index);

      const img = new Image();
      img.decoding = 'async';

      img.onload = () => {
        this.loadingIndices.delete(index);
        this.activeRequests--;

        this.putCache(index, img);
        this.notifyProgress();
        this.notifyFrameLoaded(index);

        if (this.cache.size >= 1) {
          this.notifyReady();
        }

        this.processQueue();
      };

      img.onerror = () => {
        this.loadingIndices.delete(index);
        this.activeRequests--;
        this.processQueue();
      };

      img.src = this.getFrameUrl(index);
    }
  }

  private putCache(index: number, img: HTMLImageElement): void {
    // Evicção LRU se exceder o limite
    if (this.cache.size >= this.maxCacheSize) {
      let oldestIndex = -1;
      let oldestTime = Infinity;

      for (const [idx, item] of this.cache.entries()) {
        if (item.lastUsed < oldestTime) {
          oldestTime = item.lastUsed;
          oldestIndex = idx;
        }
      }

      if (oldestIndex !== -1) {
        const item = this.cache.get(oldestIndex);
        if (item) {
          item.img.src = ''; // Libera recursos decodificados no navegador
        }
        this.cache.delete(oldestIndex);
      }
    }

    this.cache.set(index, { img, lastUsed: Date.now() });
  }

  public clearCache(): void {
    for (const [, item] of this.cache) {
      item.img.src = '';
    }
    this.cache.clear();
    this.queue = [];
    this.loadingIndices.clear();
  }

  public onReady(cb: () => void): () => void {
    this.onReadyCallbacks.add(cb);
    if (this.isPosterLoaded || this.cache.size > 0) {
      cb();
    }
    return () => this.onReadyCallbacks.delete(cb);
  }

  public onProgress(cb: (loaded: number, total: number) => void): () => void {
    this.onProgressCallbacks.add(cb);
    return () => this.onProgressCallbacks.delete(cb);
  }

  public onFrameLoaded(cb: (index: number) => void): () => void {
    this.onFrameLoadedCallbacks.add(cb);
    return () => this.onFrameLoadedCallbacks.delete(cb);
  }

  private notifyFrameLoaded(index: number): void {
    for (const cb of this.onFrameLoadedCallbacks) {
      try {
        cb(index);
      } catch {}
    }
  }

  private notifyReady(): void {
    for (const cb of this.onReadyCallbacks) {
      try {
        cb();
      } catch {}
    }
  }

  private notifyProgress(): void {
    for (const cb of this.onProgressCallbacks) {
      try {
        cb(this.cache.size, this.totalFrames);
      } catch {}
    }
  }

  public destroy(): void {
    this.clearCache();
    this.onReadyCallbacks.clear();
    this.onProgressCallbacks.clear();
    this.onFrameLoadedCallbacks.clear();
    this.posterImage = null;
  }
}

