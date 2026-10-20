import { NullEngine, type Mesh, type TransformNode } from '@babylonjs/core';
import type * as Babylon from '@babylonjs/core';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('./canvas-engine.js', () => ({
  acquireCanvasEngine: vi.fn(),
  releaseCanvasEngine: vi.fn(),
}));
vi.mock('@babylonjs/core', async (importOriginal) => {
  const actual = await importOriginal<typeof Babylon>();
  return {
    ...actual,
    // Keep real scene/mesh behavior; no raster loading or WebGL is needed for bar geometry.
    Texture: class extends actual.Texture {
      constructor(_url: string, scene: InstanceType<typeof actual.Scene>) {
        super(null, scene);
      }
      override isReady() {
        return true;
      }
    },
  };
});

import { acquireCanvasEngine } from './canvas-engine.js';
import { mountEncounterScene } from './battle-scene.js';
import type { EncounterRenderProjection } from './projection.js';

afterEach(() => vi.unstubAllGlobals());

it('uses the snapshot cap in the consumed bar across damage, remount and unknown transitions', async () => {
  const engine = new NullEngine();
  vi.mocked(acquireCanvasEngine).mockReturnValue(engine as never);
  vi.spyOn(engine, 'runRenderLoop').mockImplementation(() => {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const canvas = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement;
  const highlights = {
    ownUnitIds: ['a'],
    selectedUnitId: null,
    targetUnitId: null,
    destination: null,
  };
  const callbacks = { onPickUnit: vi.fn(), onPickHex: vi.fn() };
  const projection = (
    health: number,
    maximumHealth?: number,
    status: 'active' | 'dead' | 'retreated' = 'active',
  ): EncounterRenderProjection => ({
    encounterId: 'battle',
    revision: 1,
    status: 'active',
    round: 1,
    map: { hexes: [{ q: 0, r: 0 }], blocked: [] },
    units: [
      {
        id: 'a',
        sideId: 'ours',
        q: 0,
        r: 0,
        worldX: 0,
        worldZ: 0,
        health,
        status,
        ...(maximumHealth === undefined ? {} : { maximumHealth }),
      },
    ],
  });
  let mounted: Awaited<ReturnType<typeof mountEncounterScene>> | undefined;
  try {
    for (const initialHealth of [60, 20]) {
      mounted = await mountEncounterScene(
        canvas,
        projection(initialHealth, 60),
        highlights,
        callbacks,
      );
      const scene = engine.scenes[0]!;
      const bar = scene.getTransformNodeByName('bar:a') as TransformNode;
      const fill = scene.getMeshByName('bar-fill:a') as Mesh;
      if (initialHealth === 20) expect(fill.scaling.x).toBeCloseTo(1 / 3);
      for (const [health, cap, share] of [
        [20, 60, 1 / 3],
        [40, 60, 2 / 3],
        [20, 80, 1 / 4],
      ] as const) {
        mounted.update(projection(health, cap), highlights);
        expect(bar.isEnabled()).toBe(true);
        expect(fill.scaling.x).toBeCloseTo(share);
      }
      for (const cap of [undefined, 0, -1, NaN, Infinity, 19]) {
        mounted.update(projection(20, cap), highlights);
        expect(bar.isEnabled()).toBe(false);
        expect(Number.isFinite(fill.scaling.x)).toBe(true);
        expect(Number.isFinite(fill.position.x)).toBe(true);
      }
      mounted.update(projection(20, 60), highlights);
      expect(bar.isEnabled()).toBe(true);
      expect(fill.scaling.x).toBeCloseTo(1 / 3);
      for (const status of ['dead', 'retreated'] as const) {
        mounted.update(projection(0, 60, status), highlights);
        expect(bar.isEnabled()).toBe(false);
      }
      mounted.destroy();
      mounted = undefined;
    }
  } finally {
    mounted?.destroy();
    engine.dispose();
  }
});
