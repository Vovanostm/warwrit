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

const HEX_NEIGHBOURS = [
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
  [1, 0],
] as const;

/** Return only sides on the perimeter of a hex-cell union, in terrain-corner order. */
export function exposedHexSides(cells: readonly { readonly q: number; readonly r: number }[]) {
  const cellKeys = new Set(cells.map(({ q, r }) => `${q},${r}`));
  return cells.flatMap((hex) =>
    HEX_NEIGHBOURS.flatMap(([dq, dr], side) =>
      cellKeys.has(`${hex.q + dq},${hex.r + dr}`) ? [] : [{ hex, side }],
    ),
  );
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

/** Try the preferred overhead position and reservation edges; validate after containment. */
export function actorBadgePlacement(
  badge: LabelBox,
  reserved: readonly LabelBox[],
  opening?: LabelBox,
  minimumUp = opening ? -Infinity : badge.up,
): LabelBox | null {
  const clamp = (value: number, center: number, room: number) =>
    Math.max(center - room, Math.min(center + room, value));
  const contained = (up: number): LabelBox =>
    opening
      ? {
          ...badge,
          x: clamp(badge.x, opening.x, opening.halfWidth - badge.halfWidth),
          up: clamp(up, opening.up, opening.halfHeight - badge.halfHeight),
        }
      : { ...badge, up };
  const candidates = [
    badge.up,
    ...reserved.flatMap((box) => [
      box.up + box.halfHeight + badge.halfHeight + 0.08,
      box.up - box.halfHeight - badge.halfHeight - 0.08,
    ]),
  ].sort((a, b) => {
    const above = Number(b >= badge.up) - Number(a >= badge.up);
    return above || Math.abs(a - badge.up) - Math.abs(b - badge.up);
  });
  return (
    candidates
      .map(contained)
      .find(
        (candidate) =>
          candidate.up >= minimumUp &&
          (!opening ||
            (badge.halfWidth <= opening.halfWidth && badge.halfHeight <= opening.halfHeight)) &&
          reserved.every(
            (box) =>
              Math.abs(candidate.x - box.x) >= badge.halfWidth + box.halfWidth ||
              Math.abs(candidate.up - box.up) >= badge.halfHeight + box.halfHeight,
          ),
      ) ?? null
  );
}
