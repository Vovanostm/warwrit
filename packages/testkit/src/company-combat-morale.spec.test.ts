import { describe, expect, it } from 'vitest';
import {
  applyCombatCommand,
  battleId,
  canonicalCombatState,
  canonicalJson,
  commandId,
  createCompanyPhysicalState,
  createHexagon,
  entityId,
  persistentMoraleAfterCombat,
  projectCharacterCombat,
  projectCharacterCombatWithMorale,
  replayCombat,
  sideId,
  startBattleV2,
  unitId,
  validatePhysicalState,
} from '@warwrit/game-core';
import type {
  BattleSetupV2,
  CharacterCombatMoraleProjection,
  CombatMoraleSnapshot,
  CombatReplayV2,
  MaterializedCompanyState,
} from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';
import {
  addContainer,
  addItem,
  container,
  item,
  visibleCharacter,
} from './company-physical-fixture.js';

function fixture(morale?: number, overflow = false): MaterializedCompanyState {
  let state = visibleCharacter(economy(overflow ? [1n, 1n, 1n, 1n, 1n] : [1n]), 'leader', (p) => ({
    ...p,
    skills: { leadership: overflow ? 0 : 60 },
    perks: overflow ? [] : ['leadership-60-a'],
  }));
  const carrier = { kind: 'CHARACTER' as const, id: 'worker-0' };
  state = addContainer(state, container('pack', carrier, 30000, carrier), false);
  state = addItem(
    state,
    {
      ...item('spear', 'spear', carrier, 'pack'),
      equipped: { characterId: carrier.id, slots: ['MAIN_HAND', 'OFF_HAND'] },
    },
    false,
  );
  const physical = createCompanyPhysicalState(state.lifecycle, {
    items: state.physical!.items,
    containers: state.physical!.containers,
    vitals: [
      {
        characterId: carrier.id,
        sourceId: 'loaded-vitals',
        maximumHealth: 100,
        currentHealth: 60,
        healthCarry: '0',
        maximumStamina: 100,
        currentStamina: 80,
        staminaCarry: '0',
        ...(morale === undefined ? {} : { morale }),
      },
    ],
  });
  return { ...state, physical };
}

function setup(projected: CharacterCombatMoraleProjection): BattleSetupV2 {
  const hexes = createHexagon(2);
  return {
    schemaVersion: 2,
    battleId: battleId('morale-battle'),
    rulesetId: projected.combatRulesetId,
    seed: 23,
    map: { hexes, blocked: [] },
    sides: [
      { id: sideId('company'), retreatHexes: hexes.filter(({ q }) => q === -2) },
      { id: sideId('enemy'), retreatHexes: hexes.filter(({ q }) => q === 2) },
    ],
    units: [
      {
        id: unitId(projected.characterId),
        sideId: sideId('company'),
        position: { q: 0, r: 0 },
        weaponId: projected.weapon.profileId,
        attributes: projected.attributes,
        initialPools: projected.current,
      },
      {
        id: unitId('raider'),
        sideId: sideId('enemy'),
        position: { q: 1, r: 0 },
        weaponId: 'raider',
        attributes: {
          health: 60,
          armor: 0,
          stamina: 80,
          initiative: 80,
          accuracy: 90,
          defense: 0,
          morale: 100,
        },
        initialPools: { health: 60, armor: 0, stamina: 80, morale: 100 },
      },
    ],
  };
}

describe('G04 — clamp-aware morale provenance', () => {
  it.each([
    { persistent: 98, overflow: false, initial: 100 },
    { persistent: 0, overflow: true, initial: 1 },
  ])('does not drift across repeated saturated starts: $persistent -> $initial', (row) => {
    let persistent = row.persistent;
    for (let battle = 0; battle < 5; battle += 1) {
      const state = fixture(persistent, row.overflow);
      const projection = projectCharacterCombatWithMorale(state, 'worker-0');
      expect(projection.morale).toMatchObject({
        persistentBefore: row.persistent,
        actualInitialTactical: row.initial,
        overflowModifier: row.overflow ? -15 : 0,
        leader: { startingMorale: row.overflow ? 0 : 5 },
      });
      const started = startBattleV2(setup(projection));
      const actual = started.state.units.find((unit) => unit.id === 'worker-0')!;
      expect(actual.morale).toBe(row.initial);
      const saved = JSON.parse(JSON.stringify(projection.morale)) as CombatMoraleSnapshot;
      persistent = persistentMoraleAfterCombat(saved, actual.morale);
      expect(persistent).toBe(row.persistent);
    }
  });

  it.each([
    [98, false, 90, 88],
    [0, true, 15, 14],
    [99, true, 100, 100],
    [2, false, 0, 0],
  ] as const)('returns actual change (%s)', (before, over, final, after) => {
    const projection = projectCharacterCombatWithMorale(fixture(before, over), 'worker-0');
    expect(persistentMoraleAfterCombat(projection.morale, final)).toBe(after);
  });

  it.each([
    [98, false, 88, 86],
    [0, true, 0, 0],
  ] as const)('uses real V2 damage/wound morale and replay (%s)', (before, over, final, after) => {
    const projected = projectCharacterCombatWithMorale(fixture(before, over), 'worker-0');
    const input = setup(projected);
    const started = startBattleV2(input);
    const activation = started.state.activation!;
    expect(activation.unitId).toBe('raider');
    const attack = {
      type: 'attack' as const,
      commandId: commandId('morale-hit'),
      activationId: activation.id,
      actorId: activation.unitId,
      targetId: unitId('worker-0'),
    };
    const result = applyCombatCommand(started.state, attack);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected an actual attack');
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'unit.damaged', unitId: 'worker-0' }),
        expect.objectContaining({ type: 'unit.wounded', unitId: 'worker-0' }),
      ]),
    );
    const target = result.state.units.find((unit) => unit.id === 'worker-0')!;
    expect(target.morale).toBe(final);
    expect(persistentMoraleAfterCombat(projected.morale, target.morale)).toBe(after);
    const replay = JSON.parse(
      JSON.stringify({ schemaVersion: 2, setup: input, commands: [attack] }),
    ) as CombatReplayV2;
    expect(canonicalCombatState(replayCombat(replay).state)).toBe(
      canonicalCombatState(result.state),
    );
  });

  it('uses one acting leader for both aura and capacity', () => {
    let state = fixture(50, true);
    state = visibleCharacter(state, 'leader', (p) => ({
      ...p,
      skills: { leadership: 60 },
      perks: ['leadership-60-a'],
    })) as MaterializedCompanyState;
    state = visibleCharacter(state, 'worker-0', (p) => ({
      ...p,
      skills: { leadership: 25 },
      perks: ['leadership-25-a'],
    })) as MaterializedCompanyState;
    state = {
      ...state,
      lifecycle: {
        ...state.lifecycle,
        company: { ...state.lifecycle.company!, actingLeaderId: entityId('worker-0') },
      },
    };
    const projected = projectCharacterCombatWithMorale(state, 'worker-0');
    expect(projected.morale.leader).toMatchObject({
      effectiveLeaderId: 'worker-0',
      contributingPerkIds: ['leadership-25-a'],
      startingMorale: 3,
    });
    expect(projected.morale.overflowModifier).toBe(-10);
    expect(projected.current.morale).toBe(43);
  });

  it('owns frozen JSON data despite changed actual/known state', () => {
    const state = structuredClone(fixture(98));
    const before = canonicalJson(state);
    const projected = projectCharacterCombatWithMorale(Object.freeze(state), 'worker-0');
    expect(canonicalJson(state)).toBe(before);
    const serialized = JSON.stringify(projected);
    expect(Object.isFrozen(projected.current)).toBe(true);
    expect(Object.isFrozen(projected.morale.leader.contributingPerkIds)).toBe(true);
    expect(Reflect.set(projected.morale, 'persistentBefore', 1)).toBe(false);
    Reflect.set(state.physical.vitals[0]!, 'morale', 0);
    Reflect.set(state.lifecycle.company!, 'actingLeaderId', entityId('worker-0'));
    Reflect.set(state.lifecycle.characters[0]!, 'perks', []);
    Reflect.set(state.physical.knowledge, 'vitalSnapshots', [
      { ...state.physical.vitals[0]!, morale: 20 },
    ]);
    expect(JSON.stringify(projected)).toBe(serialized);
    expect(projectCharacterCombatWithMorale(state, 'worker-0').morale.persistentBefore).toBe(0);
    const reloaded = JSON.parse(serialized) as CharacterCombatMoraleProjection;
    expect(persistentMoraleAfterCombat(reloaded.morale, 100)).toBe(98);
    expect(persistentMoraleAfterCombat(projected.morale, 88)).toBe(86);
  });

  it('preserves legacy physical/G03 snapshots without inventing morale', () => {
    const state = fixture();
    expect(() => validatePhysicalState(state)).not.toThrow();
    expect(projectCharacterCombat(state, 'worker-0').current).toEqual({
      health: 60,
      armor: 0,
      stamina: 80,
    });
    expect(() => projectCharacterCombatWithMorale(state, 'worker-0')).toThrow('INVALID_STATE');
    const { morale } = projectCharacterCombatWithMorale(fixture(98), 'worker-0');
    for (const patch of [{ policyVersion: 'old-subtraction' }, { actualInitialTactical: 0 }]) {
      const invalid = { ...morale, ...patch } as CombatMoraleSnapshot;
      expect(() => persistentMoraleAfterCombat(invalid, 100)).toThrow('INVALID_SOURCE');
    }
  });

  it.each([-1, 101, 0.5, NaN, Infinity, -0])('rejects invalid pools: %s', (value) => {
    expect(() => fixture(value)).toThrow();
    const state = structuredClone(fixture(98));
    Reflect.set(state.physical.knowledge, 'vitalSnapshots', [
      { ...state.physical.vitals[0]!, morale: value },
    ]);
    expect(() => validatePhysicalState(state)).toThrow('INVALID_STATE');
    const projected = projectCharacterCombatWithMorale(fixture(98), 'worker-0');
    expect(() => persistentMoraleAfterCombat(projected.morale, value)).toThrow('INVALID_SOURCE');
  });
});
