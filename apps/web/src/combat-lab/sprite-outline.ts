export const SPRITE_MASK_SIZE = 128;
export const SPRITE_VISUAL_SIZE = 512;
export const SPRITE_OUTLINE_RADIUS = 3;
// For 20–30 px overview sprites this aims near a 1 px border; art width varies, so it is an estimate.
export const SPRITE_FAR_NIGHT_OUTLINE_RADIUS = 8;
export const SPRITE_OUTLINE_SIZE = SPRITE_MASK_SIZE + SPRITE_OUTLINE_RADIUS * 2;
export const SPRITE_VISUAL_OUTLINE_SIZE = SPRITE_VISUAL_SIZE + SPRITE_OUTLINE_RADIUS * 2;
const lightOutline = [208, 193, 165, 210] as const;
const darkOutline = [31, 28, 25, 200] as const;

function alphaAt(mask: Uint8ClampedArray, x: number, y: number, size: number): number {
  return x >= 0 && x < size && y >= 0 && y < size ? mask[(y * size + x) * 4 + 3]! : 0;
}

/** Keep the entire silhouette, including artwork close to any canvas edge. */
export function spriteOutlinePixels(
  mask: Uint8ClampedArray,
  size = SPRITE_MASK_SIZE,
  radius = SPRITE_OUTLINE_RADIUS,
): Uint8ClampedArray {
  const outlineSize = size + radius * 2;
  const pixels = new Uint8ClampedArray(outlineSize ** 2 * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (alphaAt(mask, x, y, size) < 64 || isOpaqueInterior(mask, x, y, size)) continue;
      stampOutline(mask, pixels, x, y, size, outlineSize, radius);
    }
  }
  return pixels;
}

function stampOutline(
  mask: Uint8ClampedArray,
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  size: number,
  outlineSize: number,
  radius: number,
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0) continue;
      const targetX = x + dx + radius;
      const targetY = y + dy + radius;
      if (alphaAt(mask, targetX - radius, targetY - radius, size) >= 16) continue;
      const offset = (targetY * outlineSize + targetX) * 4;
      if (distance <= 2) pixels.set(lightOutline, offset);
      else if (pixels[offset + 3] === 0) pixels.set(darkOutline, offset);
    }
  }
}

function isOpaqueInterior(mask: Uint8ClampedArray, x: number, y: number, size: number): boolean {
  return (
    alphaAt(mask, x - 1, y, size) >= 64 &&
    alphaAt(mask, x + 1, y, size) >= 64 &&
    alphaAt(mask, x, y - 1, size) >= 64 &&
    alphaAt(mask, x, y + 1, size) >= 64
  );
}
