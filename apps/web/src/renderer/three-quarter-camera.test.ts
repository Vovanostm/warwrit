import {
  Matrix,
  MeshBuilder,
  NullEngine,
  PointerEventTypes,
  Scene,
  Vector3,
  type PickingInfo,
} from '@babylonjs/core';
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
  readonly dpr?: number;
  readonly elevation?: number;
  readonly azimuth?: number;
  readonly pickGround?: (x: number, y: number) => { x: number; y: number; z: number } | null;
}) {
  globalThis.ResizeObserver = TestResizeObserver;
  const engine = new NullEngine({
    renderWidth: 400 * (options.dpr ?? 1),
    renderHeight: 300 * (options.dpr ?? 1),
    textureSize: 512,
    deterministicLockstep: false,
    lockstepMaxSteps: 4,
  });
  vi.spyOn(engine, 'getHardwareScalingLevel').mockReturnValue(1 / (options.dpr ?? 1));
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
    ...(options.elevation !== undefined ? { elevation: options.elevation } : {}),
    ...(options.azimuth !== undefined ? { azimuth: options.azimuth } : {}),
    ...(options.pickGround ? { pickGround: options.pickGround } : {}),
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
  const dispatchWheel = (deltaY: number, deltaMode = 0, x = 100, y = 150) => {
    const event = {
      deltaY,
      deltaMode,
      clientX: x,
      clientY: y,
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

  it.each([1, 2])('anchors actual raised-ground picks to the wheel cursor at DPR%s', (dpr) => {
    const point = new Vector3(-1.1, 1.2, 0.35);
    const fixture = cameraFixture({
      dpr,
      elevation: Math.atan(Math.sqrt(0.5)),
      azimuth: Math.PI / 4,
      pickGround: (x, y) => fixture.scene.pick(x, y, (m) => m === ground)?.pickedPoint ?? null,
    });
    const ground = MeshBuilder.CreateGround(
      'raised-ground',
      { width: 20, height: 20 },
      fixture.scene,
    );
    ground.position.y = point.y;
    vi.spyOn(fixture.engine, 'getDeltaTime').mockReturnValue(16);
    const project = () => {
      fixture.scene.render();
      return Vector3.Project(
        point,
        Matrix.Identity(),
        fixture.scene.getTransformMatrix(),
        fixture.scene.activeCamera!.viewport.toGlobal(400 * dpr, 300 * dpr),
      ).scale(1 / dpr);
    };
    try {
      const before = project();
      expect(
        fixture.scene
          .pick(before.x, before.y, (m) => m === ground)!
          .pickedPoint!.subtract(point)
          .length(),
      ).toBeLessThan(0.0001);
      for (const delta of [-240, 180, -90, 240]) {
        fixture.dispatchWheel(delta, 0, before.x, before.y);
        for (let i = 0; i < 80; i++)
          fixture.scene.onBeforeRenderObservable.notifyObservers(fixture.scene);
        const after = project();
        expect(after.x).toBeCloseTo(before.x, 3);
        expect(after.y).toBeCloseTo(before.y, 3);
      }
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
