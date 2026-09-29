export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export class InvariantViolation extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvariantViolation';
  }
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new InvariantViolation(message);
  }
}

export function assertNever(value: never): never {
  throw new InvariantViolation(`Unexpected value: ${String(value)}`);
}

/**
 * Orders strings by UTF-16 code units, identically on every host. Unlike
 * `localeCompare`, it ignores the process locale and ICU version, so replay and
 * tie-break order cannot diverge between server, browser and verifier.
 */
export function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
