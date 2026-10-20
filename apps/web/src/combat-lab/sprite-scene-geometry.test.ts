import { expect, it } from 'vitest';
import { SPRITE_MASK_SIZE } from './sprite-outline.js';
import {
  opaqueSpritePixel,
  eventLabelUp,
  avoidAnchorOverlap,
  actorBadgePlacement,
  exposedHexSides,
} from './sprite-scene-geometry.js';

it('samples only original artwork with flipped UV rows and the existing opacity threshold', () => {
  const mask = new Uint8ClampedArray(SPRITE_MASK_SIZE ** 2 * 4);
  mask[3] = 16;
  mask[(SPRITE_MASK_SIZE ** 2 - 1) * 4 + 3] = 15;
  expect(opaqueSpritePixel(mask, { x: 0, y: 1 })).toBe(true);
  expect(opaqueSpritePixel(mask, { x: 1, y: 0 })).toBe(false);
  expect(opaqueSpritePixel(mask, { x: 0.5, y: 0.5 })).toBe(false);
  expect(opaqueSpritePixel(mask, { x: -1, y: 2 })).toBe(true);
});

it('returns only exposed sides for a reach-cell union', () => {
  const adjacent = exposedHexSides([
    { q: 0, r: 0 },
    { q: 1, r: 0 },
  ]);
  expect(adjacent).toHaveLength(10);
  expect(adjacent).not.toContainEqual({ hex: { q: 0, r: 0 }, side: 5 });
  expect(adjacent).not.toContainEqual({ hex: { q: 1, r: 0 }, side: 2 });
  expect(exposedHexSides([{ q: 0, r: 0 }])).toHaveLength(6);
});

it('moves feedback above reserved figures but retains the finite placement bound', () => {
  const occupied = [{ x: 0, up: 0, halfWidth: 0.4, halfHeight: 0.4 }];
  expect(eventLabelUp(0, 0, 0.6, occupied)).toBeCloseTo(0.72);
  expect(eventLabelUp(2, 0, 0.6, occupied)).toBe(0);
  expect(eventLabelUp(0, 0, 0.6, [{ x: 0, up: 0, halfWidth: 99, halfHeight: 99 }])).toBeCloseTo(
    6.48,
  );
});

it('stacks a movement event above a neighbouring preparation badge and accepted event', () => {
  const preparation = { x: 0.6, up: 1.25, halfWidth: 0.675, halfHeight: 0.15 };
  const previousEvent = { x: 0, up: 1.8, halfWidth: 0.475, halfHeight: 0.16 };
  const up = eventLabelUp(0, 1.23, 0.475, [preparation, previousEvent]);
  expect(up).toBeCloseTo(2.13);
  for (const box of [preparation, previousEvent]) {
    expect(Math.abs(up - box.up)).toBeGreaterThanOrEqual(0.16 + box.halfHeight);
  }
});

it('shifts a field anchor without changing its horizontal and target coordinates, stopping at the viewport limit', () => {
  const anchor = { x: 200, y: 260, targetY: 280 };
  expect(avoidAnchorOverlap(anchor, [{ left: 150, right: 250, top: 200, bottom: 300 }])).toEqual({
    x: 200,
    y: 192,
    targetY: 280,
  });
  expect(avoidAnchorOverlap(anchor, [{ left: 150, right: 250, top: 50, bottom: 300 }])).toEqual({
    x: 200,
    y: 100,
    targetY: 280,
  });
});

it('places the measured actor badge above neighbouring weapons, bodies and reserved labels', () => {
  const badge = { x: 0, up: 1.5, halfWidth: 0.8, halfHeight: 0.2 };
  const reserved = [
    { x: 0.5, up: 1.6, halfWidth: 0.4, halfHeight: 0.6 },
    { x: 0, up: 2.7, halfWidth: 0.9, halfHeight: 0.3 },
    { x: 3, up: 4, halfWidth: 0.4, halfHeight: 5 },
  ];
  const placed = actorBadgePlacement(badge, reserved)!;
  expect(placed.up).toBeCloseTo(3.28);
  expect(placed.x).toBe(badge.x);
  expect(actorBadgePlacement(badge, [...reserved].reverse())).toEqual(placed);
  expect(actorBadgePlacement(badge, [])).toEqual(badge);
  for (const box of reserved.slice(0, 2))
    expect(placed.up - box.up).toBeGreaterThan(placed.halfHeight + box.halfHeight);
});

it('contains the entire badge and recomputes placement when reservation geometry changes', () => {
  const badge = { x: 9.5, up: 4, halfWidth: 2, halfHeight: 0.5 };
  const opening = { x: 5, up: 5, halfWidth: 5, halfHeight: 3 };
  const first = actorBadgePlacement(badge, [], opening);
  expect(first).toEqual({ ...badge, x: 8 });
  const changed = actorBadgePlacement(
    badge,
    [{ x: 8, up: 4, halfWidth: 1, halfHeight: 1 }],
    opening,
  )!;
  expect(changed.up).toBeCloseTo(5.58);
  const top = actorBadgePlacement({ ...badge, up: 20 }, [], opening)!;
  expect(top.up + top.halfHeight).toBe(8);
  expect(top.x + top.halfWidth).toBe(10);
  const bottom = actorBadgePlacement({ ...badge, x: -20, up: -20 }, [], opening)!;
  expect(bottom.up - bottom.halfHeight).toBe(2);
  expect(bottom.x - bottom.halfWidth).toBe(0);
});

it('rechecks final contained actor badge candidates and reports when overhead space is unavailable', () => {
  const badge = { x: 0, up: 8, halfWidth: 2, halfHeight: 2 };
  const opening = { x: 0, up: 0, halfWidth: 10, halfHeight: 10 };
  const placed = actorBadgePlacement(badge, [badge], opening)!;
  expect(Math.abs(placed.up - 8)).toBeGreaterThanOrEqual(4);
  expect(Math.abs(placed.up) + placed.halfHeight).toBeLessThanOrEqual(10);
  expect(Math.abs(placed.x) + placed.halfWidth).toBeLessThanOrEqual(10);
  // A real overhead cue cannot use that lower gap if it falls below its owner's head.
  expect(actorBadgePlacement(badge, [badge], opening, badge.up)).toBeNull();
  expect(actorBadgePlacement(badge, [opening], opening)).toBeNull();
});
