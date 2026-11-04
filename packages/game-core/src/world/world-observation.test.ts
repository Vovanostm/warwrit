import { expect, it } from 'vitest';

import {
  canObserveWorldPoint,
  createWorldSightField,
  mergeExploredBits,
  sightHasCell,
  worldSightCells,
  worldSightIndex,
  type WorldSightConditions,
  type WorldSightField,
} from './world-observation.js';
import type { NavigationField } from './continuous-movement.js';

const DAY_CLEAR: WorldSightConditions = { time: 'day', weather: 'clear' };
const DAY_FOG: WorldSightConditions = { time: 'day', weather: 'fog' };
const NIGHT_CLEAR: WorldSightConditions = { time: 'night', weather: 'clear' };

function field(
  columns: number,
  rows = 1,
  overrides: Partial<Pick<WorldSightField, 'opacityPermille' | 'heightsFp'>> = {},
): WorldSightField {
  return {
    columns,
    rows,
    cellSizeFp: 64,
    origin: { xFp: 0, zFp: 0 },
    opacityPermille: Array(columns * rows).fill(1000),
    heightsFp: Array(columns * rows).fill(0),
    ...overrides,
  };
}

function point(column: number, row = 0): { xFp: number; zFp: number } {
  return { xFp: column * 64 + 32, zFp: row * 64 + 32 };
}

it('derives sight opacity from terrain while keeping deep water transparent', () => {
  const navigation = {
    region: {
      origin: { xFp: 0, zFp: 0 },
      columns: 3,
      rows: 1,
      cellSizeFp: 64,
    },
    terrainIds: ['grassland', 'forest', 'deep_water'],
  } as unknown as NavigationField;
  const sight = createWorldSightField(navigation);

  expect(sight.opacityPermille).toEqual([1000, 3200, 1000]);
  expect(sight.heightsFp[2]).toBeLessThan(sight.heightsFp[0]!);
});

it('shortens range through forest while water stays transparent', () => {
  const opacityPermille = Array(20).fill(1000);
  for (let column = 2; column <= 5; column += 1) opacityPermille[column] = 3200;
  const sight = field(20, 1, { opacityPermille });

  expect(canObserveWorldPoint(sight, point(0), point(8), DAY_CLEAR)).toBe(true);
  expect(canObserveWorldPoint(sight, point(0), point(10), DAY_CLEAR)).toBe(false);
  expect(canObserveWorldPoint(sight, point(0), point(15), DAY_CLEAR)).toBe(false);
  const water = field(20, 1, { heightsFp: Array(20).fill(-16) });
  expect(canObserveWorldPoint(water, point(0), point(14), DAY_CLEAR)).toBe(true);
});

it('lets a ridge be seen but hides lower ground behind it', () => {
  const heightsFp = Array(16 * 3).fill(0);
  heightsFp[1 * 16 + 5] = 160;
  const sight = field(16, 3, { heightsFp });

  expect(canObserveWorldPoint(sight, point(1, 1), point(5, 1), DAY_CLEAR)).toBe(true);
  expect(canObserveWorldPoint(sight, point(1, 1), point(10, 1), DAY_CLEAR)).toBe(false);
});

it('closes a diagonal sight gap between two high cells', () => {
  const heightsFp = Array(3 * 3).fill(0);
  heightsFp[1] = 160;
  heightsFp[3] = 160;
  const sight = field(3, 3, { heightsFp });

  expect(canObserveWorldPoint(sight, point(0, 0), point(1, 1), DAY_CLEAR)).toBe(false);
});

it('applies night and fog range reductions and builds a row-major low-bit-first mask', () => {
  const sight = field(24, 1);
  expect(canObserveWorldPoint(sight, point(0), point(12), DAY_CLEAR)).toBe(true);
  expect(canObserveWorldPoint(sight, point(0), point(12), NIGHT_CLEAR)).toBe(false);
  expect(canObserveWorldPoint(sight, point(0), point(8), DAY_FOG)).toBe(true);
  expect(canObserveWorldPoint(sight, point(0), point(9), DAY_FOG)).toBe(false);

  const mask = worldSightCells(sight, point(0), DAY_CLEAR);
  expect(mask[0]).toBe(0b1111_1111);
  expect(worldSightIndex(sight, point(0))).toBe(0);
  expect(worldSightIndex(sight, { xFp: -1, zFp: 32 })).toBe(-1);
  expect(worldSightIndex(sight, { xFp: 63.8, zFp: 32 })).toBe(0);
  expect(worldSightIndex(sight, { xFp: 64, zFp: 32 })).toBe(1);
  expect(sightHasCell(mask, 0)).toBe(true);
  expect(sightHasCell(mask, 1)).toBe(true);
  expect(sightHasCell(mask, 17)).toBe(canObserveWorldPoint(sight, point(0), point(17), DAY_CLEAR));
  expect(sightHasCell(mask, 23)).toBe(false);
  expect(sightHasCell(mask, -1)).toBe(false);
});

it('merges explored masks into owned output and rejects mismatched editions', () => {
  const left = new Uint8Array([0b0000_0101, 0b0000_0010]);
  const right = new Uint8Array([0b0000_1010, 0b0000_0001]);
  const merged = mergeExploredBits(left, right);

  expect(merged).toEqual(new Uint8Array([0b0000_1111, 0b0000_0011]));
  expect(merged).not.toBe(left);
  expect(() => mergeExploredBits(left, new Uint8Array(1))).toThrow(RangeError);
});

it('rejects opacity that would disagree with the bounded area query', () => {
  const invalid = field(50, 1, { opacityPermille: Array(50).fill(0) });
  expect(() => worldSightCells(invalid, point(0), DAY_CLEAR)).toThrow(RangeError);
  expect(() => canObserveWorldPoint(invalid, point(0), point(40), DAY_CLEAR)).toThrow(RangeError);
});
