import { COMPANY_RULES } from './definitions.js';
import { effectiveLeaderId } from './lifecycle-state.js';
import { day, economyId, min, q, requireEconomy, t } from './economy-state.js';
import type { CampaignTick } from './values.js';
import type { LifecycleState } from './lifecycle-types.js';
import type {
  CompanyFinance,
  EarnedPeriod,
  FinanceChange,
  MaintenanceAgreement,
  MaintenanceReceipt,
  ServiceAccount,
  WageClaim,
} from './economy-types.js';

/** Refuse oversized catch-up atomically; the adapter can submit consecutive bounded intervals. */
const MAX_MATERIALIZED_DAYS = 1000n;
export function wageAt(account: ServiceAccount, tick: CampaignTick) {
  const schedule = account.schedule;
  if (!schedule) return { version: 'material-support-only', dailyWageMilli: '0' };
  const notice = [...schedule.notices].reverse().find((n) => BigInt(n.effectiveAt) <= BigInt(tick));
  return notice
    ? { version: notice.version, dailyWageMilli: notice.dailyWageMilli }
    : { version: schedule.scheduleId, dailyWageMilli: schedule.agreedDailyWageMilli };
}
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
export function maintenanceAt(
  finance: CompanyFinance,
  characterId: string,
  tick: CampaignTick,
): MaintenanceAgreement | undefined {
  return finance.maintenance.find((m) => beneficiaryCoveredAt(m, characterId, tick));
}
function appendPeriod(
  periods: readonly EarnedPeriod[],
  period: EarnedPeriod,
): readonly EarnedPeriod[] {
  if (period.fromTick === period.toTick) return periods;
  const last = periods.at(-1);
  if (
    last &&
    last.toTick === period.fromTick &&
    last.dailyWageMilli === period.dailyWageMilli &&
    last.maintenanceId === period.maintenanceId
  )
    return [...periods.slice(0, -1), { ...last, toTick: period.toTick }];
  return [...periods, period];
}
function appendMaintenance(
  receipts: readonly MaintenanceReceipt[],
  receipt: MaintenanceReceipt,
): readonly MaintenanceReceipt[] {
  const index = receipts.findIndex(
    (r) =>
      r.agreementId === receipt.agreementId &&
      r.beneficiaryId === receipt.beneficiaryId &&
      r.fulfillment === receipt.fulfillment &&
      r.toTick === receipt.fromTick,
  );
  return index === -1
    ? [...receipts, receipt]
    : receipts.map((r, i) => (i === index ? { ...r, toTick: receipt.toTick } : r));
}
/** Close old half-open intervals before changing rates, leadership, location or support mode. */
export function accrueFinance(
  finance: CompanyFinance,
  lifecycle: LifecycleState,
  toTick: CampaignTick,
): FinanceChange {
  const from = BigInt(finance.processedTick);
  const to = BigInt(toTick);
  requireEconomy(to >= from && to / day - from / day <= MAX_MATERIALIZED_DAYS, 'INVALID_TIME');
  if (to === from) return { finance, requirements: [], allocations: [] };
  requireEconomy(lifecycle.company, 'INVALID_STATE');
  const requirements: FinanceChange['requirements'][number][] = [];
  let claims = finance.claims;
  let receipts = finance.maintenanceReceipts;
  let food = finance.food;
  for (const account of finance.accounts) {
    const membership = lifecycle.memberships.find((m) => m.membershipId === account.membershipId)!;
    const begin = from > BigInt(membership.startedAt) ? from : BigInt(membership.startedAt);
    const finish = membership.endedAt === null ? to : min(to, BigInt(membership.endedAt));
    if (finish <= begin) continue;
    const boundaries = new Set<bigint>([begin, finish]);
    for (let boundary = (begin / day + 1n) * day; boundary < finish; boundary += day)
      boundaries.add(boundary);
    for (const notice of account.schedule?.notices ?? []) {
      const boundary = BigInt(notice.effectiveAt);
      if (boundary > begin && boundary < finish) boundaries.add(boundary);
    }
    for (const mode of finance.maintenance.filter((m) =>
      m.beneficiaryIds.includes(membership.characterId),
    )) {
      const departure = mode.beneficiaryEnds.find((d) => d.characterId === membership.characterId);
      for (const value of [
        mode.startedAt,
        mode.endedAt,
        mode.knownEndedAt,
        departure?.atTick ?? null,
        departure?.knownAtTick ?? null,
      ])
        if (value !== null) {
          const boundary = BigInt(value);
          if (boundary > begin && boundary < finish) boundaries.add(boundary);
        }
    }
    const points = [...boundaries].sort((a, b) => (a < b ? -1 : 1));
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i]!;
      const end = points[i + 1]!;
      const fromTick = t(start),
        until = t(end);
      const rate = wageAt(account, fromTick);
      const mode = maintenanceAt(finance, membership.characterId, fromTick);
      const reportedMode = finance.maintenance.find((m) =>
        beneficiaryCoveredAt(m, membership.characterId, fromTick, true),
      );
      const wageCovered = mode?.kind === 'SAFE_SERVICE';
      const reportCovered = reportedMode?.kind === 'SAFE_SERVICE';
      const actualEnd = account.death ? min(end, BigInt(account.death.atTick)) : end;
      const liveTicks = actualEnd > start ? actualEnd - start : 0n;
      const earns =
        membership.basis === 'PAID' &&
        !account.knownPaused &&
        effectiveLeaderId(lifecycle) !== membership.characterId;
      const reports =
        account.known &&
        membership.basis === 'PAID' &&
        !account.knownPaused &&
        !account.knownDeath &&
        lifecycle.knowledge.leaderId !== membership.characterId;
      const actualTicks = earns ? liveTicks : 0n;
      const reported = reports ? (end - start) * BigInt(rate.dailyWageMilli) : 0n;
      const earned: EarnedPeriod = {
        fromTick,
        toTick: t(start + actualTicks),
        dailyWageMilli: rate.dailyWageMilli,
        maintenanceId: wageCovered ? mode.agreementId : null,
      };
      if ((actualTicks > 0n || reported > 0n) && BigInt(rate.dailyWageMilli) > 0n) {
        const dueAt = t((start / day + 1n) * day);
        const previous = claims.find(
          (c) =>
            c.membershipId === membership.membershipId &&
            c.poolId === account.poolId &&
            c.dueAt === dueAt &&
            c.rateVersion === rate.version &&
            c.maintenanceId === (reportCovered ? reportedMode.agreementId : null) &&
            c.toTick === fromTick,
        );
        if (previous) {
          claims = claims.map((c) =>
            c === previous
              ? {
                  ...c,
                  toTick: until,
                  earned: appendPeriod(c.earned, earned),
                  reportedQ: q(BigInt(c.reportedQ) + reported),
                  reportedCoveredQ: q(BigInt(c.reportedCoveredQ) + (reportCovered ? reported : 0n)),
                }
              : c,
          );
        } else {
          const claim: WageClaim = {
            claimId: economyId('wage', membership.membershipId, fromTick),
            membershipId: membership.membershipId,
            poolId: account.poolId,
            dueAt,
            rateVersion: rate.version,
            fromTick,
            toTick: until,
            dailyWageMilli: rate.dailyWageMilli,
            maintenanceId: reportCovered ? reportedMode.agreementId : null,
            earned: appendPeriod([], earned),
            paidQ: q(0n),
            reportedQ: q(reported),
            reportedCoveredQ: q(reportCovered ? reported : 0n),
          };
          claims = [...claims, claim];
        }
      }
      const character = lifecycle.characters.find(
        (p) => p.identity.characterId === membership.characterId,
      )!;
      const receivesFood =
        !account.knownPaused &&
        !['CAPTIVE', 'OUT_OF_CONTACT'].includes(character.presence.availability);
      const demand = receivesFood
        ? liveTicks * BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay)
        : 0n;
      if (demand > 0n) {
        const old = food.find((f) => f.membershipId === membership.membershipId);
        const interval = {
          fromTick,
          toTick: t(start + liveTicks),
          agreementId: mode?.agreementId ?? null,
        };
        const previous = old?.intervals.at(-1);
        const intervals =
          previous && previous.toTick === fromTick && previous.agreementId === interval.agreementId
            ? [...old!.intervals.slice(0, -1), { ...previous, toTick: interval.toTick }]
            : [...(old?.intervals ?? []), interval];
        const row = { membershipId: membership.membershipId, intervals };
        food = old ? food.map((f) => (f === old ? row : f)) : [...food, row];
        if (mode)
          receipts = appendMaintenance(receipts, {
            agreementId: mode.agreementId,
            beneficiaryId: membership.characterId,
            fromTick,
            toTick: t(start + liveTicks),
            fulfillment:
              mode.kind === 'SAFE_SERVICE' ? 'CURRENT_FOOD_LODGING_WAGE' : 'CURRENT_FOOD',
          });
        else
          requirements.push({
            kind: 'FOOD_CONSUMPTION',
            membershipId: membership.membershipId,
            fromTick,
            toTick: t(start + liveTicks),
            tickUnits: demand.toString(),
          });
      }
    }
  }
  return {
    finance: { ...finance, processedTick: toTick, claims, food, maintenanceReceipts: receipts },
    requirements,
    allocations: [],
  };
}
