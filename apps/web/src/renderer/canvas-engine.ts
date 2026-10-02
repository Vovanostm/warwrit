import { Engine } from '@babylonjs/core';

interface Held {
  readonly engine: Engine;
  users: number;
  disposeTimer: ReturnType<typeof setTimeout> | undefined;
}

const engines = new WeakMap<HTMLCanvasElement, Held>();

/**
 * One Babylon engine per canvas. Disposing an engine can lose the canvas's WebGL context, so a
 * quick unmount/remount (React StrictMode, a new encounter id) reuses the engine instead of
 * creating a second one on a dying context. The engine is disposed once nobody holds it.
 */
export function acquireCanvasEngine(canvas: HTMLCanvasElement): Engine {
  const held = engines.get(canvas);
  if (held && !held.engine.isDisposed) {
    if (held.disposeTimer !== undefined) clearTimeout(held.disposeTimer);
    held.disposeTimer = undefined;
    held.users += 1;
    return held.engine;
  }
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false }, true);
  engines.set(canvas, { engine, users: 1, disposeTimer: undefined });
  return engine;
}

export function releaseCanvasEngine(canvas: HTMLCanvasElement): void {
  const held = engines.get(canvas);
  if (!held) return;
  held.users -= 1;
  if (held.users > 0) return;
  held.engine.stopRenderLoop();
  held.disposeTimer = setTimeout(() => {
    if (held.users > 0) return;
    engines.delete(canvas);
    held.engine.dispose();
  }, 1000);
}
