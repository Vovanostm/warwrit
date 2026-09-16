import { requireEconomy } from './economy-state.js';
import { exactFraction } from './exact-fraction.js';
import { unsigned } from './input.js';
import { readLearningTaskInputs, readLearningTaskState } from './learning-task.js';
import type { LearningTask } from './learning-task.js';
import { person } from './lifecycle-state.js';
import type { LifecycleState } from './lifecycle-types.js';
import { creditProgression, progressionThresholdMilliXp } from './progression.js';
import type { ProgressionAmount } from './progression.js';
import { readSkillProgress } from './skill-progress.js';

/** C05 numerical candidate only, from an admitted task and already-eligible ticks.
 * The caller must atomically compose the returned skill with task time and finance.
 * This does not authorize time, update completedTicks, debit, stop or publish a task.
 */
export function calculateCourseProgress(
  taskValue: LearningTask,
  lifecycle: LifecycleState,
  eligibleTicksValue: string,
) {
  const task = readLearningTaskState({ schemaVersion: 1, tasks: [taskValue] }).tasks[0]!;
  const inputs = readLearningTaskInputs(task);
  const { command, quote } = task.start;
  const goal = command.payload.goal;
  requireEconomy(inputs.kind === 'COURSE' && 'skillId' in goal, 'INVALID_ARGUMENT');
  requireEconomy(
    lifecycle.companyId === command.companyId && lifecycle.worldId === command.worldId,
    'AUTHORIZATION',
  );
  requireEconomy(unsigned.read(eligibleTicksValue), 'INVALID_TIME');
  const previous = readSkillProgress(
    person(lifecycle, command.payload.characterId).skills[inputs.skillId],
  );
  requireEconomy(typeof previous !== 'number', 'INVALID_STATE');
  const target =
    goal.targetLevel === undefined ? null : BigInt(progressionThresholdMilliXp(goal.targetLevel));
  const reached = (amount: ProgressionAmount) =>
    target !== null && BigInt(amount.milliXp) >= target;
  const remaining = BigInt(quote.maxTicks) - BigInt(task.completedTicks);
  const requested = BigInt(eligibleTicksValue);
  let used = requested < remaining ? requested : remaining;
  if (task.stop || reached(previous.amount)) used = 0n;

  const duration = quote.coefficients.task.trainingDurationBps;
  const coefficients = {
    aptitudeBps: inputs.aptitudeAtStartBps,
    challengeBps: inputs.challengeBps,
    outcomeBps: inputs.outcomeBps,
  };
  const at = (ticks: bigint) =>
    creditProgression(
      previous.amount,
      exactFraction(
        BigInt(inputs.baseMilliXpPerDay) * ticks * 10000n * BigInt(duration.denominator),
        BigInt(inputs.ticksPerDay) * BigInt(duration.numerator),
      ),
      coefficients,
    );
  if (used > 0n) {
    // C05-COURSE-POLICY-v1: untagged starts cannot acquire new non-neutral semantics.
    if (
      inputs.coursePolicyVersion === undefined &&
      BigInt(duration.numerator) !== 10000n * BigInt(duration.denominator)
    )
      throw new RangeError('LEARNING_TRAINING_DURATION_POLICY_REQUIRED');
    if (target !== null) {
      // Bracket the first integral goal tick without probing an arbitrarily distant credit.
      let high = 1n;
      while (high < used && !reached(at(high))) high = high * 2n < used ? high * 2n : used;
      let low = 0n;
      while (low < high) {
        const middle = (low + high) / 2n;
        if (reached(at(middle))) high = middle;
        else low = middle + 1n;
      }
      used = low;
    }
  }
  // Keep all credit earned within that whole tick; a goal is not a finite book entitlement.
  const nextSkill = used === 0n ? previous : Object.freeze({ ...previous, amount: at(used) });
  return Object.freeze({
    taskId: task.start.taskId,
    characterId: command.payload.characterId,
    skillId: inputs.skillId,
    appliedElapsedTicks: used.toString(),
    nextSkill,
    goalReached: reached(nextSkill.amount),
    // The saved quote may incorporate a funding cap; this is not a fresh FUNDS/TIME cause.
    quotedLimitReached: BigInt(task.completedTicks) + used === BigInt(quote.maxTicks),
  });
}
