import { combatRules } from '../combat/rules.js';
import { projectCharacterCombat } from './combat-projection.js';
import type { CharacterCombatProjection } from './combat-projection.js';
import { natural } from './input.js';
import { person } from './lifecycle-state.js';
import { fieldPartyStatus } from './membership.js';
import { evaluatePerkEffects } from './perk-effects.js';
import type { LeaderGroupPerkEffectSnapshot } from './perk-effects.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { ownPhysical, physicalVitals, requirePhysical } from './physical-state.js';
import { PHYSICAL_RULES } from './physical-types.js';
import { isEntityId } from './values.js';

export const COMBAT_MORALE_POLICY_VERSION = 's02-combat-morale-1' as const;
export interface CombatMoraleSnapshot {
  readonly policyVersion: typeof COMBAT_MORALE_POLICY_VERSION;
  readonly persistentSourceId: string;
  readonly persistentBefore: number;
  readonly actualInitialTactical: number;
  readonly partyId: string;
  readonly leader: LeaderGroupPerkEffectSnapshot;
  readonly overflowModifier: number;
}
export interface CharacterCombatMoraleProjection
  extends Omit<CharacterCombatProjection, 'schemaVersion' | 'attributes' | 'current'> {
  readonly schemaVersion: 2;
  readonly attributes: CharacterCombatProjection['attributes'] & { readonly morale: number };
  readonly current: CharacterCombatProjection['current'] & { readonly morale: number };
  readonly morale: CombatMoraleSnapshot;
}

/** G04 only: a frozen projection, not encounter admission or a persistent write. */
export function projectCharacterCombatWithMorale(
  root: MaterializedCompanyState,
  characterId: string,
): CharacterCombatMoraleProjection {
  const projection = projectCharacterCombat(root, characterId);
  const vitals = physicalVitals(root.physical, characterId);
  const persistentBefore = vitals.morale;
  requirePhysical(
    natural(0, PHYSICAL_RULES.maximumMorale).read(persistentBefore) && isEntityId(vitals.sourceId),
    'INVALID_STATE',
  );
  const partyId = person(root.lifecycle, characterId).presence.fieldPartyId;
  requirePhysical(partyId !== null, 'INCOMPATIBLE_ACTIVITY');
  const party = fieldPartyStatus(root.lifecycle, partyId);
  const leader = evaluatePerkEffects(root, { kind: 'LEADER_GROUP' });
  const maximumTactical = combatRules(projection.combatRulesetId).morale.maximum;
  const actualInitialTactical = Math.max(
    1,
    Math.min(maximumTactical, persistentBefore + leader.startingMorale + party.moraleModifier),
  );
  return ownPhysical({
    ...projection,
    schemaVersion: 2,
    attributes: { ...projection.attributes, morale: maximumTactical },
    current: { ...projection.current, morale: actualInitialTactical },
    morale: {
      policyVersion: COMBAT_MORALE_POLICY_VERSION,
      persistentSourceId: vitals.sourceId,
      persistentBefore,
      actualInitialTactical,
      partyId,
      leader,
      overflowModifier: party.moraleModifier,
    },
  });
}

/** C01 correction: only the actual tactical change persists, never the nominal aura. */
export function persistentMoraleAfterCombat(
  snapshot: CombatMoraleSnapshot,
  finalTactical: number,
): number {
  const saved = ownPhysical(snapshot);
  requirePhysical(
    saved.policyVersion === COMBAT_MORALE_POLICY_VERSION &&
      natural(0, PHYSICAL_RULES.maximumMorale).read(saved.persistentBefore) &&
      natural(1, 100).read(saved.actualInitialTactical) &&
      natural(0, 100).read(finalTactical),
    'INVALID_SOURCE',
  );
  return Math.max(
    0,
    Math.min(
      PHYSICAL_RULES.maximumMorale,
      saved.persistentBefore + finalTactical - saved.actualInitialTactical,
    ),
  );
}
