export interface ScopedAttemptScope {
  readonly accountId: string;
  readonly companyId: string;
}

export interface ScopedAttemptStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ScopedAttemptEnvelopeRead =
  | { readonly kind: 'EMPTY' }
  | { readonly kind: 'FOUND'; readonly body: string }
  | { readonly kind: 'UNAVAILABLE' }
  | { readonly kind: 'INVALID' };

export interface ScopedAttemptBinding {
  readonly key: 'encounterId';
  readonly value: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

export function readScopedAttemptEnvelope(
  storage: ScopedAttemptStorage,
  key: string,
  scope: ScopedAttemptScope,
  binding?: ScopedAttemptBinding,
): ScopedAttemptEnvelopeRead {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { kind: 'UNAVAILABLE' };
  }
  if (raw === null) return { kind: 'EMPTY' };
  try {
    const value: unknown = JSON.parse(raw);
    const keys = ['version', 'accountId', 'companyId', 'body'];
    if (binding) keys.push(binding.key);
    if (!isRecord(value) || !hasExactKeys(value, keys)) return { kind: 'INVALID' };
    if (
      value['version'] !== 1 ||
      value['accountId'] !== scope.accountId ||
      value['companyId'] !== scope.companyId ||
      (binding !== undefined && value[binding.key] !== binding.value) ||
      typeof value['body'] !== 'string'
    )
      return { kind: 'INVALID' };
    return { kind: 'FOUND', body: value['body'] };
  } catch {
    return { kind: 'INVALID' };
  }
}

export function writeScopedAttemptEnvelope(
  storage: ScopedAttemptStorage,
  key: string,
  scope: ScopedAttemptScope,
  body: string,
  binding?: ScopedAttemptBinding,
): void {
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      accountId: scope.accountId,
      companyId: scope.companyId,
      ...(binding ? { [binding.key]: binding.value } : {}),
      body,
    }),
  );
}

export function clearScopedAttemptEnvelope(
  storage: ScopedAttemptStorage,
  key: string,
  scope: ScopedAttemptScope,
  body: string,
  binding?: ScopedAttemptBinding,
): boolean {
  const current = readScopedAttemptEnvelope(storage, key, scope, binding);
  if (current.kind !== 'FOUND' || current.body !== body) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function browserScopedAttemptStorage(): ScopedAttemptStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}
