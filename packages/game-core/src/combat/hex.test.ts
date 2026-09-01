import { describe, expect, it } from 'vitest';

import { createHexagon, findPath, hexDistance, hexKey, hexNeighbors } from '../index.js';

describe('axial hex algorithms', () => {
  it('uses six stable neighbors and symmetric distance', () => {
    const origin = { q: 0, r: 0 };
    const neighbors = hexNeighbors(origin);

    expect(new Set(neighbors.map(hexKey)).size).toBe(6);
    for (const neighbor of neighbors) {
      expect(hexDistance(origin, neighbor)).toBe(1);
      expect(hexDistance(origin, neighbor)).toBe(hexDistance(neighbor, origin));
    }
  });

  it('finds a deterministic shortest path around blocked terrain', () => {
    const map = {
      hexes: createHexagon(2),
      blocked: [{ q: 0, r: 0 }],
    };
    const first = findPath(map, { q: -2, r: 0 }, { q: 2, r: 0 });
    const second = findPath(map, { q: -2, r: 0 }, { q: 2, r: 0 });

    expect(first).toEqual(second);
    expect(first).toBeDefined();
    expect(first?.some((value) => hexKey(value) === '0,0')).toBe(false);
    expect(first?.at(-1)).toEqual({ q: 2, r: 0 });
  });
});
