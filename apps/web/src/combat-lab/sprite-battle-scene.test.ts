import { expect, it } from 'vitest';
import { spriteFrameMapBounds } from './sprite-battle-scene.js';

it('keeps field containment independent of a narrower squad frame', () => {
  const field = Object.freeze({ minX: -20, maxX: 60, minZ: -30, maxZ: 40 });
  const figures = [
    { minX: 2, maxX: 4, bottom: 1, top: 3 },
    { minX: 5, maxX: 8, bottom: 2, top: 5 },
  ];
  const squad = spriteFrameMapBounds(false, field, figures);
  expect(squad.minX).toBe(2);
  expect(squad.maxX).toBe(8);
  expect(squad.minZ).toBeCloseTo(1 / Math.sin((50 * Math.PI) / 180), 12);
  expect(squad.maxZ).toBeCloseTo(5 / Math.sin((50 * Math.PI) / 180), 12);
  expect(spriteFrameMapBounds(true, field, figures)).toBe(field);
  expect(spriteFrameMapBounds(true, field, [])).toBe(field);
});
