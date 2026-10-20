import { isTacticalV3Ruleset } from './rules.js';
import { isSpriteS4Ruleset } from './rules.js';
import { hexDistance } from './hex.js';
import {
  combatAttackDamage,
  combatActionAllowed,
  combatGuardedDamage,
  combatHitChance,
  combatRules,
  compareCombatUnitIds,
  weaponProfile,
  SPRITE_PROTOTYPE_FIRE_DAMAGE,
} from './rules.js';
import { isCombatPanicked } from './rules.js';
import { type BattleState, type CombatUnitState, type Hex, type UnitId } from './types.js';

export interface CombatReactionPreview {
  readonly attackerId: UnitId;
  readonly hitChance: number;
  readonly damage: {
    readonly health: { readonly minimum: number; readonly maximum: number };
    readonly armor: { readonly minimum: number; readonly maximum: number };
  };
}

export function combatReactionControllers(
  state: BattleState,
  mover: CombatUnitState,
  from: Hex,
  to: Hex,
): readonly CombatUnitState[] {
  if (!isSpriteS4Ruleset(state.rulesetId) || mover.incorporeal === true) return [];
  return state.units
    .filter(
      (unit) =>
        unit.status === 'active' &&
        combatActionAllowed(state, unit, 'attack') &&
        unit.sideId !== mover.sideId &&
        unit.incorporeal !== true &&
        unit.weaponId !== 'bow' &&
        unit.threatProfile !== 'mill-slam' &&
        !unit.reactionSpent &&
        !isCombatPanicked(state, unit) &&
        hexDistance(unit.position, from) === 1 &&
        hexDistance(unit.position, to) > 1,
    )
    .toSorted((a, b) => compareCombatUnitIds(state.rulesetId, a.id, b.id));
}

export function previewCombatReactions(
  state: BattleState,
  mover: CombatUnitState,
  path: readonly Hex[],
): readonly CombatReactionPreview[] {
  const seen = new Set<UnitId>();
  const previews: CombatReactionPreview[] = [];
  const rules = combatRules(state.rulesetId);
  let from = mover.position;
  let minimumArmor = mover.armor;
  let minimumHealth = mover.health;
  let maximumHealth = mover.health;
  for (const to of path) {
    for (const controller of combatReactionControllers(state, mover, from, to)) {
      if (seen.has(controller.id)) continue;
      seen.add(controller.id);
      const weapon = weaponProfile(rules, controller.weaponId);
      const min = combatAttackDamage(
        combatGuardedDamage(Math.max(1, weapon.baseDamage - weapon.damageVariance), mover, rules),
        mover.armor,
        weapon,
      );
      const max = combatAttackDamage(
        combatGuardedDamage(weapon.baseDamage + weapon.damageVariance, mover, rules),
        minimumArmor,
        weapon,
      );
      previews.push({
        attackerId: controller.id,
        hitChance: combatHitChance(controller, { ...mover, position: from }, rules),
        damage: {
          health: {
            minimum: minimumHealth === 0 ? 0 : Math.min(minimumHealth, min.healthDamage),
            maximum: Math.min(maximumHealth, max.healthDamage),
          },
          armor: {
            minimum: Math.min(minimumArmor, min.armorDamage),
            maximum: Math.max(min.armorDamage, max.armorDamage),
          },
        },
      });
      minimumArmor = Math.max(0, minimumArmor - max.armorDamage);
      minimumHealth = Math.max(0, minimumHealth - max.healthDamage);
    }
    const entersFire =
      state.map.tiles?.find((tile) => tile.q === to.q && tile.r === to.r)?.terrain === 'fire';
    if (isTacticalV3Ruleset(state.rulesetId) && entersFire) {
      minimumHealth = Math.max(0, minimumHealth - SPRITE_PROTOTYPE_FIRE_DAMAGE);
      maximumHealth = Math.max(0, maximumHealth - SPRITE_PROTOTYPE_FIRE_DAMAGE);
    }
    from = to;
  }
  return previews;
}
