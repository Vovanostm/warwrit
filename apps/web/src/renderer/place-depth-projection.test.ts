import { describe, expect, it } from 'vitest';
import { projectPlacePoint, samplePlaceDepth } from './place-depth-projection.js';

describe('painted place entrances and camera projection', () => {
  it('keeps neutral doors fixed and projects near/far doors using camera-space perspective', () => {
    const entrance = { x: 0.25, y: 0.75 };
    expect(projectPlacePoint(entrance.x, entrance.y, 1, { x: 0, y: 0 })).toEqual(entrance);
    expect(projectPlacePoint(entrance.x, entrance.y, 0, { x: 0.035, y: -0.02 })).toEqual(entrance);
    // A door at z=.7 has world x=.25*.7. A camera shifted -.035 and converging
    // on z=1 projects it to ((worldX+.035)/.7)-.035, independent of the helper.
    const p = projectPlacePoint(entrance.x, entrance.y, 0.3 / 0.42, { x: 0.035, y: -0.02 });
    expect(p.x).toBeCloseTo((0.25 * 0.7 + 0.035) / 0.7 - 0.035, 12);
    expect(p.y).toBeCloseTo((0.75 * 0.7 - 0.02) / 0.7 + 0.02, 12);
  });

  it('samples the door depth at the same clamped pixel centres as the GPU texture', () => {
    const pixels = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255,
      ]),
    };
    expect(samplePlaceDepth(pixels, 0.25, 0.25)).toBe(0);
    expect(samplePlaceDepth(pixels, 0.75, 0.25)).toBe(1);
    expect(samplePlaceDepth(pixels, 0.5, 0.5)).toBe(0.5);
    expect(samplePlaceDepth(pixels, -0.1, 1.1)).toBe(1);
  });
});
