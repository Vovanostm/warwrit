import { COMPANY_CATALOGUE } from './definitions.js';
import { snapshotJson } from './input.js';
import { effectiveLeaderId, person, requireLifecycle } from './lifecycle-state.js';
import type { LifecycleCharacter } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { itemDefinition } from './physical-state.js';

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
export interface CharacterPerkEffectSnapshot {
  readonly schemaVersion: typeof PERK_EFFECT_SNAPSHOT_VERSION;
  readonly kind: 'CHARACTER';
  readonly catalogueVersion: string;
  readonly rulesetId: string;
  readonly holderId: string;
  readonly taskScope: PerkTaskScope;
  readonly contributingPerkIds: readonly string[];
  readonly weapon: null | { readonly itemId: string; readonly profileId: string };
  readonly additive: {
    readonly accuracy: number;
    readonly initiative: number;
    readonly defense: number;
    readonly maxStamina: number;
  };
  readonly task: {
    readonly careRecoveryBps: ExactBps;
    readonly careCostBps: ExactBps;
    readonly studyDurationBps: ExactBps;
    readonly trainingCostBps: ExactBps;
    readonly trainingDurationBps: ExactBps;
  };
}
export interface LeaderGroupPerkEffectSnapshot {
  readonly schemaVersion: typeof PERK_EFFECT_SNAPSHOT_VERSION;
  readonly kind: 'LEADER_GROUP';
  readonly catalogueVersion: string;
  readonly rulesetId: string;
  readonly effectiveLeaderId: string;
  readonly contributingPerkIds: readonly string[];
  readonly startingMorale: number;
}
export type PerkEffectSnapshot = CharacterPerkEffectSnapshot | LeaderGroupPerkEffectSnapshot;

const allowedAttributes: Readonly<Record<string, ReadonlySet<string>>> = {
  blades: new Set(['accuracy', 'initiative']),
  polearms: new Set(['accuracy', 'defense']),
  heavy: new Set(['accuracy', 'maxStamina']),
  archery: new Set(['accuracy', 'initiative']),
  defense: new Set(['defense', 'maxStamina']),
  medicine: new Set(['careRecoveryBps', 'careCostBps']),
  scholarship: new Set(['studyDurationBps', 'trainingCostBps']),
  leadership: new Set(['startingMorale', 'trainingDurationBps']),
};
const weaponSkills = new Set(['blades', 'polearms', 'heavy', 'archery']);
const taskAttributes = new Set([
  'careRecoveryBps',
  'careCostBps',
  'studyDurationBps',
  'trainingCostBps',
  'trainingDurationBps',
]);

function multiplyBps(current: ExactBps, value: number): ExactBps {
  let numerator = BigInt(current.numerator) * BigInt(value);
  let denominator = BigInt(current.denominator) * 10000n;
  let a = numerator;
  let b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  const divisor = a < 0n ? -a : a;
  numerator /= divisor;
  denominator /= divisor;
  return { numerator: String(numerator), denominator: String(denominator) };
}
function selectedPerks(character: LifecycleCharacter) {
  const slots = new Set<string>();
  const ids = new Set<string>();
  return character.perks.map((perkId) => {
    const perk = COMPANY_CATALOGUE.perks.find((entry) => entry.id === perkId);
    requireLifecycle(perk && !ids.has(perkId), 'INVALID_STATE');
    ids.add(perkId);
    const slot = `${perk.skillId}:${perk.milestone}`;
    requireLifecycle(!slots.has(slot), 'INVALID_STATE');
    slots.add(slot);
    requireLifecycle(allowedAttributes[perk.skillId]?.has(perk.effect.attribute), 'INVALID_STATE');
    return perk;
  });
}
function weaponContext(root: MaterializedCompanyState, characterId: string) {
  const mains = root.physical.items.filter(
    (item) =>
      item.tombstone === null &&
      item.equipped?.characterId === characterId &&
      item.equipped.slots.includes('MAIN_HAND'),
  );
  requireLifecycle(mains.length <= 1, 'INVALID_STATE');
  const item = mains[0];
  if (!item) return null;
  const definition = itemDefinition(item);
  if (definition.kind !== 'weapon' || !definition.skillId || !definition.weaponProfile) return null;
  const slots = item.equipped!.slots;
  if (
    (definition.hands === 2 && !slots.includes('OFF_HAND')) ||
    (definition.hands === 1 && slots.length !== 1)
  )
    return null;
  if (definition.requiresOffHand) {
    const requiredDefinition = COMPANY_CATALOGUE.items.find(
      (candidate) => candidate.id === definition.requiresOffHand,
    );
    requireLifecycle(
      requiredDefinition?.enabled && requiredDefinition.slot === 'OFF_HAND',
      'INVALID_STATE',
    );
    const required = root.physical.items.find(
      (candidate) =>
        candidate.tombstone === null &&
        candidate.definitionId === requiredDefinition.id &&
        candidate.equipped?.characterId === characterId &&
        candidate.equipped.slots.includes('OFF_HAND'),
    );
    if (!required) return null;
    itemDefinition(required);
  }
  return {
    itemId: item.itemId,
    profileId: definition.weaponProfile,
    skillId: definition.skillId,
  };
}
function owned<T>(value: T): T {
  const copy = snapshotJson(value);
  requireLifecycle(copy !== undefined, 'INVALID_STATE');
  return copy as T;
}

/** Pure finite B02 evaluation. It neither commits nor publishes the returned snapshot. */
export function evaluatePerkEffects(
  root: MaterializedCompanyState,
  input: Extract<PerkEvaluationInput, { kind: 'CHARACTER' }>,
): CharacterPerkEffectSnapshot;
export function evaluatePerkEffects(
  root: MaterializedCompanyState,
  input: Extract<PerkEvaluationInput, { kind: 'LEADER_GROUP' }>,
): LeaderGroupPerkEffectSnapshot;
export function evaluatePerkEffects(
  root: MaterializedCompanyState,
  input: PerkEvaluationInput,
): PerkEffectSnapshot;
export function evaluatePerkEffects(
  root: MaterializedCompanyState,
  input: PerkEvaluationInput,
): PerkEffectSnapshot {
  if (input.kind === 'LEADER_GROUP') {
    const leaderId = effectiveLeaderId(root.lifecycle);
    const leader = person(root.lifecycle, leaderId);
    const perks = selectedPerks(leader).filter(
      (perk) => perk.skillId === 'leadership' && perk.effect.attribute === 'startingMorale',
    );
    return owned({
      schemaVersion: PERK_EFFECT_SNAPSHOT_VERSION,
      kind: 'LEADER_GROUP' as const,
      catalogueVersion: COMPANY_CATALOGUE.version,
      rulesetId: COMPANY_CATALOGUE.rulesetId,
      effectiveLeaderId: leaderId,
      contributingPerkIds: perks.map((perk) => perk.id).sort(),
      startingMorale: perks.reduce((sum, perk) => sum + perk.effect.value, 0),
    });
  }

  const holder = person(root.lifecycle, input.characterId);
  const weapon = weaponContext(root, input.characterId);
  const additive = { accuracy: 0, initiative: 0, defense: 0, maxStamina: 0 };
  const identity = (): ExactBps => ({ numerator: '10000', denominator: '1' });
  const task = {
    careRecoveryBps: identity(),
    careCostBps: identity(),
    studyDurationBps: identity(),
    trainingCostBps: identity(),
    trainingDurationBps: identity(),
  };
  const ids: string[] = [];
  let weaponApplied = false;
  for (const perk of selectedPerks(holder)) {
    const { attribute, value } = perk.effect;
    if (weaponSkills.has(perk.skillId)) {
      if (weapon?.skillId !== perk.skillId) continue;
      additive[attribute as keyof typeof additive] += value;
      weaponApplied = true;
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
      (input.task === 'STUDY' &&
        perk.skillId === 'scholarship' &&
        attribute === 'studyDurationBps') ||
      (input.task === 'TRAINING' &&
        ((perk.skillId === 'scholarship' && attribute === 'trainingCostBps') ||
          (perk.skillId === 'leadership' && attribute === 'trainingDurationBps')));
    if (!activeTask || !taskAttributes.has(attribute)) continue;
    const key = attribute as keyof typeof task;
    task[key] = multiplyBps(task[key], value);
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
    weapon: weaponApplied && weapon ? { itemId: weapon.itemId, profileId: weapon.profileId } : null,
    additive,
    task,
  });
}
