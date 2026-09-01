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
