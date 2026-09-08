import { canonicalJson } from './input.js';
import { person, replacePerson, sameLocation } from './lifecycle-state.js';
import { recordFinancialDeath } from './economy-knowledge.js';
import { accountFor, replaceAccount } from './economy-state.js';
import {
  activeConditions,
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
  requirePhysical,
  syncLifecycleConditions,
} from './physical-state.js';
import type { CommandOf, LifecycleState } from './lifecycle-types.js';
import type { CampaignTick } from './values.js';
import type { EconomyContext, EconomyRequirement } from './economy-types.js';
import type {
  CompanyPhysicalState,
  MaterializedCompanyState,
  PhysicalChange,
  PhysicalContainer,
} from './physical-types.js';

export function setActualFinancePaused(
  root: MaterializedCompanyState,
  characterId: string,
  paused: boolean,
) {
  let finance = root.finance;
  for (const membership of root.lifecycle.memberships.filter(
    (entry) => entry.characterId === characterId,
  )) {
    const account = accountFor(finance, membership.membershipId);
    finance = replaceAccount(finance, { ...account, actualPaused: paused });
  }
  return finance;
}
function movePresence(
  lifecycle: LifecycleState,
  characterId: string,
  availability: 'AVAILABLE' | 'CAPTIVE' | 'OUT_OF_CONTACT' | 'DEAD',
  location: ReturnType<typeof person>['presence']['location'],
): LifecycleState {
  const character = person(lifecycle, characterId);
  return replacePerson(lifecycle, {
    ...character,
    presence: {
      ...character.presence,
      location: ownPhysical(location),
      availability,
      assignment: 'NONE',
      fieldPartyId: null,
      encounterBindingId: null,
    },
  });
}
function carrierContainers(physical: CompanyPhysicalState, characterId: string) {
  return physical.containers.filter(
    (container) => container.carrier?.kind === 'CHARACTER' && container.carrier.id === characterId,
  );
}
export function captureCharacter(
  root: MaterializedCompanyState,
  command: CommandOf<'Capture'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const fact = physicalFact(context, p.receiptId, 'CAPTURE_OUTCOME');
  requirePhysical(
    fact.sourceEventId === command.sourceEventId &&
      fact.characterId === p.characterId &&
      canonicalJson(fact.captor) === canonicalJson(p.captorRef) &&
      canonicalJson(fact.location) === canonicalJson(p.locationRef),
    'INVALID_SOURCE',
  );
  const character = person(root.lifecycle, p.characterId);
  requirePhysical(character.presence.availability !== 'DEAD', 'INCOMPATIBLE_ACTIVITY');
  let physical = recordPhysicalSource(root.physical, fact).state;
  const seized = p.seizedItems.map((entry) => {
    const authorization = physicalFact(context, entry.authorizationId, 'SEIZURE');
    requirePhysical(
      authorization.characterId === p.characterId &&
        authorization.itemId === entry.itemId &&
        authorization.toContainerId === entry.toContainerId &&
        canonicalJson(authorization.captor) === canonicalJson(p.captorRef),
      'INVALID_SOURCE',
    );
    const item = physicalItem(physical, entry.itemId);
    const from = physicalContainer(physical, item.containerId!);
    requirePhysical(
      from.carrier?.kind === 'CHARACTER' && from.carrier.id === p.characterId,
      'INVALID_SOURCE',
    );
    const destination = physicalContainer(physical, entry.toContainerId);
    requirePhysical(
      destination.location.kind === p.locationRef.kind &&
        sameLocation(destination.location, p.locationRef),
      'INVALID_SOURCE',
    );
    return { authorization, item, destination };
  });
  const byDestination = new Map<string, number>();
  for (const entry of seized)
    byDestination.set(
      entry.destination.containerId,
      (byDestination.get(entry.destination.containerId) ?? 0) +
        itemDefinition(entry.item).weightG * entry.item.quantity,
    );
  for (const [containerId, movedWeight] of byDestination) {
    const destination = physicalContainer(physical, containerId);
    requirePhysical(containerWeightG(physical, containerId) + movedWeight <= destination.capacityG, 'CAPACITY');
  }
  for (const entry of seized) {
    const recorded = recordPhysicalSource(physical, entry.authorization);
    requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
    physical = replaceItem(recorded.state, {
      ...physicalItem(recorded.state, entry.item.itemId),
      containerId: entry.destination.containerId,
      equipped: null,
    });
  }
  const lifecycle = movePresence(root.lifecycle, p.characterId, 'CAPTIVE', p.locationRef);
  const finance = setActualFinancePaused({ ...root, lifecycle, physical }, p.characterId, true);
  physical = {
    ...physical,
    custody: [
      ...physical.custody.filter((entry) => entry.characterId !== p.characterId),
      {
        characterId: p.characterId,
        custodian: ownPhysical(p.captorRef),
        location: ownPhysical(p.locationRef),
        sourceId: fact.sourceEventId,
        sinceTick: context.atTick,
      },
    ],
  };
  return { lifecycle, finance, physical, requirements: [] };
}
export function releaseCaptive(
  root: MaterializedCompanyState,
  command: CommandOf<'ReleaseCaptive'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const fact = physicalFact(context, p.proofId, 'RELEASE_OUTCOME');
  const custody = root.physical.custody.find((entry) => entry.characterId === p.characterId);
  requirePhysical(
    custody &&
      fact.characterId === p.characterId &&
      fact.route === p.route &&
      canonicalJson(fact.location) === canonicalJson(p.locationRef) &&
      canonicalJson(fact.fromCustodian) === canonicalJson(custody.custodian),
    'INVALID_SOURCE',
  );
  const recorded = recordPhysicalSource(root.physical, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  const lifecycle = movePresence(root.lifecycle, p.characterId, 'AVAILABLE', p.locationRef);
  const physical = {
    ...recorded.state,
    custody: recorded.state.custody.filter((entry) => entry.characterId !== p.characterId),
  };
  // Release is not ReturnToService: earnings/duty stay paused until explicit re-entry.
  const finance = setActualFinancePaused({ ...root, lifecycle, physical }, p.characterId, true);
  return { lifecycle, finance, physical, requirements: [] };
}
export function transferCaptive(
  root: MaterializedCompanyState,
  command: CommandOf<'TransferCaptive'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const fact = physicalFact(context, p.exchangeProofId, 'CAPTIVE_TRANSFER');
  const custody = root.physical.custody.find((entry) => entry.characterId === p.characterId);
  requirePhysical(
    custody &&
      custody.custodian.id === p.fromCustodianId &&
      fact.characterId === p.characterId &&
      fact.fromCustodianId === p.fromCustodianId &&
      fact.toCustodian.id === p.toCustodianId &&
      canonicalJson(fact.location) === canonicalJson(p.locationRef),
    'INVALID_SOURCE',
  );
  const recorded = recordPhysicalSource(root.physical, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  const lifecycle = movePresence(root.lifecycle, p.characterId, 'CAPTIVE', p.locationRef);
  const physical = {
    ...recorded.state,
    custody: recorded.state.custody.map((entry) =>
      entry.characterId === p.characterId
        ? {
            ...entry,
            custodian: ownPhysical(fact.toCustodian),
            location: ownPhysical(fact.location),
            sourceId: fact.sourceEventId,
            sinceTick: context.atTick,
          }
        : entry,
    ),
  };
  return { lifecycle, finance: setActualFinancePaused({ ...root, lifecycle, physical }, p.characterId, true), physical, requirements: [] };
}
function makeCorpseContainer(
  root: MaterializedCompanyState,
  characterId: string,
  containerId: string,
  location: ReturnType<typeof person>['presence']['location'],
): PhysicalContainer {
  const carried = carrierContainers(root.physical, characterId);
  const weight = root.physical.items
    .filter((item) => item.containerId !== null && carried.some((container) => container.containerId === item.containerId))
    .reduce((sum, item) => sum + itemDefinition(item).weightG * item.quantity, 0);
  return {
    containerId,
    kind: 'CORPSE',
    location: ownPhysical(location),
    custodian: { kind: 'WORLD', id: root.lifecycle.worldId },
    carrier: null,
    capacityG: Math.max(weight, 1),
    access: 'CUSTODIAN',
    closed: null,
  };
}
export function applyDeath(
  root: MaterializedCompanyState,
  input: {
    readonly characterId: string;
    readonly actualDeathTick: CampaignTick;
    readonly causeId: string;
    readonly custodyOutcomeId: string;
    readonly sourceEventId: string;
  },
  context: EconomyContext,
): PhysicalChange {
  const fact = physicalFact(context, input.custodyOutcomeId, 'DEATH_OUTCOME');
  requirePhysical(
    fact.characterId === input.characterId &&
      fact.actualDeathTick === input.actualDeathTick &&
      fact.causeId === input.causeId &&
      fact.sourceEventId === input.sourceEventId &&
      BigInt(fact.actualDeathTick) <= BigInt(context.atTick),
    'INVALID_SOURCE',
  );
  const character = person(root.lifecycle, input.characterId);
  requirePhysical(character.presence.availability !== 'DEAD', 'INCOMPATIBLE_ACTIVITY');
  let physical = recordPhysicalSource(root.physical, fact).state;
  const carriedIds = new Set(carrierContainers(physical, input.characterId).map((container) => container.containerId));
  const existingCorpse = physical.containers.find((container) => container.containerId === fact.corpseContainerId);
  const corpse = existingCorpse ?? makeCorpseContainer({ ...root, physical }, input.characterId, fact.corpseContainerId, fact.location);
  requirePhysical(existingCorpse === undefined || existingCorpse.kind === 'CORPSE', 'INVALID_SOURCE');
  if (!existingCorpse) physical = { ...physical, containers: [...physical.containers, corpse] };
  const itemIds = physical.items
    .filter((item) => item.containerId !== null && carriedIds.has(item.containerId))
    .map((item) => item.itemId);
  physical = {
    ...physical,
    items: physical.items.map((item) =>
      itemIds.includes(item.itemId) ? { ...item, containerId: corpse.containerId, equipped: null } : item,
    ),
    conditions: physical.conditions.map((condition) =>
      condition.characterId === input.characterId && condition.resolvedAt === null
        ? {
            ...condition,
            resolvedAt: fact.actualDeathTick,
            resolutionSourceId: fact.sourceEventId,
          }
        : condition,
    ),
    custody: physical.custody.filter((entry) => entry.characterId !== input.characterId),
  };
  let lifecycle = movePresence(root.lifecycle, input.characterId, 'DEAD', fact.location);
  lifecycle = syncLifecycleConditions(lifecycle, physical);
  return { lifecycle, finance: root.finance, physical, requirements: [] };
}
export function settleOutcomeApplication(
  root: MaterializedCompanyState,
  requirement: Extract<EconomyRequirement, { kind: 'OUTCOME_APPLICATION' }>,
  context: EconomyContext,
): PhysicalChange {
  return applyDeath(
    root,
    {
      characterId: requirement.characterId,
      actualDeathTick: requirement.actualDeathTick,
      causeId: physicalFact(context, requirement.custodyOutcomeId, 'DEATH_OUTCOME').causeId,
      custodyOutcomeId: requirement.custodyOutcomeId,
      sourceEventId: requirement.sourceEventId,
    },
    context,
  );
}
export function resolveMissing(
  root: MaterializedCompanyState,
  command: CommandOf<'ResolveMissing'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const fact = physicalFact(context, p.outcomeReceiptId, 'MISSING_RESOLUTION');
  const character = person(root.lifecycle, p.characterId);
  requirePhysical(
    character.presence.availability === 'OUT_OF_CONTACT' &&
      fact.characterId === p.characterId &&
      fact.notBefore === p.notBefore &&
      BigInt(context.atTick) >= BigInt(fact.notBefore),
    'INVALID_SOURCE',
  );
  let physical = recordPhysicalSource(root.physical, fact).state;
  if (fact.outcome === 'DEAD') {
    requirePhysical(
      fact.actualDeathTick !== undefined &&
        fact.causeId !== undefined &&
        fact.custodyOutcomeId !== undefined &&
        fact.financialDeathReceiptId !== undefined,
      'INVALID_SOURCE',
    );
    const synthetic = {
      ...command,
      type: 'RecordDeath',
      payload: {
        receiptId: fact.financialDeathReceiptId,
        characterId: p.characterId,
        actualDeathTick: fact.actualDeathTick,
        causeId: fact.causeId,
        custodyOutcomeId: fact.custodyOutcomeId,
      },
    } as unknown as CommandOf<'RecordDeath'>;
    const financeChange = recordFinancialDeath({ ...root, physical }, synthetic, context);
    const death = applyDeath(
      { ...root, finance: financeChange.finance, physical },
      {
        characterId: p.characterId,
        actualDeathTick: fact.actualDeathTick,
        causeId: fact.causeId,
        custodyOutcomeId: fact.custodyOutcomeId,
        sourceEventId: fact.sourceEventId,
      },
      context,
    );
    return {
      ...death,
      requirements: financeChange.requirements.filter(
        (requirement) => requirement.kind !== 'OUTCOME_APPLICATION',
      ),
    };
  }
  const availability = fact.outcome === 'CAPTIVE' ? 'CAPTIVE' : 'AVAILABLE';
  let lifecycle = movePresence(root.lifecycle, p.characterId, availability, fact.location);
  if (availability === 'CAPTIVE') {
    requirePhysical(fact.custodian !== undefined, 'INVALID_SOURCE');
    physical = {
      ...physical,
      custody: [
        ...physical.custody.filter((entry) => entry.characterId !== p.characterId),
        {
          characterId: p.characterId,
          custodian: ownPhysical(fact.custodian),
          location: ownPhysical(fact.location),
          sourceId: fact.sourceEventId,
          sinceTick: context.atTick,
        },
      ],
    };
  } else physical = { ...physical, custody: physical.custody.filter((entry) => entry.characterId !== p.characterId) };
  const finance = setActualFinancePaused({ ...root, lifecycle, physical }, p.characterId, true);
  return { lifecycle, finance, physical, requirements: [] };
}
