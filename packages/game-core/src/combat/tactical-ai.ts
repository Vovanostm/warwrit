import { invariant } from '../primitives.js';
import { chooseAiCommand } from './ai.js';
import { compareHex, hexDistance, hexKey } from './hex.js';
import {
  combatRules,
  compareCombatUnitIds,
  isCombatPanicked,
  isSpritePrototypeRuleset,
  weaponProfile,
} from './rules.js';
import { previewCombatSkills } from './skills.js';
import { choosePrototypeSpecialCommand } from './sprite-s4.js';
import {
  findPrototypeAttackRoute,
  previewCombatAttacks,
  previewCombatMovement,
  type CombatAttackPreview,
  type CombatMovementPreview,
} from './sprite-prototype.js';
import {
  SPRITE_PROTOTYPE_V3_RULESET_ID,
  commandId,
  type BattleState,
  type CombatCommand,
  type CombatSkillId,
  type CombatUnitState,
} from './types.js';

function activeActor(state: BattleState): CombatUnitState {
  invariant(
    state.status === 'active' && state.activation !== null,
    'Tactical AI requires an active battle',
  );
  const actor = state.units.find(({ id }) => id === state.activation?.unitId);
  invariant(actor?.status === 'active', 'Tactical AI requires an active actor');
  return actor;
}

function commandBase(state: BattleState, suffix: string) {
  invariant(state.activation !== null, 'Tactical command requires an activation');
  return {
    commandId: commandId(`ai:${state.activation.id}:${state.revision}:${suffix}`),
    activationId: state.activation.id,
    actorId: state.activation.unitId,
  };
}

function afterPreviewedMove(
  state: BattleState,
  actor: CombatUnitState,
  move: CombatMovementPreview,
): BattleState {
  invariant(state.activation !== null, 'Tactical movement requires an activation');
  return {
    ...state,
    activation: {
      ...state.activation,
      remainingActionPoints: state.activation.remainingActionPoints - move.actionPointCost,
    },
    units: state.units.map((unit) =>
      unit.id === actor.id
        ? {
            ...unit,
            position: move.to,
            stamina: unit.stamina - move.staminaCost,
            health: unit.health - move.fireDamage - expectedMovementReactionDamage(move, 'health'),
            armor: Math.max(0, unit.armor - expectedMovementReactionDamage(move, 'armor')),
          }
        : unit,
    ),
  };
}

/** A reply projection is a resource envelope, not a predicted turn or RNG result. */
function replyState(state: BattleState, enemy: CombatUnitState): BattleState {
  invariant(state.activation !== null, 'Tactical reply requires an activation');
  const rules = combatRules(state.rulesetId);
  return {
    ...state,
    activation: {
      ...state.activation,
      unitId: enemy.id,
      remainingActionPoints: rules.actionPointsPerActivation,
    },
    units: state.units.map((unit) =>
      unit.id === enemy.id
        ? {
            ...unit,
            guarding: false,
            stamina: Math.min(
              unit.attributes.stamina,
              unit.stamina + rules.recovery.staminaPerActivation,
            ),
          }
        : unit,
    ),
  };
}

function expectedPreviewDamage(
  attack: Pick<CombatAttackPreview, 'damage' | 'hitChance'>,
  kind: 'health' | 'armor',
): number {
  const range = attack.damage[kind];
  // The public preview exposes endpoints, so this is a midpoint estimate.
  return ((range.minimum + range.maximum) * attack.hitChance) / 200;
}

function expectedMovementReactionDamage(
  move: CombatMovementPreview,
  kind: 'health' | 'armor',
): number {
  return (move.reactions ?? []).reduce(
    (total, reaction) => total + expectedPreviewDamage(reaction, kind),
    0,
  );
}

function expectedMovementDamage(move: CombatMovementPreview): number {
  return (
    move.fireDamage +
    expectedMovementReactionDamage(move, 'health') +
    expectedMovementReactionDamage(move, 'armor')
  );
}

interface TacticalAttack {
  readonly skillId?: CombatSkillId;
  readonly attack: CombatAttackPreview;
  readonly target: CombatUnitState;
  readonly move?: CombatMovementPreview;
  readonly killChance: number;
  readonly value: number;
  readonly healthDamage: number;
  readonly armorDamage: number;
  readonly targetThreat: number;
}

function tacticalAttackOptions(
  state: BattleState,
  actor: CombatUnitState,
  move?: CombatMovementPreview,
): TacticalAttack[] {
  const normal = previewCombatAttacks(state).map((attack) =>
    tacticalAttack(state, actor, attack, move),
  );
  if (state.rulesetId !== SPRITE_PROTOTYPE_V3_RULESET_ID) return normal;
  const skills = previewCombatSkills(state).flatMap((skill) => {
    if (
      !skill.legal ||
      skill.target !== 'enemy' ||
      skill.damage === undefined ||
      skill.hitChance === undefined
    )
      return [];
    return [
      {
        ...tacticalAttack(
          state,
          actor,
          {
            targetId: skill.targetId,
            hitChance: skill.hitChance,
            damage: skill.damage,
            actionPointCost: skill.actionPointCost,
            staminaCost: skill.staminaCost,
          },
          move,
        ),
        skillId: skill.skillId,
      },
    ];
  });
  return [...normal, ...skills];
}

function tacticalAttack(
  projected: BattleState,
  actor: CombatUnitState,
  attack: CombatAttackPreview,
  move?: CombatMovementPreview,
): TacticalAttack {
  const target = projected.units.find(({ id }) => id === attack.targetId);
  invariant(target !== undefined, 'Previewed tactical target must exist');
  const killChance = attack.damage.health.minimum >= target.health ? attack.hitChance : 0;
  const healthDamage = expectedPreviewDamage(attack, 'health');
  const armorDamage = expectedPreviewDamage(attack, 'armor');
  let replyDamage = 0;
  let targetThreat = 0;
  for (const enemy of projected.units) {
    if (enemy.status !== 'active' || enemy.sideId === actor.sideId) continue;
    const reply = previewCombatAttacks(replyState(projected, enemy)).find(
      ({ targetId }) => targetId === actor.id,
    );
    if (reply === undefined) continue;
    const threat = expectedPreviewDamage(reply, 'health');
    replyDamage += threat * (enemy.id === target.id ? 1 - killChance / 100 : 1);
    if (enemy.id === target.id) {
      targetThreat = threat + expectedPreviewDamage(reply, 'armor');
    }
  }
  return {
    attack,
    target,
    ...(move === undefined ? {} : { move }),
    killChance,
    value:
      healthDamage +
      armorDamage -
      replyDamage -
      (move === undefined ? 0 : expectedMovementDamage(move)),
    healthDamage,
    armorDamage,
    targetThreat,
  };
}

function compareTacticalAttacks(state: BattleState, left: TacticalAttack, right: TacticalAttack) {
  return (
    right.killChance - left.killChance ||
    right.value - left.value ||
    right.healthDamage - left.healthDamage ||
    right.armorDamage - left.armorDamage ||
    right.attack.hitChance - left.attack.hitChance ||
    right.targetThreat - left.targetThreat ||
    (left.move?.actionPointCost ?? 0) - (right.move?.actionPointCost ?? 0) ||
    (left.move?.staminaCost ?? 0) - (right.move?.staminaCost ?? 0) ||
    compareHex(
      left.move?.to ?? activeActor(state).position,
      right.move?.to ?? activeActor(state).position,
    ) ||
    compareCombatUnitIds(state.rulesetId, left.target.id, right.target.id)
  );
}

function holdAgainstKiting(state: BattleState, actor: CombatUnitState): boolean {
  // Waiting for an approach is a duel tactic: another enemy can punish the hold.
  if (
    state.units.filter((unit) => unit.status === 'active' && unit.sideId !== actor.sideId)
      .length !== 1
  ) {
    return false;
  }
  const rules = combatRules(state.rulesetId);
  const weapon = weaponProfile(rules, actor.weaponId);
  if (weapon.maximumRange !== 1 || weapon.actionPointCost < rules.actionPointsPerActivation) {
    return false;
  }
  return state.units.some((enemy) => {
    if (
      enemy.status !== 'active' ||
      enemy.sideId === actor.sideId ||
      enemy.incorporeal === true ||
      hexDistance(actor.position, enemy.position) !== 2
    )
      return false;
    const enemyWeapon = weaponProfile(rules, enemy.weaponId);
    if (enemyWeapon.maximumRange !== 1) return false;
    const reply = replyState(state, enemy);
    const replyActor = activeActor(reply);
    return previewCombatMovement(reply).some((move) => {
      if (move.fireDamage > 0 || move.path.length !== 1) return false;
      const moved = afterPreviewedMove(reply, replyActor, move);
      const attack = previewCombatAttacks(moved).find(({ targetId }) => targetId === actor.id);
      // Spending the approach + attack leaves no ordinary step back.
      return (
        attack !== undefined &&
        move.actionPointCost + attack.actionPointCost === rules.actionPointsPerActivation
      );
    });
  });
}

function tacticalHoldCommand(state: BattleState, actor: CombatUnitState): CombatCommand {
  invariant(state.activation !== null, 'Tactical hold requires an activation');
  const rules = combatRules(state.rulesetId);
  if (state.rulesetId === SPRITE_PROTOTYPE_V3_RULESET_ID) {
    const brace = previewCombatSkills(state).find(
      (skill) => skill.skillId === 'shield-brace' && skill.legal,
    );
    const threatened = state.units.some(
      (enemy) =>
        enemy.status === 'active' &&
        enemy.sideId !== actor.sideId &&
        previewCombatAttacks(replyState(state, enemy)).some(
          (attack) => attack.targetId === actor.id,
        ),
    );
    if (brace !== undefined && threatened)
      return {
        type: 'use-skill',
        skillId: 'shield-brace',
        targetId: actor.id,
        ...commandBase(state, 'shield-brace'),
      };
  }
  return !actor.guarding &&
    state.activation.remainingActionPoints >= rules.defend.actionPointCost &&
    actor.stamina >= rules.defend.staminaCost
    ? { type: 'defend', ...commandBase(state, 'tactical-defend') }
    : { type: 'wait', ...commandBase(state, 'tactical-wait') };
}

/** Opt-in sprite policy. Legacy rulesets and chooseAiCommand retain their existing behavior. */
export function chooseTacticalCombatCommand(state: BattleState): CombatCommand {
  if (!isSpritePrototypeRuleset(state.rulesetId)) return chooseAiCommand(state);
  const special = choosePrototypeSpecialCommand(state);
  if (special !== undefined) return special;
  const actor = activeActor(state);
  const v3 = state.rulesetId === SPRITE_PROTOTYPE_V3_RULESET_ID;
  const rescue = v3
    ? previewCombatSkills(state).find((skill) => {
        const target = state.units.find((unit) => unit.id === skill.targetId);
        return (
          skill.legal &&
          skill.skillId === 'rally' &&
          target !== undefined &&
          isCombatPanicked(state, target) &&
          !isCombatPanicked(state, { ...target, morale: target.morale + (skill.moraleGain ?? 0) })
        );
      })
    : undefined;
  if (rescue !== undefined)
    return {
      type: 'use-skill',
      skillId: 'rally',
      targetId: rescue.targetId,
      ...commandBase(state, `rally:${rescue.targetId}`),
    };
  const attacks = tacticalAttackOptions(state, actor);
  const moves = previewCombatMovement(state).filter(
    (move) =>
      move.fireDamage +
        (v3
          ? (move.reactions ?? []).reduce(
              (total, reaction) => total + reaction.damage.health.maximum,
              0,
            )
          : expectedMovementReactionDamage(move, 'health')) <
      actor.health,
  );
  for (const move of moves) {
    const projected = afterPreviewedMove(state, actor, move);
    attacks.push(...tacticalAttackOptions(projected, actor, move));
  }
  const best = attacks.toSorted((left, right) => compareTacticalAttacks(state, left, right))[0];
  if (v3 && (best?.killChance ?? 0) < 100) {
    const brace = previewCombatSkills(state).find(
      (skill) => skill.legal && skill.skillId === 'shield-brace',
    );
    const replyDamage = state.units.reduce((total, enemy) => {
      if (enemy.status !== 'active' || enemy.sideId === actor.sideId) return total;
      return (
        total +
        (previewCombatAttacks(replyState(state, enemy)).find(
          (attack) => attack.targetId === actor.id,
        )?.damage.health.maximum ?? 0)
      );
    }, 0);
    if (brace !== undefined && replyDamage >= actor.health)
      return {
        type: 'use-skill',
        skillId: 'shield-brace',
        targetId: actor.id,
        ...commandBase(state, 'shield-brace'),
      };
  }
  if (v3 && actor.weaponId === 'bow' && (best?.killChance ?? 0) < 100) {
    const danger = (position: BattleState) =>
      position.units.reduce((total, enemy) => {
        if (enemy.status !== 'active' || enemy.sideId === actor.sideId) return total;
        const reply = previewCombatAttacks(replyState(position, enemy)).find(
          (attack) => attack.targetId === actor.id,
        );
        return total + (reply?.damage.health.maximum ?? 0);
      }, 0);
    const currentDanger = danger(state);
    if (currentDanger >= actor.health) {
      const retreat = moves
        .filter((move) => move.fireDamage === 0 && (move.reactions?.length ?? 0) === 0)
        .map((move) => ({ move, danger: danger(afterPreviewedMove(state, actor, move)) }))
        .filter((candidate) => candidate.danger < currentDanger)
        .toSorted(
          (left, right) =>
            left.danger - right.danger ||
            left.move.actionPointCost - right.move.actionPointCost ||
            compareHex(left.move.to, right.move.to),
        )[0];
      if (retreat !== undefined)
        return { type: 'move', to: retreat.move.to, ...commandBase(state, 'ranged-escape') };
    }
  }
  if (best !== undefined) {
    return best.move === undefined
      ? best.skillId !== undefined
        ? {
            type: 'use-skill',
            skillId: best.skillId,
            targetId: best.target.id,
            ...commandBase(state, `skill:${best.skillId}:${best.target.id}`),
          }
        : {
            type: 'attack',
            targetId: best.target.id,
            ...commandBase(state, `tactical-attack:${best.target.id}`),
          }
      : {
          type: 'move',
          to: best.move.to,
          ...commandBase(state, `tactical-move:${best.target.id}`),
        };
  }
  if (holdAgainstKiting(state, actor)) return tacticalHoldCommand(state, actor);

  // Contact is already achieved. If no attack is affordable, preserve that
  // position for the next activation instead of pursuing a different enemy.
  if (findPrototypeAttackRoute(state)?.path.length === 0) {
    return tacticalHoldCommand(state, actor);
  }

  // Keep the existing fire-aware route owner, but compare each target's route
  // before technical IDs. Non-target enemies remain occupied obstacles.
  const routes = state.units
    .filter((unit) => unit.status === 'active' && unit.sideId !== actor.sideId)
    .flatMap((target) => {
      if (target.incorporeal === true) return [];
      const route = findPrototypeAttackRoute({
        ...state,
        units: state.units.map((unit) =>
          unit.sideId !== actor.sideId && unit.id !== target.id
            ? { ...unit, incorporeal: true }
            : unit,
        ),
      });
      if (route === undefined || route.path.length === 0) return [];
      const move = moves
        .filter(
          (candidate) =>
            candidate.path.length <= route.path.length &&
            candidate.path.every((hex, index) => hexKey(hex) === hexKey(route.path[index]!)),
        )
        .toSorted(
          (left, right) =>
            expectedMovementDamage(left) - expectedMovementDamage(right) ||
            right.path.length - left.path.length ||
            left.fireDamage - right.fireDamage ||
            compareHex(left.to, right.to),
        )[0];
      return move === undefined ? [] : [{ target, route, move }];
    })
    .toSorted(
      (left, right) =>
        expectedMovementDamage(left.move) - expectedMovementDamage(right.move) ||
        left.move.fireDamage - right.move.fireDamage ||
        left.route.path.length - right.route.path.length ||
        left.target.health - right.target.health ||
        left.target.armor - right.target.armor ||
        compareHex(left.target.position, right.target.position) ||
        compareCombatUnitIds(state.rulesetId, left.target.id, right.target.id),
    );
  const approach = routes[0];
  return approach === undefined
    ? tacticalHoldCommand(state, actor)
    : {
        type: 'move',
        to: approach.move.to,
        ...commandBase(state, `tactical-approach:${approach.target.id}`),
      };
}
