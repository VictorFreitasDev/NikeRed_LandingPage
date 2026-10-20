export type DeviceVariant = 'desktop' | 'mobile';

export interface FrameVariantConfig {
  width: number;
  height: number;
  aspectRatio: number;
  folder: string;
  pattern: string;
  poster: string;
  posterFinal?: string;
}

export interface FramesManifest {
  videoSource: string;
  frameCount: number;
  fps: number;
  duration: number;
  desktop: FrameVariantConfig;
  mobile: FrameVariantConfig;
  generatedAt?: string;
}

export interface FrameLoadStatus {
  loaded: number;
  total: number;
  isInitialReady: boolean;
  isComplete: boolean;
}

