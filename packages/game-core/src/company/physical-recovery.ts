import { COMPANY_RULES } from './definitions.js';
import { person } from './lifecycle-state.js';
import { campaignTick, isExactInteger } from './values.js';
import { foodCovered } from './physical-food.js';
import { canonicalJson } from './input.js';
import {
  activeConditions,
  conditionDefinition,
  physicalId,
  replaceVitals,
  requirePhysical,
  syncLifecycleConditions,
} from './physical-state.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type { TrustedTransitSegment } from './physical-types.js';
import { travelProfile } from './physical-types.js';

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
  trustedTransitSegments: readonly TrustedTransitSegment[] = [],
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
        const requiredText = instance.care?.recoveryTicksRequired ?? definition.recoveryTicks;
        requirePhysical(isExactInteger(requiredText) && BigInt(requiredText) > 0n, 'INVALID_STATE');
        const required = BigInt(requiredText);
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
  for (const party of root.lifecycle.parties.filter((entry) => entry.location.kind === 'TRANSIT')) {
    const location = party.location;
    if (location.kind !== 'TRANSIT') continue;
    const matches = trustedTransitSegments.filter(
      (segment) =>
        segment.worldId === root.lifecycle.worldId &&
        segment.companyId === root.lifecycle.companyId &&
        segment.partyId === party.partyId &&
        segment.segmentId === location.segmentId &&
        segment.startedAt === location.startedAt &&
        segment.dueTick === location.arrivalNotBefore,
    );
    requirePhysical(matches.length === 1, 'INVALID_SOURCE');
    const segment = matches[0]!;
    const profile = travelProfile(segment.profileId);
    requirePhysical(profile, 'INVALID_SOURCE');
    const end = to < BigInt(segment.dueTick) ? to : BigInt(segment.dueTick);
    const start = from > BigInt(segment.startedAt) ? from : BigInt(segment.startedAt);
    if (end <= start) continue;
    const interval = BigInt(profile.staminaEveryTicks);
    const completedBefore = (start - BigInt(segment.startedAt)) / interval;
    const completedThrough = (end - BigInt(segment.startedAt)) / interval;
    if (completedThrough <= completedBefore) continue;
    const members = root.lifecycle.characters.filter(
      (entry) => entry.presence.fieldPartyId === party.partyId,
    );
    for (const character of members) {
      for (let boundary = completedBefore + 1n; boundary <= completedThrough; boundary++) {
        const vitals = physical.vitals.find(
          (entry) => entry.characterId === character.identity.characterId,
        );
        const key = physicalId('travel-stamina-v1', physical.sourceEffects.length.toString());
        const requestKey = canonicalJson({
          segmentId: segment.segmentId,
          routeEpoch: segment.routeEpoch,
          characterId: character.identity.characterId,
          cost: profile.staminaPerMember,
          boundaryTick: (BigInt(segment.startedAt) + boundary * interval).toString(),
        });
        const prior = physical.sourceEffects.find((entry) => entry.requestKey === requestKey);
        if (prior) {
          requirePhysical(prior.requestKey === requestKey, 'IDEMPOTENCY_CONFLICT');
          continue;
        }
        requirePhysical(
          vitals && vitals.currentStamina >= profile.staminaPerMember,
          'INSUFFICIENT_STAMINA',
        );
        physical = {
          ...physical,
          vitals: physical.vitals.map((entry) =>
            entry.characterId === character.identity.characterId
              ? {
                  ...entry,
                  currentStamina: entry.currentStamina - profile.staminaPerMember,
                }
              : entry,
          ),
          sourceEffects: [...physical.sourceEffects, { key, requestKey }],
        };
      }
    }
  }
  physical = { ...physical, processedTick: campaignTick(to.toString()) };
  const lifecycle = syncLifecycleConditions(root.lifecycle, physical);
  return { lifecycle, finance: root.finance, physical };
}
