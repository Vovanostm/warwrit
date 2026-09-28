import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  COMPANY_RULES,
  ENCOUNTER_BINDING_VERSION,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  applyCombatCommand,
  battleId,
  canonicalJson,
  commandId,
  createCombatReceiptJournal,
  initialSkillProgress,
  createHexagon,
  prepareCombatConsequences,
  prepareCombatPracticeEffects,
  COMBAT_PRACTICE_PROFILE_VERSION,
  PROGRESSION_RULES,
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
  MaterializedCompanyState,
  PhysicalEvidence,
  PracticeEvidence,
  CommandOf,
} from '@warwrit/game-core';
import {
  command,
  context,
  economy,
  physicalScope,
  place,
  scope,
} from './company-economy-fixture.js';
import { addContainer, addItem, addVitals, container, item } from './company-physical-fixture.js';

function source(prefix: string, health = 100): EncounterCompanySource {
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

function fixture(health = 100, adjacentPracticeParty = false) {
  const sources = [source('a', health), source('b', 10000)];
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
  return { sources, root, binding, journal };
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
  for (let index = 0; index < 512; index += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    const activation = state.activation;
    if (!activation) break;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    const friendly = actor.sideId === sideId('a-side');
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
  it('credits only replayed company attacks, preserves G08 requirements and leaves the cursor pending', () => {
    const f = fixture(10000, true);
    const journal = practiceJournal(f, [
      { characterId: 'a-leader', count: 2 },
      { characterId: 'a-worker-0', count: 1 },
      { characterId: 'a-worker-1', count: 1 },
    ]);
    const companyAttacks = journal.receipts.filter(
      (receipt) =>
        receipt.kernelCommand?.type === 'attack' &&
        f.binding.participants.find((entry) => entry.unitId === receipt.kernelCommand.actorId)
          ?.companyId === f.root.lifecycle.companyId,
    );
    expect(companyAttacks.length).toBeGreaterThan(0);
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
    const leader = f.binding.participants.find(
      (entry) => entry.projection.characterId === cycle.commanderId,
    )!;
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
  });
});
