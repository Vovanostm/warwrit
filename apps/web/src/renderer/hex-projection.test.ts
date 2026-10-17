import { expect, it } from 'vitest';
import { worldToHex } from './hex-projection.js';

it.each([1, 2.6])(
  'keeps corners and both sides of shared edges selectable at spacing %s',
  (spacing) => {
    const sqrt3 = Math.sqrt(3);
    for (const [q, r] of [
      [0, 0],
      [-4, 3],
      [8, -6],
    ] as const) {
      const x = q + r / 2;
      const z = (r * sqrt3) / 2;
      expect(worldToHex(x * spacing, z * spacing, spacing)).toEqual({ q, r });
      for (let corner = 0; corner < 6; corner++) {
        const angle = (corner * Math.PI) / 3 + Math.PI / 6;
        expect(
          worldToHex(
            (x + (0.99 * Math.cos(angle)) / sqrt3) * spacing,
            (z + (0.99 * Math.sin(angle)) / sqrt3) * spacing,
            spacing,
          ),
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
        expect(
          worldToHex((x + dx * 0.49999) * spacing, (z + dz * 0.49999) * spacing, spacing),
        ).toEqual({ q, r });
        expect(
          worldToHex((x + dx * 0.50001) * spacing, (z + dz * 0.50001) * spacing, spacing),
        ).toEqual({ q: q + dq, r: r + dr });
        expect([
          { q, r },
          { q: q + dq, r: r + dr },
        ]).toContainEqual(worldToHex((x + dx * 0.5) * spacing, (z + dz * 0.5) * spacing, spacing));
      }
    }
  },
);
