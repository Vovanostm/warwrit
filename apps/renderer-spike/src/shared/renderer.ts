import type { MetricsCollector } from './metrics.js';

export type SceneEvent =
  | { type: 'assets-ready' }
  | { type: 'hover'; actorId: string | null }
  | { type: 'select'; actorId: string }
  | { type: 'cell'; q: number; r: number }
  | { type: 'status'; message: string }
  | { type: 'lighting'; preset: 'day' | 'night' | 'torch'; mode: 'scripted' | 'manual' }
  | { type: 'error'; message: string };

export type RendererController = {
  setLighting: (preset: 'day' | 'night' | 'torch') => void;
  resumeLightingScript: () => void;
  setSelection: (actorId: string | null) => void;
  setPreview: (mode: 'none' | 'move' | 'attack') => void;
  triggerAttack: () => void;
  resetTimeline: () => void;
  resize: () => void;
  destroy: () => void;
};

export type RendererMount = (
  canvas: HTMLCanvasElement,
  emit: (event: SceneEvent) => void,
  metrics: MetricsCollector,
  signal?: AbortSignal,
) => Promise<RendererController>;
