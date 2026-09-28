import type { CompanyCommand } from './commands.js';
import {
  EconomyViolation,
  own,
  poolWallet,
  requireEconomy,
  requirePoolAccess,
  spendableQ,
  validateEconomy,
  walletFor,
} from './economy-state.js';
import type { CompanyEconomyState } from './economy-types.js';
import { checkFreshCompanyRevision, guardCompanyCommand } from './guards.js';
import { canonicalJson } from './input.js';
import type { LearningQuoteContext } from './learning-quote.js';
import { readLearningTaskInputs, readLearningTaskState } from './learning-task.js';
import type { LearningTask } from './learning-task.js';
import { person, sameLocation } from './lifecycle-state.js';
import { isEntityId, isExactInteger, moneyQ } from './values.js';

/** Fresh financial admission only: resolve stored financial replay BEFORE calling this.
 * learningFacts must contain the authentic ORIGINAL source, not a new offer or client claim.
 * No debit, hold, eligible interval, task advancement, receipt or public activation occurs.
 * spendableQ is the existing finance observation, not a prior-obligation-aware prefix.
 */
export function admitLearningFunding(
  root: CompanyEconomyState,
  commandValue: CompanyCommand,
  taskValue: LearningTask,
  context: LearningQuoteContext,
) {
  const guarded = guardCompanyCommand(commandValue, context);
  if (!guarded.ok) throw new EconomyViolation(guarded.error);
  const command = guarded.command;
  requireEconomy(
    context.companyId === root.lifecycle.companyId && context.worldId === root.lifecycle.worldId,
    'AUTHORIZATION',
  );
  requireEconomy(
    ['StartLearning', 'StopLearning', 'AdvanceCampaign'].includes(command.type),
    'UNSUPPORTED_ACTION',
  );
  // Authenticate/tenant-bind before looking at the private retained start or source.
  const task = readLearningTaskState({ schemaVersion: 1, tasks: [taskValue] }).tasks[0]!;
  const { start } = task;
  const { quote } = start;
  requireEconomy(
    start.command.companyId === context.companyId && start.command.worldId === context.worldId,
    'AUTHORIZATION',
  );
  if (command.type === 'StartLearning')
    requireEconomy(canonicalJson(command) === canonicalJson(start.command), 'IDEMPOTENCY_CONFLICT');
  if (command.type === 'StopLearning')
    requireEconomy(command.payload.taskId === start.taskId, 'INVALID_SOURCE');
  requireEconomy(
    checkFreshCompanyRevision(command, context) &&
      context.canonicalRevision === root.lifecycle.revision,
    'STALE_REVISION',
  );
  requireEconomy(
    command.campaignTick === context.atTick &&
      root.lifecycle.campaignTick === context.atTick &&
      BigInt(context.atTick) >= BigInt(start.command.campaignTick),
    'INVALID_TIME',
  );
  validateEconomy(root, context);
  const inputs = readLearningTaskInputs(task);
  const matches = context.learningFacts.filter((source) => source.id === quote.sourceId);
  requireEconomy(matches.length === 1, 'INVALID_SOURCE');
  const source = own(matches[0]!);
  const payload = start.command.payload;
  requireEconomy(
    source.companyId === context.companyId &&
      source.worldId === context.worldId &&
      source.sourceVersion === quote.sourceVersion &&
      source.atTick === start.command.campaignTick &&
      isExactInteger(source.revision) &&
      isExactInteger(source.expiresAt) &&
      BigInt(source.expiresAt) > BigInt(source.atTick) &&
      source.learnerId === payload.characterId &&
      source.methodId === payload.methodId &&
      canonicalJson([...source.resourceIds].sort()) ===
        canonicalJson([...payload.resourceIds].sort()),
    'INVALID_SOURCE',
  );
  const funding = quote.funding;
  if (funding === null) {
    requireEconomy(
      inputs.kind === 'BOOK' &&
        source.kind === 'SELF_STUDY' &&
        source.workId === inputs.workId &&
        source.sectionId === inputs.sectionId,
      'INVALID_SOURCE',
    );
    return Object.freeze({ start, source, funding: null });
  }
  requireEconomy(
    inputs.kind === 'COURSE' &&
      source.kind === 'COURSE' &&
      source.skillId === inputs.skillId &&
      source.challengeLevel === inputs.challengeLevel &&
      source.poolId === funding.poolId &&
      funding.poolId === payload.budgetPoolId &&
      source.providerWalletId === funding.providerWalletId &&
      isEntityId(source.providerId) &&
      isEntityId(source.moneyAccessEvidenceId) &&
      source.mentorId === quote.mentorId &&
      isExactInteger(source.costQPerDay) &&
      isExactInteger(source.maxTicks) &&
      BigInt(quote.maxTicks) <= BigInt(source.maxTicks) &&
      BigInt(funding.authorizedBudgetQ) <= BigInt(payload.maxBudgetQ),
    'INVALID_SOURCE',
  );
  // Validate the retained quotation against its original price; never re-quote today's perks.
  const cost = quote.coefficients.task.trainingCostBps;
  requireEconomy(
    BigInt(funding.costQPerDay.numerator) * 10000n * BigInt(cost.denominator) ===
      BigInt(source.costQPerDay) * BigInt(cost.numerator) * BigInt(funding.costQPerDay.denominator),
    'INVALID_SOURCE',
  );
  const access = requirePoolAccess(root, funding.poolId, context);
  const payer = poolWallet(root.finance, funding.poolId);
  const recipient = walletFor(root.finance, funding.providerWalletId);
  requireEconomy(
    payer.walletId === funding.walletId &&
      recipient.owner.kind === 'CHARACTER' &&
      recipient.owner.id === source.providerId &&
      context.contactIds.includes(source.providerId) &&
      access.recipientWalletIds.includes(recipient.walletId) &&
      sameLocation(payer.location, source.location) &&
      sameLocation(recipient.location, source.location) &&
      sameLocation(person(root.lifecycle, source.providerId).presence.location, source.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  return own({
    start,
    source,
    funding: {
      quote: funding,
      recipient: recipient.owner,
      access,
      spendableQ: moneyQ(spendableQ(root.finance, payer.walletId).toString()),
    },
  });
}
