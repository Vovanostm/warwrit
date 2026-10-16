import { invariant } from '../primitives.js';
import { applyCombatCommand, assertBattleState, startBattle } from './engine.js';
import { compareHex, findPath, hexDistance, hexKey } from './hex.js';
import { combatRules, compareCombatUnitIds, type CombatRules, weaponProfile } from './rules.js';
import {
  findPrototypeAttackRoute,
  previewCombatAttacks,
  previewCombatMovement,
  prototypeLineOfSight,
} from './sprite-prototype.js';
import { SPRITE_PROTOTYPE_RULESET_ID } from './types.js';
import {
  commandId,
  type AiDoctrine,
  type BattleSetup,
  type BattleState,
  type CombatCommand,
  type CombatEvent,
  type CombatSimulation,
  type CombatUnitState,
  type Hex,
  type SideId,
} from './types.js';

function activeActor(state: BattleState): CombatUnitState {
  invariant(state.status === 'active' && state.activation !== null, 'AI requires an active battle');
  const actor = state.units.find(({ id }) => id === state.activation?.unitId);
  invariant(actor?.status === 'active', 'AI activation must reference an active actor');
  return actor;
}

function commandBase(state: BattleState, suffix: string) {
  const actor = activeActor(state);
  invariant(state.activation !== null, 'AI command requires an activation');
  return {
    commandId: commandId(`ai:${state.activation.id}:${state.revision}:${suffix}`),
    activationId: state.activation.id,
    actorId: actor.id,
  };
}

function enemiesOf(state: BattleState, actor: CombatUnitState): readonly CombatUnitState[] {
  return state.units
    .filter(({ sideId, status }) => status === 'active' && sideId !== actor.sideId)
    .toSorted(
      (left, right) =>
        left.health - right.health ||
        hexDistance(actor.position, left.position) - hexDistance(actor.position, right.position) ||
        compareCombatUnitIds(state.rulesetId, left.id, right.id),
    );
}

function occupiedWithout(state: BattleState, actor: CombatUnitState): ReadonlySet<string> {
  return new Set(
    state.units
      .filter(({ id, status }) => status === 'active' && id !== actor.id)
      .map(({ position }) => hexKey(position)),
  );
}

function availableMoveSteps(state: BattleState, actor: CombatUnitState): number {
  invariant(state.activation !== null, 'Movement requires an activation');
  const rules = combatRules(state.rulesetId);
  return Math.min(
    Math.floor(state.activation.remainingActionPoints / rules.movement.actionPointsPerHex),
    Math.floor(actor.stamina / rules.movement.staminaPerHex),
  );
}

function retreatPath(state: BattleState, actor: CombatUnitState): readonly Hex[] | undefined {
  const side = state.sides.find(({ id }) => id === actor.sideId);
  invariant(side !== undefined, `Unknown side ${actor.sideId}`);
  const occupied = occupiedWithout(state, actor);
  return side.retreatHexes
    .map((target) => findPath(state.map, actor.position, target, { occupied }))
    .filter((path): path is readonly Hex[] => path !== undefined)
    .toSorted((left, right) => left.length - right.length || comparePaths(left, right))[0];
}

function comparePaths(left: readonly Hex[], right: readonly Hex[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftHex = left[index];
    const rightHex = right[index];
    invariant(leftHex !== undefined && rightHex !== undefined, 'Path index must exist');
    const difference = leftHex.q - rightHex.q || leftHex.r - rightHex.r;
    if (difference !== 0) {
      return difference;
    }
  }
  return left.length - right.length;
}

function isAtRetreatEdge(state: BattleState, actor: CombatUnitState): boolean {
  const side = state.sides.find(({ id }) => id === actor.sideId);
  invariant(side !== undefined, `Unknown side ${actor.sideId}`);
  return side.retreatHexes.some(({ q, r }) => q === actor.position.q && r === actor.position.r);
}

function shouldRetreat(actor: CombatUnitState, rules: CombatRules): boolean {
  return (
    actor.health * 100 <= actor.attributes.health * rules.ai.survivorHealthThresholdPercent ||
    actor.morale <= rules.ai.survivorMoraleThreshold ||
    actor.wounds.some(({ severity }) => severity === 'severe')
  );
}

function movementTowardEnemy(
  state: BattleState,
  actor: CombatUnitState,
): { readonly to: Hex; readonly target: CombatUnitState } | undefined {
  const weapon = weaponProfile(combatRules(state.rulesetId), actor.weaponId);
  const occupied = occupiedWithout(state, actor);
  const candidates = enemiesOf(state, actor)
    .map((target) => ({
      target,
      path: findPath(state.map, actor.position, target.position, {
        occupied,
        allowOccupiedGoal: true,
      }),
    }))
    .filter(
      (
        candidate,
      ): candidate is { readonly target: CombatUnitState; readonly path: readonly Hex[] } =>
        candidate.path !== undefined,
    )
    .toSorted(
      (left, right) =>
        left.path.length - right.path.length ||
        compareCombatUnitIds(state.rulesetId, left.target.id, right.target.id),
    );

  const candidate = candidates[0];
  if (candidate === undefined) {
    return undefined;
  }
  const requiredSteps = Math.max(0, candidate.path.length - weapon.maximumRange);
  const steps = Math.min(requiredSteps, availableMoveSteps(state, actor));
  if (steps <= 0) {
    return undefined;
  }
  const destination = candidate.path[steps - 1];
  invariant(destination !== undefined, 'AI movement path must contain its destination');
  return { to: destination, target: candidate.target };
}

function prototypeMovementTowardEnemy(
  state: BattleState,
  actor: CombatUnitState,
): { readonly to: Hex; readonly target: CombatUnitState } | undefined {
  invariant(state.activation !== null, 'Movement requires an activation');
  const remainingActionPoints = state.activation.remainingActionPoints;
  const rules = combatRules(state.rulesetId);
  const weapon = weaponProfile(rules, actor.weaponId);
  const route = findPrototypeAttackRoute(state);
  if (route === undefined || route.path.length === 0) return undefined;
  const target = state.units.find(({ id, status }) => id === route.targetId && status === 'active');
  if (target === undefined) return undefined;
  const moves = previewCombatMovement(state);
  const prefixes = route.path.flatMap((to, index) => {
    const prefix = route.path.slice(0, index + 1);
    const move = moves.find(
      (candidate) =>
        candidate.to.q === to.q &&
        candidate.to.r === to.r &&
        candidate.path.length === prefix.length &&
        candidate.path.every(
          (hex, pathIndex) => hex.q === prefix[pathIndex]?.q && hex.r === prefix[pathIndex]?.r,
        ),
    );
    if (move === undefined) return [];
    const distance = hexDistance(move.to, target.position);
    const canAttackAfterMove =
      distance >= weapon.minimumRange &&
      distance <= weapon.maximumRange &&
      remainingActionPoints - move.actionPointCost >= weapon.actionPointCost &&
      actor.stamina - move.staminaCost >= weapon.staminaCost &&
      (actor.weaponId !== 'bow' || prototypeLineOfSight(state, move.to, target.position));
    return [{ move, index, canAttackAfterMove }];
  });
  const best = prefixes.toSorted(
    (left, right) =>
      Number(right.canAttackAfterMove) - Number(left.canAttackAfterMove) ||
      right.index - left.index ||
      left.move.actionPointCost - right.move.actionPointCost ||
      left.move.staminaCost - right.move.staminaCost ||
      compareHex(left.move.to, right.move.to),
  )[0];
  return best === undefined ? undefined : { to: best.move.to, target };
}

function prototypeRetreatCommand(
  state: BattleState,
  actor: CombatUnitState,
  rules: CombatRules,
): CombatCommand {
  invariant(state.activation !== null, 'Retreat command requires an activation');
  const side = state.sides.find(({ id }) => id === actor.sideId);
  invariant(side !== undefined, `Unknown side ${actor.sideId}`);
  const retreat = side.retreatHexes
    .map((position) => ({ position, distance: hexDistance(actor.position, position) }))
    .toSorted(
      (left, right) => left.distance - right.distance || compareHex(left.position, right.position),
    )[0];
  const move = previewCombatMovement(state)
    .filter(({ to }) =>
      side.retreatHexes.some((edge) => hexDistance(to, edge) < hexDistance(actor.position, edge)),
    )
    .toSorted((left, right) => {
      const leftDistance = Math.min(...side.retreatHexes.map((edge) => hexDistance(left.to, edge)));
      const rightDistance = Math.min(
        ...side.retreatHexes.map((edge) => hexDistance(right.to, edge)),
      );
      return (
        leftDistance - rightDistance ||
        left.actionPointCost - right.actionPointCost ||
        left.staminaCost - right.staminaCost ||
        compareHex(left.to, right.to)
      );
    })[0];
  if (
    move !== undefined &&
    (retreat === undefined || hexDistance(move.to, retreat.position) < retreat.distance)
  ) {
    return { type: 'move', to: move.to, ...commandBase(state, 'retreat-move') };
  }
  return state.activation.remainingActionPoints >= rules.defend.actionPointCost &&
    actor.stamina >= rules.defend.staminaCost
    ? { type: 'defend', ...commandBase(state, 'retreat-defend') }
    : { type: 'wait', ...commandBase(state, 'retreat-wait') };
}

function affordableLegacyTarget(
  state: BattleState,
  actor: CombatUnitState,
  weapon: ReturnType<typeof weaponProfile>,
): CombatUnitState | undefined {
  return state.rulesetId === SPRITE_PROTOTYPE_RULESET_ID
    ? undefined
    : enemiesOf(state, actor).find((enemy) => {
        const distance = hexDistance(actor.position, enemy.position);
        return (
          distance >= weapon.minimumRange &&
          distance <= weapon.maximumRange &&
          state.activation !== null &&
          state.activation.remainingActionPoints >= weapon.actionPointCost &&
          actor.stamina >= weapon.staminaCost
        );
      });
}

function survivorRetreatCommand(
  state: BattleState,
  actor: CombatUnitState,
  rules: CombatRules,
): CombatCommand | undefined {
  if (isAtRetreatEdge(state, actor)) {
    return { type: 'retreat', ...commandBase(state, 'retreat') };
  }
  if (state.rulesetId === SPRITE_PROTOTYPE_RULESET_ID)
    return prototypeRetreatCommand(state, actor, rules);
  const path = retreatPath(state, actor);
  const steps = Math.min(path?.length ?? 0, availableMoveSteps(state, actor));
  if (path !== undefined && steps > 0) {
    const destination = path[steps - 1];
    invariant(destination !== undefined, 'Retreat path must contain its destination');
    return { type: 'move', to: destination, ...commandBase(state, 'retreat-move') };
  }
  return undefined;
}

export function chooseAiCommand(
  state: BattleState,
  doctrine: AiDoctrine = 'aggressive',
): CombatCommand {
  const actor = activeActor(state);
  const rules = combatRules(state.rulesetId);
  const weapon = weaponProfile(rules, actor.weaponId);
  invariant(state.activation !== null, 'AI command requires an activation');

  const retreat =
    doctrine === 'survivor' && shouldRetreat(actor, rules)
      ? survivorRetreatCommand(state, actor, rules)
      : undefined;
  if (retreat !== undefined) return retreat;

  if (state.rulesetId === SPRITE_PROTOTYPE_RULESET_ID) {
    const attack = previewCombatAttacks(state)[0];
    if (attack !== undefined) {
      return {
        type: 'attack',
        targetId: attack.targetId,
        ...commandBase(state, `attack:${attack.targetId}`),
      };
    }
  }
  const target = affordableLegacyTarget(state, actor, weapon);
  if (target !== undefined) {
    return {
      type: 'attack',
      targetId: target.id,
      ...commandBase(state, `attack:${target.id}`),
    };
  }

  const movement =
    state.rulesetId === SPRITE_PROTOTYPE_RULESET_ID
      ? prototypeMovementTowardEnemy(state, actor)
      : movementTowardEnemy(state, actor);
  if (movement !== undefined) {
    return {
      type: 'move',
      to: movement.to,
      ...commandBase(state, `move:${movement.target.id}`),
    };
  }

  if (
    state.activation.remainingActionPoints >= rules.defend.actionPointCost &&
    actor.stamina >= rules.defend.staminaCost
  ) {
    return { type: 'defend', ...commandBase(state, 'defend') };
  }
  return { type: 'wait', ...commandBase(state, 'wait') };
}

export interface RunAiBattleOptions {
  readonly doctrines?: readonly {
    readonly sideId: SideId;
    readonly doctrine: AiDoctrine;
  }[];
  readonly maximumCommands?: number;
  readonly captureEvents?: boolean;
}

export function runAiBattle(
  setup: BattleSetup,
  options: RunAiBattleOptions = {},
): CombatSimulation {
  const started = startBattle(setup);
  let state = started.state;
  const commands: CombatCommand[] = [];
  const captureEvents = options.captureEvents !== false;
  const events: CombatEvent[] = captureEvents ? [...started.events] : [];
  const rules = combatRules(setup.rulesetId);
  const maximumCommands = options.maximumCommands ?? rules.limits.maximumCommands;
  invariant(
    Number.isInteger(maximumCommands) && maximumCommands > 0,
    'Maximum AI command count must be a positive integer',
  );

  while (state.status === 'active' && commands.length < maximumCommands) {
    const actor = activeActor(state);
    const doctrine =
      options.doctrines?.find(({ sideId }) => sideId === actor.sideId)?.doctrine ?? 'aggressive';
    const command = chooseAiCommand(state, doctrine);
    const result = applyCombatCommand(state, command);
    invariant(
      result.ok,
      `AI generated invalid ${command.type} command: ${result.ok ? '' : result.error.code}`,
    );
    state = result.state;
    commands.push(command);
    if (captureEvents) {
      events.push(...result.events);
    }
  }

  invariant(state.status === 'resolved', `AI battle exceeded ${maximumCommands} commands`);
  assertBattleState(state);
  return {
    state,
    commands,
    events,
    replay: {
      schemaVersion: setup.schemaVersion,
      setup,
      commands,
    },
  };
}
