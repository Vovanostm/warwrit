/** Relative camera-space relief, never canonical world geometry. Near is white. */
export const PLACE_DEPTH_HEIGHT = 0.42;
export const PLACE_LOOK_LIMIT = { x: 0.035, y: 0.02 };

export interface PlaceLook {
  readonly x: number;
  readonly y: number;
}

export function projectPlacePoint(x: number, y: number, depth: number, look: PlaceLook) {
  const z = 1 - Math.max(0, Math.min(1, depth)) * PLACE_DEPTH_HEIGHT;
  // Off-axis perspective camera converges on the far plane; neutral view is the painting.
  const shift = 1 / z - 1;
  return { x: x + look.x * shift, y: y + look.y * shift };
}

export function samplePlaceDepth(
  pixels: { width: number; height: number; data: Uint8ClampedArray },
  u: number,
  v: number,
) {
  // Match GL's clamped, bilinear sampling at pixel centres.
  const x = Math.max(0, Math.min(pixels.width - 1, u * pixels.width - 0.5));
  const y = Math.max(0, Math.min(pixels.height - 1, v * pixels.height - 0.5));
  const left = Math.floor(x),
    top = Math.floor(y);
  const right = Math.min(left + 1, pixels.width - 1);
  const bottom = Math.min(top + 1, pixels.height - 1);
  const at = (a: number, b: number) => pixels.data[(b * pixels.width + a) * 4]! / 255;
  const upper = at(left, top) * (1 - (x - left)) + at(right, top) * (x - left);
  const lower = at(left, bottom) * (1 - (x - left)) + at(right, bottom) * (x - left);
  return upper * (1 - (y - top)) + lower * (y - top);
}
