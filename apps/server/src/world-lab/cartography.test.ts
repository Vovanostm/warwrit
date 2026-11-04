import { expect, it } from 'vitest';
import type { WorldLabCartographyDto } from '@warwrit/protocol';
import { cartographyKnowsSegment } from './cartography.js';

it('rejects a diagonal path clipping an unknown cell between sampled endpoints', () => {
  let cartography = {
    grid: { columns: 2, rows: 2, cellSizeFp: 64, origin: { xFp: 0, zFp: 0 } },
    charted: Buffer.from([0b1101]).toString('base64'),
    explored: Buffer.from([0]).toString('base64'),
  } as WorldLabCartographyDto;
  const point = (x: number, z: number) => ({
    xMicroFp: String(Math.round(x * 65536)),
    zMicroFp: String(Math.round(z * 65536)),
  });
  // Both endpoints are known; the segment crosses unknown bottom-right for <1fp.
  expect(cartographyKnowsSegment(cartography, point(60, 60), point(68, 67))).toBe(false);
  cartography = { ...cartography, explored: Buffer.from([2]).toString('base64') };
  expect(cartographyKnowsSegment(cartography, point(60, 60), point(68, 67))).toBe(true);
});
