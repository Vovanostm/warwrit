import { isEntityId } from '@warwrit/game-core';
import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';
import { hasExactKeys, isRecord } from '../record-guards.js';

export type PayDeceasedWagesRequest = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { readonly type: 'PayDeceasedWages' }
>;
export type PayDeceasedWagesPayload = PayDeceasedWagesRequest['payload'];

export function isPayDeceasedWagesPayload(value: unknown): value is PayDeceasedWagesPayload {
  return (
    isRecord(value) && hasExactKeys(value, ['characterId']) && isEntityId(value['characterId'])
  );
}

/** Strict command arm parser; ownership, company header and receipt replay stay in routing. */
export function parsePayDeceasedWagesRequest(value: unknown): PayDeceasedWagesRequest | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'commandId',
      'expectedPublicRevision',
      'type',
      'payload',
    ]) ||
    value['schemaVersion'] !== 2 ||
    value['type'] !== 'PayDeceasedWages' ||
    !isEntityId(value['commandId']) ||
    typeof value['expectedPublicRevision'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/u.test(value['expectedPublicRevision']) ||
    !isPayDeceasedWagesPayload(value['payload'])
  )
    return undefined;
  return value as unknown as PayDeceasedWagesRequest;
}

export function payDeceasedWagesCommandIntent(request: PayDeceasedWagesRequest) {
  return {
    type: 'PayDeceasedWages' as const,
    payload: { characterId: request.payload.characterId },
  };
}
