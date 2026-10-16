export const SPRITE_MASK_SIZE = 128;
const outlineRadius = 3;
export const SPRITE_OUTLINE_SIZE = SPRITE_MASK_SIZE + outlineRadius * 2;

function alphaAt(mask: Uint8ClampedArray, x: number, y: number): number {
  return x >= 0 && x < SPRITE_MASK_SIZE && y >= 0 && y < SPRITE_MASK_SIZE
    ? mask[(y * SPRITE_MASK_SIZE + x) * 4 + 3]!
    : 0;
}

function distanceToOpaque(mask: Uint8ClampedArray, x: number, y: number): number {
  let distance = outlineRadius + 1;
  for (let dy = -outlineRadius; dy <= outlineRadius; dy++) {
    for (let dx = -outlineRadius; dx <= outlineRadius; dx++) {
      if (alphaAt(mask, x + dx, y + dy) >= 64)
        distance = Math.min(distance, Math.max(Math.abs(dx), Math.abs(dy)));
    }
  }
  return distance;
}

/** Keep the entire silhouette, including artwork close to any canvas edge. */
export function spriteOutlinePixels(mask: Uint8ClampedArray): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(SPRITE_OUTLINE_SIZE ** 2 * 4);
  for (let row = 0; row < SPRITE_OUTLINE_SIZE; row++) {
    for (let column = 0; column < SPRITE_OUTLINE_SIZE; column++) {
      const x = column - outlineRadius;
      const y = row - outlineRadius;
      if (alphaAt(mask, x, y) >= 16) continue;
      const distance = distanceToOpaque(mask, x, y);
      const offset = (row * SPRITE_OUTLINE_SIZE + column) * 4;
      if (distance <= 2) pixels.set([208, 193, 165, 210], offset);
      else if (distance === outlineRadius) pixels.set([31, 28, 25, 200], offset);
    }
  }
  return pixels;
}
