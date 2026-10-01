import { describe, expect, it } from 'vitest';

import {
  applyCombatCommand,
  battleId,
  canonicalCombatState,
  chooseAiCommand,
  commandId,
  COMBAT_RULES_V1,
  COMBAT_SCHEMA_VERSION,
  COMBAT_V2_SCHEMA_VERSION,
  combatRules,
  compareCombatUnitIds,
  createHexagon,
  M0_COMBAT_RULESET_ID,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  replayCombat,
  sideId,
  startBattle,
  startBattleV2,
  unitId,
  validateBattleSetupV2,
  type BattleSetup,
  type BattleSetupV2,
  type CombatCommand,
  type CombatRulesetId,
  type CombatUnitSetup,
  type CombatUnitSetupV2,
  type VersionedCombatReplay,
} from '../index.js';

const alpha = sideId('alpha');
const beta = sideId('beta');
const mapHexes = createHexagon(3);

function combatUnit(
  id: string,
  sideIdValue: typeof alpha | typeof beta,
  position: { readonly q: number; readonly r: number },
  initiative = 100,
): CombatUnitSetup {
  return {
    id: unitId(id),
    sideId: sideIdValue,
    position,
    weaponId: 'bow',
    attributes: {
      health: 80,
      armor: 20,
      stamina: 80,
      initiative,
      accuracy: 20,
      defense: 10,
      morale: 70,
    },
  };
}

function combatUnitV2(
  id: string,
  sideIdValue: typeof alpha | typeof beta,
  position: { readonly q: number; readonly r: number },
  initiative = 100,
): CombatUnitSetupV2 {
  return {
    ...combatUnit(id, sideIdValue, position, initiative),
    initialPools: { health: 80, armor: 20, stamina: 80, morale: 70 },
  };
}

function sides() {
  return [
    { id: alpha, retreatHexes: mapHexes.filter(({ q }) => q === -3) },
    { id: beta, retreatHexes: mapHexes.filter(({ q }) => q === 3) },
  ] as const;
}

function v1OrderingSetup(): BattleSetup {
  const positionById = new Map([
    ['unit-a', { q: -1, r: 0 }],
    ['Unit-b', { q: 0, r: 0 }],
    ['z', { q: 1, r: 0 }],
    ['ä', { q: 2, r: 0 }],
  ]);
  const ids = ['unit-a', 'Unit-b', 'z', 'ä'];
  return {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    battleId: battleId('order-baseline'),
    rulesetId: M0_COMBAT_RULESET_ID,
    seed: 41,
    map: { hexes: mapHexes, blocked: [] },
    sides: sides(),
    units: ids.map((id, index) =>
      combatUnit(id, index % 2 === 0 ? alpha : beta, positionById.get(id)!),
    ),
  };
}

function bridgeSetup(
  rulesetId: typeof M1_DOMAIN_BRIDGE_RULESET_ID | typeof M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  ids = ['é', 'e\u0301'],
): BattleSetupV2 {
  const positions = new Map([
    ['é', { q: -1, r: 0 }],
    ['e\u0301', { q: 1, r: 0 }],
  ]);
  return {
    schemaVersion: COMBAT_V2_SCHEMA_VERSION,
    battleId: battleId('unicode-v1'),
    rulesetId,
    seed: 43,
    map: { hexes: mapHexes, blocked: [] },
    sides: sides(),
    units: ids.map((id, index) => combatUnitV2(id, index === 0 ? alpha : beta, positions.get(id)!)),
  };
}

function waitCommandsForM0(): readonly CombatCommand[] {
  return [
    { type: 'wait', commandId: commandId('legacy:0'), activationId: '1:ä', actorId: unitId('ä') },
    {
      type: 'wait',
      commandId: commandId('legacy:1'),
      activationId: '1:unit-a',
      actorId: unitId('unit-a'),
    },
    {
      type: 'wait',
      commandId: commandId('legacy:2'),
      activationId: '1:Unit-b',
      actorId: unitId('Unit-b'),
    },
    { type: 'wait', commandId: commandId('legacy:3'), activationId: '1:z', actorId: unitId('z') },
  ];
}

function canonicalUnitBytes(value: string): string {
  const unitMarker = '"units":';
  const unitStart = value.indexOf(unitMarker) + unitMarker.length;
  const unitEnd = value.indexOf(',"random":', unitStart);
  if (unitStart < unitMarker.length || unitEnd < 0) {
    throw new Error('Canonical state must contain units before random state');
  }
  return value.slice(unitStart, unitEnd);
}

function expectedCanonicalUnits(
  state: ReturnType<typeof startBattle>['state'],
  ids: readonly string[],
): string {
  return JSON.stringify(
    ids.map((id) => {
      const unit = state.units.find((candidate) => candidate.id === id);
      if (unit === undefined) throw new Error(`Missing expected unit ${id}`);
      return {
        id: unit.id,
        sideId: unit.sideId,
        position: unit.position,
        weaponId: unit.weaponId,
        attributes: unit.attributes,
        health: unit.health,
        armor: unit.armor,
        stamina: unit.stamina,
        morale: unit.morale,
        guarding: unit.guarding,
        status: unit.status,
        wounds: unit.wounds,
      };
    }),
  );
}

function tieAiSetup(
  rulesetId: typeof M1_DOMAIN_BRIDGE_RULESET_ID | typeof M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  movement = false,
): BattleSetupV2 {
  const radius = movement ? 6 : 2;
  const hexes = createHexagon(radius);
  const positions = movement
    ? [
        combatUnitV2('actor', alpha, { q: 0, r: 0 }, 200),
        combatUnitV2('friend', alpha, { q: 0, r: 2 }),
        combatUnitV2('z-target', beta, { q: 5, r: 0 }),
        combatUnitV2('ä-target', beta, { q: -5, r: 0 }),
      ]
    : [
        combatUnitV2('actor', alpha, { q: 0, r: 0 }, 200),
        combatUnitV2('friend', alpha, { q: 0, r: 1 }),
        combatUnitV2('z-target', beta, { q: 1, r: 0 }),
        combatUnitV2('ä-target', beta, { q: -1, r: 0 }),
      ];
  return {
    schemaVersion: COMBAT_V2_SCHEMA_VERSION,
    battleId: battleId(movement ? 'ai-move' : 'ai-target'),
    rulesetId,
    seed: 47,
    map: { hexes, blocked: [] },
    sides: [
      { id: alpha, retreatHexes: hexes.filter(({ q }) => q === -radius) },
      { id: beta, retreatHexes: hexes.filter(({ q }) => q === radius) },
    ],
    units: positions,
  };
}

function m0TieAiSetup(movement = false): BattleSetup {
  const radius = movement ? 6 : 2;
  const hexes = createHexagon(radius);
  const units = movement
    ? [
        combatUnit('actor', alpha, { q: 0, r: 0 }, 200),
        combatUnit('friend', alpha, { q: 0, r: 2 }),
        combatUnit('z-target', beta, { q: 5, r: 0 }),
        combatUnit('ä-target', beta, { q: -5, r: 0 }),
      ]
    : [
        combatUnit('actor', alpha, { q: 0, r: 0 }, 200),
        combatUnit('friend', alpha, { q: 0, r: 1 }),
        combatUnit('z-target', beta, { q: 1, r: 0 }),
        combatUnit('ä-target', beta, { q: -1, r: 0 }),
      ];
  return {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    battleId: battleId(movement ? 'm0-ai-move' : 'm0-ai-target'),
    rulesetId: M0_COMBAT_RULESET_ID,
    seed: 47,
    map: { hexes, blocked: [] },
    sides: [
      { id: alpha, retreatHexes: hexes.filter(({ q }) => q === -radius) },
      { id: beta, retreatHexes: hexes.filter(({ q }) => q === radius) },
    ],
    units,
  };
}

describe('versioned combat unit ordering', () => {
  it('preserves M0 mixed-case order, round events, RNG, and canonical bytes', () => {
    const setup = v1OrderingSetup();
    const replay = {
      schemaVersion: COMBAT_SCHEMA_VERSION,
      setup,
      commands: waitCommandsForM0(),
    } as const;
    const result = replayCombat(replay);

    expect(startBattle(setup).state.initiativeOrder).toEqual(['ä', 'unit-a', 'Unit-b', 'z']);
    expect(result.state.round).toBe(2);
    expect(result.state.activation).toMatchObject({ id: '2:ä', unitId: 'ä' });
    expect(result.events.slice(-3)).toMatchObject([
      { type: 'activation.ended', unitId: 'z' },
      { type: 'round.started', round: 2, initiativeOrder: ['ä', 'unit-a', 'Unit-b', 'z'] },
      { type: 'activation.started', unitId: 'ä' },
    ]);
    expect(result.state.random).toEqual({ algorithm: 'xorshift32-v1', value: 41, draws: 0 });
    // Captured on Node v24.20.0 / ICU 78.3 / en-US before editing; full canonical SHA-256 was
    // c2196fdd8965326fba4362b8100cc202c2271bd3d74e725bd8ed22f40a3fa762.
    expect(canonicalUnitBytes(canonicalCombatState(result.state))).toBe(
      expectedCanonicalUnits(result.state, ['ä', 'unit-a', 'Unit-b', 'z']),
    );
  });

  it('preserves bridge-v1 composed/decomposed collation and canonical bytes', () => {
    const setup = bridgeSetup(M1_DOMAIN_BRIDGE_RULESET_ID);
    const replay = { schemaVersion: COMBAT_V2_SCHEMA_VERSION, setup, commands: [] } as const;
    const roundTripped = JSON.parse(JSON.stringify(replay)) as typeof replay;
    const result = replayCombat(roundTripped);

    expect('é'.localeCompare('e\u0301')).toBe(0);
    expect(result.state.initiativeOrder).toEqual(['é', 'e\u0301']);
    expect(result.state.units.map(({ id }) => id)).toEqual(['é', 'e\u0301']);
    expect(result.state.rulesetId).toBe(M1_DOMAIN_BRIDGE_RULESET_ID);
    // Captured on Node v24.20.0 / ICU 78.3 / en-US before editing; full canonical SHA-256 was
    // 22c9718845cf23c1963c196e30cf3842514bc9ee18152e372ddca93f8ecf71e1.
    expect(canonicalUnitBytes(canonicalCombatState(result.state))).toBe(
      expectedCanonicalUnits(result.state, ['é', 'e\u0301']),
    );
  });

  it('uses UTF-16 code-unit order for bridge-v2 initial and later rounds across input permutations', () => {
    const idOrder = ['unit-a', 'Unit-b', 'z', 'ä'];
    const unitById = new Map([
      ['unit-a', combatUnitV2('unit-a', alpha, { q: -1, r: 0 })],
      ['Unit-b', combatUnitV2('Unit-b', beta, { q: 0, r: 0 })],
      ['z', combatUnitV2('z', alpha, { q: 1, r: 0 })],
      ['ä', combatUnitV2('ä', beta, { q: 2, r: 0 })],
    ]);
    const expected = ['Unit-b', 'unit-a', 'z', 'ä'];
    const canonicalOutputs: string[] = [];

    for (const ids of [idOrder, [...idOrder].reverse()]) {
      const base = bridgeSetup(M1_DOMAIN_BRIDGE_V2_RULESET_ID, ['é', 'e\u0301']);
      const setup: BattleSetupV2 = {
        ...base,
        battleId: battleId('bridge-v2-order'),
        units: ids.map((id) => unitById.get(id)!),
      };
      const started = startBattleV2(setup);
      expect(started.state.initiativeOrder).toEqual(expected);
      expect(started.state.activation?.unitId).toBe('Unit-b');
      canonicalOutputs.push(canonicalCombatState(started.state));

      let state = started.state;
      for (let index = 0; index < expected.length; index += 1) {
        const activation = state.activation;
        expect(activation).not.toBeNull();
        if (activation === null) throw new Error('Expected an active V2 unit');
        const result = applyCombatCommand(state, {
          type: 'wait',
          commandId: commandId(`bridge-v2:${index}`),
          activationId: activation.id,
          actorId: activation.unitId,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error('Expected wait command to advance the round');
        state = result.state;
      }

      expect(state.round).toBe(2);
      expect(state.initiativeOrder).toEqual(expected);
      expect(state.activation?.unitId).toBe('Unit-b');
    }

    expect(canonicalOutputs[0]).toBe(canonicalOutputs[1]);
  });

  it('keeps legacy AI target and equal-path choices while bridge-v2 uses code-unit ties', () => {
    const m0Attack = chooseAiCommand(startBattle(m0TieAiSetup()).state);
    const m0Movement = chooseAiCommand(startBattle(m0TieAiSetup(true)).state);
    expect(m0Attack).toMatchObject({ type: 'attack', targetId: 'ä-target' });
    expect(m0Movement).toMatchObject({
      type: 'move',
      commandId: 'ai:1:actor:0:move:ä-target',
      to: { q: -1, r: 0 },
    });

    for (const rulesetId of [
      M1_DOMAIN_BRIDGE_RULESET_ID,
      M1_DOMAIN_BRIDGE_V2_RULESET_ID,
    ] as const) {
      const attack = chooseAiCommand(startBattleV2(tieAiSetup(rulesetId)).state);
      const movement = chooseAiCommand(startBattleV2(tieAiSetup(rulesetId, true)).state);
      const targetId = rulesetId === M1_DOMAIN_BRIDGE_RULESET_ID ? 'ä-target' : 'z-target';
      const destination =
        rulesetId === M1_DOMAIN_BRIDGE_RULESET_ID ? { q: -1, r: 0 } : { q: 1, r: 0 };

      expect(attack).toMatchObject({ type: 'attack', targetId });
      expect(movement).toMatchObject({
        type: 'move',
        commandId: `ai:1:actor:0:move:${targetId}`,
        to: destination,
      });
    }
  });

  it('round-trips both bridge identities and rejects unknown or V1 bridge setup identities', () => {
    for (const rulesetId of [
      M1_DOMAIN_BRIDGE_RULESET_ID,
      M1_DOMAIN_BRIDGE_V2_RULESET_ID,
    ] as const) {
      const setup = bridgeSetup(rulesetId);
      const replay = { schemaVersion: COMBAT_V2_SCHEMA_VERSION, setup, commands: [] } as const;
      const parsed = JSON.parse(JSON.stringify(replay)) as typeof replay;

      expect(parsed).toEqual(replay);
      expect(replayCombat(parsed).state.rulesetId).toBe(rulesetId);
      expect(validateBattleSetupV2(parsed.setup)).toBe(parsed.setup);
    }

    const v1Setup = v1OrderingSetup();
    expect(() =>
      startBattle({ ...v1Setup, rulesetId: M1_DOMAIN_BRIDGE_RULESET_ID } as unknown as BattleSetup),
    ).toThrow(/Battle setup ruleset must match/);
    expect(() =>
      startBattle({
        ...v1Setup,
        rulesetId: M1_DOMAIN_BRIDGE_V2_RULESET_ID,
      } as unknown as BattleSetup),
    ).toThrow(/Battle setup ruleset must match/);
    expect(() =>
      validateBattleSetupV2({
        ...bridgeSetup(M1_DOMAIN_BRIDGE_V2_RULESET_ID),
        rulesetId: 'm1-domain-bridge-v3',
      } as unknown as BattleSetupV2),
    ).toThrow(/V2 battle setup ruleset must be/);
    expect(() => combatRules('m1-domain-bridge-v3' as CombatRulesetId)).toThrow(
      /Unknown combat ruleset/,
    );
    expect(() => combatRules(undefined as unknown as CombatRulesetId)).toThrow(
      /Unknown combat ruleset/,
    );
    expect(() =>
      compareCombatUnitIds('m1-domain-bridge-v3' as CombatRulesetId, unitId('a'), unitId('b')),
    ).toThrow(/Unexpected value/);
    expect(COMBAT_RULES_V1.id).toBe(M0_COMBAT_RULESET_ID);
  });
});
