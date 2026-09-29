import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  COMPANY_RULES,
  COMBAT_RECEIPT_TIME_VERSION,
  chooseAiCommand,
  canonicalCombatState,
  admitPractice,
  creditProgression,
  progressionLevel,
  ENCOUNTER_BINDING_VERSION,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  applyCombatCommand,
  battleId,
  canonicalJson,
  commandId,
  createCombatReceiptJournal,
  createCombatEncounterApplication,
  createCompanyLearningState,
  createSocialState,
  entityId,
  initialSkillProgress,
  createHexagon,
  prepareCombatConsequences,
  prepareBeginCombatAggregate,
  prepareConsumeCombatAggregate,
  prepareFinalizeCombatAggregate,
  prepareCompanyEconomy,
  prepareCombatPracticeEffects,
  persistentMoraleAfterCombat,
  COMBAT_PRACTICE_PROFILE_VERSION,
  PROGRESSION_RULES,
  evaluatePerkEffects,
  createLearningTaskState,
  startLearningTask,
  prepareCombatPhysicalEffects,
  prepareCombatReceipt,
  prepareEncounterBinding,
  sideId,
  unitId,
} from '@warwrit/game-core';
import type {
  CombatCommand,
  CombatReceiptContext,
  CombatReceiptJournal,
  CombatTransition,
  EncounterCompanySource,
  EncounterPositionEvidence,
  EquipmentSlot,
  EconomyContext,
  FinanceEvidence,
  ServiceTermsEvidence,
  MaterializedCompanyState,
  PhysicalEvidence,
  PracticeEvidence,
  ProgressionAmount,
  CommandOf,
  CompanyCombatAggregateState,
  CombatOwnerContext,
} from '@warwrit/game-core';
import {
  command,
  context,
  cash,
  economy,
  physicalScope,
  place,
  scope,
} from './company-economy-fixture.js';
import { addContainer, addItem, addVitals, container, item } from './company-physical-fixture.js';

function source(prefix: string, health = 100, familySuccessor = false): EncounterCompanySource {
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

function fixture(health = 100, adjacentPracticeParty = false, familySuccessor = false) {
  const sources = [source('a', health, familySuccessor), source('b', 10000)];
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

function sameCompanyOpponentFixture() {
  const original = source('a', 10000);
  const secondPartyId = entityId<'FieldParty'>('a-opposing-party');
  const splitRoot = {
    ...original.root,
    lifecycle: {
      ...original.root.lifecycle,
      parties: [...original.root.lifecycle.parties, { partyId: secondPartyId, location: place }],
      characters: original.root.lifecycle.characters.map((character) =>
        character.identity.characterId === 'a-worker-1'
          ? {
              ...character,
              presence: { ...character.presence, fieldPartyId: secondPartyId },
            }
          : character,
      ),
    },
  };
  const own = { ...original, root: splitRoot };
  const hexes = createHexagon(2);
  const request = { bindingId: 'same-company-binding', battleId: battleId('same-company-battle') };
  const evidence: EncounterPositionEvidence = {
    id: 'same-company-placement',
    sourceEventId: 'same-company-contact',
    version: ENCOUNTER_BINDING_VERSION,
    bindingId: request.bindingId,
    worldId: splitRoot.lifecycle.worldId,
    atTick: splitRoot.lifecycle.campaignTick,
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
    parties: [
      {
        companyId: splitRoot.lifecycle.companyId,
        partyId: splitRoot.lifecycle.parties[0]!.partyId,
        revision: splitRoot.lifecycle.revision,
        sideId: sideId('a-side'),
        members: [
          { characterId: 'a-leader', unitId: unitId('same-leader'), position: { q: -1, r: 0 } },
          { characterId: 'a-worker-0', unitId: unitId('same-worker-0'), position: { q: -1, r: 1 } },
        ],
      },
      {
        companyId: splitRoot.lifecycle.companyId,
        partyId: secondPartyId,
        revision: splitRoot.lifecycle.revision,
        sideId: sideId('b-side'),
        members: [
          { characterId: 'a-worker-1', unitId: unitId('same-worker-1'), position: { q: 0, r: 0 } },
        ],
      },
    ],
  };
  const binding = prepareEncounterBinding([own], request, evidence);
  return {
    sources: [own],
    root: splitRoot,
    binding,
    journal: createCombatReceiptJournal(binding, splitRoot.lifecycle.companyId),
    request,
    evidence,
  };
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

function accept(
  f: ReturnType<typeof fixture>,
  journal: CombatReceiptJournal,
  transition: CombatTransition,
  kernelCommand: CombatCommand | null,
) {
  const { request, receiptContext } = receiptPacket(f, transition, kernelCommand);
  return prepareCombatReceipt(journal, request, receiptContext).journal;
}

function nextDefend(f: ReturnType<typeof fixture>, journal: CombatReceiptJournal) {
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

function attackUntilCompanyTakesArmorDamage(f: ReturnType<typeof fixture>) {
  let journal = accept(f, f.journal, f.binding.initial, null);
  const targetId = unitId('a-leader-unit');
  for (let index = 0; index < 16; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    const activation = state.activation;
    if (!activation) break;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    let kernelCommand: CombatCommand | undefined;
    if (actor.sideId === sideId('b-side')) {
      kernelCommand = {
        type: 'attack',
        commandId: commandId(`physical-attack-${state.revision}`),
        activationId: activation.id,
        actorId: activation.unitId,
        targetId,
      };
      if (!applyCombatCommand(state, kernelCommand).ok) {
        const target = state.units.find((unit) => unit.id === targetId)!;
        const occupied = new Set(state.units.map(({ position }) => `${position.q},${position.r}`));
        const distance = (a: { q: number; r: number }, b: { q: number; r: number }) =>
          (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
        const destination = state.map.hexes.find(
          (hex) =>
            !occupied.has(`${hex.q},${hex.r}`) &&
            distance(hex, actor.position) < distance(target.position, actor.position) &&
            distance(hex, target.position) < distance(actor.position, target.position),
        );
        if (destination)
          kernelCommand = {
            type: 'move',
            commandId: commandId(`physical-move-${state.revision}`),
            activationId: activation.id,
            actorId: activation.unitId,
            to: destination,
          };
        else kernelCommand = undefined;
      }
    }
    const attempted = kernelCommand && applyCombatCommand(state, kernelCommand);
    const result = attempted?.ok
      ? attempted
      : applyCombatCommand(state, {
          type: 'defend',
          commandId: commandId(`physical-fallback-${state.revision}`),
          activationId: activation.id,
          actorId: activation.unitId,
        });
    if (!result.ok) throw new Error(result.error.message);
    journal = accept(
      f,
      journal,
      { state: result.state, events: result.events },
      attempted?.ok
        ? kernelCommand!
        : {
            type: 'defend',
            commandId: commandId(`physical-fallback-${state.revision}`),
            activationId: activation.id,
            actorId: activation.unitId,
          },
    );
    if (
      result.events.some(
        (event) =>
          event.type === 'unit.damaged' && event.unitId === targetId && event.armorDamage > 0,
      )
    )
      return journal;
  }
  throw new Error('Combat fixture did not produce armor damage to the company unit');
}

function attackUntilCompanyUnitIsWounded(f: ReturnType<typeof fixture>) {
  let journal = accept(f, f.journal, f.binding.initial, null);
  const targetId = unitId('a-leader-unit');
  for (let index = 0; index < 128; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    const activation = state.activation;
    if (!activation) break;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    let kernelCommand: CombatCommand | undefined;
    if (actor.sideId === sideId('b-side')) {
      kernelCommand = {
        type: 'attack',
        commandId: commandId(`physical-wound-attack-${state.revision}`),
        activationId: activation.id,
        actorId: activation.unitId,
        targetId,
      };
      if (!applyCombatCommand(state, kernelCommand).ok) {
        const target = state.units.find((unit) => unit.id === targetId)!;
        const occupied = new Set(state.units.map(({ position }) => `${position.q},${position.r}`));
        const distance = (a: { q: number; r: number }, b: { q: number; r: number }) =>
          (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
        const destination = state.map.hexes.find(
          (hex) =>
            !occupied.has(`${hex.q},${hex.r}`) &&
            distance(hex, actor.position) < distance(target.position, actor.position) &&
            distance(hex, target.position) < distance(actor.position, target.position),
        );
        kernelCommand = destination
          ? {
              type: 'move',
              commandId: commandId(`physical-wound-move-${state.revision}`),
              activationId: activation.id,
              actorId: activation.unitId,
              to: destination,
            }
          : undefined;
      }
    }
    const attempted = kernelCommand && applyCombatCommand(state, kernelCommand);
    const acceptedCommand: CombatCommand = attempted?.ok
      ? kernelCommand!
      : {
          type: 'wait',
          commandId: commandId(`physical-wound-wait-${state.revision}`),
          activationId: activation.id,
          actorId: activation.unitId,
        };
    const result = attempted?.ok ? attempted : applyCombatCommand(state, acceptedCommand);
    if (!result.ok) throw new Error(result.error.message);
    journal = accept(f, journal, { state: result.state, events: result.events }, acceptedCommand);
    if (result.events.some((event) => event.type === 'unit.wounded' && event.unitId === targetId))
      return journal;
  }
  throw new Error('Combat fixture did not wound the company unit');
}

function attackUntilCompanyUnitDies(f: ReturnType<typeof fixture>) {
  let journal = accept(f, f.journal, f.binding.initial, null);
  const targetId = unitId('a-leader-unit');
  for (let index = 0; index < 128; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    const activation = state.activation;
    if (!activation) break;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    let kernelCommand: CombatCommand | undefined;
    if (actor.sideId === sideId('b-side')) {
      kernelCommand = {
        type: 'attack',
        commandId: commandId(`physical-death-attack-${state.revision}`),
        activationId: activation.id,
        actorId: activation.unitId,
        targetId,
      };
      if (!applyCombatCommand(state, kernelCommand).ok) {
        const target = state.units.find((unit) => unit.id === targetId)!;
        const occupied = new Set(state.units.map(({ position }) => `${position.q},${position.r}`));
        const distance = (a: { q: number; r: number }, b: { q: number; r: number }) =>
          (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
        const destination = state.map.hexes.find(
          (hex) =>
            !occupied.has(`${hex.q},${hex.r}`) &&
            distance(hex, actor.position) < distance(target.position, actor.position) &&
            distance(hex, target.position) < distance(actor.position, target.position),
        );
        kernelCommand = destination
          ? {
              type: 'move',
              commandId: commandId(`physical-death-move-${state.revision}`),
              activationId: activation.id,
              actorId: activation.unitId,
              to: destination,
            }
          : undefined;
      }
    }
    const attempted = kernelCommand && applyCombatCommand(state, kernelCommand);
    const fallback: CombatCommand = {
      type: 'wait',
      commandId: commandId(`physical-death-wait-${state.revision}`),
      activationId: activation.id,
      actorId: activation.unitId,
    };
    const acceptedCommand = attempted?.ok ? kernelCommand! : fallback;
    const result = attempted?.ok ? attempted : applyCombatCommand(state, fallback);
    if (!result.ok) throw new Error(result.error.message);
    journal = accept(f, journal, { state: result.state, events: result.events }, acceptedCommand);
    if (result.events.some((event) => event.type === 'unit.died' && event.unitId === targetId))
      return journal;
  }
  throw new Error('Combat fixture did not kill the company unit');
}

function resolveCombatJournal(
  f: ReturnType<typeof fixture>,
  journal: CombatReceiptJournal,
): CombatReceiptJournal {
  for (let index = 0; index < 500; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    if (state.status !== 'active') return journal;
    const actor = state.units.find((unit) => unit.id === state.activation?.unitId);
    if (!actor) throw new Error('Expected active combat actor');
    const kernelCommand = chooseAiCommand(
      state,
      actor.sideId === sideId('b-side') ? 'survivor' : 'aggressive',
    );
    const transition = applyCombatCommand(state, kernelCommand);
    if (!transition.ok) throw new Error(transition.error.message);
    journal = accept(
      f,
      journal,
      { state: transition.state, events: transition.events },
      kernelCommand,
    );
  }
  throw new Error('Combat fixture did not resolve');
}

function combatFacts(
  f: ReturnType<typeof fixture>,
  journal: CombatReceiptJournal,
  includeDeathFacts = true,
): {
  readonly financeFacts: readonly FinanceEvidence[];
  readonly physicalFacts: readonly PhysicalEvidence[];
} {
  const financeFacts: FinanceEvidence[] = [];
  const physicalFacts: PhysicalEvidence[] = [];
  for (const receipt of journal.receipts) {
    for (let ordinal = 0; ordinal < receipt.transition.events.length; ordinal += 1) {
      const event = receipt.transition.events[ordinal]!;
      if (event.type !== 'unit.wounded' && event.type !== 'unit.died') continue;
      const characterId = characterForUnit(f, event.unitId);
      if (!characterId) continue;
      const sourceEventId = receipt.sourceEventIds[ordinal]!;
      if (event.type === 'unit.wounded') {
        physicalFacts.push({
          ...physicalScope(
            f.root,
            `condition-${ordinal}-${event.revision}`,
            f.root.lifecycle.campaignTick,
            ordinal,
          ),
          sourceEventId,
          kind: 'CONDITION_SOURCE',
          characterId,
          definitionId: event.severity === 'minor' ? 'minor-field-wound' : 'severe-stable-wound',
          causeId: `combat-wound-${event.revision}-${ordinal}`,
          onsetTick: f.root.lifecycle.campaignTick,
        });
      } else if (includeDeathFacts) {
        const causeId = `combat-fatal-${event.revision}-${ordinal}`;
        const custodyOutcomeId = `death-outcome-${event.revision}-${ordinal}`;
        const receiptId = `death-finance-${event.revision}-${ordinal}`;
        physicalFacts.push({
          ...physicalScope(f.root, custodyOutcomeId, f.root.lifecycle.campaignTick, ordinal),
          sourceEventId,
          kind: 'DEATH_OUTCOME',
          characterId,
          actualDeathTick: f.root.lifecycle.campaignTick,
          causeId,
          location: f.binding.location,
          corpseContainerId: `corpse-${event.revision}-${ordinal}`,
        });
        financeFacts.push({
          ...scope(f.root, receiptId, f.root.lifecycle.campaignTick),
          sourceEventId,
          kind: 'FINANCIAL_DEATH',
          characterId,
          actualDeathTick: f.root.lifecycle.campaignTick,
          recipient: { kind: 'ESTATE', id: characterId },
          causeId,
          custodyOutcomeId,
        });
      }
    }
  }
  return { financeFacts, physicalFacts };
}

function combatContext(
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

function practiceJournal(
  f: ReturnType<typeof fixture>,
  requiredAttacks: readonly { readonly characterId: string; readonly count: number }[] = [],
) {
  let journal = accept(f, f.journal, f.binding.initial, null);
  for (let index = 0; index < 64; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    const activation = state.activation;
    if (!activation) break;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    const enemies = state.units
      .filter((unit) => unit.sideId !== actor.sideId && unit.health > 0)
      .sort((left, right) => {
        const distance = (unit: typeof actor) =>
          (Math.abs(unit.position.q - actor.position.q) +
            Math.abs(unit.position.r - actor.position.r) +
            Math.abs(unit.position.q + unit.position.r - actor.position.q - actor.position.r)) /
          2;
        return distance(left) - distance(right) || left.id.localeCompare(right.id);
      });
    const attack = enemies
      .map((target) => ({
        type: 'attack' as const,
        commandId: commandId(`practice-attack-${state.revision}`),
        activationId: activation.id,
        actorId: activation.unitId,
        targetId: target.id,
      }))
      .find((candidate) => applyCombatCommand(state, candidate).ok);
    let commandValue: CombatCommand;
    if (attack) commandValue = attack;
    else {
      const target = enemies[0];
      const distance = (a: { q: number; r: number }, b: { q: number; r: number }) =>
        (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
      const occupied = new Set(state.units.map((unit) => `${unit.position.q},${unit.position.r}`));
      const destination =
        target &&
        state.map.hexes.find(
          (hex) =>
            !occupied.has(`${hex.q},${hex.r}`) &&
            distance(hex, actor.position) < distance(target.position, actor.position),
        );
      commandValue = destination
        ? {
            type: 'move',
            commandId: commandId(`practice-move-${state.revision}`),
            activationId: activation.id,
            actorId: activation.unitId,
            to: destination,
          }
        : {
            type: 'wait',
            commandId: commandId(`practice-wait-${state.revision}`),
            activationId: activation.id,
            actorId: activation.unitId,
          };
      if (!applyCombatCommand(state, commandValue).ok)
        commandValue = {
          type: 'wait',
          commandId: commandId(`practice-wait-${state.revision}`),
          activationId: activation.id,
          actorId: activation.unitId,
        };
    }
    const result = applyCombatCommand(state, commandValue);
    if (!result.ok) throw new Error(result.error.message);
    journal = accept(f, journal, { state: result.state, events: result.events }, commandValue);
    if (
      requiredAttacks.every(
        ({ characterId, count }) =>
          journal.receipts.filter(
            (receipt) =>
              receipt.kernelCommand?.type === 'attack' &&
              characterForUnit(f, receipt.kernelCommand.actorId) === characterId &&
              receipt.transition.events.some((event) => event.type === 'attack.resolved'),
          ).length >= count,
      )
    )
      return journal;
  }
  return journal;
}

function firstLegalAttackJournal(f: ReturnType<typeof fixture>) {
  let journal = accept(f, f.journal, f.binding.initial, null);
  for (let index = 0; index < 12; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    const activation = state.activation;
    if (!activation) break;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    const target = state.units.find((unit) => unit.sideId !== actor.sideId && unit.health > 0);
    const attack: CombatCommand = {
      type: 'attack',
      commandId: commandId(`same-company-attack-${state.revision}`),
      activationId: activation.id,
      actorId: activation.unitId,
      targetId: target!.id,
    };
    const attempted = applyCombatCommand(state, attack);
    const kernelCommand: CombatCommand = attempted.ok
      ? attack
      : {
          type: 'wait',
          commandId: commandId(`same-company-wait-${state.revision}`),
          activationId: activation.id,
          actorId: activation.unitId,
        };
    const result = attempted.ok ? attempted : applyCombatCommand(state, kernelCommand);
    if (!result.ok) throw new Error(result.error.message);
    journal = accept(f, journal, { state: result.state, events: result.events }, kernelCommand);
    if (kernelCommand.type === 'attack') return journal;
  }
  throw new Error("Expected an actual attack between the same company's parties");
}

function guardedIncomingJournal(f: ReturnType<typeof fixture>) {
  let journal = accept(f, f.journal, f.binding.initial, null);
  let defendReceipt: CombatReceiptJournal['receipts'][number] | undefined;
  let incomingReceipt: CombatReceiptJournal['receipts'][number] | undefined;
  const leaderUnitId = unitId('a-leader-unit');
  for (let index = 0; index < 16 && !incomingReceipt; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    const activation = state.activation;
    if (!activation) break;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    let candidate: CombatCommand | undefined;
    if (actor.id === leaderUnitId && !defendReceipt) {
      candidate = {
        type: 'defend',
        commandId: commandId(`guard-practice-defend-${state.revision}`),
        activationId: activation.id,
        actorId: actor.id,
      };
    } else if (
      defendReceipt &&
      actor.sideId === sideId('b-side') &&
      state.units.find((unit) => unit.id === leaderUnitId)?.guarding
    ) {
      candidate = {
        type: 'attack',
        commandId: commandId(`guard-practice-attack-${state.revision}`),
        activationId: activation.id,
        actorId: actor.id,
        targetId: leaderUnitId,
      };
    }
    const attempted = candidate && applyCombatCommand(state, candidate);
    const commandValue: CombatCommand =
      candidate && attempted?.ok
        ? candidate
        : {
            type: 'wait',
            commandId: commandId(`guard-practice-wait-${state.revision}`),
            activationId: activation.id,
            actorId: actor.id,
          };
    const result = attempted?.ok ? attempted : applyCombatCommand(state, commandValue);
    if (!result.ok) throw new Error(result.error.message);
    journal = accept(f, journal, { state: result.state, events: result.events }, commandValue);
    const receipt = journal.receipts.at(-1)!;
    if (commandValue.type === 'defend') defendReceipt = receipt;
    if (
      commandValue.type === 'attack' &&
      state.units.find((unit) => unit.id === leaderUnitId)?.guarding &&
      receipt.transition.events.some(
        (event) => event.type === 'attack.resolved' && event.targetId === leaderUnitId,
      )
    )
      incomingReceipt = receipt;
  }
  if (!defendReceipt || !incomingReceipt)
    throw new Error('Expected a real defend followed by an incoming attack');
  return { journal, defendReceipt, incomingReceipt };
}

function characterForUnit(f: ReturnType<typeof fixture>, id: string) {
  return f.binding.participants.find((participant) => participant.unitId === id)?.projection
    .characterId;
}

describe('G07 — prepared physical combat effects', () => {
  it('persists verified pools, including the initial clamp, and replays deterministically', () => {
    const f = fixture();
    const unchanged = canonicalJson(f.root);
    let journal = accept(f, f.journal, f.binding.initial, null);

    const longRoot: MaterializedCompanyState = {
      ...f.root,
      physical: {
        ...f.root.physical,
        sourceEffects: Array.from({ length: 1001 }, (_, index) => ({
          key: `long-history-${index}`,
          requestKey: `long-request-${index}`,
        })),
      },
    };
    const longRootBefore = {
      lifecycle: canonicalJson(longRoot.lifecycle),
      finance: canonicalJson(longRoot.finance),
      sourceEffects: longRoot.physical.sourceEffects,
      vitals: canonicalJson(longRoot.physical.vitals),
      items: canonicalJson(longRoot.physical.items),
    };
    const longHistory = prepareCombatPhysicalEffects(longRoot, journal);
    expect(longHistory.root.lifecycle).toBe(longRoot.lifecycle);
    expect(longHistory.root.finance).toBe(longRoot.finance);
    expect(longHistory.root.physical.sourceEffects).toBe(longRoot.physical.sourceEffects);
    expect(longHistory.root.physical.knowledge).toBe(longRoot.physical.knowledge);
    expect(canonicalJson(longRoot.lifecycle)).toBe(longRootBefore.lifecycle);
    expect(canonicalJson(longRoot.finance)).toBe(longRootBefore.finance);
    expect(longRoot.physical.sourceEffects).toBe(longRootBefore.sourceEffects);
    expect(canonicalJson(longRoot.physical.vitals)).toBe(longRootBefore.vitals);
    expect(canonicalJson(longRoot.physical.items)).toBe(longRootBefore.items);

    const emptyJournalBefore = canonicalJson({ root: f.root, journal: f.journal });
    expect(() => prepareCombatPhysicalEffects(f.root, f.journal)).toThrow();
    expect(canonicalJson({ root: f.root, journal: f.journal })).toBe(emptyJournalBefore);

    const state = journal.receipts.at(-1)!.transition.state;
    if (state.activation?.unitId !== unitId('a-leader-unit')) journal = nextDefend(f, journal);
    journal = nextDefend(f, journal);
    const before = canonicalJson({ root: f.root, journal });

    const first = prepareCombatPhysicalEffects(f.root, journal);
    const second = prepareCombatPhysicalEffects(
      f.root,
      JSON.parse(JSON.stringify(journal)) as CombatReceiptJournal,
    );
    expect(first).toEqual(second);
    expect(() => prepareCombatPhysicalEffects(first.root, journal)).toThrow();
    expect(first.status).toBe('PREPARED');
    expect(first.root.physical.vitals[0]).toMatchObject({ currentHealth: 60, currentStamina: 72 });
    const body = first.root.physical.items.find((entry) => entry.definitionId === 'padded-coat')!;
    const head = first.root.physical.items.find((entry) => entry.definitionId === 'simple-helmet')!;
    expect([body.currentCondition, head.currentCondition]).toEqual([7, 5]);
    expect(first.root.physical.conditions).toEqual(f.root.physical.conditions);
    expect(first.root.physical.knowledge).toEqual(f.root.physical.knowledge);
    expect(first.root.lifecycle).toEqual(f.root.lifecycle);
    expect(first.root.finance).toEqual(f.root.finance);
    expect(first.proposedLastAppliedRevision).toBe(journal.proposedLastAppliedRevision);
    expect(journal.binding.lastAppliedRevision).toBe(f.binding.lastAppliedRevision);
    expect(canonicalJson({ root: f.root, journal })).toBe(before);
    expect(canonicalJson(f.root)).toBe(unchanged);
  });

  it('allocates real armor loss BODY then HEAD and rejects altered provenance atomically', () => {
    const f = fixture();
    const journal = attackUntilCompanyTakesArmorDamage(f);
    const before = canonicalJson({ root: f.root, journal });
    const prepared = prepareCombatPhysicalEffects(f.root, journal);
    const body = prepared.root.physical.items.find(
      (entry) => entry.definitionId === 'padded-coat',
    )!;
    const head = prepared.root.physical.items.find(
      (entry) => entry.definitionId === 'simple-helmet',
    )!;
    const unit = journal.receipts
      .at(-1)!
      .transition.state.units.find((entry) => entry.id === unitId('a-leader-unit'))!;
    expect(
      prepared.root.physical.vitals.find((entry) => entry.characterId === 'a-leader')
        ?.currentHealth,
    ).toBe(unit.health);
    expect(
      prepared.root.physical.vitals.find((entry) => entry.characterId === 'a-leader')
        ?.currentStamina,
    ).toBe(unit.stamina);
    const loss = 12 - unit.armor;
    expect(loss).toBeGreaterThan(0);
    expect(unit.health).toBeLessThan(60);
    expect(body.currentCondition).toBe(7 - Math.min(7, loss));
    expect(head.currentCondition).toBe(5 - Math.max(0, loss - 7));
    expect(body.currentCondition).toBeGreaterThanOrEqual(0);
    expect(head.currentCondition).toBeGreaterThanOrEqual(0);

    const copied = structuredClone(journal);
    const gapped = { ...copied, receipts: copied.receipts.filter((_, index) => index !== 1) };
    expect(() => prepareCombatPhysicalEffects(f.root, gapped)).toThrow();
    expect(canonicalJson({ root: f.root, journal })).toBe(before);

    const forged = JSON.parse(JSON.stringify(journal)) as CombatReceiptJournal;
    Reflect.set(forged.receipts.at(-1)!.transition.state.units[0]!, 'health', 1);
    expect(() => prepareCombatPhysicalEffects(f.root, forged)).toThrow();
    expect(canonicalJson({ root: f.root, journal })).toBe(before);

    const foreign = structuredClone(f.root) as MaterializedCompanyState;
    Reflect.set(foreign.lifecycle, 'companyId', 'foreign-company');
    expect(() => prepareCombatPhysicalEffects(foreign, journal)).toThrow();
    expect(canonicalJson({ root: f.root, journal })).toBe(before);

    const mismatched = structuredClone(f.root) as MaterializedCompanyState;
    const armor = mismatched.physical.items.find((entry) => entry.definitionId === 'padded-coat')!;
    Reflect.set(armor, 'currentCondition', armor.currentCondition - 1);
    expect(() => prepareCombatPhysicalEffects(mismatched, journal)).toThrow();
    expect(canonicalJson({ root: f.root, journal })).toBe(before);
  });
});

describe('G08 — verified combat consequences', () => {
  it('applies only actual kernel wounds and deterministically replays the verified candidate', () => {
    const f = fixture(40);
    const journal = attackUntilCompanyUnitIsWounded(f);
    const facts = combatFacts(f, journal);
    const woundEvents = journal.receipts.flatMap((receipt) =>
      receipt.transition.events.filter(
        (event) => event.type === 'unit.wounded' && event.unitId === unitId('a-leader-unit'),
      ),
    );
    expect(woundEvents.length).toBeGreaterThan(0);
    const candidate = prepareCombatPhysicalEffects(f.root, journal);
    const ctx = combatContext(f, facts);
    const before = canonicalJson({ root: f.root, journal });

    const prepared = prepareCombatConsequences(f.root, candidate, journal, ctx);
    const woundEventIds = journal.receipts.flatMap((receipt) => receipt.sourceEventIds);
    const conditions = prepared.root.physical.conditions.filter((condition) =>
      woundEventIds.includes(condition.sourceEventId),
    );
    expect(conditions).toHaveLength(woundEvents.length);
    expect(conditions.every((condition) => condition.resolvedAt === null)).toBe(true);
    expect(prepared.root.finance).toBe(f.root.finance);
    expect(prepared.root.lifecycle.knowledge).toBe(f.root.lifecycle.knowledge);
    expect(prepared.proposedLastAppliedRevision).toBe(journal.proposedLastAppliedRevision);
    expect(journal.binding.lastAppliedRevision).toBe(f.binding.lastAppliedRevision);
    expect(prepareCombatConsequences(f.root, candidate, journal, ctx)).toEqual(prepared);
    expect(before).toBe(canonicalJson({ root: f.root, journal }));

    const forged = { ...candidate, root: f.root };
    expect(() => prepareCombatConsequences(f.root, forged, journal, ctx)).toThrow();
    expect(() =>
      prepareCombatConsequences(
        f.root,
        candidate,
        journal,
        combatContext(f, {
          financeFacts: [],
          physicalFacts: [],
        }),
      ),
    ).toThrow();
  });

  it('requires both an actual death event and matching private facts, rejecting late failures atomically', () => {
    const f = fixture();
    const journal = attackUntilCompanyUnitDies(f);
    const deathEvents = journal.receipts.flatMap((receipt) =>
      receipt.transition.events.filter(
        (event) => event.type === 'unit.died' && event.unitId === unitId('a-leader-unit'),
      ),
    );
    expect(deathEvents).toHaveLength(1);
    const candidate = prepareCombatPhysicalEffects(f.root, journal);
    const facts = combatFacts(f, journal);
    const missingDeathEvidence = combatContext(f, combatFacts(f, journal, false));
    const before = canonicalJson({ root: f.root, journal, candidate });

    expect(() =>
      prepareCombatConsequences(f.root, candidate, journal, missingDeathEvidence),
    ).toThrow();
    expect(before).toBe(canonicalJson({ root: f.root, journal, candidate }));

    const prepared = prepareCombatConsequences(f.root, candidate, journal, combatContext(f, facts));
    expect(
      prepared.root.lifecycle.characters.find(
        (character) => character.identity.characterId === 'a-leader',
      )?.presence.availability,
    ).toBe('DEAD');
    expect(
      prepared.root.finance.accounts.find((account) => account.recipient.id === 'a-leader'),
    ).toMatchObject({ knownDeath: false, death: { atTick: f.root.lifecycle.campaignTick } });
    expect(prepared.root.lifecycle.knowledge).toBe(f.root.lifecycle.knowledge);
    expect(prepared.requirements).toEqual([]);
    expect(prepared.proposedLastAppliedRevision).toBe(journal.proposedLastAppliedRevision);
    expect(journal.binding.lastAppliedRevision).toBe(f.binding.lastAppliedRevision);
    expect(before).toBe(canonicalJson({ root: f.root, journal, candidate }));
  });
});

describe('G09 — verified combat practice', () => {
  // This multi-actor case repeatedly verifies the growing receipt chain.
  it('credits only replayed company attacks, preserves G08 requirements and leaves the cursor pending', () => {
    const f = fixture(10000, true);
    const journal = practiceJournal(f, [
      { characterId: 'a-leader', count: 2 },
      { characterId: 'a-worker-0', count: 1 },
      { characterId: 'a-worker-1', count: 1 },
    ]);
    const companyAttacks = journal.receipts.filter((receipt) => {
      const kernelCommand = receipt.kernelCommand;
      return (
        kernelCommand?.type === 'attack' &&
        f.binding.participants.find((entry) => entry.unitId === kernelCommand.actorId)
          ?.companyId === f.root.lifecycle.companyId
      );
    });
    expect(companyAttacks.length).toBeGreaterThan(0);
    const leaderAttacks = companyAttacks.filter(
      (receipt) =>
        receipt.kernelCommand?.type === 'attack' &&
        characterForUnit(f, receipt.kernelCommand.actorId) === 'a-leader',
    );
    expect(leaderAttacks).toHaveLength(2);
    expect(
      leaderAttacks.map((receipt) =>
        receipt.transition.events.find((event) => event.type === 'attack.resolved'),
      ),
    ).toEqual([
      expect.objectContaining({ type: 'attack.resolved', hit: true }),
      expect.objectContaining({ type: 'attack.resolved', hit: true }),
    ]);
    const subordinateAttacks = companyAttacks.filter((receipt) => {
      const kernelCommand = receipt.kernelCommand;
      return (
        kernelCommand?.type === 'attack' &&
        characterForUnit(f, kernelCommand.actorId) !== 'a-leader'
      );
    });
    const firstBySubordinate = new Map<string, (typeof subordinateAttacks)[number]>();
    for (const receipt of subordinateAttacks) {
      const kernelCommand = receipt.kernelCommand!;
      const characterId = characterForUnit(f, kernelCommand.actorId)!;
      if (!firstBySubordinate.has(characterId)) firstBySubordinate.set(characterId, receipt);
    }
    const firstCycleAttacks = [...firstBySubordinate.values()].slice(0, 2);
    expect(firstCycleAttacks).toHaveLength(2);
    const cycleStartOrdinal = Math.min(
      ...firstCycleAttacks.map((receipt) => journal.receipts.indexOf(receipt)),
    );
    const cycleEndOrdinal = Math.max(
      ...firstCycleAttacks.map((receipt) => journal.receipts.indexOf(receipt)),
    );
    const cycle = {
      cycleId: 'practice-cycle-1',
      commanderId: 'a-leader',
      startedAt: f.root.lifecycle.campaignTick,
      completedAt: f.root.lifecycle.campaignTick,
      startReceiptOrdinal: cycleStartOrdinal,
      endReceiptOrdinal: cycleEndOrdinal,
    } as const;
    const cycleThreats = subordinateAttacks.filter((receipt) => {
      const ordinal = journal.receipts.indexOf(receipt);
      return ordinal >= cycleStartOrdinal && ordinal <= cycleEndOrdinal;
    });
    const physical = prepareCombatPhysicalEffects(f.root, journal);
    const ctx = combatContext(f, combatFacts(f, journal));
    const g08 = prepareCombatConsequences(f.root, physical, journal, ctx);
    const profile = {
      version: COMBAT_PRACTICE_PROFILE_VERSION,
      profileId: 'fixture-combat-challenge-v1',
      bindingId: f.binding.bindingId,
      challengeLevel: 0,
      actionStarts: companyAttacks.flatMap((receipt) => {
        const kernelCommand = receipt.kernelCommand;
        return kernelCommand?.type === 'attack'
          ? [
              {
                activationId: kernelCommand.activationId,
                unitId: kernelCommand.actorId,
                startedAt: f.root.lifecycle.campaignTick,
                startReceiptOrdinal: journal.receipts.indexOf(receipt),
              },
            ]
          : [];
      }),
      leadershipCycles: [cycle],
    } as const;
    const xpAtReceipt = new Map<string, number>();
    const attackCredits = companyAttacks.flatMap((receipt) => {
      const kernelCommand = receipt.kernelCommand;
      if (kernelCommand?.type !== 'attack') return [];
      const ordinal = receipt.transition.events.findIndex(
        (event) => event.type === 'attack.resolved',
      );
      const sourceEventId = receipt.sourceEventIds[ordinal]!;
      const participant = f.binding.participants.find(
        (entry) => entry.unitId === kernelCommand.actorId,
      )!;
      const defender = f.binding.participants.find(
        (entry) => entry.unitId === kernelCommand.targetId,
      );
      const event = receipt.transition.events[ordinal]!;
      if (event.type !== 'attack.resolved') throw new Error('Expected attack event');
      const progressKey = `${participant.projection.characterId}:${participant.projection.weapon.skillId}`;
      const xpBefore = xpAtReceipt.get(progressKey) ?? 0;
      let levelAtStart = 0;
      while (
        COMPANY_RULES.maxSkillLevel > levelAtStart + 1 &&
        xpBefore >= PROGRESSION_RULES.thresholdXpFactor * (levelAtStart + 1) * (levelAtStart + 2)
      )
        levelAtStart += 1;
      const payload = {
        receiptId: `${sourceEventId}-${profile.profileId}-${participant.projection.characterId}-weapon-attack`,
        characterId: participant.projection.characterId,
        skillId: participant.projection.weapon.skillId,
        methodId: 'weapon-attack',
        challengeLevel: profile.challengeLevel,
        outcome: event.hit ? 'SUCCESS' : 'MEANINGFUL_FAILURE',
        effortTicks: '0',
      } as const;
      const base = command(
        f.root,
        'CreditPractice',
        payload,
        `practice-${sourceEventId}`,
        'DOMAIN_RECEIPT',
        f.root.lifecycle.campaignTick,
      );
      const practiceCommand = { ...base, sourceEventId } as CommandOf<'CreditPractice'>;
      const fact: PracticeEvidence = {
        worldId: f.root.lifecycle.worldId,
        companyId: f.root.lifecycle.companyId,
        sourceEventId,
        rulesVersion: PROGRESSION_RULES.version,
        catalogueVersion: COMPANY_CATALOGUE.version,
        payload,
        startedAt: f.root.lifecycle.campaignTick,
        completedAt: f.root.lifecycle.campaignTick,
        levelAtStart,
        aptitudeAtStartBps: 10000,
        proof: {
          kind: 'weapon-attack',
          interaction: {
            sourceEventId,
            attackerId: participant.projection.characterId,
            defenderId: defender?.projection.characterId ?? event.targetId,
            atTick: f.root.lifecycle.campaignTick,
            origin: 'EXTERNAL',
          },
          weaponProfile: participant.projection.weapon.profileId,
        },
      };
      const trustedContext = {
        ...context(f.root, practiceCommand as ReturnType<typeof command>),
        internalGrant: {
          commandId: practiceCommand.commandId,
          sourceEventId,
          canonicalRequest: canonicalJson(practiceCommand),
        },
        practiceFacts: [fact],
      };
      xpAtReceipt.set(progressKey, xpBefore + (event.hit ? 20 : 5));
      return [{ command: practiceCommand, context: trustedContext }];
    });
    const cycleSourceEventId = cycle.cycleId;
    const cyclePayload = {
      receiptId: `${cycleSourceEventId}-${profile.profileId}-${cycle.commanderId}-command-cycle`,
      characterId: cycle.commanderId,
      skillId: 'leadership',
      methodId: 'command-cycle',
      challengeLevel: profile.challengeLevel,
      outcome: 'SUCCESS',
      effortTicks: '0',
    } as const;
    const cycleBase = command(
      f.root,
      'CreditPractice',
      cyclePayload,
      'practice-leadership-cycle-1',
      'DOMAIN_RECEIPT',
      f.root.lifecycle.campaignTick,
    );
    const cycleCommand = {
      ...cycleBase,
      sourceEventId: cycleSourceEventId,
    } as CommandOf<'CreditPractice'>;
    const cycleProofInteractions = cycleThreats.flatMap((receipt) => {
      const kernelCommand = receipt.kernelCommand;
      if (kernelCommand?.type !== 'attack') return [];
      const eventIndex = receipt.transition.events.findIndex(
        (event) => event.type === 'attack.resolved',
      );
      const event = receipt.transition.events[eventIndex];
      if (event?.type !== 'attack.resolved') return [];
      const sourceEventId = receipt.sourceEventIds[eventIndex]!;
      return [
        {
          sourceEventId,
          attackerId: characterForUnit(f, kernelCommand.actorId)!,
          defenderId: characterForUnit(f, kernelCommand.targetId)!,
          atTick: f.root.lifecycle.campaignTick,
          origin: 'EXTERNAL' as const,
        },
      ];
    });
    const cycleFact: PracticeEvidence = {
      worldId: f.root.lifecycle.worldId,
      companyId: f.root.lifecycle.companyId,
      sourceEventId: cycleSourceEventId,
      rulesVersion: PROGRESSION_RULES.version,
      catalogueVersion: COMPANY_CATALOGUE.version,
      payload: cyclePayload,
      startedAt: cycle.startedAt,
      completedAt: cycle.completedAt,
      levelAtStart: 0,
      aptitudeAtStartBps: 10000,
      proof: {
        kind: 'command-cycle',
        commanderId: cycle.commanderId,
        cycleId: cycle.cycleId,
        subordinateIds: [
          ...new Set(cycleProofInteractions.map((entry) => entry.attackerId)),
        ].sort(),
        interactions: cycleProofInteractions,
      },
    };
    const cycleContext = {
      ...context(f.root, cycleCommand as ReturnType<typeof command>),
      internalGrant: {
        commandId: cycleCommand.commandId,
        sourceEventId: cycleSourceEventId,
        canonicalRequest: canonicalJson(cycleCommand),
      },
      practiceFacts: [cycleFact],
    };
    const trustedCredits = [...attackCredits, { command: cycleCommand, context: cycleContext }];
    const before = structuredClone({ root: f.root, journal, physical });

    const prepared = prepareCombatPracticeEffects(
      f.root,
      physical,
      g08,
      journal,
      ctx,
      profile,
      trustedCredits,
    );
    expect(prepared.credits).toBeGreaterThan(0);
    expect(prepared.root.finance.sourceEffects.length).toBe(
      g08.root.finance.sourceEffects.length + prepared.credits,
    );
    const leaderCharacter = prepared.root.lifecycle.characters.find(
      (entry) => entry.identity.characterId === 'a-leader',
    );
    if (!leaderCharacter) throw new Error('Expected the leader progression snapshot');
    const leaderBlades = leaderCharacter.skills['blades'];
    if (!leaderBlades || typeof leaderBlades === 'number')
      throw new Error('Expected exact leader blade progression');
    expect(leaderBlades.amount.milliXp).toBe('39600');
    expect(prepared.requirements).toEqual(g08.requirements);
    expect(prepared.proposedLastAppliedRevision).toBe(journal.proposedLastAppliedRevision);
    expect(journal.binding.lastAppliedRevision).toBe(f.binding.lastAppliedRevision);
    expect(
      prepareCombatPracticeEffects(f.root, physical, g08, journal, ctx, profile, trustedCredits),
    ).toEqual(prepared);
    expect(() =>
      prepareCombatPracticeEffects(f.root, physical, g08, journal, ctx, profile, []),
    ).toThrow();
    expect(() =>
      prepareCombatPracticeEffects(f.root, physical, g08, journal, ctx, profile, [
        ...trustedCredits,
        trustedCredits[0]!,
      ]),
    ).toThrow();
    expect(() =>
      prepareCombatPracticeEffects(
        f.root,
        physical,
        g08,
        journal,
        { ...ctx, companyId: 'foreign-company' },
        profile,
        trustedCredits,
      ),
    ).toThrow();
    expect({ root: f.root, journal, physical }).toEqual(before);

    const aggregateState: CompanyCombatAggregateState = {
      economy: f.root,
      learning: createCompanyLearningState(),
      social: createSocialState(),
      encounter: createCombatEncounterApplication(),
    };
    const aggregateBegin = prepareBeginCombatAggregate(
      aggregateState,
      f.sources,
      f.request,
      f.evidence,
    );
    if (aggregateBegin.kind !== 'PREPARED') throw new Error(aggregateBegin.error);
    const ownerContext = {
      ...combatContext(f, combatFacts(f, journal)),
      learningFacts: [],
    } as CombatOwnerContext;
    const creditsByOrdinal = journal.receipts.map((receipt, ordinal) => {
      const credits = trustedCredits.filter((credit) => {
        if (credit.command.payload.methodId === 'command-cycle')
          return cycle.endReceiptOrdinal === ordinal;
        return receipt.sourceEventIds.includes(credit.command.sourceEventId!);
      });
      return credits;
    });
    const aggregateApplications = journal.receipts.map((receipt, ordinal) => ({
      time: {
        version: COMBAT_RECEIPT_TIME_VERSION,
        id: `practice-aggregate-time-${ordinal}`,
        sourceEventId: receipt.request.sourceEventId!,
        battleId: f.binding.setup.battleId,
        receiptId: receipt.request.payload.receiptId,
        revision: receipt.transition.state.revision,
        atTick: f.root.lifecycle.campaignTick,
      },
      context: ownerContext,
      learning: { intervals: [] },
      practiceCredits: creditsByOrdinal[ordinal]!.map((credit) => ({
        ...credit,
        context: { ...ownerContext, practiceFacts: credit.context.practiceFacts },
      })),
    }));
    const aggregate = prepareConsumeCombatAggregate(aggregateBegin.next, {
      journal,
      applications: aggregateApplications,
      practiceProfile: profile,
    });
    if (aggregate.kind !== 'PREPARED') throw new Error(aggregate.error);
    expect(
      journal.receipts.some(
        (receipt) =>
          receipt.sourceEventIds.length > 1 &&
          receipt.transition.events.some((event) => event.type === 'unit.wounded'),
      ),
    ).toBe(true);
    const aggregateLeader = aggregate.next.economy.lifecycle.characters.find(
      (entry) => entry.identity.characterId === 'a-leader',
    );
    const aggregateBlades = aggregateLeader?.skills['blades'];
    if (!aggregateBlades || typeof aggregateBlades === 'number')
      throw new Error('Expected aggregate leader blade progression');
    expect(aggregateBlades.amount.milliXp).toBe('39600');
    expect(aggregate.next.encounter.active?.lastAppliedRevision).toBe(
      journal.receipts.at(-1)!.transition.state.revision,
    );

    const beforeChangedEvidence = structuredClone(aggregate.next);
    const creditOrdinal = aggregateApplications.findIndex(
      (application) => application.practiceCredits.length > 0,
    );
    const firstCredit = aggregateApplications[creditOrdinal]!.practiceCredits[0]!;
    const practiceFact = firstCredit.context.practiceFacts?.[0];
    if (!practiceFact) throw new Error('Expected a sourced combat practice fact');
    const changedSource = aggregateApplications.map((application, index) =>
      index === creditOrdinal
        ? {
            ...application,
            practiceCredits: [
              {
                ...firstCredit,
                context: {
                  ...firstCredit.context,
                  practiceFacts: [
                    { ...practiceFact, sourceEventId: `${practiceFact.sourceEventId}-changed` },
                  ],
                },
              },
              ...application.practiceCredits.slice(1),
            ],
          }
        : application,
    );
    const changedSourceReplay = prepareConsumeCombatAggregate(aggregate.next, {
      journal,
      applications: changedSource,
      practiceProfile: profile,
    });
    expect(changedSourceReplay.kind).toBe('REJECTED');
    expect(aggregate.next).toEqual(beforeChangedEvidence);

    const creditGrant = firstCredit.context.internalGrant;
    if (!creditGrant) throw new Error('Expected the trusted internal practice grant');
    const changedRevision = aggregateApplications.map((application, index) =>
      index === creditOrdinal
        ? {
            ...application,
            practiceCredits: [
              {
                ...firstCredit,
                context: {
                  ...firstCredit.context,
                  internalGrant: {
                    ...creditGrant,
                    evidenceRevision:
                      `${firstCredit.context.canonicalRevision}-changed` as typeof firstCredit.context.canonicalRevision,
                  },
                },
              },
              ...application.practiceCredits.slice(1),
            ],
          }
        : application,
    );
    const changedRevisionReplay = prepareConsumeCombatAggregate(aggregate.next, {
      journal,
      applications: changedRevision,
      practiceProfile: profile,
    });
    expect(changedRevisionReplay.kind).toBe('REJECTED');
    expect(aggregate.next).toEqual(beforeChangedEvidence);

    let empty = accept(f, f.journal, f.binding.initial, null);
    empty = nextDefend(f, empty);
    const afterDefend = empty.receipts.at(-1)!.transition.state;
    const activation = afterDefend.activation!;
    const waitCommand: CombatCommand = {
      type: 'wait',
      commandId: commandId(`practice-empty-wait-${afterDefend.revision}`),
      activationId: activation.id,
      actorId: activation.unitId,
    };
    const waited = applyCombatCommand(afterDefend, waitCommand);
    if (!waited.ok) throw new Error(waited.error.message);
    empty = accept(f, empty, { state: waited.state, events: waited.events }, waitCommand);
    const emptyPhysical = prepareCombatPhysicalEffects(f.root, empty);
    const emptyG08 = prepareCombatConsequences(f.root, emptyPhysical, empty, ctx);
    const noPractice = prepareCombatPracticeEffects(
      f.root,
      emptyPhysical,
      emptyG08,
      empty,
      ctx,
      { ...profile, actionStarts: [], leadershipCycles: [] },
      [],
    );
    expect(noPractice.credits).toBe(0);
    expect(noPractice.root.finance.sourceEffects).toEqual(emptyG08.root.finance.sourceEffects);
  }, 15_000);

  it('rejects same-company opposing-side attacks as external practice', () => {
    const f = sameCompanyOpponentFixture();
    const journal = firstLegalAttackJournal(f);
    const attackReceipt = journal.receipts.find(
      (receipt) => receipt.kernelCommand?.type === 'attack',
    )!;
    const kernelCommand = attackReceipt.kernelCommand;
    if (kernelCommand?.type !== 'attack') throw new Error('Expected an attack receipt');
    const eventIndex = attackReceipt.transition.events.findIndex(
      (event) => event.type === 'attack.resolved',
    );
    const event = attackReceipt.transition.events[eventIndex];
    if (event?.type !== 'attack.resolved') throw new Error('Expected resolved attack evidence');
    const sourceEventId = attackReceipt.sourceEventIds[eventIndex]!;
    const attacker = f.binding.participants.find((entry) => entry.unitId === event.attackerId)!;
    const defender = f.binding.participants.find((entry) => entry.unitId === event.targetId)!;
    expect(attacker.companyId).toBe(f.root.lifecycle.companyId);
    expect(defender.companyId).toBe(f.root.lifecycle.companyId);

    const physical = prepareCombatPhysicalEffects(f.root, journal);
    const ctx = combatContext(f, combatFacts(f, journal));
    const g08 = prepareCombatConsequences(f.root, physical, journal, ctx);
    const profile = {
      version: COMBAT_PRACTICE_PROFILE_VERSION,
      profileId: 'same-company-practice-v1',
      bindingId: f.binding.bindingId,
      challengeLevel: 0,
      actionStarts: [],
      leadershipCycles: [],
    } as const;
    const noPractice = prepareCombatPracticeEffects(
      f.root,
      physical,
      g08,
      journal,
      ctx,
      profile,
      [],
    );
    expect(noPractice.credits).toBe(0);

    const payload = {
      receiptId: `${sourceEventId}-${profile.profileId}-${attacker.projection.characterId}-weapon-attack`,
      characterId: attacker.projection.characterId,
      skillId: attacker.projection.weapon.skillId,
      methodId: 'weapon-attack',
      challengeLevel: profile.challengeLevel,
      outcome: event.hit ? 'SUCCESS' : 'MEANINGFUL_FAILURE',
      effortTicks: '0',
    } as const;
    const base = command(
      f.root,
      'CreditPractice',
      payload,
      'same-company-bogus-credit',
      'DOMAIN_RECEIPT',
      f.root.lifecycle.campaignTick,
    );
    const creditCommand = { ...base, sourceEventId } as CommandOf<'CreditPractice'>;
    const fact: PracticeEvidence = {
      worldId: f.root.lifecycle.worldId,
      companyId: f.root.lifecycle.companyId,
      sourceEventId,
      rulesVersion: PROGRESSION_RULES.version,
      catalogueVersion: COMPANY_CATALOGUE.version,
      payload,
      startedAt: f.root.lifecycle.campaignTick,
      completedAt: f.root.lifecycle.campaignTick,
      levelAtStart: 0,
      aptitudeAtStartBps: 10000,
      proof: {
        kind: 'weapon-attack',
        interaction: {
          sourceEventId,
          attackerId: attacker.projection.characterId,
          defenderId: defender.projection.characterId,
          atTick: f.root.lifecycle.campaignTick,
          origin: 'EXTERNAL',
        },
        weaponProfile: attacker.projection.weapon.profileId,
      },
    };
    const trustedContext = {
      ...context(f.root, creditCommand as ReturnType<typeof command>),
      internalGrant: {
        commandId: creditCommand.commandId,
        sourceEventId,
        canonicalRequest: canonicalJson(creditCommand),
      },
      practiceFacts: [fact],
    };
    const before = structuredClone({ root: f.root, journal });
    expect(() =>
      prepareCombatPracticeEffects(f.root, physical, g08, journal, ctx, profile, [
        { command: creditCommand, context: trustedContext },
      ]),
    ).toThrow();
    expect({ root: f.root, journal }).toEqual(before);
  });

  it('credits defense only after a real incoming attack against an active guard', () => {
    const f = fixture(10000, true);
    const { journal, defendReceipt, incomingReceipt } = guardedIncomingJournal(f);
    const defend = defendReceipt.kernelCommand;
    const incoming = incomingReceipt.kernelCommand;
    if (defend?.type !== 'defend' || incoming?.type !== 'attack')
      throw new Error('Expected replayed defend and incoming attack commands');
    const eventIndex = incomingReceipt.transition.events.findIndex(
      (event) => event.type === 'attack.resolved' && event.targetId === unitId('a-leader-unit'),
    );
    const event = incomingReceipt.transition.events[eventIndex];
    if (event?.type !== 'attack.resolved')
      throw new Error('Expected attack against the guarding unit');
    const sourceEventId = incomingReceipt.sourceEventIds[eventIndex]!;
    const attacker = f.binding.participants.find((entry) => entry.unitId === event.attackerId)!;
    const defender = f.binding.participants.find((entry) => entry.unitId === event.targetId)!;
    expect(defender.projection.characterId).toBe('a-leader');
    expect(attacker.companyId).not.toBe(f.root.lifecycle.companyId);
    expect(
      defendReceipt.transition.state.units.find((unit) => unit.id === event.targetId)?.guarding,
    ).toBe(true);

    const physical = prepareCombatPhysicalEffects(f.root, journal);
    const ctx = combatContext(f, combatFacts(f, journal));
    const g08 = prepareCombatConsequences(f.root, physical, journal, ctx);
    const defendOrdinal = journal.receipts.findIndex((receipt) => {
      const kernelCommand = receipt.kernelCommand;
      return kernelCommand?.type === 'defend' && kernelCommand.activationId === defend.activationId;
    });
    const profile = {
      version: COMBAT_PRACTICE_PROFILE_VERSION,
      profileId: 'guard-practice-v1',
      bindingId: f.binding.bindingId,
      challengeLevel: 0,
      actionStarts: [
        {
          activationId: defend.activationId,
          unitId: defend.actorId,
          startedAt: f.root.lifecycle.campaignTick,
          startReceiptOrdinal: defendOrdinal,
        },
      ],
      leadershipCycles: [],
    } as const;
    expect(defendOrdinal).toBeGreaterThan(0);
    const payload = {
      receiptId: `${sourceEventId}-${profile.profileId}-a-leader-guard-interaction`,
      characterId: 'a-leader',
      skillId: 'defense',
      methodId: 'guard-interaction',
      challengeLevel: profile.challengeLevel,
      outcome: 'SUCCESS',
      effortTicks: '0',
    } as const;
    const base = command(
      f.root,
      'CreditPractice',
      payload,
      'guard-practice-credit',
      'DOMAIN_RECEIPT',
      f.root.lifecycle.campaignTick,
    );
    const creditCommand = { ...base, sourceEventId } as CommandOf<'CreditPractice'>;
    const fact: PracticeEvidence = {
      worldId: f.root.lifecycle.worldId,
      companyId: f.root.lifecycle.companyId,
      sourceEventId,
      rulesVersion: PROGRESSION_RULES.version,
      catalogueVersion: COMPANY_CATALOGUE.version,
      payload,
      startedAt: f.root.lifecycle.campaignTick,
      completedAt: f.root.lifecycle.campaignTick,
      levelAtStart: 0,
      aptitudeAtStartBps: 10000,
      proof: {
        kind: 'guard-interaction',
        interaction: {
          sourceEventId,
          attackerId: attacker.projection.characterId,
          defenderId: defender.projection.characterId,
          atTick: f.root.lifecycle.campaignTick,
          origin: 'EXTERNAL',
        },
      },
    };
    const trustedContext = {
      ...context(f.root, creditCommand as ReturnType<typeof command>),
      internalGrant: {
        commandId: creditCommand.commandId,
        sourceEventId,
        canonicalRequest: canonicalJson(creditCommand),
      },
      practiceFacts: [fact],
    };
    const prepared = prepareCombatPracticeEffects(f.root, physical, g08, journal, ctx, profile, [
      { command: creditCommand, context: trustedContext },
    ]);
    const guardedLeader = prepared.root.lifecycle.characters.find(
      (character) => character.identity.characterId === 'a-leader',
    );
    if (!guardedLeader) throw new Error('Expected the guarded leader progression snapshot');
    const defenseProgress = guardedLeader.skills['defense'];
    if (!defenseProgress || typeof defenseProgress === 'number')
      throw new Error('Expected exact guarded defense progression');
    expect(BigInt(defenseProgress.amount.milliXp)).toBeGreaterThan(0n);
  });
});

describe('G10 — atomic combat company aggregate', () => {
  function aggregateFixture(familySuccessor = false, health = 10000) {
    const f = fixture(health, false, familySuccessor);
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

  function applicationsForJournal(
    f: ReturnType<typeof aggregateFixture>,
    journal: CombatReceiptJournal,
  ) {
    const binding = f.begun.binding;
    const profile = {
      ...f.practiceProfile,
      profileId: 'aggregate-terminal-profile',
      actionStarts: journal.receipts.flatMap((receipt, startReceiptOrdinal) => {
        const kernelCommand = receipt.kernelCommand;
        if (kernelCommand?.type !== 'attack' && kernelCommand?.type !== 'defend') return [];
        if (
          !binding.participants.some(
            (participant) =>
              participant.unitId === kernelCommand.actorId &&
              participant.companyId === f.f.root.lifecycle.companyId,
          )
        )
          return [];
        return [
          {
            activationId: kernelCommand.activationId,
            unitId: kernelCommand.actorId,
            startedAt: f.f.root.lifecycle.campaignTick,
            startReceiptOrdinal,
          },
        ];
      }),
    } as const;
    const progressBySkill = new Map<string, ProgressionAmount>();
    const applications = journal.receipts.map((receipt, ordinal) => {
      const trustedCredits = receipt.transition.events.flatMap((event, eventIndex) => {
        if (event.type !== 'attack.resolved' || receipt.kernelCommand?.type !== 'attack') return [];
        const sourceEventId = receipt.sourceEventIds[eventIndex]!;
        const attacker = binding.participants.find((entry) => entry.unitId === event.attackerId);
        const defender = binding.participants.find((entry) => entry.unitId === event.targetId);
        let interaction:
          | {
              characterId: string;
              skillId: string;
              methodId: 'weapon-attack';
              outcome: 'SUCCESS' | 'MEANINGFUL_FAILURE';
              startedAt: string;
              proof: PracticeEvidence['proof'];
            }
          | {
              characterId: string;
              skillId: 'defense';
              methodId: 'guard-interaction';
              outcome: 'SUCCESS';
              startedAt: string;
              proof: PracticeEvidence['proof'];
            }
          | undefined;
        const kernelCommand = receipt.kernelCommand;
        if (
          attacker?.companyId === f.f.root.lifecycle.companyId &&
          defender &&
          defender.companyId !== f.f.root.lifecycle.companyId &&
          kernelCommand?.type === 'attack'
        ) {
          const participant = attacker;
          interaction = {
            characterId: participant.projection.characterId,
            skillId: participant.projection.weapon.skillId,
            methodId: 'weapon-attack',
            outcome: event.hit ? 'SUCCESS' : 'MEANINGFUL_FAILURE',
            startedAt: f.f.root.lifecycle.campaignTick,
            proof: {
              kind: 'weapon-attack',
              interaction: {
                sourceEventId,
                attackerId: participant.projection.characterId,
                defenderId: defender.projection.characterId,
                atTick: f.f.root.lifecycle.campaignTick,
                origin: 'EXTERNAL',
              },
              weaponProfile: participant.projection.weapon.profileId,
            },
          };
          if (
            !profile.actionStarts.some(
              (start) =>
                start.startReceiptOrdinal === ordinal &&
                start.activationId === kernelCommand.activationId,
            )
          )
            throw new Error('Expected the trusted company attack start');
        } else if (
          defender?.companyId === f.f.root.lifecycle.companyId &&
          attacker &&
          attacker.companyId !== f.f.root.lifecycle.companyId &&
          journal.receipts[ordinal - 1]!.transition.state.units.find(
            (unit) => unit.id === event.targetId,
          )?.guarding
        ) {
          const defend = journal.receipts
            .slice(1, ordinal)
            .toReversed()
            .find(
              (entry) =>
                entry.kernelCommand?.type === 'defend' &&
                entry.kernelCommand.actorId === event.targetId,
            );
          if (defend?.kernelCommand?.type !== 'defend')
            throw new Error('Expected the trusted company guard start');
          interaction = {
            characterId: defender.projection.characterId,
            skillId: 'defense',
            methodId: 'guard-interaction',
            outcome: 'SUCCESS',
            startedAt: f.f.root.lifecycle.campaignTick,
            proof: {
              kind: 'guard-interaction',
              interaction: {
                sourceEventId,
                attackerId: attacker.projection.characterId,
                defenderId: defender.projection.characterId,
                atTick: f.f.root.lifecycle.campaignTick,
                origin: 'EXTERNAL',
              },
            },
          };
        }
        if (!interaction) return [];
        const skillId = interaction.skillId;
        const key = `${interaction.characterId}:${skillId}`;
        const character = f.f.root.lifecycle.characters.find(
          (entry) => entry.identity.characterId === interaction!.characterId,
        )!;
        const stored = character.skills[skillId];
        if (!stored || typeof stored === 'number')
          throw new Error('Expected exact practice progress');
        const previous = progressBySkill.get(key) ?? stored.amount;
        const levelAtStart = progressionLevel(previous.milliXp);
        const payload = {
          receiptId: `${sourceEventId}-${profile.profileId}-${interaction.characterId}-${interaction.methodId}`,
          characterId: interaction.characterId,
          skillId,
          methodId: interaction.methodId,
          challengeLevel: profile.challengeLevel,
          outcome: interaction.outcome,
          effortTicks: '0',
        } as const;
        const base = command(
          f.f.root,
          'CreditPractice',
          payload,
          `aggregate-practice-${sourceEventId}`,
          'DOMAIN_RECEIPT',
          f.f.root.lifecycle.campaignTick,
        );
        const practiceCommand = { ...base, sourceEventId } as CommandOf<'CreditPractice'>;
        const fact: PracticeEvidence = {
          worldId: f.f.root.lifecycle.worldId,
          companyId: f.f.root.lifecycle.companyId,
          sourceEventId,
          rulesVersion: PROGRESSION_RULES.version,
          catalogueVersion: COMPANY_CATALOGUE.version,
          payload,
          startedAt: interaction.startedAt,
          completedAt: f.f.root.lifecycle.campaignTick,
          levelAtStart,
          aptitudeAtStartBps: 10000,
          proof: interaction.proof,
        };
        const baseContext = context(f.f.root, practiceCommand as ReturnType<typeof command>);
        const trustedContext = {
          ...baseContext,
          internalGrant: {
            commandId: practiceCommand.commandId,
            sourceEventId,
            canonicalRequest: canonicalJson(practiceCommand),
          },
          practiceFacts: [fact],
        };
        const admitted = admitPractice(practiceCommand, trustedContext);
        progressBySkill.set(
          key,
          creditProgression(previous, admitted.baseMilliXp, admitted.coefficients),
        );
        return [{ command: practiceCommand, context: trustedContext }];
      });
      return {
        time: {
          version: COMBAT_RECEIPT_TIME_VERSION,
          id: `aggregate-terminal-time-${ordinal}`,
          sourceEventId: receipt.request.sourceEventId!,
          battleId: f.f.binding.setup.battleId,
          receiptId: receipt.request.payload.receiptId,
          revision: receipt.transition.state.revision,
          atTick: f.f.root.lifecycle.campaignTick,
        },
        context: {
          ...combatContext(f.f, combatFacts(f.f, journal)),
          learningFacts: [],
        } as CombatOwnerContext,
        learning: { intervals: [] },
        practiceCredits: trustedCredits,
      };
    });
    return { profile, applications };
  }

  it('ignores sparse non-commander leadership data without cycles and keeps split receipt consumption atomic', () => {
    const f = aggregateFixture();
    const initial = {
      journal: f.initialJournal,
      applications: f.applications.slice(0, 1),
      practiceProfile: f.practiceProfile,
    };
    const full = {
      journal: f.journal,
      applications: f.applications,
      practiceProfile: f.practiceProfile,
    };
    const first = prepareConsumeCombatAggregate(f.begun.next, initial);
    if (first.kind !== 'PREPARED') throw new Error(first.error);
    const split = prepareConsumeCombatAggregate(first.next, full);
    const whole = prepareConsumeCombatAggregate(f.begun.next, full);
    expect(split.kind).toBe('PREPARED');
    expect(whole.kind).toBe('PREPARED');
    if (split.kind !== 'PREPARED' || whole.kind !== 'PREPARED') return;
    expect(split.next).toEqual(whole.next);

    const replay = prepareConsumeCombatAggregate(whole.next, full);
    expect(replay.kind).toBe('PREPARED');
    if (replay.kind !== 'PREPARED') return;
    expect(replay.replayed).toBe(true);
    expect(replay.next).toEqual(whole.next);

    const before = structuredClone(f.begun.next);
    const invalid = {
      ...full,
      applications: [
        ...f.applications.slice(0, 1),
        { ...f.applications[1]!, time: { ...f.applications[1]!.time, revision: 99 } },
      ],
    };
    const rejected = prepareConsumeCombatAggregate(f.begun.next, invalid);
    expect(rejected.kind).toBe('REJECTED');
    expect(f.begun.next).toEqual(before);

    const forgedRevision =
      '999' as unknown as (typeof f.applications)[number]['context']['canonicalRevision'];
    const forgedRevisionEvidence = prepareConsumeCombatAggregate(f.begun.next, {
      ...full,
      applications: f.applications.map((application, index) =>
        index === 1
          ? {
              ...application,
              context: {
                ...application.context,
                canonicalRevision: forgedRevision,
                financeFacts: application.context.financeFacts.map((fact) => ({
                  ...fact,
                  revision: forgedRevision,
                })),
                physicalFacts: (application.context.physicalFacts ?? []).map((fact) => ({
                  ...fact,
                  revision: forgedRevision,
                })),
              },
            }
          : application,
      ),
    });
    expect(forgedRevisionEvidence.kind).toBe('REJECTED');

    const changedTick = {
      ...full,
      applications: f.applications.map((application, index) =>
        index === 1
          ? {
              ...application,
              time: {
                ...application.time,
                atTick: (
                  BigInt(application.time.atTick) + 1n
                ).toString() as typeof application.time.atTick,
              },
            }
          : application,
      ),
    };
    const wholeBefore = structuredClone(whole.next);
    const changedTickReplay = prepareConsumeCombatAggregate(whole.next, changedTick);
    expect(changedTickReplay.kind).toBe('REJECTED');
    expect(whole.next).toEqual(wholeBefore);
  });

  it('blocks binding while a bound course mentor is still on an active task', () => {
    const f = aggregateFixture();
    // This participant is the provider, not a combat learner, so learner-only checks miss it.
    const learnerId = 'a-provider';
    const start = command(
      f.f.root,
      'StartLearning',
      {
        characterId: learnerId,
        methodId: 'funded-practice',
        goal: { skillId: 'medicine', maxTicks: '100' },
        resourceIds: ['course-resource'],
        budgetPoolId: 'local',
        maxBudgetQ: '1000',
      },
      'bound-course-start',
      'PLAYER',
    ) as CommandOf<'StartLearning'>;
    const task = startLearningTask(createLearningTaskState(), {
      taskId: 'bound-course',
      command: start,
      quote: {
        sourceId: 'bound-course-source',
        sourceVersion: 'v1',
        maxTicks: '100',
        mentorId: 'a-worker-0',
        funding: {
          poolId: 'local',
          walletId: 'purse',
          providerWalletId: 'wallet-provider',
          authorizedBudgetQ: cash(1000),
          costQPerDay: { numerator: '1', denominator: '1' },
        },
        coefficients: evaluatePerkEffects(f.f.root, {
          kind: 'CHARACTER',
          characterId: learnerId,
          task: 'TRAINING',
        }),
      },
    });
    const activeState = {
      ...f.state,
      learning: { ...createCompanyLearningState(), tasks: task.state },
    };
    const rejected = prepareBeginCombatAggregate(
      activeState,
      f.f.sources,
      f.f.request,
      f.f.evidence,
    );
    expect(rejected.kind).toBe('REJECTED');
    if (rejected.kind === 'REJECTED') expect(rejected.error).toBe('INCOMPATIBLE_ACTIVITY');

    const terminalState = {
      ...activeState,
      learning: {
        ...activeState.learning,
        tasks: {
          ...task.state,
          tasks: task.state.tasks.map((entry) => ({
            ...entry,
            processedThroughTick: entry.start.command.campaignTick,
            terminal: {
              kind: 'INTERRUPTED' as const,
              commandId: 'earlier-interruption',
              campaignTick: entry.start.command.campaignTick,
              processedThroughTick: entry.start.command.campaignTick,
            },
          })),
        },
      },
    };
    const terminalResult = prepareBeginCombatAggregate(
      terminalState,
      f.f.sources,
      f.f.request,
      f.f.evidence,
    );
    if (terminalResult.kind === 'REJECTED') throw new Error(terminalResult.error);
    expect(terminalResult.kind).toBe('PREPARED');
  });

  it('records missing custody in place and rejects a remote carried purse atomically', () => {
    const f = aggregateFixture();
    const candidateRoot = f.begun.next.economy;
    if (!candidateRoot.physical) throw new Error('Expected prepared physical company state');
    const root = candidateRoot as MaterializedCompanyState;
    const participant = f.begun.binding.participants.find(
      (entry) => entry.companyId === root.lifecycle.companyId,
    )!;
    const characterId = participant.projection.characterId;
    const carriedContainers = root.physical.containers.filter(
      (entry) => entry.carrier?.kind === 'CHARACTER' && entry.carrier.id === characterId,
    );
    const containerIds = carriedContainers.map((entry) => entry.containerId).toSorted();
    const carriedSet = new Set(containerIds);
    const itemIds = root.physical.items
      .filter((entry) => entry.containerId !== null && carriedSet.has(entry.containerId))
      .map((entry) => entry.itemId)
      .toSorted();
    const missingCommand = command(
      root,
      'RecordMissing',
      {
        receiptId: 'missing-entry-public',
        bindingId: f.begun.binding.bindingId,
        battleId: f.f.binding.setup.battleId,
        terminalReceiptId: f.journal.receipts.at(-1)!.request.payload.receiptId,
        unitId: participant.unitId,
        characterId,
      },
      'missing-entry-command',
      'COMBAT_RECEIPT',
      root.lifecycle.campaignTick,
    );
    const missingFact = {
      ...physicalScope(root, 'missing-entry-public', root.lifecycle.campaignTick),
      sourceEventId: missingCommand.sourceEventId,
      kind: 'MISSING_ENTRY' as const,
      bindingId: f.begun.binding.bindingId,
      battleId: f.f.binding.setup.battleId,
      terminalReceiptId: f.journal.receipts.at(-1)!.request.payload.receiptId,
      unitId: participant.unitId,
      characterId,
      location: place,
      containerIds,
      itemIds,
      disposition: 'RETAIN_WITH_PERSON' as const,
    };
    const missingContext = context(root, missingCommand, [], [], [missingFact]);
    const before = structuredClone(root);
    const recorded = prepareCompanyEconomy(root, missingCommand, missingContext);
    expect(recorded.kind).toBe('PREPARED');
    if (recorded.kind !== 'PREPARED') return;
    if (!recorded.next.physical) throw new Error('Expected recorded physical company state');
    expect(recorded.next.physical.containers).toEqual(before.physical.containers);
    expect(recorded.next.physical.items).toEqual(before.physical.items);
    expect(
      recorded.next.lifecycle.characters.find((entry) => entry.identity.characterId === characterId)
        ?.presence.availability,
    ).toBe('OUT_OF_CONTACT');

    const remoteRoot = {
      ...root,
      physical: {
        ...root.physical,
        containers: root.physical.containers.map((entry) =>
          entry.containerId === containerIds[0]
            ? { ...entry, location: { ...place, siteId: 'remote' } }
            : entry,
        ),
      },
    };
    const remoteBefore = structuredClone(remoteRoot);
    const remoteCommand = { ...missingCommand, commandId: 'missing-entry-remote' };
    const remoteFact = {
      ...missingFact,
      id: 'missing-entry-remote-fact',
      sourceEventId: remoteCommand.sourceEventId,
    };
    const rejected = prepareCompanyEconomy(
      remoteRoot,
      remoteCommand,
      context(remoteRoot, remoteCommand, [], [], [remoteFact]),
    );
    expect(rejected.kind).toBe('REJECTED');
    expect(remoteRoot).toEqual(remoteBefore);
  });

  it('keeps an authenticated defend pending without XP and accepts a later campaign tick advance', () => {
    const f = aggregateFixture();
    const defendOrdinal = f.journal.receipts.findIndex(
      (receipt) => receipt.kernelCommand?.type === 'defend',
    );
    const defend = f.journal.receipts[defendOrdinal]?.kernelCommand;
    if (defend?.type !== 'defend') throw new Error('Expected a defended action');
    const practiceProfile = {
      ...f.practiceProfile,
      actionStarts: [
        {
          activationId: defend.activationId,
          unitId: defend.actorId,
          startedAt: (BigInt(f.f.root.lifecycle.campaignTick) + 1n).toString(),
          startReceiptOrdinal: defendOrdinal,
        },
      ],
    } as const;
    const targetTick = (
      BigInt(f.f.root.lifecycle.campaignTick) + 1n
    ).toString() as typeof f.f.root.lifecycle.campaignTick;
    const advance = command(
      f.f.root,
      'AdvanceCampaign',
      { toTick: targetTick, authoritativeInputs: [] },
      'aggregate-practice-tick-advance',
      'SYSTEM',
      targetTick,
    ) as CommandOf<'AdvanceCampaign'>;
    const advanceContext = {
      ...context(f.f.root, advance as ReturnType<typeof command>),
      atTick: targetTick,
      learningFacts: [],
    } as CombatOwnerContext;
    const applications = f.applications.map((application, index) => ({
      ...application,
      time: {
        ...application.time,
        atTick: index === 0 ? f.f.root.lifecycle.campaignTick : targetTick,
      },
      ...(index === 1
        ? { advance: { command: advance, context: advanceContext, learning: { intervals: [] } } }
        : {}),
    }));
    const { internalGrant: _advanceGrant, ...advanceWithoutGrant } = advanceContext;
    const { internalGrant: _playerGrant, ...advanceAsPlayer } = advanceContext;
    const invalidPlayerAdvance = prepareConsumeCombatAggregate(f.begun.next, {
      journal: f.journal,
      applications: applications.map((application, index) =>
        index === 1
          ? {
              ...application,
              advance: {
                ...application.advance!,
                context: {
                  ...advanceAsPlayer,
                  principal: { kind: 'PLAYER', id: 'leader' },
                } as unknown as CombatOwnerContext,
              },
            }
          : application,
      ),
      practiceProfile,
    });
    expect(invalidPlayerAdvance.kind).toBe('REJECTED');
    const invalidMissingGrant = prepareConsumeCombatAggregate(f.begun.next, {
      journal: f.journal,
      applications: applications.map((application, index) =>
        index === 1
          ? {
              ...application,
              advance: {
                ...application.advance!,
                context: advanceWithoutGrant as CombatOwnerContext,
              },
            }
          : application,
      ),
      practiceProfile,
    });
    expect(invalidMissingGrant.kind).toBe('REJECTED');
    const prepared = prepareConsumeCombatAggregate(f.begun.next, {
      journal: f.journal,
      applications,
      practiceProfile,
    });
    expect(prepared.kind, prepared.kind === 'REJECTED' ? prepared.error : undefined).toBe(
      'PREPARED',
    );
    if (prepared.kind !== 'PREPARED') return;
    expect(prepared.next.economy.lifecycle.campaignTick).toBe(targetTick);
    expect(prepared.next.encounter.active?.lastAppliedRevision).toBe(
      f.journal.receipts.at(-1)!.transition.state.revision,
    );
    expect(prepared.next.encounter.active?.appliedPractice).toEqual([]);
    const leader = prepared.next.economy.lifecycle.characters.find(
      (entry) => entry.identity.characterId === 'a-leader',
    )!;
    expect(leader.skills['defense']).toEqual(
      f.f.root.lifecycle.characters.find((entry) => entry.identity.characterId === 'a-leader')!
        .skills['defense'],
    );
  });

  it('credits a pending defend only when a later receipt contains a real incoming threat', () => {
    const f = fixture(10000, true);
    const { journal, defendReceipt, incomingReceipt } = guardedIncomingJournal(f);
    const defend = defendReceipt.kernelCommand;
    const incoming = incomingReceipt.kernelCommand;
    if (defend?.type !== 'defend' || incoming?.type !== 'attack')
      throw new Error('Expected a real defend followed by an incoming attack');
    const defendOrdinal = journal.receipts.findIndex(
      (receipt) => receipt.kernelCommand?.activationId === defend.activationId,
    );
    const incomingOrdinal = journal.receipts.findIndex(
      (receipt) => receipt.kernelCommand?.activationId === incoming.activationId,
    );
    const eventIndex = incomingReceipt.transition.events.findIndex(
      (event) => event.type === 'attack.resolved' && event.targetId === defend.actorId,
    );
    const event = incomingReceipt.transition.events[eventIndex];
    if (event?.type !== 'attack.resolved') throw new Error('Expected the guarding target hit');
    const sourceEventId = incomingReceipt.sourceEventIds[eventIndex]!;
    const attacker = f.binding.participants.find((entry) => entry.unitId === event.attackerId)!;
    const defender = f.binding.participants.find((entry) => entry.unitId === event.targetId)!;
    const state: CompanyCombatAggregateState = {
      economy: f.root,
      learning: createCompanyLearningState(),
      social: createSocialState(),
      encounter: createCombatEncounterApplication(),
    };
    const begun = prepareBeginCombatAggregate(state, f.sources, f.request, f.evidence);
    if (begun.kind !== 'PREPARED') throw new Error(begun.error);
    const profile = {
      version: COMBAT_PRACTICE_PROFILE_VERSION,
      profileId: 'aggregate-delayed-guard',
      bindingId: begun.binding.bindingId,
      challengeLevel: 0,
      actionStarts: [
        {
          activationId: defend.activationId,
          unitId: defend.actorId,
          startedAt: f.root.lifecycle.campaignTick,
          startReceiptOrdinal: defendOrdinal,
        },
      ],
      leadershipCycles: [],
    } as const;
    const payload = {
      receiptId: `${sourceEventId}-${profile.profileId}-a-leader-guard-interaction`,
      characterId: defender.projection.characterId,
      skillId: 'defense',
      methodId: 'guard-interaction',
      challengeLevel: profile.challengeLevel,
      outcome: 'SUCCESS',
      effortTicks: '0',
    } as const;
    const base = command(
      f.root,
      'CreditPractice',
      payload,
      'aggregate-delayed-guard-credit',
      'DOMAIN_RECEIPT',
      f.root.lifecycle.campaignTick,
    );
    const creditCommand = { ...base, sourceEventId } as CommandOf<'CreditPractice'>;
    const fact: PracticeEvidence = {
      worldId: f.root.lifecycle.worldId,
      companyId: f.root.lifecycle.companyId,
      sourceEventId,
      rulesVersion: PROGRESSION_RULES.version,
      catalogueVersion: COMPANY_CATALOGUE.version,
      payload,
      startedAt: f.root.lifecycle.campaignTick,
      completedAt: f.root.lifecycle.campaignTick,
      levelAtStart: 0,
      aptitudeAtStartBps: 10000,
      proof: {
        kind: 'guard-interaction',
        interaction: {
          sourceEventId,
          attackerId: attacker.projection.characterId,
          defenderId: defender.projection.characterId,
          atTick: f.root.lifecycle.campaignTick,
          origin: 'EXTERNAL',
        },
      },
    };
    const ownerContext = {
      ...combatContext(f, combatFacts(f, journal)),
      learningFacts: [],
    } as CombatOwnerContext;
    const creditContext = {
      ...ownerContext,
      internalGrant: {
        commandId: creditCommand.commandId,
        sourceEventId,
        canonicalRequest: canonicalJson(creditCommand),
      },
      practiceFacts: [fact],
    };
    const applications = journal.receipts.map((receipt, ordinal) => ({
      time: {
        version: COMBAT_RECEIPT_TIME_VERSION,
        id: `delayed-guard-time-${ordinal}`,
        sourceEventId: receipt.request.sourceEventId!,
        battleId: f.binding.setup.battleId,
        receiptId: receipt.request.payload.receiptId,
        revision: receipt.transition.state.revision,
        atTick: f.root.lifecycle.campaignTick,
      },
      context: ownerContext,
      learning: { intervals: [] },
      practiceCredits:
        ordinal === incomingOrdinal ? [{ command: creditCommand, context: creditContext }] : [],
    }));
    const defendPrefix: CombatReceiptJournal = {
      ...journal,
      receipts: journal.receipts.slice(0, defendOrdinal + 1),
      proposedLastAppliedRevision: defendReceipt.transition.state.revision,
    };
    expect(defendPrefix.proposedLastAppliedRevision).toBe(
      defendPrefix.receipts.at(-1)!.transition.state.revision,
    );
    const initialPrefix: CombatReceiptJournal = {
      ...journal,
      receipts: journal.receipts.slice(0, 1),
      proposedLastAppliedRevision: journal.receipts[0]!.transition.state.revision,
    };
    const initial = prepareConsumeCombatAggregate(begun.next, {
      journal: initialPrefix,
      applications: applications.slice(0, 1),
      practiceProfile: { ...profile, actionStarts: [] },
    });
    expect(initial.kind).toBe('PREPARED');
    if (initial.kind !== 'PREPARED') return;
    const pending = prepareConsumeCombatAggregate(initial.next, {
      journal: defendPrefix,
      applications: applications.slice(0, defendOrdinal + 1),
      practiceProfile: profile,
    });
    expect(pending.kind).toBe('PREPARED');
    if (pending.kind !== 'PREPARED') return;
    expect(pending.next.encounter.active?.appliedPractice).toEqual([]);

    const changedOldDescriptor = prepareConsumeCombatAggregate(pending.next, {
      journal,
      applications,
      practiceProfile: {
        ...profile,
        actionStarts: profile.actionStarts.map((start) => ({
          ...start,
          startedAt: (BigInt(start.startedAt) + 1n).toString() as typeof start.startedAt,
        })),
      },
    });
    expect(changedOldDescriptor.kind).toBe('REJECTED');

    const completed = prepareConsumeCombatAggregate(pending.next, {
      journal,
      applications,
      practiceProfile: profile,
    });
    expect(completed.kind).toBe('PREPARED');
    if (completed.kind !== 'PREPARED') return;
    expect(completed.next.encounter.active?.appliedPractice).toHaveLength(1);
    const character = completed.next.economy.lifecycle.characters.find(
      (entry) => entry.identity.characterId === defender.projection.characterId,
    )!;
    const defense = character.skills['defense'];
    if (!defense || typeof defense === 'number') throw new Error('Expected defense progress');
    expect(BigInt(defense.amount.milliXp)).toBeGreaterThan(0n);
  });

  it('finalizes a real MISSING journal with retained custody and rejects remote custody atomically', () => {
    const f = aggregateFixture();
    let journal = accept(f.f, f.f.journal, f.f.binding.initial, null);
    let combatState = f.f.binding.initial.state;
    for (let index = 0; combatState.status === 'active' && index < 500; index += 1) {
      const actor = combatState.units.find((unit) => unit.id === combatState.activation?.unitId);
      if (!actor) throw new Error('Expected active combat actor');
      const doctrine = actor.sideId === sideId('b-side') ? 'survivor' : 'aggressive';
      const kernelCommand = chooseAiCommand(combatState, doctrine);
      const transition = applyCombatCommand(combatState, kernelCommand);
      if (!transition.ok) throw new Error(transition.error.message);
      combatState = transition.state;
      journal = accept(
        f.f,
        journal,
        { state: transition.state, events: transition.events },
        kernelCommand,
      );
    }
    expect(journal.receipts.at(-1)?.transition.state.status).toBe('resolved');
    const { profile, applications } = applicationsForJournal(f, journal);
    let consumed = prepareConsumeCombatAggregate(f.begun.next, {
      journal: {
        ...journal,
        receipts: journal.receipts.slice(0, 1),
        proposedLastAppliedRevision: journal.receipts[0]!.transition.state.revision,
      },
      applications: applications.slice(0, 1),
      practiceProfile: profile,
    });
    if (consumed.kind !== 'PREPARED') throw new Error(`Consume receipt 0: ${consumed.error}`);
    for (let ordinal = 1; ordinal < journal.receipts.length; ordinal += 1) {
      consumed = prepareConsumeCombatAggregate(consumed.next, {
        journal: {
          ...journal,
          receipts: journal.receipts.slice(0, ordinal + 1),
          proposedLastAppliedRevision: journal.receipts[ordinal]!.transition.state.revision,
        },
        applications: applications.slice(0, ordinal + 1),
        practiceProfile: profile,
      });
      if (consumed.kind !== 'PREPARED')
        throw new Error(`Consume receipt ${ordinal}: ${consumed.error}`);
    }

    const root = consumed.next.economy as MaterializedCompanyState;
    const finalReceipt = journal.receipts.at(-1)!;
    const finalState = finalReceipt.transition.state;
    const participants = f.begun.binding.participants.filter(
      (entry) => entry.companyId === root.lifecycle.companyId,
    );
    const missingParticipantIndex = participants.findIndex((participant, index) => {
      const unit = finalState.units.find((entry) => entry.id === participant.unitId)!;
      const hasEarlierLivingParticipant = participants
        .slice(0, index)
        .some(
          (earlier) => finalState.units.find((entry) => entry.id === earlier.unitId)!.health > 0,
        );
      const hasCarriedContainer = root.physical.containers.some(
        (entry) =>
          entry.carrier?.kind === 'CHARACTER' &&
          entry.carrier.id === participant.projection.characterId,
      );
      return index > 0 && unit.health > 0 && hasEarlierLivingParticipant && hasCarriedContainer;
    });
    const missingParticipant = participants[missingParticipantIndex];
    if (!missingParticipant)
      throw new Error('Expected a later living company participant with custody');
    const earlierPresentParticipant = participants
      .slice(0, missingParticipantIndex)
      .find(
        (participant) =>
          finalState.units.find((entry) => entry.id === participant.unitId)!.health > 0,
      );
    if (!earlierPresentParticipant)
      throw new Error('Expected an earlier living PRESENT participant');
    const missingEntryId = 'aggregate-missing-entry';
    const finalStateDigest = 'aggregate-final-state';
    const outcomeReceiptId = 'aggregate-terminal-outcome';
    const terminalCommand = command(
      root,
      'FinalizeEncounter',
      {
        bindingId: f.begun.binding.bindingId,
        terminalReceiptId: finalReceipt.request.payload.receiptId,
        finalStateDigest,
        outcomeReceiptId,
      },
      'aggregate-finalize-missing',
      'COMBAT_RECEIPT',
      root.lifecycle.campaignTick,
    );
    const sourceEventId = terminalCommand.sourceEventId!;
    const characterId = missingParticipant.projection.characterId;
    const carriedContainers = root.physical.containers.filter(
      (entry) => entry.carrier?.kind === 'CHARACTER' && entry.carrier.id === characterId,
    );
    const containerIds = carriedContainers.map((entry) => entry.containerId).toSorted();
    const carriedSet = new Set(containerIds);
    const itemIds = root.physical.items
      .filter((entry) => entry.containerId !== null && carriedSet.has(entry.containerId))
      .map((entry) => entry.itemId)
      .toSorted();
    const missingFact = {
      ...physicalScope(root, missingEntryId, root.lifecycle.campaignTick),
      sourceEventId,
      kind: 'MISSING_ENTRY' as const,
      bindingId: f.begun.binding.bindingId,
      battleId: f.f.binding.setup.battleId,
      terminalReceiptId: finalReceipt.request.payload.receiptId,
      unitId: missingParticipant.unitId,
      characterId,
      location: f.begun.binding.location,
      containerIds,
      itemIds,
      disposition: 'RETAIN_WITH_PERSON' as const,
    };
    const terminal = {
      version: 's02-combat-terminal-outcome-1' as const,
      id: finalStateDigest,
      sourceEventId,
      bindingId: f.begun.binding.bindingId,
      battleId: f.f.binding.setup.battleId,
      receiptId: finalReceipt.request.payload.receiptId,
      revision: finalState.revision,
      atTick: consumed.next.encounter.active!.lastAppliedTick!,
      finalStateCanonical: canonicalCombatState(finalState),
      outcomeDigest: outcomeReceiptId,
      dispositions: participants.map((participant) => {
        const unit = finalState.units.find((entry) => entry.id === participant.unitId)!;
        return {
          id: `aggregate-disposition-${participant.unitId}`,
          sourceEventId,
          unitId: participant.unitId,
          characterId: participant.projection.characterId,
          status:
            participant.unitId === missingParticipant.unitId
              ? ('MISSING' as const)
              : unit.health === 0
                ? ('DEAD' as const)
                : ('PRESENT' as const),
          location: f.begun.binding.location,
          ...(participant.unitId === missingParticipant.unitId ? { missingEntryId } : {}),
        };
      }),
    };
    const terminalContext = {
      ...context(root, terminalCommand as ReturnType<typeof command>, [], [], [missingFact]),
      learningFacts: [],
    } as CombatOwnerContext;
    const finalizeInput = {
      command: terminalCommand,
      journal,
      applications,
      terminal,
      context: terminalContext,
      missingLearning: { [missingParticipant.unitId]: { intervals: [] } },
    };
    expect(consumed.next.encounter.active?.bindingDigest).toBe(canonicalJson(journal.binding));
    expect(canonicalJson(consumed.next.encounter.active?.binding)).toBe(
      consumed.next.encounter.active?.bindingDigest,
    );
    expect(journal.companyId).toBe(root.lifecycle.companyId);
    expect(journal.binding.bindingId).toBe(consumed.next.encounter.active?.binding.bindingId);
    expect(consumed.next.encounter.active?.appliedReceipts.at(-1)?.revision).toBe(
      finalState.revision,
    );
    expect(consumed.next.encounter.active?.lastAppliedTick).toBe(applications.at(-1)?.time.atTick);
    const finalized = prepareFinalizeCombatAggregate(consumed.next, finalizeInput);
    expect(finalized.kind, finalized.kind === 'REJECTED' ? finalized.error : undefined).toBe(
      'PREPARED',
    );
    if (finalized.kind !== 'PREPARED') return;
    expect(finalized.next.encounter.active).toBeNull();
    expect(finalized.next.economy.physical?.containers).toEqual(root.physical.containers);
    expect(finalized.next.economy.physical?.items).toEqual(root.physical.items);
    expect(
      finalized.next.economy.lifecycle.characters.find(
        (entry) => entry.identity.characterId === characterId,
      )?.presence.availability,
    ).toBe('OUT_OF_CONTACT');
    const earlierCharacterId = earlierPresentParticipant.projection.characterId;
    const earlierCharacter = finalized.next.economy.lifecycle.characters.find(
      (entry) => entry.identity.characterId === earlierCharacterId,
    );
    const earlierPriorPresence = consumed.next.encounter.active!.priorPresence.find(
      (entry) => entry.characterId === earlierCharacterId,
    );
    const earlierUnit = finalState.units.find(
      (entry) => entry.id === earlierPresentParticipant.unitId,
    )!;
    expect(earlierPriorPresence).toBeDefined();
    expect(earlierCharacter?.presence.availability).toBe(earlierPriorPresence?.availability);
    expect(earlierCharacter?.presence.assignment).toBe(earlierPriorPresence?.assignment);
    expect(earlierCharacter?.presence.fieldPartyId).toBe(earlierPriorPresence?.fieldPartyId);
    expect(
      finalized.next.economy.physical?.vitals?.find(
        (entry) => entry.characterId === earlierCharacterId,
      )?.morale,
    ).toBe(
      persistentMoraleAfterCombat(earlierPresentParticipant.projection.morale, earlierUnit.morale),
    );

    const retry = prepareFinalizeCombatAggregate(finalized.next, finalizeInput);
    expect(retry.kind).toBe('PREPARED');
    if (retry.kind === 'PREPARED') {
      expect(retry.replayed).toBe(true);
      expect(retry.next).toBe(finalized.next);
    }
    const changedLearning = prepareFinalizeCombatAggregate(finalized.next, {
      ...finalizeInput,
      missingLearning: {
        ...finalizeInput.missingLearning,
        unrelated: { intervals: [] },
      },
    });
    expect(changedLearning.kind).toBe('REJECTED');
    if (changedLearning.kind === 'REJECTED')
      expect(changedLearning.error).toBe('IDEMPOTENCY_CONFLICT');
    const changedTerminal = prepareFinalizeCombatAggregate(finalized.next, {
      ...finalizeInput,
      terminal: {
        ...terminal,
        finalStateCanonical: `${terminal.finalStateCanonical} `,
      },
    });
    expect(changedTerminal.kind).toBe('REJECTED');
    if (changedTerminal.kind === 'REJECTED')
      expect(changedTerminal.error).toBe('IDEMPOTENCY_CONFLICT');

    const cursorBefore = structuredClone(consumed.next);
    const changedEarlierRequest = prepareFinalizeCombatAggregate(consumed.next, {
      ...finalizeInput,
      journal: {
        ...journal,
        receipts: journal.receipts.map((receipt, index) =>
          index === 0
            ? { ...receipt, request: { ...receipt.request, commandId: 'altered-earlier-request' } }
            : receipt,
        ),
      },
    });
    expect(changedEarlierRequest.kind).toBe('REJECTED');
    if (changedEarlierRequest.kind === 'REJECTED')
      expect(changedEarlierRequest.error).toBe('IDEMPOTENCY_CONFLICT');
    const changedEarlierTime = prepareFinalizeCombatAggregate(consumed.next, {
      ...finalizeInput,
      applications: applications.map((application, index) =>
        index === 0
          ? { ...application, time: { ...application.time, id: 'altered-earlier-time' } }
          : application,
      ),
    });
    expect(changedEarlierTime.kind).toBe('REJECTED');
    if (changedEarlierTime.kind === 'REJECTED')
      expect(changedEarlierTime.error).toBe('IDEMPOTENCY_CONFLICT');
    expect(consumed.next).toEqual(cursorBefore);

    const remoteLocation = { kind: 'AT' as const, siteId: 'remote-site', areaId: 'remote-area' };
    expect(containerIds.length).toBeGreaterThan(0);
    const remoteState = consumed.next;
    const remoteBefore = structuredClone(remoteState);
    const remoteFact = { ...missingFact, location: remoteLocation };
    const rejected = prepareFinalizeCombatAggregate(remoteState, {
      ...finalizeInput,
      context: {
        ...context(root, terminalCommand as ReturnType<typeof command>, [], [], [remoteFact]),
        learningFacts: [],
      } as CombatOwnerContext,
    });
    expect(rejected.kind).toBe('REJECTED');
    if (rejected.kind === 'REJECTED') expect(rejected.error).toBe('INVALID_SOURCE');
    expect(remoteState).toEqual(remoteBefore);
  });

  it('retains a real leader death and resolves leadership before releasing the binding', () => {
    const f = aggregateFixture(true, 1);
    const journal = resolveCombatJournal(f.f, attackUntilCompanyUnitDies(f.f));
    expect(journal.receipts.at(-1)?.transition.state.status).toBe('resolved');
    const { profile, applications } = applicationsForJournal(f, journal);
    const consumed = prepareConsumeCombatAggregate(f.begun.next, {
      journal,
      applications,
      practiceProfile: profile,
    });
    if (consumed.kind !== 'PREPARED') throw new Error(`Consume death journal: ${consumed.error}`);

    const root = consumed.next.economy as MaterializedCompanyState;
    const finalReceipt = journal.receipts.at(-1)!;
    const finalState = finalReceipt.transition.state;
    const participants = f.begun.binding.participants.filter(
      (entry) => entry.companyId === root.lifecycle.companyId,
    );
    const finalStateDigest = 'aggregate-leader-death-final-state';
    const outcomeDigest = 'aggregate-leader-death-outcome';
    const terminalCommand = command(
      root,
      'FinalizeEncounter',
      {
        bindingId: f.begun.binding.bindingId,
        terminalReceiptId: finalReceipt.request.payload.receiptId,
        finalStateDigest,
        outcomeReceiptId: outcomeDigest,
      },
      'aggregate-finalize-leader-death',
      'COMBAT_RECEIPT',
      root.lifecycle.campaignTick,
    );
    const sourceEventId = terminalCommand.sourceEventId!;
    const terminal = {
      version: 's02-combat-terminal-outcome-1' as const,
      id: finalStateDigest,
      sourceEventId,
      bindingId: f.begun.binding.bindingId,
      battleId: f.f.binding.setup.battleId,
      receiptId: finalReceipt.request.payload.receiptId,
      revision: finalState.revision,
      atTick: consumed.next.encounter.active!.lastAppliedTick!,
      finalStateCanonical: canonicalCombatState(finalState),
      outcomeDigest,
      dispositions: participants.map((participant) => {
        const unit = finalState.units.find((entry) => entry.id === participant.unitId)!;
        return {
          id: `aggregate-death-disposition-${participant.unitId}`,
          sourceEventId,
          unitId: participant.unitId,
          characterId: participant.projection.characterId,
          status: unit.health === 0 ? ('DEAD' as const) : ('PRESENT' as const),
          location: f.begun.binding.location,
        };
      }),
    };
    const terminalContext = {
      ...context(root, terminalCommand as ReturnType<typeof command>),
      learningFacts: [],
    } as CombatOwnerContext;
    const leaderDeath = (
      applications.find((application) =>
        application.context.physicalFacts?.some(
          (fact) => fact.kind === 'DEATH_OUTCOME' && fact.characterId === 'a-leader',
        ),
      )?.context.physicalFacts ?? []
    ).find((fact) => fact.kind === 'DEATH_OUTCOME' && fact.characterId === 'a-leader');
    if (leaderDeath?.kind !== 'DEATH_OUTCOME')
      throw new Error('Expected retained leader death fact');
    const crisis = {
      ...scope(root, 'aggregate-leader-crisis', terminal.atTick),
      sourceEventId: leaderDeath.sourceEventId,
      kind: 'CRISIS' as const,
      leaderId: 'a-leader',
      reason: 'LEADER_DIED' as const,
    };
    const leadershipCommand = command(
      root,
      'ResolveLeadership',
      {
        companyId: root.lifecycle.companyId,
        crisisId: crisis.id,
        candidateId: 'a-provider',
        mode: 'PERMANENT',
      },
      'aggregate-resolve-leadership',
      'PLAYER',
      terminal.atTick,
    );
    const providerTerms: ServiceTermsEvidence = {
      ...scope(root, 'aggregate-provider-service-terms', terminal.atTick),
      kind: 'SERVICE_TERMS',
      characterId: 'a-provider',
      poolId: 'local',
      recipient: { kind: 'CHARACTER', id: 'a-provider' },
      signingWalletId: null,
      rates: COMPANY_RULES.economy.qualificationBands.map((band) => ({
        minimumLevel: band.level,
        dailyWageMilli: String(band.multiplierBps),
      })),
    };
    const leadershipContext = {
      ...context(root, leadershipCommand, [providerTerms], [crisis]),
      learningFacts: [],
    } as CombatOwnerContext;
    const finalizeInput = {
      command: terminalCommand,
      journal,
      applications,
      terminal,
      context: terminalContext,
      leadership: { command: leadershipCommand, context: leadershipContext },
    };

    const before = structuredClone(consumed.next);
    const missingLeadershipInput: Omit<typeof finalizeInput, 'leadership'> = {
      command: terminalCommand,
      journal,
      applications,
      terminal,
      context: terminalContext,
    };
    const missingLeadership = prepareFinalizeCombatAggregate(consumed.next, missingLeadershipInput);
    expect(missingLeadership.kind).toBe('REJECTED');
    if (missingLeadership.kind === 'REJECTED')
      expect(missingLeadership.error).toBe('INVALID_SOURCE');
    expect(consumed.next).toEqual(before);

    const missingCrisis = prepareFinalizeCombatAggregate(consumed.next, {
      ...finalizeInput,
      leadership: {
        ...finalizeInput.leadership,
        context: { ...leadershipContext, facts: [], learningFacts: [] } as CombatOwnerContext,
      },
    });
    expect(missingCrisis.kind).toBe('REJECTED');
    expect(consumed.next).toEqual(before);

    const providerBefore = root.lifecycle.characters.find(
      (character) => character.identity.characterId === 'a-provider',
    )!;
    const providerItemsBefore = root.physical.items.filter(
      (entry) => entry.owner.kind === 'CHARACTER' && entry.owner.id === 'a-provider',
    );
    const finalized = prepareFinalizeCombatAggregate(consumed.next, finalizeInput);
    expect(finalized.kind, finalized.kind === 'REJECTED' ? finalized.error : undefined).toBe(
      'PREPARED',
    );
    if (finalized.kind !== 'PREPARED') return;
    expect(finalized.next.encounter.active).toBeNull();
    expect(finalized.next.economy.lifecycle.company?.currentLeaderId).toBe('a-provider');
    const providerAfter = finalized.next.economy.lifecycle.characters.find(
      (character) => character.identity.characterId === 'a-provider',
    )!;
    expect(providerAfter.identity).toEqual(providerBefore.identity);
    expect(providerAfter.presence).toEqual(providerBefore.presence);
    expect(
      finalized.next.economy.physical?.items.filter(
        (entry) => entry.owner.kind === 'CHARACTER' && entry.owner.id === 'a-provider',
      ),
    ).toEqual(providerItemsBefore);
    const providerMembership = finalized.next.economy.lifecycle.memberships.find(
      (membership) => membership.characterId === 'a-provider' && membership.endedAt === null,
    );
    expect(providerMembership?.basis).toBe('FAMILY');
    expect(
      finalized.next.economy.finance.accounts.find(
        (account) => account.membershipId === providerMembership?.membershipId,
      )?.confirmedAt,
    ).toBe(terminal.atTick);
    const corpse = finalized.next.economy.physical?.containers.find(
      (entry) => entry.containerId === leaderDeath.corpseContainerId,
    );
    expect(corpse).toMatchObject({
      kind: 'CORPSE',
      custodian: { kind: 'WORLD', id: root.lifecycle.worldId },
      location: leaderDeath.location,
      closed: null,
    });
    expect(
      finalized.next.economy.physical?.items.filter(
        (entry) => entry.containerId === leaderDeath.corpseContainerId,
      ),
    ).not.toHaveLength(0);
    const leaderMembershipIds: ReadonlySet<string> = new Set(
      root.lifecycle.memberships
        .filter((membership) => membership.characterId === 'a-leader')
        .map((membership) => membership.membershipId),
    );
    expect(
      finalized.next.economy.finance.accounts
        .filter((account) => leaderMembershipIds.has(account.membershipId))
        .every(
          (account) =>
            account.death?.sourceId === leaderDeath.sourceEventId &&
            account.death.atTick === leaderDeath.actualDeathTick,
        ),
    ).toBe(true);
    expect(
      finalized.next.economy.finance.claims
        .filter((claim) => leaderMembershipIds.has(claim.membershipId))
        .every((claim) =>
          claim.earned.every(
            (period) => BigInt(period.toTick) <= BigInt(leaderDeath.actualDeathTick),
          ),
        ),
    ).toBe(true);

    const retry = prepareFinalizeCombatAggregate(finalized.next, finalizeInput);
    expect(retry.kind).toBe('PREPARED');
    if (retry.kind === 'PREPARED') {
      expect(retry.replayed).toBe(true);
      expect(retry.next).toBe(finalized.next);
    }
    const changedLeadershipSource = prepareFinalizeCombatAggregate(finalized.next, {
      ...finalizeInput,
      leadership: {
        ...finalizeInput.leadership,
        context: {
          ...leadershipContext,
          facts: [{ ...crisis, sourceEventId: 'changed-leader-death-source' }],
        } as CombatOwnerContext,
      },
    });
    expect(changedLeadershipSource.kind).toBe('REJECTED');
    if (changedLeadershipSource.kind === 'REJECTED')
      expect(changedLeadershipSource.error).toBe('IDEMPOTENCY_CONFLICT');
  });
});
