// Elevation-only regression adapted from frozen #179's supplemental projection test.
import {
  NullEngine,
  Scene,
  type ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
} from '@babylonjs/core';
import { expect, it } from 'vitest';
import { mountBattleTerrain } from './battle-terrain.js';

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
      // This child deliberately retains main's 3-unit rubble width.
      expect(rubble.getBoundingInfo().boundingBox.extendSize.x * 2).toBeCloseTo(3, 6);
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
