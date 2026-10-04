import { NullEngine, Scene, VertexBuffer } from '@babylonjs/core';
import { expect, it } from 'vitest';
import { MAP_TREE_PARTS } from './art.js';
import { createComponentTreeBatch, type ComponentTreePlacement } from './map-trees.js';

it('grounds complete crowns and boles on relief, retains deterministic curved volume and never intercepts map input', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  // Geometry acceptance uses original measured atlas frames without starting image I/O.
  const art = {
    trunk: { ...MAP_TREE_PARTS.trunk, url: '' },
    canopy: { ...MAP_TREE_PARTS.canopy, url: '' },
  };
  const trees: ComponentTreePlacement[] = [0, 1, 2, 3].map((template) => ({
    id: template + 11,
    template,
    species: template === 3 ? 'conifer' : 'deciduous',
    size: 0.7,
    root: { xFp: 512 * template, zFp: 1024 },
  }));
  const sceneFp = (fp: number) => fp / 1024;
  const heightAt = (x: number, z: number) => 0.2 * x + 0.3 * z;
  try {
    for (const tree of trees) {
      const flat = createComponentTreeBatch(scene, art, [tree], sceneFp, () => 0);
      const raised = createComponentTreeBatch(scene, art, [tree], sceneFp, heightAt);
      const reloaded = createComponentTreeBatch(scene, art, [tree], sceneFp, heightAt);
      for (const part of ['stems', 'canopy'] as const) {
        const baseline = flat[part].getVerticesData(VertexBuffer.PositionKind)!;
        const positions = raised[part].getVerticesData(VertexBuffer.PositionKind)!;
        expect(positions.every(Number.isFinite)).toBe(true);
        expect(reloaded[part].getVerticesData(VertexBuffer.PositionKind)).toEqual(positions);
        for (let index = 0; index < positions.length; index += 3) {
          const root = tree.root;
          expect(positions[index]).toBeCloseTo(baseline[index]!, 6);
          expect(positions[index + 2]).toBeCloseTo(baseline[index + 2]!, 6);
          expect(positions[index + 1]! - baseline[index + 1]!).toBeCloseTo(
            heightAt(sceneFp(root.xFp), sceneFp(root.zFp)),
            6,
          );
        }
        expect(raised[part].isPickable).toBe(false);
        expect(raised[part].renderingGroupId).toBe(1);
      }
      // A crown's normals vary across its surface rather than describing one flat card.
      const normals = raised.canopy.getVerticesData(VertexBuffer.NormalKind)!;
      expect(normals.every(Number.isFinite)).toBe(true);
      expect(new Set(Array.from(normals, (value) => value.toFixed(3))).size).toBeGreaterThan(10);
      raised.setNight(true);
      raised.setNight(false);
      expect(raised.canopy.getVerticesData(VertexBuffer.PositionKind)).toEqual(
        reloaded.canopy.getVerticesData(VertexBuffer.PositionKind),
      );
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
