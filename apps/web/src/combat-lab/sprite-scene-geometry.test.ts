import { expect, it } from 'vitest';
import { Ray, Vector3 } from '@babylonjs/core';
import { SPRITE_MASK_SIZE } from './sprite-outline.js';
import {
  opaqueSpritePixel,
  eventLabelUp,
  avoidAnchorOverlap,
  intersectGroundLevel,
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

it('intersects the actual raised level and rejects parallel or backwards rays', () => {
  const hit = intersectGroundLevel(new Ray(new Vector3(2, 1, 3), new Vector3(0, -1, 0)), 2);
  expect(hit?.point.asArray()).toEqual([2, 0.24, 3]);
  expect(hit?.distance).toBeCloseTo(0.76);
  expect(intersectGroundLevel(new Ray(new Vector3(0, 1, 0), Vector3.Right()), 0)).toBeNull();
  expect(intersectGroundLevel(new Ray(new Vector3(0, 1, 0), Vector3.Up()), 0)).toBeNull();
});
