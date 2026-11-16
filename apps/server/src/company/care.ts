import { randomUUID } from 'node:crypto';
import {
  COMPANY_CATALOGUE,
  PHYSICAL_POLICY_VERSION,
  campaignTick,
  canPerform,
  skillLevel,
} from '@warwrit/game-core';
import type { CareFulfillmentEvidence, CompanyCombatAggregateState } from '@warwrit/game-core';
import type { CompanyHoldingsDto, OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';

type CareOptions = NonNullable<CompanyHoldingsDto['care']>;
type CareRequest = Extract<OrdinaryPlayerCompanyCommandV2Dto, { type: 'ApplyCare' }>['payload'];

function sameAtPlace(
  a: { readonly kind: string; readonly siteId?: string; readonly areaId?: string },
  b: { readonly kind: string; readonly siteId?: string; readonly areaId?: string },
) {
  return a.kind === 'AT' && b.kind === 'AT' && a.siteId === b.siteId && a.areaId === b.areaId;
}

/** Derive care only from owner-known untreated instances and material at the patient's place. */
export function companyCareOptions(state: CompanyCombatAggregateState): CareOptions {
  const root = state.economy;
  const physical = root.physical;
  if (!physical || state.encounter.active) return { treatments: [] };

  const members = new Set<string>(
    root.lifecycle.memberships
      .filter((entry) => entry.companyId === root.lifecycle.companyId && entry.endedAt === null)
      .map((entry) => entry.characterId),
  );
  const known = new Set(
    physical.knowledge.conditionSnapshots
      .filter((condition) => condition.resolvedAt === null)
      .map((condition) => condition.conditionId),
  );
  const companyCustody = (owner: { readonly kind: string; readonly id: string }) =>
    (owner.kind === 'COMPANY' && owner.id === root.lifecycle.companyId) ||
    (owner.kind === 'CHARACTER' && members.has(owner.id));

  const treatments = physical.conditions.flatMap((condition) => {
    const definition = COMPANY_CATALOGUE.conditions.find(
      (entry) => entry.id === condition.definitionId,
    );
    const patient = root.lifecycle.characters.find(
      (entry) => entry.identity.characterId === condition.characterId,
    );
    if (
      !known.has(condition.conditionId) ||
      !members.has(condition.characterId) ||
      condition.resolvedAt !== null ||
      condition.care !== null ||
      !definition?.careId ||
      !['wound-care', 'stabilize'].includes(definition.careId) ||
      !patient ||
      patient.presence.availability === 'DEAD' ||
      patient.presence.location.kind !== 'AT'
    )
      return [];

    const location = patient.presence.location;
    const providers = root.lifecycle.characters.filter(
      (provider) =>
        members.has(provider.identity.characterId) &&
        provider.presence.availability === 'AVAILABLE' &&
        provider.presence.encounterBindingId === null &&
        provider.presence.location.kind === 'AT' &&
        sameAtPlace(provider.presence.location, location) &&
        canPerform(provider, 'basicWork') &&
        skillLevel(provider.skills['medicine'] ?? 0) > 0,
    );
    if (providers.length === 0) return [];

    const localParties = new Set(
      root.lifecycle.parties
        .filter((party) => party.location.kind === 'AT' && sameAtPlace(party.location, location))
        .map((party) => party.partyId),
    );
    const localCharacters = new Set<string>(
      root.lifecycle.characters
        .filter(
          (person) =>
            members.has(person.identity.characterId) &&
            person.presence.location.kind === 'AT' &&
            sameAtPlace(person.presence.location, location),
        )
        .map((person) => person.identity.characterId),
    );
    const localContainers = new Set(
      physical.containers
        .filter(
          (container) =>
            container.closed === null &&
            companyCustody(container.custodian) &&
            container.access === 'COMPANY' &&
            container.location.kind === 'AT' &&
            sameAtPlace(container.location, location) &&
            (container.carrier === null ||
              (container.carrier.kind === 'PARTY' && localParties.has(container.carrier.id)) ||
              (container.carrier.kind === 'CHARACTER' &&
                localCharacters.has(container.carrier.id))),
        )
        .map((container) => container.containerId),
    );
    const materials = physical.items.flatMap((item) => {
      const itemDefinition = COMPANY_CATALOGUE.items.find(
        (entry) => entry.id === item.definitionId,
      );
      if (
        item.tombstone !== null ||
        item.quantity < 1 ||
        item.owner.kind !== 'COMPANY' ||
        item.owner.id !== root.lifecycle.companyId ||
        !item.containerId ||
        !localContainers.has(item.containerId) ||
        !itemDefinition?.enabled ||
        itemDefinition.kind !== 'consumable' ||
        !itemDefinition.careIds?.includes(definition.careId!)
      )
        return [];
      return [{ itemId: item.itemId, definitionId: item.definitionId, quantity: item.quantity }];
    });
    if (materials.length === 0) return [];
    return [
      {
        characterId: condition.characterId,
        conditionId: condition.conditionId,
        definitionId: condition.definitionId,
        careDefinitionId: definition.careId,
        providers: providers.map((provider) => ({ characterId: provider.identity.characterId })),
        materials,
      },
    ];
  });

  return { treatments };
}

/** The server authors the material fulfillment from the same finite local options. */
export function prepareCompanyCareFulfillment(
  state: CompanyCombatAggregateState,
  request: CareRequest,
  worldId: string,
  atTick: string,
): CareFulfillmentEvidence | undefined {
  const treatment = companyCareOptions(state).treatments.find(
    (entry) =>
      entry.characterId === request.characterId && entry.conditionId === request.conditionId,
  );
  if (
    !treatment ||
    !treatment.providers.some((provider) => provider.characterId === request.providerId) ||
    !treatment.materials.some((material) => material.itemId === request.resourceItemId)
  )
    return undefined;
  const condition = state.economy.physical?.conditions.find(
    (entry) => entry.conditionId === treatment.conditionId,
  );
  const patient = state.economy.lifecycle.characters.find(
    (entry) => entry.identity.characterId === request.characterId,
  );
  if (
    !condition ||
    !patient ||
    patient.presence.location.kind !== 'AT' ||
    (condition.deadlineTick !== null && BigInt(atTick) > BigInt(condition.deadlineTick))
  )
    return undefined;
  return {
    kind: 'CARE_FULFILLMENT',
    id: randomUUID(),
    worldId,
    companyId: state.economy.lifecycle.companyId,
    revision: state.economy.lifecycle.revision,
    sourceEventId: randomUUID(),
    atTick: campaignTick(atTick),
    ordinal: 0,
    version: PHYSICAL_POLICY_VERSION,
    characterId: treatment.characterId,
    conditionId: treatment.conditionId,
    careDefinitionId: treatment.careDefinitionId,
    providerId: request.providerId,
    location: patient.presence.location,
    channel: 'MATERIAL',
    resourceItemId: request.resourceItemId,
    resourceContainerId: state.economy.physical!.items.find(
      (entry) => entry.itemId === request.resourceItemId,
    )!.containerId!,
    practiceChallengeLevel: treatment.careDefinitionId === 'wound-care' ? 5 : 10,
  };
}
