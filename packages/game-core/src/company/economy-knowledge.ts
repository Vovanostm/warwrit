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
  requireEconomy(rate, 'INVALID_SOURCE');
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
  // Estimated liabilities, allocation epochs, reservations and publicly spendable cash do NOT change.
  return {
    finance,
    requirements: [
      {
        kind: 'OUTCOME_APPLICATION',
        characterId: fact.characterId,
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
  if (fact?.kind !== 'COMPANY_OBSERVATION' || fact.subject.kind !== 'CHARACTER')
    return { finance, requirements: [], allocations: [] };
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
  return { finance: closeEpochs(finance, context.atTick), requirements: [], allocations };
}
