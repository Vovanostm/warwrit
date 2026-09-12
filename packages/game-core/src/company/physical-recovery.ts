import { COMPANY_RULES } from './definitions.js';
import { person } from './lifecycle-state.js';
import { campaignTick } from './values.js';
import { foodCovered } from './physical-food.js';
import {
  activeConditions,
  conditionDefinition,
  physicalId,
  replaceVitals,
  requirePhysical,
  syncLifecycleConditions,
} from './physical-state.js';
import type { MaterializedCompanyState } from './physical-root-types.js';

function restore(
  current: number,
  maximum: number,
  carryText: string,
  elapsed: bigint,
  fullTicks: bigint,
): { readonly current: number; readonly carry: string } {
  if (current >= maximum) return { current: maximum, carry: '0' };
  const numerator = BigInt(carryText) + elapsed * BigInt(maximum);
  const gain = numerator / fullTicks;
  if (gain >= BigInt(maximum - current)) return { current: maximum, carry: '0' };
  return { current: current + Number(gain), carry: (numerator % fullTicks).toString() };
}

export function advancePhysicalRecovery(
  root: MaterializedCompanyState,
  toTick: string,
): MaterializedCompanyState {
  const from = BigInt(root.physical.processedTick);
  const to = BigInt(toTick);
  requirePhysical(to >= from, 'INVALID_TIME');
  if (to === from) return root;
  let physical = root.physical;
  for (const member of root.lifecycle.memberships.filter(
    (membership) => membership.endedAt === null || BigInt(membership.endedAt) > from,
  )) {
    const character = person(root.lifecycle, member.characterId);
    const start = BigInt(member.startedAt) > from ? BigInt(member.startedAt) : from;
    const finish =
      member.endedAt === null || BigInt(member.endedAt) > to ? to : BigInt(member.endedAt);
    if (finish <= start) continue;
    const recoverable =
      character.presence.assignment === 'RECOVERY' &&
      character.presence.availability === 'AVAILABLE' &&
      character.presence.encounterBindingId === null &&
      foodCovered({ ...root, physical }, member.membershipId, start, finish);
    if (!recoverable) continue;
    const duration = finish - start;
    const existingVitals = physical.vitals.find(
      (entry) => entry.characterId === member.characterId,
    );
    const conditions = activeConditions(physical, member.characterId);
    if (
      conditions.some((instance) => {
        const definition = conditionDefinition(instance);
        return (
          definition.category === 'REST_RECOVERABLE' ||
          definition.category === 'TREATMENT_REQUIRED_STABLE'
        );
      })
    )
      requirePhysical(existingVitals, 'INVALID_STATE');
    if (existingVitals) {
      let healthStart = start;
      const blocked = conditions.some((instance) => {
        const category = conditionDefinition(instance).category;
        return (
          category === 'CRITICAL' ||
          (category === 'TREATMENT_REQUIRED_STABLE' && instance.care === null)
        );
      });
      for (const instance of conditions) {
        if (
          conditionDefinition(instance).category === 'TREATMENT_REQUIRED_STABLE' &&
          instance.care !== null &&
          BigInt(instance.care.fulfilledAt) > healthStart
        )
          healthStart = BigInt(instance.care.fulfilledAt);
      }
      const health = restore(
        existingVitals.currentHealth,
        existingVitals.maximumHealth,
        existingVitals.healthCarry,
        blocked || healthStart >= finish ? 0n : finish - healthStart,
        BigInt(COMPANY_RULES.restHealthTicks),
      );
      const stamina = restore(
        existingVitals.currentStamina,
        existingVitals.maximumStamina,
        existingVitals.staminaCarry,
        duration,
        BigInt(COMPANY_RULES.restStaminaTicks),
      );
      physical = replaceVitals(physical, {
        ...existingVitals,
        currentHealth: health.current,
        healthCarry: health.carry,
        currentStamina: stamina.current,
        staminaCarry: stamina.carry,
      });
    }
    physical = {
      ...physical,
      conditions: physical.conditions.map((instance) => {
        if (instance.characterId !== member.characterId || instance.resolvedAt !== null)
          return instance;
        const definition = conditionDefinition(instance);
        const allowed =
          definition.category === 'REST_RECOVERABLE' ||
          (definition.category === 'TREATMENT_REQUIRED_STABLE' && instance.care !== null);
        if (!allowed || definition.recoveryTicks === undefined) return instance;
        let eligibleFrom = BigInt(instance.onsetTick) > start ? BigInt(instance.onsetTick) : start;
        if (instance.care !== null && BigInt(instance.care.fulfilledAt) > eligibleFrom)
          eligibleFrom = BigInt(instance.care.fulfilledAt);
        if (eligibleFrom >= finish) return instance;
        const total = BigInt(instance.recoveryTicks) + finish - eligibleFrom;
        const required = BigInt(instance.care?.recoveryTicksRequired ?? definition.recoveryTicks);
        if (total < required) return { ...instance, recoveryTicks: total.toString() };
        const completedAt = campaignTick(
          (eligibleFrom + (required - BigInt(instance.recoveryTicks))).toString(),
        );
        return {
          ...instance,
          recoveryTicks: required.toString(),
          resolvedAt: completedAt,
          resolutionSourceId: physicalId(instance.conditionId, completedAt, 'rest-recovery'),
        };
      }),
    };
  }
  physical = { ...physical, processedTick: campaignTick(to.toString()) };
  const lifecycle = syncLifecycleConditions(root.lifecycle, physical);
  return { lifecycle, finance: root.finance, physical };
}
