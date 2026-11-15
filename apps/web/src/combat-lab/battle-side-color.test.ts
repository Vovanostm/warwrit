import { describe, expect, it } from 'vitest';
import { battleSideColor } from './battle-side-color.js';

describe('battleSideColor', () => {
  it('assigns separate stable accents to the three sides in a battle', () => {
    const sides = ['human', 'opponent', 'third'];
    const colors = sides.map((side) => battleSideColor(side, sides));
    expect(new Set(colors).size).toBe(3);
    expect(colors).toEqual(sides.map((side) => battleSideColor(side, sides)));
  });
});
