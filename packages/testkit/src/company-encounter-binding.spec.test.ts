import { describe, expect, it } from 'vitest';
import {
  ENCOUNTER_BINDING_VERSION,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  battleId,
  canonicalCombatState,
  canonicalJson,
  createHexagon,
  prepareEncounterBinding,
  replayCombat,
  sideId,
  unitId,
} from '@warwrit/game-core';
import type {
  EncounterCompanySource,
  EncounterPositionEvidence,
  FrozenEncounterBinding,
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
      const slots =
        definition === 'padded-coat'
          ? (['BODY'] as const)
          : definition === 'shield'
            ? (['OFF_HAND'] as const)
            : definition === 'spear'
              ? (['MAIN_HAND', 'OFF_HAND'] as const)
              : (['MAIN_HAND'] as const);
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
    const reloaded = JSON.parse(serialized) as FrozenEncounterBinding;
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
  it('does not generate an opponent to satisfy the V2 minimum', () => {
    const f = fixture();
    f.sources.pop();
    Reflect.set(f.evidence, 'parties', f.evidence.parties.slice(0, 1));
    const prepare = () => prepareEncounterBinding(f.sources, f.request, f.evidence);
    expect(prepare).toThrow('at least one unit');
  });
});
