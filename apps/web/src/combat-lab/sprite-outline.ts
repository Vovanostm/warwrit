export const SPRITE_MASK_SIZE = 128;
export const SPRITE_VISUAL_SIZE = 512;
const outlineRadius = 3;
export const SPRITE_OUTLINE_SIZE = SPRITE_MASK_SIZE + outlineRadius * 2;
export const SPRITE_VISUAL_OUTLINE_SIZE = SPRITE_VISUAL_SIZE + outlineRadius * 2;

function alphaAt(mask: Uint8ClampedArray, x: number, y: number, size: number): number {
  return x >= 0 && x < size && y >= 0 && y < size ? mask[(y * size + x) * 4 + 3]! : 0;
}

function distanceToOpaque(mask: Uint8ClampedArray, x: number, y: number, size: number): number {
  let distance = outlineRadius + 1;
  for (let dy = -outlineRadius; dy <= outlineRadius; dy++) {
    for (let dx = -outlineRadius; dx <= outlineRadius; dx++) {
      if (alphaAt(mask, x + dx, y + dy, size) >= 64)
        distance = Math.min(distance, Math.max(Math.abs(dx), Math.abs(dy)));
    }
  }
  return distance;
}

/** Keep the entire silhouette, including artwork close to any canvas edge. */
export function spriteOutlinePixels(
  mask: Uint8ClampedArray,
  size = SPRITE_MASK_SIZE,
): Uint8ClampedArray {
  const outlineSize = size + outlineRadius * 2;
  const pixels = new Uint8ClampedArray(outlineSize ** 2 * 4);
  for (let row = 0; row < outlineSize; row++) {
    for (let column = 0; column < outlineSize; column++) {
      const x = column - outlineRadius;
      const y = row - outlineRadius;
      if (alphaAt(mask, x, y, size) >= 16) continue;
      const distance = distanceToOpaque(mask, x, y, size);
      const offset = (row * outlineSize + column) * 4;
      if (distance <= 2) pixels.set([208, 193, 165, 210], offset);
      else if (distance === outlineRadius) pixels.set([31, 28, 25, 200], offset);
    }
  }
  return pixels;
}
