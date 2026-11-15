import { describe, expect, it } from 'vitest';
import { battleId, sideId, unitId } from './types.js';
import { applyCombatCommand, assertBattleState } from './engine.js';
import { canonicalCombatState, replayCombat } from './replay.js';
import { previewCombatAttacks } from './sprite-prototype.js';
import { isSpriteS4Ruleset } from './rules.js';
import { startBattleV3 } from './runtime-v3.js';
import {
  COMBAT_V3_SCHEMA_VERSION,
  M1_DOMAIN_BRIDGE_V6_RULESET_ID,
  validateBattleSetupV3,
  type BattleSetupV3,
} from './setup-v3.js';

function setupV3(): BattleSetupV3 {
  const sides = [0, 1, 2].map((index) => ({
    id: sideId(`side-${index}`),
    retreatHexes: [{ q: 36 + index, r: 0 }],
  }));
  const parties = [
    {
      id: 'party-player',
      sideId: sides[0]!.id,
      kind: 'player' as const,
      controllerId: 'controller-1',
    },
    { id: 'party-0-npc', sideId: sides[0]!.id, kind: 'npc' as const },
    { id: 'party-1', sideId: sides[1]!.id, kind: 'npc' as const },
    { id: 'party-2', sideId: sides[2]!.id, kind: 'npc' as const },
  ];
  return {
    schemaVersion: COMBAT_V3_SCHEMA_VERSION,
    battleId: battleId('battle-three-side'),
    rulesetId: M1_DOMAIN_BRIDGE_V6_RULESET_ID,
    seed: 17,
    map: { hexes: Array.from({ length: 39 }, (_, q) => ({ q, r: 0 })), blocked: [], tiles: [] },
    sides,
    parties,
    units: Array.from({ length: 36 }, (_, index) => {
      const sideIndex = Math.floor(index / 12);
      return {
        id: unitId(`unit-${String(index).padStart(2, '0')}`),
        partyId:
          sideIndex === 0 ? (index < 6 ? 'party-player' : 'party-0-npc') : `party-${sideIndex}`,
        sideId: sides[sideIndex]!.id,
        position: { q: index, r: 0 },
        weaponId: 'fists' as const,
        attributes: {
          health: 100,
          armor: 10,
          stamina: 40,
          initiative: 10,
          accuracy: 75,
          defense: 20,
          morale: 80,
        },
        initialPools: { health: 100, armor: 10, stamina: 40, morale: 80 },
        capabilities: { move: true, attack: true, defend: true, retreat: true },
        skillRanks: {},
        moralePolicy: 'steady' as const,
      };
    }),
  };
}

function twoUnitV6Setup(allIncapacitated = false): BattleSetupV3 {
  const base = setupV3();
  const incapable = {
    ...base.units[0]!,
    id: unitId('incapable'),
    position: { q: 0, r: 0 },
    weaponId: 'fists' as const,
    attributes: {
      health: 1,
      armor: 0,
      stamina: 40,
      initiative: 100,
      accuracy: 0,
      defense: 0,
      morale: 70,
    },
    initialPools: { health: 1, armor: 0, stamina: 40, morale: 70 },
    capabilities: { move: false, attack: false, defend: false, retreat: false },
  };
  const capable = {
    ...base.units[12]!,
    id: unitId('capable'),
    position: { q: 1, r: 0 },
    weaponId: 'great-weapon' as const,
    attributes: {
      health: 100,
      armor: 0,
      stamina: 40,
      initiative: 50,
      accuracy: 1_000,
      defense: 0,
      morale: 70,
    },
    initialPools: { health: 100, armor: 0, stamina: 40, morale: 70 },
    capabilities: allIncapacitated
      ? { move: false, attack: false, defend: false, retreat: false }
      : { move: true, attack: true, defend: true, retreat: true },
  };
  return {
    ...base,
    sides: base.sides.slice(0, 2),
    parties: base.parties.filter((party) => party.id === 'party-player' || party.id === 'party-1'),
    units: [incapable, capable],
  };
}

function threeSideV6SetupWithOneCapableFighter(): BattleSetupV3 {
  const base = setupV3();
  const incapable = [base.units[0]!, base.units[12]!].map((unit, index) => ({
    ...unit,
    id: unitId('incapable-' + index),
    position: { q: index, r: 0 },
    attributes: { ...unit.attributes, health: 1, armor: 0 },
    initialPools: { health: 1, armor: 0, stamina: 40, morale: 70 },
    capabilities: { move: false, attack: false, defend: false, retreat: false },
  }));
  const capable = {
    ...base.units[24]!,
    id: unitId('last-capable'),
    position: { q: 2, r: 0 },
    attributes: {
      health: 5,
      armor: 0,
      stamina: 40,
      initiative: 50,
      accuracy: 100,
      defense: 0,
      morale: 70,
    },
    initialPools: { health: 5, armor: 0, stamina: 40, morale: 70 },
    capabilities: { move: true, attack: true, defend: true, retreat: true },
  };
  return {
    ...base,
    map: {
      ...base.map,
      tiles: [{ q: 3, r: 0, height: 0, terrain: 'fire' }],
    },
    parties: base.parties.filter(
      (party) => party.id === 'party-player' || party.id === 'party-1' || party.id === 'party-2',
    ),
    units: [...incapable, capable],
  };
}

describe('combat setup schema 3', () => {
  it('retains three sides and all 36 figures through deterministic replay', () => {
    const setup = setupV3();
    const started = startBattleV3(setup);
    expect(started.state.sides).toHaveLength(3);
    expect(started.state.units).toHaveLength(36);
    expect(started.state.units[0]).toMatchObject({ partyId: 'party-player' });
    expect(started.state.parties?.[0]).toMatchObject({
      id: 'party-player',
      sideId: 'side-0',
      controllerId: 'controller-1',
    });
    expect(JSON.parse(canonicalCombatState(started.state)).unitParties).toHaveLength(36);
    const wait = {
      type: 'wait' as const,
      commandId: 'schema3-wait' as never,
      actorId: started.state.activation!.unitId,
      activationId: started.state.activation!.id,
    };
    const replay = { schemaVersion: COMBAT_V3_SCHEMA_VERSION, setup, commands: [wait] } as const;
    const once = replayCombat(replay);
    const twice = replayCombat(replay);
    expect(once.commandsApplied).toBe(1);
    expect(canonicalCombatState(once.state)).toBe(canonicalCombatState(twice.state));
    expect(isSpriteS4Ruleset(M1_DOMAIN_BRIDGE_V6_RULESET_ID)).toBe(true);
    const baseline = canonicalCombatState(started.state);
    const changedCapability = {
      ...started.state,
      units: started.state.units.map((unit, index) =>
        index === 0 ? { ...unit, capabilities: { ...unit.capabilities!, move: false } } : unit,
      ),
    };
    const changedTerrain = {
      ...started.state,
      map: {
        ...started.state.map,
        tiles: [{ q: 0, r: 0, height: 0 as const, terrain: 'fire' as const }],
      },
    };
    const changedThreat = {
      ...started.state,
      units: started.state.units.map((unit, index) =>
        index === 0
          ? {
              ...unit,
              threat: {
                targetId: unitId('unit-01'),
                targetHex: { q: 1, r: 0 },
                range: 2 as const,
                damage: { minimum: 2, maximum: 4 },
                retargeted: false,
                responseReceived: false,
              },
            }
          : unit,
      ),
    };
    expect(canonicalCombatState(changedCapability)).not.toBe(baseline);
    expect(canonicalCombatState(changedTerrain)).not.toBe(baseline);
    expect(canonicalCombatState(changedThreat)).not.toBe(baseline);
  });

  it('rejects oversize parties, sides, side references, fourth sides and overlapping positions', () => {
    const setup = setupV3();
    const overParty = {
      ...setup,
      units: setup.units.map((unit, index) =>
        index === 6 ? { ...unit, partyId: 'party-player' } : unit,
      ),
    };
    expect(() => validateBattleSetupV3(overParty)).toThrow(/six units/);
    expect(() =>
      validateBattleSetupV3({
        ...setup,
        units: [
          ...setup.units,
          { ...setup.units[0]!, id: unitId('extra'), position: { q: 36, r: 0 } },
        ],
      }),
    ).toThrow(/2-36/);
    const thirteenthOnOneSide = setup.units.map((unit, index) =>
      index === 12 ? { ...unit, sideId: sideId('side-0'), partyId: 'party-0-npc' } : unit,
    );
    expect(() => validateBattleSetupV3({ ...setup, units: thirteenthOnOneSide })).toThrow(
      /exceeds twelve/,
    );
    expect(() =>
      validateBattleSetupV3({
        ...setup,
        sides: [...setup.sides, { id: sideId('fourth'), retreatHexes: [{ q: 38, r: 0 }] }],
      }),
    ).toThrow(/two or three sides/);
    expect(() =>
      validateBattleSetupV3({
        ...setup,
        units: setup.units.map((unit, index) =>
          index === 0 ? { ...unit, sideId: sideId('unknown') } : unit,
        ),
      }),
    ).toThrow(/unknown side/);
    expect(() =>
      validateBattleSetupV3({
        ...setup,
        units: setup.units.map((unit, index) =>
          index === 1 ? { ...unit, position: setup.units[0]!.position } : unit,
        ),
      }),
    ).toThrow(/Multiple units occupy/);
  });

  it('accepts mill-slam only for an NPC party and rejects unmapped threat profiles', () => {
    const base = setupV3();
    const npcTrait = {
      ...base,
      units: base.units.map((unit, index) =>
        index === 6 ? { ...unit, threatProfile: 'mill-slam' as const } : unit,
      ),
    };
    expect(validateBattleSetupV3(npcTrait).units[6]?.threatProfile).toBe('mill-slam');
    expect(() => assertBattleState(startBattleV3(npcTrait).state)).not.toThrow();

    const playerTrait = {
      ...base,
      units: base.units.map((unit, index) =>
        index === 0 ? { ...unit, threatProfile: 'mill-slam' as const } : unit,
      ),
    };
    expect(() => validateBattleSetupV3(playerTrait)).toThrow(/invalid V6 threat profile/);
    expect(() =>
      validateBattleSetupV3({
        ...base,
        units: base.units.map((unit, index) =>
          index === 6 ? { ...unit, threatProfile: 'unknown' as never } : unit,
        ),
      }),
    ).toThrow(/invalid V6 threat profile/);
  });

  it('skips incapable V6 fighters without treating them as casualties', () => {
    const setup = twoUnitV6Setup();
    const started = startBattleV3(setup);
    const state = started.state;
    expect(state.initiativeOrder).toEqual([unitId('capable')]);
    expect(state.activation?.unitId).toBe(unitId('capable'));
    expect(state.units.find(({ id }) => id === unitId('incapable'))).toMatchObject({
      health: 1,
      status: 'active',
      stamina: 40,
    });
    expect(state.status).toBe('active');
    expect(state.outcome).toBeUndefined();
    expect(
      previewCombatAttacks(state).find(({ targetId }) => targetId === unitId('incapable'))
        ?.hitChance,
    ).toBe(95);

    const legacyOrdered = {
      ...state,
      initiativeOrder: [unitId('capable'), unitId('incapable')],
    };
    const waited = applyCombatCommand(legacyOrdered, {
      type: 'wait',
      commandId: 'incapable-skipped-within-round' as never,
      actorId: unitId('capable'),
      activationId: state.activation!.id,
    });
    expect(waited.ok).toBe(true);
    if (waited.ok) {
      expect(waited.state.round).toBe(2);
      expect(waited.state.activation?.unitId).toBe(unitId('capable'));
      expect(
        waited.events.some(
          (event) => event.type === 'activation.started' && event.unitId === unitId('incapable'),
        ),
      ).toBe(false);
    }

    const attack = applyCombatCommand(state, {
      type: 'attack',
      commandId: 'incapable-remains-targetable' as never,
      actorId: unitId('capable'),
      activationId: state.activation!.id,
      targetId: unitId('incapable'),
    });
    expect(attack.ok).toBe(true);
    if (attack.ok) {
      expect(attack.state.units.find(({ id }) => id === unitId('incapable'))).toMatchObject({
        health: 0,
        status: 'dead',
      });
      expect(attack.state.outcome).toEqual({
        reason: 'last-side-standing',
        winnerSideId: sideId('side-1'),
      });
    }
  });

  it('passes empty V6 rounds to the existing round-limit outcome and replays it', () => {
    const setup = twoUnitV6Setup(true);
    const started = startBattleV3(setup);
    expect(started.state.status).toBe('resolved');
    expect(started.state.activation).toBeNull();
    expect(started.state.round).toBe(60);
    expect(started.state.outcome).toEqual({ reason: 'round-limit' });
    expect(started.state.initiativeOrder).toEqual([]);
    expect(started.state.units.every((unit) => unit.status === 'active')).toBe(true);
    expect(started.state.units.map(({ health, stamina }) => [health, stamina])).toEqual([
      [1, 40],
      [100, 40],
    ]);
    expect(started.events).toHaveLength(started.state.round + 2);
    expect(started.events.at(-1)).toMatchObject({
      type: 'battle.resolved',
      revision: 0,
      outcome: { reason: 'round-limit' },
    });

    const replay = replayCombat({
      schemaVersion: COMBAT_V3_SCHEMA_VERSION,
      setup,
      commands: [],
    });
    expect(canonicalCombatState(replay.state)).toBe(canonicalCombatState(started.state));
  });

  it('passes remaining empty V6 rounds when the last capable fighter dies', () => {
    const started = startBattleV3(threeSideV6SetupWithOneCapableFighter());
    expect(started.state.activation?.unitId).toBe(unitId('last-capable'));
    const result = applyCombatCommand(started.state, {
      type: 'move',
      commandId: 'last-capable-dies-in-fire' as never,
      actorId: unitId('last-capable'),
      activationId: started.state.activation!.id,
      to: { q: 3, r: 0 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.units.find(({ id }) => id === unitId('last-capable'))).toMatchObject({
        health: 0,
        status: 'dead',
      });
      expect(result.state.units.filter(({ status }) => status === 'active')).toHaveLength(2);
      expect(result.state.status).toBe('resolved');
      expect(result.state.activation).toBeNull();
      expect(result.state.round).toBe(60);
      expect(result.state.outcome).toEqual({ reason: 'round-limit' });
    }
  });

  it('keeps two remaining sides active after the third side is eliminated', () => {
    const initial = startBattleV3(setupV3()).state;
    const state = {
      ...initial,
      units: initial.units.map((unit) =>
        unit.sideId === sideId('side-2') ? { ...unit, status: 'dead' as const, health: 0 } : unit,
      ),
    };
    expect(() => assertBattleState(state)).not.toThrow();
    const waited = applyCombatCommand(state, {
      type: 'wait',
      commandId: 'wait-after-elimination' as never,
      actorId: state.activation!.unitId,
      activationId: state.activation!.id,
    });
    expect(waited.ok).toBe(true);
    if (waited.ok) expect(waited.state.status).toBe('active');
  });

  it('rejects corrupted V6 attribution and capacity in persisted battle state', () => {
    const initial = startBattleV3(setupV3()).state;
    expect(() =>
      assertBattleState({ ...initial, parties: [...initial.parties!, initial.parties![0]!] }),
    ).toThrow(/party IDs must be unique/);
    expect(() =>
      assertBattleState({
        ...initial,
        parties: initial.parties!.map((party) =>
          party.id === 'party-player'
            ? { id: party.id, sideId: party.sideId, kind: 'player' as const }
            : party,
        ),
      }),
    ).toThrow(/must retain a controller/);
    expect(() =>
      assertBattleState({
        ...initial,
        units: initial.units.map((unit, index) =>
          index === 12 ? { ...unit, sideId: sideId('unknown') } : unit,
        ),
      }),
    ).toThrow(/unknown side/);
    expect(() =>
      assertBattleState({
        ...initial,
        units: initial.units.map((unit, index) =>
          index === 6 ? { ...unit, partyId: 'party-player' } : unit,
        ),
      }),
    ).toThrow(/exceeds six/);
    expect(() =>
      assertBattleState({
        ...initial,
        units: initial.units.map((unit, index) =>
          index === 12 ? { ...unit, sideId: sideId('side-0'), partyId: 'party-0-npc' } : unit,
        ),
      }),
    ).toThrow(/must retain 1-12 units/);

    const npcMill = {
      ...initial,
      units: initial.units.map((unit, index) =>
        index === 6 ? { ...unit, threatProfile: 'mill-slam' as const } : unit,
      ),
    };
    expect(() => assertBattleState(npcMill)).not.toThrow();
    expect(() =>
      assertBattleState({
        ...npcMill,
        units: npcMill.units.map((unit, index) =>
          index === 6 ? { ...unit, partyId: 'party-player' } : unit,
        ),
      }),
    ).toThrow(/threat profile requires an NPC party/);
    expect(() =>
      assertBattleState({
        ...initial,
        units: initial.units.map((unit, index) =>
          index === 6 ? { ...unit, threatProfile: 'unknown' as never } : unit,
        ),
      }),
    ).toThrow(/Unknown V6 threat profile/);
  });

  it('previews enemies from both other sides as hostile targets', () => {
    const base = setupV3();
    const setup = {
      ...base,
      map: { ...base.map, hexes: [...base.map.hexes, { q: 0, r: 1 }] },
      units: base.units.map((unit, index) => {
        if (index === 1) return { ...unit, position: { q: 37, r: 0 } };
        if (index === 12) return { ...unit, position: { q: 1, r: 0 } };
        if (index === 24) return { ...unit, position: { q: 0, r: 1 } };
        return unit;
      }),
    };
    const state = startBattleV3(setup).state;
    expect(state.activation?.unitId).toBe(unitId('unit-00'));
    const targets = previewCombatAttacks(state).map(({ targetId }) => targetId);
    expect(targets).toEqual(expect.arrayContaining([unitId('unit-12'), unitId('unit-24')]));
  });

  it('applies V6 terrain and capability rules through accepted command boundaries', () => {
    const base = setupV3();
    const setup: BattleSetupV3 = {
      ...base,
      map: {
        ...base.map,
        tiles: [{ q: 1, r: 0, height: 0, terrain: 'fire' }],
      },
      units: base.units.map((unit, index) => {
        if (index === 1) return { ...unit, position: { q: 37, r: 0 } };
        return unit;
      }),
    };
    const started = startBattleV3(setup).state;
    const actor = started.activation!.unitId;
    const moved = applyCombatCommand(started, {
      type: 'move',
      commandId: 'schema3-fire-step' as never,
      actorId: actor,
      activationId: started.activation!.id,
      to: { q: 1, r: 0 },
    });
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.state.units.find(({ id }) => id === actor)?.health).toBe(95);
      expect(moved.events.some(({ type }) => type === 'unit.fire-damaged')).toBe(true);
    }

    const adjacentSetup: BattleSetupV3 = {
      ...setup,
      map: { ...setup.map, tiles: [] },
      units: setup.units.map((unit, index) =>
        index === 1
          ? { ...unit, position: { q: 37, r: 0 } }
          : index === 12
            ? { ...unit, position: { q: 1, r: 0 } }
            : unit,
      ),
    };
    const adjacent = startBattleV3(adjacentSetup).state;
    const adjacentActor = adjacent.activation!.unitId;
    const unableToAttack = {
      ...adjacent,
      units: adjacent.units.map((unit) =>
        unit.id === adjacentActor
          ? { ...unit, capabilities: { ...unit.capabilities!, attack: false } }
          : unit,
      ),
    };
    const rejected = applyCombatCommand(unableToAttack, {
      type: 'attack',
      commandId: 'schema3-incapable-attack' as never,
      actorId: adjacentActor,
      activationId: adjacent.activation!.id,
      targetId: unitId('unit-12'),
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.state).toBe(unableToAttack);
  });

  it('resolves a free S4 reaction from another side during movement', () => {
    const base = setupV3();
    const mover = base.units[6]!;
    const controller = base.units[12]!;
    const setup: BattleSetupV3 = {
      ...base,
      map: {
        hexes: [
          { q: -1, r: 0 },
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },
          { q: 3, r: 0 },
        ],
        blocked: [],
      },
      sides: [
        { ...base.sides[0]!, retreatHexes: [{ q: -1, r: 0 }] },
        { ...base.sides[1]!, retreatHexes: [{ q: 3, r: 0 }] },
      ],
      parties: [base.parties[1]!, base.parties[2]!],
      units: [
        { ...mover, position: { q: 1, r: 0 }, attributes: { ...mover.attributes, initiative: 20 } },
        {
          ...controller,
          position: { q: 0, r: 0 },
          attributes: { ...controller.attributes, accuracy: 100 },
        },
      ],
    };
    const started = startBattleV3(setup).state;
    expect(started.activation?.unitId).toBe(mover.id);
    const result = applyCombatCommand(started, {
      type: 'move',
      commandId: 'schema3-reaction-step' as never,
      actorId: mover.id,
      activationId: started.activation!.id,
      to: { q: 2, r: 0 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events.some(({ type }) => type === 'unit.damaged')).toBe(true);
      expect(result.state.units.find(({ id }) => id === controller.id)?.reactionSpent).toBe(true);
    }
  });
});
