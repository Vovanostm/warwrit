import { M1_DOMAIN_BRIDGE_V6_RULESET_ID } from './setup-v2.js';
import type { CombatRulesetId, CombatUnitState } from './types.js';

/** Incapable V6 units remain alive but receive no action activation. */
export function canTakeCombatActivation(
  unit: CombatUnitState,
  rulesetId: CombatRulesetId,
): boolean {
  if (rulesetId !== M1_DOMAIN_BRIDGE_V6_RULESET_ID) return true;
  return (
    unit.capabilities?.move === true ||
    unit.capabilities?.attack === true ||
    unit.capabilities?.defend === true ||
    unit.capabilities?.retreat === true
  );
}
