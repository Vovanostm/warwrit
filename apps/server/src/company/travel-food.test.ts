import { describe, expect, it } from 'vitest';

import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import {
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULES,
  COMPANY_RULESET_ID,
  canonicalJson,
  createCombatEncounterApplication,
  createCompanyLearningState,
  createSocialState,
  entityId,
  parseCompanyCommand,
  prepareBeginCombatAggregate,
  prepareCompanyEconomy,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  EncounterCompanySource,
  EconomyContext,
  ItemInstance,
  PhysicalContainer,
} from '@warwrit/game-core';
import { prepareEncounterFoodFacts, prepareTravelFoodFacts } from './travel-food.js';

function encounterState(): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture();
  return readCompanyCombatAggregateState(fixture.begun.next);
}

function departureState(carrierCharacterId = 'a-leader'): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture(false, 10000, carrierCharacterId);
  return readCompanyCombatAggregateState(fixture.state);
}

function encounterStateWithBackedFractionalCarry(): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture();
  const sources = fixture.f.sources.map((source, index) =>
    advanceCompanySource(source, '1500', `fractional-${index}`),
  );
  const initialRoot = sources[0]!.root;
  const initialState = readCompanyCombatAggregateState({
    economy: initialRoot,
    learning: createCompanyLearningState(),
    social: createSocialState(),
    encounter: createCombatEncounterApplication(),
  });
  const position = {
    ...fixture.f.evidence,
    atTick: initialRoot.lifecycle.campaignTick,
    parties: fixture.f.evidence.parties.map((party) => ({
      ...party,
      revision: sources.find((source) => source.root.lifecycle.companyId === party.companyId)!.root
        .lifecycle.revision,
    })),
  };
  const begun = prepareBeginCombatAggregate(initialState, sources, fixture.f.request, position);
  if (begun.kind !== 'PREPARED')
    throw new Error(`Encounter fixture could not begin: ${begun.error}`);
  return readCompanyCombatAggregateState(begun.next);
}

function advanceCompanySource(
  source: EncounterCompanySource,
  toTick: string,
  commandSuffix: string,
): EncounterCompanySource {
  const root = source.root;
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: `seed-food-advance-${commandSuffix}`,
    type: 'AdvanceCampaign',
    payload: { toTick, authoritativeInputs: [] },
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    actorRef: { kind: 'SYSTEM', id: 'world-travel' },
    campaignTick: root.finance.processedTick,
    expectedRevision: root.lifecycle.revision,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId: `seed-food-event-${commandSuffix}`,
  });
  if (!parsed.ok) throw new Error(`Advance fixture command is invalid: ${parsed.error}`);
  const command = parsed.command;
  const aggregate = readCompanyCombatAggregateState({
    economy: root,
    learning: createCompanyLearningState(),
    social: createSocialState(),
    encounter: createCombatEncounterApplication(),
  });
  const party = root.lifecycle.parties[0];
  if (!party || party.location.kind !== 'AT') throw new Error('Fixture party is not at a site');
  const food = prepareTravelFoodFacts(aggregate, toTick, command.commandId, {
    kind: 'DEPARTURE',
    partyId: party.partyId,
    location: party.location,
    settledThroughTick: toTick,
  });
  if (food.kind !== 'PREPARED')
    throw new Error(`Fixture food could not be settled: ${food.reason}`);
  const context: EconomyContext = {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    principal: command.actorRef,
    publicRevision: root.lifecycle.knowledge.revision,
    canonicalRevision: root.lifecycle.revision,
    atTick: root.lifecycle.campaignTick,
    completeGraph: true,
    contactIds: root.lifecycle.characters.map((character) => character.identity.characterId),
    facts: [],
    financeFacts: [],
    physicalFacts: food.facts,
    internalGrant: {
      commandId: command.commandId,
      sourceEventId: command.sourceEventId!,
      canonicalRequest: canonicalJson(command),
    },
  };
  const advanced = prepareCompanyEconomy(root, command, context);
  if (advanced.kind !== 'PREPARED')
    throw new Error(`Fixture advance could not settle: ${advanced.error}`);
  if (!advanced.next.physical) throw new Error('Fixture advance did not retain physical state');
  const nextRoot = {
    lifecycle: advanced.next.lifecycle,
    finance: advanced.next.finance,
    physical: advanced.next.physical,
  };
  return {
    ...source,
    root: nextRoot,
    context: {
      ...source.context,
      publicRevision: nextRoot.lifecycle.knowledge.revision,
      canonicalRevision: nextRoot.lifecycle.revision,
      atTick: nextRoot.lifecycle.campaignTick,
    },
  };
}

function appendContainer(
  state: CompanyCombatAggregateState,
  container: PhysicalContainer,
): CompanyCombatAggregateState {
  const physical = state.economy.physical!;
  return {
    ...state,
    economy: {
      ...state.economy,
      physical: {
        ...physical,
        containers: [...physical.containers, container],
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: [...physical.knowledge.containerSnapshots, container],
        },
      },
    },
  };
}

function appendStock(
  state: CompanyCombatAggregateState,
  container: PhysicalContainer,
  quantity: number,
  owner: ItemInstance['owner'] = { kind: 'COMPANY', id: state.economy.lifecycle.companyId },
): CompanyCombatAggregateState {
  const item: ItemInstance = {
    itemId: `item-${container.containerId}`,
    definitionId: 'ration',
    owner,
    containerId: container.containerId,
    quantity,
    currentCondition: 10000,
    maximumCondition: 10000,
    contentRevision: '1',
    provenance: { sourceId: 'encounter-food-test', parentItemId: null, ordinal: 0 },
    equipped: null,
    tombstone: null,
  };
  const physical = state.economy.physical!;
  const containers = physical.containers.some(
    (entry) => entry.containerId === container.containerId,
  )
    ? physical.containers.map((entry) =>
        entry.containerId === container.containerId ? container : entry,
      )
    : [...physical.containers, container];
  const containerSnapshots = physical.knowledge.containerSnapshots.some(
    (entry) => entry.containerId === container.containerId,
  )
    ? physical.knowledge.containerSnapshots.map((entry) =>
        entry.containerId === container.containerId ? container : entry,
      )
    : [...physical.knowledge.containerSnapshots, container];
  return {
    ...state,
    economy: {
      ...state.economy,
      physical: {
        ...physical,
        containers,
        items: [...physical.items, item],
        knowledge: {
          ...physical.knowledge,
          containerSnapshots,
          itemSnapshots: [...physical.knowledge.itemSnapshots, item],
        },
      },
    },
  };
}

function withoutFoodStock(state: CompanyCombatAggregateState): CompanyCombatAggregateState {
  const physical = state.economy.physical!;
  const foodItemIds = new Set(
    physical.items
      .filter(
        (item) =>
          COMPANY_CATALOGUE.items.find((definition) => definition.id === item.definitionId)
            ?.foodUnits === 1,
      )
      .map((item) => item.itemId),
  );
  return {
    ...state,
    economy: {
      ...state.economy,
      physical: {
        ...physical,
        items: physical.items.filter((item) => !foodItemIds.has(item.itemId)),
        knowledge: {
          ...physical.knowledge,
          itemSnapshots: physical.knowledge.itemSnapshots.filter(
            (item) => !foodItemIds.has(item.itemId),
          ),
        },
      },
    },
  };
}

function departureCarried(
  state: CompanyCombatAggregateState,
  characterId: string,
  location?: PhysicalContainer['location'],
): PhysicalContainer {
  const container = state.economy.physical?.containers.find(
    (entry) =>
      entry.kind === 'CARRIED' &&
      entry.carrier?.kind === 'CHARACTER' &&
      entry.carrier.id === characterId &&
      entry.custodian.kind === 'COMPANY' &&
      entry.access === 'COMPANY',
  );
  if (!container) throw new Error(`Expected company-accessible carried pack for ${characterId}`);
  return location ? { ...container, location } : container;
}

function prepareDepartureFood(
  state: CompanyCombatAggregateState,
  commandId: string,
): ReturnType<typeof prepareTravelFoodFacts> {
  const validated = readCompanyCombatAggregateState(state);
  const party = validated.economy.lifecycle.parties.find(
    (entry) => entry.partyId === validated.economy.lifecycle.characters[0]?.presence.fieldPartyId,
  );
  if (!party || party.location.kind !== 'AT') throw new Error('Expected a stationary party');
  const toTick = (
    BigInt(validated.economy.lifecycle.campaignTick) + BigInt(COMPANY_RULES.ticksPerDay)
  ).toString();
  return prepareTravelFoodFacts(validated, toTick, commandId, {
    kind: 'DEPARTURE',
    partyId: party.partyId,
    location: party.location,
    settledThroughTick: toTick,
  });
}

function partySupply(state: CompanyCombatAggregateState, containerId: string): PhysicalContainer {
  const binding = state.encounter.active!.binding;
  const participant = binding.participants.find(
    (entry) => entry.companyId === state.economy.lifecycle.companyId,
  )!;
  return {
    containerId,
    kind: 'PARTY_SUPPLY',
    location: binding.location,
    custodian: { kind: 'COMPANY', id: state.economy.lifecycle.companyId },
    carrier: { kind: 'PARTY', id: participant.partyId },
    capacityG: 50000,
    access: 'COMPANY',
    closed: null,
  };
}

function carried(
  state: CompanyCombatAggregateState,
  containerId: string,
  characterId: string,
): PhysicalContainer {
  const binding = state.encounter.active!.binding;
  return {
    containerId,
    kind: 'CARRIED',
    location: binding.location,
    custodian: { kind: 'COMPANY', id: state.economy.lifecycle.companyId },
    carrier: { kind: 'CHARACTER', id: characterId },
    capacityG: 50000,
    access: 'COMPANY',
    closed: null,
  };
}

describe('encounter food preparation', () => {
  it('returns no facts at the current campaign tick and rejects an earlier tick', () => {
    const state = encounterState();
    const currentTick = state.economy.lifecycle.campaignTick;

    expect(prepareEncounterFoodFacts(state, currentTick, 'encounter-food-same-tick')).toEqual({
      kind: 'PREPARED',
      facts: [],
    });
    expect(
      prepareEncounterFoodFacts(
        state,
        (BigInt(currentTick) - 1n).toString(),
        'encounter-food-earlier-tick',
      ),
    ).toEqual({ kind: 'REJECTED', reason: 'INVALID_STATE' });
  });

  it('uses fractional carry and returns byte-identical facts for identical receipt time', () => {
    let state = encounterStateWithBackedFractionalCarry();
    expect(state.economy.physical?.foodCarry.some((entry) => BigInt(entry.tickUnits) > 0n)).toBe(
      true,
    );
    const currentTick = BigInt(state.economy.lifecycle.campaignTick);
    const membershipIds = state.encounter
      .active!.binding.participants.filter(
        (entry) => entry.companyId === state.economy.lifecycle.companyId,
      )
      .map(
        (participant) =>
          state.economy.lifecycle.memberships.find(
            (entry) => entry.characterId === participant.projection.characterId,
          )!.membershipId,
      );
    const source = partySupply(state, 'hunt-party-stock');
    state = readCompanyCombatAggregateState(appendStock(state, source, 10));

    const toTick = (currentTick + 1500n).toString();
    const nextDayBoundary =
      (currentTick / BigInt(COMPANY_RULES.ticksPerDay) + 1n) * BigInt(COMPANY_RULES.ticksPerDay);
    const first = prepareEncounterFoodFacts(state, toTick, 'encounter-food-half-day');
    const repeated = prepareEncounterFoodFacts(state, toTick, 'encounter-food-half-day');
    expect(JSON.stringify(first)).toBe(JSON.stringify(repeated));
    expect(first.kind).toBe('PREPARED');
    if (first.kind === 'PREPARED') {
      expect(first.facts).toHaveLength(membershipIds.length * 2);
      for (const membershipId of membershipIds) {
        expect(
          first.facts
            .filter((fact) => fact.membershipId === membershipId)
            .map(({ fromTick, toTick: intervalEnd }) => [fromTick, intervalEnd]),
        ).toEqual([
          [currentTick.toString(), nextDayBoundary.toString()],
          [nextDayBoundary.toString(), toTick],
        ]);
      }
      expect(first.facts.every((fact) => fact.containerId === 'hunt-party-stock')).toBe(true);
    }
  });

  it('skips an earlier empty carried bag and allocates from bound-party stock', () => {
    let state = encounterState();
    const participant = state.encounter.active!.binding.participants.find(
      (entry) => entry.companyId === state.economy.lifecycle.companyId,
    )!;
    state = appendContainer(
      state,
      carried(state, 'a-empty-pack', participant.projection.characterId),
    );
    state = appendStock(state, partySupply(state, 'z-party-stock'), 10);
    state = readCompanyCombatAggregateState(state);

    const result = prepareEncounterFoodFacts(
      state,
      (BigInt(state.economy.lifecycle.campaignTick) + 1n).toString(),
      'encounter-food-empty-bag',
    );
    expect(result.kind).toBe('PREPARED');
    if (result.kind === 'PREPARED') {
      expect(result.facts.length).toBeGreaterThan(0);
      expect(result.facts.every((fact) => fact.containerId === 'z-party-stock')).toBe(true);
    }
  });

  it('does not treat static, unrelated, closed or remote stock as encounter supplies', () => {
    const state = encounterState();
    const binding = state.encounter.active!.binding;
    const valid = partySupply(state, 'invalid-supply');
    const providerId = state.economy.lifecycle.characters.find(
      (character) => character.presence.assignment === 'NONE',
    )!.identity.characterId;
    const unusable: PhysicalContainer[] = [
      { ...valid, kind: 'STATIC', carrier: null, containerId: 'static' },
      {
        ...valid,
        containerId: 'closed',
        closed: {
          sourceId: 'closure',
          causeId: 'cause',
          atTick: state.economy.lifecycle.campaignTick,
        },
      },
      {
        ...valid,
        containerId: 'remote',
        location: { ...binding.location, areaId: 'other-area' },
      },
      {
        ...valid,
        kind: 'CARRIED',
        containerId: 'unrelated-company',
        custodian: { kind: 'CHARACTER', id: providerId },
        carrier: { kind: 'CHARACTER', id: providerId },
        access: 'OWNER',
      },
    ];
    let stocked = state;
    for (const container of unusable) {
      stocked = appendStock(
        stocked,
        container,
        20,
        container.containerId === 'unrelated-company'
          ? { kind: 'CHARACTER', id: providerId }
          : undefined,
      );
    }
    stocked = readCompanyCombatAggregateState(stocked);

    const result = prepareEncounterFoodFacts(
      stocked,
      (BigInt(state.economy.lifecycle.campaignTick) + 1n).toString(),
      'encounter-food-no-invalid-stock',
    );
    expect(result).toEqual({ kind: 'REJECTED', reason: 'INSUFFICIENT_ITEMS' });
  });

  it('rejects insufficient allowed stock without emitting partial facts', () => {
    const initial = encounterState();
    const state = readCompanyCombatAggregateState(
      appendContainer(initial, partySupply(initial, 'insufficient-stock')),
    );
    const result = prepareEncounterFoodFacts(
      state,
      (BigInt(state.economy.lifecycle.campaignTick) + 1n).toString(),
      'encounter-food-insufficient',
    );
    expect(result).toEqual({ kind: 'REJECTED', reason: 'INSUFFICIENT_ITEMS' });
  });
});

describe('departure food preparation', () => {
  it('lets one co-located current party carrier feed the entire party', () => {
    const initial = withoutFoodStock(departureState());
    const party = initial.economy.lifecycle.parties[0]!;
    const carrier = initial.economy.lifecycle.characters.find(
      (character) => character.presence.fieldPartyId === party.partyId,
    )!;
    const state = appendStock(initial, departureCarried(initial, carrier.identity.characterId), 20);

    const result = prepareDepartureFood(state, 'departure-party-share');

    expect(result.kind).toBe('PREPARED');
    if (result.kind === 'PREPARED') {
      const expectedMembershipIds = initial.economy.lifecycle.memberships
        .filter((membership) =>
          initial.economy.lifecycle.characters.some(
            (character) =>
              character.identity.characterId === membership.characterId &&
              character.presence.fieldPartyId === party.partyId,
          ),
        )
        .map((membership) => membership.membershipId);
      expect(new Set(result.facts.map((fact) => fact.membershipId))).toEqual(
        new Set(expectedMembershipIds),
      );
      expect(result.facts.every((fact) => fact.containerId === 'aggregate-departure-pack')).toBe(
        true,
      );
    }
  });

  it('does not let a co-located carrier from another party supply this departure', () => {
    let initial = withoutFoodStock(departureState('a-worker-0'));
    const party = initial.economy.lifecycle.parties[0]!;
    const carrier = initial.economy.lifecycle.characters.find(
      (character) => character.identity.characterId === 'a-worker-0',
    )!;
    const otherPartyId = entityId<'FieldParty'>('other-food-party');
    initial = {
      ...initial,
      economy: {
        ...initial.economy,
        lifecycle: {
          ...initial.economy.lifecycle,
          parties: [
            ...initial.economy.lifecycle.parties,
            { partyId: otherPartyId, location: party.location },
          ],
          characters: initial.economy.lifecycle.characters.map((character) =>
            character.identity.characterId === carrier.identity.characterId
              ? {
                  ...character,
                  presence: { ...character.presence, fieldPartyId: otherPartyId },
                }
              : character,
          ),
          knowledge: {
            ...initial.economy.lifecycle.knowledge,
            characters: initial.economy.lifecycle.knowledge.characters.map((character) =>
              character.identity.characterId === carrier.identity.characterId
                ? {
                    ...character,
                    presence: { ...character.presence, fieldPartyId: otherPartyId },
                  }
                : character,
            ),
          },
        },
      },
    };
    const state = appendStock(initial, departureCarried(initial, carrier.identity.characterId), 20);

    expect(prepareDepartureFood(state, 'departure-other-party')).toEqual({
      kind: 'REJECTED',
      reason: 'INSUFFICIENT_ITEMS',
    });
  });

  it.each([
    ['remote site', { kind: 'AT' as const, siteId: 'far-site', areaId: 'square' }],
    ['remote area', { kind: 'AT' as const, siteId: 'village', areaId: 'far-area' }],
  ])('does not let a same-party carrier at a %s supply the departure', (_label, location) => {
    const initial = withoutFoodStock(departureState());
    const party = initial.economy.lifecycle.parties[0]!;
    const carrier = initial.economy.lifecycle.characters.find(
      (character) => character.presence.fieldPartyId === party.partyId,
    )!;
    const state = appendStock(
      initial,
      departureCarried(initial, carrier.identity.characterId, location),
      20,
    );

    expect(prepareDepartureFood(state, `departure-${_label.replace(' ', '-')}`)).toEqual({
      kind: 'REJECTED',
      reason: 'INSUFFICIENT_ITEMS',
    });
  });
});
