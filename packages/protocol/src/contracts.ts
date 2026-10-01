export interface FirstHuntLocationDto {
  readonly siteId: string;
  readonly areaId: string;
}

export interface FirstHuntTermsDto {
  readonly profileId: 'first-hunt-runtime-profile-2026-10-01-v1';
  readonly issuerId: string;
  readonly issuerLocation: FirstHuntLocationDto;
  readonly objectiveLocation: FirstHuntLocationDto;
  readonly rewardQ: '100000000';
  readonly claimPolicy: 'UNIQUE_CURRENT_BEARER';
  readonly maximumHelpers: 1;
}

export interface FirstHuntPickupTargetDto {
  readonly containerId: string;
  readonly label: string;
  readonly availableWeightG: string;
}

export interface FirstHuntContractViewDto {
  readonly instanceId: 'ci.m1.raider-standard.01';
  readonly definitionEdition: string;
  readonly termsDigest: string;
  readonly terms: FirstHuntTermsDto;
  readonly yourRole: 'NONE' | 'OWNER' | 'HELPER';
  readonly knownState:
    'OFFERED' | 'ACTIVE' | 'ENCOUNTER_ACTIVE' | 'PROOF_AVAILABLE' | 'PROOF_HELD' | 'SETTLED';
  readonly yourJoinIntent: boolean;
  readonly helperSlot: 'AVAILABLE' | 'OCCUPIED';
  readonly encounterId: string | null;
  readonly pickupTargets: readonly FirstHuntPickupTargetDto[];
  readonly yourProof: null | {
    readonly itemId: string;
    readonly containerId: string;
    readonly redemption: 'UNREDEEMED' | 'REDEEMED';
  };
}

export interface FirstHuntReadResponseDto {
  readonly schemaVersion: 1;
  readonly publicRevision: string;
  readonly contract: FirstHuntContractViewDto | null;
}

export type FirstHuntCommandDto =
  | {
      readonly schemaVersion: 1;
      readonly commandId: string;
      readonly expectedPublicRevision: string;
      readonly type: 'ACCEPT' | 'HELP';
      readonly payload: { readonly instanceId: string; readonly termsDigest: string };
    }
  | {
      readonly schemaVersion: 1;
      readonly commandId: string;
      readonly expectedPublicRevision: string;
      readonly type: 'LEAVE' | 'JOIN' | 'PRESENT';
      readonly payload: { readonly instanceId: string };
    }
  | {
      readonly schemaVersion: 1;
      readonly commandId: string;
      readonly expectedPublicRevision: string;
      readonly type: 'PICKUP';
      readonly payload: { readonly instanceId: string; readonly toContainerId: string };
    };

export interface FirstHuntCommandAcceptedDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly ok: true;
  readonly receiptId: string;
  readonly publicRevision: string;
}

export interface FirstHuntCommandRejectedDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly ok: false;
  readonly publicRevision: string;
  readonly code:
    | 'INVALID_COMMAND'
    | 'NOT_AUTHORIZED'
    | 'NOT_AVAILABLE'
    | 'STALE_REVISION'
    | 'TERMS_CHANGED'
    | 'INCOMPATIBLE_ACTIVITY'
    | 'CAPACITY'
    | 'INSUFFICIENT_FUNDS';
}

export type FirstHuntCommandResponseDto = FirstHuntCommandAcceptedDto | FirstHuntCommandRejectedDto;

export interface WorldTravelPreviewRequestDto {
  readonly schemaVersion: 1;
  readonly purpose: 'NEW' | 'RETURN';
  readonly edgeIds: readonly string[];
}

export interface WorldTravelPreviewResponseDto {
  readonly schemaVersion: 1;
  readonly publicRevision: string;
  readonly routeEpoch: string;
  readonly atTick: string;
  readonly purpose: 'NEW' | 'RETURN';
  readonly edgeIds: readonly string[];
  readonly knownShortage: boolean;
  readonly assumptions: readonly string[];
  readonly requiredStockUnits: string;
  readonly availableStockUnits: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;

const isDecimal = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);

export function isFirstHuntCommand(value: unknown): value is FirstHuntCommandDto {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'commandId',
      'expectedPublicRevision',
      'type',
      'payload',
    ]) ||
    value['schemaVersion'] !== 1 ||
    !isText(value['commandId']) ||
    !isDecimal(value['expectedPublicRevision']) ||
    !isRecord(value['payload']) ||
    !isText(value['payload']['instanceId'])
  )
    return false;
  const payload = value['payload'];
  switch (value['type']) {
    case 'ACCEPT':
    case 'HELP':
      return (
        hasExactKeys(value, [
          'schemaVersion',
          'commandId',
          'expectedPublicRevision',
          'type',
          'payload',
        ]) &&
        hasExactKeys(payload, ['instanceId', 'termsDigest']) &&
        isText(payload['termsDigest'])
      );
    case 'LEAVE':
    case 'JOIN':
    case 'PRESENT':
      return hasExactKeys(payload, ['instanceId']);
    case 'PICKUP':
      return (
        hasExactKeys(payload, ['instanceId', 'toContainerId']) && isText(payload['toContainerId'])
      );
    default:
      return false;
  }
}

export function isWorldTravelPreviewRequest(value: unknown): value is WorldTravelPreviewRequestDto {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['schemaVersion', 'purpose', 'edgeIds']) &&
    value['schemaVersion'] === 1 &&
    (value['purpose'] === 'NEW' || value['purpose'] === 'RETURN') &&
    Array.isArray(value['edgeIds']) &&
    value['edgeIds'].length > 0 &&
    value['edgeIds'].length <= 16 &&
    value['edgeIds'].every(isText)
  );
}

export function isFirstHuntReadResponse(value: unknown): value is FirstHuntReadResponseDto {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['schemaVersion', 'publicRevision', 'contract']) ||
    value['schemaVersion'] !== 1 ||
    !isDecimal(value['publicRevision'])
  )
    return false;
  if (value['contract'] === null) return true;
  const contract = value['contract'];
  if (
    !isRecord(contract) ||
    !hasExactKeys(contract, [
      'instanceId',
      'definitionEdition',
      'termsDigest',
      'terms',
      'yourRole',
      'knownState',
      'yourJoinIntent',
      'helperSlot',
      'encounterId',
      'pickupTargets',
      'yourProof',
    ]) ||
    contract['instanceId'] !== 'ci.m1.raider-standard.01' ||
    !isText(contract['definitionEdition']) ||
    !isText(contract['termsDigest']) ||
    !isRecord(contract['terms']) ||
    !hasExactKeys(contract['terms'], [
      'profileId',
      'issuerId',
      'issuerLocation',
      'objectiveLocation',
      'rewardQ',
      'claimPolicy',
      'maximumHelpers',
    ]) ||
    contract['terms']['profileId'] !== 'first-hunt-runtime-profile-2026-10-01-v1' ||
    !isText(contract['terms']['issuerId']) ||
    !isLocation(contract['terms']['issuerLocation']) ||
    !isLocation(contract['terms']['objectiveLocation']) ||
    contract['terms']['rewardQ'] !== '100000000' ||
    contract['terms']['claimPolicy'] !== 'UNIQUE_CURRENT_BEARER' ||
    contract['terms']['maximumHelpers'] !== 1 ||
    !['NONE', 'OWNER', 'HELPER'].includes(String(contract['yourRole'])) ||
    !['OFFERED', 'ACTIVE', 'ENCOUNTER_ACTIVE', 'PROOF_AVAILABLE', 'PROOF_HELD', 'SETTLED'].includes(
      String(contract['knownState']),
    ) ||
    typeof contract['yourJoinIntent'] !== 'boolean' ||
    !['AVAILABLE', 'OCCUPIED'].includes(String(contract['helperSlot'])) ||
    (contract['encounterId'] !== null && !isText(contract['encounterId'])) ||
    !Array.isArray(contract['pickupTargets']) ||
    !contract['pickupTargets'].every(
      (target) =>
        isRecord(target) &&
        hasExactKeys(target, ['containerId', 'label', 'availableWeightG']) &&
        isText(target['containerId']) &&
        isText(target['label']) &&
        isDecimal(target['availableWeightG']),
    )
  )
    return false;
  if (contract['yourProof'] === null) return true;
  return (
    isRecord(contract['yourProof']) &&
    hasExactKeys(contract['yourProof'], ['itemId', 'containerId', 'redemption']) &&
    isText(contract['yourProof']['itemId']) &&
    isText(contract['yourProof']['containerId']) &&
    (contract['yourProof']['redemption'] === 'UNREDEEMED' ||
      contract['yourProof']['redemption'] === 'REDEEMED')
  );
}

function isLocation(value: unknown): value is FirstHuntLocationDto {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['siteId', 'areaId']) &&
    isText(value['siteId']) &&
    isText(value['areaId'])
  );
}
