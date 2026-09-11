import { COMPANY_CATALOGUE } from './definitions.js';
import { snapshotJson } from './input.js';
import { effectiveLeaderId, person, requireLifecycle } from './lifecycle-state.js';
import type { LifecycleCharacter } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { itemDefinition, requirePhysical } from './physical-state.js';

export const PERK_EFFECT_SNAPSHOT_VERSION = 1 as const;
export type PerkTaskScope = 'NONE' | 'CARE' | 'STUDY' | 'TRAINING';
export interface ExactBps {
  readonly numerator: string;
  readonly denominator: string;
}
export type PerkEvaluationInput =
  | { readonly kind: 'CHARACTER'; readonly characterId: string; readonly task: PerkTaskScope }
  | { readonly kind: 'LEADER_GROUP' };

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
function bps(value = 10000): ExactBps {
  return { numerator: String(value), denominator: '1' };
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
    const { skillId, attribute } = { skillId: perk.skillId, attribute: perk.effect.attribute };
    const valid = weaponSkills.has(skillId)
      ? additiveAttributes.has(attribute)
      : skillId === 'defense'
        ? attribute === 'defense' || attribute === 'maxStamina'
        : skillId === 'medicine'
          ? attribute === 'careRecoveryBps' || attribute === 'careCostBps'
          : skillId === 'scholarship'
            ? attribute === 'studyDurationBps' || attribute === 'trainingCostBps'
            : skillId === 'leadership'
              ? attribute === 'startingMorale' || attribute === 'trainingDurationBps'
              : false;
    requireLifecycle(valid, 'INVALID_STATE');
    return perk;
  });
}
function weaponContext(root: MaterializedCompanyState, characterId: string) {
  const main = root.physical.items.find(
    (item) =>
      item.tombstone === null &&
      item.equipped?.characterId === characterId &&
      item.equipped.slots.includes('MAIN_HAND'),
  );
  if (!main) return null;
  const definition = itemDefinition(main);
  if (definition.kind !== 'weapon' || !definition.skillId || !definition.weaponProfile) return null;
  if (definition.requiresOffHand) {
    const required = root.physical.items.find(
      (item) =>
        item.tombstone === null &&
        item.equipped?.characterId === characterId &&
        item.equipped.slots.includes('OFF_HAND') &&
        item.definitionId === definition.requiresOffHand,
    );
    if (!required) return null;
    itemDefinition(required);
  }
  return { itemId: main.itemId, profileId: definition.weaponProfile, skillId: definition.skillId };
}
function owned<T>(value: T): T {
  const copy = snapshotJson(value);
  requirePhysical(copy !== undefined, 'INVALID_STATE');
  return copy as T;
}

export function evaluatePerkEffects(root: MaterializedCompanyState, input: PerkEvaluationInput) {
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
    careRecoveryBps: bps(),
    careCostBps: bps(),
    studyDurationBps: bps(),
    trainingCostBps: bps(),
    trainingDurationBps: bps(),
  };
  const ids: string[] = [];
  for (const perk of selectedPerks(holder)) {
    const { attribute, value } = perk.effect;
    if (weaponSkills.has(perk.skillId)) {
      if (weapon?.skillId !== perk.skillId) continue;
      additive[attribute as keyof typeof additive] += value;
      ids.push(perk.id);
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
    task[attribute as keyof typeof task] = multiplyBps(task[attribute as keyof typeof task], value);
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
    weapon: weapon ? { itemId: weapon.itemId, profileId: weapon.profileId } : null,
    additive,
    task,
  });
}
