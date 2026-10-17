import { expect, it } from 'vitest';
import { SPRITE_MASK_SIZE, SPRITE_OUTLINE_SIZE, spriteOutlinePixels } from './sprite-outline.js';

it.each([128, 512])('keeps full outline clearance at visual mask size %s', (size) => {
  const mask = new Uint8ClampedArray(size ** 2 * 4);
  for (const y of [0, size - 1]) {
    for (const x of [0, size - 1]) mask[(y * size + x) * 4 + 3] = 255;
  }
  const original = mask.slice();
  const pixels = spriteOutlinePixels(mask, size);
  const outlineSize = size + 6;
  const alpha = (x: number, y: number) => pixels[(y * outlineSize + x) * 4 + 3];
  // Full three-pixel clearance outside each source corner, never a clipped cap.
  for (const y of [0, outlineSize - 1]) {
    for (const x of [0, outlineSize - 1]) expect(alpha(x, y)).toBe(200);
  }
  expect(alpha(3, 3)).toBe(0);
  expect(alpha(2, 3)).toBe(210);
  expect(alpha(64, 64)).toBe(0);
  expect(mask).toEqual(original);
});

it('retains a closed head contour when the source hair is only two mask pixels from the top', () => {
  const mask = new Uint8ClampedArray(SPRITE_MASK_SIZE ** 2 * 4);
  mask[(2 * SPRITE_MASK_SIZE + 64) * 4 + 3] = 255;
  const pixels = spriteOutlinePixels(mask);
  // Source y=2 sits at padded y=5. Its outer top must reach padded y=2.
  expect(pixels[(2 * SPRITE_OUTLINE_SIZE + 67) * 4 + 3]).toBe(200);
  expect(pixels[(3 * SPRITE_OUTLINE_SIZE + 67) * 4 + 3]).toBe(210);
  expect(pixels[(5 * SPRITE_OUTLINE_SIZE + 67) * 4 + 3]).toBe(0);
  expect(pixels[((SPRITE_OUTLINE_SIZE - 1) * SPRITE_OUTLINE_SIZE + 67) * 4 + 3]).toBe(0);
});

it('matches a nearest-Chebyshev oracle for mixed-alpha silhouettes and holes', () => {
  const size = 9;
  const mask = new Uint8ClampedArray(size ** 2 * 4);
  const setAlpha = (x: number, y: number, alpha: number) => {
    mask[(y * size + x) * 4 + 3] = alpha;
  };
  for (let y = 2; y <= 6; y++) {
    for (let x = 2; x <= 6; x++) setAlpha(x, y, 255);
  }
  setAlpha(4, 4, 0);
  setAlpha(1, 4, 63);
  setAlpha(7, 4, 16);

  const pixels = spriteOutlinePixels(mask, size);
  const outlineSize = size + 6;
  for (let row = 0; row < outlineSize; row++) {
    for (let column = 0; column < outlineSize; column++) {
      const x = column - 3;
      const y = row - 3;
      const sourceAlpha =
        x >= 0 && x < size && y >= 0 && y < size ? mask[(y * size + x) * 4 + 3]! : 0;
      let nearest = 4;
      if (sourceAlpha < 16) {
        for (let sourceY = 0; sourceY < size; sourceY++) {
          for (let sourceX = 0; sourceX < size; sourceX++) {
            if (mask[(sourceY * size + sourceX) * 4 + 3]! >= 64) {
              nearest = Math.min(nearest, Math.max(Math.abs(x - sourceX), Math.abs(y - sourceY)));
            }
          }
        }
      }
      const expected =
        sourceAlpha >= 16 || nearest > 3
          ? [0, 0, 0, 0]
          : nearest <= 2
            ? [208, 193, 165, 210]
            : [31, 28, 25, 200];
      expect(
        Array.from(
          pixels.slice((row * outlineSize + column) * 4, (row * outlineSize + column) * 4 + 4),
        ),
      ).toEqual(expected);
    }
  }
});
