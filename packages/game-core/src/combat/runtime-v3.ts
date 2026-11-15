import { invariant } from '../primitives.js';
import { canTakeCombatActivation } from './activation-capabilities.js';
import { assertBattleState, effectiveInitiative } from './engine.js';
import { createRandomState } from './random.js';
import { combatRules, compareCombatUnitIds } from './rules.js';
import { validateBattleSetupV3, type BattleSetupV3 } from './setup-v3.js';
import {
  COMBAT_SCHEMA_VERSION,
  type BattleState,
  type CombatTransition,
  type CombatUnitState,
  type CombatSideSetup,
  type CombatEvent,
  type Hex,
} from './types.js';

function copyHex(value: Hex): Hex {
  return { q: value.q, r: value.r };
}

function materializeSides(sides: readonly CombatSideSetup[]): BattleState['sides'] {
  const [first, second, ...remaining] = sides;
  invariant(first !== undefined && second !== undefined, 'V3 battle requires at least two sides');
  const copy = (side: CombatSideSetup): CombatSideSetup => ({
    id: side.id,
    retreatHexes: side.retreatHexes.map(copyHex),
  });
  return [copy(first), copy(second), ...remaining.map(copy)];
}

export function startBattleV3(setup: BattleSetupV3): CombatTransition {
  validateBattleSetupV3(setup);
  const rules = combatRules(setup.rulesetId);
  const units: CombatUnitState[] = setup.units.map(({ initialPools, ...unit }) => ({
    ...unit,
    capabilities: { ...unit.capabilities },
    skillRanks: { ...unit.skillRanks },
    position: copyHex(unit.position),
    attributes: { ...unit.attributes },
    health: initialPools.health,
    armor: initialPools.armor,
    stamina: initialPools.stamina,
    morale: initialPools.morale,
    guarding: false,
    status: 'active',
    wounds: [],
  }));
  const initiativeOrder = units
    .filter((unit) => canTakeCombatActivation(unit, setup.rulesetId))
    .toSorted(
      (left, right) =>
        effectiveInitiative(right, rules) - effectiveInitiative(left, rules) ||
        compareCombatUnitIds(setup.rulesetId, left.id, right.id),
    )
    .map(({ id }) => id);
  const firstId = initiativeOrder[0];
  const sides = materializeSides(setup.sides);
  const parties = setup.parties.map((party) => ({ ...party }));
  const activation =
    firstId === undefined
      ? null
      : {
          id: `1:${firstId}`,
          unitId: firstId,
          remainingActionPoints: rules.actionPointsPerActivation,
        };
  const state: BattleState = {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    battleId: setup.battleId,
    rulesetId: setup.rulesetId,
    seed: setup.seed,
    map: {
      hexes: setup.map.hexes.map(copyHex),
      blocked: setup.map.blocked.map(copyHex),
      ...(setup.map.tiles ? { tiles: setup.map.tiles.map((tile) => ({ ...tile })) } : {}),
    },
    sides,
    parties,
    units: units.map((unit) =>
      firstId !== undefined && unit.id === firstId
        ? {
            ...unit,
            stamina: Math.min(
              unit.attributes.stamina,
              unit.stamina + rules.recovery.staminaPerActivation,
            ),
          }
        : unit,
    ),
    random: createRandomState(setup.seed),
    round: 1,
    initiativeOrder,
    turnIndex: 0,
    activation,
    revision: 0,
    processedCommandIds: [],
    status: 'active',
  };
  const events: CombatEvent[] = [
    {
      type: 'battle.started',
      battleId: setup.battleId,
      revision: 0,
      seed: setup.seed,
      rulesetId: setup.rulesetId,
    },
    { type: 'round.started', battleId: setup.battleId, revision: 0, round: 1, initiativeOrder },
  ];
  if (firstId === undefined) {
    const finalRound = rules.limits.maximumRounds;
    for (let round = 2; round <= finalRound; round += 1)
      events.push({
        type: 'round.started',
        battleId: setup.battleId,
        revision: 0,
        round,
        initiativeOrder,
      });
    const stateAtLimit: BattleState = {
      ...state,
      round: finalRound,
      status: 'resolved',
      outcome: { reason: 'round-limit' },
    };
    events.push({
      type: 'battle.resolved',
      battleId: setup.battleId,
      revision: 0,
      outcome: { reason: 'round-limit' },
    });
    assertBattleState(stateAtLimit);
    return { state: stateAtLimit, events };
  }
  invariant(activation !== null, 'V3 activation must exist for a capable unit');
  events.push({
    type: 'activation.started',
    battleId: setup.battleId,
    revision: 0,
    activationId: activation.id,
    unitId: firstId,
    actionPoints: activation.remainingActionPoints,
  });
  assertBattleState(state);
  return { state, events };
}
