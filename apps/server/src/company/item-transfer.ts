import { randomUUID } from 'node:crypto';
import { campaignTick, PHYSICAL_POLICY_VERSION } from '@warwrit/game-core';
import type { CompanyCombatAggregateState, ItemAccessEvidence } from '@warwrit/game-core';
import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';

/** Only property physically accessible to the company's available local people is actionable. */
export function itemTransferOptions(state: CompanyCombatAggregateState) {
  const root = state.economy;
  const party = root.lifecycle.parties.length === 1 ? root.lifecycle.parties[0] : undefined;
  if (!root.physical || party?.location.kind !== 'AT' || state.encounter.active) return undefined;
  const location = party.location;
  const members = new Set(
    root.lifecycle.memberships
      .filter((entry) => entry.companyId === root.lifecycle.companyId && entry.endedAt === null)
      .map((entry) => entry.characterId),
  );
  const people = root.lifecycle.characters.filter(
    (person) =>
      members.has(person.identity.characterId) &&
      person.presence.fieldPartyId === party.partyId &&
      person.presence.availability === 'AVAILABLE' &&
      person.presence.encounterBindingId === null &&
      person.presence.location.kind === 'AT' &&
      person.presence.location.siteId === location.siteId &&
      person.presence.location.areaId === location.areaId,
  );
  const operator = people[0];
  if (!operator) return undefined;
  const localIds = new Set<string>(people.map((person) => person.identity.characterId));
  const owned = (owner: { readonly kind: string; readonly id: string }) =>
    (owner.kind === 'COMPANY' && owner.id === root.lifecycle.companyId) ||
    (owner.kind === 'CHARACTER' && localIds.has(owner.id));
  const containers = root.physical.containers.filter(
    (container) =>
      container.closed === null &&
      owned(container.custodian) &&
      container.location.kind === 'AT' &&
      container.location.siteId === location.siteId &&
      container.location.areaId === location.areaId &&
      (container.carrier === null ||
        (container.carrier.kind === 'PARTY' && container.carrier.id === party.partyId) ||
        (container.carrier.kind === 'CHARACTER' && localIds.has(container.carrier.id))),
  );
  const containerIds = new Set(containers.map((container) => container.containerId));
  const items = root.physical.items.filter(
    (item) =>
      item.tombstone === null &&
      owned(item.owner) &&
      item.containerId !== null &&
      containerIds.has(item.containerId),
  );
  return { location, operatorId: operator.identity.characterId, containers, items };
}

export function itemTransferAccess(
  state: CompanyCombatAggregateState,
  payload: Extract<OrdinaryPlayerCompanyCommandV2Dto, { type: 'TransferItem' }>['payload'],
  atTick: string,
): ItemAccessEvidence | undefined {
  const options = itemTransferOptions(state);
  if (
    !options ||
    payload.fromContainerId === payload.toContainerId ||
    !options.items.some(
      (item) => item.itemId === payload.itemId && item.containerId === payload.fromContainerId,
    ) ||
    !options.containers.some((container) => container.containerId === payload.toContainerId)
  )
    return undefined;
  return {
    kind: 'ITEM_ACCESS',
    id: randomUUID(),
    worldId: state.economy.lifecycle.worldId,
    companyId: state.economy.lifecycle.companyId,
    revision: state.economy.lifecycle.revision,
    sourceEventId: randomUUID(),
    atTick: campaignTick(atTick),
    ordinal: 0,
    version: PHYSICAL_POLICY_VERSION,
    operatorId: options.operatorId,
    location: options.location,
    containerIds: [payload.fromContainerId, payload.toContainerId],
    itemIds: [payload.itemId],
    purpose: 'TRANSFER',
  };
}
