import { canPerform, person } from './lifecycle-state.js';
import type { CampaignTick } from './values.js';
import type { LifecycleState } from './lifecycle-types.js';
import type { CompanyFinance, MaintenanceAgreement } from './economy-types.js';

export function beneficiaryCoveredAt(
  mode: MaintenanceAgreement,
  characterId: string,
  tick: CampaignTick,
  known = false,
): boolean {
  const end = known ? mode.knownEndedAt : mode.endedAt;
  const departure = mode.beneficiaryEnds.find((d) => d.characterId === characterId);
  const departureAt = departure && (known ? departure.knownAtTick : departure.atTick);
  return (
    mode.beneficiaryIds.includes(characterId) &&
    BigInt(mode.startedAt) <= BigInt(tick) &&
    (end === null || BigInt(tick) < BigInt(end)) &&
    (departureAt == null || BigInt(tick) < BigInt(departureAt))
  );
}

/** Only still-covered, actually able and living beneficiaries can sustain a field camp. */
export function fieldCampHasWorker(
  finance: CompanyFinance,
  lifecycle: LifecycleState,
  mode: MaintenanceAgreement,
  tick: CampaignTick,
): boolean {
  return mode.beneficiaryIds.some((id) => {
    if (!beneficiaryCoveredAt(mode, id, tick) || !canPerform(person(lifecycle, id), 'basicWork'))
      return false;
    const memberships = lifecycle.memberships.filter((m) => m.characterId === id);
    return !finance.accounts.some(
      (a) =>
        memberships.some((m) => m.membershipId === a.membershipId) &&
        a.death !== null &&
        BigInt(a.death.atTick) <= BigInt(tick),
    );
  });
}
