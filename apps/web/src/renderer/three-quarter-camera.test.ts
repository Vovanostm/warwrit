import { NullEngine, PointerEventTypes, Scene, type PickingInfo } from '@babylonjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountThreeQuarterCamera } from './three-quarter-camera.js';

const originalResizeObserver = globalThis.ResizeObserver;
class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function cameraFixture(options: {
  readonly onPick?: (hit: unknown) => void;
  readonly onSecondaryPick?: (hit: unknown) => void;
  readonly onStop?: () => void;
  readonly panButtons?: readonly number[];
}) {
  globalThis.ResizeObserver = TestResizeObserver;
  const engine = new NullEngine({
    renderWidth: 400,
    renderHeight: 300,
    textureSize: 512,
    deterministicLockstep: false,
    lockstepMaxSteps: 4,
  });
  const scene = new Scene(engine);
  const keys = new Map<string, EventListener>();
  const canvas = {
    clientHeight: 300,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    tabIndex: -1,
    addEventListener: (name: string, listener: EventListener) => keys.set(name, listener),
    removeEventListener: (name: string) => keys.delete(name),
  } as unknown as HTMLCanvasElement;
  const onPick = options.onPick ?? vi.fn();
  const camera = mountThreeQuarterCamera(scene, engine, canvas, {
    minZoom: 2,
    maxZoom: 14,
    onPick,
    ...(options.onSecondaryPick
      ? { onSecondaryPick: options.onSecondaryPick as (hit: PickingInfo | null) => void }
      : {}),
    ...(options.onStop ? { onStop: options.onStop } : {}),
    ...(options.panButtons ? { panButtons: options.panButtons } : {}),
  });
  camera.fit({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, 1);
  const notifyPointer = (type: number, button: number, buttons: number, x: number, y: number) => {
    scene.onPointerObservable.notifyObservers(
      {
        type,
        event: { button, buttons, clientX: x, clientY: y, preventDefault: vi.fn() },
      } as never,
      type,
    );
  };
  const dispatchKey = (code: string, target: EventTarget) => {
    const event = { code, target, preventDefault: vi.fn() } as unknown as KeyboardEvent;
    keys.get('keydown')?.(event);
    return event;
  };
  const dispatchWheel = (deltaY: number, deltaMode = 0) => {
    const event = {
      deltaY,
      deltaMode,
      clientX: 100,
      clientY: 150,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as WheelEvent;
    keys.get('wheel')?.(event);
    return event;
  };
  return { scene, camera, canvas, engine, notifyPointer, dispatchKey, dispatchWheel, keys };
}

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

describe('three-quarter camera input options', () => {
  it('captures wheel input, eases zoom without an immediate jump and respects its delta magnitude', () => {
    const fixture = cameraFixture({});
    vi.spyOn(fixture.engine, 'getDeltaTime').mockReturnValue(16);
    const frame = () => fixture.scene.onBeforeRenderObservable.notifyObservers(fixture.scene);
    const initial = fixture.scene.activeCamera!.orthoTop!;
    try {
      const wheel = fixture.dispatchWheel(20);
      expect(wheel.preventDefault).toHaveBeenCalledOnce();
      expect(wheel.stopPropagation).toHaveBeenCalledOnce();
      expect(fixture.scene.activeCamera!.orthoTop).toBe(initial);
      frame();
      const first = fixture.scene.activeCamera!.orthoTop!;
      expect(first).toBeGreaterThan(initial);
      expect(first).toBeLessThan(initial * 1.01);
      for (let i = 0; i < 60; i += 1) frame();
      const smallDelta = fixture.scene.activeCamera!.orthoTop! - initial;
      fixture.dispatchWheel(120);
      for (let i = 0; i < 60; i += 1) frame();
      expect(fixture.scene.activeCamera!.orthoTop! - initial - smallDelta).toBeGreaterThan(
        smallDelta * 4,
      );
      fixture.dispatchWheel(10000, 2);
      for (let i = 0; i < 100; i += 1) frame();
      expect(fixture.scene.activeCamera!.orthoTop).toBeLessThanOrEqual(14);
      fixture.camera.dispose();
      expect(fixture.keys.has('wheel')).toBe(false);
    } finally {
      fixture.camera.dispose();
      fixture.scene.dispose();
      fixture.engine.dispose();
    }
  });

  it('routes map secondary clicks separately, cancels secondary drags, and maps S to stop', () => {
    const onPick = vi.fn();
    const onSecondaryPick = vi.fn();
    const onStop = vi.fn();
    const fixture = cameraFixture({ onPick, onSecondaryPick, onStop, panButtons: [0] });
    try {
      const before = fixture.scene.activeCamera!.position.clone();
      fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 2, 2, 100, 100);
      fixture.notifyPointer(PointerEventTypes.POINTERUP, 2, 0, 100, 100);
      expect(onSecondaryPick).toHaveBeenCalledTimes(1);
      expect(onPick).not.toHaveBeenCalled();

      fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 2, 2, 100, 100);
      fixture.notifyPointer(PointerEventTypes.POINTERMOVE, 2, 2, 140, 100);
      fixture.notifyPointer(PointerEventTypes.POINTERUP, 2, 0, 140, 100);
      expect(onSecondaryPick).toHaveBeenCalledTimes(1);
      expect(fixture.scene.activeCamera!.position).toEqual(before);

      const stopEvent = fixture.dispatchKey('KeyS', fixture.canvas);
      expect(stopEvent.preventDefault).toHaveBeenCalledOnce();
      expect(onStop).toHaveBeenCalledOnce();
      const textEvent = fixture.dispatchKey('KeyS', {
        tagName: 'INPUT',
        isContentEditable: false,
      } as unknown as EventTarget);
      expect(onStop).toHaveBeenCalledOnce();
      expect(textEvent.preventDefault).not.toHaveBeenCalled();
    } finally {
      fixture.camera.dispose();
      fixture.scene.dispose();
      fixture.engine.dispose();
    }
  });

  it('keeps the battle camera legacy default of panning with any mouse button', () => {
    const fixture = cameraFixture({});
    try {
      const before = fixture.scene.activeCamera!.position.clone();
      fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 2, 2, 100, 100);
      fixture.notifyPointer(PointerEventTypes.POINTERMOVE, 2, 2, 140, 100);
      expect(fixture.scene.activeCamera!.position).not.toEqual(before);
      fixture.notifyPointer(PointerEventTypes.POINTERUP, 2, 0, 140, 100);
    } finally {
      fixture.camera.dispose();
      fixture.scene.dispose();
      fixture.engine.dispose();
    }
  });
});
