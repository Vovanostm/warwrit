import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  buildNavigationField,
  compileMovementPlan,
  continuousSurfaceAt,
  findTravelPath,
} from '@warwrit/game-core';
import { pixel, point, presets, region } from './porechye-navigation.js';
import * as regional from './porechye-regional.js';

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

const regionalField = buildNavigationField(regional.regionalRegion);

test('independently selected visible water stays blocked on the regional painting', () => {
  assert.deepEqual(
    [
      [100, 400],
      [285, 440],
      [430, 460],
      [600, 550],
      [740, 590],
      [1010, 525],
      [1250, 550],
      [1440, 635],
      [880, 690],
      [900, 680],
      [925, 670],
      [950, 660],
    ].map(([x, y]) => continuousSurfaceAt(regionalField, point([x!, y!])).speedPermille),
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  );
});

test('regional journeys use the stone bridge and the timber bypass, never the broken crossing', () => {
  const waterCrossings = regional.regionalPresets.slice(0, 2).map(({ from, to }) => {
    const plan = compileMovementPlan({
      field: regionalField,
      path: findTravelPath(regionalField, point(from), point(to))!,
      startedAtMs: '0',
      movementEpoch: '0',
      planId: 'regional-journey',
    });
    return plan.speedSpans
      .filter((s) => s.terrainId === 'deep_water')
      .map((s) => ({
        overlay: s.overlayId,
        x: Math.round(
          pixel({ xFp: Number(s.from.xMicroFp) / 65536, zFp: Number(s.from.zMicroFp) / 65536 })[0],
        ),
      }));
  });
  assert.deepEqual(waterCrossings, [
    [{ overlay: 'bridge', x: 1156 }],
    [{ overlay: 'bridge', x: 315 }],
  ]);
});

test('every selectable place has a reachable arrival point, including the bank of the ruined bridge', () => {
  assert.deepEqual(
    regional.places
      .filter((place) => !findTravelPath(regionalField, point([1160, 400]), point(place.at)))
      .map((place) => place.name),
    [],
  );
});
