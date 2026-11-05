import {
  isRecord,
  isTransportId as isId,
  type OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { classifyCompanyCarePost, type CarePostResult } from './company-care-attempt.js';

export type CompanyRosterCommand = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { readonly type: 'Recruit' | 'JoinFieldParty' | 'SetAssignment' }
>;
export type CompanyRosterCommandType = CompanyRosterCommand['type'];
export interface CompanyRosterScope {
  readonly accountId: string;
  readonly companyId: string;
}
export interface CompanyRosterAttempt extends CompanyRosterScope {
  readonly type: CompanyRosterCommandType;
  readonly body: string;
  readonly request: CompanyRosterCommand;
}
export type CompanyRosterStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function matchesCompanyRosterScope(
  candidate: CompanyRosterScope | undefined,
  expected: CompanyRosterScope,
): boolean {
  return (
    candidate !== undefined &&
    candidate.accountId === expected.accountId &&
    candidate.companyId === expected.companyId
  );
}

const isRevision = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9][0-9]{0,127})$/u.test(value);

function isRosterCommand(
  value: unknown,
  type: CompanyRosterCommandType,
): value is CompanyRosterCommand {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 5 ||
    !['schemaVersion', 'commandId', 'expectedPublicRevision', 'type', 'payload'].every((key) =>
      Object.hasOwn(value, key),
    ) ||
    value['schemaVersion'] !== 2 ||
    value['type'] !== type ||
    !isId(value['commandId']) ||
    !isRevision(value['expectedPublicRevision']) ||
    !isRecord(value['payload'])
  )
    return false;
  const payload = value['payload'];
  if (type === 'SetAssignment')
    return (
      Object.keys(payload).length === 2 &&
      isId(payload['characterId']) &&
      (payload['assignment'] === 'FIELD' || payload['assignment'] === 'RECOVERY')
    );
  return type === 'Recruit'
    ? Object.keys(payload).length === 2 &&
        isId(payload['offerId']) &&
        isRevision(payload['offerRevision'])
    : Object.keys(payload).length === 1 && isId(payload['characterId']);
}

export function companyRosterAttemptKey(
  scope: CompanyRosterScope,
  type: CompanyRosterCommandType,
): string {
  return `warwrit:company-roster:${type}:${scope.accountId}:${scope.companyId}`;
}

export function createCompanyRosterAttempt(
  scope: CompanyRosterScope,
  request: CompanyRosterCommand,
): CompanyRosterAttempt {
  if (!isRosterCommand(request, request.type))
    throw new TypeError('Invalid company roster request');
  return { ...scope, type: request.type, request, body: JSON.stringify(request) };
}

/** Read only an intact request owned by this exact account, company and action slot. */
export function readCompanyRosterAttempt(
  storage: CompanyRosterStorage,
  scope: CompanyRosterScope,
  type: CompanyRosterCommandType,
): CompanyRosterAttempt | undefined {
  const raw = storage.getItem(companyRosterAttemptKey(scope, type));
  if (raw === null) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      Object.keys(value).length !== 4 ||
      value['accountId'] !== scope.accountId ||
      value['companyId'] !== scope.companyId ||
      value['type'] !== type ||
      typeof value['body'] !== 'string'
    )
      return undefined;
    const request: unknown = JSON.parse(value['body']);
    if (!isRosterCommand(request, type)) return undefined;
    return {
      accountId: scope.accountId,
      companyId: scope.companyId,
      type,
      request,
      body: value['body'],
    };
  } catch {
    return undefined;
  }
}

/** Never replace an existing or damaged slot with a different command. */
export function saveCompanyRosterAttempt(
  storage: CompanyRosterStorage,
  attempt: CompanyRosterAttempt,
): boolean {
  const key = companyRosterAttemptKey(attempt, attempt.type);
  const current = storage.getItem(key);
  if (current !== null) {
    const restored = readCompanyRosterAttempt(storage, attempt, attempt.type);
    return restored?.body === attempt.body;
  }
  storage.setItem(
    key,
    JSON.stringify({
      accountId: attempt.accountId,
      companyId: attempt.companyId,
      type: attempt.type,
      body: attempt.body,
    }),
  );
  return true;
}

export type PersistCompanyRosterAttemptResult =
  | { readonly kind: 'SAVED'; readonly attempt: CompanyRosterAttempt }
  | { readonly kind: 'EXISTING'; readonly attempt: CompanyRosterAttempt }
  | { readonly kind: 'OCCUPIED' | 'UNAVAILABLE' };

export type ReadBrowserCompanyRosterAttemptResult =
  | { readonly kind: 'AVAILABLE'; readonly attempt: CompanyRosterAttempt | undefined }
  | { readonly kind: 'UNAVAILABLE' };

/** Save once, or return the intact request already occupying this action slot. */
export function persistCompanyRosterAttempt(
  storage: CompanyRosterStorage,
  scope: CompanyRosterScope,
  request: CompanyRosterCommand,
): PersistCompanyRosterAttemptResult {
  try {
    const attempt = createCompanyRosterAttempt(scope, request);
    if (saveCompanyRosterAttempt(storage, attempt)) return { kind: 'SAVED', attempt };
    const existing = readCompanyRosterAttempt(storage, scope, request.type);
    return existing ? { kind: 'EXISTING', attempt: existing } : { kind: 'OCCUPIED' };
  } catch {
    return { kind: 'UNAVAILABLE' };
  }
}

export function persistBrowserCompanyRosterAttempt(
  scope: CompanyRosterScope,
  request: CompanyRosterCommand,
): PersistCompanyRosterAttemptResult {
  const storage = browserCompanyRosterStorage();
  return storage ? persistCompanyRosterAttempt(storage, scope, request) : { kind: 'UNAVAILABLE' };
}

/** Clear only the exact attempt that received a complete matching terminal reply. */
export function clearCompanyRosterAttempt(
  storage: CompanyRosterStorage,
  attempt: CompanyRosterAttempt,
): boolean {
  const key = companyRosterAttemptKey(attempt, attempt.type);
  const restored = readCompanyRosterAttempt(storage, attempt, attempt.type);
  if (restored?.body !== attempt.body) return false;
  storage.removeItem(key);
  return true;
}

export async function postCompanyRosterAttempt(
  apiBaseUrl: string,
  attempt: CompanyRosterAttempt,
  fetcher: typeof fetch = fetch,
): Promise<CarePostResult> {
  try {
    const response = await fetcher(`${apiBaseUrl.replace(/\/$/u, '')}/company/commands`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        [WORLD_EXPECTED_COMPANY_ID_HEADER]: attempt.companyId,
      },
      body: attempt.body,
    });
    const value: unknown =
      response.status === 401 ? undefined : await response.json().catch(() => undefined);
    return classifyCompanyCarePost(response.status, value, attempt.request.commandId);
  } catch {
    return 'UNKNOWN';
  }
}

export function browserCompanyRosterStorage(): CompanyRosterStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readBrowserCompanyRosterAttempt(
  scope: CompanyRosterScope,
  type: CompanyRosterCommandType,
): ReadBrowserCompanyRosterAttemptResult {
  const storage = browserCompanyRosterStorage();
  if (!storage) return { kind: 'UNAVAILABLE' };
  try {
    return { kind: 'AVAILABLE', attempt: readCompanyRosterAttempt(storage, scope, type) };
  } catch {
    return { kind: 'UNAVAILABLE' };
  }
}

export function clearBrowserCompanyRosterAttempt(attempt: CompanyRosterAttempt): boolean {
  try {
    const storage = browserCompanyRosterStorage();
    return storage !== undefined && clearCompanyRosterAttempt(storage, attempt);
  } catch {
    return false;
  }
}
