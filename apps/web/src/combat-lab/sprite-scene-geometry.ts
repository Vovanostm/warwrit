import { Plane, Vector3, type Ray } from '@babylonjs/core';
import { BATTLE_HEIGHT_STEP } from '../renderer/hex-projection.js';
import { SPRITE_MASK_SIZE } from './sprite-outline.js';

export interface LabelBox {
  readonly x: number;
  readonly up: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

/** The mask samples original artwork, independently of the padded outline plane. */
export function opaqueSpritePixel(
  mask: Uint8ClampedArray,
  uv: { readonly x: number; readonly y: number },
): boolean {
  const column = Math.max(0, Math.min(SPRITE_MASK_SIZE - 1, Math.floor(uv.x * SPRITE_MASK_SIZE)));
  const row = Math.max(
    0,
    Math.min(SPRITE_MASK_SIZE - 1, Math.floor((1 - uv.y) * SPRITE_MASK_SIZE)),
  );
  return (mask[(row * SPRITE_MASK_SIZE + column) * 4 + 3] ?? 0) >= 16;
}

/** Keep the bounded existing upward placement while reserving other bodies and event labels. */
export function eventLabelUp(
  x: number,
  initialUp: number,
  halfWidth: number,
  reserved: readonly LabelBox[],
): number {
  let up = initialUp;
  for (let attempt = 0; attempt < 36; attempt++) {
    if (
      !reserved.some(
        (box) =>
          Math.abs(x - box.x) < halfWidth + box.halfWidth &&
          Math.abs(up - box.up) < 0.16 + box.halfHeight,
      )
    )
      break;
    up += 0.18;
  }
  return up;
}

export interface ScreenBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}
export function avoidAnchorOverlap(
  anchor: { readonly x: number; readonly y: number; readonly targetY: number },
  reserved: readonly ScreenBox[],
) {
  let result = anchor;
  for (let attempt = 0; attempt < reserved.length; attempt++) {
    const collision = reserved.find(
      (box) =>
        result.x + 118 > box.left &&
        result.x - 118 < box.right &&
        result.y > box.top &&
        result.y - 80 < box.bottom,
    );
    if (!collision || result.y === 100) break;
    result = { ...result, y: Math.max(100, collision.top - 8) };
  }
  return result;
}

export function intersectGroundLevel(
  ray: Ray,
  level: number,
): { readonly point: Vector3; readonly distance: number } | null {
  const plane = Plane.FromPositionAndNormal(
    new Vector3(0, level * BATTLE_HEIGHT_STEP, 0),
    Vector3.Up(),
  );
  const distance = ray.intersectsPlane(plane);
  if (distance === null || distance < 0) return null;
  return { distance, point: ray.origin.add(ray.direction.scale(distance)) };
}
