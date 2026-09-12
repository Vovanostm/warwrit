import { M1_DOMAIN_BRIDGE_RULESET_ID } from '../combat/setup-v2.js';
import type { WeaponId } from '../combat/types.js';
import { COMPANY_CATALOGUE } from './definitions.js';
import { snapshotJson } from './input.js';
import { person, requireLifecycle } from './lifecycle-state.js';
import { equippedWeaponContext, evaluatePerkEffects } from './perk-effects.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import {
  activeConditions,
  conditionDefinition,
  itemDefinition,
  physicalVitals,
  requirePhysical,
} from './physical-state.js';
import { skillLevel } from './skill-progress.js';

export const COMBAT_PROJECTION_SCHEMA_VERSION = 1 as const;
const BASE_HEALTH = 60;
const BASE_STAMINA = 80;

type ArmorSlot = 'HEAD' | 'BODY';
export interface CombatArmorProjection {
  readonly itemId: string;
  readonly definitionId: string;
  readonly slot: ArmorSlot;
  readonly maximumArmor: number;
  readonly currentArmor: number;
}
export interface CharacterCombatProjection {
  readonly schemaVersion: typeof COMBAT_PROJECTION_SCHEMA_VERSION;
  readonly catalogueVersion: string;
  readonly domainRulesetId: string;
  readonly combatRulesetId: typeof M1_DOMAIN_BRIDGE_RULESET_ID;
  readonly characterId: string;
  readonly weapon: {
    readonly itemId: string;
    readonly definitionId: string;
    readonly profileId: WeaponId;
    readonly skillId: string;
  };
  readonly armor: readonly CombatArmorProjection[];
  readonly conditionIds: readonly string[];
  readonly contributingPerkIds: readonly string[];
  readonly attributes: {
    readonly accuracy: number;
    readonly armor: number;
    readonly defense: number;
    readonly health: number;
    readonly initiative: number;
    readonly stamina: number;
  };
  readonly current: {
    readonly health: number;
    readonly armor: number;
    readonly stamina: number;
  };
}

function owned<T>(value: T): T {
  const copy = snapshotJson(value);
  requirePhysical(copy !== undefined, 'INVALID_STATE');
  return copy as T;
}

function equippedArmor(
  root: MaterializedCompanyState,
  characterId: string,
): readonly CombatArmorProjection[] {
  const occupied = new Set<ArmorSlot>();
  const projected: CombatArmorProjection[] = [];
  for (const item of root.physical.items) {
    if (
      item.tombstone !== null ||
      item.equipped?.characterId !== characterId ||
      !item.equipped.slots.some((slot) => slot === 'HEAD' || slot === 'BODY')
    )
      continue;
    const definition = itemDefinition(item);
    const armorSlots = item.equipped.slots.filter(
      (slot): slot is ArmorSlot => slot === 'HEAD' || slot === 'BODY',
    );
    const slot = armorSlots[0];
    requirePhysical(
      definition.kind === 'armor' &&
        definition.maxArmor !== undefined &&
        slot !== undefined &&
        armorSlots.length === 1 &&
        item.equipped.slots.length === 1 &&
        definition.slot === slot &&
        !occupied.has(slot) &&
        item.maximumCondition === definition.maxArmor &&
        item.currentCondition >= 0 &&
        item.currentCondition <= definition.maxArmor,
      'INVALID_STATE',
    );
    occupied.add(slot);
    projected.push({
      itemId: item.itemId,
      definitionId: item.definitionId,
      slot,
      maximumArmor: definition.maxArmor,
      currentArmor: item.currentCondition,
    });
  }
  return projected.sort((a, b) => (a.slot === b.slot ? 0 : a.slot < b.slot ? -1 : 1));
}

/**
 * G03 finite projection only. Morale belongs to G04; placement/binding belongs to G05.
 * Kernel weapon-profile modifiers and kernel wounds are deliberately not materialized here.
 */
export function projectCharacterCombat(
  root: MaterializedCompanyState,
  characterId: string,
): CharacterCombatProjection {
  const character = person(root.lifecycle, characterId);
  const weapon = equippedWeaponContext(root, characterId);
  requirePhysical(weapon, 'INVALID_STATE');
  const vitals = physicalVitals(root.physical, characterId);
  const perk = evaluatePerkEffects(root, { kind: 'CHARACTER', characterId, task: 'NONE' });
  const armor = equippedArmor(root, characterId);
  const conditions = activeConditions(root.physical, characterId)
    .map((instance) => ({ instance, definition: conditionDefinition(instance) }))
    .sort((a, b) => (a.instance.conditionId < b.instance.conditionId ? -1 : 1));
  const level = (skillId: string) => skillLevel(character.skills[skillId] ?? 0);
  const accuracyCondition = conditions.reduce((sum, entry) => sum + entry.definition.accuracy, 0);
  const initiativeCondition = conditions.reduce(
    (sum, entry) => sum + entry.definition.initiative,
    0,
  );
  const maximumHealth = Math.max(1, BASE_HEALTH);
  const maximumStamina = Math.max(1, BASE_STAMINA + perk.additive.maxStamina);
  const maximumArmor = armor.reduce((sum, entry) => sum + entry.maximumArmor, 0);
  const currentArmor = armor.reduce((sum, entry) => sum + entry.currentArmor, 0);
  const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === weapon.definitionId);
  requireLifecycle(
    definition?.enabled &&
      definition.kind === 'weapon' &&
      definition.weaponProfile === weapon.profileId &&
      definition.skillId === weapon.skillId,
    'INVALID_STATE',
  );

  return owned({
    schemaVersion: COMBAT_PROJECTION_SCHEMA_VERSION,
    catalogueVersion: COMPANY_CATALOGUE.version,
    domainRulesetId: COMPANY_CATALOGUE.rulesetId,
    combatRulesetId: M1_DOMAIN_BRIDGE_RULESET_ID,
    characterId,
    weapon: {
      itemId: weapon.itemId,
      definitionId: weapon.definitionId,
      profileId: weapon.profileId,
      skillId: weapon.skillId,
    },
    armor,
    conditionIds: conditions.map(({ instance }) => instance.conditionId),
    contributingPerkIds: perk.contributingPerkIds,
    attributes: {
      accuracy: Math.max(
        0,
        20 + Math.floor(level(weapon.skillId) / 2) + perk.additive.accuracy + accuracyCondition,
      ),
      armor: maximumArmor,
      defense: Math.max(0, 5 + Math.floor(level('defense') / 4) + perk.additive.defense),
      health: maximumHealth,
      initiative: Math.max(1, 40 + perk.additive.initiative + initiativeCondition),
      stamina: maximumStamina,
    },
    current: {
      health: Math.min(vitals.currentHealth, maximumHealth),
      armor: Math.min(currentArmor, maximumArmor),
      stamina: Math.min(vitals.currentStamina, maximumStamina),
    },
  });
}
