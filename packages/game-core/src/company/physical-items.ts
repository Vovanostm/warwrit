import { COMPANY_CATALOGUE } from './definitions.js';
import { canonicalJson } from './input.js';
import { activeMembership, person, sameLocation } from './lifecycle-state.js';
import {
  availableContainerG,
  containerWeightG,
  itemDefinition,
  ownPhysical,
  physicalContainer,
  physicalFact,
  physicalId,
  physicalItem,
  recordPhysicalSource,
  replaceContainer,
  replaceItem,
  requireItemAccess,
  requirePhysical,
  uniquePhysicalFact,
} from './physical-state.js';
import { payPhysicalProvider } from './physical-payments.js';
import type { CommandOf } from './lifecycle-types.js';
import type { EconomyContext, EconomyRequirement } from './economy-types.js';
import type {
  CompanyPhysicalState,
  EquipmentSlot,
  ItemInstance,
  OwnershipAuthorizationEvidence,
  PhysicalContainer,
} from './physical-types.js';
import { PHYSICAL_RULES } from './physical-types.js';
import type { MaterializedCompanyState, PhysicalChange } from './physical-root-types.js';

function itemWeight(item: ItemInstance, quantity = item.quantity): number {
  return itemDefinition(item).weightG * quantity;
}
function changeOwner(
  item: ItemInstance,
  authorization: OwnershipAuthorizationEvidence | undefined,
): ItemInstance {
  if (!authorization) return item;
  requirePhysical(
    canonicalJson(authorization.fromOwner) === canonicalJson(item.owner) &&
      authorization.itemId === item.itemId &&
      authorization.quantity === item.quantity,
    'INVALID_SOURCE',
  );
  return { ...item, owner: ownPhysical(authorization.toOwner) };
}
function ownershipAuthorization(
  context: EconomyContext,
  id: string | undefined,
  item: ItemInstance,
  operation?: OwnershipAuthorizationEvidence['operation'],
): OwnershipAuthorizationEvidence | undefined {
  if (!id) return undefined;
  const fact = physicalFact(context, id, 'OWNERSHIP_AUTHORIZATION');
  requirePhysical(
    fact.itemId === item.itemId &&
      Number.isSafeInteger(fact.quantity) &&
      fact.quantity > 0 &&
      canonicalJson(fact.fromOwner) === canonicalJson(item.owner) &&
      (!operation || fact.operation === operation),
    'INVALID_SOURCE',
  );
  return fact;
}
function splitOrMove(
  state: CompanyPhysicalState,
  item: ItemInstance,
  quantity: number,
  destinationId: string,
  commandId: string,
  authorization?: OwnershipAuthorizationEvidence,
): CompanyPhysicalState {
  requirePhysical(
    quantity > 0 && quantity <= item.quantity && item.containerId !== null,
    'INVALID_ARGUMENT',
  );
  const destination = physicalContainer(state, destinationId);
  requirePhysical(
    availableContainerG(state, destinationId) >= itemWeight(item, quantity),
    'CAPACITY',
  );
  if (quantity === item.quantity) {
    const moved = changeOwner(
      { ...item, containerId: destination.containerId, equipped: null },
      authorization,
    );
    return replaceItem(state, moved);
  }
  const childId = physicalId(commandId, item.itemId, 'split');
  requirePhysical(!state.items.some((entry) => entry.itemId === childId), 'IDEMPOTENCY_CONFLICT');
  const remainder = { ...item, quantity: item.quantity - quantity };
  const child = changeOwner(
    {
      ...item,
      itemId: childId,
      containerId: destination.containerId,
      quantity,
      equipped: null,
      provenance: {
        sourceId: item.provenance.sourceId,
        parentItemId: item.itemId,
        ordinal: item.provenance.ordinal + 1,
      },
    },
    authorization ? { ...authorization, itemId: childId, fromOwner: item.owner } : undefined,
  );
  return {
    ...state,
    items: state.items
      .map((entry) => (entry.itemId === item.itemId ? remainder : entry))
      .concat(child),
  };
}
function knownItemMutation(
  physical: CompanyPhysicalState,
  itemIds: readonly string[],
  containerIds: readonly string[],
): CompanyPhysicalState {
  const itemSet = new Set(itemIds);
  const containerSet = new Set(containerIds);
  const items = physical.items.filter((item) => itemSet.has(item.itemId));
  const containers = physical.containers.filter((container) =>
    containerSet.has(container.containerId),
  );
  return {
    ...physical,
    knowledge: {
      ...physical.knowledge,
      itemSnapshots: [
        ...physical.knowledge.itemSnapshots.filter((item) => !itemSet.has(item.itemId)),
        ...ownPhysical(items),
      ],
      containerSnapshots: [
        ...physical.knowledge.containerSnapshots.filter(
          (container) => !containerSet.has(container.containerId),
        ),
        ...ownPhysical(containers),
      ],
    },
  };
}
export function transferItem(
  root: MaterializedCompanyState,
  command: CommandOf<'TransferItem'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const item = physicalItem(root.physical, p.itemId);
  if (item.equipped !== null) {
    const wearer = person(root.lifecycle, item.equipped.characterId);
    requirePhysical(
      wearer.presence.availability !== 'IN_ENCOUNTER' &&
        wearer.presence.encounterBindingId === null,
      'INCOMPATIBLE_ACTIVITY',
    );
  }
  requirePhysical(item.containerId === p.fromContainerId, 'CONTACT_OR_ACCESS_REQUIRED');
  requireItemAccess(
    root,
    context,
    p.accessEvidenceId,
    'TRANSFER',
    [p.fromContainerId, p.toContainerId],
    [p.itemId],
  );
  const authorization = ownershipAuthorization(context, p.ownershipReceiptId, item);
  requirePhysical(!authorization || authorization.quantity === p.quantity, 'INVALID_SOURCE');
  let physical = splitOrMove(
    root.physical,
    item,
    p.quantity,
    p.toContainerId,
    command.commandId,
    authorization,
  );
  if (authorization) {
    const recorded = recordPhysicalSource(physical, authorization);
    requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
    physical = recorded.state;
  }
  requirePartyTransportCapacity(root, physical);
  const affected = [
    p.itemId,
    ...(p.quantity < item.quantity ? [physicalId(command.commandId, p.itemId, 'split')] : []),
  ];
  physical = knownItemMutation(physical, affected, [p.fromContainerId, p.toContainerId]);
  return { ...root, physical, requirements: [] };
}
function bodyFor(root: MaterializedCompanyState, characterId: string) {
  const character = person(root.lifecycle, characterId);
  const species = COMPANY_CATALOGUE.species.find(
    (entry) => entry.id === character.identity.speciesId && entry.enabled,
  );
  const body = species && COMPANY_CATALOGUE.bodies.find((entry) => entry.id === species.bodyId);
  requirePhysical(body, 'INVALID_STATE');
  return body;
}
/** Personal packs and shared supply use the same finite carriers, not two allowances. */
function requirePartyTransportCapacity(
  root: MaterializedCompanyState,
  physical: CompanyPhysicalState,
): void {
  for (const party of root.lifecycle.parties) {
    const carriers = root.lifecycle.characters.filter(
      (p) => p.presence.fieldPartyId === party.partyId,
    );
    const ids = new Set<string>(carriers.map((p) => p.identity.characterId));
    const capacity = carriers.reduce(
      (sum, p) => sum + bodyFor(root, p.identity.characterId).capacityG,
      0,
    );
    const weight = (state: CompanyPhysicalState) =>
      state.containers
        .filter(
          (c) =>
            c.closed === null &&
            (c.carrier?.kind === 'PARTY'
              ? c.carrier.id === party.partyId
              : c.carrier?.kind === 'CHARACTER' && ids.has(c.carrier.id)),
        )
        .reduce((sum, c) => sum + containerWeightG(state, c.containerId), 0);
    const next = weight(physical);
    // Fate and departures may leave a load over capacity. Do not delete it or block unloading.
    requirePhysical(
      Number.isSafeInteger(next) && (next <= capacity || next <= weight(root.physical)),
      'CAPACITY',
    );
  }
}

export function equipItem(
  root: MaterializedCompanyState,
  command: CommandOf<'EquipItem'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const character = person(root.lifecycle, p.characterId);
  requirePhysical(
    activeMembership(root.lifecycle, p.characterId)?.companyId === root.lifecycle.companyId &&
      character.presence.availability === 'AVAILABLE' &&
      character.presence.encounterBindingId === null,
    'INCOMPATIBLE_ACTIVITY',
  );
  const item = physicalItem(root.physical, p.itemId);
  requirePhysical(item.containerId !== null, 'CONTACT_OR_ACCESS_REQUIRED');
  requireItemAccess(root, context, p.accessEvidenceId, 'EQUIP', [item.containerId], [item.itemId]);
  const container = physicalContainer(root.physical, item.containerId);
  requirePhysical(
    container.carrier?.kind === 'CHARACTER' && container.carrier.id === p.characterId,
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const definition = itemDefinition(item);
  const body = bodyFor(root, p.characterId);
  requirePhysical(body.slots.includes(p.slotId), 'INVALID_ARGUMENT');
  requirePhysical(
    definition.slot !== undefined && definition.slot === p.slotId,
    'INVALID_ARGUMENT',
  );
  const slots: readonly EquipmentSlot[] =
    definition.hands === 2 ? ['MAIN_HAND', 'OFF_HAND'] : [p.slotId];
  if (p.slotId === 'BELT')
    requirePhysical(
      root.physical.items.filter(
        (entry) =>
          entry.itemId !== item.itemId &&
          entry.equipped?.characterId === p.characterId &&
          entry.equipped.slots.includes('BELT'),
      ).length < body.beltSlots,
      'CAPACITY',
    );
  const physical = knownItemMutation(
    {
      ...root.physical,
      items: root.physical.items.map((entry) => {
        if (entry.itemId === item.itemId)
          return { ...entry, equipped: { characterId: p.characterId, slots: [...slots] } };
        if (
          entry.equipped?.characterId === p.characterId &&
          entry.equipped.slots.some((slot) => slots.includes(slot))
        )
          return { ...entry, equipped: null };
        return entry;
      }),
    },
    root.physical.items
      .filter(
        (entry) =>
          entry.itemId === item.itemId ||
          (entry.equipped?.characterId === p.characterId &&
            entry.equipped.slots.some((slot) => slots.includes(slot))),
      )
      .map((entry) => entry.itemId),
    [item.containerId],
  );
  return { ...root, physical, requirements: [] };
}
export function consumePhysicalQuantity(
  physical: CompanyPhysicalState,
  itemId: string,
  quantity: number,
  sourceId: string,
  causeId: string,
  atTick: typeof physical.processedTick,
): CompanyPhysicalState {
  const item = physicalItem(physical, itemId);
  requirePhysical(quantity > 0 && quantity <= item.quantity, 'INSUFFICIENT_ITEMS');
  if (quantity < item.quantity)
    return replaceItem(physical, { ...item, quantity: item.quantity - quantity });
  return replaceItem(physical, {
    ...item,
    containerId: null,
    equipped: null,
    tombstone: { sourceId, causeId, atTick },
  });
}
function repairWithMaterials(
  root: MaterializedCompanyState,
  command: CommandOf<'RepairItem'>,
  context: EconomyContext,
): {
  readonly physical: CompanyPhysicalState;
  readonly points: number;
  readonly consumedItemIds: readonly string[];
} {
  const target = physicalItem(root.physical, command.payload.itemId);
  requirePhysical(target.containerId !== null, 'CONTACT_OR_ACCESS_REQUIRED');
  const access = uniquePhysicalFact(
    context,
    'ITEM_ACCESS',
    (fact) =>
      fact.purpose === 'REPAIR' &&
      fact.containerIds.includes(command.payload.materialsContainerId) &&
      fact.containerIds.includes(target.containerId!) &&
      fact.itemIds.includes(target.itemId),
  );
  requireItemAccess(
    root,
    context,
    access.id,
    'REPAIR',
    [command.payload.materialsContainerId, target.containerId],
    [target.itemId],
  );
  const candidates = root.physical.items
    .filter(
      (entry) =>
        entry.containerId === command.payload.materialsContainerId &&
        entry.tombstone === null &&
        itemDefinition(entry).repairArmorPoints !== undefined,
    )
    .sort((a, b) => (a.itemId < b.itemId ? -1 : 1));
  let needed = command.payload.repairUnits;
  let points = 0;
  let physical = root.physical;
  const consumedItemIds: string[] = [];
  for (const candidate of candidates) {
    if (needed === 0) break;
    const take = Math.min(needed, candidate.quantity);
    const definition = itemDefinition(candidate);
    points += take * (definition.repairArmorPoints ?? 0);
    consumedItemIds.push(candidate.itemId);
    physical = consumePhysicalQuantity(
      physical,
      candidate.itemId,
      take,
      command.commandId,
      'REPAIR_MATERIAL',
      context.atTick,
    );
    needed -= take;
  }
  requirePhysical(needed === 0 && points > 0, 'INSUFFICIENT_ITEMS');
  return { physical, points, consumedItemIds };
}
export function repairItem(
  root: MaterializedCompanyState,
  command: CommandOf<'RepairItem'>,
  context: EconomyContext,
): PhysicalChange {
  const target = physicalItem(root.physical, command.payload.itemId);
  const definition = itemDefinition(target);
  requirePhysical(
    definition.maxArmor !== undefined && target.currentCondition < target.maximumCondition,
    'INVALID_ARGUMENT',
  );
  requirePhysical(
    target.equipped === null ||
      person(root.lifecycle, target.equipped.characterId).presence.encounterBindingId === null,
    'INCOMPATIBLE_ACTIVITY',
  );
  let physical = root.physical;
  let finance = root.finance;
  let points: number;
  let consumedItemIds: readonly string[] = [];
  if (command.payload.serviceReceiptId) {
    const service = physicalFact(context, command.payload.serviceReceiptId, 'REPAIR_SERVICE');
    requirePhysical(
      target.containerId !== null &&
        service.itemId === target.itemId &&
        service.targetContainerId === target.containerId &&
        service.materialsContainerId === command.payload.materialsContainerId &&
        service.repairPoints > 0 &&
        physicalContainer(physical, target.containerId).location.kind === 'AT' &&
        sameLocation(physicalContainer(physical, target.containerId).location, service.location),
      'INVALID_SOURCE',
    );
    const recorded = recordPhysicalSource(physical, service);
    requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
    physical = recorded.state;
    finance = payPhysicalProvider({ ...root, physical }, context, {
      poolId: service.poolId,
      providerWalletId: service.providerWalletId,
      moneyAccessEvidenceId: service.moneyAccessEvidenceId,
      providerId: service.providerId,
      location: service.location,
      amountQ: service.amountQ,
      movementId: physicalId(command.commandId, 'repair-payment'),
      purpose: 'REPAIR',
    });
    points = service.repairPoints;
  } else {
    const material = repairWithMaterials({ ...root, physical }, command, context);
    physical = material.physical;
    points = material.points;
    consumedItemIds = material.consumedItemIds;
  }
  const current = physicalItem(physical, target.itemId);
  physical = replaceItem(physical, {
    ...current,
    currentCondition: Math.min(current.maximumCondition, current.currentCondition + points),
  });
  physical = knownItemMutation(
    physical,
    [target.itemId, ...consumedItemIds],
    [command.payload.materialsContainerId],
  );
  return { lifecycle: root.lifecycle, finance, physical, requirements: [] };
}
export function claimLoot(
  root: MaterializedCompanyState,
  command: CommandOf<'ClaimLoot'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const authorization = physicalFact(context, p.claimAuthorizationId, 'LOOT_AUTHORIZATION');
  requirePhysical(
    authorization.outcomeId === p.outcomeId &&
      p.itemQuantities.every((entry) => authorization.itemIds.includes(entry.itemId)),
    'INVALID_SOURCE',
  );
  requireItemAccess(
    root,
    context,
    p.accessEvidenceId,
    'LOOT',
    [p.toContainerId, ...authorization.fromContainerIds],
    p.itemQuantities.map((entry) => entry.itemId),
  );
  const recorded = recordPhysicalSource(root.physical, authorization);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  let physical = recorded.state;
  const totalWeight = p.itemQuantities.reduce((sum, entry) => {
    const item = physicalItem(physical, entry.itemId);
    requirePhysical(
      item.containerId !== null && authorization.fromContainerIds.includes(item.containerId),
      'INVALID_SOURCE',
    );
    return sum + itemWeight(item, entry.quantity);
  }, 0);
  requirePhysical(availableContainerG(physical, p.toContainerId) >= totalWeight, 'CAPACITY');
  const affected: string[] = [];
  for (const entry of p.itemQuantities) {
    const item = physicalItem(physical, entry.itemId);
    const ownerFact: OwnershipAuthorizationEvidence = {
      ...authorization,
      kind: 'OWNERSHIP_AUTHORIZATION',
      id: physicalId(authorization.id, entry.itemId, 'loot-owner'),
      itemId: entry.itemId,
      quantity: entry.quantity,
      fromOwner: item.owner,
      toOwner: authorization.ownerAfter,
      operation: 'LOOT',
    };
    physical = splitOrMove(
      physical,
      item,
      entry.quantity,
      p.toContainerId,
      command.commandId,
      ownerFact,
    );
    affected.push(entry.itemId);
    if (entry.quantity < item.quantity)
      affected.push(physicalId(command.commandId, entry.itemId, 'split'));
  }
  requirePartyTransportCapacity(root, physical);
  physical = knownItemMutation(physical, affected, [
    p.toContainerId,
    ...authorization.fromContainerIds,
  ]);
  return { ...root, physical, requirements: [] };
}
export function applyContainerLifecycle(
  root: MaterializedCompanyState,
  command: CommandOf<'ApplyContainerLifecycle'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const fact = physicalFact(context, p.receiptId, 'CONTAINER_DISPOSITION');
  requirePhysical(
    fact.sourceEventId === command.sourceEventId &&
      fact.containerId === p.containerId &&
      fact.causeId === p.causeId &&
      fact.notBefore === p.notBefore &&
      fact.disposition === p.disposition &&
      fact.destinationId === p.destinationId &&
      BigInt(context.atTick) >= BigInt(fact.notBefore),
    'INVALID_SOURCE',
  );
  const recorded = recordPhysicalSource(root.physical, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  let physical = recorded.state;
  const container = physicalContainer(physical, p.containerId);
  const items = physical.items.filter(
    (item) => item.containerId === container.containerId && item.tombstone === null,
  );
  if (p.disposition === 'TRANSFER') {
    requirePhysical(p.destinationId !== undefined, 'INVALID_ARGUMENT');
    const destination = physicalContainer(physical, p.destinationId);
    requirePhysical(
      container.location.kind === 'AT' && sameLocation(container.location, destination.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    requirePhysical(
      availableContainerG(physical, destination.containerId) >=
        items.reduce((sum, item) => sum + itemWeight(item), 0),
      'CAPACITY',
    );
    physical = {
      ...physical,
      items: physical.items.map((item) =>
        item.containerId === container.containerId
          ? { ...item, containerId: destination.containerId, equipped: null }
          : item,
      ),
    };
  } else {
    physical = {
      ...physical,
      items: physical.items.map((item) =>
        item.containerId === container.containerId
          ? {
              ...item,
              containerId: null,
              equipped: null,
              tombstone: {
                sourceId: fact.sourceEventId,
                causeId: fact.causeId,
                atTick: context.atTick,
              },
            }
          : item,
      ),
    };
  }
  physical = replaceContainer(physical, {
    ...container,
    closed: { sourceId: fact.sourceEventId, causeId: fact.causeId, atTick: context.atTick },
  });
  return { ...root, physical, requirements: [] };
}
function itemMaximumCondition(definitionId: string): number {
  const definition = COMPANY_CATALOGUE.items.find(
    (entry) => entry.id === definitionId && entry.enabled,
  );
  requirePhysical(definition, 'INVALID_SOURCE');
  return definition.maxArmor ?? PHYSICAL_RULES.defaultConditionMaximum;
}
function carriedContainer(
  root: MaterializedCompanyState,
  holderId: string,
  sourceId: string,
): PhysicalContainer {
  const character = root.lifecycle.characters.find(
    (entry) => entry.identity.characterId === holderId,
  );
  if (character) {
    const body = bodyFor(root, holderId);
    return {
      containerId: physicalId(sourceId, holderId, 'carry'),
      kind: 'CARRIED',
      location: ownPhysical(character.presence.location),
      custodian: { kind: 'CHARACTER', id: holderId },
      carrier: { kind: 'CHARACTER', id: holderId },
      capacityG: body.capacityG,
      access: 'OWNER',
      closed: null,
    };
  }
  const party = root.lifecycle.parties.find((entry) => entry.partyId === holderId);
  requirePhysical(party, 'INVALID_SOURCE');
  const members = root.lifecycle.characters.filter(
    (entry) => entry.presence.fieldPartyId === party.partyId,
  );
  const capacityG = members.reduce(
    (sum, member) => sum + bodyFor(root, member.identity.characterId).capacityG,
    0,
  );
  return {
    containerId: physicalId(sourceId, holderId, 'party-supply'),
    kind: 'PARTY_SUPPLY',
    location: ownPhysical(party.location),
    custodian: { kind: 'COMPANY', id: root.lifecycle.companyId },
    carrier: { kind: 'PARTY', id: party.partyId },
    capacityG,
    access: 'COMPANY',
    closed: null,
  };
}
export function materializeOpeningItems(
  root: MaterializedCompanyState,
  requirement: Extract<EconomyRequirement, { kind: 'OPENING_NONFINANCIAL' }>,
  sourceId: string,
): { readonly physical: CompanyPhysicalState; readonly residual: EconomyRequirement } {
  let physical = root.physical;
  const holderIds = [...new Set(requirement.items.map((item) => item.holderId))];
  for (const holderId of holderIds) {
    const container = carriedContainer({ ...root, physical }, holderId, sourceId);
    if (!physical.containers.some((entry) => entry.containerId === container.containerId))
      physical = { ...physical, containers: [...physical.containers, container] };
  }
  for (const item of requirement.items) {
    requirePhysical(
      !physical.items.some((entry) => entry.itemId === item.id),
      'IDEMPOTENCY_CONFLICT',
    );
    const container = carriedContainer({ ...root, physical }, item.holderId, sourceId);
    const instance: ItemInstance = {
      itemId: item.id,
      definitionId: item.definitionId,
      owner: { kind: 'COMPANY', id: item.ownerCompanyId },
      containerId: container.containerId,
      quantity: item.quantity,
      currentCondition: itemMaximumCondition(item.definitionId),
      maximumCondition: itemMaximumCondition(item.definitionId),
      contentRevision: '1',
      provenance: { sourceId, parentItemId: null, ordinal: 0 },
      equipped: null,
      tombstone: null,
    };
    requirePhysical(
      availableContainerG(physical, container.containerId) >= itemWeight(instance),
      'CAPACITY',
    );
    physical = { ...physical, items: [...physical.items, instance] };
  }
  requirePartyTransportCapacity(root, physical);
  const holderContainerIds = holderIds.map(
    (holderId) => carriedContainer({ ...root, physical }, holderId, sourceId).containerId,
  );
  physical = knownItemMutation(
    physical,
    requirement.items.map((item) => item.id),
    holderContainerIds,
  );
  return {
    physical,
    residual: {
      ...requirement,
      items: [],
    },
  };
}
export function settleRecruitItems(
  root: MaterializedCompanyState,
  requirement: Extract<EconomyRequirement, { kind: 'RECRUIT_ITEMS' }>,
  context: EconomyContext,
): CompanyPhysicalState {
  let physical = root.physical;
  for (const itemId of requirement.itemIds) {
    const fact = uniquePhysicalFact(
      context,
      'RECRUIT_ITEM',
      (candidate) =>
        candidate.membershipId === requirement.membershipId && candidate.itemId === itemId,
    );
    const item = physicalItem(physical, itemId);
    requirePhysical(
      item.containerId === fact.fromContainerId &&
        canonicalJson(item.owner) === canonicalJson(fact.offeredOwner),
      'INVALID_SOURCE',
    );
    const membership = root.lifecycle.memberships.find(
      (entry) => entry.membershipId === requirement.membershipId,
    );
    requirePhysical(membership, 'INVALID_STATE');
    const recruit = person(root.lifecycle, membership.characterId);
    const source = physicalContainer(physical, fact.fromContainerId);
    const destination = physicalContainer(physical, fact.toContainerId);
    requirePhysical(
      recruit.presence.location.kind === 'AT' &&
        sameLocation(recruit.presence.location, source.location) &&
        sameLocation(source.location, destination.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    const recorded = recordPhysicalSource(physical, fact);
    requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
    physical = recorded.state;
    physical = splitOrMove(physical, item, item.quantity, fact.toContainerId, fact.id);
  }
  requirePartyTransportCapacity(root, physical);
  return knownItemMutation(physical, requirement.itemIds, []);
}
export function returnCompanyItemsForDeparture(
  root: MaterializedCompanyState,
  characterId: string,
  returnContainerId: string,
  sourceId: string,
  _context: EconomyContext,
): CompanyPhysicalState {
  const character = person(root.lifecycle, characterId);
  const destination = physicalContainer(root.physical, returnContainerId);
  requirePhysical(
    character.presence.location.kind === 'AT' &&
      destination.location.kind === 'AT' &&
      sameLocation(character.presence.location, destination.location) &&
      destination.custodian.kind === 'COMPANY' &&
      destination.custodian.id === root.lifecycle.companyId,
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const carried = root.physical.containers.filter(
    (container) => container.carrier?.kind === 'CHARACTER' && container.carrier.id === characterId,
  );
  const returns = root.physical.items.filter(
    (item) =>
      item.tombstone === null &&
      item.owner.kind === 'COMPANY' &&
      item.owner.id === root.lifecycle.companyId &&
      item.containerId !== null &&
      carried.some((container) => container.containerId === item.containerId),
  );
  const totalWeight = returns.reduce((sum, item) => sum + itemWeight(item), 0);
  let targetId = returnContainerId;
  let physical = root.physical;
  if (availableContainerG(physical, returnContainerId) < totalWeight) {
    targetId = physicalId(sourceId, characterId, 'overflow-bundle');
    requirePhysical(
      !physical.containers.some((container) => container.containerId === targetId),
      'IDEMPOTENCY_CONFLICT',
    );
    physical = {
      ...physical,
      containers: [
        ...physical.containers,
        {
          containerId: targetId,
          kind: 'GROUND_BUNDLE',
          location: ownPhysical(character.presence.location),
          custodian: { kind: 'COMPANY', id: root.lifecycle.companyId },
          carrier: null,
          capacityG: totalWeight,
          access: 'COMPANY',
          closed: null,
        },
      ],
    };
  }
  physical = {
    ...physical,
    items: physical.items.map((item) =>
      returns.some((returned) => returned.itemId === item.itemId)
        ? { ...item, containerId: targetId, equipped: null }
        : item,
    ),
  };
  return knownItemMutation(
    physical,
    returns.map((item) => item.itemId),
    [returnContainerId, targetId],
  );
}
