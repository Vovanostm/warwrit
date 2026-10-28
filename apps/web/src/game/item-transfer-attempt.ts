import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';

export type ItemTransferAttempt = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { type: 'TransferItem' }
>;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 256;
const revision = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9][0-9]{0,127})$/u.test(value);
const keys = (value: Record<string, unknown>, expected: string[]) =>
  Object.keys(value).sort().join('|') === expected.sort().join('|');

export function readItemTransferAttempt(
  stored: string | null,
  accountId: string,
  companyId: string,
): ItemTransferAttempt | undefined {
  if (!stored) return undefined;
  try {
    const envelope: unknown = JSON.parse(stored);
    if (
      !record(envelope) ||
      envelope['accountId'] !== accountId ||
      envelope['companyId'] !== companyId
    )
      return undefined;
    const request = envelope['request'];
    if (
      !record(request) ||
      !keys(request, ['schemaVersion', 'commandId', 'expectedPublicRevision', 'type', 'payload']) ||
      request['schemaVersion'] !== 2 ||
      request['type'] !== 'TransferItem' ||
      !id(request['commandId']) ||
      !revision(request['expectedPublicRevision']) ||
      !record(request['payload'])
    )
      return undefined;
    const payload = request['payload'];
    if (
      !keys(payload, ['itemId', 'quantity', 'fromContainerId', 'toContainerId']) ||
      !id(payload['itemId']) ||
      !id(payload['fromContainerId']) ||
      !id(payload['toContainerId']) ||
      payload['fromContainerId'] === payload['toContainerId'] ||
      !Number.isSafeInteger(payload['quantity']) ||
      Number(payload['quantity']) < 1
    )
      return undefined;
    return request as unknown as ItemTransferAttempt;
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
  'CAPACITY',
]);
export function itemTransferResult(
  status: number,
  value: unknown,
  commandId: string,
): 'ACCEPTED' | 'UNKNOWN' | string {
  if (!record(value) || value['commandId'] !== commandId || !revision(value['publicRevision']))
    return 'UNKNOWN';
  if (status === 200 && value['ok'] === true && keys(value, ['commandId', 'ok', 'publicRevision']))
    return 'ACCEPTED';
  const code = value['code'];
  if (
    (status === 403 || status === 409) &&
    value['ok'] === false &&
    typeof code === 'string' &&
    rejectionCodes.has(code) &&
    (status === 403 ? code === 'NOT_AUTHORIZED' : code !== 'NOT_AUTHORIZED') &&
    keys(value, ['commandId', 'ok', 'publicRevision', 'code'])
  )
    return code;
  return 'UNKNOWN';
}
