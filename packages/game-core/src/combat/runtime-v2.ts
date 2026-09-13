import { invariant } from '../primitives.js';
import { assertBattleState, effectiveInitiative } from './engine.js';
import { createRandomState } from './random.js';
import { combatRules } from './rules.js';
import { validateBattleSetupV2, type BattleSetupV2, type CombatUnitSetupV2 } from './setup-v2.js';
import { COMBAT_SCHEMA_VERSION } from './types.js';
import type {
  ActivationStartedEvent,
  BattleStartedEvent,
  BattleState,
  CombatActivation,
  CombatTransition,
  CombatUnitState,
  Hex,
  RoundStartedEvent,
  UnitId,
} from './types.js';

function copyHex(value: Hex): Hex {
  return { q: value.q, r: value.r };
}

function materializeUnit(unit: CombatUnitSetupV2): CombatUnitState {
  const { initialPools, ...setup } = unit;
  return {
    ...setup,
    position: copyHex(unit.position),
    attributes: { ...unit.attributes },
    health: initialPools.health,
    armor: initialPools.armor,
    stamina: initialPools.stamina,
    morale: initialPools.morale,
    guarding: false,
    status: 'active',
    wounds: [],
  };
}

function initialOrder(units: readonly CombatUnitState[], setup: BattleSetupV2): readonly UnitId[] {
  const rules = combatRules(setup.rulesetId);
  return units
    .toSorted(
      (left, right) =>
        effectiveInitiative(right, rules) - effectiveInitiative(left, rules) ||
        left.id.localeCompare(right.id),
    )
    .map(({ id }) => id);
}

export function startBattleV2(setup: BattleSetupV2): CombatTransition {
  validateBattleSetupV2(setup);
  const rules = combatRules(setup.rulesetId);
  const initialUnits = setup.units.map(materializeUnit);
  const initiativeOrder = initialOrder(initialUnits, setup);
  const firstId = initiativeOrder[0];
  invariant(firstId !== undefined, 'V2 battle must start with an active unit');

  const units = initialUnits.map((unit) =>
    unit.id === firstId
      ? {
          ...unit,
          stamina: Math.min(
            unit.attributes.stamina,
            unit.stamina + rules.recovery.staminaPerActivation,
          ),
        }
      : unit,
  );
  const activation: CombatActivation = {
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
    },
    sides: [
      { id: setup.sides[0].id, retreatHexes: setup.sides[0].retreatHexes.map(copyHex) },
      { id: setup.sides[1].id, retreatHexes: setup.sides[1].retreatHexes.map(copyHex) },
    ],
    units,
    random: createRandomState(setup.seed),
    round: 1,
    initiativeOrder,
    turnIndex: 0,
    activation,
    revision: 0,
    processedCommandIds: [],
    status: 'active',
  };
  const battleStarted: BattleStartedEvent = {
    type: 'battle.started',
    battleId: setup.battleId,
    revision: 0,
    seed: setup.seed,
    rulesetId: setup.rulesetId,
  };
  const roundStarted: RoundStartedEvent = {
    type: 'round.started',
    battleId: setup.battleId,
    revision: 0,
    round: 1,
    initiativeOrder,
  };
  const activationStarted: ActivationStartedEvent = {
    type: 'activation.started',
    battleId: setup.battleId,
    revision: 0,
    activationId: activation.id,
    unitId: firstId,
    actionPoints: activation.remainingActionPoints,
  };

  assertBattleState(state);
  return { state, events: [battleStarted, roundStarted, activationStarted] };
}
