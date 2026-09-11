import { COMPANY_CATALOGUE } from './definitions.js';
import { snapshotJson } from './input.js';
import { effectiveLeaderId, person, requireLifecycle } from './lifecycle-state.js';
import type { LifecycleCharacter } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';

export const PERK_EFFECT_SNAPSHOT_VERSION = 1 as const;
export type PerkTaskScope = 'NONE' | 'CARE' | 'STUDY' | 'TRAINING';
export interface ExactBps {
  readonly numerator: string;
  readonly denominator: string;
}
export type PerkEvaluationInput =
  | {
      readonly kind: 'CHARACTER';
      readonly characterId: string;
      readonly task: PerkTaskScope;
    }
  | { readonly kind: 'LEADER_GROUP' };

type PerkRoot = Pick<MaterializedCompanyState, 'lifecycle' | 'physical'>;
const weaponSkills = new Set(['blades', 'polearms', 'heavy', 'archery']);
const additiveAttributes = new Set(['accuracy', 'initiative', 'defense', 'maxStamina']);
const taskAttributes = new Set([
  'careRecoveryBps',
  'careCostBps',
  'studyDurationBps',
  'trainingCostBps',
  'trainingDurationBps',
]);

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}
function identityBps(): ExactBps {
  return { numerator: '10000', denominator: '1' };
}
function multiplyBps(current: ExactBps, value: number): ExactBps {
  let numerator = BigInt(current.numerator) * BigInt(value);
  let denominator = BigInt(current.denominator) * 10000n;
  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;
  return { numerator: String(numerator), denominator: String(denominator) };
}
function selectedPerks(character: LifecycleCharacter) {
  return character.perks.map((perkId) => {
    const perk = COMPANY_CATALOGUE.perks.find((entry) => entry.id === perkId);
    requireLifecycle(perk, 'INVALID_STATE');
    const { attribute } = perk.effect;
    const valid = weaponSkills.has(perk.skillId)
      ? additiveAttributes.has(attribute)
      : perk.skillId === 'defense'
        ? attribute === 'defense' || attribute === 'maxStamina'
        : perk.skillId === 'medicine'
          ? attribute === 'careRecoveryBps' || attribute === 'careCostBps'
          : perk.skillId === 'scholarship'
            ? attribute === 'studyDurationBps' || attribute === 'trainingCostBps'
            : perk.skillId === 'leadership'
              ? attribute === 'startingMorale' || attribute === 'trainingDurationBps'
              : false;
    requireLifecycle(valid, 'INVALID_STATE');
    return perk;
  });
}
function weaponContext(root: PerkRoot, characterId: string) {
  const main = root.physical.items.find(
    (item) =>
      item.tombstone === null &&
      item.equipped?.characterId === characterId &&
      item.equipped.slots.includes('MAIN_HAND'),
  );
  if (!main) return null;
  const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === main.definitionId);
  requireLifecycle(definition?.enabled, 'INVALID_STATE');
  if (definition.kind !== 'weapon' || !definition.skillId || !definition.weaponProfile) return null;
  if (definition.requiresOffHand) {
    const requiredDefinition = COMPANY_CATALOGUE.items.find(
      (entry) => entry.id === definition.requiresOffHand,
    );
    requireLifecycle(
      requiredDefinition?.enabled && requiredDefinition.slot === 'OFF_HAND',
      'INVALID_STATE',
    );
    const required = root.physical.items.find(
      (item) =>
        item.tombstone === null &&
        item.equipped?.characterId === characterId &&
        item.equipped.slots.includes('OFF_HAND') &&
        item.definitionId === requiredDefinition.id,
    );
    if (!required) return null;
  }
  return {
    itemId: main.itemId,
    profileId: definition.weaponProfile,
    skillId: definition.skillId,
  };
}
function owned<T>(value: T): T {
  const copy = snapshotJson(value);
  requireLifecycle(copy !== undefined, 'INVALID_STATE');
  return copy as T;
}

/** Pure B02 calculation. Consumers persist these detached snapshots in their own later slices. */
export function evaluatePerkEffects(root: PerkRoot, input: PerkEvaluationInput) {
  if (input.kind === 'LEADER_GROUP') {
    const leaderId = effectiveLeaderId(root.lifecycle);
    const leader = person(root.lifecycle, leaderId);
    let startingMorale = 0;
    const ids: string[] = [];
    for (const perk of selectedPerks(leader)) {
      if (perk.skillId !== 'leadership' || perk.effect.attribute !== 'startingMorale') continue;
      startingMorale += perk.effect.value;
      ids.push(perk.id);
    }
    return owned({
      schemaVersion: PERK_EFFECT_SNAPSHOT_VERSION,
      kind: 'LEADER_GROUP' as const,
      catalogueVersion: COMPANY_CATALOGUE.version,
      rulesetId: COMPANY_CATALOGUE.rulesetId,
      effectiveLeaderId: leaderId,
      contributingPerkIds: ids.sort(),
      startingMorale,
    });
  }

  const holder = person(root.lifecycle, input.characterId);
  const weapon = weaponContext(root, input.characterId);
  const additive = { accuracy: 0, initiative: 0, defense: 0, maxStamina: 0 };
  const task = {
    careRecoveryBps: identityBps(),
    careCostBps: identityBps(),
    studyDurationBps: identityBps(),
    trainingCostBps: identityBps(),
    trainingDurationBps: identityBps(),
  };
  const ids: string[] = [];
  const weaponIds: string[] = [];
  for (const perk of selectedPerks(holder)) {
    const { attribute, value } = perk.effect;
    if (weaponSkills.has(perk.skillId)) {
      if (weapon?.skillId !== perk.skillId) continue;
      additive[attribute as keyof typeof additive] += value;
      ids.push(perk.id);
      weaponIds.push(perk.id);
      continue;
    }
    if (perk.skillId === 'defense') {
      additive[attribute as 'defense' | 'maxStamina'] += value;
      ids.push(perk.id);
      continue;
    }
    const activeTask =
      (input.task === 'CARE' && perk.skillId === 'medicine') ||
      (input.task === 'STUDY' && perk.skillId === 'scholarship' && attribute === 'studyDurationBps') ||
      (input.task === 'TRAINING' &&
        ((perk.skillId === 'scholarship' && attribute === 'trainingCostBps') ||
          (perk.skillId === 'leadership' && attribute === 'trainingDurationBps')));
    if (!activeTask || !taskAttributes.has(attribute)) continue;
    task[attribute as keyof typeof task] = multiplyBps(
      task[attribute as keyof typeof task],
      value,
    );
    ids.push(perk.id);
  }
  return owned({
    schemaVersion: PERK_EFFECT_SNAPSHOT_VERSION,
    kind: 'CHARACTER' as const,
    catalogueVersion: COMPANY_CATALOGUE.version,
    rulesetId: COMPANY_CATALOGUE.rulesetId,
    holderId: input.characterId,
    taskScope: input.task,
    contributingPerkIds: ids.sort(),
    weapon:
      weapon && weaponIds.length > 0
        ? {
            itemId: weapon.itemId,
            profileId: weapon.profileId,
            contributingPerkIds: weaponIds.sort(),
          }
        : null,
    additive,
    task,
  });
}
