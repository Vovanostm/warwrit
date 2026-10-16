import {
  combatAttackDamage,
  combatGuardedDamage,
  type CombatRules,
  type WeaponProfile,
} from './rules.js';
import type { CombatUnitState } from './types.js';

/** Conditional-on-hit loss endpoints; no RNG is consumed by inspection. */
export function previewWeaponDamage(
  target: CombatUnitState,
  weapon: WeaponProfile,
  rules: CombatRules,
) {
  const low = combatAttackDamage(
    combatGuardedDamage(Math.max(1, weapon.baseDamage - weapon.damageVariance), target, rules),
    target.armor,
    weapon,
  );
  const high = combatAttackDamage(
    combatGuardedDamage(weapon.baseDamage + weapon.damageVariance, target, rules),
    target.armor,
    weapon,
  );
  return {
    health: {
      minimum: Math.min(target.health, low.healthDamage),
      maximum: Math.min(target.health, high.healthDamage),
    },
    armor: { minimum: low.armorDamage, maximum: high.armorDamage },
  };
}
