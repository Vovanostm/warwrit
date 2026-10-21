import { combatRules } from '../combat/rules.js';
import { projectCharacterCombat } from './combat-projection.js';
import type {
  CharacterCombatProjection,
  CharacterCombatProjectionV3,
  CharacterCombatProjectionV4,
  CharacterCombatProjectionV5,
} from './combat-projection.js';
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
type CombatBase = Omit<CharacterCombatProjection, 'schemaVersion' | 'attributes' | 'current'>;
export interface CharacterCombatMoraleProjection extends CombatBase {
  readonly schemaVersion: 2;
  readonly attributes: CharacterCombatProjection['attributes'] & { readonly morale: number };
  readonly current: CharacterCombatProjection['current'] & { readonly morale: number };
  readonly morale: CombatMoraleSnapshot;
}

export interface CharacterCombatMoraleProjectionV3 extends Omit<
  CharacterCombatProjectionV3,
  'attributes' | 'current'
> {
  readonly attributes: CharacterCombatProjectionV3['attributes'] & { readonly morale: number };
  readonly current: CharacterCombatProjectionV3['current'] & { readonly morale: number };
  readonly morale: CombatMoraleSnapshot;
}

export interface CharacterCombatMoraleProjectionV4 extends Omit<
  CharacterCombatProjectionV4,
  'attributes' | 'current'
> {
  readonly attributes: CharacterCombatProjectionV4['attributes'] & { readonly morale: number };
  readonly current: CharacterCombatProjectionV4['current'] & { readonly morale: number };
  readonly morale: CombatMoraleSnapshot;
}

export interface CharacterCombatMoraleProjectionV5 extends Omit<
  CharacterCombatProjectionV5,
  'attributes' | 'current'
> {
  readonly attributes: CharacterCombatProjectionV5['attributes'] & { readonly morale: number };
  readonly current: CharacterCombatProjectionV5['current'] & { readonly morale: number };
  readonly morale: CombatMoraleSnapshot;
}

/** G04 only: a frozen projection, not encounter admission or a persistent write. */
export function projectCharacterCombatWithMorale(
  root: MaterializedCompanyState,
  characterId: string,
): CharacterCombatMoraleProjection;
export function projectCharacterCombatWithMorale(
  root: MaterializedCompanyState,
  characterId: string,
  version: 3,
): CharacterCombatMoraleProjectionV3;
export function projectCharacterCombatWithMorale(
  root: MaterializedCompanyState,
  characterId: string,
  version: 4,
): CharacterCombatMoraleProjectionV4;
export function projectCharacterCombatWithMorale(
  root: MaterializedCompanyState,
  characterId: string,
  version: 5,
): CharacterCombatMoraleProjectionV5;
export function projectCharacterCombatWithMorale(
  root: MaterializedCompanyState,
  characterId: string,
  version: 3 | 4 | 5,
):
  | CharacterCombatMoraleProjectionV3
  | CharacterCombatMoraleProjectionV4
  | CharacterCombatMoraleProjectionV5;
export function projectCharacterCombatWithMorale(
  root: MaterializedCompanyState,
  characterId: string,
  version?: 3 | 4 | 5,
):
  | CharacterCombatMoraleProjection
  | CharacterCombatMoraleProjectionV3
  | CharacterCombatMoraleProjectionV4
  | CharacterCombatMoraleProjectionV5 {
  const projection =
    version !== undefined
      ? projectCharacterCombat(root, characterId, version)
      : projectCharacterCombat(root, characterId);
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
    schemaVersion: version ?? 2,
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
  }) as
    | CharacterCombatMoraleProjection
    | CharacterCombatMoraleProjectionV3
    | CharacterCombatMoraleProjectionV4
    | CharacterCombatMoraleProjectionV5;
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
