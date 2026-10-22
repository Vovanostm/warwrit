import { NullEngine, Ray, Scene, Vector3 } from '@babylonjs/core';
import { expect, it } from 'vitest';
import { mountBattleTerrain } from './battle-terrain.js';
import { BATTLE_HEX_RADIUS, BATTLE_LAYOUT, battleHexToWorld } from './battle-layout.js';

it('registers shared relief, actual surface picking and cell-relative rubble on the same layout', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const tiles = [
      { q: 0, r: 0, height: 0, terrain: 'plain', blocked: false },
      { q: 1, r: 0, height: 1, terrain: 'plain', blocked: false },
      { q: 0, r: 1, height: 2, terrain: 'plain', blocked: true },
    ] as const;
    const terrain = mountBattleTerrain(scene, tiles, false);
    terrain.setNight(true);
    terrain.setNight(false);
    for (const tile of tiles) {
      const cell = terrain.terrainByHex.get(`${tile.q},${tile.r}`)!;
      const point = battleHexToWorld(tile);
      expect(cell.centre.asArray()).toEqual([
        point.x,
        tile.height * BATTLE_LAYOUT.heightStep,
        point.z,
      ]);
      for (const corner of cell.corners)
        expect(Math.hypot(corner.x - point.x, corner.z - point.z)).toBeCloseTo(
          BATTLE_HEX_RADIUS,
          7,
        );
      const mesh = scene.getMeshByName(`ground:${tile.q},${tile.r}`)!;
      mesh.computeWorldMatrix(true);
      const hit = scene.pickWithRay(
        new Ray(new Vector3(point.x, 10, point.z), Vector3.Down()),
        (m) => m === mesh,
      )!;
      expect(hit.hit).toBe(true);
      expect(hit.pickedPoint!.y).toBeCloseTo(cell.centre.y, 6);
      expect(hit.pickedMesh!.metadata.combatHex).toEqual({ q: tile.q, r: tile.r });
      expect(terrain.apron.getBoundingInfo().boundingBox.minimumWorld.x).toBeLessThan(
        point.x - BATTLE_HEX_RADIUS,
      );
    }
    const rubble = scene.getMeshByName('rubble:0,1')!;
    expect(rubble.getBoundingInfo().boundingBox.extendSize.x * 2).toBeCloseTo(
      (BATTLE_LAYOUT.spacing * 3) / 2.6,
      6,
    );
    expect(rubble.isPickable).toBe(false);
    expect(rubble.metadata.combatFoot.asArray()).toEqual(
      terrain.terrainByHex.get('0,1')!.centre.asArray(),
    );
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
