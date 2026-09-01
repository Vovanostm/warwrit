import { invariant } from '../primitives.js';
import { applyCombatCommand, assertBattleState, startBattle } from './engine.js';
import { findPath, hexDistance, hexKey } from './hex.js';
import { combatRules, type CombatRules, weaponProfile } from './rules.js';
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
        left.id.localeCompare(right.id),
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
        left.path.length - right.path.length || left.target.id.localeCompare(right.target.id),
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

export function chooseAiCommand(
  state: BattleState,
  doctrine: AiDoctrine = 'aggressive',
): CombatCommand {
  const actor = activeActor(state);
  const rules = combatRules(state.rulesetId);
  const weapon = weaponProfile(rules, actor.weaponId);
  invariant(state.activation !== null, 'AI command requires an activation');

  if (doctrine === 'survivor' && shouldRetreat(actor, rules)) {
    if (isAtRetreatEdge(state, actor)) {
      return { type: 'retreat', ...commandBase(state, 'retreat') };
    }
    const path = retreatPath(state, actor);
    const steps = Math.min(path?.length ?? 0, availableMoveSteps(state, actor));
    if (path !== undefined && steps > 0) {
      const destination = path[steps - 1];
      invariant(destination !== undefined, 'Retreat path must contain its destination');
      return { type: 'move', to: destination, ...commandBase(state, 'retreat-move') };
    }
  }

  const target = enemiesOf(state, actor).find((enemy) => {
    const distance = hexDistance(actor.position, enemy.position);
    return (
      distance >= weapon.minimumRange &&
      distance <= weapon.maximumRange &&
      state.activation !== null &&
      state.activation.remainingActionPoints >= weapon.actionPointCost &&
      actor.stamina >= weapon.staminaCost
    );
  });
  if (target !== undefined) {
    return {
      type: 'attack',
      targetId: target.id,
      ...commandBase(state, `attack:${target.id}`),
    };
  }

  const movement = movementTowardEnemy(state, actor);
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
