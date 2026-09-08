import { beneficiaryCoveredAt, fieldCampHasWorker } from './economy-coverage.js';
import { COMPANY_RULES } from './definitions.js';
import { person } from './lifecycle-state.js';
import {
  day,
  accountFor,
  actualOwedQ,
  claimCoveredQ,
  claimEarnedQ,
  closeEpochs,
  financeFact,
  own,
  recordSource,
  replaceAccount,
  requireEconomy,
  t,
  q,
  validateFinanceFact,
} from './economy-state.js';
import { reconcileClaim, settleReservations } from './economy-payments.js';
import type { CommandOf, LifecycleState } from './lifecycle-types.js';
import type {
  CompanyEconomyState,
  CompanyFinance,
  EconomyContext,
  FinanceChange,
  EconomyRequirement,
  QualificationNoticeEvidence,
} from './economy-types.js';

export function recordQualification(
  finance: CompanyFinance,
  fact: QualificationNoticeEvidence,
  context: EconomyContext,
): CompanyFinance {
  validateFinanceFact(fact, context);
  const recorded = recordSource(finance, fact);
  if (recorded.replayed) return finance;
  const account = accountFor(finance, fact.membershipId);
  const schedule = account.schedule;
  requireEconomy(
    schedule &&
      account.known &&
      !account.knownDeath &&
      Number.isInteger(fact.lifetimeLevel) &&
      fact.lifetimeLevel >= 0 &&
      fact.lifetimeLevel <= COMPANY_RULES.maxSkillLevel,
    'INVALID_SOURCE',
  );
  requireEconomy(
    schedule.notices.every(
      (n) => n.lifetimeLevel <= fact.lifetimeLevel && n.version !== fact.noticeVersion,
    ),
    'INVALID_SOURCE',
  );
  const rate = [...schedule.rates].reverse().find((r) => r.minimumLevel <= fact.lifetimeLevel);
  requireEconomy(
    rate &&
      BigInt(rate.dailyWageMilli) >=
        BigInt(schedule.notices.at(-1)?.dailyWageMilli ?? schedule.agreedDailyWageMilli),
    'INVALID_SOURCE',
  );
  if (
    rate.dailyWageMilli ===
    (schedule.notices.at(-1)?.dailyWageMilli ?? schedule.agreedDailyWageMilli)
  )
    return recorded.finance;
  const notice = {
    sourceId: fact.sourceEventId,
    version: fact.noticeVersion,
    notifiedAt: context.atTick,
    effectiveAt: t((BigInt(context.atTick) / day + 1n) * day),
    lifetimeLevel: fact.lifetimeLevel,
    dailyWageMilli: rate.dailyWageMilli,
  };
  return replaceAccount(recorded.finance, {
    ...account,
    schedule: { ...schedule, notices: [...schedule.notices, notice] },
  });
}
export function recordFinancialDeath(
  state: CompanyEconomyState,
  command: CommandOf<'RecordDeath'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload,
    fact = financeFact(context, 'FINANCIAL_DEATH', p.receiptId);
  requireEconomy(
    fact.sourceEventId === command.sourceEventId &&
      fact.characterId === p.characterId &&
      fact.actualDeathTick === p.actualDeathTick &&
      fact.causeId === p.causeId &&
      fact.custodyOutcomeId === p.custodyOutcomeId,
    'INVALID_SOURCE',
  );
  person(state.lifecycle, fact.characterId);
  if (fact.recipient.kind === 'CHARACTER') person(state.lifecycle, fact.recipient.id);
  else
    requireEconomy(
      fact.recipient.kind === 'ESTATE' && fact.recipient.id === fact.characterId,
      'INVALID_SOURCE',
    );
  const recorded = recordSource(state.finance, fact);
  if (recorded.replayed) return { finance: state.finance, requirements: [], allocations: [] };
  let finance = recorded.finance;
  const members = state.lifecycle.memberships.filter((m) => m.characterId === fact.characterId);
  requireEconomy(members.length > 0, 'INVALID_SOURCE');
  for (const member of members) {
    const account = accountFor(finance, member.membershipId);
    requireEconomy(
      !account.death && BigInt(account.confirmedAt) <= BigInt(fact.actualDeathTick),
      'INVALID_SOURCE',
    );
    finance = replaceAccount(finance, {
      ...account,
      death: {
        sourceId: fact.sourceEventId,
        atTick: fact.actualDeathTick,
        recipient: own(fact.recipient),
      },
    });
    finance = {
      ...finance,
      claims: finance.claims.map((c) =>
        c.membershipId !== member.membershipId
          ? c
          : {
              ...c,
              earned: c.earned.flatMap((e) =>
                BigInt(e.fromTick) >= BigInt(fact.actualDeathTick)
                  ? []
                  : [
                      {
                        ...e,
                        toTick:
                          BigInt(e.toTick) > BigInt(fact.actualDeathTick)
                            ? fact.actualDeathTick
                            : e.toTick,
                      },
                    ],
              ),
            },
      ),
    };
    requireEconomy(
      finance.claims
        .filter((c) => c.membershipId === member.membershipId)
        .every((c) => actualOwedQ(c) >= 0n),
      'INVALID_SOURCE',
    );
  }
  finance = {
    ...finance,
    food: finance.food.map((f) =>
      !members.some((m) => m.membershipId === f.membershipId)
        ? f
        : {
            ...f,
            intervals: f.intervals.flatMap((i) =>
              BigInt(i.fromTick) >= BigInt(fact.actualDeathTick)
                ? []
                : [
                    {
                      ...i,
                      toTick:
                        BigInt(i.toTick) > BigInt(fact.actualDeathTick)
                          ? fact.actualDeathTick
                          : i.toTick,
                    },
                  ],
            ),
          },
    ),
    maintenanceReceipts: finance.maintenanceReceipts.flatMap((r) =>
      r.beneficiaryId !== fact.characterId
        ? [r]
        : BigInt(r.fromTick) >= BigInt(fact.actualDeathTick)
          ? []
          : [
              {
                ...r,
                toTick:
                  BigInt(r.toTick) > BigInt(fact.actualDeathTick) ? fact.actualDeathTick : r.toTick,
              },
            ],
    ),
    maintenance: finance.maintenance.map((m) =>
      m.kind === 'FIELD_CAMP' &&
      m.endedAt === null &&
      beneficiaryCoveredAt(m, fact.characterId, fact.actualDeathTick) &&
      !fieldCampHasWorker(finance, state.lifecycle, m, fact.actualDeathTick)
        ? { ...m, endedAt: fact.actualDeathTick }
        : m,
    ),
  };
  // A delayed private outcome also corrects actual camp support, never its public estimate.
  const foodCorrections: EconomyRequirement[] = [];
  finance = {
    ...finance,
    food: finance.food.map((row) => ({
      ...row,
      intervals: row.intervals.flatMap((interval) => {
        const mode = finance.maintenance.find((m) => m.agreementId === interval.agreementId);
        if (
          !mode ||
          mode.kind !== 'FIELD_CAMP' ||
          mode.endedAt === null ||
          BigInt(interval.toTick) <= BigInt(mode.endedAt)
        )
          return [interval];
        const from =
          BigInt(interval.fromTick) > BigInt(mode.endedAt) ? interval.fromTick : mode.endedAt;
        foodCorrections.push({
          kind: 'FOOD_CONSUMPTION',
          membershipId: row.membershipId,
          fromTick: from,
          toTick: interval.toTick,
          tickUnits: (
            (BigInt(interval.toTick) - BigInt(from)) *
            BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay)
          ).toString(),
        });
        return [
          ...(from === interval.fromTick ? [] : [{ ...interval, toTick: from }]),
          { ...interval, fromTick: from, agreementId: null },
        ];
      }),
    })),
    maintenanceReceipts: finance.maintenanceReceipts.flatMap((r) => {
      const mode = finance.maintenance.find((m) => m.agreementId === r.agreementId);
      if (!mode || mode.endedAt === null || BigInt(r.toTick) <= BigInt(mode.endedAt)) return [r];
      return BigInt(r.fromTick) >= BigInt(mode.endedAt) ? [] : [{ ...r, toTick: mode.endedAt }];
    }),
  };
  // Estimated liabilities, allocation epochs, reservations and publicly spendable cash do NOT change.
  return {
    finance,
    requirements: [
      ...foodCorrections,
      {
        kind: 'OUTCOME_APPLICATION',
        characterId: fact.characterId,
        actualDeathTick: fact.actualDeathTick,
        sourceEventId: fact.sourceEventId,
        custodyOutcomeId: fact.custodyOutcomeId,
      },
    ],
    allocations: [],
  };
}
/** Only the actual lifecycle disclosure authorizes changing the financial observation. */
export function observeFinance(
  finance: CompanyFinance,
  lifecycle: LifecycleState,
  command: CommandOf<'Observe'>,
  context: EconomyContext,
): FinanceChange {
  const fact = context.facts.find((f) => f.id === command.payload.observationId);
  if (fact?.kind !== 'COMPANY_OBSERVATION') return { finance, requirements: [], allocations: [] };
  if (fact.subject.kind === 'COMPANY') {
    const leader = lifecycle.knowledge.leaderId;
    return {
      finance: {
        ...finance,
        maintenance: finance.maintenance.map((m) =>
          m.kind === 'SAFE_SERVICE' &&
          m.endedAt !== null &&
          (!leader ||
            !m.beneficiaryIds.includes(leader) ||
            m.beneficiaryEnds.some((d) => d.characterId === leader))
            ? { ...m, knownEndedAt: m.endedAt }
            : m,
        ),
      },
      requirements: [],
      allocations: [],
    };
  }
  finance = {
    ...finance,
    maintenance: finance.maintenance.map((m) => ({
      ...m,
      beneficiaryEnds: m.beneficiaryEnds.map((d) =>
        d.characterId === fact.subject.id ? { ...d, knownAtTick: d.atTick } : d,
      ),
    })),
  };
  const character = person(lifecycle, fact.subject.id);
  const accounts = finance.accounts.filter(
    (a) =>
      lifecycle.memberships.find((m) => m.membershipId === a.membershipId)?.characterId ===
      fact.subject.id,
  );
  const allocations: FinanceChange['allocations'][number][] = [];
  for (let account of accounts) {
    // The outcome component must have supplied the death and the legitimate disclosure together.
    requireEconomy(
      (character.presence.availability === 'DEAD') === (account.death !== null),
      'INVALID_SOURCE',
    );
    const oldAccount = account;
    for (const claim of finance.claims.filter((c) => c.membershipId === account.membershipId)) {
      if (
        !oldAccount.known ||
        oldAccount.knownDeath !== (character.presence.availability === 'DEAD') ||
        BigInt(claim.reportedQ) !== claimEarnedQ(claim) ||
        BigInt(claim.reportedCoveredQ) !== claimCoveredQ(claim)
      )
        finance = closeEpochs(finance, context.atTick, claim.poolId, claim.dueAt);
    }
    account = {
      ...account,
      known: true,
      confirmedAt: context.atTick,
      knownDeath: character.presence.availability === 'DEAD',
      knownPaused: ['CAPTIVE', 'OUT_OF_CONTACT', 'DEAD'].includes(character.presence.availability),
    };
    finance = replaceAccount(finance, account);
    finance = {
      ...finance,
      claims: finance.claims.map((c) =>
        c.membershipId === account.membershipId
          ? { ...c, reportedQ: q(claimEarnedQ(c)), reportedCoveredQ: q(claimCoveredQ(c)) }
          : c,
      ),
    };
    for (const claim of finance.claims.filter((c) => c.membershipId === account.membershipId))
      finance = reconcileClaim(finance, claim.claimId, context.atTick);
    if (context.financeFacts.some((f) => f.kind === 'LOCAL_MONEY_ACCESS')) {
      const settled = settleReservations(
        { lifecycle, finance },
        account.membershipId,
        context,
        command.commandId,
      );
      finance = settled.finance;
      allocations.push(...settled.allocations);
    }
  }
  if (character.presence.availability === 'DEAD')
    finance = {
      ...finance,
      maintenance: finance.maintenance.map((m) =>
        m.kind === 'FIELD_CAMP' && m.beneficiaryIds.includes(fact.subject.id) && m.endedAt !== null
          ? { ...m, knownEndedAt: m.endedAt }
          : m,
      ),
    };
  return { finance, requirements: [], allocations };
}
