import {
  COMPANY_CATALOGUE,
  COMBAT_PRACTICE_PROFILE_VERSION,
  COMBAT_RECEIPT_TIME_VERSION,
  ENCOUNTER_BINDING_VERSION,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  applyCombatCommand,
  battleId,
  commandId,
  createCombatEncounterApplication,
  createCombatReceiptJournal,
  createCompanyLearningState,
  createHexagon,
  createSocialState,
  entityId,
  initialSkillProgress,
  prepareBeginCombatAggregate,
  prepareCombatReceipt,
  prepareEncounterBinding,
  sideId,
  unitId,
} from '@warwrit/game-core';
import type {
  CombatCommand,
  CombatOwnerContext,
  CombatReceiptContext,
  CombatReceiptJournal,
  CombatTransition,
  CompanyCombatAggregateState,
  EconomyContext,
  EncounterCompanySource,
  EncounterPositionEvidence,
  EquipmentSlot,
  FinanceEvidence,
  MaterializedCompanyState,
  PhysicalEvidence,
} from '@warwrit/game-core';
import { command, context, economy, place } from './company-economy-fixture.js';
import { addContainer, addItem, addVitals, container, item } from './company-physical-fixture.js';

export function source(
  prefix: string,
  health = 100,
  familySuccessor = false,
): EncounterCompanySource {
  const ids = new Set(['company', 'party', 'leader', 'worker-0', 'worker-1', 'provider']);
  let root = JSON.parse(
    JSON.stringify(economy([1n, 1n]), (_, value) =>
      ids.has(value) ? `${prefix}-${value}` : value,
    ),
  ) as ReturnType<typeof economy>;
  const members = root.lifecycle.characters.filter((person) => person.presence.fieldPartyId);
  for (const person of members) {
    const characterId = person.identity.characterId;
    const owner = { kind: 'CHARACTER' as const, id: characterId };
    const packId = `${characterId}-pack`;
    root = addContainer(root, container(packId, owner, 30000, owner), false);
    for (const definitionId of ['sword', 'shield', 'padded-coat', 'simple-helmet']) {
      const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === definitionId)!;
      const slots: EquipmentSlot[] =
        definition.hands === 2 ? ['MAIN_HAND', 'OFF_HAND'] : [definition.slot!];
      const maximum =
        definitionId === 'padded-coat' ? 40 : definitionId === 'simple-helmet' ? 20 : 10000;
      const current =
        definitionId === 'padded-coat' ? 7 : definitionId === 'simple-helmet' ? 5 : 5000;
      const value = item(
        `${characterId}-${definitionId}`,
        definitionId,
        owner,
        packId,
        1,
        current,
        maximum,
      );
      root = addItem(root, { ...value, equipped: { characterId, slots } }, false);
    }
    root = addVitals(
      root,
      {
        characterId,
        sourceId: `${characterId}-vitals`,
        maximumHealth: characterId.endsWith('-leader') ? health : 100,
        currentHealth: characterId.endsWith('-leader') ? health : 100,
        healthCarry: '0',
        maximumStamina: 100,
        currentStamina: 100,
        staminaCarry: '0',
        morale: 50,
      },
      false,
    );
  }
  if (familySuccessor) {
    const leaderId = entityId<'Character'>(`${prefix}-leader`);
    const providerId = entityId<'Character'>(`${prefix}-provider`);
    root = {
      ...root,
      lifecycle: {
        ...root.lifecycle,
        company: {
          ...root.lifecycle.company!,
          householdIds: [...root.lifecycle.company!.householdIds, providerId],
        },
        kinship: [...root.lifecycle.kinship, { from: leaderId, to: providerId, kind: 'SIBLING' }],
      },
    };
    const owner = { kind: 'CHARACTER' as const, id: providerId };
    const packId = `${providerId}-pack`;
    root = addContainer(root, container(packId, owner, 30000, owner), false);
    const sword = item(`${providerId}-sword`, 'sword', owner, packId, 1, 5000, 10000);
    root = addItem(
      root,
      { ...sword, equipped: { characterId: providerId, slots: ['MAIN_HAND'] } },
      false,
    );
    root = addVitals(
      root,
      {
        characterId: providerId,
        sourceId: `${providerId}-vitals`,
        maximumHealth: 100,
        currentHealth: 100,
        healthCarry: '0',
        maximumStamina: 100,
        currentStamina: 100,
        staminaCarry: '0',
        morale: 50,
      },
      false,
    );
  }
  root = {
    ...root,
    lifecycle: {
      ...root.lifecycle,
      characters: root.lifecycle.characters.map((character) => ({
        ...character,
        skills: {
          ...character.skills,
          blades: initialSkillProgress(0, `${character.identity.characterId}-blades`),
          defense: initialSkillProgress(0, `${character.identity.characterId}-defense`),
          leadership: initialSkillProgress(0, `${character.identity.characterId}-leadership`),
        },
        aptitudeBySkill: {
          ...character.aptitudeBySkill,
          blades: 10000,
          defense: 10000,
          leadership: 10000,
        },
      })),
    },
  };
  const request = command(root, 'BeginEncounterBinding', {}, 'placement', 'SYSTEM');
  return { root: { ...root, physical: root.physical! }, context: context(root, request) };
}

export function fixture(
  health = 100,
  adjacentPracticeParty = false,
  familySuccessor = false,
  departureItemCharacterId?: string,
) {
  const sources = [source('a', health, familySuccessor), source('b', 10000)];
  if (departureItemCharacterId) {
    const owner = sources[0]!;
    const withPack = addContainer(
      owner.root,
      container(
        'aggregate-departure-pack',
        { kind: 'COMPANY', id: owner.root.lifecycle.companyId },
        30000,
        { kind: 'CHARACTER', id: departureItemCharacterId },
      ),
    );
    const withReturn = addContainer(
      withPack,
      container(
        'aggregate-departure-return',
        {
          kind: 'COMPANY',
          id: owner.root.lifecycle.companyId,
        },
        1,
      ),
    );
    sources[0] = {
      ...owner,
      root: addItem(
        withReturn,
        item(
          'aggregate-departure-sword',
          'sword',
          { kind: 'COMPANY', id: owner.root.lifecycle.companyId },
          'aggregate-departure-pack',
        ),
      ) as MaterializedCompanyState,
    };
  }
  const hexes = createHexagon(2);
  const request = { bindingId: 'physical-binding', battleId: battleId('physical-battle') };
  const evidence: EncounterPositionEvidence = {
    id: 'physical-placement',
    sourceEventId: 'physical-contact',
    version: ENCOUNTER_BINDING_VERSION,
    bindingId: request.bindingId,
    worldId: 'world',
    atTick: sources[0]!.context.atTick,
    location: place,
    setup: {
      schemaVersion: 2,
      battleId: request.battleId,
      rulesetId: M1_DOMAIN_BRIDGE_RULESET_ID,
      seed: 23,
      map: { hexes, blocked: [] },
      sides: [
        { id: sideId('a-side'), retreatHexes: hexes.filter(({ q }) => q === -2) },
        { id: sideId('b-side'), retreatHexes: hexes.filter(({ q }) => q === 2) },
      ],
    },
    parties: sources.map(({ root }, index) => ({
      companyId: root.lifecycle.companyId,
      partyId: root.lifecycle.parties[0]!.partyId,
      revision: root.lifecycle.revision,
      sideId: sideId(index === 0 ? 'a-side' : 'b-side'),
      members: root.lifecycle.characters
        .filter((character) => character.presence.fieldPartyId)
        .map((character, r) => {
          const practicePositions =
            index === 0
              ? [
                  { q: -1, r: 0 },
                  { q: 0, r: -1 },
                  { q: 0, r: 1 },
                ]
              : [
                  { q: 0, r: 0 },
                  { q: 1, r: -1 },
                  { q: 1, r: 0 },
                ];
          return {
            characterId: character.identity.characterId,
            unitId: unitId(`${character.identity.characterId}-unit`),
            position: adjacentPracticeParty
              ? practicePositions[r]!
              : { q: index === 0 ? -1 : 1, r: r - 1 },
          };
        }),
    })),
  };
  const binding = prepareEncounterBinding(sources, request, evidence);
  const root = sources[0]!.root;
  const journal = createCombatReceiptJournal(binding, root.lifecycle.companyId);
  return { sources, root, binding, journal, request, evidence };
}

function receiptPacket(
  f: ReturnType<typeof fixture>,
  transition: CombatTransition,
  kernelCommand: CombatCommand | null,
) {
  const receiptId = `${transition.state.battleId}:${transition.state.revision}`;
  const payload = {
    bindingId: f.binding.bindingId,
    receiptId,
    revision: String(transition.state.revision),
    orderedEvents: transition.events,
  };
  const request = {
    ...command(f.root, 'ConsumeCombatReceipt', payload, receiptId, 'COMBAT_RECEIPT'),
    payload,
    sourceEventId: receiptId,
  };
  const receiptContext: CombatReceiptContext = {
    ...context(f.root, request),
    binding: f.binding,
    kernelCommand,
    transition,
  };
  return { request, receiptContext };
}

export function accept(
  f: ReturnType<typeof fixture>,
  journal: CombatReceiptJournal,
  transition: CombatTransition,
  kernelCommand: CombatCommand | null,
) {
  const { request, receiptContext } = receiptPacket(f, transition, kernelCommand);
  return prepareCombatReceipt(journal, request, receiptContext).journal;
}

export function nextDefend(f: ReturnType<typeof fixture>, journal: CombatReceiptJournal) {
  const state = journal.receipts.at(-1)!.transition.state;
  const activation = state.activation!;
  const kernelCommand: CombatCommand = {
    type: 'defend',
    commandId: commandId(`physical-defend-${state.revision}`),
    activationId: activation.id,
    actorId: activation.unitId,
  };
  const result = applyCombatCommand(state, kernelCommand);
  if (!result.ok) throw new Error(result.error.message);
  return accept(f, journal, { state: result.state, events: result.events }, kernelCommand);
}

export function combatContext(
  f: ReturnType<typeof fixture>,
  facts: {
    readonly financeFacts: readonly FinanceEvidence[];
    readonly physicalFacts: readonly PhysicalEvidence[];
  },
): EconomyContext {
  const request = command(
    f.root,
    'ConsumeCombatReceipt',
    {},
    'combat-consequence-context',
    'COMBAT_RECEIPT',
  );
  return context(f.root, request, facts.financeFacts, [], facts.physicalFacts);
}

export function createCompanyCombatAggregateFixture(
  familySuccessor = false,
  health = 10000,
  departureItemCharacterId?: string,
) {
  const f = fixture(health, false, familySuccessor, departureItemCharacterId);
  for (const root of new Set([f.root, f.sources[0]!.root])) {
    const worker = root.lifecycle.characters.find(
      (person) => person.identity.characterId === 'a-worker-0',
    );
    if (!worker) throw new Error('Expected the fixture worker');
    delete (worker.aptitudeBySkill as Record<string, number>)['leadership'];
  }
  const initialJournal = accept(f, f.journal, f.binding.initial, null);
  const journal = nextDefend(f, initialJournal);
  const state: CompanyCombatAggregateState = {
    economy: f.root,
    learning: createCompanyLearningState(),
    social: createSocialState(),
    encounter: createCombatEncounterApplication(),
  };
  const begun = prepareBeginCombatAggregate(state, f.sources, f.request, f.evidence);
  if (begun.kind !== 'PREPARED') throw new Error(`Could not begin aggregate: ${begun.error}`);
  const practiceProfile = {
    version: COMBAT_PRACTICE_PROFILE_VERSION,
    profileId: 'aggregate-practice-profile',
    bindingId: begun.binding.bindingId,
    challengeLevel: 0,
    actionStarts: [],
    leadershipCycles: [],
  } as const;
  const applications = journal.receipts.map((receipt) => ({
    time: {
      version: COMBAT_RECEIPT_TIME_VERSION,
      id: `aggregate-time-${receipt.transition.state.revision}`,
      sourceEventId: receipt.request.sourceEventId!,
      battleId: f.binding.setup.battleId,
      receiptId: receipt.request.payload.receiptId,
      revision: receipt.transition.state.revision,
      atTick: f.root.lifecycle.campaignTick,
    },
    context: combatContext(f, { financeFacts: [], physicalFacts: [] }) as CombatOwnerContext,
    learning: { intervals: [] },
    practiceCredits: [],
  }));
  return { f, state, begun, initialJournal, journal, practiceProfile, applications };
}
