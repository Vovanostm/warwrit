import { describe, expect, it } from 'vitest';
import {
  PHYSICAL_RULES,
  canonicalJson,
  entityId,
  prepareCompanyEconomy,
  projectCompanyEconomy,
  projectCompanyPhysical,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  ItemInstance,
  PhysicalContainer,
  PhysicalEvidence,
  PhysicalVitals,
} from '@warwrit/game-core';
import {
  access,
  advance,
  cash,
  command,
  context,
  economy,
  observation,
  physicalScope,
  place,
  prepared,
  tick,
} from './company-economy-fixture.js';

function visibleCharacter(
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

function addContainer(
  state: CompanyEconomyState,
  container: PhysicalContainer,
  known = true,
): CompanyEconomyState {
  const physical = state.physical!;
  return {
    ...state,
    physical: {
      ...physical,
      containers: [...physical.containers, container],
      knowledge: {
        ...physical.knowledge,
        containerSnapshots: known
          ? [...physical.knowledge.containerSnapshots, structuredClone(container)]
          : physical.knowledge.containerSnapshots,
      },
    },
  };
}

function addItem(
  state: CompanyEconomyState,
  item: ItemInstance,
  known = true,
): CompanyEconomyState {
  const physical = state.physical!;
  return {
    ...state,
    physical: {
      ...physical,
      items: [...physical.items, item],
      knowledge: {
        ...physical.knowledge,
        itemSnapshots: known
          ? [...physical.knowledge.itemSnapshots, structuredClone(item)]
          : physical.knowledge.itemSnapshots,
      },
    },
  };
}

function addVitals(
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

function container(
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

function item(
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

function itemAccess(
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

function withMedicineProvider(state: CompanyEconomyState): CompanyEconomyState {
  return visibleCharacter(state, 'provider', (character) => ({
    ...character,
    skills: { ...character.skills, medicine: 20 },
    aptitudeBySkill: { ...character.aptitudeBySkill, medicine: 10000 },
  }));
}

function condition(
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

function publicPair(state: CompanyEconomyState) {
  return {
    economy: projectCompanyEconomy(state, 'company'),
    physical: projectCompanyPhysical(state, 'company'),
  };
}

describe('WP-02.4 — real items, care and physical outcomes', () => {
  it('P1/P8: transfer conserves instances and ownership, refuses ordinary overflow atomically, and reloads through the public command boundary', () => {
    let state = economy([1n], 1000n, 0);
    state = addContainer(
      state,
      container('leader-pack', { kind: 'CHARACTER', id: 'leader' }, 30000, {
        kind: 'CHARACTER',
        id: 'leader',
      }),
    );
    state = addContainer(state, container('destination', { kind: 'COMPANY', id: 'company' }, 0));
    state = addItem(
      state,
      item('ration-stack', 'ration', { kind: 'COMPANY', id: 'company' }, 'leader-pack', 3),
    );
    const rejectedCommand = command(state, 'TransferItem', {
      itemId: 'ration-stack',
      quantity: 1,
      fromContainerId: 'leader-pack',
      toContainerId: 'destination',
      accessEvidenceId: 'transfer-access',
    });
    const rejectedAccess = itemAccess(
      state,
      'transfer-access',
      'TRANSFER',
      ['leader-pack', 'destination'],
      ['ration-stack'],
    );
    const rejected = prepareCompanyEconomy(
      state,
      rejectedCommand,
      context(state, rejectedCommand, [], [], [rejectedAccess]),
    );
    expect(rejected).toMatchObject({ kind: 'REJECTED', error: 'CAPACITY' });
    expect(rejected.state).toBe(state);
    expect(rejected.state.lifecycle.revision).toBe('0');
    expect(rejected.state.finance.applied).toHaveLength(0);

    state = {
      ...state,
      physical: {
        ...state.physical!,
        containers: state.physical!.containers.map((entry) =>
          entry.containerId === 'destination' ? { ...entry, capacityG: 1000 } : entry,
        ),
        knowledge: {
          ...state.physical!.knowledge,
          containerSnapshots: state.physical!.knowledge.containerSnapshots.map((entry) =>
            entry.containerId === 'destination' ? { ...entry, capacityG: 1000 } : entry,
          ),
        },
      },
    };
    const movedCommand = command(state, 'TransferItem', {
      itemId: 'ration-stack',
      quantity: 1,
      fromContainerId: 'leader-pack',
      toContainerId: 'destination',
      accessEvidenceId: 'transfer-access-ok',
      ownershipReceiptId: 'gift-auth',
    });
    const movedAccess = itemAccess(
      state,
      'transfer-access-ok',
      'TRANSFER',
      ['leader-pack', 'destination'],
      ['ration-stack'],
    );
    const mismatchedGift: PhysicalEvidence = {
      ...physicalScope(state, 'gift-auth'),
      kind: 'OWNERSHIP_AUTHORIZATION',
      itemId: 'ration-stack',
      quantity: 2,
      fromOwner: { kind: 'COMPANY', id: 'company' },
      toOwner: { kind: 'CHARACTER', id: 'leader' },
      operation: 'GIFT',
    };
    const mismatched = prepareCompanyEconomy(
      state,
      movedCommand,
      context(state, movedCommand, [], [], [movedAccess, mismatchedGift]),
    );
    expect(mismatched).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(mismatched.state).toBe(state);
    const matchingGift: PhysicalEvidence = { ...mismatchedGift, quantity: 1 };
    const moved = prepared(
      prepareCompanyEconomy(
        state,
        movedCommand,
        context(state, movedCommand, [], [], [movedAccess, matchingGift]),
      ),
    );
    const live = moved.next.physical!.items.filter(
      (entry) => entry.provenance.sourceId === 'fixture-item-source' && entry.tombstone === null,
    );
    expect(live.reduce((sum, entry) => sum + entry.quantity, 0)).toBe(3);
    expect(new Set(live.map((entry) => canonicalJson(entry.owner)))).toEqual(
      new Set([
        canonicalJson({ kind: 'COMPANY', id: 'company' }),
        canonicalJson({ kind: 'CHARACTER', id: 'leader' }),
      ]),
    );
    const child = live.find((entry) => entry.containerId === 'destination')!;
    expect(child.quantity).toBe(1);
    expect(child.owner).toEqual({ kind: 'CHARACTER', id: 'leader' });
    const reloaded: CompanyEconomyState = JSON.parse(JSON.stringify(moved.next));
    const back = command(reloaded, 'TransferItem', {
      itemId: child.itemId,
      quantity: 1,
      fromContainerId: 'destination',
      toContainerId: 'leader-pack',
      accessEvidenceId: 'reload-access',
    });
    const backAccess = itemAccess(
      reloaded,
      'reload-access',
      'TRANSFER',
      ['destination', 'leader-pack'],
      [child.itemId],
    );
    expect(
      prepared(prepareCompanyEconomy(reloaded, back, context(reloaded, back, [], [], [backAccess])))
        .next.physical!.items.filter((entry) => entry.tombstone === null)
        .reduce((sum, entry) => sum + (entry.definitionId === 'ration' ? entry.quantity : 0), 0),
    ).toBe(203);
    const beforeEvidenceMutation = JSON.stringify(moved.next);
    (movedAccess.itemIds as string[]).length = 0;
    expect(JSON.stringify(moved.next)).toBe(beforeEvidenceMutation);
  });

  it('P2: equip and repair require local physical authority, respect encounter/slot constraints, and never heal the character', () => {
    let state = economy([1n], 1000n, 0);
    state = addContainer(
      state,
      container('leader-pack', { kind: 'CHARACTER', id: 'leader' }, 30000, {
        kind: 'CHARACTER',
        id: 'leader',
      }),
    );
    state = addItem(
      state,
      item('sword-1', 'sword', { kind: 'CHARACTER', id: 'leader' }, 'leader-pack'),
    );
    state = addItem(
      state,
      item('armor-1', 'padded-coat', { kind: 'CHARACTER', id: 'leader' }, 'leader-pack', 1, 10, 40),
    );
    state = addItem(
      state,
      item('repair-1', 'repair-unit', { kind: 'CHARACTER', id: 'leader' }, 'leader-pack'),
    );
    state = addVitals(state, {
      characterId: 'leader',
      sourceId: 'fixture-vitals',
      maximumHealth: 100,
      currentHealth: 60,
      healthCarry: '0',
      maximumStamina: 100,
      currentStamina: 80,
      staminaCarry: '0',
    });
    const equip = command(state, 'EquipItem', {
      characterId: 'leader',
      itemId: 'sword-1',
      slotId: 'MAIN_HAND',
      accessEvidenceId: 'equip-access',
    });
    const equipped = prepared(
      prepareCompanyEconomy(
        state,
        equip,
        context(
          state,
          equip,
          [],
          [],
          [itemAccess(state, 'equip-access', 'EQUIP', ['leader-pack'], ['sword-1'])],
        ),
      ),
    ).next;
    expect(
      equipped.physical!.items.find((entry) => entry.itemId === 'sword-1')?.equipped?.slots,
    ).toEqual(['MAIN_HAND']);
    expect(
      equipped.physical!.vitals.find((entry) => entry.characterId === 'leader')?.currentHealth,
    ).toBe(60);

    const repair = command(equipped, 'RepairItem', {
      itemId: 'armor-1',
      repairUnits: 1,
      materialsContainerId: 'leader-pack',
    });
    const repaired = prepared(
      prepareCompanyEconomy(
        equipped,
        repair,
        context(
          equipped,
          repair,
          [],
          [],
          [itemAccess(equipped, 'repair-access', 'REPAIR', ['leader-pack'], ['armor-1'])],
        ),
      ),
    ).next;
    expect(
      repaired.physical!.items.find((entry) => entry.itemId === 'armor-1')?.currentCondition,
    ).toBe(15);
    expect(
      repaired.physical!.items.find((entry) => entry.itemId === 'repair-1')?.tombstone,
    ).not.toBeNull();
    expect(
      repaired.physical!.vitals.find((entry) => entry.characterId === 'leader')?.currentHealth,
    ).toBe(60);

    const inEncounter = visibleCharacter(repaired, 'leader', (character) => ({
      ...character,
      presence: {
        ...character.presence,
        availability: 'IN_ENCOUNTER',
        encounterBindingId: entityId('encounter'),
      },
    }));
    const blocked = command(inEncounter, 'EquipItem', {
      characterId: 'leader',
      itemId: 'armor-1',
      slotId: 'BODY',
      accessEvidenceId: 'blocked-equip',
    });
    const blockedResult = prepareCompanyEconomy(
      inEncounter,
      blocked,
      context(
        inEncounter,
        blocked,
        [],
        [],
        [itemAccess(inEncounter, 'blocked-equip', 'EQUIP', ['leader-pack'], ['armor-1'])],
      ),
    );
    expect(blockedResult).toMatchObject({ kind: 'REJECTED', error: 'INCOMPATIBLE_ACTIVITY' });
    expect(blockedResult.state).toBe(inEncounter);
  });

  it('P3/P4/P8: source-backed care executes once, does not heal by itself, recovery uses exact food time, and permanent/critical outcomes stay causal', () => {
    let state = withMedicineProvider(economy([1n], 1000n, 0));
    state = visibleCharacter(state, 'worker-0', (character) => ({
      ...character,
      presence: { ...character.presence, assignment: 'RECOVERY' },
    }));
    state = addItem(
      state,
      item('medical-1', 'medical-unit', { kind: 'COMPANY', id: 'company' }, 'fixture-supply', 2),
    );
    state = addVitals(state, {
      characterId: 'worker-0',
      sourceId: 'fixture-vitals',
      maximumHealth: 100,
      currentHealth: 40,
      healthCarry: '0',
      maximumStamina: 100,
      currentStamina: 70,
      staminaCarry: '0',
    });
    state = condition(state, 'worker-0', 'severe-stable-wound', 'severe').next;
    const instance = state.physical!.conditions.find(
      (entry) => entry.characterId === 'worker-0' && entry.definitionId === 'severe-stable-wound',
    )!;
    const care = command(state, 'ApplyCare', {
      characterId: 'worker-0',
      conditionId: instance.conditionId,
      careDefinitionId: 'wound-care',
      resourceOrProviderReceiptId: 'care-proof',
    });
    const careFact: PhysicalEvidence = {
      ...physicalScope(state, 'care-proof'),
      kind: 'CARE_FULFILLMENT',
      characterId: 'worker-0',
      conditionId: instance.conditionId,
      careDefinitionId: 'wound-care',
      providerId: 'provider',
      location: place,
      channel: 'MATERIAL',
      resourceItemId: 'medical-1',
      resourceContainerId: 'fixture-supply',
    };
    const cared = prepared(
      prepareCompanyEconomy(state, care, context(state, care, [], [], [careFact])),
    );
    expect(
      cared.next.physical!.vitals.find((entry) => entry.characterId === 'worker-0')?.currentHealth,
    ).toBe(40);
    expect(cared.next.physical!.items.find((entry) => entry.itemId === 'medical-1')?.quantity).toBe(
      1,
    );
    const exactRetry = prepared(prepareCompanyEconomy(cared.next, care, context(cared.next, care)));
    expect(exactRetry.replayed).toBe(true);
    expect(exactRetry.next).toBe(cared.next);
    const sourceRetry = { ...care, commandId: 'care-redelivery' };
    expect(
      prepared(prepareCompanyEconomy(cared.next, sourceRetry, context(cared.next, sourceRetry)))
        .replayed,
    ).toBe(true);

    state = advance(cared.next, 250).next;
    expect(
      state.physical!.conditions.find((entry) => entry.conditionId === instance.conditionId)
        ?.resolvedAt,
    ).toBe('250');
    expect(
      state.physical!.vitals.find((entry) => entry.characterId === 'worker-0')?.currentHealth,
    ).toBe(100);
    state = condition(state, 'worker-0', 'minor-field-wound', 'minor').next;
    const minor = state.physical!.conditions.find(
      (entry) =>
        entry.characterId === 'worker-0' &&
        entry.definitionId === 'minor-field-wound' &&
        entry.resolvedAt === null,
    )!;
    state = advance(state, 300).next;
    expect(
      state.physical!.conditions.find((entry) => entry.conditionId === minor.conditionId)
        ?.resolvedAt,
    ).toBe('300');

    state = condition(state, 'worker-0', 'critical-bleed', 'critical').next;
    const critical = state.physical!.conditions.find(
      (entry) =>
        entry.characterId === 'worker-0' &&
        entry.definitionId === 'critical-bleed' &&
        entry.resolvedAt === null,
    )!;
    expect(critical.deadlineTick).toBe('550');
    state = advance(state, 551).next;
    expect(
      state.lifecycle.characters.find((entry) => entry.identity.characterId === 'worker-0')
        ?.presence.availability,
    ).toBe('AVAILABLE');
    expect(
      state.physical!.conditions.find((entry) => entry.conditionId === critical.conditionId)
        ?.resolvedAt,
    ).toBeNull();

    state = condition(state, 'worker-0', 'old-impairment', 'permanent').next;
    const permanent = state.physical!.conditions.find(
      (entry) =>
        entry.characterId === 'worker-0' &&
        entry.definitionId === 'old-impairment' &&
        entry.resolvedAt === null,
    )!;
    const invalidCare = command(state, 'ApplyCare', {
      characterId: 'worker-0',
      conditionId: permanent.conditionId,
      careDefinitionId: 'exceptional-care',
      resourceOrProviderReceiptId: 'ordinary-permanent-care',
    });
    const invalidFact: PhysicalEvidence = {
      ...physicalScope(state, 'ordinary-permanent-care'),
      kind: 'CARE_FULFILLMENT',
      characterId: 'worker-0',
      conditionId: permanent.conditionId,
      careDefinitionId: 'exceptional-care',
      providerId: 'provider',
      location: place,
      channel: 'MATERIAL',
      resourceItemId: 'medical-1',
      resourceContainerId: 'fixture-supply',
    };
    const rejected = prepareCompanyEconomy(
      state,
      invalidCare,
      context(state, invalidCare, [], [], [invalidFact]),
    );
    expect(rejected).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(rejected.state).toBe(state);
  });

  it('P5: departure preserves earned debt, returns company gear with a local overflow bundle, leaves personal property alone, and requires a real handover when immobile', () => {
    let state = advance(economy([2n], 0n, 0), 500).next;
    state = addContainer(
      state,
      container('worker-pack', { kind: 'CHARACTER', id: 'worker-0' }, 30000, {
        kind: 'CHARACTER',
        id: 'worker-0',
      }),
    );
    state = addContainer(state, container('return-full', { kind: 'COMPANY', id: 'company' }, 0));
    state = addItem(
      state,
      item('company-sword', 'sword', { kind: 'COMPANY', id: 'company' }, 'worker-pack'),
    );
    state = addItem(
      state,
      item('personal-shield', 'shield', { kind: 'CHARACTER', id: 'worker-0' }, 'worker-pack'),
    );
    const request = command(state, 'RequestDeparture', {
      membershipId: 'service-worker-0',
      reason: 'DISMISSED',
      causeId: 'owner-choice',
      acknowledgedQuoteRevision: state.lifecycle.knowledge.revision,
    });
    state = prepared(prepareCompanyEconomy(state, request, context(state, request))).next;
    const intent = state.finance.departures.at(-1)!;
    const execute = command(
      state,
      'ExecuteDeparture',
      {
        membershipId: 'service-worker-0',
        intentId: intent.intentId,
        returnContainerId: 'return-full',
      },
      'execute-departure',
      'SYSTEM',
    );
    const departed = prepared(prepareCompanyEconomy(state, execute, context(state, execute))).next;
    expect(
      departed.lifecycle.memberships.find((entry) => entry.membershipId === 'service-worker-0')
        ?.endedAt,
    ).toBe('500');
    expect(
      departed.finance.claims.some(
        (entry) =>
          entry.membershipId === 'service-worker-0' &&
          BigInt(entry.reportedQ) > BigInt(entry.paidQ),
      ),
    ).toBe(true);
    const overflow = departed.physical!.containers.find((entry) => entry.kind === 'GROUND_BUNDLE')!;
    expect(overflow.location).toEqual(place);
    expect(
      departed.physical!.items.find((entry) => entry.itemId === 'company-sword')?.containerId,
    ).toBe(overflow.containerId);
    expect(
      departed.physical!.items.find((entry) => entry.itemId === 'personal-shield')?.containerId,
    ).toBe('worker-pack');

    let immobile = withMedicineProvider(economy([1n], 10n, 0));
    immobile = condition(immobile, 'worker-0', 'critical-bleed', 'departure-critical').next;
    const ask = command(immobile, 'RequestDeparture', {
      membershipId: 'service-worker-0',
      reason: 'DISMISSED',
      causeId: 'owner-choice',
      acknowledgedQuoteRevision: immobile.lifecycle.knowledge.revision,
    });
    immobile = prepared(prepareCompanyEconomy(immobile, ask, context(immobile, ask))).next;
    const immobileIntent = immobile.finance.departures.at(-1)!;
    const withoutHandover = command(
      immobile,
      'ExecuteDeparture',
      {
        membershipId: 'service-worker-0',
        intentId: immobileIntent.intentId,
        returnContainerId: 'fixture-supply',
      },
      'immobile-no-handover',
      'SYSTEM',
    );
    const blocked = prepareCompanyEconomy(
      immobile,
      withoutHandover,
      context(immobile, withoutHandover),
    );
    expect(blocked).toMatchObject({ kind: 'REJECTED', error: 'INCOMPATIBLE_ACTIVITY' });
    expect(blocked.state).toBe(immobile);
    const handoverId = 'real-care-handover';
    const withHandover = command(
      immobile,
      'ExecuteDeparture',
      {
        membershipId: 'service-worker-0',
        intentId: immobileIntent.intentId,
        returnContainerId: 'fixture-supply',
        careHandoverId: handoverId,
      },
      'immobile-with-handover',
      'SYSTEM',
    );
    const handover: PhysicalEvidence = {
      ...physicalScope(immobile, handoverId),
      kind: 'CARE_HANDOVER',
      handoverId,
      characterId: 'worker-0',
      receiverId: 'provider',
      location: place,
      poolId: 'local',
      providerWalletId: 'wallet-provider',
      moneyAccessEvidenceId: 'money-access',
      amountQ: cash(1),
    };
    const underfunded: PhysicalEvidence = { ...handover, amountQ: cash(11) };
    const fundingFailure = prepareCompanyEconomy(
      immobile,
      withHandover,
      context(immobile, withHandover, [access(immobile)], [], [underfunded]),
    );
    expect(fundingFailure).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS' });
    expect(fundingFailure.state).toBe(immobile);
    const handed = prepared(
      prepareCompanyEconomy(
        immobile,
        withHandover,
        context(immobile, withHandover, [access(immobile)], [], [handover]),
      ),
    ).next;
    expect(
      handed.lifecycle.memberships.find((entry) => entry.membershipId === 'service-worker-0')
        ?.endedAt,
    ).toBe('0');
    expect(handed.physical!.careHandovers.at(-1)).toMatchObject({
      characterId: 'worker-0',
      receiverId: 'provider',
    });
    expect(handed.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ).toBe('9');
    expect(
      handed.finance.wallets.find((wallet) => wallet.walletId === 'wallet-provider')?.cashQ,
    ).toBe('1');
  });

  it('P6/P7/P8: custody changes actual item/food/pay state without an oracle, disclosure reconciles once, and release does not auto-resume service', () => {
    let state = economy([1n], 1000n, 0);
    state = addContainer(
      state,
      container('worker-pack', { kind: 'CHARACTER', id: 'worker-0' }, 30000, {
        kind: 'CHARACTER',
        id: 'worker-0',
      }),
    );
    state = addContainer(state, container('enemy-store', { kind: 'WORLD', id: 'world' }, 30000));
    state = addItem(
      state,
      item('captured-sword', 'sword', { kind: 'CHARACTER', id: 'worker-0' }, 'worker-pack'),
    );
    const shared = state;
    const beforePublic = publicPair(shared);
    const capture = command(
      shared,
      'Capture',
      {
        receiptId: 'capture-outcome',
        characterId: 'worker-0',
        captorRef: { kind: 'WORLD', id: 'world' },
        locationRef: place,
        seizedItems: [
          {
            itemId: 'captured-sword',
            toContainerId: 'enemy-store',
            authorizationId: 'seize-sword',
          },
        ],
      },
      'capture-worker',
      'OUTCOME_RECEIPT',
    );
    const captureFact: PhysicalEvidence = {
      ...physicalScope(shared, 'capture-outcome'),
      sourceEventId: capture.sourceEventId,
      kind: 'CAPTURE_OUTCOME',
      characterId: 'worker-0',
      captor: { kind: 'WORLD', id: 'world' },
      location: place,
    };
    const seizure: PhysicalEvidence = {
      ...physicalScope(shared, 'seize-sword', shared.finance.processedTick, 1),
      sourceEventId: capture.sourceEventId,
      kind: 'SEIZURE',
      characterId: 'worker-0',
      itemId: 'captured-sword',
      toContainerId: 'enemy-store',
      captor: { kind: 'WORLD', id: 'world' },
    };
    const hidden = prepared(
      prepareCompanyEconomy(
        shared,
        capture,
        context(shared, capture, [], [], [captureFact, seizure]),
      ),
    ).next;
    expect(
      hidden.lifecycle.characters.find((entry) => entry.identity.characterId === 'worker-0')
        ?.presence.availability,
    ).toBe('CAPTIVE');
    expect(
      hidden.lifecycle.memberships.find((entry) => entry.membershipId === 'service-worker-0')
        ?.endedAt,
    ).toBeNull();
    expect(
      hidden.finance.accounts.find((entry) => entry.membershipId === 'service-worker-0')
        ?.actualPaused,
    ).toBe(true);
    expect(
      hidden.physical!.items.find((entry) => entry.itemId === 'captured-sword')?.containerId,
    ).toBe('enemy-store');
    expect(publicPair(hidden)).toEqual(beforePublic);
    expect(hidden.lifecycle.knowledge.revision).toBe(shared.lifecycle.knowledge.revision);

    const aliveAdvanced = advance(shared, 1000).next;
    const hiddenAdvanced = advance(hidden, 1000).next;
    expect(publicPair(hiddenAdvanced)).toEqual(publicPair(aliveAdvanced));
    const disclosed = observation(
      hiddenAdvanced,
      'worker-0',
      [],
      ['captured-sword'],
      ['enemy-store'],
    );
    expect(publicPair(disclosed.result.next)).not.toEqual(publicPair(aliveAdvanced));
    expect(
      projectCompanyPhysical(disclosed.result.next, 'company')?.items.find(
        (entry) => entry.itemId === 'captured-sword',
      )?.containerId,
    ).toBe('enemy-store');
    const observationRetry = prepared(
      prepareCompanyEconomy(
        disclosed.result.next,
        disclosed.cmd,
        context(disclosed.result.next, disclosed.cmd),
      ),
    );
    expect(observationRetry.replayed).toBe(true);
    expect(observationRetry.next).toBe(disclosed.result.next);

    const release = command(
      disclosed.result.next,
      'ReleaseCaptive',
      {
        receiptId: 'release-receipt',
        characterId: 'worker-0',
        route: 'SELF_ESCAPE',
        locationRef: place,
        proofId: 'release-proof',
      },
      'release-worker',
      'OUTCOME_RECEIPT',
    );
    const releaseFact: PhysicalEvidence = {
      ...physicalScope(disclosed.result.next, 'release-proof'),
      sourceEventId: release.sourceEventId,
      kind: 'RELEASE_OUTCOME',
      characterId: 'worker-0',
      route: 'SELF_ESCAPE',
      fromCustodian: { kind: 'WORLD', id: 'world' },
      location: place,
    };
    const released = prepared(
      prepareCompanyEconomy(
        disclosed.result.next,
        release,
        context(disclosed.result.next, release, [], [], [releaseFact]),
      ),
    ).next;
    expect(
      released.lifecycle.characters.find((entry) => entry.identity.characterId === 'worker-0')
        ?.presence.availability,
    ).toBe('AVAILABLE');
    expect(
      released.finance.accounts.find((entry) => entry.membershipId === 'service-worker-0')
        ?.actualPaused,
    ).toBe(true);
    expect(released.physical!.custody.some((entry) => entry.characterId === 'worker-0')).toBe(
      false,
    );
    const afterRelease = advance(released, 2000).next;
    const workerEarned = afterRelease.finance.claims
      .filter((entry) => entry.membershipId === 'service-worker-0')
      .flatMap((entry) => entry.earned)
      .reduce(
        (sum, entry) =>
          sum + (BigInt(entry.toTick) - BigInt(entry.fromTick)) * BigInt(entry.dailyWageMilli),
        0n,
      );
    expect(workerEarned).toBe(0n);
  });

  it('I2/P8: legacy non-empty definition lists require instance bindings, while an exact V1 retry still resolves before fresh-load validation', () => {
    const base = economy([1n], 1000n, 0);
    const legacy: CompanyEconomyState = {
      ...base,
      physical: undefined,
      lifecycle: {
        ...base.lifecycle,
        characters: base.lifecycle.characters.map((entry) =>
          entry.identity.characterId === 'leader'
            ? { ...entry, conditionIds: ['minor-field-wound'] }
            : entry,
        ),
      },
    };
    const rename = command(legacy, 'RenameCompany', {
      companyId: 'company',
      name: 'Renamed',
      bannerId: 'banner',
    });
    const rejected = prepareCompanyEconomy(legacy, rename, context(legacy, rename));
    expect(rejected).toMatchObject({ kind: 'REJECTED', error: 'INVALID_STATE' });
    expect(rejected.state).toBe(legacy);

    const clean = economy([1n], 1000n, 0);
    const original = command(clean, 'RenameCompany', {
      companyId: 'company',
      name: 'Replayable',
      bannerId: 'banner',
    });
    const applied = prepared(prepareCompanyEconomy(clean, original, context(clean, original))).next;
    const legacyRetry: CompanyEconomyState = {
      ...applied,
      physical: undefined,
      lifecycle: {
        ...applied.lifecycle,
        characters: applied.lifecycle.characters.map((entry) =>
          entry.identity.characterId === 'leader'
            ? { ...entry, conditionIds: ['minor-field-wound'] }
            : entry,
        ),
      },
    };
    const replay = prepared(
      prepareCompanyEconomy(legacyRetry, original, context(legacyRetry, original)),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.next).toBe(legacyRetry);
  });
});
