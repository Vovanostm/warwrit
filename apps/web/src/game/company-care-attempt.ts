import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';

export type CompanyCareAttempt = Extract<OrdinaryPlayerCompanyCommandV2Dto, { type: 'ApplyCare' }>;
export type CarePostResult = 'ACCEPTED' | 'REJECTED' | 'UNAUTHENTICATED' | 'UNKNOWN';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function readCompanyCareAttempt(
  raw: string | null,
  accountId: string,
  companyId: string,
): CompanyCareAttempt | undefined {
  if (!raw) return undefined;
  try {
    const stored: unknown = JSON.parse(raw);
    if (!isRecord(stored) || stored['accountId'] !== accountId || stored['companyId'] !== companyId)
      return undefined;
    const request = stored['request'];
    if (!isRecord(request) || request['schemaVersion'] !== 2 || request['type'] !== 'ApplyCare')
      return undefined;
    if (
      typeof request['commandId'] !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u.test(request['commandId']) ||
      typeof request['expectedPublicRevision'] !== 'string' ||
      !/^(0|[1-9][0-9]*)$/u.test(request['expectedPublicRevision']) ||
      !isRecord(request['payload'])
    )
      return undefined;
    const payload = request['payload'];
    if (
      Object.keys(payload).length !== 4 ||
      !['characterId', 'conditionId', 'providerId', 'resourceItemId'].every(
        (key) => typeof payload[key] === 'string' && payload[key] !== '',
      )
    )
      return undefined;
    return request as unknown as CompanyCareAttempt;
  } catch {
    return undefined;
  }
}

export function classifyCompanyCarePost(
  status: number,
  value: unknown,
  commandId: string,
): CarePostResult {
  if (status === 401) return 'UNAUTHENTICATED';
  if (!isRecord(value) || value['commandId'] !== commandId) return 'UNKNOWN';
  if (
    status === 200 &&
    value['ok'] === true &&
    typeof value['publicRevision'] === 'string' &&
    /^(0|[1-9][0-9]*)$/u.test(value['publicRevision'])
  )
    return 'ACCEPTED';
  if (
    (status === 409 || status === 403) &&
    value['ok'] === false &&
    typeof value['publicRevision'] === 'string' &&
    /^(0|[1-9][0-9]*)$/u.test(value['publicRevision']) &&
    typeof value['code'] === 'string' &&
    (status !== 403 || value['code'] === 'NOT_AUTHORIZED')
  )
    return 'REJECTED';
  return 'UNKNOWN';
}
