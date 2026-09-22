import { requireEconomy } from './economy-state.js';
import { exactFraction } from './exact-fraction.js';
import { unsigned } from './input.js';
import { readLearningTaskInputs, readLearningTaskState } from './learning-task.js';
import type { LearningTask } from './learning-task.js';

/** Exact cumulative obligation for caller-authorized ticks, not eligibility or elapsed time.
 * integerPartQ is NOT a debit. Terminal sub-q policy and finance composition remain open.
 * Wallets, reserves, tasks and receipts are untouched; the exact remainder must be retained.
 */
export function calculateLearningCost(taskValue: LearningTask, acceptedTicksValue: string) {
  const task = readLearningTaskState({ schemaVersion: 1, tasks: [taskValue] }).tasks[0]!;
  const inputs = readLearningTaskInputs(task);
  const { quote } = task.start;
  requireEconomy(unsigned.read(acceptedTicksValue), 'INVALID_TIME');
  const ticks = BigInt(acceptedTicksValue);
  requireEconomy(ticks <= BigInt(quote.maxTicks), 'INVALID_TIME');
  let numerator = 0n;
  let denominator = 1n;
  if (quote.funding !== null) {
    requireEconomy(inputs.kind === 'COURSE', 'INVALID_STATE');
    // The retained quote already includes trainingCost; duration affects XP, not price.
    numerator = BigInt(quote.funding.costQPerDay.numerator) * ticks;
    denominator = BigInt(quote.funding.costQPerDay.denominator) * BigInt(inputs.ticksPerDay);
    const budget = BigInt(quote.funding.authorizedBudgetQ);
    requireEconomy(numerator <= budget * denominator, 'UNPAID_OBLIGATIONS');
  }
  return Object.freeze({
    // Retained owned provenance, including original task/source/quote/payer/payee references.
    start: task.start,
    acceptedTicks: acceptedTicksValue,
    accumulatedQ: exactFraction(numerator, denominator),
    integerPartQ: (numerator / denominator).toString(),
    remainderQ: exactFraction(numerator % denominator, denominator),
  });
}
