import { expect, it } from 'vitest';
import { worldToHex } from './hex-projection.js';

it('keeps hex corners and both sides of every shared edge selectable, including negative axes', () => {
  const sqrt3 = Math.sqrt(3);
  for (const [q, r] of [
    [0, 0],
    [-4, 3],
    [8, -6],
  ] as const) {
    const x = q + r / 2;
    const z = (r * sqrt3) / 2;
    expect(worldToHex(x, z)).toEqual({ q, r });
    for (let corner = 0; corner < 6; corner++) {
      const angle = (corner * Math.PI) / 3 + Math.PI / 6;
      expect(
        worldToHex(x + (0.99 * Math.cos(angle)) / sqrt3, z + (0.99 * Math.sin(angle)) / sqrt3),
      ).toEqual({ q, r });
    }
    for (const [dq, dr] of [
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1],
    ] as const) {
      const dx = dq + dr / 2;
      const dz = (dr * sqrt3) / 2;
      expect(worldToHex(x + dx * 0.49999, z + dz * 0.49999)).toEqual({ q, r });
      expect(worldToHex(x + dx * 0.50001, z + dz * 0.50001)).toEqual({ q: q + dq, r: r + dr });
      expect([
        { q, r },
        { q: q + dq, r: r + dr },
      ]).toContainEqual(worldToHex(x + dx * 0.5, z + dz * 0.5));
    }
  }
});
