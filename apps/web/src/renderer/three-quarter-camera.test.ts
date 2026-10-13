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
  const windowEvents = new Map<string, EventListener>();
  const documentEvents = new Map<string, EventListener>();
  const ownerDocument = {
    hidden: false,
    addEventListener: (name: string, listener: EventListener) => documentEvents.set(name, listener),
    removeEventListener: (name: string) => documentEvents.delete(name),
    defaultView: {
      addEventListener: (name: string, listener: EventListener) => windowEvents.set(name, listener),
      removeEventListener: (name: string) => windowEvents.delete(name),
    },
  };
  const captured = new Set<number>();
  const canvas = {
    ownerDocument,
    focus: vi.fn(),
    setPointerCapture: (id: number) => captured.add(id),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => captured.delete(id),
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
        event: { pointerId: 1, button, buttons, clientX: x, clientY: y, preventDefault: vi.fn() },
      } as never,
      type,
    );
  };
  const dispatchKey = (
    code: string,
    target: EventTarget = canvas,
    type = 'keydown',
    modifiers: Partial<KeyboardEvent> = {},
  ) => {
    const event = {
      code,
      target,
      preventDefault: vi.fn(),
      ...modifiers,
    } as unknown as KeyboardEvent;
    keys.get(type)?.(event);
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
  const frame = () => scene.onBeforeRenderObservable.notifyObservers(scene);
  const projectOrigin = () => {
    scene.render();
    return Vector3.Project(
      Vector3.Zero(),
      Matrix.Identity(),
      scene.getTransformMatrix(),
      scene.activeCamera!.viewport.toGlobal(400, 300),
    );
  };
  const dispose = () => {
    camera.dispose();
    scene.dispose();
    engine.dispose();
  };
  return {
    scene,
    camera,
    canvas,
    engine,
    notifyPointer,
    dispatchKey,
    dispatchWheel,
    keys,
    windowEvents,
    documentEvents,
    ownerDocument,
    captured,
    frame,
    projectOrigin,
    dispose,
  };
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

  it('moves for the held duration independent of key repeat/frame rate, and stops on release', () => {
    const durations = [20, 40, 100];
    const fixtures = durations.map(() => cameraFixture({}));
    try {
      const movements = fixtures.map((fixture, index) => {
        vi.spyOn(fixture.engine, 'getDeltaTime').mockReturnValue(durations[index]!);
        const start = fixture.projectOrigin();
        fixture.dispatchKey('KeyD');
        expect(fixture.projectOrigin().x).toBeLessThan(start.x);
        for (let i = 0; i < 1000 / durations[index]! - 1; i++) {
          if (index === 0) fixture.dispatchKey('KeyD', fixture.canvas, 'keydown', { repeat: true });
          fixture.frame();
        }
        fixture.dispatchKey('KeyD', fixture.canvas, 'keyup');
        const end = fixture.projectOrigin();
        for (let i = 0; i < 10; i++) fixture.frame();
        expect(fixture.projectOrigin().x).toBeCloseTo(end.x, 8);
        return end.x - start.x;
      });
      expect(movements[0]).toBeCloseTo(movements[1]!, 8);
      expect(movements[0]).toBeCloseTo(movements[2]!, 8);
    } finally {
      fixtures.forEach((fixture) => fixture.dispose());
    }
  });

  it('pans in screen directions with equal straight/diagonal speed on rotated cameras', () => {
    const fixture = cameraFixture({ azimuth: Math.PI / 4, elevation: Math.atan(Math.sqrt(0.5)) });
    vi.spyOn(fixture.engine, 'getDeltaTime').mockReturnValue(16);
    const travel = (codes: string[]) => {
      const before = fixture.projectOrigin();
      codes.forEach((code) => fixture.dispatchKey(code));
      for (let i = 0; i < 20; i++) fixture.frame();
      codes.forEach((code) => fixture.dispatchKey(code, fixture.canvas, 'keyup'));
      return fixture.projectOrigin().subtract(before);
    };
    try {
      const right = travel(['KeyD']);
      const up = travel(['KeyW']);
      const down = travel(['KeyS']);
      const diagonal = travel(['KeyW', 'KeyD']);
      const opposite = travel(['KeyA', 'KeyD']);
      expect(right.x).toBeLessThan(0);
      expect(right.y).toBeCloseTo(0, 4);
      expect(up.y).toBeGreaterThan(0);
      expect(up.x).toBeCloseTo(0, 4);
      expect(down.y).toBeCloseTo(-up.y, 4);
      expect(Math.hypot(up.x, up.y)).toBeCloseTo(Math.hypot(right.x, right.y), 4);
      expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(Math.hypot(right.x, right.y), 4);
      expect(opposite.length()).toBeLessThan(0.0001);
    } finally {
      fixture.dispose();
    }
  });

  it('combines held keys, dragging and wheel zoom without snapping or selecting', () => {
    const onPick = vi.fn();
    const fixture = cameraFixture({ onPick, panButtons: [0, 1] });
    vi.spyOn(fixture.engine, 'getDeltaTime').mockReturnValue(16);
    try {
      fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 0, 1, 300, 150);
      fixture.notifyPointer(PointerEventTypes.POINTERMOVE, 0, 1, 310, 150);
      fixture.dispatchKey('KeyD');
      fixture.frame();
      const zoom = fixture.scene.activeCamera!.orthoTop!;
      const before = fixture.scene.activeCamera!.position.clone();
      fixture.dispatchWheel(-120, 0, 300, 150);
      for (let i = 0; i < 20; i++) {
        fixture.dispatchKey('KeyD', fixture.canvas, 'keydown', { repeat: true });
        fixture.frame();
      }
      expect(fixture.scene.activeCamera!.orthoTop!).toBeLessThan(zoom);
      expect(fixture.scene.activeCamera!.position.x).toBeGreaterThan(before.x);
      const held = fixture.scene.activeCamera!.position.clone();
      fixture.notifyPointer(PointerEventTypes.POINTERMOVE, 0, 1, 310, 150);
      expect(fixture.scene.activeCamera!.position).toEqual(held);
      fixture.notifyPointer(PointerEventTypes.POINTERUP, 0, 0, 310, 150);
      expect(onPick).not.toHaveBeenCalled();
      fixture.dispatchKey('KeyD', fixture.canvas, 'keyup');
      for (let i = 0; i < 80; i++) fixture.frame();
      const settled = fixture.scene.activeCamera!.position.clone();
      for (let i = 0; i < 10; i++) fixture.frame();
      expect(fixture.scene.activeCamera!.position.subtract(settled).length()).toBeLessThan(0.0001);
    } finally {
      fixture.dispose();
    }
  });

  it.each(['canvas', 'window', 'hidden', 'dispose'] as const)(
    'clears held navigation and pointer capture on %s and ignores editing/browser shortcuts',
    (boundary) => {
      const fixture = cameraFixture({});
      vi.spyOn(fixture.engine, 'getDeltaTime').mockReturnValue(16);
      try {
        const start = fixture.scene.activeCamera!.position.clone();
        for (const target of [
          { tagName: 'INPUT' },
          { tagName: 'TEXTAREA' },
          { tagName: 'SELECT' },
          { isContentEditable: true },
        ])
          fixture.dispatchKey('KeyW', target as unknown as EventTarget);
        fixture.dispatchKey('KeyW', fixture.canvas, 'keydown', { ctrlKey: true });
        fixture.frame();
        expect(fixture.scene.activeCamera!.position).toEqual(start);
        fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 0, 1, 100, 100);
        expect(fixture.canvas.focus).toHaveBeenCalled();
        expect(fixture.captured.has(1)).toBe(true);
        fixture.dispatchKey('ArrowDown');
        fixture.frame();
        const end = fixture.scene.activeCamera!.position.clone();
        expect(end).not.toEqual(start);
        if (boundary === 'canvas') fixture.keys.get('blur')?.({} as Event);
        if (boundary === 'window') fixture.windowEvents.get('blur')?.({} as Event);
        if (boundary === 'hidden') {
          fixture.ownerDocument.hidden = true;
          fixture.documentEvents.get('visibilitychange')?.({} as Event);
        }
        if (boundary === 'dispose') fixture.camera.dispose();
        fixture.frame();
        expect(fixture.scene.activeCamera!.position).toEqual(end);
        expect(fixture.captured.size).toBe(0);
        if (boundary === 'dispose') {
          expect(fixture.keys.has('keyup')).toBe(false);
          expect(fixture.windowEvents.size).toBe(0);
          expect(fixture.documentEvents.size).toBe(0);
        }
      } finally {
        fixture.dispose();
      }
    },
  );

  it('keeps a left click for inspection, suppresses drag selection/orders, and cancels a lost press', () => {
    const onPick = vi.fn();
    const onSecondaryPick = vi.fn();
    const fixture = cameraFixture({ onPick, onSecondaryPick, panButtons: [0, 1] });
    try {
      fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 0, 1, 100, 100);
      fixture.notifyPointer(PointerEventTypes.POINTERUP, 0, 0, 101, 100);
      expect(onPick).toHaveBeenCalledOnce();
      const before = fixture.scene.activeCamera!.position.clone();
      fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 0, 1, 100, 100);
      fixture.notifyPointer(PointerEventTypes.POINTERMOVE, 0, 1, 140, 120);
      expect(fixture.scene.activeCamera!.position).not.toEqual(before);
      fixture.notifyPointer(PointerEventTypes.POINTERUP, 0, 0, 140, 120);
      expect(onPick).toHaveBeenCalledOnce();
      expect(onSecondaryPick).not.toHaveBeenCalled();
      expect(fixture.captured.size).toBe(0);
      fixture.notifyPointer(PointerEventTypes.POINTERDOWN, 0, 1, 100, 100);
      fixture.keys.get('pointercancel')?.({} as Event);
      fixture.notifyPointer(PointerEventTypes.POINTERUP, 0, 0, 100, 100);
      expect(onPick).toHaveBeenCalledOnce();
    } finally {
      fixture.dispose();
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
