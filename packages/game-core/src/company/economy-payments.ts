import { canonicalJson } from './input.js';
import { sameLocation } from './lifecycle-state.js';
import {
  accountFor,
  actualOwedQ,
  closeEpochs,
  committedQ,
  economyId,
  min,
  poolWallet,
  q,
  reportedOwedQ,
  requireEconomy,
  requirePoolAccess,
  spendableQ,
  walletFor,
} from './economy-state.js';
import type { CampaignTick } from './values.js';
import type { OwnerRef } from './model.js';
import type {
  AllocationEpoch,
  CompanyEconomyState,
  CompanyFinance,
  EconomyContext,
  EconomyReceipt,
  FinanceChange,
  LocalMoneyAccess,
  WageClaim,
  CashMovement,
} from './economy-types.js';
import type { CommandOf } from './lifecycle-types.js';

/** C04 prefix of k/a streams. At most n-1 residual selections, never one iteration per q. */
function allocationPrefix(weights: AllocationEpoch['weights'], total: bigint): readonly bigint[] {
  const sum = weights.reduce((s, w) => s + BigInt(w.amountQ), 0n);
  requireEconomy(sum > 0n && total >= 0n && total <= sum, 'INVALID_STATE');
  const counts = weights.map((w) => (BigInt(w.amountQ) * total) / sum);
  let remaining = total - counts.reduce((s, n) => s + n, 0n);
  while (remaining > 0n) {
    let best = -1;
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i]!;
      if (counts[i]! >= BigInt(weight.amountQ)) continue;
      if (best === -1) {
        best = i;
        continue;
      }
      const lhs = (counts[i]! + 1n) * BigInt(weights[best]!.amountQ);
      const rhs = (counts[best]! + 1n) * BigInt(weight.amountQ);
      if (lhs < rhs || (lhs === rhs && weight.claimId < weights[best]!.claimId)) best = i;
    }
    requireEconomy(best !== -1, 'INVALID_STATE');
    counts[best] = counts[best]! + 1n;
    remaining--;
  }
  return counts;
}
function epochFor(
  finance: CompanyFinance,
  poolId: string,
  dueAt: CampaignTick,
  tick: CampaignTick,
) {
  const owed = finance.claims.filter(
    (c) =>
      c.poolId === poolId &&
      c.dueAt === dueAt &&
      accountFor(finance, c.membershipId).known &&
      reportedOwedQ(finance, c) > 0n,
  );
  const active = finance.epochs.find(
    (e) => e.poolId === poolId && e.dueAt === dueAt && e.closedAt === null,
  );
  if (active) {
    const prefix = allocationPrefix(active.weights, BigInt(active.cumulativeQ));
    const valid =
      owed.every((c) => active.weights.some((w) => w.claimId === c.claimId)) &&
      active.weights.every((w, i) => {
        const claim = finance.claims.find((c) => c.claimId === w.claimId);
        return claim && reportedOwedQ(finance, claim) === BigInt(w.amountQ) - prefix[i]!;
      });
    if (valid) return { finance, epoch: active };
    finance = {
      ...finance,
      epochs: finance.epochs.map((e) => (e === active ? { ...e, closedAt: tick } : e)),
    };
  }
  const epoch: AllocationEpoch = {
    epochId: economyId('allocation', poolId, dueAt, String(finance.epochs.length)),
    poolId,
    dueAt,
    weights: owed
      .map((c) => ({ claimId: c.claimId, amountQ: q(reportedOwedQ(finance, c)) }))
      .sort((a, b) => (a.claimId < b.claimId ? -1 : 1)),
    cumulativeQ: q(0n),
    closedAt: null,
  };
  requireEconomy(epoch.weights.length > 0, 'INVALID_STATE');
  return { finance: { ...finance, epochs: [...finance.epochs, epoch] }, epoch };
}
export function moveCash(
  finance: CompanyFinance,
  fromWalletId: string,
  toWalletId: string,
  amount: bigint,
  atTick: CampaignTick,
  movementId: string,
  purpose: CashMovement['purpose'],
): CompanyFinance {
  requireEconomy(amount > 0n && fromWalletId !== toWalletId, 'INVALID_ARGUMENT');
  const from = walletFor(finance, fromWalletId);
  const to = walletFor(finance, toWalletId);
  requireEconomy(sameLocation(from.location, to.location), 'CONTACT_OR_ACCESS_REQUIRED');
  requireEconomy(spendableQ(finance, fromWalletId) >= amount, 'INSUFFICIENT_FUNDS');
  requireEconomy(
    !finance.movements.some((m) => m.movementId === movementId),
    'IDEMPOTENCY_CONFLICT',
  );
  return {
    ...finance,
    wallets: finance.wallets.map((w) =>
      w.walletId === fromWalletId
        ? { ...w, cashQ: q(BigInt(w.cashQ) - amount) }
        : w.walletId === toWalletId
          ? { ...w, cashQ: q(BigInt(w.cashQ) + amount) }
          : w,
    ),
    movements: [
      ...finance.movements,
      { movementId, from: fromWalletId, to: toWalletId, amountQ: q(amount), atTick, purpose },
    ],
  };
}
export function recipientWallet(
  finance: CompanyFinance,
  recipient: OwnerRef,
  access: LocalMoneyAccess,
) {
  const found = finance.wallets.filter(
    (w) =>
      access.recipientWalletIds.includes(w.walletId) &&
      canonicalJson(w.owner) === canonicalJson(recipient) &&
      sameLocation(w.location, access.location),
  );
  requireEconomy(found.length <= 1, 'INVALID_SOURCE');
  return found[0];
}
/** A share is either a real balanced transfer or a backed hold; never a pretend payment. */
function applyShare(
  finance: CompanyFinance,
  claimId: string,
  amount: bigint,
  access: LocalMoneyAccess,
  tick: CampaignTick,
  commandId: string,
): { finance: CompanyFinance; allocation: EconomyReceipt['allocations'][number] } {
  const claim = finance.claims.find((c) => c.claimId === claimId)!;
  const account = accountFor(finance, claim.membershipId);
  const wallet = poolWallet(finance, claim.poolId);
  const recipient = account.knownDeath ? account.death!.recipient : account.recipient;
  // A stale sighting is not evidence of today's receipt of cash, including at a remote duty.
  const destination =
    account.confirmedAt === tick ? recipientWallet(finance, recipient, access) : undefined;
  if (destination) {
    requireEconomy(actualOwedQ(claim) >= amount, 'INVALID_SOURCE');
    finance = moveCash(
      finance,
      wallet.walletId,
      destination.walletId,
      amount,
      tick,
      economyId(commandId, claimId, 'wage'),
      'WAGE',
    );
    finance = {
      ...finance,
      claims: finance.claims.map((c) =>
        c.claimId === claimId ? { ...c, paidQ: q(BigInt(c.paidQ) + amount) } : c,
      ),
    };
    return { finance, allocation: { claimId, amountQ: q(amount), channel: 'CASH' } };
  }
  requireEconomy(spendableQ(finance, wallet.walletId) >= amount, 'INSUFFICIENT_FUNDS');
  const prior = finance.reservations.find(
    (r) => r.claimId === claimId && r.purpose === 'PENDING_CONFIRMATION',
  );
  finance = {
    ...finance,
    reservations: prior
      ? finance.reservations.map((r) =>
          r === prior ? { ...r, amountQ: q(BigInt(r.amountQ) + amount) } : r,
        )
      : [
          ...finance.reservations,
          {
            reservationId: economyId('pending', claimId),
            walletId: wallet.walletId,
            claimId,
            amountQ: q(amount),
            purpose: 'PENDING_CONFIRMATION',
          },
        ],
  };
  return { finance, allocation: { claimId, amountQ: q(amount), channel: 'PENDING_CONFIRMATION' } };
}
export function payClaims(
  state: CompanyEconomyState,
  command: CommandOf<'PayClaims'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload;
  let finance = state.finance;
  const amount = BigInt(p.amountQ);
  requireEconomy(amount > 0n, 'INVALID_ARGUMENT');
  const access = requirePoolAccess(state, p.poolId, context);
  const wallet = poolWallet(finance, p.poolId);
  requireEconomy(spendableQ(finance, wallet.walletId) >= amount, 'INSUFFICIENT_FUNDS');
  const eligible = finance.claims
    .filter((c) => {
      const account = accountFor(finance, c.membershipId);
      const payeeId = account.knownDeath ? account.death!.recipient.id : account.recipient.id;
      return (
        account.known &&
        c.poolId === p.poolId &&
        BigInt(c.dueAt) <= BigInt(context.atTick) &&
        reportedOwedQ(finance, c) > 0n &&
        (p.mode === 'DEFAULT' ||
          (p.payeeId === payeeId && (p.claimIds.length === 0 || p.claimIds.includes(c.claimId))))
      );
    })
    .sort((a, b) =>
      BigInt(a.dueAt) < BigInt(b.dueAt)
        ? -1
        : BigInt(a.dueAt) > BigInt(b.dueAt)
          ? 1
          : a.claimId < b.claimId
            ? -1
            : 1,
    );
  requireEconomy(
    p.claimIds.every((id) => eligible.some((c) => c.claimId === id)),
    'INVALID_ARGUMENT',
  );
  requireEconomy(
    amount <= eligible.reduce((s, c) => s + reportedOwedQ(finance, c), 0n),
    'INVALID_ARGUMENT',
  );
  const allocations: EconomyReceipt['allocations'][number][] = [];
  let remaining = amount;
  if (p.mode === 'TARGETED') {
    finance = closeEpochs(finance, context.atTick, p.poolId);
    for (const claim of eligible) {
      const share = min(remaining, reportedOwedQ(finance, claim));
      if (share === 0n) continue;
      const change = applyShare(
        finance,
        claim.claimId,
        share,
        access,
        context.atTick,
        command.commandId,
      );
      finance = change.finance;
      allocations.push(change.allocation);
      remaining -= share;
    }
  } else {
    for (const dueAt of [...new Set(eligible.map((c) => c.dueAt))]) {
      if (remaining === 0n) break;
      const selected = epochFor(finance, p.poolId, dueAt, context.atTick);
      finance = selected.finance;
      const epoch = selected.epoch;
      const before = allocationPrefix(epoch.weights, BigInt(epoch.cumulativeQ));
      const total = epoch.weights.reduce((s, w) => s + BigInt(w.amountQ), 0n);
      const paid = min(remaining, total - BigInt(epoch.cumulativeQ));
      const cumulative = BigInt(epoch.cumulativeQ) + paid;
      const after = allocationPrefix(epoch.weights, cumulative);
      for (let i = 0; i < epoch.weights.length; i++) {
        const share = after[i]! - before[i]!;
        if (share === 0n) continue;
        const change = applyShare(
          finance,
          epoch.weights[i]!.claimId,
          share,
          access,
          context.atTick,
          command.commandId,
        );
        finance = change.finance;
        allocations.push(change.allocation);
      }
      finance = {
        ...finance,
        epochs: finance.epochs.map((e) =>
          e.epochId === epoch.epochId ? { ...e, cumulativeQ: q(cumulative) } : e,
        ),
      };
      remaining -= paid;
    }
  }
  requireEconomy(remaining === 0n, 'INVALID_STATE');
  return { finance, allocations, requirements: [] };
}
export function transferFunds(
  state: CompanyEconomyState,
  command: CommandOf<'TransferFunds'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload;
  requirePoolAccess(state, p.fromPoolId, context, p.accessEvidenceId);
  requirePoolAccess(state, p.toPoolId, context, p.accessEvidenceId);
  const from = poolWallet(state.finance, p.fromPoolId);
  const to = poolWallet(state.finance, p.toPoolId);
  return {
    finance: moveCash(
      state.finance,
      from.walletId,
      to.walletId,
      BigInt(p.amountQ),
      context.atTick,
      economyId(command.commandId, 'transfer'),
      'TRANSFER',
    ),
    requirements: [],
    allocations: [],
  };
}
/** Pre-entry earned amounts may be held, but old overdue obligations require actual payment. */
export function reservePreEntry(
  finance: CompanyFinance,
  claim: WageClaim,
  tick: CampaignTick,
): CompanyFinance {
  const amount = reportedOwedQ(finance, claim);
  if (amount === 0n) return finance;
  const wallet = poolWallet(finance, claim.poolId);
  requireEconomy(spendableQ(finance, wallet.walletId) >= amount, 'INSUFFICIENT_FUNDS');
  finance = closeEpochs(finance, tick, claim.poolId);
  return {
    ...finance,
    reservations: [
      ...finance.reservations,
      {
        reservationId: economyId('pre-entry', claim.claimId, tick),
        walletId: wallet.walletId,
        claimId: claim.claimId,
        amountQ: q(amount),
        purpose: 'PRE_ENTRY',
      },
    ],
  };
}
/** Disclose a real outcome before releasing/re-routing any backed pending allocation. */
export function reconcileClaim(
  finance: CompanyFinance,
  claimId: string,
  tick: CampaignTick,
): CompanyFinance {
  const claim = finance.claims.find((c) => c.claimId === claimId)!;
  let keep = min(committedQ(finance, claimId), actualOwedQ(claim));
  finance = closeEpochs(finance, tick, claim.poolId);
  return {
    ...finance,
    reservations: finance.reservations.flatMap((r) => {
      if (r.claimId !== claimId) return [r];
      const amount = min(keep, BigInt(r.amountQ));
      keep -= amount;
      return amount === 0n ? [] : [{ ...r, amountQ: q(amount) }];
    }),
  };
}
