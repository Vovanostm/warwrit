import { describe, expect, it } from 'vitest';

import { createRandomState, drawRandomInt, nextUint32 } from '../index.js';

describe('versioned combat random source', () => {
  it('repeats the same sequence for the same seed, including zero', () => {
    let first = createRandomState(0);
    let second = createRandomState(0);

    for (let index = 0; index < 100; index += 1) {
      const firstDraw = nextUint32(first);
      const secondDraw = nextUint32(second);
      expect(firstDraw.value).toBe(secondDraw.value);
      first = firstDraw.state;
      second = secondDraw.state;
    }

    expect(first).toEqual(second);
    expect(first.draws).toBe(100);
  });

  it('draws only inside an inclusive integer range', () => {
    let state = createRandomState(7);
    const values = new Set<number>();

    for (let index = 0; index < 1_000; index += 1) {
      const draw = drawRandomInt(state, -3, 3);
      expect(draw.value).toBeGreaterThanOrEqual(-3);
      expect(draw.value).toBeLessThanOrEqual(3);
      values.add(draw.value);
      state = draw.state;
    }

    expect(values.size).toBe(7);
  });
});
