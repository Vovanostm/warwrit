import { beneficiaryCoveredAt, fieldCampHasWorker } from './economy-coverage.js';
import { COMPANY_RULES } from './definitions.js';
import { activeMembership, effectiveLeaderId, person, sameLocation } from './lifecycle-state.js';
import { isExactInteger } from './values.js';
import {
  accountFor,
  economyId,
  own,
  poolWallet,
  q,
  replaceAccount,
  requireEconomy,
  requirePoolAccess,
  validateFinanceFact,
  walletFor,
} from './economy-state.js';
import { moveCash } from './economy-payments.js';
import type { LifecycleReceipt, LifecycleState } from './lifecycle-types.js';
import type {
  CompanyFinance,
  EconomyContext,
  EconomyRequirement,
  FinanceChange,
  ServiceAccount,
  ServiceTermsEvidence,
} from './economy-types.js';

function termsFor(context: EconomyContext, characterId: string): ServiceTermsEvidence {
  const matches = context.financeFacts.filter(
    (f) => f.kind === 'SERVICE_TERMS' && f.characterId === characterId,
  );
  requireEconomy(matches.length === 1, 'INVALID_SOURCE');
  const fact = matches[0]!;
  requireEconomy(fact.kind === 'SERVICE_TERMS', 'INVALID_SOURCE');
  validateFinanceFact(fact, context);
  requireEconomy(
    fact.recipient.kind === 'CHARACTER' && fact.recipient.id === characterId,
    'INVALID_SOURCE',
  );
  return fact;
}
function addAccount(
  finance: CompanyFinance,
  next: LifecycleState,
  membershipId: string,
  dailyWageMilli: string | null,
  context: EconomyContext,
): CompanyFinance {
  requireEconomy(!finance.accounts.some((a) => a.membershipId === membershipId), 'INVALID_STATE');
  const member = next.memberships.find((m) => m.membershipId === membershipId);
  requireEconomy(member, 'INVALID_STATE');
  const terms = termsFor(context, member.characterId);
  const source = poolWallet(finance, terms.poolId);
  requireEconomy(
    sameLocation(source.location, person(next, member.characterId).presence.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  let schedule: ServiceAccount['schedule'] = null;
  if (member.basis === 'PAID') {
    requireEconomy(
      member.wageScheduleId && isExactInteger(dailyWageMilli) && BigInt(dailyWageMilli) > 0n,
      'INVALID_SOURCE',
    );
    requireEconomy(
      terms.rates.length === COMPANY_RULES.economy.qualificationBands.length &&
        terms.rates.every(
          (r, i) =>
            r.minimumLevel === COMPANY_RULES.economy.qualificationBands[i]!.level &&
            isExactInteger(r.dailyWageMilli) &&
            BigInt(r.dailyWageMilli) > 0n &&
            (i === 0 || BigInt(r.dailyWageMilli) >= BigInt(terms.rates[i - 1]!.dailyWageMilli)),
        ) &&
        terms.rates.some((r) => r.dailyWageMilli === dailyWageMilli),
      'INVALID_SOURCE',
    );
    schedule = {
      scheduleId: member.wageScheduleId,
      agreedAt: context.atTick,
      agreedDailyWageMilli: dailyWageMilli,
      rates: own(terms.rates),
      notices: [],
    };
  } else requireEconomy(dailyWageMilli === null || dailyWageMilli === '0', 'INVALID_SOURCE');
  const account: ServiceAccount = {
    membershipId,
    poolId: terms.poolId,
    recipient: own(terms.recipient),
    schedule,
    known: context.principal.kind === 'PLAYER',
    confirmedAt: context.atTick,
    knownPaused: false,
    knownDeath: false,
    death: null,
  };
  return { ...finance, accounts: [...finance.accounts, account] };
}
function signing(
  finance: CompanyFinance,
  next: LifecycleState,
  characterId: string,
  poolId: string,
  amountQ: string,
  context: EconomyContext,
  key: string,
): CompanyFinance {
  if (amountQ === '0') return finance;
  const terms = termsFor(context, characterId);
  requireEconomy(terms.poolId === poolId, 'INVALID_SOURCE');
  requireEconomy(terms.signingWalletId !== null, 'INVALID_SOURCE');
  const recipient = walletFor(finance, terms.signingWalletId);
  requireEconomy(
    recipient.owner.kind === 'CHARACTER' &&
      recipient.owner.id === characterId &&
      sameLocation(recipient.location, person(next, characterId).presence.location),
    'INVALID_SOURCE',
  );
  return moveCash(
    finance,
    poolWallet(finance, poolId).walletId,
    recipient.walletId,
    BigInt(amountQ),
    context.atTick,
    key,
    'SIGNING',
  );
}
/** Consume the actual four WP02.2 requirement variants, never an independent ledger commit. */
export function settleLifecycleRequirements(
  finance: CompanyFinance,
  before: LifecycleState,
  next: LifecycleState,
  receipt: LifecycleReceipt,
  context: EconomyContext,
): FinanceChange {
  const remaining: EconomyRequirement[] = [];
  for (const requirement of receipt.requirements) {
    switch (requirement.kind) {
      case 'OPENING_ASSETS': {
        const { assets } = requirement;
        const origins = context.financeFacts.filter((f) => f.kind === 'OPENING_FUNDS');
        requireEconomy(origins.length === 1, 'INVALID_SOURCE');
        const grant = origins[0]!;
        requireEconomy(grant.kind === 'OPENING_FUNDS', 'INVALID_SOURCE');
        validateFinanceFact(grant, context);
        requireEconomy(
          before.company === null &&
            context.facts.some(
              (f) =>
                f.kind === 'OPENING' &&
                f.id === grant.openingEvidenceId &&
                f.sourceEventId === grant.sourceEventId,
            ) &&
            grant.amountQ === assets.cashQ,
          'INVALID_SOURCE',
        );
        const wallet = poolWallet(finance, grant.poolId);
        requireEconomy(sameLocation(wallet.location, next.parties[0]!.location), 'INVALID_SOURCE');
        finance = {
          ...finance,
          wallets: finance.wallets.map((w) =>
            w.walletId === wallet.walletId
              ? { ...w, cashQ: q(BigInt(w.cashQ) + BigInt(grant.amountQ)) }
              : w,
          ),
          movements: [
            ...finance.movements,
            {
              movementId: economyId(receipt.commandId, 'endowment'),
              from: grant.sourceEventId,
              to: wallet.walletId,
              amountQ: grant.amountQ,
              atTick: context.atTick,
              purpose: 'ORIGIN_ENDOWMENT',
            },
          ],
        };
        for (const member of next.memberships) {
          const rate = assets.serviceTerms.find((s) => s.membershipId === member.membershipId);
          finance = addAccount(
            finance,
            next,
            member.membershipId,
            rate?.dailyWageMilli ?? null,
            context,
          );
        }
        for (const charge of assets.signingCharges) {
          const member = activeMembership(next, charge.characterId)!;
          finance = signing(
            finance,
            next,
            charge.characterId,
            accountFor(finance, member.membershipId).poolId,
            charge.amountQ,
            context,
            economyId(receipt.commandId, charge.characterId, 'signing'),
          );
        }
        if (assets.debt) {
          person(next, assets.debt.recipientId);
          finance = {
            ...finance,
            obligations: [
              ...finance.obligations,
              {
                obligationId: economyId(receipt.commandId, 'origin-obligation'),
                recipient: { kind: 'CHARACTER', id: assets.debt.recipientId },
                amountQ: assets.debt.amountQ,
                sourceId: grant.sourceEventId,
                dueAt: null,
              },
            ],
          };
        }
        remaining.push({
          kind: 'OPENING_NONFINANCIAL',
          items: own(assets.items),
          contactReaction: own(assets.contactReaction),
          hookId: assets.hookId,
        });
        break;
      }
      case 'RECRUIT_SETTLEMENT': {
        const member = next.memberships.find((m) => m.membershipId === requirement.membershipId)!;
        const terms = termsFor(context, member.characterId);
        requireEconomy(terms.poolId === requirement.poolId, 'INVALID_SOURCE');
        finance = addAccount(
          finance,
          next,
          requirement.membershipId,
          requirement.dailyWageMilli,
          context,
        );
        finance = signing(
          finance,
          next,
          member.characterId,
          requirement.poolId,
          requirement.signingQ,
          context,
          economyId(receipt.commandId, 'signing'),
        );
        if (requirement.itemIds.length > 0)
          remaining.push({
            kind: 'RECRUIT_ITEMS',
            membershipId: requirement.membershipId,
            itemIds: [...requirement.itemIds],
          });
        break;
      }
      case 'DUTY_SETTLEMENT': {
        requireEconomy(requirement.atTick === context.atTick, 'INVALID_TIME');
        const member = activeMembership(next, requirement.characterId);
        requireEconomy(member, 'INVALID_STATE');
        let account = accountFor(finance, member.membershipId);
        let nextPool = requirement.fundingPoolId;
        if (
          nextPool === null &&
          !sameLocation(
            poolWallet(finance, account.poolId).location,
            person(next, requirement.characterId).presence.location,
          )
        ) {
          const bindings = context.financeFacts.filter(
            (f) => f.kind === 'PAYROLL_BINDING' && f.membershipId === member.membershipId,
          );
          requireEconomy(bindings.length === 1, 'INVALID_SOURCE');
          const binding = bindings[0]!;
          requireEconomy(binding.kind === 'PAYROLL_BINDING', 'INVALID_SOURCE');
          validateFinanceFact(binding, context);
          nextPool = binding.poolId;
        }
        if (nextPool !== null) {
          const wallet = poolWallet(finance, nextPool);
          requireEconomy(
            sameLocation(wallet.location, person(next, requirement.characterId).presence.location),
            'CONTACT_OR_ACCESS_REQUIRED',
          );
          if (nextPool !== account.poolId)
            requirePoolAccess({ lifecycle: next, finance }, nextPool, context);
          account = { ...account, poolId: nextPool };
        }
        // Return is a real lifecycle transition. Remote assignment and socket state are not contact loss.
        if (receipt.events.some((e) => e.type === 'ReturnedToService'))
          account = { ...account, knownPaused: false, confirmedAt: context.atTick };
        finance = replaceAccount(finance, account);
        if (requirement.handoverToId)
          remaining.push({
            kind: 'CARE_HANDOVER',
            characterId: requirement.characterId,
            receiverId: requirement.handoverToId,
            atTick: context.atTick,
          });
        break;
      }
      case 'LEADERSHIP_SETTLEMENT': {
        requireEconomy(requirement.atTick === context.atTick, 'INVALID_TIME');
        // All old intervals are already closed. The lifecycle's effective leader governs future pay.
        if (requirement.nextId) {
          const member = activeMembership(next, requirement.nextId);
          requireEconomy(member, 'INVALID_STATE');
          if (!finance.accounts.some((a) => a.membershipId === member.membershipId))
            finance = addAccount(finance, next, member.membershipId, null, context);
        }
        break;
      }
      default: {
        const exhaustive: never = requirement;
        return exhaustive;
      }
    }
  }
  // Stable accrued debts keep their original funding location. Reassignment never teleports a purse.
  return { finance, requirements: remaining, allocations: [] };
}
export function closeMaintenanceForLifecycle(
  finance: CompanyFinance,
  before: LifecycleState,
  next: LifecycleState,
  context: EconomyContext,
): CompanyFinance {
  const atTick = context.atTick;
  const known = context.principal.kind === 'PLAYER';
  const nextLeader = effectiveLeaderId(next);
  return {
    ...finance,
    maintenance: finance.maintenance.map((mode) => {
      if (mode.endedAt !== null) return mode;
      const departing = mode.beneficiaryIds.filter((id) => {
        if (mode.beneficiaryEnds.some((d) => d.characterId === id)) return false;
        const old = person(before, id).presence,
          now = person(next, id).presence;
        return (
          old.fieldPartyId !== now.fieldPartyId ||
          !sameLocation(old.location, now.location) ||
          (old.encounterBindingId !== now.encounterBindingId && now.encounterBindingId !== null) ||
          (old.assignment !== now.assignment && !['FIELD', 'RECOVERY'].includes(now.assignment))
        );
      });
      const beneficiaryEnds = [
        ...mode.beneficiaryEnds,
        ...departing.map((characterId) => ({
          characterId,
          atTick,
          knownAtTick: known ? atTick : null,
        })),
      ];
      const updated = { ...mode, beneficiaryEnds };
      const ends =
        mode.kind === 'SAFE_SERVICE'
          ? !nextLeader || !beneficiaryCoveredAt(updated, nextLeader, atTick)
          : !fieldCampHasWorker(finance, next, updated, atTick);
      return {
        ...mode,
        beneficiaryEnds,
        endedAt: ends ? atTick : mode.endedAt,
        knownEndedAt: ends && known ? atTick : mode.knownEndedAt,
      };
    }),
  };
}
