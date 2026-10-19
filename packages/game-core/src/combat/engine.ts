import { M1_DOMAIN_BRIDGE_V3_RULESET_ID, validateCombatCapabilities } from './setup-v2.js';
import {
  validateUnitIdentity,
  validateUnitPosition,
  validateCombatMap,
  createUnitAdmission,
  validateHex,
  validateInteger,
} from './setup-validation.js';
import {
  previewCombatSkills,
  combatSkillWeapon,
  combatSkillHitChance,
  validateCombatSkillRanks,
} from './skills.js';
import { isSpriteS4Ruleset } from './rules.js';
import { SPRITE_PROTOTYPE_V3_RULESET_ID, type UseSkillCommand } from './types.js';
import { combatReactionControllers } from './reaction.js';
import { assertNever, invariant } from '../primitives.js';
import { findPath, hexDistance, hexEquals, hexKey } from './hex.js';
import { createRandomState, drawRandomInt } from './random.js';
import {
  combatAttackDamage,
  combatActionAllowed,
  combatGuardedDamage,
  isSpritePrototypeRuleset,
  combatHitChance,
  combatRules,
  compareCombatUnitIds,
  type CombatRules,
  type WeaponProfile,
  weaponProfile,
} from './rules.js';
import {
  preparePrototypeMove,
  combatWeaponTargetFailure,
  ordinaryCombatAttackFailure,
  prototypeLineOfSight,
  prototypeMovementStep,
  SPRITE_PROTOTYPE_FIRE_DAMAGE,
} from './sprite-prototype.js';
import { COMBAT_SCHEMA_VERSION, M0_COMBAT_RULESET_ID } from './types.js';
import {
  canCombatSurrender,
  createCombatThreat,
  findCombatEscapePlan,
  isCombatPanicked,
} from './sprite-s4.js';
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
  CombatRulesetId,
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
  UnitFireDamagedEvent,
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
): Extract<CombatCommandResult, { ok: false }> {
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
    ...(map.tiles === undefined ? {} : { tiles: map.tiles.map((tile) => ({ ...tile })) }),
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
    ...(unit.skillRanks ? { skillRanks: { ...unit.skillRanks } } : {}),
    health: unit.attributes.health,
    armor: unit.attributes.armor,
    stamina: unit.attributes.stamina,
    morale: unit.attributes.morale,
    guarding: false,
    status: 'active',
    wounds: [],
  };
}

function validatePrototypeTraits(unit: CombatUnitSetup, rulesetId: CombatRulesetId): void {
  if (unit.trainedMelee !== undefined || unit.incorporeal !== undefined) {
    invariant(
      isSpritePrototypeRuleset(rulesetId),
      'Prototype combat traits require sprite-prototype-v1',
    );
    if (unit.trainedMelee !== undefined) {
      invariant(typeof unit.trainedMelee === 'boolean', `${unit.id}.trainedMelee must be boolean`);
    }
    if (unit.incorporeal !== undefined) {
      invariant(typeof unit.incorporeal === 'boolean', `${unit.id}.incorporeal must be boolean`);
    }
  }
  if (unit.moralePolicy !== undefined || unit.threatProfile !== undefined) {
    invariant(isSpriteS4Ruleset(rulesetId), 'S4 traits require sprite-prototype-v2');
    invariant(
      unit.moralePolicy === undefined || ['human', 'beast', 'steady'].includes(unit.moralePolicy),
      'Unknown morale policy',
    );
    invariant(
      unit.threatProfile === undefined || unit.threatProfile === 'mill-slam',
      'Unknown threat profile',
    );
  }
}

function validateSetupAttributes(
  unit: CombatUnitSetup,
  rulesetId: CombatRulesetId,
  rules: CombatRules,
): void {
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
  invariant(validateCombatSkillRanks(unit.skillRanks), 'Invalid combat skill ranks');
  invariant(
    unit.skillRanks === undefined || rulesetId === SPRITE_PROTOTYPE_V3_RULESET_ID,
    'Skills require sprite-prototype-v3',
  );
}

function validateSetup(setup: BattleSetup, rules: CombatRules): void {
  invariant(
    setup.schemaVersion === COMBAT_SCHEMA_VERSION,
    `Battle setup schemaVersion must be ${COMBAT_SCHEMA_VERSION}`,
  );
  invariant(setup.battleId.length > 0, 'Battle id must not be empty');
  invariant(Number.isSafeInteger(setup.seed), 'Battle seed must be a safe integer');
  invariant(
    (rules.id === M0_COMBAT_RULESET_ID || isSpritePrototypeRuleset(rules.id)) &&
      setup.rulesetId === rules.id,
    'Battle setup ruleset must match the selected rules',
  );
  invariant(setup.sides.length === rules.sides, `M0 requires exactly ${rules.sides} sides`);
  invariant(
    setup.units.length >= rules.units.minimum && setup.units.length <= rules.units.maximum,
    `M0 battle must contain ${rules.units.minimum}-${rules.units.maximum} units`,
  );

  const { mapKeys, blockedKeys } = validateCombatMap(setup.map);
  if (setup.map.tiles !== undefined) {
    invariant(
      isSpritePrototypeRuleset(setup.rulesetId),
      'Terrain tiles require sprite-prototype-v1',
    );
    const tileKeys = new Set<string>();
    for (const [index, tile] of setup.map.tiles.entries()) {
      validateHex(tile, `map.tiles[${index}]`);
      const key = hexKey(tile);
      invariant(mapKeys.has(key), `Terrain tile ${key} must exist in the battle map`);
      invariant(!tileKeys.has(key), `Terrain tile ${key} must be unique`);
      tileKeys.add(key);
      invariant(
        tile.height === 0 || tile.height === 1 || tile.height === 2,
        `Terrain tile ${key} height must be 0, 1 or 2`,
      );
      invariant(
        tile.terrain === 'plain' || tile.terrain === 'mud' || tile.terrain === 'fire',
        `Terrain tile ${key} has an unknown terrain`,
      );
    }
  }

  const { sideIds, unitIds, occupied, unitsPerSide } = createUnitAdmission(
    setup.sides,
    mapKeys,
    blockedKeys,
  );
  for (const unit of setup.units) {
    validateUnitIdentity(unit, unitIds, sideIds);
    validatePrototypeTraits(unit, setup.rulesetId);
    unitsPerSide.set(unit.sideId, (unitsPerSide.get(unit.sideId) ?? 0) + 1);

    validateUnitPosition(unit, mapKeys, blockedKeys, occupied);

    validateSetupAttributes(unit, setup.rulesetId, rules);
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

function orderInitiative(
  units: readonly CombatUnitState[],
  rules: CombatRules,
  rulesetId: CombatRulesetId,
): readonly UnitId[] {
  return units
    .filter(({ status }) => status === 'active')
    .toSorted(
      (left, right) =>
        effectiveInitiative(right, rules) - effectiveInitiative(left, rules) ||
        compareCombatUnitIds(rulesetId, left.id, right.id),
    )
    .map(({ id }) => id);
}

export function previewCombatInitiative(
  state: BattleState,
): { readonly round: number; readonly unitIds: readonly UnitId[] } | undefined {
  const rules = combatRules(state.rulesetId);
  if (state.status !== 'active' || state.round >= rules.limits.maximumRounds) return undefined;
  return {
    round: state.round + 1,
    unitIds: orderInitiative(state.units, rules, state.rulesetId),
  };
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
  const { shieldBraceRank: _expiredBrace, ...activationUnit } = unit;
  const refreshed: CombatUnitState = {
    ...activationUnit,
    guarding: false,
    ...(isSpriteS4Ruleset(state.rulesetId) ? { reactionSpent: false } : {}),
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
  if (isSpriteS4Ruleset(state.rulesetId)) {
    const completedActor = unitById(state, state.activation.unitId);
    if (completedActor !== undefined) {
      state = {
        ...state,
        units: state.units.map((unit) =>
          unit.threat !== undefined && unit.sideId !== completedActor.sideId
            ? { ...unit, threat: { ...unit.threat, responseReceived: true } }
            : unit,
        ),
      };
    }
  }

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
  order = orderInitiative(state.units, rules, state.rulesetId);
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
  const initiativeOrder = orderInitiative(units, rules, setup.rulesetId);
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

function prepareMove(
  state: BattleState,
  command: MoveCommand,
  actor: CombatUnitState,
  rules: CombatRules,
  forcedPath?: readonly Hex[],
) {
  invariant(state.activation !== null, 'Move preparation requires an activation');
  const destinationKey = hexKey(command.to);
  if (occupiedHexes(state, actor.id).has(destinationKey)) {
    return failure(state, 'HEX_OCCUPIED', `Destination ${destinationKey} is occupied`);
  }
  const prototypeMove = preparePrototypeMove(state, command.to);
  const path =
    forcedPath ??
    prototypeMove?.path ??
    (isSpritePrototypeRuleset(state.rulesetId)
      ? undefined
      : findPath(state.map, actor.position, command.to, {
          occupied: occupiedHexes(state, actor.id),
        }));
  if (path === undefined || path.length === 0) {
    return failure(state, 'INVALID_PATH', `No non-empty path to ${destinationKey}`);
  }
  const forcedCost = forcedPath?.reduce(
    (cost, to, index) => {
      const from = index === 0 ? actor.position : forcedPath[index - 1]!;
      const step = prototypeMovementStep(state, from, to);
      return {
        actionPointCost: cost.actionPointCost + step.actionPointCost,
        staminaCost: cost.staminaCost + step.staminaCost,
      };
    },
    { actionPointCost: 0, staminaCost: 0 },
  );
  const actionPointCost =
    forcedCost?.actionPointCost ??
    prototypeMove?.actionPointCost ??
    path.length * rules.movement.actionPointsPerHex;
  const staminaCost =
    forcedCost?.staminaCost ??
    prototypeMove?.staminaCost ??
    path.length * rules.movement.staminaPerHex;
  if (actionPointCost > state.activation.remainingActionPoints) {
    return failure(state, 'INSUFFICIENT_ACTION_POINTS', 'Move exceeds remaining action points');
  }
  if (staminaCost > actor.stamina) {
    return failure(state, 'INSUFFICIENT_STAMINA', 'Move exceeds remaining stamina');
  }

  return { ok: true as const, path, actionPointCost, staminaCost };
}

function resolveDepartureReactions(
  state: BattleState,
  actor: CombatUnitState,
  from: Hex,
  to: Hex,
  rules: CombatRules,
) {
  let reactionState = state;
  let movingActor = actor;
  const events: CombatEvent[] = [];
  for (const controller of combatReactionControllers(reactionState, movingActor, from, to)) {
    const strike = resolveCombatStrike(
      reactionState,
      controller,
      movingActor,
      rules,
      weaponProfile(rules, controller.weaponId),
      state.revision + 1,
      0,
    );
    reactionState = {
      ...strike.state,
      units: strike.state.units.map((unit) =>
        unit.id === controller.id ? { ...unit, reactionSpent: true } : unit,
      ),
    };
    movingActor = unitById(reactionState, movingActor.id)!;
    events.push(...strike.events);
    if (movingActor.status === 'dead') {
      break;
    }
  }
  return { state: reactionState, actor: movingActor, events };
}

function applyMovementFire(state: BattleState, actor: CombatUnitState) {
  const remainingHealth = Math.max(0, actor.health - SPRITE_PROTOTYPE_FIRE_DAMAGE);
  const fireEvent: UnitFireDamagedEvent = {
    type: 'unit.fire-damaged',
    battleId: state.battleId,
    revision: state.revision + 1,
    unitId: actor.id,
    healthDamage: actor.health - remainingHealth,
    remainingHealth,
  };
  const damaged = {
    ...actor,
    health: remainingHealth,
    ...(remainingHealth === 0 ? { status: 'dead' as const } : {}),
  };
  return { actor: damaged, event: fireEvent };
}

function executeMovePath(
  state: BattleState,
  command: MoveCommand,
  actor: CombatUnitState,
  rules: CombatRules,
  path: readonly Hex[],
  actionPointCost: number,
  staminaCost: number,
) {
  let actualPath = path;
  let actualActionPointCost = actionPointCost;
  let actualStaminaCost = staminaCost;
  let actualPosition = command.to;
  let currentActor: CombatUnitState = {
    ...actor,
    position: copyHex(command.to),
    stamina: actor.stamina - staminaCost,
  };
  const events: CombatEvent[] = [];
  let killedByFire = false;
  let killedByReaction = false;
  let strikeState = state;
  if (isSpritePrototypeRuleset(state.rulesetId)) {
    actualPath = [];
    actualActionPointCost = 0;
    actualStaminaCost = 0;
    actualPosition = actor.position;
    currentActor = actor;
    for (const step of path) {
      const reaction = resolveDepartureReactions(
        strikeState,
        currentActor,
        actualPosition,
        step,
        rules,
      );
      strikeState = reaction.state;
      currentActor = reaction.actor;
      events.push(...reaction.events);
      killedByReaction = currentActor.status === 'dead';
      if (killedByReaction) break;
      const cost = prototypeMovementStep(state, actualPosition, step);
      actualActionPointCost += cost.actionPointCost;
      actualStaminaCost += cost.staminaCost;
      actualPath = [...actualPath, step];
      actualPosition = step;
      currentActor = {
        ...currentActor,
        position: copyHex(step),
        stamina: currentActor.stamina - cost.staminaCost,
      };
      if (cost.fire) {
        const fire = applyMovementFire(state, currentActor);
        currentActor = fire.actor;
        const remainingHealth = currentActor.health;
        events.push(fire.event);
        if (remainingHealth === 0) {
          killedByFire = true;
          events.push({
            type: 'unit.died',
            battleId: state.battleId,
            revision: state.revision + 1,
            unitId: actor.id,
          });
          break;
        }
      }
      strikeState = {
        ...strikeState,
        units: replaceUnit(strikeState.units, actor.id, currentActor),
      };
    }
  }
  return {
    actualPath,
    actualActionPointCost,
    actualStaminaCost,
    actualPosition,
    currentActor,
    events,
    killedByFire,
    killedByReaction,
    strikeState,
  };
}

function resolveCommandOutcome(
  state: BattleState,
  events: readonly CombatEvent[],
): CombatCommandResult | undefined {
  const outcome = resolvedOutcome(state.units);
  if (outcome === undefined) return undefined;
  const terminal = resolveBattle(state, outcome, events);
  assertBattleState(terminal.state);
  return { ok: true, state: terminal.state, events: terminal.events };
}

function applyMove(
  state: BattleState,
  command: MoveCommand,
  rules: CombatRules,
  forcedPath?: readonly Hex[],
): CombatCommandResult {
  const actor = unitById(state, command.actorId);
  invariant(
    actor !== undefined && state.activation !== null,
    'Move validation requires active actor',
  );
  const plan = prepareMove(state, command, actor, rules, forcedPath);
  if (!plan.ok) return plan;
  const { path, actionPointCost, staminaCost } = plan;
  const {
    actualPath,
    actualActionPointCost,
    actualStaminaCost,
    actualPosition,
    currentActor,
    events,
    killedByFire,
    killedByReaction,
    strikeState,
  } = executeMovePath(state, command, actor, rules, path, actionPointCost, staminaCost);
  let nextState = spendActivation(
    { ...strikeState, units: replaceUnit(strikeState.units, actor.id, currentActor) },
    actualActionPointCost,
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
    to: copyHex(actualPosition),
    path: actualPath.map(copyHex),
    actionPointCost: actualActionPointCost,
    staminaCost: actualStaminaCost,
  };
  events.unshift(event);
  if (killedByFire) {
    const moraleLoss = applyAllyDeathMorale(
      nextState.units,
      currentActor,
      rules,
      state.battleId,
      nextState.revision,
    );
    nextState = { ...nextState, units: moraleLoss.units };
    events.push(...moraleLoss.events);
  }
  const terminal = resolveCommandOutcome(nextState, events);
  if (terminal !== undefined) return terminal;
  if (killedByFire || killedByReaction) {
    const advanced = advanceActivation(nextState, rules, events);
    assertBattleState(advanced.state);
    return { ok: true, state: advanced.state, events: advanced.events };
  }
  assertBattleState(nextState);
  return { ok: true, state: nextState, events };
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

function applyAllyDeathMorale(
  units: readonly CombatUnitState[],
  deceased: CombatUnitState,
  rules: CombatRules,
  battleId: BattleState['battleId'],
  revision: number,
): { readonly units: readonly CombatUnitState[]; readonly events: readonly MoraleChangedEvent[] } {
  const replacements = new Map<UnitId, CombatUnitState>();
  const events: MoraleChangedEvent[] = [];
  for (const ally of units) {
    if (ally.status !== 'active' || ally.sideId !== deceased.sideId || ally.id === deceased.id) {
      continue;
    }
    const changed = changeMorale(
      ally,
      -rules.morale.allyDeathLoss,
      'ally-death',
      battleId,
      revision,
      rules.morale.maximum,
    );
    replacements.set(ally.id, changed.unit);
    if (changed.event !== undefined) events.push(changed.event);
  }
  return { units: replaceUnits(units, replacements), events };
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

function applyStrikeWound(
  state: BattleState,
  target: CombatUnitState,
  actualHealthDamage: number,
  rules: CombatRules,
  revision: number,
) {
  let damagedTarget = target;
  const events: CombatEvent[] = [];
  if (damagedTarget.health > 0 && damagedTarget.wounds.length < rules.wounds.maximumPerUnit) {
    const severity = woundSeverity(actualHealthDamage, damagedTarget.attributes.health, rules);
    if (severity !== undefined) {
      damagedTarget = {
        ...damagedTarget,
        wounds: [...damagedTarget.wounds, { sequence: damagedTarget.wounds.length + 1, severity }],
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

  return { unit: damagedTarget, events };
}

function resolveCombatStrike(
  state: BattleState,
  actor: CombatUnitState,
  target: CombatUnitState,
  rules: CombatRules,
  weapon: WeaponProfile,
  revision: number,
  staminaCost: number,
  threatExecution = false,
  skillHitChance?: number,
): { state: BattleState; events: readonly CombatEvent[] } {
  const hitChance =
    skillHitChance ?? (threatExecution ? 100 : combatHitChance(actor, target, rules));
  const hitRoll = drawRandomInt(state.random, 1, 100);
  const hit = hitRoll.value <= hitChance;
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
    stamina: actor.stamina - staminaCost,
  };
  units = replaceUnit(units, actor.id, spentActor);

  if (hit) {
    const damageRoll = drawRandomInt(random, -weapon.damageVariance, weapon.damageVariance);
    random = damageRoll.state;
    const rawDamage = combatGuardedDamage(
      Math.max(1, weapon.baseDamage + damageRoll.value),
      target,
      rules,
    );
    const { armorAbsorbed, healthDamage, armorDamage } = combatAttackDamage(
      rawDamage,
      target.armor,
      weapon,
    );
    const remainingHealth = Math.max(0, target.health - healthDamage);
    const actualHealthDamage =
      state.rulesetId === SPRITE_PROTOTYPE_V3_RULESET_ID
        ? target.health - remainingHealth
        : healthDamage;
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
      healthDamage: actualHealthDamage,
      remainingArmor,
      remainingHealth,
    };
    events.push(damaged);

    const wound = applyStrikeWound(state, damagedTarget, actualHealthDamage, rules, revision);
    damagedTarget = wound.unit;
    events.push(...wound.events);

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
      const moraleLoss = applyAllyDeathMorale(
        units,
        damagedTarget,
        rules,
        state.battleId,
        revision,
      );
      units = moraleLoss.units;
      events.push(...moraleLoss.events);
    }
  }

  return { state: { ...state, units, random }, events };
}

function applyAttack(
  state: BattleState,
  command: AttackCommand,
  rules: CombatRules,
  threatExecution = false,
): CombatCommandResult {
  const actor = unitById(state, command.actorId);
  invariant(
    actor !== undefined && state.activation !== null,
    'Attack validation requires active actor',
  );
  const ordinaryWeapon = weaponProfile(rules, actor.weaponId);
  const weapon = threatExecution
    ? { ...ordinaryWeapon, maximumRange: 2, actionPointCost: 4 }
    : ordinaryWeapon;
  const invalid = combatWeaponTargetFailure(
    state,
    actor,
    command.targetId,
    weapon,
    threatExecution,
  );
  if (invalid) return failure(state, invalid.code, invalid.message);
  const target = unitById(state, command.targetId)!;

  const revision = state.revision + 1;
  const strike = resolveCombatStrike(
    state,
    actor,
    target,
    rules,
    weapon,
    revision,
    weapon.staminaCost,
    threatExecution,
  );
  const { units, random } = strike.state;
  const events = strike.events;
  let nextState = spendActivation({ ...state, units, random }, weapon.actionPointCost);
  nextState = {
    ...nextState,
    revision,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
  const terminal = resolveCommandOutcome(nextState, events);
  if (terminal !== undefined) return terminal;
  assertBattleState(nextState);
  return { ok: true, state: nextState, events };
}

function applySkill(
  state: BattleState,
  command: UseSkillCommand,
  rules: CombatRules,
): CombatCommandResult {
  const actor = unitById(state, command.actorId)!;
  const targetId = command.targetId ?? actor.id;
  const preview = previewCombatSkills(state, actor.id).find(
    (skill) => skill.skillId === command.skillId && skill.targetId === targetId,
  );
  if (!preview)
    return failure(state, 'SKILL_NOT_AVAILABLE', 'Skill is not learned or target does not exist');
  if (!preview.legal) return failure(state, preview.reason!, 'Skill prerequisites are not met');
  const target = unitById(state, targetId)!;
  const revision = state.revision + 1;
  const event: CombatEvent = {
    type: 'skill.used',
    battleId: state.battleId,
    revision,
    unitId: actor.id,
    skillId: command.skillId,
    rank: preview.rank,
    targetId,
  };
  let next: BattleState;
  const events: CombatEvent[] = [event];
  if (preview.target === 'enemy') {
    const strike = resolveCombatStrike(
      state,
      actor,
      target,
      rules,
      combatSkillWeapon(state, actor, preview),
      revision,
      preview.staminaCost,
      false,
      combatSkillHitChance(state, actor, target, preview),
    );
    next = strike.state;
    events.push(...strike.events);
  } else {
    next = {
      ...state,
      units: replaceUnit(state.units, actor.id, {
        ...actor,
        stamina: actor.stamina - preview.staminaCost,
        ...(command.skillId === 'shield-brace'
          ? { guarding: true, shieldBraceRank: preview.rank }
          : {}),
      }),
    };
    if (command.skillId === 'rally') {
      const current = unitById(next, target.id)!;
      const morale = changeMorale(
        current,
        preview.moraleGain!,
        'rally',
        state.battleId,
        revision,
        rules.morale.maximum,
      );
      next = { ...next, units: replaceUnit(next.units, target.id, morale.unit) };
      if (morale.event) events.push(morale.event);
    }
  }
  next = {
    ...spendActivation(next, preview.actionPointCost),
    revision,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
  const outcome = resolvedOutcome(next.units);
  if (outcome) {
    const terminal = resolveBattle(next, outcome, events);
    assertBattleState(terminal.state);
    return { ok: true, state: terminal.state, events: terminal.events };
  }
  assertBattleState(next);
  return { ok: true, state: next, events };
}

function applySurrender(
  state: BattleState,
  command: Extract<CombatCommand, { type: 'surrender' }>,
  actor: CombatUnitState,
  rules: CombatRules,
): CombatCommandResult {
  if (!canCombatSurrender(state, actor))
    return failure(state, 'INVALID_TARGET', 'No capable human captor or a safe exit remains');
  const revision = state.revision + 1;
  const accepted = {
    ...state,
    revision,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
    units: replaceUnit(state.units, actor.id, {
      ...actor,
      status: 'surrendered',
      guarding: false,
    }),
  };
  const advanced = advanceActivation(accepted, rules, [
    {
      type: 'unit.surrendered',
      battleId: state.battleId,
      revision,
      unitId: actor.id,
      sideId: actor.sideId,
    },
  ]);
  assertBattleState(advanced.state);
  return { ok: true, ...advanced };
}

function affordableEscapePrefix(
  state: BattleState,
  actor: CombatUnitState,
  path: readonly Hex[],
): readonly Hex[] {
  let ap = 0;
  let stamina = 0;
  const prefix: Hex[] = [];
  let from = actor.position;
  for (const to of path) {
    const cost = prototypeMovementStep(state, from, to);
    if (
      ap + cost.actionPointCost > state.activation!.remainingActionPoints ||
      stamina + cost.staminaCost > actor.stamina
    )
      break;
    prefix.push(to);
    ap += cost.actionPointCost;
    stamina += cost.staminaCost;
    from = to;
  }
  return prefix;
}

function applyPanicCommand(
  state: BattleState,
  command: Extract<CombatCommand, { type: 'flee' | 'surrender' }>,
  rules: CombatRules,
): CombatCommandResult {
  const actor = unitById(state, command.actorId)!;
  if (!isCombatPanicked(state, actor))
    return failure(state, 'PANICKED', 'Only panicked units can use panic commands');
  if (command.type === 'surrender') return applySurrender(state, command, actor, rules);
  const plan = findCombatEscapePlan(state, actor) ?? findCombatEscapePlan(state, actor, false);
  if (plan === undefined) return applyWait(state, { ...command, type: 'wait' }, rules);
  const prefix = affordableEscapePrefix(state, actor, plan.path);
  const planningState = {
    ...state,
    units: replaceUnit(state.units, actor.id, { ...actor, escapePlan: plan, guarding: false }),
  };
  const destination = prefix.at(-1);
  const moved =
    destination === undefined
      ? undefined
      : applyMove(planningState, { ...command, type: 'move', to: destination }, rules, prefix);
  if (moved !== undefined && !moved.ok) return { ...moved, state };
  let accepted = moved?.state ?? {
    ...planningState,
    revision: state.revision + 1,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
  };
  const events: CombatEvent[] = [...(moved?.events ?? [])];
  if (accepted.status === 'resolved') return { ok: true, state: accepted, events };
  const movedActor = unitById(accepted, actor.id)!;
  if (movedActor.status !== 'active') return { ok: true, state: accepted, events };
  if (hexEquals(movedActor.position, plan.exit)) {
    accepted = {
      ...accepted,
      units: replaceUnit(accepted.units, actor.id, {
        ...movedActor,
        status: 'retreated',
        guarding: false,
      }),
    };
    events.push({
      type: 'unit.retreated',
      battleId: state.battleId,
      revision: accepted.revision,
      unitId: actor.id,
      sideId: actor.sideId,
    });
  }
  const advanced = advanceActivation(accepted, rules, events);
  assertBattleState(advanced.state);
  return { ok: true, ...advanced };
}

function executeThreat(
  state: BattleState,
  command: Extract<CombatCommand, { type: 'execute-threat' }>,
  actor: CombatUnitState,
  rules: CombatRules,
): CombatCommandResult {
  const previous = actor.threat;
  if (previous === undefined) return failure(state, 'THREAT_NOT_AVAILABLE', 'No prepared threat');
  if (!previous.responseReceived)
    return failure(
      state,
      'THREAT_RESPONSE_REQUIRED',
      'Opponent must complete an activation after warning',
    );
  const target = unitById(state, previous.targetId);
  if (
    target?.status !== 'active' ||
    !hexEquals(target.position, previous.targetHex) ||
    hexDistance(actor.position, target.position) > 2 ||
    !prototypeLineOfSight(state, actor.position, target.position)
  ) {
    const revision = state.revision + 1;
    const { threat: _threat, ...cancelled } = actor;
    const accepted = {
      ...state,
      revision,
      processedCommandIds: [...state.processedCommandIds, command.commandId],
      units: replaceUnit(state.units, actor.id, cancelled),
    };
    const advanced = advanceActivation(accepted, rules, [
      {
        type: 'threat.cancelled',
        battleId: state.battleId,
        revision,
        unitId: actor.id,
        threat: previous,
      },
    ]);
    return { ok: true, ...advanced };
  }
  const attack = applyAttack(
    state,
    { ...command, type: 'attack', targetId: target.id },
    rules,
    true,
  );
  if (!attack.ok) return attack;
  const nextActor = unitById(attack.state, actor.id)!;
  const { threat: _threat, ...cleared } = nextActor;
  const accepted = { ...attack.state, units: replaceUnit(attack.state.units, actor.id, cleared) };
  const events: CombatEvent[] = [
    ...attack.events,
    {
      type: 'threat.executed',
      battleId: state.battleId,
      revision: accepted.revision,
      unitId: actor.id,
      threat: previous,
    },
  ];
  return accepted.status === 'active'
    ? { ok: true, ...advanceActivation(accepted, rules, events) }
    : { ok: true, state: accepted, events };
}

function prepareThreat(
  state: BattleState,
  command: Extract<CombatCommand, { type: 'prepare-threat' | 'retarget-threat' }>,
  actor: CombatUnitState,
) {
  const previous = actor.threat;
  if (
    command.type === 'prepare-threat'
      ? previous !== undefined
      : previous === undefined || previous.retargeted
  )
    return failure(state, 'THREAT_NOT_AVAILABLE', 'Warning cannot be prepared or retargeted again');
  if (command.type === 'retarget-threat' && !previous?.responseReceived)
    return failure(state, 'THREAT_RESPONSE_REQUIRED', 'Opponent must answer the original warning');
  const target = unitById(state, command.targetId);
  if (target?.status !== 'active' || target.sideId === actor.sideId || target.incorporeal === true)
    return failure(state, 'INVALID_TARGET', 'Warning requires a corporeal active enemy');
  if (hexDistance(actor.position, target.position) > 2)
    return failure(state, 'OUT_OF_RANGE', 'Warning target exceeds range');
  if (!prototypeLineOfSight(state, actor.position, target.position))
    return failure(state, 'BLOCKED_LINE_OF_SIGHT', 'Warning target is obscured');
  const ap = command.type === 'prepare-threat' ? 2 : 0;
  const stamina = command.type === 'prepare-threat' ? 8 : 0;
  if (state.activation!.remainingActionPoints < ap)
    return failure(state, 'INSUFFICIENT_ACTION_POINTS', 'Warning requires action points');
  if (actor.stamina < stamina)
    return failure(state, 'INSUFFICIENT_STAMINA', 'Warning requires stamina');
  return { ok: true as const, target, ap, stamina };
}

function applyThreatCommand(
  state: BattleState,
  command: Extract<
    CombatCommand,
    { type: 'prepare-threat' | 'retarget-threat' | 'execute-threat' }
  >,
  rules: CombatRules,
): CombatCommandResult {
  const actor = unitById(state, command.actorId)!;
  if (!isSpriteS4Ruleset(state.rulesetId) || actor.threatProfile !== 'mill-slam')
    return failure(state, 'THREAT_NOT_AVAILABLE', 'Actor has no warning attack');
  if (command.type === 'execute-threat') return executeThreat(state, command, actor, rules);
  const preparation = prepareThreat(state, command, actor);
  if (!preparation.ok) return preparation;
  const { target, ap, stamina } = preparation;
  const threat = createCombatThreat(state, actor, target, command.type === 'retarget-threat');
  const revision = state.revision + 1;
  const accepted = spendActivation(
    {
      ...state,
      revision,
      processedCommandIds: [...state.processedCommandIds, command.commandId],
      units: replaceUnit(state.units, actor.id, {
        ...actor,
        threat,
        stamina: actor.stamina - stamina,
      }),
    },
    ap,
  );
  const advanced = advanceActivation(accepted, rules, [
    {
      type: command.type === 'prepare-threat' ? 'threat.prepared' : 'threat.retargeted',
      battleId: state.battleId,
      revision,
      unitId: actor.id,
      threat,
    },
  ]);
  return { ok: true, ...advanced };
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
  const actor = unitById(state, command.actorId)!;
  if (
    isCombatPanicked(state, actor) &&
    !['flee', 'surrender', 'wait', 'retreat'].includes(command.type)
  ) {
    return failure(state, 'PANICKED', 'Panicked units must escape or surrender');
  }
  if (!combatActionAllowed(state, actor, command.type)) {
    return failure(state, 'ACTION_NOT_AVAILABLE', 'This action is unavailable to this participant');
  }
  if (command.type === 'attack') {
    const invalid = ordinaryCombatAttackFailure(state, actor);
    if (invalid) return failure(state, invalid.code, invalid.message);
  }
  switch (command.type) {
    case 'use-skill':
      return applySkill(state, command, rules);
    case 'flee':
    case 'surrender':
      return applyPanicCommand(state, command, rules);
    case 'prepare-threat':
    case 'retarget-threat':
    case 'execute-threat':
      return applyThreatCommand(state, command, rules);
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

function assertUnitPools(unit: CombatUnitState, rules: CombatRules): void {
  invariant(
    unit.health >= 0 && unit.health <= unit.attributes.health,
    `${unit.id} health is invalid`,
  );
  invariant(unit.armor >= 0 && unit.armor <= unit.attributes.armor, `${unit.id} armor is invalid`);
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
    if (state.rulesetId === M1_DOMAIN_BRIDGE_V3_RULESET_ID)
      validateCombatCapabilities(unit.capabilities, state.rulesetId);
    weaponProfile(rules, unit.weaponId);
    assertUnitPools(unit, rules);
    if (unit.status === 'active') {
      invariant(unit.health > 0, `${unit.id} cannot be active without health`);
      validateUnitPosition(unit, mapKeys, blockedKeys, activePositions, 'active');
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
