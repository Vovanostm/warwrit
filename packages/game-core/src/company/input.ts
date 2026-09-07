import { isEntityId, isExactInteger, MAX_EXACT_DIGITS, MAX_ID_LENGTH } from './values.js';

export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export interface Input<T> {
  readonly schema: Readonly<Record<string, unknown>>;
  readonly read: (value: unknown) => value is T;
}
export type ValueOf<I> = I extends Input<infer T> ? T : never;
type Fields = Readonly<Record<string, Input<unknown>>>;
type OptionalInput = Input<unknown> & { readonly optional: true };
type RequiredKeys<F extends Fields> = {
  [K in keyof F]: F[K] extends OptionalInput ? never : K;
}[keyof F];
type OptionalKeys<F extends Fields> = Exclude<keyof F, RequiredKeys<F>>;
export type ObjectOf<F extends Fields> = { readonly [K in RequiredKeys<F>]: ValueOf<F[K]> } & {
  readonly [K in OptionalKeys<F>]?: ValueOf<F[K]>;
};

export function plainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
/** Accept data, not classes/accessors/cyclic graphs. Bound work before any schema traversal. */
export function isJsonData(value: unknown): value is JsonValue {
  let remaining = 10000;
  const ancestors = new Set<object>();
  function visit(item: unknown, depth: number): boolean {
    remaining -= 1;
    if (remaining < 0 || depth > 20) return false;
    if (item === null || typeof item === 'boolean') return true;
    if (typeof item === 'string') return item.length <= 4096;
    if (typeof item === 'number')
      return (
        Number.isFinite(item) &&
        !Object.is(item, -0) &&
        (!Number.isInteger(item) || Number.isSafeInteger(item))
      );
    if (typeof item !== 'object' || (!Array.isArray(item) && !plainObject(item))) return false;
    if (ancestors.has(item)) return false;
    ancestors.add(item);
    const keys = Reflect.ownKeys(item);
    if (keys.length > 1001) return false;
    if (Array.isArray(item) && (item.length > 1000 || keys.length !== item.length + 1))
      return false;
    for (const key of keys) {
      if (typeof key !== 'string') return false;
      if (Array.isArray(item) && key === 'length') continue;
      if (Array.isArray(item) && !/^(0|[1-9][0-9]*)$/u.test(key)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return false;
      if (!visit(descriptor.value, depth + 1)) return false;
    }
    ancestors.delete(item);
    return true;
  }
  try {
    return visit(value, 0);
  } catch {
    return false;
  }
}
export const text: Input<string> = {
  schema: { type: 'string', minLength: 1, maxLength: 4096 },
  read: (v): v is string => typeof v === 'string' && v.length > 0 && v.length <= 4096,
};
export const id: Input<string> = {
  schema: { type: 'string', minLength: 1, maxLength: MAX_ID_LENGTH },
  read: isEntityId,
};
export const unsigned: Input<string> = {
  schema: { type: 'string', pattern: '^(0|[1-9][0-9]*)$', maxLength: MAX_EXACT_DIGITS },
  read: (v): v is string => isExactInteger(v),
};
export const signed: Input<string> = {
  schema: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$', maxLength: MAX_EXACT_DIGITS + 1 },
  read: (v): v is string => isExactInteger(v, true),
};
export const bool: Input<boolean> = {
  schema: { type: 'boolean' },
  read: (v): v is boolean => typeof v === 'boolean',
};
export function natural(minimum = 0, maximum = Number.MAX_SAFE_INTEGER): Input<number> {
  return {
    schema: { type: 'integer', minimum, maximum },
    read: (v): v is number =>
      typeof v === 'number' &&
      Number.isSafeInteger(v) &&
      !Object.is(v, -0) &&
      v >= minimum &&
      v <= maximum,
  };
}
export function choice<const V extends readonly (string | number | boolean)[]>(
  ...values: V
): Input<V[number]> {
  return {
    schema: { enum: values },
    read: (v): v is V[number] => values.some((value) => value === v),
  };
}
export function optional<T>(input: Input<T>): Input<T> & { readonly optional: true } {
  return { ...input, optional: true };
}
export function array<T>(
  input: Input<T>,
  minimum = 0,
  maximum = 1000,
  unique = false,
): Input<readonly T[]> {
  return {
    schema: {
      type: 'array',
      items: input.schema,
      minItems: minimum,
      maxItems: maximum,
      uniqueItems: unique,
    },
    read: (v): v is readonly T[] =>
      Array.isArray(v) &&
      v.length >= minimum &&
      v.length <= maximum &&
      v.every((item: unknown) => input.read(item)) &&
      (!unique || new Set(v).size === v.length),
  };
}
export function object<const F extends Fields>(fields: F): Input<ObjectOf<F>> {
  return {
    schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(fields).map(([key, input]) => [key, input.schema]),
      ),
      required: Object.entries(fields)
        .filter(([, input]) => !('optional' in input))
        .map(([key]) => key),
      additionalProperties: false,
    },
    read: (v): v is ObjectOf<F> => {
      if (!plainObject(v) || Object.keys(v).some((key) => !Object.hasOwn(fields, key)))
        return false;
      return Object.entries(fields).every(([key, input]) => {
        if (!Object.hasOwn(v, key)) return 'optional' in input && input.optional === true;
        return input.read(v[key]);
      });
    },
  };
}
export function either<A, B>(first: Input<A>, second: Input<B>): Input<A | B> {
  return {
    schema: { anyOf: [first.schema, second.schema] },
    read: (v): v is A | B => first.read(v) || second.read(v),
  };
}
export const jsonObject: Input<{ readonly [key: string]: JsonValue }> = {
  schema: { type: 'object', additionalProperties: true, maxProperties: 1000 },
  read: (v): v is { readonly [key: string]: JsonValue } => plainObject(v) && isJsonData(v),
};
/** Locale-independent identity material, not a cryptographic digest or a public receipt. */
export function canonicalJson(value: unknown): string {
  if (!isJsonData(value)) throw new TypeError('Expected bounded JSON data');
  function encode(item: JsonValue): string {
    if (item === null || typeof item !== 'object') return JSON.stringify(item);
    if (Array.isArray(item)) return `[${item.map(encode).join(',')}]`;
    const record = item as { readonly [key: string]: JsonValue };
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${encode(record[key]!)}`)
      .join(',')}}`;
  }
  return encode(value);
}

/** Freeze internal finite registries so exported schemas cannot change validation. */
export function freezeRegistry<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeRegistry(child);
    Object.freeze(value);
  }
  return value;
}
