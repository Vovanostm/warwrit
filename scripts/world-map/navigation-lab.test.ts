import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  buildNavigationField,
  compileMovementPlan,
  continuousSurfaceAt,
  findTravelPath,
} from '@warwrit/game-core';
import { pixel, point, presets, region } from './porechye-navigation.js';

const field = buildNavigationField(region);
const compile = (path: Parameters<typeof compileMovementPlan>[0]['path']) =>
  compileMovementPlan({ field, path, startedAtMs: '0', movementEpoch: '0', planId: 'test' });

test('the drawn forest, marsh, hill and road resolve to their existing speeds', () => {
  assert.deepEqual(
    [
      [100, 500],
      [1480, 580],
      [1200, 270],
      [108, 328],
    ].map(([x, y]) => continuousSurfaceAt(field, point([x!, y!])).speedPermille),
    [600, 300, 800, 1800],
  );
});

test('visible open water below the stone bridge cannot be treated as dry ground', () => {
  assert.deepEqual(
    [
      [790, 600],
      [810, 650],
      [900, 650],
      [1100, 730],
      [1360, 805],
      [1400, 815],
    ].map(([x, y]) => continuousSurfaceAt(field, point([x!, y!])).speedPermille),
    [0, 0, 0, 0, 0, 0],
  );
});

test('the town-to-mill route crosses water only on a bridge', () => {
  const { from, to } = presets[0]!;
  const plan = compile(findTravelPath(field, point(from), point(to))!);
  assert.deepEqual(
    [
      ...new Set(
        plan.speedSpans.filter((s) => s.terrainId === 'deep_water').map((s) => s.overlayId),
      ),
    ],
    ['bridge'],
  );
});

test('a crossing near the ruined bridge requires a detour to the open bridge', () => {
  const { from, to } = presets[1]!;
  assert.throws(() => compile([point(from), point(to)]), /NO_PATH/u);
  const path = findTravelPath(field, point(from), point(to))!;
  assert.ok(Math.max(...path.map((p) => pixel(p)[0])) > 600);
});

test('the road detour takes less time than the walkable straight line', () => {
  const { from, to } = presets[2]!;
  const plan = compile(findTravelPath(field, point(from), point(to))!);
  const direct = compile([point(from), point(to)]);
  assert.ok(BigInt(plan.totalDurationUs) < BigInt(direct.totalDurationUs));
});
