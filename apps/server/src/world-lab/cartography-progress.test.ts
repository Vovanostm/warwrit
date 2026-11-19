import {
  buildNavigationField,
  compileMovementPlan,
  positionAt,
  type NavigationRegion,
} from '@warwrit/game-core';
import { expect, it } from 'vitest';
import { routeExplorationSampleTimes } from './cartography-progress.js';

it('retains an offline route bend and samples only the actually traversed interval', () => {
  const boundary = [
    { xFp: 0, zFp: 0 },
    { xFp: 640, zFp: 0 },
    { xFp: 640, zFp: 640 },
    { xFp: 0, zFp: 640 },
  ];
  const region: NavigationRegion = {
    mapEdition: 'exploration-test-v1',
    origin: { xFp: 0, zFp: 0 },
    columns: 10,
    rows: 10,
    cellSizeFp: 64,
    boundary,
    terrainShapes: [
      { shapeId: 'land', terrainId: 'grassland', paintPriority: 0, polygon: boundary },
    ],
    overlayShapes: [],
    blockingShapes: [],
    dangerAreaShapes: [],
    sites: [],
  };
  const plan = compileMovementPlan({
    field: buildNavigationField(region),
    path: [
      { xFp: 32, zFp: 32 },
      { xFp: 352, zFp: 32 },
      { xFp: 352, zFp: 352 },
    ],
    movementEpoch: '1',
    startedAtMs: '1000',
    planId: 'bent-route',
  });
  const stopMs =
    Number(plan.startedAtMs) + Math.floor((Number(plan.totalDurationUs) / 1000) * 0.75);
  const times = routeExplorationSampleTimes(plan, Number(plan.startedAtMs), stopMs, 64);
  const points = times.map((at) => {
    const point = positionAt(plan, String(at));
    return { x: Number(point.xMicroFp) / 65_536, z: Number(point.zMicroFp) / 65_536 };
  });
  expect(times[0]).toBe(1000);
  expect(times.at(-1)).toBe(stopMs);
  expect(points.some((point) => Math.hypot(point.x - 352, point.z - 32) < 0.1)).toBe(true);
  expect(
    Math.max(
      ...points
        .slice(1)
        .map((point, index) => Math.hypot(point.x - points[index]!.x, point.z - points[index]!.z)),
    ),
  ).toBeLessThan(32.1);
  expect(points.at(-1)!.z).toBeLessThan(352);
});
