import { previewWeaponDamage } from './damage-preview.js';
import { isSpriteS4Ruleset } from './rules.js';
import { isCombatPanicked } from './rules.js';
import { compareHex, hexDistance, hexEquals, hexNeighbors } from './hex.js';
import { combatReactionControllers } from './reaction.js';
import { previewCombatMovement, prototypeLineOfSight } from './sprite-prototype.js';
import { combatRules, weaponProfile } from './rules.js';
import {
  commandId,
  type BattleState,
  type CombatCommand,
  type CombatEscapePlan,
  type CombatThreat,
  type CombatUnitState,
  type UnitId,
} from './types.js';

export { isCombatPanicked } from './rules.js';

/** Reachability ignores current AP/stamina; resource affordability only limits this activation's prefix. */
export function findCombatEscapePlan(
  state: BattleState,
  actor: CombatUnitState,
  safe = true,
): CombatEscapePlan | undefined {
  const exits = state.sides.find((side) => side.id === actor.sideId)?.retreatHexes ?? [];
  const hazards = safe
    ? state.map.hexes.filter(
        (hex) =>
          state.map.tiles?.some((tile) => hexEquals(tile, hex) && tile.terrain === 'fire') ||
          hexNeighbors(hex).some(
            (next) => combatReactionControllers(state, actor, hex, next).length > 0,
          ),
      )
    : [];
  // A controlled origin stays searchable, but its departure reaction disqualifies a safe path.
  const map = {
    ...state.map,
    blocked: [...state.map.blocked, ...hazards.filter((hex) => !hexEquals(hex, actor.position))],
  };
  const planningState: BattleState = {
    ...state,
    map,
    activation: {
      id: state.activation!.id,
      unitId: actor.id,
      remainingActionPoints: Number.MAX_SAFE_INTEGER,
    },
    units: state.units.map((unit) =>
      unit.id === actor.id ? { ...actor, stamina: Number.MAX_SAFE_INTEGER } : unit,
    ),
  };
  const movement = previewCombatMovement(planningState);
  return exits
    .flatMap((exit) => {
      if (hazards.some((hex) => hexEquals(hex, exit))) return [];
      if (hexEquals(exit, actor.position)) return [{ exit: { ...exit }, path: [], safe }];
      const option = movement.find((move) => hexEquals(move.to, exit));
      return option === undefined || (safe && (option.reactions?.length ?? 0) > 0)
        ? []
        : [{ exit: { ...exit }, path: option.path, safe }];
    })
    .toSorted((a, b) => a.path.length - b.path.length || compareHex(a.exit, b.exit))[0];
}

export function canCombatSurrender(state: BattleState, actor: CombatUnitState): boolean {
  return (
    isCombatPanicked(state, actor) &&
    actor.moralePolicy === 'human' &&
    findCombatEscapePlan(state, actor) === undefined &&
    state.units.some(
      (unit) =>
        unit.status === 'active' &&
        unit.sideId !== actor.sideId &&
        unit.moralePolicy === 'human' &&
        unit.incorporeal !== true &&
        !isCombatPanicked(state, unit),
    )
  );
}

export function createCombatThreat(
  state: BattleState,
  actor: CombatUnitState,
  target: CombatUnitState,
  retargeted: boolean,
): CombatThreat {
  const weapon = weaponProfile(combatRules(state.rulesetId), actor.weaponId);
  return {
    targetId: target.id,
    targetHex: { ...target.position },
    range: 2,
    damage: {
      minimum: Math.max(1, weapon.baseDamage - weapon.damageVariance),
      maximum: weapon.baseDamage + weapon.damageVariance,
    },
    retargeted,
    responseReceived: false,
  };
}

export interface CombatThreatPreview {
  readonly targetId: UnitId;
  readonly targetHex: CombatUnitState['position'];
  readonly range: 2;
  readonly actionPointCost: number;
  readonly staminaCost: number;
  readonly damage: {
    readonly health: { readonly minimum: number; readonly maximum: number };
    readonly armor: { readonly minimum: number; readonly maximum: number };
  };
  readonly action: 'prepare-threat' | 'retarget-threat' | 'execute-threat';
}

function previewThreatAction(
  actor: CombatUnitState,
  target: CombatUnitState,
): CombatThreatPreview['action'] | undefined {
  const threat = actor.threat;
  if (threat === undefined) return 'prepare-threat';
  const sameTarget = threat.targetId === target.id && hexEquals(threat.targetHex, target.position);
  if (sameTarget && threat.responseReceived) return 'execute-threat';
  if (!sameTarget && !threat.retargeted && threat.responseReceived) return 'retarget-threat';
  return undefined;
}

function canThreatenTarget(
  state: BattleState,
  actor: CombatUnitState,
  target: CombatUnitState,
): boolean {
  return (
    target.status === 'active' &&
    target.sideId !== actor.sideId &&
    target.incorporeal !== true &&
    hexDistance(actor.position, target.position) <= 2 &&
    prototypeLineOfSight(state, actor.position, target.position)
  );
}

export function previewCombatThreats(state: BattleState): readonly CombatThreatPreview[] {
  if (!isSpriteS4Ruleset(state.rulesetId) || state.status !== 'active' || state.activation === null)
    return [];
  const actor = state.units.find((unit) => unit.id === state.activation?.unitId);
  if (actor?.threatProfile !== 'mill-slam' || isCombatPanicked(state, actor)) return [];
  return state.units
    .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .flatMap((target) => {
      const preview = previewThreatTarget(state, actor, target);
      return preview === undefined ? [] : [preview];
    });
}

function previewThreatTarget(
  state: BattleState,
  actor: CombatUnitState,
  target: CombatUnitState,
): CombatThreatPreview | undefined {
  const rules = combatRules(state.rulesetId);
  const weapon = weaponProfile(rules, actor.weaponId);
  if (!canThreatenTarget(state, actor, target)) return undefined;
  const action = previewThreatAction(actor, target);
  if (action === undefined) return undefined;
  const actionPointCost = action === 'prepare-threat' ? 2 : action === 'retarget-threat' ? 0 : 4;
  const staminaCost =
    action === 'prepare-threat' ? 8 : action === 'retarget-threat' ? 0 : weapon.staminaCost;
  if (state.activation!.remainingActionPoints < actionPointCost || actor.stamina < staminaCost)
    return undefined;
  return {
    targetId: target.id,
    targetHex: { ...target.position },
    range: 2,
    actionPointCost,
    staminaCost,
    action,
    damage: previewWeaponDamage(target, weapon, rules),
  };
}

export function choosePanicCombatCommand(state: BattleState): CombatCommand | undefined {
  const actor = state.units.find((unit) => unit.id === state.activation?.unitId);
  if (actor === undefined || state.activation === null || !isCombatPanicked(state, actor))
    return undefined;
  return {
    type: canCombatSurrender(state, actor) ? 'surrender' : 'flee',
    actorId: actor.id,
    activationId: state.activation.id,
    commandId: commandId(`ai:${state.activation.id}:${state.revision}:panic`),
  };
}

export function choosePrototypeSpecialCommand(state: BattleState): CombatCommand | undefined {
  const panic = choosePanicCombatCommand(state);
  if (panic !== undefined) return panic;
  const actor = state.units.find((unit) => unit.id === state.activation?.unitId);
  if (
    !isSpriteS4Ruleset(state.rulesetId) ||
    actor?.threatProfile !== 'mill-slam' ||
    state.activation === null
  )
    return undefined;
  const option = previewCombatThreats(state)[0];
  const base = {
    actorId: actor.id,
    activationId: state.activation.id,
    commandId: commandId(`ai:${state.activation.id}:${state.revision}:threat`),
  };
  if (option !== undefined)
    return option.action === 'execute-threat'
      ? { ...base, type: 'execute-threat' }
      : { ...base, type: option.action, targetId: option.targetId };
  if (actor.threat !== undefined) {
    if (!actor.threat.responseReceived) return { ...base, type: 'wait' };
    const target = state.units.find((unit) => unit.id === actor.threat?.targetId);
    if (
      target?.status !== 'active' ||
      !hexEquals(actor.threat.targetHex, target.position) ||
      hexDistance(actor.position, target.position) > 2 ||
      !prototypeLineOfSight(state, actor.position, target.position)
    )
      return { ...base, type: 'execute-threat' };
    return { ...base, type: 'wait' };
  }
  return undefined;
}
