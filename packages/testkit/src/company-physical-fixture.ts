import {
  PHYSICAL_RULES,
  createCompanyPhysicalState,
  prepareCompanyEconomy,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  ItemInstance,
  PhysicalContainer,
  PhysicalEvidence,
  PhysicalVitals,
} from '@warwrit/game-core';
import {
  cash,
  command,
  context,
  physicalScope,
  place,
  prepared,
  tick,
} from './company-economy-fixture.js';

/** Explicit loaded occurrences, not a condition reducer or an implicit legacy migration. */
export function withLoadedConditions(
  state: CompanyEconomyState,
  definitionsByCharacter: Readonly<Record<string, readonly string[]>>,
  sourceId: string,
): CompanyEconomyState {
  const lifecycle = {
    ...state.lifecycle,
    characters: state.lifecycle.characters.map((character) => ({
      ...character,
      conditionIds:
        definitionsByCharacter[character.identity.characterId] ?? character.conditionIds,
    })),
  };
  const bindings = lifecycle.characters.flatMap((character) =>
    character.conditionIds.map((definitionId, ordinal) => ({
      characterId: character.identity.characterId,
      definitionId,
      conditionId: `${sourceId}-${character.identity.characterId}-${ordinal}`,
      sourceEventId: sourceId,
      causeId: sourceId,
      onsetTick: lifecycle.campaignTick,
      ...(definitionId === 'critical-bleed'
        ? { deadlineTick: tick(BigInt(lifecycle.campaignTick) + 250n) }
        : {}),
    })),
  );
  const loaded = createCompanyPhysicalState(lifecycle, {
    conditionBindings: bindings,
    knownConditionBindings: state.physical!.knowledge.conditionSnapshots
      .filter((entry) => entry.resolvedAt === null)
      .map(({ deadlineTick, ...binding }) => ({
        ...binding,
        ...(deadlineTick === null ? {} : { deadlineTick }),
      })),
  });
  return { ...state, lifecycle, physical: { ...state.physical!, conditions: loaded.conditions } };
}

export function visibleCharacter(
  state: CompanyEconomyState,
  characterId: string,
  patch: (
    character: CompanyEconomyState['lifecycle']['characters'][number],
  ) => CompanyEconomyState['lifecycle']['characters'][number],
): CompanyEconomyState {
  const apply = (characters: CompanyEconomyState['lifecycle']['characters']) =>
    characters.map((character) =>
      character.identity.characterId === characterId ? patch(character) : character,
    );
  return {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      characters: apply(state.lifecycle.characters),
      knowledge: {
        ...state.lifecycle.knowledge,
        characters: apply(state.lifecycle.knowledge.characters),
      },
    },
  };
}

/** Only scenarios that explicitly request a qualified external receiver get this fixture. */
export function withCareProvider(state: CompanyEconomyState): CompanyEconomyState {
  return visibleCharacter(state, 'provider', (character) => ({
    ...character,
    skills: { ...character.skills, medicine: 20 },
    aptitudeBySkill: { ...character.aptitudeBySkill, medicine: 10000 },
  }));
}

export function careHandover(
  state: CompanyEconomyState,
  characterId: string,
): Extract<PhysicalEvidence, { kind: 'CARE_HANDOVER' }> {
  const id = `handover-${characterId}-${state.lifecycle.revision}`;
  return {
    ...physicalScope(state, id),
    kind: 'CARE_HANDOVER',
    handoverId: id,
    characterId,
    receiverId: 'provider',
    location: place,
    poolId: 'local',
    providerWalletId: 'wallet-provider',
    moneyAccessEvidenceId: 'money-access',
    amountQ: cash(1),
  };
}

export function addContainer(
  state: CompanyEconomyState,
  value: PhysicalContainer,
  known = true,
): CompanyEconomyState {
  const physical = state.physical!;
  return {
    ...state,
    physical: {
      ...physical,
      containers: [...physical.containers, value],
      knowledge: {
        ...physical.knowledge,
        containerSnapshots: known
          ? [...physical.knowledge.containerSnapshots, structuredClone(value)]
          : physical.knowledge.containerSnapshots,
      },
    },
  };
}

export function addItem(
  state: CompanyEconomyState,
  value: ItemInstance,
  known = true,
): CompanyEconomyState {
  const physical = state.physical!;
  return {
    ...state,
    physical: {
      ...physical,
      items: [...physical.items, value],
      knowledge: {
        ...physical.knowledge,
        itemSnapshots: known
          ? [...physical.knowledge.itemSnapshots, structuredClone(value)]
          : physical.knowledge.itemSnapshots,
      },
    },
  };
}

export function addVitals(
  state: CompanyEconomyState,
  vitals: PhysicalVitals,
  known = true,
): CompanyEconomyState {
  const physical = state.physical!;
  return {
    ...state,
    physical: {
      ...physical,
      vitals: [...physical.vitals, vitals],
      knowledge: {
        ...physical.knowledge,
        vitalSnapshots: known
          ? [...physical.knowledge.vitalSnapshots, structuredClone(vitals)]
          : physical.knowledge.vitalSnapshots,
      },
    },
  };
}

export function container(
  id: string,
  custodian: PhysicalContainer['custodian'],
  capacityG = 30000,
  carrier: PhysicalContainer['carrier'] = null,
): PhysicalContainer {
  return {
    containerId: id,
    kind: carrier ? 'CARRIED' : 'STATIC',
    location: place,
    custodian,
    carrier,
    capacityG,
    access: custodian.kind === 'COMPANY' ? 'COMPANY' : 'OWNER',
    closed: null,
  };
}

export function item(
  id: string,
  definitionId: string,
  owner: ItemInstance['owner'],
  containerId: string,
  quantity = 1,
  currentCondition: number = PHYSICAL_RULES.defaultConditionMaximum,
  maximumCondition: number = PHYSICAL_RULES.defaultConditionMaximum,
): ItemInstance {
  return {
    itemId: id,
    definitionId,
    owner,
    containerId,
    quantity,
    currentCondition,
    maximumCondition,
    contentRevision: '1',
    provenance: { sourceId: 'fixture-item-source', parentItemId: null, ordinal: 0 },
    equipped: null,
    tombstone: null,
  };
}

export function itemAccess(
  state: CompanyEconomyState,
  id: string,
  purpose: Extract<PhysicalEvidence, { kind: 'ITEM_ACCESS' }>['purpose'],
  containerIds: readonly string[],
  itemIds: readonly string[],
): Extract<PhysicalEvidence, { kind: 'ITEM_ACCESS' }> {
  return {
    ...physicalScope(state, id),
    kind: 'ITEM_ACCESS',
    operatorId: 'leader',
    location: place,
    containerIds,
    itemIds,
    purpose,
  };
}

/** Apply an explicit source through the public boundary; no reducer is duplicated in fixtures. */
export function condition(
  state: CompanyEconomyState,
  characterId: string,
  definitionId: 'minor-field-wound' | 'severe-stable-wound' | 'critical-bleed' | 'old-impairment',
  id: string,
) {
  const deadlineTick =
    definitionId === 'critical-bleed'
      ? tick(BigInt(state.finance.processedTick) + 250n)
      : undefined;
  const cmd = command(
    state,
    'ApplyCondition',
    {
      receiptId: id,
      characterId,
      conditionDefinitionId: definitionId,
      causeId: `cause-${id}`,
      ...(deadlineTick ? { deadlineTick } : {}),
    },
    id,
    'DOMAIN_RECEIPT',
  );
  const fact: PhysicalEvidence = {
    ...physicalScope(state, id),
    sourceEventId: cmd.sourceEventId,
    kind: 'CONDITION_SOURCE',
    characterId,
    definitionId,
    causeId: `cause-${id}`,
    onsetTick: state.finance.processedTick,
    ...(deadlineTick ? { deadlineTick } : {}),
  };
  return prepared(prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact])));
}
