import { expect, it } from 'vitest';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { generateForest } from './map-forest.js';
import { TREE_FORMS } from './map-tree-forms.js';

const rect = (x: number, z: number, width: number, depth: number) => [
  { xFp: x, zFp: z },
  { xFp: x + width, zFp: z },
  { xFp: x + width, zFp: z + depth },
  { xFp: x, zFp: z + depth },
];
const boundary = rect(-3000, -3000, 6000, 6000);
const region: WorldContinuousMapDto = {
  mapEdition: 'forest-fixture',
  origin: boundary[0]!,
  columns: 100,
  rows: 100,
  cellSizeFp: 60,
  boundary,
  terrainShapes: [
    { shapeId: 'eastern-pinewood', terrainId: 'forest', paintPriority: 1, polygon: boundary },
  ],
  overlayShapes: [{ shapeId: 'road', overlayId: 'trail', polygon: rect(-3000, -80, 6000, 160) }],
  blockingShapes: [{ shapeId: 'cliff', polygon: rect(1000, 1000, 700, 700) }],
  sites: [{ siteId: 'town', areaId: 'town', anchorFp: { xFp: -1500, zFp: 1500 } }],
  dangerAreaShapes: [],
};
const variants = TREE_FORMS;
it('regenerates the same bounded forest without mutating public geography', () => {
  const before = structuredClone(region);
  const first = generateForest(region, variants);
  expect(first.length).toBeGreaterThan(150);
  expect(first.length).toBeLessThanOrEqual(1600);
  expect(generateForest(region, variants)).toEqual(first);
  expect(region).toEqual(before);
  expect(generateForest({ ...region, mapEdition: 'other' }, variants)).not.toEqual(first);
  expect(generateForest(region, [])).toEqual([]);
});
it('keeps actual road banks, site entrances, blockers and distinct roots clear', () => {
  const trees = generateForest(region, variants);
  for (const tree of trees) {
    expect(Math.abs(tree.root.zFp)).toBeGreaterThanOrEqual(80 + 110 + tree.radiusFp);
    expect(Math.hypot(tree.root.xFp + 1500, tree.root.zFp - 1500)).toBeGreaterThanOrEqual(
      260 + tree.radiusFp,
    );
    const dx = Math.max(1000 - tree.root.xFp, 0, tree.root.xFp - 1700);
    const dz = Math.max(1000 - tree.root.zFp, 0, tree.root.zFp - 1700);
    expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(tree.radiusFp);
  }
  for (let i = 0; i < trees.length; i++)
    for (let j = i + 1; j < trees.length; j++) {
      const a = trees[i]!,
        b = trees[j]!;
      const distance = Math.hypot(a.root.xFp - b.root.xFp, a.root.zFp - b.root.zFp);
      expect(distance).toBeGreaterThanOrEqual(a.radiusFp + b.radiusFp);
      if (distance < 440) expect(a.template).not.toBe(b.template);
    }
  expect(new Set(trees.map((tree) => variants[tree.template]!.species))).toEqual(
    new Set(['conifer']),
  );
  expect(new Set(trees.map((tree) => variants[tree.template]!.age))).toEqual(
    new Set(['young', 'mature', 'old']),
  );
});
