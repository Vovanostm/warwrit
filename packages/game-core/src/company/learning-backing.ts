import { calculateLearningCost } from './learning-cost.js';
import { exactFraction } from './exact-fraction.js';
import {
  canonicalJson,
  id,
  jsonObject,
  object,
  optional,
  snapshotJson,
  unsigned,
} from './input.js';
import {
  EconomyViolation,
  economyId,
  findPoolAccess,
  poolWallet,
  q,
  requireEconomy,
  reservedQ,
  validateEconomy,
  walletFor,
} from './economy-state.js';
import type {
  CompanyEconomyState,
  LearningObligation,
  LearningBackingEffect,
} from './economy-types.js';
import { admitLearningFunding } from './learning-funding.js';
import { checkFreshCompanyRevision, companySemanticKey, guardCompanyCommand } from './guards.js';
import type { LearningQuoteContext } from './learning-quote.js';
import { moveCash, recipientWallet } from './economy-payments.js';
import type { ExactFraction } from './exact-fraction.js';
import type { CompanyCommand } from './commands.js';
import { readLearningTaskState } from './learning-task.js';
import type { LearningTask, LearningTaskState } from './learning-task.js';

const requestInput = object({
  taskId: id,
  effectId: id,
  command: jsonObject,
  acceptedTicks: unsigned,
  accessEvidenceId: optional(id),
});

export interface LearningBackingRequest {
  readonly taskId: string;
  readonly effectId: string;
  readonly command: CompanyCommand;
  /** Caller-authorized cumulative prefix; TIME owns proof that those ticks elapsed. */
  readonly acceptedTicks: string;
  readonly accessEvidenceId?: string;
}

export interface LearningBackingPreparation {
  readonly state: CompanyEconomyState;
  readonly fundedTicks: string;
  readonly acceptedTicks: string;
  readonly transferQ: string;
  readonly replayed: boolean;
}

function add(left: ExactFraction, right: ExactFraction): ExactFraction {
  return exactFraction(
    BigInt(left.numerator) * BigInt(right.denominator) +
      BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function subtract(left: ExactFraction, right: ExactFraction): ExactFraction {
  const numerator =
    BigInt(left.numerator) * BigInt(right.denominator) -
    BigInt(right.numerator) * BigInt(left.denominator);
  requireEconomy(numerator >= 0n, 'INVALID_STATE');
  return exactFraction(numerator, BigInt(left.denominator) * BigInt(right.denominator));
}

function compare(left: ExactFraction, right: ExactFraction): number {
  const difference =
    BigInt(left.numerator) * BigInt(right.denominator) -
    BigInt(right.numerator) * BigInt(left.denominator);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function outstanding(obligation: LearningObligation): ExactFraction {
  return subtract(obligation.accruedQ, obligation.dischargedQ);
}

function groupKey(obligation: LearningObligation): string {
  return canonicalJson([
    obligation.companyId,
    obligation.worldId,
    obligation.poolId,
    obligation.payerWalletId,
    obligation.recipientWalletId,
    obligation.recipient,
  ]);
}

function assertCurrentScope(state: CompanyEconomyState, context: LearningQuoteContext): void {
  requireEconomy(
    state.lifecycle.revision === context.canonicalRevision &&
      state.lifecycle.campaignTick === context.atTick &&
      state.finance.processedTick === context.atTick &&
      state.lifecycle.companyId === context.companyId &&
      state.lifecycle.worldId === context.worldId,
    'INVALID_SOURCE',
  );
}

function buildObligation(
  task: LearningTask,
  state: CompanyEconomyState,
  context: LearningQuoteContext,
  command: CompanyCommand,
): LearningObligation | null {
  const admission = admitLearningFunding(state, command, task, context);
  const quote = task.start.quote;
  if (quote.funding === null) {
    requireEconomy(admission.funding === null, 'INVALID_STATE');
    return null;
  }
  requireEconomy(admission.funding !== null, 'INVALID_ARGUMENT');
  const { source, funding } = admission;
  requireEconomy(source.kind === 'COURSE' && source.providerId, 'INVALID_SOURCE');
  const payer = poolWallet(state.finance, quote.funding.poolId);
  const recipient = walletFor(state.finance, quote.funding.providerWalletId);
  requireEconomy(
    recipient.owner.kind === 'CHARACTER' &&
      recipient.owner.id === source.providerId &&
      payer.walletId === quote.funding.walletId &&
      funding.quote.walletId === payer.walletId &&
      funding.recipient.id === recipient.owner.id,
    'INVALID_SOURCE',
  );
  return {
    taskId: task.start.taskId,
    sourceId: quote.sourceId,
    sourceVersion: quote.sourceVersion,
    companyId: state.lifecycle.companyId,
    worldId: state.lifecycle.worldId,
    start: task.start,
    poolId: quote.funding.poolId,
    payerWalletId: payer.walletId,
    recipientWalletId: recipient.walletId,
    recipient: recipient.owner,
    authorizedBudgetQ: quote.funding.authorizedBudgetQ,
    fundedTicks: '0',
    acceptedTicks: '0',
    accruedQ: exactFraction(0n, 1n),
    dischargedQ: exactFraction(0n, 1n),
    terminal: task.stop !== undefined,
  };
}

function replaceObligation(
  obligations: readonly LearningObligation[],
  replacement: LearningObligation,
): readonly LearningObligation[] {
  const found = obligations.some((entry) => entry.taskId === replacement.taskId);
  return found
    ? obligations.map((entry) => (entry.taskId === replacement.taskId ? replacement : entry))
    : [...obligations, replacement];
}

function fitsBacking(
  state: CompanyEconomyState,
  obligation: LearningObligation,
  accruedQ: ExactFraction,
): boolean {
  const finance = {
    ...state.finance,
    learningObligations: replaceObligation(state.finance.learningObligations ?? [], {
      ...obligation,
      accruedQ,
    }),
  };
  return (
    reservedQ(finance, obligation.payerWalletId) <=
    BigInt(walletFor(finance, obligation.payerWalletId).cashQ)
  );
}

function affordablePrefix(
  state: CompanyEconomyState,
  task: LearningTask,
  obligation: LearningObligation,
  upperBound: bigint,
): bigint {
  let low = BigInt(obligation.acceptedTicks);
  let high = upperBound;
  while (low < high) {
    const middle = (low + high + 1n) / 2n;
    const cost = calculateLearningCost(task, middle.toString()).accumulatedQ;
    if (fitsBacking(state, obligation, cost)) low = middle;
    else high = middle - 1n;
  }
  return low;
}

function dischargePrefix(
  obligations: readonly LearningObligation[],
  target: LearningObligation,
  amount: bigint,
): readonly LearningObligation[] {
  let remaining = exactFraction(amount, 1n);
  const ordered = [...obligations].sort((a, b) =>
    a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0,
  );
  const changed = new Map<string, LearningObligation>();
  for (const obligation of ordered) {
    if (
      groupKey(obligation) !== groupKey(target) ||
      compare(remaining, exactFraction(0n, 1n)) === 0
    )
      continue;
    const due = outstanding(obligation);
    const paid = compare(due, remaining) <= 0 ? due : remaining;
    changed.set(obligation.taskId, {
      ...obligation,
      dischargedQ: add(obligation.dischargedQ, paid),
    });
    remaining = subtract(remaining, paid);
  }
  requireEconomy(compare(remaining, exactFraction(0n, 1n)) === 0, 'INVALID_STATE');
  return obligations.map((entry) => changed.get(entry.taskId) ?? entry);
}

/** A private, detached C05 finance candidate. It neither advances learning nor proves elapsed time. */
export function prepareLearningBacking(
  stateValue: CompanyEconomyState,
  tasksValue: LearningTaskState,
  context: LearningQuoteContext,
  requestValue: LearningBackingRequest,
): LearningBackingPreparation {
  const request = snapshotJson(requestValue);
  requireEconomy(requestInput.read(request), 'INVALID_ARGUMENT');
  const guarded = guardCompanyCommand(request.command, context);
  if (!guarded.ok) throw new EconomyViolation(guarded.error);
  const state = snapshotJson(stateValue) as unknown as CompanyEconomyState;
  requireEconomy(
    state.lifecycle.companyId === context.companyId && state.lifecycle.worldId === context.worldId,
    'AUTHORIZATION',
  );
  const command = guarded.command;
  const sourceEventId = command.sourceEventId ?? null;
  const key = canonicalJson([
    context.companyId,
    context.worldId,
    request.taskId,
    command.commandId,
    sourceEventId,
    request.effectId,
  ]);
  const requestKey = canonicalJson({
    taskId: request.taskId,
    command,
    acceptedTicks: request.acceptedTicks,
    accessEvidenceId: request.accessEvidenceId ?? null,
  });
  const sourceRequestKey = canonicalJson({
    taskId: request.taskId,
    semanticCommand: companySemanticKey(command),
    sourceEventId,
    acceptedTicks: request.acceptedTicks,
    accessEvidenceId: request.accessEvidenceId ?? null,
  });
  const previous = (state.finance.learningEffects ?? []).find(
    (entry) =>
      entry.companyId === context.companyId &&
      entry.worldId === context.worldId &&
      entry.taskId === request.taskId &&
      (entry.commandId === command.commandId ||
        (sourceEventId !== null && entry.sourceEventId === sourceEventId)),
  );
  if (previous) {
    const sameCommand = previous.commandId === command.commandId;
    requireEconomy(
      sameCommand
        ? previous.requestKey === requestKey
        : previous.sourceRequestKey === sourceRequestKey,
      'IDEMPOTENCY_CONFLICT',
    );
    return {
      state,
      fundedTicks: previous.fundedTicks,
      acceptedTicks: previous.acceptedTicks,
      transferQ: previous.transferQ,
      replayed: true,
    };
  }

  const tasks = readLearningTaskState(tasksValue);
  const task = tasks.tasks.find((entry) => entry.start.taskId === request.taskId);
  requireEconomy(task, 'INVALID_ARGUMENT');
  requireEconomy(
    task.start.command.companyId === context.companyId &&
      task.start.command.worldId === context.worldId &&
      (guarded.command.type !== 'StartLearning' ||
        canonicalJson(guarded.command) === canonicalJson(task.start.command)) &&
      (guarded.command.type !== 'StopLearning' ||
        guarded.command.payload.taskId === task.start.taskId) &&
      (guarded.command.actorRef.kind !== 'PLAYER' ||
        guarded.command.actorRef.id === task.start.command.actorRef.id),
    'AUTHORIZATION',
  );
  validateEconomy(state, context);
  assertCurrentScope(state, context);
  const priorObligations = state.finance.learningObligations ?? [];
  const existing = priorObligations.find((entry) => entry.taskId === task.start.taskId);
  const priorAcceptedTicks = (state.finance.learningEffects ?? [])
    .filter(
      (entry) =>
        entry.companyId === context.companyId &&
        entry.worldId === context.worldId &&
        entry.taskId === task.start.taskId,
    )
    .reduce((maximum, entry) => {
      const accepted = BigInt(entry.acceptedTicks);
      return accepted > maximum ? accepted : maximum;
    }, 0n);
  let obligation = existing ?? buildObligation(task, state, context, guarded.command);
  if (existing || guarded.command.type !== 'StartLearning') {
    requireEconomy(
      guarded.command.type !== 'StartLearning' &&
        checkFreshCompanyRevision(guarded.command, context) &&
        guarded.command.campaignTick === context.atTick &&
        (guarded.command.type !== 'StopLearning' ||
          guarded.command.payload.taskId === task.start.taskId),
      'STALE_REVISION',
    );
  }
  requireEconomy(
    !obligation ||
      (canonicalJson(obligation.start) === canonicalJson(task.start) &&
        obligation.companyId === state.lifecycle.companyId &&
        obligation.worldId === state.lifecycle.worldId &&
        (!obligation.terminal || task.stop !== undefined)),
    'INVALID_STATE',
  );
  const requestedTicks = BigInt(request.acceptedTicks);
  requireEconomy(
    requestedTicks >=
      (BigInt(existing?.acceptedTicks ?? '0') > priorAcceptedTicks
        ? BigInt(existing?.acceptedTicks ?? '0')
        : priorAcceptedTicks) && requestedTicks <= BigInt(task.start.quote.maxTicks),
    'INVALID_TIME',
  );
  const maxAffordableTicks = obligation
    ? affordablePrefix(state, task, obligation, requestedTicks)
    : requestedTicks;
  const acceptedTicks = maxAffordableTicks;
  const accruedQ = calculateLearningCost(task, acceptedTicks.toString()).accumulatedQ;
  if (obligation) {
    obligation = {
      ...obligation,
      fundedTicks: maxAffordableTicks.toString(),
      acceptedTicks: acceptedTicks.toString(),
      accruedQ,
      terminal: task.stop !== undefined,
    };
  }
  let finance: CompanyEconomyState['finance'] = {
    ...state.finance,
    ...(obligation ? { learningObligations: replaceObligation(priorObligations, obligation) } : {}),
  };

  let transferQ = 0n;
  if (obligation) {
    const access = findPoolAccess(state, obligation.poolId, context, request.accessEvidenceId);
    if (request.accessEvidenceId !== undefined)
      requireEconomy(access, 'CONTACT_OR_ACCESS_REQUIRED');
    if (access) {
      const destination = recipientWallet(finance, obligation.recipient, access);
      if (destination && destination.walletId === obligation.recipientWalletId) {
        const compatible = (finance.learningObligations ?? []).filter(
          (entry) => groupKey(entry) === groupKey(obligation),
        );
        const total = compatible.reduce(
          (sum, entry) => add(sum, outstanding(entry)),
          exactFraction(0n, 1n),
        );
        transferQ = BigInt(total.numerator) / BigInt(total.denominator);
        if (transferQ > 0n) {
          finance = {
            ...finance,
            learningObligations: dischargePrefix(
              finance.learningObligations ?? [],
              obligation,
              transferQ,
            ),
          };
          finance = moveCash(
            finance,
            obligation.payerWalletId,
            destination.walletId,
            transferQ,
            context.atTick,
            economyId('learning', task.start.taskId, request.effectId),
            'LEARNING',
          );
        }
      }
    }
  } else requireEconomy(request.accessEvidenceId === undefined, 'INVALID_ARGUMENT');

  const effect: LearningBackingEffect = {
    key,
    requestKey,
    sourceRequestKey,
    companyId: context.companyId,
    worldId: context.worldId,
    taskId: request.taskId,
    commandId: command.commandId,
    sourceEventId,
    effectId: request.effectId,
    transferQ: q(transferQ),
    fundedTicks: maxAffordableTicks.toString(),
    acceptedTicks: acceptedTicks.toString(),
  };
  finance = {
    ...finance,
    learningEffects: [...(finance.learningEffects ?? []), effect],
  };
  const next: CompanyEconomyState = { ...state, finance };
  validateEconomy(next, context);
  return {
    state: next,
    fundedTicks: effect.fundedTicks,
    acceptedTicks: effect.acceptedTicks,
    transferQ: effect.transferQ,
    replayed: false,
  };
}
