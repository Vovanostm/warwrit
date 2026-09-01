import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { canonicalCombatState, hexDistance, replayCombat, runAiBattle } from '@warwrit/game-core';

import { createGeneratedBattleSetup } from './combat.js';

describe('generated combat properties', () => {
  it('keeps axial distance symmetric and non-negative', () => {
    fc.assert(
      fc.property(
        fc.record({
          q: fc.integer({ min: -100, max: 100 }),
          r: fc.integer({ min: -100, max: 100 }),
        }),
        fc.record({
          q: fc.integer({ min: -100, max: 100 }),
          r: fc.integer({ min: -100, max: 100 }),
        }),
        (left, right) => {
          expect(hexDistance(left, right)).toBeGreaterThanOrEqual(0);
          expect(hexDistance(left, right)).toBe(hexDistance(right, left));
        },
      ),
      { numRuns: 500 },
    );
  });

  it('terminates, replays, and repeats generated resolvable battles', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2_000_000_000 }), (seed) => {
        const setup = createGeneratedBattleSetup(seed);
        const doctrines = [
          { sideId: setup.sides[0].id, doctrine: seed % 5 === 0 ? 'survivor' : 'aggressive' },
          { sideId: setup.sides[1].id, doctrine: seed % 7 === 0 ? 'survivor' : 'aggressive' },
        ] as const;
        const first = runAiBattle(setup, { doctrines });
        const second = runAiBattle(setup, { doctrines });
        const replayed = replayCombat(first.replay);

        expect(first.state.status).toBe('resolved');
        expect(canonicalCombatState(second.state)).toBe(canonicalCombatState(first.state));
        expect(canonicalCombatState(replayed.state)).toBe(canonicalCombatState(first.state));
      }),
      { numRuns: 100 },
    );
  });
});
