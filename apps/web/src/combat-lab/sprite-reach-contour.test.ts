import {
  Camera,
  FreeCamera,
  NullEngine,
  Scene,
  StandardMaterial,
  Vector3,
  VertexBuffer,
} from '@babylonjs/core';
import { expect, it } from 'vitest';
import { createBattleTerrain } from '../renderer/battle-terrain.js';
import { createReachContour } from './sprite-reach-contour.js';

it('owns translated reach geometry, width updates, reuse, clearing and observer disposal', async () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const camera = new FreeCamera('reach-test-camera', Vector3.Zero(), scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoTop = 4;
    scene.activeCamera = camera;
    const viewport = { clientHeight: 600 };
    const terrainByHex = createBattleTerrain([
      { q: 12, r: 7, height: 0 },
      { q: 13, r: 7, height: 0 },
    ]);
    const contour = createReachContour(
      scene,
      new StandardMaterial('reach-test', scene),
      terrainByHex,
      viewport,
    );
    const cells = [
      { q: 12, r: 7 },
      { q: 13, r: 7 },
    ];

    contour.setCells(cells);
    const mesh = contour.mesh;
    expect(mesh).not.toBeNull();
    expect(mesh!.getTotalVertices()).toBe(40);
    const firstPositions = Array.from(mesh!.getVerticesData(VertexBuffer.PositionKind)!);
    const bounds = mesh!.getBoundingInfo().boundingBox;
    expect(bounds.minimum.x).toBeGreaterThan(10);
    expect(bounds.maximum.x).toBeGreaterThan(12);
    expect(bounds.minimum.z).toBeGreaterThan(5);

    contour.setCells([...cells].reverse());
    expect(contour.mesh).toBe(mesh);

    camera.orthoTop = 8;
    scene.onBeforeRenderObservable.notifyObservers(scene);
    const zoomedPositions = Array.from(mesh!.getVerticesData(VertexBuffer.PositionKind)!);
    expect(zoomedPositions).not.toEqual(firstPositions);

    viewport.clientHeight = 300;
    scene.onBeforeRenderObservable.notifyObservers(scene);
    const resizedPositions = Array.from(mesh!.getVerticesData(VertexBuffer.PositionKind)!);
    expect(resizedPositions).not.toEqual(zoomedPositions);

    contour.setCells([]);
    expect(mesh!.isDisposed()).toBe(true);
    expect(contour.mesh).toBeNull();
    const observersBeforeDispose = scene.onBeforeRenderObservable.observers.length;
    contour.dispose();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(scene.onBeforeRenderObservable.observers).toHaveLength(observersBeforeDispose - 1);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
