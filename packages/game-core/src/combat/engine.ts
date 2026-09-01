import { assertNever, invariant } from '../primitives.js';
import { findPath, hexDistance, hexEquals, hexKey } from './hex.js';
import { createRandomState, drawRandomInt } from './random.js';
import { combatRules, type CombatRules, weaponProfile } from './rules.js';
import { COMBAT_SCHEMA_VERSION } from './types.js';
import type {
  ActivationEndedEvent,
  ActivationStartedEvent,
  AttackCommand,
  AttackResolvedEvent,
  BattleOutcome,
  BattleResolvedEvent,
  BattleSetup,
  BattleStartedEvent,
  BattleState,
  CombatActivation,
  CombatCommand,
  CombatCommandResult,
  CombatEvent,
  CombatFailure,
  CombatMap,
  CombatSideSetup,
  CombatTransition,
  CombatUnitSetup,
  CombatUnitState,
  DefendCommand,
  Hex,
  MoraleChangedEvent,
  MoveCommand,
  RetreatCommand,
  RoundStartedEvent,
  SideId,
  UnitDamagedEvent,
  UnitDefendedEvent,
  UnitDiedEvent,
  UnitId,
  UnitMovedEvent,
  UnitRetreatedEvent,
  UnitWoundedEvent,
  WaitCommand,
  WoundSeverity,
} from './types.js';

function failure(
  state: BattleState,
  code: CombatFailure['code'],
  message: string,
): CombatCommandResult {
  return {
    ok: false,
    state,
    error: { code, message },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function copyHex(value: Hex): Hex {
  return { q: value.q, r: value.r };
}

function copyMap(map: CombatMap): CombatMap {
  return {
    hexes: map.hexes.map(copyHex),
    blocked: map.blocked.map(copyHex),
  };
}

function copySide(side: CombatSideSetup): CombatSideSetup {
  return {
    id: side.id,
    retreatHexes: side.retreatHexes.map(copyHex),
  };
}

function unitFromSetup(unit: CombatUnitSetup): CombatUnitState {
  return {
    ...unit,
    position: copyHex(unit.position),
    attributes: { ...unit.attributes },
    health: unit.attributes.health,
    armor: unit.attributes.armor,
    stamina: unit.attributes.stamina,
    morale: unit.attributes.morale,
    guarding: false,
    status: 'active',
    wounds: [],
  };
}

function validateInteger(value: number, name: string, minimum = 0): void {
  invariant(
    Number.isSafeInteger(value) && value >= minimum,
    `${name} must be an integer >= ${minimum}`,
  );
}

function validateHex(value: Hex, name: string): void {
  invariant(
    Number.isSafeInteger(value.q) && Number.isSafeInteger(value.r),
    `${name} coordinates must be safe integers`,
  );
}

function validateSetup(setup: BattleSetup, rules: CombatRules): void {
  invariant(
    setup.schemaVersion === COMBAT_SCHEMA_VERSION,
    `Battle setup schemaVersion must be ${COMBAT_SCHEMA_VERSION}`,
  );
  invariant(setup.battleId.length > 0, 'Battle id must not be empty');
  invariant(Number.isSafeInteger(setup.seed), 'Battle seed must be a safe integer');
  invariant(setup.rulesetId === rules.id, 'Battle setup ruleset must match the selected rules');
  invariant(setup.sides.length === rules.sides, `M0 requires exactly ${rules.sides} sides`);
  invariant(
    setup.units.length >= rules.units.minimum && setup.units.length <= rules.units.maximum,
    `M0 battle must contain ${rules.units.minimum}-${rules.units.maximum} units`,
  );

  const sideIds = new Set<string>();
  const mapKeys = new Set(setup.map.hexes.map(hexKey));
  const blockedKeys = new Set(setup.map.blocked.map(hexKey));
  invariant(mapKeys.size === setup.map.hexes.length, 'Battle map hexes must be unique');
  invariant(
    blockedKeys.size === setup.map.blocked.length,
    'Blocked battle map hexes must be unique',
  );
  invariant(setup.map.hexes.length > 0, 'Battle map must contain at least one hex');
  setup.map.hexes.forEach((value, index) => validateHex(value, `map.hexes[${index}]`));
  setup.map.blocked.forEach((value, index) => validateHex(value, `map.blocked[${index}]`));

  for (const blocked of blockedKeys) {
    invariant(mapKeys.has(blocked), `Blocked hex ${blocked} must exist in the battle map`);
  }

  for (const side of setup.sides) {
    invariant(side.id.length > 0, 'Side id must not be empty');
    invariant(!sideIds.has(side.id), `Duplicate side id: ${side.id}`);
    sideIds.add(side.id);
    invariant(side.retreatHexes.length > 0, `Side ${side.id} must have a retreat edge`);
    for (const [index, retreatHex] of side.retreatHexes.entries()) {
      validateHex(retreatHex, `${side.id}.retreatHexes[${index}]`);
      const key = hexKey(retreatHex);
      invariant(mapKeys.has(key) && !blockedKeys.has(key), `Invalid retreat hex ${key}`);
    }
  }

  const unitIds = new Set<string>();
  const occupied = new Set<string>();
  const unitsPerSide = new Map<string, number>();
  for (const unit of setup.units) {
    invariant(unit.id.length > 0, 'Unit id must not be empty');
    invariant(!unitIds.has(unit.id), `Duplicate unit id: ${unit.id}`);
    unitIds.add(unit.id);
    invariant(sideIds.has(unit.sideId), `Unit ${unit.id} references unknown side ${unit.sideId}`);
    unitsPerSide.set(unit.sideId, (unitsPerSide.get(unit.sideId) ?? 0) + 1);

    validateHex(unit.position, `${unit.id}.position`);
    const positionKey = hexKey(unit.position);
    invariant(mapKeys.has(positionKey), `Unit ${unit.id} must start on the battle map`);
    invariant(!blockedKeys.has(positionKey), `Unit ${unit.id} must not start on blocked terrain`);
    invariant(!occupied.has(positionKey), `Multiple units occupy ${positionKey}`);
    occupied.add(positionKey);

    validateInteger(unit.attributes.health, `${unit.id}.health`, 1);
    validateInteger(unit.attributes.armor, `${unit.id}.armor`);
    validateInteger(unit.attributes.stamina, `${unit.id}.stamina`, 1);
    validateInteger(unit.attributes.initiative, `${unit.id}.initiative`, 1);
    validateInteger(unit.attributes.accuracy, `${unit.id}.accuracy`);
    validateInteger(unit.attributes.defense, `${unit.id}.defense`);
    validateInteger(unit.attributes.morale, `${unit.id}.morale`, 1);
    invariant(
      unit.attributes.morale <= rules.morale.maximum,
      `${unit.id}.morale must be <= ${rules.morale.maximum}`,
    );
    weaponProfile(rules, unit.weaponId);
  }

  for (const side of setup.sides) {
    invariant((unitsPerSide.get(side.id) ?? 0) > 0, `Side ${side.id} must have at least one unit`);
  }
}

function woundPenalty(unit: CombatUnitState, rules: CombatRules): number {
  return unit.wounds.reduce(
    (total, wound) =>
      total +
      (wound.severity === 'severe'
        ? rules.initiative.severeWoundPenalty
        : rules.initiative.minorWoundPenalty),
    0,
  );
}

function isLowStamina(unit: CombatUnitState, rules: CombatRules): boolean {
  return unit.stamina * 100 <= unit.attributes.stamina * rules.hit.lowStaminaThresholdPercent;
}

function isShaken(unit: CombatUnitState, rules: CombatRules): boolean {
  return unit.morale <= rules.hit.shakenMoraleThreshold;
}

export function effectiveInitiative(unit: CombatUnitState, rules: CombatRules): number {
  const fatigue = unit.attributes.stamina - unit.stamina;
  return Math.max(
    0,
    unit.attributes.initiative -
      Math.floor(fatigue / rules.initiative.fatigueDivisor) -
      woundPenalty(unit, rules),
  );
}

export function effectiveAccuracy(unit: CombatUnitState, rules: CombatRules): number {
  return Math.max(
    0,
    unit.attributes.accuracy -
      woundPenalty(unit, rules) -
      (isLowStamina(unit, rules) ? rules.hit.lowStaminaPenalty : 0) -
      (isShaken(unit, rules) ? rules.hit.shakenPenalty : 0),
  );
}

export function effectiveDefense(unit: CombatUnitState, rules: CombatRules): number {
  return Math.max(
    0,
    unit.attributes.defense +
      weaponProfile(rules, unit.weaponId).defenseModifier +
      (unit.guarding ? rules.defend.defenseBonus : 0) -
      woundPenalty(unit, rules) -
      (isShaken(unit, rules) ? rules.hit.shakenPenalty : 0),
  );
}

function orderInitiative(units: readonly CombatUnitState[], rules: CombatRules): readonly UnitId[] {
  return units
    .filter(({ status }) => status === 'active')
    .toSorted(
      (left, right) =>
        effectiveInitiative(right, rules) - effectiveInitiative(left, rules) ||
        left.id.localeCompare(right.id),
    )
    .map(({ id }) => id);
}

function unitById(state: BattleState, id: UnitId): CombatUnitState | undefined {
  return state.units.find((unit) => unit.id === id);
}

function sideById(state: BattleState, id: SideId): CombatSideSetup | undefined {
  return state.sides.find((side) => side.id === id);
}

function replaceUnit(
  units: readonly CombatUnitState[],
  unitId: UnitId,
  replacement: CombatUnitState,
): readonly CombatUnitState[] {
  return units.map((unit) => (unit.id === unitId ? replacement : unit));
}

function replaceUnits(
  units: readonly CombatUnitState[],
  replacements: ReadonlyMap<UnitId, CombatUnitState>,
): readonly CombatUnitState[] {
  return units.map((unit) => replacements.get(unit.id) ?? unit);
}

function activeSideIds(units: readonly CombatUnitState[]): readonly SideId[] {
  return [
    ...new Set(units.filter(({ status }) => status === 'active').map(({ sideId }) => sideId)),
  ];
}

function resolvedOutcome(units: readonly CombatUnitState[]): BattleOutcome | undefined {
  const sides = activeSideIds(units);
  if (sides.length > 1) {
    return undefined;
  }
  return {
    reason: 'last-side-standing',
    ...(sides[0] === undefined ? {} : { winnerSideId: sides[0] }),
  };
}

function startActivation(state: BattleState, unitId: UnitId, rules: CombatRules): CombatTransition {
  const unit = unitById(state, unitId);
  invariant(unit?.status === 'active', `Cannot activate unavailable unit ${unitId}`);
  const refreshed: CombatUnitState = {
    ...unit,
    guarding: false,
    stamina: Math.min(unit.attributes.stamina, unit.stamina + rules.recovery.staminaPerActivation),
  };
  const activation: CombatActivation = {
    id: `${state.round}:${unitId}`,
    unitId,
    remainingActionPoints: rules.actionPointsPerActivation,
  };
  const nextState: BattleState = {
    ...state,
    units: replaceUnit(state.units, unitId, refreshed),
    activation,
  };
  const event: ActivationStartedEvent = {
    type: 'activation.started',
    battleId: state.battleId,
    revision: state.revision,
    activationId: activation.id,
    unitId,
    actionPoints: activation.remainingActionPoints,
  };
  return { state: nextState, events: [event] };
}

function resolveBattle(
  state: BattleState,
  outcome: BattleOutcome,
  priorEvents: readonly CombatEvent[],
): CombatTransition {
  const events = [...priorEvents];
  if (state.activation !== null) {
    const ended: ActivationEndedEvent = {
      type: 'activation.ended',
      battleId: state.battleId,
      revision: state.revision,
      activationId: state.activation.id,
      unitId: state.activation.unitId,
      reason: 'battle-resolved',
    };
    events.push(ended);
  }
  const nextState: BattleState = {
    ...state,
    activation: null,
    status: 'resolved',
    outcome,
  };
  const resolved: BattleResolvedEvent = {
    type: 'battle.resolved',
    battleId: state.battleId,
    revision: state.revision,
    outcome,
  };
  events.push(resolved);
  return { state: nextState, events };
}

function advanceActivation(
  state: BattleState,
  rules: CombatRules,
  priorEvents: readonly CombatEvent[],
): CombatTransition {
  invariant(state.activation !== null, 'Active battle must have an activation');
  const ended: ActivationEndedEvent = {
    type: 'activation.ended',
    battleId: state.battleId,
    revision: state.revision,
    activationId: state.activation.id,
    unitId: state.activation.unitId,
    reason: 'command',
  };
  const events: CombatEvent[] = [...priorEvents, ended];

  const outcome = resolvedOutcome(state.units);
  if (outcome !== undefined) {
    return resolveBattle({ ...state, activation: null }, outcome, events);
  }

  let round = state.round;
  let order = state.initiativeOrder;
  let turnIndex = state.turnIndex + 1;

  while (turnIndex < order.length) {
    const nextId = order[turnIndex];
    invariant(nextId !== undefined, 'Initiative order index must reference a unit');
    if (unitById(state, nextId)?.status === 'active') {
      const started = startActivation(
        { ...state, activation: null, turnIndex, initiativeOrder: order },
        nextId,
        rules,
      );
      return { state: started.state, events: [...events, ...started.events] };
    }
    turnIndex += 1;
  }

  if (round >= rules.limits.maximumRounds) {
    return resolveBattle({ ...state, activation: null }, { reason: 'round-limit' }, events);
  }

  round += 1;
  order = orderInitiative(state.units, rules);
  turnIndex = 0;
  const roundState: BattleState = {
    ...state,
    activation: null,
    round,
    initiativeOrder: order,
    turnIndex,
  };
  const roundStarted: RoundStartedEvent = {
    type: 'round.started',
    battleId: state.battleId,
    revision: state.revision,
    round,
    initiativeOrder: order,
  };
  events.push(roundStarted);
  const nextId = order[0];
  invariant(nextId !== undefined, 'An active battle must have a unit to activate');
  const started = startActivation(roundState, nextId, rules);
  return { state: started.state, events: [...events, ...started.events] };
}

export function startBattle(setup: BattleSetup): CombatTransition {
  const rules = combatRules(setup.rulesetId);
  validateSetup(setup, rules);
  const units = setup.units.map(unitFromSetup);
  const initiativeOrder = orderInitiative(units, rules);
  const baseState: BattleState = {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    battleId: setup.battleId,
    rulesetId: setup.rulesetId,
    seed: setup.seed,
    map: copyMap(setup.map),
    sides: [copySide(setup.sides[0]), copySide(setup.sides[1])],
    units,
    random: createRandomState(setup.seed),
    round: 1,
    initiativeOrder,
    turnIndex: 0,
    activation: null,
    revision: 0,
    processedCommandIds: [],
    status: 'active',
  };
  const firstId = initiativeOrder[0];
  invariant(firstId !== undefined, 'Battle must start with an active unit');
  const started = startActivation(baseState, firstId, rules);
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
  assertBattleState(started.state);
  return {
    state: started.state,
    events: [battleStarted, roundStarted, ...started.events],
  };
}

function validateCommandBase(
  state: BattleState,
  command: CombatCommand,
): CombatFailure | undefined {
  if (state.status !== 'active' || state.activation === null) {
    return { code: 'BATTLE_TERMINAL', message: 'Battle is already resolved' };
  }
  if (state.processedCommandIds.includes(command.commandId)) {
    return {
      code: 'DUPLICATE_COMMAND',
      message: `Command ${command.commandId} was already applied`,
    };
  }
  const actor = unitById(state, command.actorId);
  if (actor === undefined) {
    return { code: 'UNIT_NOT_FOUND', message: `Actor ${command.actorId} does not exist` };
  }
  if (state.activation.unitId !== command.actorId || actor.status !== 'active') {
    return { code: 'NOT_ACTIVE_UNIT', message: `Unit ${command.actorId} is not active` };
  }
  if (state.activation.id !== command.activationId) {
    return {
      code: 'STALE_ACTIVATION',
      message: `Activation ${command.activationId} is not current`,
    };
  }
  return undefined;
}

function spendActivation(state: BattleState, actionPointCost: number): BattleState {
  invariant(state.activation !== null, 'Cannot spend action points without an activation');
  return {
    ...state,
    activation: {
      ...state.activation,
      remainingActionPoints: state.activation.remainingActionPoints - actionPointCost,
    },
  };
}

function occupiedHexes(state: BattleState, excluding?: UnitId): ReadonlySet<string> {
  return new Set(
    state.units
      .filter(({ id, status }) => status === 'active' && id !== excluding)
      .map(({ position }) => hexKey(position)),
  );
}

function applyMove(
  state: BattleState,
  command: MoveCommand,
  rules: CombatRules,
): CombatCommandResult {
  const actor = unitById(state, command.actorId);
  invariant(
    actor !== undefined && state.activation !== null,
    'Move validation requires active actor',
  );
  const destinationKey = hexKey(command.to);
  if (occupiedHexes(state, actor.id).has(destinationKey)) {
    return failure(state, 'HEX_OCCUPIED', `Destination ${destinationKey} is occupied`);
  }
  const path = findPath(state.map, actor.position, command.to, {
    occupied: occupiedHexes(state, actor.id),
  });
  if (path === undefined || path.length === 0) {
    return failure(state, 'INVALID_PATH', `No non-empty path to ${destinationKey}`);
  }
  const actionPointCost = path.length * rules.movement.actionPointsPerHex;
  const staminaCost = path.length * rules.movement.staminaPerHex;
  if (actionPointCost > state.activation.remainingActionPoints) {
    return failure(state, 'INSUFFICIENT_ACTION_POINTS', 'Move exceeds remaining action points');
  }
  if (staminaCost > actor.stamina) {
    return failure(state, 'INSUFFICIENT_STAMINA', 'Move exceeds remaining stamina');
  }

  const moved: CombatUnitState = {
    ...actor,
    position: copyHex(command.to),
    stamina: actor.stamina - staminaCost,
  };
  let nextState = spendActivation(
    { ...state, units: replaceUnit(state.units, actor.id, moved) },
    actionPointCost,
  );
  nextState = {
    ...nextState,
    revision: state.revision + 1,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
  const event: UnitMovedEvent = {
    type: 'unit.moved',
    battleId: state.battleId,
    revision: nextState.revision,
    unitId: actor.id,
    from: copyHex(actor.position),
    to: copyHex(command.to),
    path: path.map(copyHex),
    actionPointCost,
    staminaCost,
  };
  assertBattleState(nextState);
  return { ok: true, state: nextState, events: [event] };
}

function changeMorale(
  unit: CombatUnitState,
  delta: number,
  cause: MoraleChangedEvent['cause'],
  battleId: BattleState['battleId'],
  revision: number,
  maximumMorale: number,
): { readonly unit: CombatUnitState; readonly event?: MoraleChangedEvent } {
  const morale = clamp(unit.morale + delta, 0, maximumMorale);
  if (morale === unit.morale) {
    return { unit };
  }
  return {
    unit: { ...unit, morale },
    event: {
      type: 'unit.morale-changed',
      battleId,
      revision,
      unitId: unit.id,
      delta: morale - unit.morale,
      morale,
      cause,
    },
  };
}

function woundSeverity(
  healthDamage: number,
  maximumHealth: number,
  rules: CombatRules,
): WoundSeverity | undefined {
  const percentage = (healthDamage * 100) / maximumHealth;
  if (percentage >= rules.wounds.severeThresholdPercent) {
    return 'severe';
  }
  if (percentage >= rules.wounds.thresholdPercent) {
    return 'minor';
  }
  return undefined;
}

function applyAttack(
  state: BattleState,
  command: AttackCommand,
  rules: CombatRules,
): CombatCommandResult {
  const actor = unitById(state, command.actorId);
  invariant(
    actor !== undefined && state.activation !== null,
    'Attack validation requires active actor',
  );
  const target = unitById(state, command.targetId);
  if (target === undefined) {
    return failure(state, 'TARGET_NOT_FOUND', `Target ${command.targetId} does not exist`);
  }
  if (target.status !== 'active' || target.sideId === actor.sideId) {
    return failure(state, 'INVALID_TARGET', `Target ${command.targetId} is not an active enemy`);
  }

  const weapon = weaponProfile(rules, actor.weaponId);
  const distance = hexDistance(actor.position, target.position);
  if (distance < weapon.minimumRange || distance > weapon.maximumRange) {
    return failure(state, 'OUT_OF_RANGE', `Target ${command.targetId} is outside weapon range`);
  }
  if (weapon.actionPointCost > state.activation.remainingActionPoints) {
    return failure(state, 'INSUFFICIENT_ACTION_POINTS', 'Attack exceeds remaining action points');
  }
  if (weapon.staminaCost > actor.stamina) {
    return failure(state, 'INSUFFICIENT_STAMINA', 'Attack exceeds remaining stamina');
  }

  const hitChance = clamp(
    rules.hit.baseChance +
      effectiveAccuracy(actor, rules) +
      weapon.accuracyModifier -
      effectiveDefense(target, rules),
    rules.hit.minimumChance,
    rules.hit.maximumChance,
  );
  const hitRoll = drawRandomInt(state.random, 1, 100);
  const hit = hitRoll.value <= hitChance;
  const revision = state.revision + 1;
  const events: CombatEvent[] = [];
  const resolved: AttackResolvedEvent = {
    type: 'attack.resolved',
    battleId: state.battleId,
    revision,
    attackerId: actor.id,
    targetId: target.id,
    hitChance,
    roll: hitRoll.value,
    hit,
  };
  events.push(resolved);

  let random = hitRoll.state;
  let units = state.units;
  const spentActor: CombatUnitState = {
    ...actor,
    stamina: actor.stamina - weapon.staminaCost,
  };
  units = replaceUnit(units, actor.id, spentActor);

  if (hit) {
    const damageRoll = drawRandomInt(random, -weapon.damageVariance, weapon.damageVariance);
    random = damageRoll.state;
    const rawDamage = Math.max(1, weapon.baseDamage + damageRoll.value);
    const penetratingDamage = Math.floor((rawDamage * weapon.armorPenetrationPercent) / 100);
    const blockableDamage = rawDamage - penetratingDamage;
    const armorAbsorbed = Math.min(target.armor, blockableDamage);
    const healthDamage = penetratingDamage + (blockableDamage - armorAbsorbed);
    const armorDamage = Math.min(
      target.armor,
      Math.max(armorAbsorbed, Math.ceil((rawDamage * weapon.armorDamagePercent) / 100)),
    );
    const remainingHealth = Math.max(0, target.health - healthDamage);
    const remainingArmor = Math.max(0, target.armor - armorDamage);
    let damagedTarget: CombatUnitState = {
      ...target,
      health: remainingHealth,
      armor: remainingArmor,
    };
    const damageMorale = changeMorale(
      damagedTarget,
      -rules.morale.damageLoss,
      'damage',
      state.battleId,
      revision,
      rules.morale.maximum,
    );
    damagedTarget = damageMorale.unit;
    if (damageMorale.event !== undefined) {
      events.push(damageMorale.event);
    }

    const damaged: UnitDamagedEvent = {
      type: 'unit.damaged',
      battleId: state.battleId,
      revision,
      unitId: target.id,
      rawDamage,
      armorAbsorbed,
      armorDamage,
      healthDamage,
      remainingArmor,
      remainingHealth,
    };
    events.push(damaged);

    if (remainingHealth > 0 && damagedTarget.wounds.length < rules.wounds.maximumPerUnit) {
      const severity = woundSeverity(healthDamage, target.attributes.health, rules);
      if (severity !== undefined) {
        damagedTarget = {
          ...damagedTarget,
          wounds: [
            ...damagedTarget.wounds,
            { sequence: damagedTarget.wounds.length + 1, severity },
          ],
        };
        const woundMorale = changeMorale(
          damagedTarget,
          -rules.morale.woundLoss,
          'wound',
          state.battleId,
          revision,
          rules.morale.maximum,
        );
        damagedTarget = woundMorale.unit;
        if (woundMorale.event !== undefined) {
          events.push(woundMorale.event);
        }
        const wounded: UnitWoundedEvent = {
          type: 'unit.wounded',
          battleId: state.battleId,
          revision,
          unitId: target.id,
          severity,
        };
        events.push(wounded);
      }
    }

    if (remainingHealth === 0) {
      damagedTarget = { ...damagedTarget, status: 'dead' };
      const died: UnitDiedEvent = {
        type: 'unit.died',
        battleId: state.battleId,
        revision,
        unitId: target.id,
      };
      events.push(died);
    }
    units = replaceUnit(units, target.id, damagedTarget);

    if (remainingHealth === 0) {
      const replacements = new Map<UnitId, CombatUnitState>();
      for (const ally of units) {
        if (ally.status !== 'active' || ally.sideId !== target.sideId || ally.id === target.id) {
          continue;
        }
        const changed = changeMorale(
          ally,
          -rules.morale.allyDeathLoss,
          'ally-death',
          state.battleId,
          revision,
          rules.morale.maximum,
        );
        replacements.set(ally.id, changed.unit);
        if (changed.event !== undefined) {
          events.push(changed.event);
        }
      }
      units = replaceUnits(units, replacements);
    }
  }

  let nextState = spendActivation({ ...state, units, random }, weapon.actionPointCost);
  nextState = {
    ...nextState,
    revision,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
  const outcome = resolvedOutcome(nextState.units);
  if (outcome !== undefined) {
    const terminal = resolveBattle(nextState, outcome, events);
    assertBattleState(terminal.state);
    return { ok: true, state: terminal.state, events: terminal.events };
  }
  assertBattleState(nextState);
  return { ok: true, state: nextState, events };
}

function applyDefend(
  state: BattleState,
  command: DefendCommand,
  rules: CombatRules,
): CombatCommandResult {
  const actor = unitById(state, command.actorId);
  invariant(
    actor !== undefined && state.activation !== null,
    'Defend validation requires active actor',
  );
  if (rules.defend.actionPointCost > state.activation.remainingActionPoints) {
    return failure(state, 'INSUFFICIENT_ACTION_POINTS', 'Defend exceeds remaining action points');
  }
  if (rules.defend.staminaCost > actor.stamina) {
    return failure(state, 'INSUFFICIENT_STAMINA', 'Defend exceeds remaining stamina');
  }
  const revision = state.revision + 1;
  const defended: CombatUnitState = {
    ...actor,
    stamina: actor.stamina - rules.defend.staminaCost,
    guarding: true,
  };
  const spent = spendActivation(
    {
      ...state,
      units: replaceUnit(state.units, actor.id, defended),
      revision,
      processedCommandIds: [...state.processedCommandIds, command.commandId],
    },
    rules.defend.actionPointCost,
  );
  const event: UnitDefendedEvent = {
    type: 'unit.defended',
    battleId: state.battleId,
    revision,
    unitId: actor.id,
  };
  const advanced = advanceActivation(spent, rules, [event]);
  assertBattleState(advanced.state);
  return { ok: true, state: advanced.state, events: advanced.events };
}

function applyWait(
  state: BattleState,
  command: WaitCommand,
  rules: CombatRules,
): CombatCommandResult {
  const revision = state.revision + 1;
  const accepted: BattleState = {
    ...state,
    revision,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
  const advanced = advanceActivation(accepted, rules, []);
  assertBattleState(advanced.state);
  return { ok: true, state: advanced.state, events: advanced.events };
}

function applyRetreat(
  state: BattleState,
  command: RetreatCommand,
  rules: CombatRules,
): CombatCommandResult {
  const actor = unitById(state, command.actorId);
  invariant(actor !== undefined, 'Retreat validation requires active actor');
  const side = sideById(state, actor.sideId);
  invariant(side !== undefined, `Side ${actor.sideId} must exist`);
  if (!side.retreatHexes.some((position) => hexEquals(position, actor.position))) {
    return failure(state, 'RETREAT_NOT_AVAILABLE', `Unit ${actor.id} is not on its retreat edge`);
  }
  const revision = state.revision + 1;
  const retreated: CombatUnitState = { ...actor, status: 'retreated', guarding: false };
  const accepted: BattleState = {
    ...state,
    units: replaceUnit(state.units, actor.id, retreated),
    revision,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
  const event: UnitRetreatedEvent = {
    type: 'unit.retreated',
    battleId: state.battleId,
    revision,
    unitId: actor.id,
    sideId: actor.sideId,
  };
  const outcome = resolvedOutcome(accepted.units);
  if (outcome !== undefined) {
    const terminal = resolveBattle(accepted, outcome, [event]);
    assertBattleState(terminal.state);
    return { ok: true, state: terminal.state, events: terminal.events };
  }
  const advanced = advanceActivation(accepted, rules, [event]);
  assertBattleState(advanced.state);
  return { ok: true, state: advanced.state, events: advanced.events };
}

export function applyCombatCommand(
  state: BattleState,
  command: CombatCommand,
): CombatCommandResult {
  const invalid = validateCommandBase(state, command);
  if (invalid !== undefined) {
    return { ok: false, state, error: invalid };
  }
  const rules = combatRules(state.rulesetId);
  switch (command.type) {
    case 'move':
      return applyMove(state, command, rules);
    case 'attack':
      return applyAttack(state, command, rules);
    case 'defend':
      return applyDefend(state, command, rules);
    case 'wait':
      return applyWait(state, command, rules);
    case 'retreat':
      return applyRetreat(state, command, rules);
    default:
      return assertNever(command);
  }
}

export function assertBattleState(state: BattleState): void {
  const rules = combatRules(state.rulesetId);
  invariant(
    state.round >= 1 && state.round <= rules.limits.maximumRounds,
    'Round is out of bounds',
  );
  invariant(state.revision >= 0, 'Revision must not be negative');
  invariant(
    new Set(state.processedCommandIds).size === state.processedCommandIds.length,
    'Processed command ids must be unique',
  );
  invariant(
    state.processedCommandIds.length <= rules.limits.maximumCommands,
    'Processed command count exceeds the ruleset limit',
  );
  invariant(
    new Set(state.initiativeOrder).size === state.initiativeOrder.length,
    'Initiative order must not contain duplicate units',
  );

  const mapKeys = new Set(state.map.hexes.map(hexKey));
  const blockedKeys = new Set(state.map.blocked.map(hexKey));
  invariant(mapKeys.size === state.map.hexes.length, 'Battle state map hexes must be unique');
  invariant(
    blockedKeys.size === state.map.blocked.length,
    'Battle state blocked hexes must be unique',
  );
  for (const blocked of blockedKeys) {
    invariant(mapKeys.has(blocked), `Blocked state hex ${blocked} must exist on the map`);
  }

  const activePositions = new Set<string>();
  for (const unit of state.units) {
    invariant(
      unit.health >= 0 && unit.health <= unit.attributes.health,
      `${unit.id} health is invalid`,
    );
    invariant(
      unit.armor >= 0 && unit.armor <= unit.attributes.armor,
      `${unit.id} armor is invalid`,
    );
    invariant(
      unit.stamina >= 0 && unit.stamina <= unit.attributes.stamina,
      `${unit.id} stamina is invalid`,
    );
    invariant(
      unit.morale >= 0 && unit.morale <= rules.morale.maximum,
      `${unit.id} morale is invalid`,
    );
    invariant(unit.wounds.length <= rules.wounds.maximumPerUnit, `${unit.id} has too many wounds`);
    invariant(
      unit.status !== 'dead' || unit.health === 0,
      `${unit.id} cannot be dead with positive health`,
    );
    if (unit.status === 'active') {
      invariant(unit.health > 0, `${unit.id} cannot be active without health`);
      const key = hexKey(unit.position);
      invariant(mapKeys.has(key), `${unit.id} must occupy a battle map hex`);
      invariant(!blockedKeys.has(key), `${unit.id} must not occupy blocked terrain`);
      invariant(!activePositions.has(key), `Active units overlap at ${key}`);
      activePositions.add(key);
    }
  }

  if (state.status === 'active') {
    invariant(state.outcome === undefined, 'Active battle must not have an outcome');
    invariant(state.activation !== null, 'Active battle must have a current activation');
    invariant(
      state.turnIndex >= 0 && state.turnIndex < state.initiativeOrder.length,
      'Active battle turn index is invalid',
    );
    invariant(
      state.initiativeOrder[state.turnIndex] === state.activation.unitId,
      'Current activation must match the initiative order',
    );
    const actor = unitById(state, state.activation.unitId);
    invariant(actor?.status === 'active', 'Current activation must reference an active unit');
    invariant(
      state.activation.remainingActionPoints >= 0 &&
        state.activation.remainingActionPoints <= rules.actionPointsPerActivation,
      'Activation action points are invalid',
    );
    invariant(resolvedOutcome(state.units) === undefined, 'Active battle must have opposing sides');
  } else {
    invariant(state.activation === null, 'Resolved battle cannot have an activation');
    invariant(state.outcome !== undefined, 'Resolved battle must have an outcome');
    if (state.outcome.reason === 'round-limit') {
      invariant(
        state.round === rules.limits.maximumRounds,
        'Round-limit outcome must occur at the configured round limit',
      );
    } else {
      const expected = resolvedOutcome(state.units);
      invariant(expected !== undefined, 'Last-side-standing outcome requires terminal unit state');
      invariant(
        expected.winnerSideId === state.outcome.winnerSideId,
        'Battle winner must match the remaining active side',
      );
    }
  }
}
