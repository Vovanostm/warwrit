import { Matrix, NullEngine, Scene, Vector3, VertexBuffer } from '@babylonjs/core';
import { expect, it, vi } from 'vitest';
import { battleCameraLimits, battleFrameBounds } from './battle-framing.js';
import { CAMERA_ELEVATION, mountThreeQuarterCamera } from '../renderer/three-quarter-camera.js';
import { projectCameraPoint } from '../renderer/camera-projection.js';
import { createBattleTerrain, createBattleSurface } from '../renderer/battle-terrain.js';
import { BATTLE_LAYOUT } from './battle-layout.js';

it.each([
  [1440, 900, 192, 650],
  [1280, 800, 192, 550],
  // CSS viewport at genuine native 125%; band bounds vary with text wrapping.
  [1152, 720, 192, 445],
  [1024, 640, 192, 345],
])(
  'fits the field and edge silhouettes after actual camera clamping at %sx%s',
  (width, height, safeTop, safeBottom) => {
    const terrain = createBattleTerrain(
      Array.from({ length: 165 }, (_, i) => ({ q: i % 15, r: Math.floor(i / 15), height: i % 3 })),
      BATTLE_LAYOUT,
    );
    const reference = { targetX: 24.7, targetZ: 11.26, distance: 16 * BATTLE_LAYOUT.spacing };
    const geometryEngine = new NullEngine();
    const geometryScene = new Scene(geometryEngine);
    const field = [...terrain.values()].flatMap((cell, index) => {
      const mesh = createBattleSurface(`ground:${index}`, cell, geometryScene);
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
      const world = mesh.computeWorldMatrix(true);
      return Array.from({ length: positions.length / 3 }, (_, i) =>
        Vector3.TransformCoordinates(Vector3.FromArray(positions, i * 3), world),
      );
    });
    geometryScene.dispose();
    geometryEngine.dispose();
    // Large figure at the extreme edge, including the full weapon width/head/foot.
    const figures = [new Vector3(-4, 0, 0), new Vector3(1, 5, 5), new Vector3(51, 3, 25)];
    const projected = field.map((point) => projectCameraPoint(point, reference, CAMERA_ELEVATION));
    const projectedFigures = figures.map((point) =>
      projectCameraPoint(point, reference, CAMERA_ELEVATION),
    );
    const bounds = battleFrameBounds({
      mapBounds: {
        minX: Math.min(...projected.map((p) => p.x)),
        maxX: Math.max(...projected.map((p) => p.x)),
        minZ: Math.min(...projected.map((p) => p.z)),
        maxZ: Math.max(...projected.map((p) => p.z)),
      },
      figures: projectedFigures.map((p) => ({
        minX: p.x,
        maxX: p.x,
        bottom: p.z * Math.sin(CAMERA_ELEVATION),
        top: p.z * Math.sin(CAMERA_ELEVATION),
      })),
      width,
      height,
      safeTop,
      safeBottom,
    })!;
    const engine = new NullEngine({
      renderWidth: width,
      renderHeight: height,
      textureSize: 128,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    const scene = new Scene(engine);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const canvas = {
      addEventListener() {},
      removeEventListener() {},
      clientHeight: height,
    } as unknown as HTMLCanvasElement;
    const camera = mountThreeQuarterCamera(scene, engine, canvas, {
      ...battleCameraLimits(bounds, width, height),
      minZoom: 2.2,
      perspective: reference,
      onPick() {},
    });
    try {
      camera.fit(bounds, 0);
      scene.render();
      for (const point of [...field, ...figures]) {
        const pixel = Vector3.Project(
          point,
          Matrix.Identity(),
          scene.getTransformMatrix(),
          scene.activeCamera!.viewport.toGlobal(width, height),
        );
        expect(pixel.x).toBeGreaterThanOrEqual(16 - 0.01);
        expect(pixel.x).toBeLessThanOrEqual(width - 16 + 0.01);
        expect(pixel.y).toBeGreaterThanOrEqual(safeTop + 8 - 0.01);
        expect(pixel.y).toBeLessThanOrEqual(safeBottom - 20 + 0.01);
      }
      expect(scene.activeCamera!.orthoTop).toBeGreaterThan(17);
    } finally {
      camera.dispose();
      scene.dispose();
      engine.dispose();
      vi.unstubAllGlobals();
    }
  },
);

it('includes empty map margins and terminal battles with no standing figures', () => {
  const bounds = battleFrameBounds({
    mapBounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 20 },
    figures: [],
    width: 1440,
    height: 900,
    safeTop: 24,
    safeBottom: 876,
  })!;
  expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
  expect(bounds.minX).toBe(50);
  expect(((bounds.maxZ - bounds.minZ) * Math.sin(CAMERA_ELEVATION) * 1440) / 900).toBeGreaterThan(
    100,
  );
});

it.each([
  [1280, 800, 500, 400],
  [1280, 800, 400, 420],
  [0, 0, 0, 0],
])(
  'does not invent usable space for overlapping HUD bands',
  (width, height, safeTop, safeBottom) => {
    expect(
      battleFrameBounds({
        mapBounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 },
        figures: [],
        width,
        height,
        safeTop,
        safeBottom,
      }),
    ).toBeNull();
  },
);
