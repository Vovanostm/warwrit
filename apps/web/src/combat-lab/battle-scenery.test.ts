// Reused from frozen #179's supplemental projection regression; no source copied.
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { expect, it } from 'vitest';
import { mountBattleScenery } from './battle-scenery.js';

it.each([undefined, Math.PI / 6])(
  'grounds scenery in its explicit or legacy projection (%s)',
  (elevation) => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const scenery = mountBattleScenery(
        scene,
        [
          { q: 0, r: 0 },
          { q: 14, r: 10 },
        ],
        elevation,
      );
      scenery.setNight(true);
      scenery.setNight(false);
      const meshes = scene.meshes.filter((mesh) => mesh.name.startsWith('yard-fringe:'));
      expect(meshes).toHaveLength(6);
      for (const mesh of meshes) {
        expect(mesh.rotation.x).toBeCloseTo(elevation ?? (50 * Math.PI) / 180, 12);
        const height = mesh.getBoundingInfo().boundingBox.extendSize.y * 2;
        const root = Vector3.TransformCoordinates(
          new Vector3(0, -height * 0.3, 0),
          mesh.computeWorldMatrix(true),
        );
        expect(Vector3.Distance(root, mesh.metadata.combatFoot)).toBeLessThan(1e-5);
        expect(mesh.isPickable).toBe(false);
      }
    } finally {
      scene.dispose();
      engine.dispose();
    }
  },
);
