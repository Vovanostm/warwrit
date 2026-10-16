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
