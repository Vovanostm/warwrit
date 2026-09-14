import { COMPANY_RULES } from './definitions.js';
import { freezeRegistry, natural, object, optional, snapshotJson, unsigned } from './input.js';
import { exactFraction, readExactFraction } from './exact-fraction.js';
import type { ExactFraction } from './exact-fraction.js';
import type { ValueOf } from './input.js';

/** Missing numerical parameters from Learning/Definitions; catalogue XP remains in definitions. */
export const PROGRESSION_RULES = freezeRegistry({
  version: 's02-progression-parameters-1',
  productionBalanceApproved: false,
  thresholdXpFactor: 5,
  challenge: { minimumBps: 1000, maximumBps: 15000, baseBps: 10000, stepBps: 200 },
  outcomeBps: { success: 10000, meaningfulFailure: 2500 },
});
const CREDIT_DENOMINATOR = 10000n ** 3n;
const amountInput = object({
  milliXp: unsigned,
  carry: unsigned,
  carryDenominator: optional(unsigned),
});
export const progressionAmountInput = Object.freeze({
  ...amountInput,
  read: (value: unknown): value is ProgressionAmount =>
    amountInput.read(value) &&
    BigInt(value.carry) < BigInt(value.carryDenominator ?? CREDIT_DENOMINATOR),
});
const coefficientsInput = object({
  aptitudeBps: natural(1),
  challengeBps: natural(
    PROGRESSION_RULES.challenge.minimumBps,
    PROGRESSION_RULES.challenge.maximumBps,
  ),
  outcomeBps: natural(0, PROGRESSION_RULES.outcomeBps.success),
});
/** Absent carryDenominator still means exactly 10^12; old stored amounts are not reinterpreted. */
export type ProgressionAmount = ValueOf<typeof amountInput>;
export type ProgressionCoefficients = ValueOf<typeof coefficientsInput>;

function exact(value: unknown): string {
  if (!unsigned.read(value)) throw new RangeError('Invalid exact integer');
  return value;
}
function levelInteger(value: number): bigint {
  if (!natural(0, COMPANY_RULES.maxSkillLevel).read(value))
    throw new RangeError('Invalid progression level');
  return BigInt(value);
}
function milliXpFromWholeXp(xp: bigint): string {
  // Catalogue quantities are XP; this is the sole XP -> milliXP conversion.
  return exact((xp * 1000n).toString());
}
export function xpToMilliXp(xp: number): string {
  if (!natural().read(xp)) throw new RangeError('Invalid XP quantity');
  return milliXpFromWholeXp(BigInt(xp));
}

/** Evaluate once at action start; a split interval must reuse the resulting coefficients. */
export function progressionChallengeBps(taskChallenge: number, levelAtActionStart: number): number {
  const difference = levelInteger(taskChallenge) - levelInteger(levelAtActionStart);
  const rules = PROGRESSION_RULES.challenge;
  const scaled = BigInt(rules.baseBps) + BigInt(rules.stepBps) * difference;
  const minimum = BigInt(rules.minimumBps);
  const maximum = BigInt(rules.maximumBps);
  return Number(scaled < minimum ? minimum : scaled > maximum ? maximum : scaled);
}

/** Arithmetic only: the caller must separately admit factual quantity, method and source (A03). */
export function creditProgression(
  previous: ProgressionAmount,
  baseMilliXp: string | ExactFraction,
  frozenCoefficients: ProgressionCoefficients,
): ProgressionAmount {
  const amount = snapshotJson(previous);
  const coefficients = snapshotJson(frozenCoefficients);
  if (!progressionAmountInput.read(amount) || !coefficientsInput.read(coefficients))
    throw new RangeError('Invalid progression amount or coefficients');
  const base = readExactFraction(
    typeof baseMilliXp === 'string' ? { numerator: baseMilliXp, denominator: '1' } : baseMilliXp,
  );
  const previousDenominator = BigInt(amount.carryDenominator ?? CREDIT_DENOMINATOR);
  const creditDenominator = BigInt(base.denominator) * CREDIT_DENOMINATOR;
  const denominator = previousDenominator * creditDenominator;
  const numerator =
    BigInt(base.numerator) *
      BigInt(coefficients.aptitudeBps) *
      BigInt(coefficients.challengeBps) *
      BigInt(coefficients.outcomeBps) *
      previousDenominator +
    BigInt(amount.carry) * creditDenominator;
  const remainder = exactFraction(numerator % denominator, denominator);
  const remainderDenominator = BigInt(remainder.denominator);
  const legacyRepresentable = CREDIT_DENOMINATOR % remainderDenominator === 0n;
  return Object.freeze({
    milliXp: exact((BigInt(amount.milliXp) + numerator / denominator).toString()),
    carry: legacyRepresentable
      ? (BigInt(remainder.numerator) * (CREDIT_DENOMINATOR / remainderDenominator)).toString()
      : remainder.numerator,
    ...(legacyRepresentable ? {} : { carryDenominator: remainder.denominator }),
  });
}

export function progressionThresholdMilliXp(level: number): string {
  const value = levelInteger(level);
  return milliXpFromWholeXp(BigInt(PROGRESSION_RULES.thresholdXpFactor) * value * (value + 1n));
}
/** Carry is below one milliXP and cannot cross an integer milliXP threshold. No level is stored. */
export function progressionLevel(milliXp: string): number {
  const amount = BigInt(exact(milliXp));
  let lower = 0;
  let upper = COMPANY_RULES.maxSkillLevel;
  while (lower < upper) {
    const middle = Math.ceil((lower + upper) / 2);
    if (amount >= BigInt(progressionThresholdMilliXp(middle))) lower = middle;
    else upper = middle - 1;
  }
  return lower;
}
