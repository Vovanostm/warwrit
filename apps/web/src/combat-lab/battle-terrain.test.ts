// Elevation-only regression adapted from frozen #179's supplemental projection test.
import {
  NullEngine,
  Ray,
  Scene,
  type ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
} from '@babylonjs/core';
import { expect, it } from 'vitest';
import { mountBattleTerrain } from './battle-terrain.js';
import { BATTLE_HEX_RADIUS, BATTLE_LAYOUT, battleHexToWorld } from './battle-layout.js';

it.each([undefined, Math.PI / 6])(
  'shares composition axes and rooted terrain art at elevation %s',
  (elevation) => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      mountBattleTerrain(
        scene,
        [
          { q: 0, r: 0, height: 1, terrain: 'plain', blocked: true },
          { q: 1, r: 0, height: 0, terrain: 'fire', blocked: false },
        ],
        false,
        {
          texture: new Texture(null, scene),
          center: Vector2.Zero(),
          size: Vector2.One(),
          reference: Vector2.One(),
          crop: new Vector4(0, 0, 1, 1),
          amount: 1,
          elevation,
        },
      );
      const expected = elevation ?? (50 * Math.PI) / 180;
      for (const name of ['rubble:0,0', 'fire-embers:1,0']) {
        const mesh = scene.getMeshByName(name)!;
        expect(mesh.rotation.x).toBeCloseTo(expected, 12);
      }
      const rubble = scene.getMeshByName('rubble:0,0')!;
      const height = rubble.getBoundingInfo().boundingBox.extendSize.y * 2;
      const root = Vector3.TransformCoordinates(
        new Vector3(0, -height * 0.3, 0),
        rubble.computeWorldMatrix(true),
      );
      expect(Vector3.Distance(root, rubble.metadata.combatFoot)).toBeLessThan(1e-5);
      expect(rubble.getBoundingInfo().boundingBox.extendSize.x * 2).toBeCloseTo(
        BATTLE_LAYOUT.spacing * (3 / 2.6),
        6,
      );
      expect(rubble.isPickable).toBe(false);
      expect(rubble.metadata.combatHex).toEqual({ q: 0, r: 0 });
      const material = scene.getMeshByName('ground:0,0')!.material as ShaderMaterial;
      const shader = material.shaderPath as { fragmentSource: string };
      const axes = [...shader.fragmentSource.matchAll(/dot\(ray,vec3\(([^)]+)\)\)/g)].map((match) =>
        match[1]!.split(',').map(Number),
      );
      expect(axes).toHaveLength(2);
      expect(axes[0]![0]).toBe(0);
      expect(axes[0]![1]).toBeCloseTo(-Math.sin(expected), 12);
      expect(axes[0]![2]).toBeCloseTo(Math.cos(expected), 12);
      expect(axes[1]![0]).toBe(0);
      expect(axes[1]![1]).toBeCloseTo(Math.cos(expected), 12);
      expect(axes[1]![2]).toBeCloseTo(Math.sin(expected), 12);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  },
);

it('registers all 165 cells, joined relief, real rays and rubble on the catalogue layout', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const tiles = Array.from({ length: 165 }, (_, i) => ({
      q: i % 15,
      r: Math.floor(i / 15),
      height: (i % 3) as 0 | 1 | 2,
      terrain: 'plain' as const,
      blocked: i === 16,
    }));
    const terrain = mountBattleTerrain(scene, tiles, false);
    terrain.setNight(true);
    terrain.setNight(false);
    expect(terrain.terrainByHex.size).toBe(165);
    const shared = new Map<string, Vector3>();
    terrain.apron.computeWorldMatrix(true);
    const apron = terrain.apron.getBoundingInfo().boundingBox;
    for (const tile of tiles) {
      const point = battleHexToWorld(tile);
      const cell = terrain.terrainByHex.get(`${tile.q},${tile.r}`)!;
      expect(cell.centre.asArray()).toEqual([
        point.x,
        tile.height * BATTLE_LAYOUT.heightStep,
        point.z,
      ]);
      for (const corner of cell.corners) {
        expect(Math.hypot(corner.x - point.x, corner.z - point.z)).toBeCloseTo(
          BATTLE_HEX_RADIUS,
          7,
        );
        const key = `${corner.x.toFixed(5)},${corner.z.toFixed(5)}`;
        if (shared.has(key)) expect(corner.y).toBe(shared.get(key)!.y);
        shared.set(key, corner);
        expect(corner.x).toBeGreaterThan(apron.minimumWorld.x);
        expect(corner.x).toBeLessThan(apron.maximumWorld.x);
        expect(corner.z).toBeGreaterThan(apron.minimumWorld.z);
        expect(corner.z).toBeLessThan(apron.maximumWorld.z);
      }
      const mesh = scene.getMeshByName(`ground:${tile.q},${tile.r}`)!;
      const hit = scene.pickWithRay(
        new Ray(new Vector3(point.x, 10, point.z), Vector3.Down()),
        (m) => m === mesh,
      )!;
      expect(hit.hit).toBe(true);
      expect(hit.pickedPoint!.y).toBeCloseTo(cell.centre.y, 6);
      expect(hit.pickedMesh!.metadata.combatHex).toEqual({ q: tile.q, r: tile.r });
    }
    expect(scene.getMeshByName('rubble:1,1')!.metadata.combatFoot.asArray()).toEqual(
      terrain.terrainByHex.get('1,1')!.centre.asArray(),
    );
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
