import { isEntityId } from '@warwrit/game-core';
import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';
import { hasExactKeys, isRecord } from '../record-guards.js';

export type PayrollRequest = Extract<OrdinaryPlayerCompanyCommandV2Dto, { type: 'PayClaims' }>;
export type PayrollPayload = PayrollRequest['payload'];

/** Validate only the V2 request shape; PayClaims remains the owner of financial policy. */
export function isPayrollPayload(value: unknown): value is PayrollPayload {
  if (!isRecord(value)) return false;
  const hasPayee = Object.hasOwn(value, 'payeeId');
  if (
    !hasExactKeys(value, [
      'poolId',
      'amountQ',
      'claimIds',
      'mode',
      ...(hasPayee ? ['payeeId'] : []),
    ]) ||
    !isEntityId(value['poolId']) ||
    typeof value['amountQ'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/u.test(value['amountQ']) ||
    BigInt(value['amountQ']) === 0n ||
    !Array.isArray(value['claimIds']) ||
    !value['claimIds'].every(isEntityId) ||
    new Set(value['claimIds']).size !== value['claimIds'].length ||
    (value['mode'] !== 'DEFAULT' && value['mode'] !== 'TARGETED')
  )
    return false;
  if (value['mode'] === 'DEFAULT') return !hasPayee && value['claimIds'].length === 0;
  return hasPayee && isEntityId(value['payeeId']);
}

export function payrollCommandIntent(request: PayrollRequest) {
  return { type: 'PayClaims' as const, payload: { ...request.payload } };
}
