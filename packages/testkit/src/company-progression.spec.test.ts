import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  COMPANY_CATALOGUE,
  PROGRESSION_RULES,
  creditProgression,
  progressionChallengeBps,
  progressionLevel,
  progressionThresholdMilliXp,
  xpToMilliXp,
} from '@warwrit/game-core';

const zero = Object.freeze({ milliXp: '0', carry: '0' });
const success = Object.freeze({
  aptitudeBps: COMPANY_CATALOGUE.openingProfiles[0]!.defaultAptitudeBps,
  challengeBps: 10000,
  outcomeBps: PROGRESSION_RULES.outcomeBps.success,
});

describe('A01 — exact progression arithmetic, not practice admission', () => {
  it('converts catalogue XP once and applies explicit frozen coefficients', () => {
    const attack = COMPANY_CATALOGUE.methods.find((method) => method.id === 'weapon-attack')!;
    const base = xpToMilliXp(attack.xp!);
    expect(base).toBe('20000');
    expect(creditProgression(zero, base, success)).toEqual({ milliXp: '20000', carry: '0' });
    const failure = Object.freeze({
      aptitudeBps: 12000,
      challengeBps: progressionChallengeBps(10, 5),
      outcomeBps: PROGRESSION_RULES.outcomeBps.meaningfulFailure,
    });
    // 20 XP * 1.2 * 1.1 * 0.25 = 6.6 XP, not 6.6 milliXP.
    expect(creditProgression(zero, base, failure)).toEqual({ milliXp: '6600', carry: '0' });
    expect(xpToMilliXp(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991000');
    expect(
      creditProgression(zero, '9007199254740993', {
        aptitudeBps: 8000,
        challengeBps: 12500,
        outcomeBps: 10000,
      }),
    ).toEqual({ milliXp: '9007199254740993', carry: '0' });
  });

  it('uses start-level challenge, including both clamp edges', () => {
    for (const [task, start, expected] of [
      [0, 100, 1000],
      [0, 45, 1000],
      [0, 44, 1200],
      [25, 25, 10000],
      [24, 0, 14800],
      [25, 0, 15000],
      [100, 0, 15000],
    ] as const) {
      expect(progressionChallengeBps(task, start)).toBe(expected);
    }
  });

  it('derives the highest eligible level at independent milliXP thresholds', () => {
    for (const [level, threshold] of [
      [0, '0'],
      [1, '10000'],
      [2, '30000'],
      [99, '49500000'],
      [100, '50500000'],
    ] as const) {
      expect(progressionThresholdMilliXp(level)).toBe(threshold);
      expect(progressionLevel(threshold)).toBe(level);
      expect(progressionLevel((BigInt(threshold) + 1n).toString())).toBe(level);
      if (level > 0)
        expect(progressionLevel((BigInt(threshold) - 1n).toString())).toBe(level - 1);
    }
    expect(progressionLevel('9'.repeat(128))).toBe(100);
  });

  it('retains sub-milliXP through JSON reload, including a zero-sized fragment', () => {
    const coefficients = Object.freeze({
      aptitudeBps: 8000,
      challengeBps: 10200,
      outcomeBps: 2500,
    });
    const first = creditProgression(zero, '1', coefficients);
    expect(first).toEqual({ milliXp: '0', carry: '204000000000' });
    const restored = JSON.parse(JSON.stringify(first));
    expect(creditProgression(restored, '0', coefficients)).toEqual(first);
    // Five milliXP * 0.8 * 1.02 * 0.25 = 1.02 milliXP.
    expect(creditProgression(restored, '4', coefficients)).toEqual({
      milliXp: '1',
      carry: '20000000000',
    });
    expect(first).toEqual({ milliXp: '0', carry: '204000000000' });
  });

  it('preserves the same factual quantity under splitting with unchanged coefficients', () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: 0n, max: 10n ** 30n }), { minLength: 1, maxLength: 8 }),
        fc.bigInt({ min: 0n, max: 999999999999n }),
        fc.record({
          aptitudeBps: fc.integer({ min: 1, max: 20000 }),
          challengeBps: fc.integer({ min: 1000, max: 15000 }),
          outcomeBps: fc.integer({ min: 0, max: 10000 }),
        }),
        (parts, carry, coefficients) => {
          const initial = { milliXp: '9999', carry: carry.toString() };
          const frozen = Object.freeze(coefficients);
          const quantity = parts.reduce((sum, part) => sum + part, 0n);
          const whole = creditProgression(initial, quantity.toString(), frozen);
          const split = parts.reduce(
            (amount, part) => {
              const restored = JSON.parse(JSON.stringify({ amount, coefficients: frozen }));
              return creditProgression(restored.amount, part.toString(), restored.coefficients);
            },
            initial,
          );
          expect(split).toEqual(whole);
          expect(BigInt(split.milliXp)).toBeGreaterThanOrEqual(BigInt(initial.milliXp));
          expect(BigInt(split.carry)).toBeGreaterThanOrEqual(0n);
          expect(BigInt(split.carry)).toBeLessThan(1000000000000n);
          // Conservation of the exact numerator; no production helper is an oracle.
          expect(
            (BigInt(split.milliXp) - BigInt(initial.milliXp)) * 1000000000000n +
              BigInt(split.carry),
          ).toBe(
            carry +
              quantity *
                BigInt(frozen.aptitudeBps) *
                BigInt(frozen.challengeBps) *
                BigInt(frozen.outcomeBps),
          );
        },
      ),
      { seed: 201 },
    );
  });

  it('rejects invalid quantities, coefficients, carry and wire overflow without rounding', () => {
    for (const invalid of ['-1', '01', '1.5', '1\n', '9'.repeat(129)]) {
      expect(() => creditProgression(zero, invalid, success)).toThrow(RangeError);
      expect(() => progressionLevel(invalid)).toThrow(RangeError);
    }
    for (const invalid of [-1, -0, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(() => xpToMilliXp(invalid)).toThrow(RangeError);
    for (const invalid of [-1, -0, 0.5, NaN, 101]) {
      expect(() => progressionThresholdMilliXp(invalid)).toThrow(RangeError);
      expect(() => progressionChallengeBps(invalid, 0)).toThrow(RangeError);
      expect(() => progressionChallengeBps(0, invalid)).toThrow(RangeError);
    }
    for (const patch of [
      { aptitudeBps: 0 },
      { aptitudeBps: 1.5 },
      { aptitudeBps: Number.MAX_SAFE_INTEGER + 1 },
      { challengeBps: 999 },
      { challengeBps: 15001 },
      { outcomeBps: -0 },
      { outcomeBps: Infinity },
      { outcomeBps: 10001 },
    ])
      expect(() => creditProgression(zero, '1', { ...success, ...patch })).toThrow(RangeError);
    for (const carry of ['-1', '01', '1000000000000'])
      expect(() => creditProgression({ ...zero, carry }, '0', success)).toThrow(RangeError);
    expect(() =>
      creditProgression({ milliXp: '9'.repeat(128), carry: '0' }, '1', success),
    ).toThrow(RangeError);
  });
});
