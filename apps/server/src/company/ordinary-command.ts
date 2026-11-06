import type { EconomyResult } from '@warwrit/game-core';
import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';

type OrdinaryRequest = Exclude<OrdinaryPlayerCompanyCommandV2Dto, { type: 'BuySupplies' }>;
type PreparedEconomy = Extract<EconomyResult, { kind: 'PREPARED' }>;
type OrdinaryIds = {
  readonly partyId: string | undefined;
  readonly openAgreementId: string | undefined;
  readonly meetingEvidenceId: string | undefined;
  readonly characterId: string | undefined;
};

/** Select intent from already-derived server IDs; authority and evidence stay in the executor. */
export function ordinaryCommandIntent(
  request: OrdinaryRequest,
  companyId: string,
  ids: OrdinaryIds & {
    readonly siteEligibilityId: string | undefined;
    readonly accessEvidenceId: string | undefined;
    readonly careEvidenceId: string | undefined;
    readonly careDefinitionId: string | undefined;
    readonly assignmentEvidenceId: string | undefined;
    readonly assignmentLocationId: string | undefined;
    readonly assignmentFundingPoolId: string | undefined;
    readonly offerId: string | undefined;
    readonly offerRevision: string | undefined;
  },
) {
  switch (request.type) {
    case 'PayClaims':
      return { type: request.type, payload: { ...request.payload } };
    case 'Recruit':
      return {
        type: request.type,
        payload: {
          offerId: ids.offerId,
          characterId: ids.characterId,
          companyId,
          basis: 'PAID',
          offerRevision: ids.offerRevision,
          poolId: 'local',
        },
      };
    case 'JoinFieldParty':
      return {
        type: request.type,
        payload: {
          characterId: request.payload.characterId,
          partyId: ids.partyId,
          coLocationEvidenceId: ids.meetingEvidenceId,
        },
      };
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
    case 'ApplyCare':
      return {
        type: request.type,
        payload: {
          characterId: request.payload.characterId,
          conditionId: request.payload.conditionId,
          careDefinitionId: ids.careDefinitionId,
          resourceOrProviderReceiptId: ids.careEvidenceId,
        },
      };
    case 'SetAssignment':
      return {
        type: request.type,
        payload: {
          characterId: request.payload.characterId,
          assignment: request.payload.assignment,
          locationId: ids.assignmentLocationId,
          dutyEvidenceId: ids.assignmentEvidenceId,
          fundingPoolId: ids.assignmentFundingPoolId,
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
    case 'Recruit':
      return prepared.next.lifecycle.memberships.some(
        (membership) => membership.characterId === ids.characterId && membership.endedAt === null,
      );
    case 'JoinFieldParty':
      return (
        prepared.next.lifecycle.parties.some(
          (party) => party.partyId === ids.partyId && party.location.kind === 'AT',
        ) &&
        prepared.next.lifecycle.characters.some(
          (character) =>
            character.identity.characterId === request.payload.characterId &&
            character.presence.fieldPartyId === ids.partyId,
        )
      );
    case 'EquipItem':
      return itemEquipped(prepared, request.payload);
    case 'ApplyCare':
      return (
        prepared.next.physical?.conditions.some(
          (condition) =>
            condition.conditionId === request.payload.conditionId &&
            condition.characterId === request.payload.characterId &&
            condition.care?.providerId === request.payload.providerId &&
            condition.care?.channel === 'MATERIAL',
        ) ?? false
      );
    case 'SetAssignment': {
      const character = prepared.next.lifecycle.characters.find(
        (person) => person.identity.characterId === request.payload.characterId,
      );
      return (
        character?.presence.assignment === request.payload.assignment &&
        character.presence.fieldPartyId === ids.partyId
      );
    }
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
