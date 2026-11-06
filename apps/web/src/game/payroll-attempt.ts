import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';

export type PayrollAttempt = Extract<OrdinaryPlayerCompanyCommandV2Dto, { type: 'PayClaims' }>;
type PayrollPayload = PayrollAttempt['payload'];

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).toSorted().join('|') === [...keys].toSorted().join('|');

function id(value: unknown): value is string {
  if (typeof value !== 'string' || [...value].length > 256 || value.trim().length === 0)
    return false;
  return [...value].every((character) => {
    const code = character.codePointAt(0)!;
    return code > 0x1f && code !== 0x7f;
  });
}

function revision(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 128 && /^(0|[1-9][0-9]*)$/u.test(value);
}

function positiveAmount(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 128 &&
    /^(0|[1-9][0-9]*)$/u.test(value) &&
    BigInt(value) > 0n
  );
}

/** Damaged storage or a request from another company can never become a retry. */
export function readPayrollAttempt(
  stored: string | null,
  accountId: string,
  companyId: string,
): PayrollAttempt | undefined {
  if (stored === null) return undefined;
  const envelope = parseStoredAttempt(stored);
  if (!envelope || envelope.accountId !== accountId || envelope.companyId !== companyId)
    return undefined;
  return envelope.request;
}

function parseStoredAttempt(stored: string):
  | {
      readonly accountId: string;
      readonly companyId: string;
      readonly request: PayrollAttempt;
    }
  | undefined {
  try {
    const value: unknown = JSON.parse(stored);
    if (
      !record(value) ||
      !exactKeys(value, ['accountId', 'companyId', 'request']) ||
      !id(value['accountId']) ||
      !id(value['companyId']) ||
      !record(value['request'])
    )
      return undefined;
    const request = parseRequest(value['request']);
    if (!request) return undefined;
    return { accountId: value['accountId'], companyId: value['companyId'], request };
  } catch {
    return undefined;
  }
}

function parseRequest(value: unknown): PayrollAttempt | undefined {
  if (
    !record(value) ||
    !exactKeys(value, [
      'commandId',
      'expectedPublicRevision',
      'payload',
      'schemaVersion',
      'type',
    ]) ||
    value['schemaVersion'] !== 2 ||
    value['type'] !== 'PayClaims' ||
    !id(value['commandId']) ||
    !revision(value['expectedPublicRevision'])
  )
    return undefined;
  const payload = parsePayload(value['payload']);
  if (!payload) return undefined;
  return {
    schemaVersion: 2,
    commandId: value['commandId'],
    expectedPublicRevision: value['expectedPublicRevision'],
    type: 'PayClaims',
    payload,
  };
}

function parsePayload(value: unknown): PayrollPayload | undefined {
  if (!record(value)) return undefined;
  const hasPayee = Object.hasOwn(value, 'payeeId');
  if (
    !exactKeys(value, [
      'amountQ',
      'claimIds',
      'mode',
      'poolId',
      ...(hasPayee ? ['payeeId'] : []),
    ]) ||
    !id(value['poolId']) ||
    !positiveAmount(value['amountQ']) ||
    !validClaimIds(value['claimIds'])
  )
    return undefined;
  if (value['mode'] === 'DEFAULT' && !hasPayee && value['claimIds'].length === 0)
    return value as unknown as PayrollPayload;
  if (value['mode'] === 'TARGETED' && hasPayee && id(value['payeeId']))
    return value as unknown as PayrollPayload;
  return undefined;
}

function validClaimIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id) && new Set(value).size === value.length;
}

export type PayrollPostResult =
  | { readonly kind: 'ACCEPTED' }
  | { readonly kind: 'REJECTED'; readonly code: string }
  | { readonly kind: 'UNAUTHENTICATED' }
  | { readonly kind: 'UNKNOWN' };

export async function postPayrollAttempt(
  apiBaseUrl: string,
  companyId: string,
  attempt: PayrollAttempt,
): Promise<PayrollPostResult> {
  const response = await fetch(`${apiBaseUrl}/company/commands`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
    },
    body: JSON.stringify(attempt),
  });
  return classifyPayrollResponse(response.status, await responseBody(response), attempt.commandId);
}

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

const rejectionCodes = new Set([
  'INVALID_COMMAND',
  'NOT_AUTHORIZED',
  'CONTACT_OR_ACCESS_REQUIRED',
  'UNSUPPORTED_ACTION',
  'IDEMPOTENCY_CONFLICT',
  'STALE_REVISION',
  'INSUFFICIENT_ITEMS',
  'INSUFFICIENT_STAMINA',
  'INSUFFICIENT_FUNDS',
  'CAPACITY',
  'OUT_OF_STOCK',
]);

/** Clear the retained request only for a status/body pair naming this exact command. */
export function classifyPayrollResponse(
  status: number,
  value: unknown,
  commandId: string,
): PayrollPostResult {
  if (status === 401) return { kind: 'UNAUTHENTICATED' };
  if (!record(value) || value['commandId'] !== commandId || !revision(value['publicRevision']))
    return { kind: 'UNKNOWN' };
  if (
    status === 200 &&
    value['ok'] === true &&
    Object.keys(value).toSorted().join('|') === 'commandId|ok|publicRevision'
  )
    return { kind: 'ACCEPTED' };
  if (
    (status === 403 || status === 409) &&
    value['ok'] === false &&
    typeof value['code'] === 'string' &&
    rejectionCodes.has(value['code']) &&
    (status === 403 ? value['code'] === 'NOT_AUTHORIZED' : value['code'] !== 'NOT_AUTHORIZED') &&
    Object.keys(value).toSorted().join('|') === 'code|commandId|ok|publicRevision'
  )
    return { kind: 'REJECTED', code: value['code'] };
  return { kind: 'UNKNOWN' };
}
