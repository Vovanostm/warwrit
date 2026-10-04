import { NullEngine, Scene, VertexBuffer } from '@babylonjs/core';
import { expect, it } from 'vitest';
import { MAP_TREE_PARTS } from './art.js';
import { TREE_FORMS } from './map-tree-forms.js';
import { createComponentTreeBatch, type ComponentTreePlacement } from './map-trees.js';

it('grounds complete crowns and boles on relief, retains deterministic curved volume and never intercepts map input', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  // Geometry acceptance uses original measured atlas frames without starting image I/O.
  const art = {
    trunk: { ...MAP_TREE_PARTS.trunk, url: '' },
    canopy: { ...MAP_TREE_PARTS.canopy, url: '' },
  };
  const trees: ComponentTreePlacement[] = TREE_FORMS.map((form, template) => ({
    id: template + 11,
    template,
    species: form.species,
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
      // The measured painted root, rather than the atlas rectangle's bottom, stays grounded.
      const stem = raised.stems.getVerticesData(VertexBuffer.PositionKind)!;
      const pivot = MAP_TREE_PARTS.trunk.frames[TREE_FORMS[tree.template]!.trunkFrame]!.pivot;
      const root = [0, 1, 2].map(
        (axis) =>
          stem[axis]! +
          pivot.x * (stem[3 + axis]! - stem[axis]!) +
          pivot.y * (stem[6 + axis]! - stem[axis]!),
      );
      expect(root[0]).toBeCloseTo(sceneFp(tree.root.xFp), 6);
      expect(root[1]).toBeCloseTo(
        heightAt(sceneFp(tree.root.xFp), sceneFp(tree.root.zFp)) + 0.018,
        6,
      );
      expect(root[2]).toBeCloseTo(sceneFp(tree.root.zFp), 6);
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

it('retains different crown arrangements instead of fourteen scaled copies of one body', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  const art = {
    trunk: { ...MAP_TREE_PARTS.trunk, url: '' },
    canopy: { ...MAP_TREE_PARTS.canopy, url: '' },
  };
  try {
    for (const species of ['deciduous', 'conifer'] as const) {
      const signatures = new Set<string>();
      for (const [template, form] of TREE_FORMS.entries()) {
        if (form.species !== species) continue;
        // Identical root/seed/size isolate the authored form from incidental random variation.
        const batch = createComponentTreeBatch(
          scene,
          art,
          [{ id: 11, template, species, size: 1, root: { xFp: 0, zFp: 0 } }],
          (fp) => fp / 1024,
          () => 0,
        );
        const positions = batch.canopy.getVerticesData(VertexBuffer.PositionKind)!;
        const extent = Math.max(...Array.from(positions, Math.abs));
        const signature = Array.from(positions, (value) => (value / extent).toFixed(5)).join(',');
        expect(signatures.has(signature), `${form.id} repeats another uniformly scaled crown`).toBe(
          false,
        );
        signatures.add(signature);
        expect(form.canopy.some((mass) => !mass.recessed)).toBe(true);
        expect(form.canopy.some((mass) => mass.recessed)).toBe(true);
      }
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
