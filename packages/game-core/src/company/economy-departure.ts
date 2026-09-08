import { COMPANY_RULES } from './definitions.js';
import { canPerform, effectiveLeaderId, person } from './lifecycle-state.js';
import { wageAt } from './economy-accrual.js';
import { moveCash, recipientWallet, settleAvailableFinalClaims } from './economy-payments.js';
import {
  accountFor,
  actualOwedQ,
  claimsForCharacter,
  closeEpochs,
  recordSource,
  day,
  economyId,
  financeFact,
  min,
  own,
  poolWallet,
  q,
  requireEconomy,
  requirePoolAccess,
  t,
  validateFinanceFact,
} from './economy-state.js';
import type { CommandOf, LifecycleState } from './lifecycle-types.js';
import type {
  CompanyEconomyState,
  CompanyFinance,
  EconomyContext,
  EconomyRequirement,
  FinanceChange,
} from './economy-types.js';

function service(state: CompanyEconomyState, membershipId: string) {
  const member = state.lifecycle.memberships.find((m) => m.membershipId === membershipId);
  requireEconomy(member, 'CONTACT_OR_ACCESS_REQUIRED');
  const account = accountFor(state.finance, membershipId);
  requireEconomy(account.known, 'CONTACT_OR_ACCESS_REQUIRED');
  return { member, account };
}
/** Warnings use only known debt and an actual communication; a hidden death cannot reset them. */
export function updateArrears(
  finance: CompanyFinance,
  lifecycle: LifecycleState,
  context: EconomyContext,
): FinanceChange {
  const at = BigInt(context.atTick);
  let episodes = finance.arrears,
    intents = finance.departures;
  const requirements: EconomyRequirement[] = [];
  for (const account of finance.accounts.filter((a) => a.known)) {
    const member = lifecycle.memberships.find((m) => m.membershipId === account.membershipId)!;
    const outstanding = finance.claims.filter(
      (c) =>
        c.membershipId === account.membershipId &&
        BigInt(c.dueAt) <= at &&
        BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ) - BigInt(c.paidQ) > 0n,
    );
    let episode = episodes.find(
      (e) => e.membershipId === account.membershipId && e.resolvedAt === null,
    );
    if (outstanding.length === 0 || account.knownDeath || member.endedAt !== null) {
      if (episode)
        episodes = episodes.map((e) => (e === episode ? { ...e, resolvedAt: context.atTick } : e));
      if (outstanding.length === 0 && member.endedAt === null)
        intents = intents.map((d) =>
          d.membershipId === account.membershipId &&
          d.reason === 'WAGE_BREACH' &&
          d.cancelledAt === null
            ? { ...d, cancelledAt: context.atTick }
            : d,
        );
      continue;
    }
    const first = outstanding.reduce(
      (old, c) => (BigInt(c.dueAt) < BigInt(old) ? c.dueAt : old),
      outstanding[0]!.dueAt,
    );
    if (!episode) {
      episode = {
        episodeId: economyId('arrears', account.membershipId, String(episodes.length)),
        membershipId: account.membershipId,
        firstDueAt: first,
        complaintAt: null,
        warning: null,
        resolvedAt: null,
      };
      episodes = [...episodes, episode];
    }
    const communications = context.financeFacts.filter(
      (f) =>
        f.kind === 'WAGE_COMMUNICATION' &&
        f.membershipId === account.membershipId &&
        f.atTick === context.atTick,
    );
    requireEconomy(communications.length <= 1, 'INVALID_SOURCE');
    const communication = communications[0];
    if (communication?.kind === 'WAGE_COMMUNICATION') {
      validateFinanceFact(communication, context);
      const recorded = recordSource(finance, communication);
      if (recorded.replayed) continue;
      finance = recorded.finance;
      requireEconomy(
        communication.leaderId === effectiveLeaderId(lifecycle) &&
          context.contactIds.includes(member.characterId) &&
          Object.values(communication.relation).every(
            (n) => Number.isInteger(n) && n >= 0 && n <= 100,
          ),
        'INVALID_SOURCE',
      );
      if (episode.complaintAt === null) {
        episode = { ...episode, complaintAt: context.atTick };
        requirements.push({
          kind: 'INFORMED_SOCIAL_CONTRIBUTION',
          sourceId: episode.episodeId,
          characterId: member.characterId,
          cause: 'WAGE_COMPLAINT',
        });
      }
      if (
        episode.warning === null &&
        at >= BigInt(episode.firstDueAt) + BigInt(COMPANY_RULES.economy.warningAfterTicks)
      ) {
        const r = communication.relation;
        const score = r.friend + r.respect - r.rivalry;
        const adjustment =
          BigInt(COMPANY_RULES.economy.warningRelationAdjustmentTicks) *
          (score >= COMPANY_RULES.economy.warningRelationThreshold
            ? 1n
            : score <= -COMPANY_RULES.economy.warningRelationThreshold
              ? -1n
              : 0n);
        let window = BigInt(COMPANY_RULES.economy.warningBaseWindowTicks) + adjustment;
        window = min(window, BigInt(COMPANY_RULES.economy.warningMaximumWindowTicks));
        if (window < BigInt(COMPANY_RULES.economy.warningMinimumWindowTicks))
          window = BigInt(COMPANY_RULES.economy.warningMinimumWindowTicks);
        episode = {
          ...episode,
          warning: {
            atTick: context.atTick,
            deadline: t(at + window),
            leaderId: communication.leaderId,
            relation: own(r),
            sourceId: communication.sourceEventId,
          },
        };
        requirements.push({
          kind: 'INFORMED_SOCIAL_CONTRIBUTION',
          sourceId: episode.episodeId,
          characterId: member.characterId,
          cause: 'FINAL_WARNING',
        });
      }
      episodes = episodes.map((e) => (e.episodeId === episode!.episodeId ? episode! : e));
    }
    if (
      episode.warning &&
      at >= BigInt(episode.warning.deadline) &&
      !intents.some((d) => d.causeId === episode!.episodeId)
    ) {
      intents = [
        ...intents,
        {
          intentId: economyId(episode.episodeId, 'departure'),
          membershipId: account.membershipId,
          reason: 'WAGE_BREACH',
          causeId: episode.episodeId,
          requestedAt: episode.warning.deadline,
          cancelledAt: null,
        },
      ];
    }
  }
  return {
    finance: { ...finance, arrears: episodes, departures: intents },
    requirements,
    allocations: [],
  };
}
export function requestDeparture(
  state: CompanyEconomyState,
  command: CommandOf<'RequestDeparture'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload;
  const { member } = service(state, p.membershipId);
  requireEconomy(
    member.endedAt === null &&
      p.acknowledgedQuoteRevision === state.lifecycle.knowledge.revision &&
      context.atTick === state.finance.processedTick,
    'STALE_REVISION',
  );
  requireEconomy(context.contactIds.includes(member.characterId), 'CONTACT_OR_ACCESS_REQUIRED');
  const existing = state.finance.departures.find(
    (d) => d.membershipId === p.membershipId && d.reason === p.reason && d.causeId === p.causeId,
  );
  if (p.reason !== 'DISMISSED')
    requireEconomy(existing && existing.cancelledAt === null, 'INVALID_SOURCE');
  const finance = existing
    ? state.finance
    : {
        ...state.finance,
        departures: [
          ...state.finance.departures,
          {
            intentId: economyId(command.commandId, 'departure'),
            membershipId: p.membershipId,
            reason: p.reason,
            causeId: p.causeId,
            requestedAt: context.atTick,
            cancelledAt: null,
          },
        ],
      };
  return { finance, requirements: [], allocations: [] };
}
export function prepareDepartureSettlement(
  state: CompanyEconomyState,
  command: CommandOf<'ExecuteDeparture'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload;
  const { member } = service(state, p.membershipId);
  const intent = state.finance.departures.find(
    (d) => d.intentId === p.intentId && d.membershipId === p.membershipId && d.cancelledAt === null,
  );
  requireEconomy(intent && member.endedAt === null, 'INVALID_SOURCE');
  const character = person(state.lifecycle, member.characterId);
  requireEconomy(
    !character.presence.encounterBindingId &&
      character.presence.availability === 'AVAILABLE' &&
      member.characterId !== effectiveLeaderId(state.lifecycle),
    'INCOMPATIBLE_ACTIVITY',
  );
  requireEconomy(
    canPerform(character, 'travel') || p.careHandoverId !== undefined,
    'INCOMPATIBLE_ACTIVITY',
  );
  // A careHandover ID still needs the actual 02.4 provider/resource checks. It is not proof of care.
  let finance: CompanyFinance = {
    ...state.finance,
    claims: state.finance.claims.map((c) =>
      c.membershipId === p.membershipId && BigInt(c.dueAt) > BigInt(context.atTick)
        ? { ...c, dueAt: context.atTick }
        : c,
    ),
  };
  for (const claim of finance.claims.filter((c) => c.membershipId === p.membershipId))
    finance = closeEpochs(finance, context.atTick, claim.poolId, claim.dueAt);
  const settled = settleAvailableFinalClaims(
    { ...state, finance },
    p.membershipId,
    context,
    command.commandId,
  );
  return {
    finance: settled.finance,
    allocations: settled.allocations,
    requirements: [
      {
        kind: 'PHYSICAL_DEPARTURE',
        membershipId: p.membershipId,
        intentId: intent.intentId,
        atTick: context.atTick,
        returnContainerId: p.returnContainerId,
        careHandoverId: p.careHandoverId ?? null,
      },
    ],
  };
}
/** A private query for an authenticated adapter. Only a currently informed counterpart is quotable. */
export function quoteCompanyFarewell(
  state: CompanyEconomyState,
  membershipId: string,
  context: EconomyContext,
) {
  const { member, account } = service(state, membershipId);
  requireEconomy(
    context.companyId === state.lifecycle.companyId &&
      context.worldId === state.lifecycle.worldId &&
      context.atTick === state.finance.processedTick &&
      context.publicRevision === state.lifecycle.knowledge.revision,
    'STALE_REVISION',
  );
  requireEconomy(
    account.confirmedAt === context.atTick && !account.knownDeath,
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const relation = financeFact(context, 'FAREWELL_CONTEXT');
  requireEconomy(
    relation.membershipId === membershipId &&
      relation.leaderId === effectiveLeaderId(state.lifecycle) &&
      context.contactIds.includes(member.characterId) &&
      Number.isInteger(relation.friendship) &&
      relation.friendship >= 0 &&
      relation.friendship <= 100,
    'INVALID_SOURCE',
  );
  const intent = state.finance.departures.find(
    (d) => d.intentId === relation.departureIntentId && d.membershipId === membershipId,
  );
  requireEconomy(
    intent && (member.endedAt !== null || intent.cancelledAt === null),
    'INCOMPATIBLE_ACTIVITY',
  );
  const until = member.endedAt ?? context.atTick;
  const duration = BigInt(until) - BigInt(member.startedAt);
  const significant =
    duration >= BigInt(COMPANY_RULES.economy.significantServiceTicks) ||
    relation.friendship >= COMPANY_RULES.economy.significantFriendship;
  const days = significant
    ? min(
        BigInt(COMPANY_RULES.farewellMaxDays),
        1n + duration / day / BigInt(COMPANY_RULES.economy.farewellServiceDaysPerExtraDay),
      )
    : 0n;
  const ceiling = days * day * BigInt(wageAt(account, until).dailyWageMilli);
  const given = state.finance.farewells
    .filter((g) => g.membershipId === membershipId)
    .reduce((s, g) => s + BigInt(g.amountQ), 0n);
  const outstandingQ = claimsForCharacter(
    state.finance,
    state.lifecycle,
    member.characterId,
  ).reduce((s, c) => s + actualOwedQ(c), 0n);
  return {
    membershipId,
    intentId: intent.intentId,
    reason: intent.reason,
    quoteRevision: state.lifecycle.knowledge.revision,
    atTick: context.atTick,
    maximumAdditionalQ: q(ceiling > given ? ceiling - given : 0n),
    mandatoryOutstandingQ: q(outstandingQ),
  };
}
export function grantFarewell(
  state: CompanyEconomyState,
  command: CommandOf<'GrantFarewell'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload,
    quote = quoteCompanyFarewell(state, p.membershipId, context);
  requireEconomy(p.quoteRevision === quote.quoteRevision, 'STALE_REVISION');
  requireEconomy(quote.mandatoryOutstandingQ === '0', 'UNPAID_OBLIGATIONS');
  const amount = BigInt(p.amountQ);
  requireEconomy(amount > 0n && amount <= BigInt(quote.maximumAdditionalQ), 'INVALID_ARGUMENT');
  const account = accountFor(state.finance, p.membershipId);
  const access = requirePoolAccess(state, p.poolId, context);
  requireEconomy(
    account.confirmedAt === context.atTick && !account.knownDeath,
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const destination = recipientWallet(state.finance, account.recipient, access);
  requireEconomy(destination, 'CONTACT_OR_ACCESS_REQUIRED');
  const finance = moveCash(
    state.finance,
    poolWallet(state.finance, p.poolId).walletId,
    destination.walletId,
    amount,
    context.atTick,
    economyId(command.commandId, 'farewell'),
    'FAREWELL',
  );
  const priorGift = finance.farewells.some((g) => g.membershipId === p.membershipId);
  return {
    finance: {
      ...finance,
      farewells: [
        ...finance.farewells,
        {
          membershipId: p.membershipId,
          amountQ: p.amountQ as typeof quote.maximumAdditionalQ,
          atTick: context.atTick,
          commandId: command.commandId,
        },
      ],
    },
    allocations: [],
    requirements: priorGift
      ? []
      : [
          {
            kind: 'INFORMED_SOCIAL_CONTRIBUTION',
            sourceId: economyId(p.membershipId, 'farewell'),
            characterId: account.recipient.id,
            cause: 'FAREWELL',
          },
        ],
  };
}
