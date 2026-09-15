import { object, snapshotJson, unsigned } from './input.js';
import type { ValueOf } from './input.js';

const fields = object({ numerator: unsigned, denominator: unsigned });
export type ExactFraction = ValueOf<typeof fields>;
export const exactFractionInput = Object.freeze({
  ...fields,
  read: (value: unknown): value is ExactFraction =>
    fields.read(value) && BigInt(value.denominator) > 0n,
});

/** Exact nonnegative domain quantity; no rounding or floating-point intermediate. */
export function exactFraction(numerator: bigint, denominator: bigint): ExactFraction {
  if (numerator < 0n || denominator <= 0n) throw new RangeError('Invalid exact fraction');
  let a = numerator;
  let b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  const result = {
    numerator: (numerator / a).toString(),
    denominator: (denominator / a).toString(),
  };
  if (!exactFractionInput.read(result)) throw new RangeError('Exact fraction exceeds wire limits');
  return Object.freeze(result);
}

export function readExactFraction(value: unknown): ExactFraction {
  const retained = snapshotJson(value);
  if (!exactFractionInput.read(retained)) throw new RangeError('Invalid exact fraction');
  return exactFraction(BigInt(retained.numerator), BigInt(retained.denominator));
}
