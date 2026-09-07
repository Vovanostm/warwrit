import { MAX_TEXT_LENGTH, STRING_INPUTS } from './values.js';

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

export const JSON_LIMITS = Object.freeze({ depth: 20, nodes: 10000, entries: 1000 });
export function plainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
/** One detached data snapshot: never call a method or getter supplied by the caller. */
export function snapshotJson(value: unknown): JsonValue | undefined {
  let remaining = JSON_LIMITS.nodes;
  const ancestors = new Set<object>();
  function copy(item: unknown, depth: number): JsonValue {
    if (--remaining < 0 || depth > JSON_LIMITS.depth) throw new TypeError('JSON budget exceeded');
    if (item === null || typeof item === 'boolean') return item;
    if (typeof item === 'string' && [...item].length <= MAX_TEXT_LENGTH) return item;
    if (
      typeof item === 'number' &&
      Number.isFinite(item) &&
      !Object.is(item, -0) &&
      (!Number.isInteger(item) || Number.isSafeInteger(item))
    )
      return item;
    if (typeof item !== 'object' || item === null || ancestors.has(item))
      throw new TypeError('Not JSON data');
    const array = Array.isArray(item);
    if (array ? Object.getPrototypeOf(item) !== Array.prototype : !plainObject(item))
      throw new TypeError('Not a data container');
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const keys = Reflect.ownKeys(descriptors).filter((key) => !array || key !== 'length');
    const length: unknown = descriptors['length']?.value;
    if (keys.length > JSON_LIMITS.entries || (array && length !== keys.length))
      throw new TypeError('Invalid container size');
    ancestors.add(item);
    const result: Record<string, JsonValue> = {};
    for (const [index, key] of keys.entries()) {
      if (
        typeof key !== 'string' ||
        [...key].length > MAX_TEXT_LENGTH ||
        (array && key !== String(index))
      )
        throw new TypeError('Invalid data key');
      const descriptor = descriptors[key]!;
      if (!('value' in descriptor) || !descriptor.enumerable)
        throw new TypeError('Not a data property');
      Object.defineProperty(result, key, {
        value: copy(descriptor.value, depth + 1),
        enumerable: true,
      });
    }
    ancestors.delete(item);
    return Object.freeze(array ? Object.values(result) : result);
  }
  try {
    return copy(value, 0);
  } catch {
    return undefined;
  }
}
export function isJsonData(value: unknown): value is JsonValue {
  return snapshotJson(value) !== undefined;
}
export const { text, id, unsigned, signed } = STRING_INPUTS;
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
  maximum: number = JSON_LIMITS.entries,
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
      (!unique || new Set(v.map((item: unknown) => canonicalJson(item))).size === v.length),
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
const JSON_OBJECT_SCHEMA = freezeRegistry({
  type: 'object',
  maxProperties: JSON_LIMITS.entries,
  propertyNames: { maxLength: MAX_TEXT_LENGTH },
  additionalProperties: { $ref: '#/$defs/jsonData' },
});
// Recursive wire shape. Depth/node work budgets remain a separate admission limit.
export const JSON_DATA_SCHEMA = freezeRegistry({
  anyOf: [
    { type: 'null' },
    { type: 'boolean' },
    { type: 'number', minimum: -Number.MAX_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER },
    { type: 'string', maxLength: MAX_TEXT_LENGTH },
    { type: 'array', maxItems: JSON_LIMITS.entries, items: { $ref: '#/$defs/jsonData' } },
    JSON_OBJECT_SCHEMA,
  ],
});
export const jsonObject: Input<{ readonly [key: string]: JsonValue }> = {
  schema: JSON_OBJECT_SCHEMA,
  read: (v): v is { readonly [key: string]: JsonValue } =>
    plainObject(v) && Object.keys(v).length <= JSON_LIMITS.entries,
};
/** Locale-independent request identity; not a cryptographic digest or public receipt. */
export function canonicalJson(value: unknown): string {
  const snapshot = snapshotJson(value);
  if (snapshot === undefined) throw new TypeError('Expected bounded JSON data');
  function encode(item: JsonValue): string {
    if (item === null || typeof item !== 'object') return JSON.stringify(item);
    if (Array.isArray(item)) return `[${item.map(encode).join(',')}]`;
    const record = item as { readonly [key: string]: JsonValue };
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${encode(record[key]!)}`)
      .join(',')}}`;
  }
  return encode(snapshot);
}
/** Only for owned, acyclic registries; untrusted inputs use snapshotJson instead. */
export function freezeRegistry<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeRegistry(child);
    Object.freeze(value);
  }
  return value;
}
