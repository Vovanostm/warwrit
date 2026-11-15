import { describe, expect, it } from 'vitest';
import { battleId, sideId, unitId } from './types.js';
import { applyCombatCommand, assertBattleState } from './engine.js';
import { canonicalCombatState, replayCombat } from './replay.js';
import { previewCombatAttacks } from './sprite-prototype.js';
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
    const replay = { schemaVersion: COMBAT_V3_SCHEMA_VERSION, setup, commands: [] } as const;
    expect(canonicalCombatState(replayCombat(replay).state)).toBe(
      canonicalCombatState(started.state),
    );
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
});
