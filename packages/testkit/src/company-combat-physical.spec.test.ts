import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  ENCOUNTER_BINDING_VERSION,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  applyCombatCommand,
  battleId,
  canonicalJson,
  commandId,
  createCombatReceiptJournal,
  createHexagon,
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
  MaterializedCompanyState,
} from '@warwrit/game-core';
import { command, context, economy, place } from './company-economy-fixture.js';
import { addContainer, addItem, addVitals, container, item } from './company-physical-fixture.js';

function source(prefix: string): EncounterCompanySource {
  const ids = new Set(['company', 'party', 'leader', 'provider']);
  let root = JSON.parse(
    JSON.stringify(economy([]), (_, value) => (ids.has(value) ? `${prefix}-${value}` : value)),
  ) as ReturnType<typeof economy>;
  const characterId = `${prefix}-leader`;
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
  const request = command(root, 'BeginEncounterBinding', {}, 'placement', 'SYSTEM');
  return { root: { ...root, physical: root.physical! }, context: context(root, request) };
}

function fixture() {
  const sources = [source('a'), source('b')];
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
      members: [
        {
          characterId: root.lifecycle.characters[0]!.identity.characterId,
          unitId: unitId(`${index === 0 ? 'a' : 'b'}-leader-unit`),
          position: { q: index === 0 ? -1 : 1, r: 0 },
        },
      ],
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

describe('G07 — prepared physical combat effects', () => {
  it('persists verified pools, including the initial clamp, and replays deterministically', () => {
    const f = fixture();
    const unchanged = canonicalJson(f.root);
    let journal = accept(f, f.journal, f.binding.initial, null);
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
