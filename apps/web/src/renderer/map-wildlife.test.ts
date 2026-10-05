import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { expect, it } from 'vitest';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { createMapWildlife } from './map-wildlife.js';
import { createMapLife } from './map-life.js';

const rectangle = (left: number, right: number, top: number, bottom: number) => [
  { xFp: left, zFp: top },
  { xFp: right, zFp: top },
  { xFp: right, zFp: bottom },
  { xFp: left, zFp: bottom },
];

it('keeps animated fauna clear of thin roads, water and blockers, grounded on relief and unable to capture input', () => {
  const region: WorldContinuousMapDto = {
    mapEdition: 'wildlife-fixture',
    origin: { xFp: 0, zFp: 0 },
    worldScale: 3,
    columns: 64,
    rows: 64,
    cellSizeFp: 64,
    boundary: rectangle(0, 4096, 0, 4096),
    terrainShapes: [
      {
        shapeId: 'water',
        terrainId: 'deep_water',
        paintPriority: 1,
        polygon: rectangle(3500, 4096, 0, 4096),
      },
    ],
    overlayShapes: [
      { shapeId: 'thin-road', overlayId: 'trail', polygon: rectangle(1800, 1820, 0, 4096) },
    ],
    blockingShapes: [{ shapeId: 'wall', polygon: rectangle(200, 500, 2300, 2700) }],
    dangerAreaShapes: [],
    sites: [],
  };
  const saved = JSON.stringify(region);
  const engine = new NullEngine(),
    scene = new Scene(engine);
  const heightAt = (x: number, z: number) => 0.03 * x + 0.05 * z;
  try {
    const wildlife = createMapWildlife(scene, region, heightAt, '', {
      flowers: createMapLife(scene, region, heightAt).flowers,
      trees: [],
    });
    const animals = scene.meshes.filter((mesh) => /^map-(hare|butterfly):/.test(mesh.name));
    expect(animals.some((mesh) => mesh.name.startsWith('map-hare:'))).toBe(true);
    expect(animals.some((mesh) => mesh.name.startsWith('map-butterfly:'))).toBe(true);
    const positions = new Set<string>();
    for (let time = 0; time < 32; time += 0.2) {
      wildlife.update(time);
      for (const mesh of animals) {
        const x = (mesh.position.x * 1024) / 3,
          z = (mesh.position.z * 1024) / 3;
        expect(mesh.isPickable).toBe(false);
        expect(mesh.position.y).toBeGreaterThanOrEqual(heightAt(mesh.position.x, mesh.position.z));
        expect(x).toBeGreaterThan(30);
        expect(x).toBeLessThan(3500 - 30);
        expect(z).toBeGreaterThan(30);
        expect(z).toBeLessThan(4096 - 30);
        expect(x < 1770 || x > 1850).toBe(true);
        expect(x < 170 || x > 530 || z < 2270 || z > 2730).toBe(true);
        positions.add(mesh.position.toString());
      }
    }
    expect(positions.size).toBeGreaterThan(animals.length * 3);
    wildlife.setNight(true);
    for (const mesh of animals) expect(mesh.isEnabled()).toBe(mesh.name.startsWith('map-hare:'));
    wildlife.setNight(false);
    expect(animals.every((mesh) => mesh.isEnabled())).toBe(true);
    expect(JSON.stringify(region)).toBe(saved);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('flies head first through turns, limits butterfly density and keeps frogs on wet land at night', () => {
  const region: WorldContinuousMapDto = {
    mapEdition: 'wildlife-facing-fixture',
    origin: { xFp: 0, zFp: 0 },
    worldScale: 3,
    columns: 384,
    rows: 384,
    cellSizeFp: 64,
    boundary: rectangle(0, 24576, 0, 24576),
    terrainShapes: [
      {
        shapeId: 'marsh',
        terrainId: 'marsh',
        paintPriority: 1,
        polygon: rectangle(8000, 12000, 4000, 12000),
      },
      {
        shapeId: 'river',
        terrainId: 'deep_water',
        paintPriority: 2,
        polygon: rectangle(23000, 24576, 0, 24576),
      },
    ],
    overlayShapes: [],
    blockingShapes: [],
    dangerAreaShapes: [],
    sites: [],
  };
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    const wildlife = createMapWildlife(scene, region, () => 0, '', {
      flowers: createMapLife(scene, region, () => 0).flowers,
      trees: [],
    });
    const butterflies = scene.meshes.filter((mesh) => mesh.name.startsWith('map-butterfly:'));
    const birds = scene.meshes.filter((mesh) => mesh.name.startsWith('map-bird:'));
    const frogs = scene.meshes.filter((mesh) => mesh.name.startsWith('map-frog:'));
    expect(butterflies.length).toBeGreaterThan(0);
    expect(butterflies.length).toBeLessThanOrEqual(24);
    expect(birds.length).toBeGreaterThan(0);
    expect(frogs.length).toBeGreaterThan(0);
    for (let time = 0; time < 12; time += 0.4) {
      wildlife.update(time - 0.0001);
      const before = [...butterflies, ...birds].map((mesh) => mesh.position.clone());
      wildlife.update(time + 0.0001);
      const after = [...butterflies, ...birds].map((mesh) => mesh.position.clone());
      wildlife.update(time);
      for (const [index, mesh] of [...butterflies, ...birds].entries()) {
        const velocity = after[index]!.subtract(before[index]!);
        velocity.y = 0;
        velocity.normalize();
        const head = Vector3.TransformNormal(
          new Vector3(0, 0, -1),
          mesh.computeWorldMatrix(true),
        ).normalize();
        expect(Vector3.Dot(head, velocity)).toBeGreaterThan(0.99);
        expect(mesh.isPickable).toBe(false);
      }
      for (const frog of frogs) {
        const x = (frog.position.x * 1024) / 3,
          z = (frog.position.z * 1024) / 3;
        expect((x > 8000 && x < 12000 && z > 4000 && z < 12000) || (x > 22400 && x < 23000)).toBe(
          true,
        );
        expect(frog.position.y).toBeGreaterThanOrEqual(0);
        expect(frog.isPickable).toBe(false);
      }
    }
    wildlife.setNight(true);
    expect([...butterflies, ...birds].every((mesh) => !mesh.isEnabled())).toBe(true);
    expect(frogs.every((mesh) => mesh.isEnabled())).toBe(true);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('respects the painted biome priority, actual flowers and quiet pinewood, and reacts without leaving safe ground', async () => {
  const { generateForest } = await import('./map-forest.js');
  const { TREE_FORMS } = await import('./map-tree-forms.js');
  const { insidePolygon } = await import('./map-geography.js');
  const region: WorldContinuousMapDto = {
    mapEdition: 'biome-overlap-fixture',
    origin: { xFp: 0, zFp: 0 },
    worldScale: 3,
    columns: 384,
    rows: 384,
    cellSizeFp: 64,
    boundary: rectangle(0, 24576, 0, 24576),
    terrainShapes: [
      {
        shapeId: 'field-base',
        terrainId: 'grassland',
        paintPriority: 0,
        polygon: rectangle(0, 24576, 0, 24576),
      },
      {
        shapeId: 'woodland',
        terrainId: 'forest',
        paintPriority: 1,
        polygon: rectangle(6000, 10000, 0, 24576),
      },
      {
        shapeId: 'eastern-pinewood',
        terrainId: 'forest',
        paintPriority: 1,
        polygon: rectangle(13000, 18000, 0, 24576),
      },
      {
        shapeId: 'marsh',
        terrainId: 'marsh',
        paintPriority: 2,
        polygon: rectangle(1000, 5000, 8000, 20000),
      },
      {
        shapeId: 'ridge',
        terrainId: 'rock',
        paintPriority: 2,
        polygon: rectangle(20000, 22000, 0, 24576),
      },
    ],
    overlayShapes: [],
    blockingShapes: [],
    dangerAreaShapes: [],
    sites: [],
  };
  const engine = new NullEngine(),
    scene = new Scene(engine);
  const scale = (region.worldScale ?? 1) / 1024;
  const terrain = [...region.terrainShapes].sort((a, b) => b.paintPriority - a.paintPriority);
  try {
    const flowers = createMapLife(scene, region, () => 0).flowers;
    const wildlife = createMapWildlife(scene, region, () => 0, '', {
      flowers,
      trees: generateForest(region, TREE_FORMS),
    });
    const fauna = scene.meshes.filter((mesh) => /^map-(hare|butterfly|bird|frog):/.test(mesh.name));
    wildlife.update(10);
    expect(fauna.some((mesh) => mesh.name.startsWith('map-butterfly:'))).toBe(true);
    expect(fauna.some((mesh) => mesh.name.startsWith('map-frog:'))).toBe(true);
    for (let time = 10; time < 45; time += 0.3) {
      wildlife.update(time);
      for (const mesh of fauna) {
        const x = mesh.position.x / scale,
          z = mesh.position.z / scale;
        const land = terrain.find((shape) => insidePolygon(x, z, shape.polygon));
        if (mesh.name.startsWith('map-butterfly:')) {
          expect(['grassland', 'hills']).toContain(land?.terrainId);
          expect(flowers.some((flower) => Math.hypot(flower.xFp - x, flower.zFp - z) < 300)).toBe(
            true,
          );
        }
        if (mesh.name.startsWith('map-hare:')) {
          expect(land?.shapeId).not.toBe('eastern-pinewood');
          expect(['grassland', 'hills', 'forest']).toContain(land?.terrainId);
        }
        if (mesh.name.startsWith('map-frog:'))
          expect(['marsh', 'riverbank']).toContain(land?.terrainId);
      }
    }
    const hare = fauna.find((mesh) => mesh.name.startsWith('map-hare:'))!;
    const bird = fauna.find((mesh) => mesh.name.startsWith('map-bird:'))!;
    wildlife.update(46);
    const before = hare.position.clone();
    const birdY = bird.position.y;
    const company = { x: before.x + 0.01, z: before.z };
    wildlife.update(46.001, company);
    expect(Math.abs(hare.position.x - before.x)).toBeLessThan(0.01);
    wildlife.update(47.4, company);
    expect(hare.position.x).toBeLessThan(before.x);
    wildlife.update(50, { x: bird.position.x, z: bird.position.z });
    wildlife.update(51, { x: bird.position.x, z: bird.position.z });
    expect(bird.position.y).toBeGreaterThan(birdY + 0.1);
    wildlife.setNight(true);
    wildlife.update(51.1, company);
    expect(bird.isEnabled()).toBe(false);
    expect(
      fauna
        .filter((mesh) => mesh.name.startsWith('map-butterfly:'))
        .every((mesh) => !mesh.isEnabled()),
    ).toBe(true);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
