import type { EconomyResult } from '@warwrit/game-core';
import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';

type OrdinaryRequest = Exclude<OrdinaryPlayerCompanyCommandV2Dto, { type: 'BuySupplies' }>;
type PreparedEconomy = Extract<EconomyResult, { kind: 'PREPARED' }>;
type OrdinaryIds = {
  readonly partyId: string | undefined;
  readonly openAgreementId: string | undefined;
};

/** Select intent from already-derived server IDs; authority and evidence stay in the executor. */
export function ordinaryCommandIntent(
  request: OrdinaryRequest,
  companyId: string,
  ids: OrdinaryIds & {
    readonly siteEligibilityId: string | undefined;
    readonly accessEvidenceId: string | undefined;
  },
) {
  switch (request.type) {
    case 'PayClaims':
      return { type: request.type, payload: { ...request.payload } };
    case 'RenameCompany':
      return {
        type: request.type,
        payload: { companyId, name: request.payload.name, bannerId: request.payload.bannerId },
      };
    case 'ChoosePerk':
      return {
        type: request.type,
        payload: {
          characterId: request.payload.characterId,
          perkId: request.payload.perkId,
          milestone: request.payload.milestone,
        },
      };
    case 'EquipItem':
      return {
        type: request.type,
        payload: {
          characterId: request.payload.characterId,
          itemId: request.payload.itemId,
          slotId: request.payload.slotId,
          accessEvidenceId: ids.accessEvidenceId,
        },
      };
    default:
      return fieldCampIntent(request, ids);
  }
}

function fieldCampIntent(
  request: Extract<OrdinaryRequest, { type: 'BeginFieldCamp' | 'EndFieldCamp' }>,
  ids: OrdinaryIds & { readonly siteEligibilityId: string | undefined },
) {
  switch (request.type) {
    case 'BeginFieldCamp':
      return {
        type: request.type,
        payload: { partyId: ids.partyId, siteEligibilityId: ids.siteEligibilityId },
      };
    case 'EndFieldCamp':
      return {
        type: 'EndMaintenance',
        payload: { agreementOrCampId: ids.openAgreementId, reason: 'LEAVE' },
      };
  }
}

/** A prepared draft is accepted only when the requested complete effect is present. */
export function ordinaryCommandSucceeded(
  request: OrdinaryRequest,
  prepared: PreparedEconomy,
  ids: OrdinaryIds,
): boolean {
  return completeOrdinaryDraft(prepared) && requestedEffectPresent(request, prepared, ids);
}

function completeOrdinaryDraft(prepared: PreparedEconomy): boolean {
  return !prepared.replayed && prepared.receipt.requirements.length === 0;
}

function requestedEffectPresent(
  request: OrdinaryRequest,
  prepared: PreparedEconomy,
  ids: OrdinaryIds,
): boolean {
  switch (request.type) {
    case 'PayClaims':
      return paymentCompleted(request, prepared);
    case 'EquipItem':
      return itemEquipped(prepared, request.payload);
    case 'RenameCompany':
    case 'ChoosePerk':
      return lifecycleChanged(prepared);
    default:
      return fieldCampChanged(request, prepared, ids);
  }
}

function paymentCompleted(
  request: Extract<OrdinaryRequest, { type: 'PayClaims' }>,
  prepared: PreparedEconomy,
): boolean {
  return (
    prepared.receipt.allocations.length > 0 &&
    prepared.receipt.allocations.reduce(
      (paid, allocation) => paid + BigInt(allocation.amountQ),
      0n,
    ) === BigInt(request.payload.amountQ)
  );
}

function fieldCampChanged(
  request: Extract<OrdinaryRequest, { type: 'BeginFieldCamp' | 'EndFieldCamp' }>,
  prepared: PreparedEconomy,
  ids: OrdinaryIds,
): boolean {
  switch (request.type) {
    case 'BeginFieldCamp':
      return prepared.next.finance.maintenance.some(
        (mode) =>
          mode.kind === 'FIELD_CAMP' && mode.partyId === ids.partyId && mode.endedAt === null,
      );
    case 'EndFieldCamp':
      return prepared.next.finance.maintenance.some(
        (mode) => mode.agreementId === ids.openAgreementId && mode.endedAt !== null,
      );
  }
}

function itemEquipped(
  prepared: PreparedEconomy,
  payload: { readonly itemId: string; readonly characterId: string },
): boolean {
  return (
    prepared.next.physical?.items.find((item) => item.itemId === payload.itemId)?.equipped
      ?.characterId === payload.characterId
  );
}

function lifecycleChanged(prepared: PreparedEconomy): boolean {
  return prepared.receipt.lifecycleReceipt !== null && prepared.receipt.events.length !== 0;
}
