import { expect, it } from 'vitest';
import { spriteFrameDepth, spriteFrameMapBounds } from './sprite-battle-scene.js';
import { battleCameraLimits, battleFrameBounds } from './battle-framing.js';

it('keeps field containment independent of a narrower squad frame', () => {
  const field = Object.freeze({ minX: -20, maxX: 60, minZ: -30, maxZ: 40 });
  const figures = [
    { minX: 2, maxX: 4, bottom: 1, top: 3 },
    { minX: 5, maxX: 8, bottom: 2, top: 5 },
  ];
  const squad = spriteFrameMapBounds(false, field, figures);
  expect(squad.minX).toBe(2);
  expect(squad.maxX).toBe(8);
  expect(squad.minZ).toBeCloseTo(2, 12);
  expect(squad.maxZ).toBeCloseTo(10, 12);
  expect(spriteFrameMapBounds(true, field, figures)).toBe(field);
  expect(spriteFrameMapBounds(true, field, [])).toBe(field);
});

it('preserves screen-up extents and zoom through the existing framing reference', () => {
  const sin = Math.sin(Math.PI / 6);
  const referenceSin = Math.sin((50 * Math.PI) / 180);
  const field = { minX: -10, maxX: 20, minZ: -4, maxZ: 16 };
  const frame = battleFrameBounds({
    mapBounds: spriteFrameDepth(field, sin / referenceSin),
    figures: [],
    width: 1440,
    height: 900,
    safeTop: 180,
    safeBottom: 660,
  })!;
  const scene = spriteFrameDepth(frame, referenceSin / sin);
  const expectedZoom = (10 * 900) / (2 * (640 - 188));
  expect(((scene.maxZ - scene.minZ) * sin) / 2).toBeCloseTo(expectedZoom, 12);
  const limits = battleCameraLimits(frame, 1440, 900);
  const sceneLimits = spriteFrameDepth(limits.bounds, referenceSin / sin);
  expect((sceneLimits.maxZ - sceneLimits.minZ) * sin).toBeCloseTo(
    (limits.bounds.maxZ - limits.bounds.minZ) * referenceSin,
    12,
  );
  const restored = spriteFrameDepth(scene, sin / referenceSin);
  expect(restored.minX).toBe(frame.minX);
  expect(restored.maxX).toBe(frame.maxX);
  expect(restored.minZ).toBeCloseTo(frame.minZ, 12);
  expect(restored.maxZ).toBeCloseTo(frame.maxZ, 12);
});
