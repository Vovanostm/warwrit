import { expect, it } from 'vitest';
import { cartographyRevealPixels } from './cartography-reveal.js';

it('keeps unknown cells opaque while fading only inward and retaining a readable known interior', () => {
  const known = new Uint8Array(4);
  for (const index of [6, 7, 8, 11, 12, 13, 16, 17, 18]) known[index >>> 3]! |= 1 << (index & 7);
  const image = cartographyRevealPixels(known, 5, 5);
  const alphas: number[] = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const alpha = image.data[(y * image.width + x) * 4 + 3]!;
      const insideKnownSquare = x >= 8 && x < 32 && y >= 8 && y < 32;
      if (!insideKnownSquare) expect(alpha).toBe(0);
      else alphas.push(alpha);
    }
  }
  expect(image.data[(20 * image.width + 20) * 4 + 3]).toBe(255);
  expect(alphas.some((alpha) => alpha > 0 && alpha < 255)).toBe(true);
  expect(alphas.some((alpha) => alpha === 0)).toBe(true);
});
