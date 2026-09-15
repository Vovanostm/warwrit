import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  ENCOUNTER_BINDING_VERSION,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  applyCombatCommand,
  battleId,
  canonicalCombatState,
  canonicalJson,
  combatReceiptEventIds,
  commandId,
  createCombatReceiptJournal,
  createHexagon,
  prepareCombatReceipt,
  prepareEncounterBinding,
  replayCombat,
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
} from '@warwrit/game-core';
import { command, context, economy, place } from './company-economy-fixture.js';
import {
  addContainer,
  addItem,
  addVitals,
  container,
  item,
  visibleCharacter,
  withLoadedConditions,
} from './company-physical-fixture.js';

function company(prefix: string, rates: readonly bigint[]): EncounterCompanySource {
  const ids = new Set(['company', 'party', 'leader', 'worker-0', 'provider']);
  let root = JSON.parse(
    JSON.stringify(economy(rates), (_, value) => (ids.has(value) ? `${prefix}-${value}` : value)),
  ) as ReturnType<typeof economy>;
  root = visibleCharacter(root, `${prefix}-leader`, (character) => ({
    ...character,
    perks: ['leadership-25-a'],
  }));
  const members = root.lifecycle.characters.filter((person) => person.presence.fieldPartyId);
  for (const character of members) {
    const id = character.identity.characterId;
    const wounded = id.endsWith('worker-0');
    const owner = { kind: 'CHARACTER' as const, id };
    const pack = `${id}-pack`;
    root = addContainer(root, container(pack, owner, 30000, owner), false);
    const weapons = wounded ? ['spear'] : ['sword', 'shield'];
    for (const definition of [...weapons, 'padded-coat']) {
      const gear = COMPANY_CATALOGUE.items.find((entry) => entry.id === definition)!;
      const slots = gear.hands === 2 ? (['MAIN_HAND', 'OFF_HAND'] as const) : [gear.slot!];
      root = addItem(root, {
        ...item(`${id}-${definition}`, definition, owner, pack, 1, 5000),
        ...(definition === 'padded-coat' ? { currentCondition: 20, maximumCondition: 40 } : {}),
        equipped: { characterId: id, slots },
      });
    }
    root = addVitals(root, {
      characterId: id,
      sourceId: `${id}-vitals`,
      maximumHealth: 100,
      currentHealth: 37,
      healthCarry: '0',
      maximumStamina: 100,
      currentStamina: wounded ? 0 : 100,
      staminaCarry: '0',
      morale: 98,
    });
  }
  if (rates.length)
    root = withLoadedConditions(root, { [`${prefix}-worker-0`]: ['severe-stable-wound'] }, 'old');
  const ctx = context(root, command(root, 'BeginEncounterBinding', {}, 'placement', 'SYSTEM'));
  return { root: { ...root, physical: root.physical! }, context: ctx };
}

function fixture() {
  const sources = [company('a', [1n]), company('b', [])];
  const hexes = createHexagon(2);
  const request = { bindingId: 'binding', battleId: battleId('battle') };
  const evidence: EncounterPositionEvidence = {
    id: 'placement',
    sourceEventId: 'world-contact',
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
        { id: sideId('a-company'), retreatHexes: hexes.filter(({ q }) => q === -2) },
        { id: sideId('b-company'), retreatHexes: hexes.filter(({ q }) => q === 2) },
      ],
    },
    parties: sources.map(({ root }, index) => ({
      companyId: root.lifecycle.companyId,
      partyId: root.lifecycle.parties[0]!.partyId,
      revision: root.lifecycle.revision,
      sideId: sideId(root.lifecycle.companyId),
      members: root.lifecycle.characters
        .filter((character) => character.presence.fieldPartyId)
        .map((character, r) => ({
          characterId: character.identity.characterId,
          unitId: unitId(`${character.identity.characterId}-unit`),
          position: { q: index ? 1 : -1, r },
        })),
    })),
  };
  const root = sources[0]!.root;
  const party = evidence.parties[0]!;
  const member = party.members[1]!;
  const vitals = root.physical.vitals[1]!;
  const shield = root.physical.items.find((i) => i.definitionId === 'shield')!;
  const spear = root.physical.items.find((i) => i.definitionId === 'spear')!;
  return { sources, request, evidence, root, party, member, vitals, shield, spear };
}

describe('G05 — whole-candidate real participant binding', () => {
  it('keeps wounded people, exact hands, old conditions and G04 pools before initiative', () => {
    const { sources, request, evidence } = fixture();
    const before = canonicalJson(sources);
    const binding = prepareEncounterBinding(sources, request, evidence);
    expect(canonicalJson(sources)).toBe(before);
    expect(binding.participants.map((p) => p.projection.characterId)).toEqual([
      'a-leader',
      'a-worker-0',
      'b-leader',
    ]);
    const leader = binding.participants[0]!;
    expect(leader.projection.weapon.requiredOffHandItemId).toBe('a-leader-shield');
    const shield = leader.equipment.find((i) => i.itemId === 'a-leader-shield')!;
    expect(shield.equipped!.slots).toEqual(['OFF_HAND']);
    expect(leader.projection.morale.persistentBefore).toBe(98);
    expect(leader.projection.morale.actualInitialTactical).toBe(100);
    const wounded = binding.participants[1]!;
    expect(wounded.vitals.maximumHealth).toBe(100);
    expect(wounded.projection.conditionIds).toEqual(['old-a-worker-0-0']);
    expect(binding.initial.state.initiativeOrder.at(-1)).toBe(wounded.unitId);
    expect(binding.initial.state.units.find((u) => u.id === wounded.unitId)).toMatchObject({
      health: 37,
      armor: 20,
      stamina: 0,
      morale: 100,
      wounds: [],
    });
    expect(Reflect.set(wounded.equipment[0]!, 'currentCondition', 0)).toBe(false);
    const serialized = JSON.stringify(binding);
    Reflect.set(sources[0]!.root.physical.vitals[0]!, 'morale', 0);
    Reflect.set(sources[0]!.root.lifecycle.characters[0]!, 'perks', []);
    Reflect.set(sources[0]!.root.physical.items.at(-1)!, 'equipped', null);
    expect(JSON.stringify(binding)).toBe(serialized);
    const reloaded = JSON.parse(serialized) as typeof binding;
    const replay = replayCombat({ schemaVersion: 2, setup: reloaded.setup, commands: [] });
    expect(canonicalCombatState(replay.state)).toBe(canonicalCombatState(binding.initial.state));
  });

  type Fixture = ReturnType<typeof fixture>;
  const failures: readonly [string, (f: Fixture) => object, string, unknown][] = [
    ['foreign world', (f) => f.evidence, 'worldId', 'foreign'],
    ['foreign battle', (f) => f.request, 'battleId', 'other'],
    ['foreign company', (f) => f.party, 'companyId', 'foreign'],
    ['foreign party', (f) => f.party, 'partyId', 'foreign'],
    ['stale revision', (f) => f.party, 'revision', '1'],
    ['unknown version', (f) => f.evidence, 'version', 'unknown'],
    ['incomplete graph', (f) => f.sources[0]!.context, 'completeGraph', false],
    ['unsettled time', (f) => f.root.finance, 'processedTick', '0'],
    ['missing wounded', (f) => f.party.members, 'length', 1],
    ['remote reserve', (f) => f.member, 'characterId', 'a-provider'],
    ['duplicate character', (f) => f.member, 'characterId', 'a-leader'],
    ['duplicate unit', (f) => f.member, 'unitId', 'a-leader-unit'],
    ['duplicate position', (f) => f.member, 'position', { q: -1, r: 0 }],
    ['blocked position', (f) => f.evidence.setup.map, 'blocked', [{ q: -1, r: 0 }]],
    ['off-map position', (f) => f.member, 'position', { q: 99, r: 0 }],
    ['unknown morale', (f) => f.vitals, 'morale', undefined],
    ['missing shield', (f) => f.shield, 'equipped', null],
    ['false slots', (f) => f.spear.equipped!, 'slots', ['MAIN_HAND', 'OFF_HAND', 'BELT']],
    ['duplicate item', (f) => f.spear, 'itemId', 'a-leader-shield'],
  ];
  it.each(failures)('rejects %s atomically', (_, target, key, value) => {
    const f = structuredClone(fixture());
    if (value === undefined) Reflect.deleteProperty(target(f), key);
    else Reflect.set(target(f), key, value);
    const before = canonicalJson(f);
    expect(() => prepareEncounterBinding(f.sources, f.request, f.evidence)).toThrow();
    expect(canonicalJson(f)).toBe(before);
  });
  it('rejects an active binding without partially binding earlier members', () => {
    const f = fixture();
    const presence = f.root.lifecycle.characters[1]!.presence;
    Reflect.set(presence, 'availability', 'IN_ENCOUNTER');
    Reflect.set(presence, 'encounterBindingId', 'other');
    const before = canonicalJson(f);
    const prepare = () => prepareEncounterBinding(f.sources, f.request, f.evidence);
    expect(prepare).toThrow('INCOMPATIBLE_ACTIVITY');
    expect(canonicalJson(f)).toBe(before);
  });
  it('rejects an immobile actual member rather than creating a mobile V2 unit', () => {
    const f = fixture();
    const loaded = withLoadedConditions(f.root, { 'a-worker-0': ['critical-bleed'] }, 'critical');
    f.sources[0] = { ...f.sources[0]!, root: { ...loaded, physical: loaded.physical! } };
    const before = canonicalJson(f.sources);
    const prepare = () => prepareEncounterBinding(f.sources, f.request, f.evidence);
    expect(prepare).toThrow('INCOMPATIBLE_ACTIVITY');
    expect(canonicalJson(f.sources)).toBe(before);
  });
  it('does not generate an opponent to satisfy the V2 minimum', () => {
    const f = fixture();
    f.sources.pop();
    Reflect.set(f.evidence, 'parties', f.evidence.parties.slice(0, 1));
    const prepare = () => prepareEncounterBinding(f.sources, f.request, f.evidence);
    expect(prepare).toThrow('at least one unit');
  });
});

function receiptFixture() {
  const f = fixture();
  const binding = prepareEncounterBinding(f.sources, f.request, f.evidence);
  const journal = createCombatReceiptJournal(binding, f.root.lifecycle.companyId);
  return { ...f, binding, journal };
}
function receiptPacket(
  f: ReturnType<typeof receiptFixture>,
  transition: CombatTransition,
  kernelCommand: CombatCommand | null = null,
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
  const ctx: CombatReceiptContext = {
    ...context(f.root, request),
    binding: f.binding,
    kernelCommand,
    transition,
  };
  return { request, context: ctx };
}
function nextReceipt(f: ReturnType<typeof receiptFixture>, journal: CombatReceiptJournal) {
  const state = journal.receipts.at(-1)!.transition.state;
  const kernelCommand: CombatCommand = {
    type: 'defend',
    commandId: commandId(`kernel-${state.revision + 1}`),
    activationId: state.activation!.id,
    actorId: state.activation!.unitId,
  };
  const result = applyCombatCommand(state, kernelCommand);
  if (!result.ok) throw new Error(result.error.code);
  return receiptPacket(f, { state: result.state, events: result.events }, kernelCommand);
}
function reload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function grant(packet: ReturnType<typeof receiptPacket>) {
  Reflect.set(packet.context, 'internalGrant', {
    commandId: packet.request.commandId,
    sourceEventId: packet.request.sourceEventId,
    canonicalRequest: canonicalJson(packet.request),
  });
}

describe('G06 — trusted sequential receipt preparation, not applied effects', () => {
  it('follows real G05/kernel revisions through JSON without changing the binding or companies', () => {
    const f = receiptFixture();
    const before = JSON.stringify(f.sources);
    let journal: CombatReceiptJournal = f.journal;
    let restored: CombatReceiptJournal = reload(journal);
    expect(f.binding.initial.state).toMatchObject({ schemaVersion: 1, revision: 0 });
    expect(f.binding.setup.schemaVersion).toBe(2);
    expect(f.binding.initial.events).toHaveLength(3);
    for (let index = 0; index < 5; index++) {
      const packet = index ? nextReceipt(f, journal) : receiptPacket(f, f.binding.initial);
      const unchanged = JSON.stringify(journal);
      const result = prepareCombatReceipt(journal, packet.request, packet.context);
      const wire = reload(packet);
      restored = prepareCombatReceipt(reload(restored), wire.request, wire.context).journal;
      expect(JSON.stringify(journal)).toBe(unchanged);
      expect(result.receipt.status).toBe('PREPARED');
      expect(result.receipt.sourceEventIds).toEqual(
        packet.context.transition.events.map((_, i) => `${packet.request.sourceEventId}:${i}`),
      );
      journal = result.journal;
    }
    expect(restored).toEqual(journal);
    expect(journal.proposedLastAppliedRevision).toBe(4);
    expect(journal.binding.lastAppliedRevision).toBe(f.binding.initial.state.revision);
    expect(JSON.stringify(f.sources)).toBe(before);
    const commands = journal.receipts.flatMap((r) => (r.kernelCommand ? [r.kernelCommand] : []));
    const replay = replayCombat({ schemaVersion: 2, setup: f.binding.setup, commands });
    expect(replay.state).toEqual(journal.receipts.at(-1)!.transition.state);
  });

  it('returns the original authorized receipt after later preparations and owns every snapshot', () => {
    const f = receiptFixture();
    const packet = reload(receiptPacket(f, f.binding.initial));
    const initial = prepareCombatReceipt(f.journal, packet.request, packet.context);
    const next = nextReceipt(f, initial.journal);
    const later = prepareCombatReceipt(initial.journal, next.request, next.context);
    const exact = prepareCombatReceipt(reload(later.journal), packet.request, packet.context);
    expect(exact.receipt).toEqual(initial.receipt);
    expect(exact.journal).toEqual(later.journal);
    const retry = reload(packet);
    retry.request.commandId = 'new-transport-id';
    Reflect.set(retry.request, 'expectedRevision', '999');
    grant(retry);
    const repeated = prepareCombatReceipt(reload(later.journal), retry.request, retry.context);
    expect(repeated.receipt).toEqual(initial.receipt);
    expect(repeated.journal).toEqual(later.journal);
    const saved = JSON.stringify(initial);
    Reflect.set(packet.context.transition.state.units[0]!, 'health', 1);
    Reflect.set(packet.request, 'sourceEventId', 'changed');
    expect(JSON.stringify(initial)).toBe(saved);
    expect(Reflect.set(initial.receipt.transition.state, 'revision', 99)).toBe(false);
  });

  it('retains ordinal identity even for two identical-looking actual event values', () => {
    const f = receiptFixture();
    const event = f.binding.initial.events[0]!;
    expect(combatReceiptEventIds('battle:0', [event, reload(event)])).toEqual([
      'battle:0:0',
      'battle:0:1',
    ]);
    expect(() => combatReceiptEventIds('x'.repeat(256), [event])).toThrow();
  });

  function failureInput() {
    const f = receiptFixture();
    const start = receiptPacket(f, f.binding.initial);
    const initial = prepareCombatReceipt(f.journal, start.request, start.context);
    return reload({ journal: initial.journal, ...nextReceipt(f, initial.journal) });
  }
  type FailureInput = ReturnType<typeof failureInput>;
  const failures: readonly [string, (f: FailureInput) => object, string, unknown][] = [
    ['no adapter grant', (f) => f.context, 'internalGrant', undefined],
    ['player principal', (f) => f.context.principal, 'kind', 'PLAYER'],
    ['client verification flag', (f) => f.request, 'verified', true],
    ['foreign world', (f) => f.context.binding, 'worldId', 'foreign'],
    ['foreign binding', (f) => f.context.binding, 'bindingId', 'foreign'],
    ['foreign participant', (f) => f.context.binding.participants[0]!, 'unitId', 'foreign'],
    ['unknown binding version', (f) => f.context.binding, 'version', 'unknown'],
    ['wrong envelope binding', (f) => f.request.payload, 'bindingId', 'foreign'],
    ['noncanonical receipt key', (f) => f.request.payload, 'receiptId', 'battle:01'],
    ['wrong source key', (f) => f.request, 'sourceEventId', 'foreign'],
    ['contradictory envelope revision', (f) => f.request.payload, 'revision', '2'],
    ['V2 is not state schema', (f) => f.context.transition.state, 'schemaVersion', 2],
    ['foreign battle', (f) => f.context.transition.state, 'battleId', 'foreign'],
    ['wrong event revision', (f) => f.context.transition.events[0]!, 'revision', 2],
    ['unknown event unit', (f) => f.context.transition.events[0]!, 'unitId', 'foreign'],
    ['unknown state unit', (f) => f.context.transition.state.units[0]!, 'id', 'foreign'],
    ['invalid kernel identity', (f) => f.context.kernelCommand!, 'commandId', ''],
    ['invalid activation', (f) => f.context.kernelCommand!, 'activationId', 'old'],
    ['missing historical body', (f) => f.journal.receipts[0]!.request, 'payload', {}],
    ['contradictory offset', (f) => f.journal, 'proposedLastAppliedRevision', 9],
  ];
  it.each(failures)('rejects %s without touching any input', (_, target, key, value) => {
    const f = failureInput();
    if (value === undefined) Reflect.deleteProperty(target(f), key);
    else Reflect.set(target(f), key, value);
    if (f.context.internalGrant) grant(f);
    const before = JSON.stringify(f);
    expect(() => prepareCombatReceipt(f.journal, f.request, f.context)).toThrow();
    expect(JSON.stringify(f)).toBe(before);
  });

  it('rejects gaps and changed authorized replays, including after reload', () => {
    const f = receiptFixture();
    const first = receiptPacket(f, f.binding.initial);
    const initial = prepareCombatReceipt(f.journal, first.request, first.context);
    const next = nextReceipt(f, initial.journal);
    expect(() => prepareCombatReceipt(f.journal, next.request, next.context)).toThrow(
      'STALE_REVISION',
    );
    const changed = reload(first);
    changed.request.commandId = 'changed-retry';
    Reflect.set(changed.context.transition.events[0]!, 'seed', 999);
    Reflect.set(changed.request.payload, 'orderedEvents', changed.context.transition.events);
    grant(changed);
    expect(() =>
      prepareCombatReceipt(reload(initial.journal), changed.request, changed.context),
    ).toThrow('IDEMPOTENCY_CONFLICT');
    const reordered = reload(first);
    const events = [...reordered.context.transition.events].reverse();
    Reflect.set(reordered.context.transition, 'events', events);
    Reflect.set(reordered.request.payload, 'orderedEvents', reordered.context.transition.events);
    grant(reordered);
    expect(() =>
      prepareCombatReceipt(initial.journal, reordered.request, reordered.context),
    ).toThrow('IDEMPOTENCY_CONFLICT');
    const concealed = reload(changed);
    Reflect.deleteProperty(concealed.context, 'internalGrant');
    expect(() =>
      prepareCombatReceipt(initial.journal, concealed.request, concealed.context),
    ).toThrow('INVALID_SOURCE');
    expect(initial.journal.binding.lastAppliedRevision).toBe(0);
  });
});
