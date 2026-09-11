import { describe, expect, it } from 'vitest';

import {
  battleId,
  COMBAT_RULES_V1,
  COMBAT_V2_SCHEMA_VERSION,
  createHexagon,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  sideId,
  startBattle,
  unitId,
  validateBattleSetupV2,
  type BattleSetup,
  type BattleSetupV2,
  type CombatUnitSetupV2,
} from '../index.js';

function setupV2(): BattleSetupV2 {
  const hexes = createHexagon(2);
  const alpha = sideId('alpha');
  const beta = sideId('beta');
  return {
    schemaVersion: COMBAT_V2_SCHEMA_VERSION,
    battleId: battleId('g01-v2'),
    rulesetId: M1_DOMAIN_BRIDGE_RULESET_ID,
    seed: 17,
    map: { hexes, blocked: [] },
    sides: [
      { id: alpha, retreatHexes: hexes.filter(({ q }) => q === -2) },
      { id: beta, retreatHexes: hexes.filter(({ q }) => q === 2) },
    ],
    units: [
      {
        id: unitId('alpha-1'),
        sideId: alpha,
        position: { q: -1, r: 0 },
        weaponId: 'sword-shield',
        attributes: {
          health: 80,
          armor: 30,
          stamina: 80,
          initiative: 100,
          accuracy: 20,
          defense: 10,
          morale: 70,
        },
        initialPools: { health: 53, armor: 11, stamina: 29, morale: 42 },
      },
      {
        id: unitId('beta-1'),
        sideId: beta,
        position: { q: 1, r: 0 },
        weaponId: 'raider',
        attributes: {
          health: 90,
          armor: 35,
          stamina: 90,
          initiative: 80,
          accuracy: 18,
          defense: 8,
          morale: 75,
        },
        initialPools: { health: 90, armor: 0, stamina: 0, morale: 75 },
      },
    ],
  };
}

function replaceFirstUnit(
  setup: BattleSetupV2,
  update: (unit: CombatUnitSetupV2) => CombatUnitSetupV2,
): BattleSetupV2 {
  const first = setup.units[0];
  if (first === undefined) {
    throw new Error('Expected a V2 fixture unit');
  }
  return { ...setup, units: [update(first), ...setup.units.slice(1)] };
}

describe('combat V2 setup contract', () => {
  it('accepts two real sides without padding and preserves explicit current pools', () => {
    const setup = setupV2();
    const accepted = validateBattleSetupV2(setup);

    expect(accepted).toBe(setup);
    expect(accepted.units).toHaveLength(2);
    expect(accepted.units[0]?.initialPools).toEqual({
      health: 53,
      armor: 11,
      stamina: 29,
      morale: 42,
    });
  });

  it('rejects incomplete or out-of-range current pools without mutating the setup', () => {
    const complete = setupV2();
    const withoutPools = replaceFirstUnit(
      complete,
      (unit) => ({ ...unit, initialPools: undefined }) as unknown as CombatUnitSetupV2,
    );
    const missingHealth = replaceFirstUnit(
      complete,
      (unit) =>
        ({
          ...unit,
          initialPools: { ...unit.initialPools, health: undefined },
        }) as unknown as CombatUnitSetupV2,
    );
    const negativeStamina = replaceFirstUnit(complete, (unit) => ({
      ...unit,
      initialPools: { ...unit.initialPools, stamina: -1 },
    }));
    const overMaximums = [
      replaceFirstUnit(complete, (unit) => ({
        ...unit,
        initialPools: { ...unit.initialPools, health: unit.attributes.health + 1 },
      })),
      replaceFirstUnit(complete, (unit) => ({
        ...unit,
        initialPools: { ...unit.initialPools, armor: unit.attributes.armor + 1 },
      })),
      replaceFirstUnit(complete, (unit) => ({
        ...unit,
        initialPools: { ...unit.initialPools, stamina: unit.attributes.stamina + 1 },
      })),
      replaceFirstUnit(complete, (unit) => ({
        ...unit,
        initialPools: { ...unit.initialPools, morale: unit.attributes.morale + 1 },
      })),
    ];

    for (const malformed of [withoutPools, missingHealth, negativeStamina, ...overMaximums]) {
      const before = JSON.stringify(malformed);
      expect(() => validateBattleSetupV2(malformed)).toThrow();
      expect(JSON.stringify(malformed)).toBe(before);
    }
  });

  it('requires 2-12 real units and at least one participant on each side', () => {
    const two = setupV2();
    expect(() => validateBattleSetupV2(two)).not.toThrow();

    const one = { ...two, units: two.units.slice(0, 1) } as BattleSetupV2;
    expect(() => validateBattleSetupV2(one)).toThrow(/2-12 real units/);

    const first = two.units[0];
    const second = two.units[1];
    if (first === undefined || second === undefined) {
      throw new Error('Expected two V2 fixture units');
    }
    const singleSide = {
      ...two,
      units: [first, { ...second, sideId: first.sideId }],
    } as BattleSetupV2;
    expect(() => validateBattleSetupV2(singleSide)).toThrow(/must have at least one unit/);

    const thirteen = {
      ...two,
      units: Array.from({ length: 13 }, (_, index) => ({
        ...first,
        id: unitId(`extra-${index}`),
      })),
    } as BattleSetupV2;
    expect(() => validateBattleSetupV2(thirteen)).toThrow(/2-12 real units/);
  });

  it('fails unsupported V2 loadouts closed instead of inventing a weapon profile', () => {
    const malformed = replaceFirstUnit(setupV2(), (unit) => ({
      ...unit,
      weaponId: 'unarmed' as CombatUnitSetupV2['weaponId'],
    }));

    expect(() => validateBattleSetupV2(malformed)).toThrow(/Unsupported V2 weapon profile/);
  });

  it('keeps the released V1 minimum unchanged', () => {
    const v2 = setupV2();
    const legacy: BattleSetup = {
      schemaVersion: 1,
      battleId: battleId('g01-v1-two-units'),
      rulesetId: COMBAT_RULES_V1.id,
      seed: v2.seed,
      map: v2.map,
      sides: v2.sides,
      units: v2.units.map((unit) => ({
        id: unit.id,
        sideId: unit.sideId,
        position: unit.position,
        weaponId: unit.weaponId,
        attributes: unit.attributes,
      })),
    };

    expect(() => startBattle(legacy)).toThrow(/M0 battle must contain 4-12 units/);
    expect(() => validateBattleSetupV2(v2)).not.toThrow();
  });
});
