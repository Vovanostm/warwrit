import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import {
  poolWallet,
  requireEconomy,
  requirePoolAccess,
  spendableQ,
  walletFor,
} from './economy-state.js';
import { snapshotJson } from './input.js';
import { admitLearningSource } from './learning-source.js';
import type { LearningSourceContext } from './learning-source.js';
import { canPerform, person, sameLocation } from './lifecycle-state.js';
import type { CommandOf } from './lifecycle-types.js';
import { evaluatePerkEffects } from './perk-effects.js';
import type { CharacterPerkEffectSnapshot, ExactBps } from './perk-effects.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { physicalItem } from './physical-state.js';
import { skillLevel } from './skill-progress.js';
import { isExactInteger, moneyQ } from './values.js';
import type { MoneyQ } from './values.js';

export type LearningQuoteContext = LearningSourceContext;
export interface LearningTaskQuote {
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly maxTicks: string;
  readonly mentorId: string | null;
  readonly funding: null | {
    readonly poolId: string;
    readonly walletId: string;
    readonly providerWalletId: string;
    readonly authorizedBudgetQ: MoneyQ;
    readonly costQPerDay: { readonly numerator: string; readonly denominator: string };
  };
  readonly coefficients: CharacterPerkEffectSnapshot;
}

const min = (...values: bigint[]) => values.reduce((a, b) => (a < b ? a : b));
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;
function ratio(value: ExactBps) {
  const numerator = BigInt(value.numerator);
  const denominator = BigInt(value.denominator) * 10000n;
  requireEconomy(numerator > 0n && denominator > 0n, 'INVALID_STATE');
  return { numerator, denominator };
}

/** C03 only: detached finite quote; no interval, debit, task state or StartLearning activation. */
export function quoteLearningTask(
  root: MaterializedCompanyState,
  command: CommandOf<'StartLearning'>,
  context: LearningQuoteContext,
): LearningTaskQuote {
  const p = command.payload;
  const learner = person(root.lifecycle, p.characterId);
  const requested = BigInt(p.goal.maxTicks);
  requireEconomy(requested > 0n, 'INVALID_SOURCE');
  const method = COMPANY_CATALOGUE.methods.find(
    (entry) => entry.id === p.methodId && entry.enabled,
  );
  requireEconomy(method, 'INVALID_SOURCE');
  const source = admitLearningSource(root, command, context);
  const coefficients = evaluatePerkEffects(root, {
    kind: 'CHARACTER',
    characterId: p.characterId,
    task: source.kind === 'COURSE' ? 'TRAINING' : 'STUDY',
  });
  let maxTicks: bigint;
  let funding: LearningTaskQuote['funding'] = null;

  if (source.kind === 'COURSE') {
    requireEconomy(
      source.methodId === 'funded-practice' &&
        method.interval === 'CAMPAIGN_DAY' &&
        'skillId' in p.goal &&
        source.skillId === p.goal.skillId &&
        source.poolId === p.budgetPoolId &&
        source.providerId !== undefined &&
        source.mentorId !== undefined &&
        source.providerWalletId !== undefined &&
        source.moneyAccessEvidenceId !== undefined &&
        source.costQPerDay !== undefined &&
        source.maxTicks !== undefined &&
        isExactInteger(source.costQPerDay) &&
        BigInt(source.costQPerDay) > 0n &&
        isExactInteger(source.maxTicks) &&
        BigInt(source.maxTicks) > 0n &&
        COMPANY_CATALOGUE.skills.some((skill) => skill.id === source.skillId && skill.enabled),
      'INVALID_SOURCE',
    );
    requireEconomy(
      p.goal.targetLevel === undefined ||
        p.goal.targetLevel > skillLevel(learner.skills[source.skillId] ?? 0),
      'INCOMPATIBLE_ACTIVITY',
    );
    for (const id of [source.providerId, source.mentorId]) {
      const provider = person(root.lifecycle, id);
      requireEconomy(
        context.contactIds.includes(id) &&
          provider.presence.location.kind === 'AT' &&
          sameLocation(provider.presence.location, source.location) &&
          canPerform(provider, 'basicWork'),
        'CONTACT_OR_ACCESS_REQUIRED',
      );
    }
    const access = requirePoolAccess(root, source.poolId, context, source.moneyAccessEvidenceId);
    const payer = poolWallet(root.finance, source.poolId);
    const recipient = walletFor(root.finance, source.providerWalletId);
    requireEconomy(
      access.recipientWalletIds.includes(source.providerWalletId) &&
        recipient.owner.kind === 'CHARACTER' &&
        recipient.owner.id === source.providerId &&
        sameLocation(payer.location, source.location) &&
        sameLocation(recipient.location, source.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    const authorized = min(BigInt(p.maxBudgetQ), spendableQ(root.finance, payer.walletId));
    requireEconomy(BigInt(p.maxBudgetQ) > 0n && authorized > 0n, 'UNPAID_OBLIGATIONS');
    const cost = ratio(coefficients.task.trainingCostBps);
    const rate = BigInt(source.costQPerDay) * cost.numerator;
    const affordable =
      (authorized * BigInt(COMPANY_RULES.ticksPerDay) * cost.denominator) / rate;
    maxTicks = min(requested, BigInt(source.maxTicks), affordable);
    requireEconomy(maxTicks > 0n, 'UNPAID_OBLIGATIONS');
    funding = {
      poolId: source.poolId,
      walletId: payer.walletId,
      providerWalletId: source.providerWalletId,
      authorizedBudgetQ: moneyQ(authorized.toString()),
      costQPerDay: { numerator: rate.toString(), denominator: cost.denominator.toString() },
    };
  } else {
    requireEconomy(
      source.methodId === 'book-study' &&
        method.interval === 'FINITE_SECTION' &&
        'workId' in p.goal &&
        BigInt(p.maxBudgetQ) === 0n &&
        source.workId !== undefined &&
        source.sectionId !== undefined,
      'INVALID_SOURCE',
    );
    const work = COMPANY_CATALOGUE.works.find(
      (entry) => entry.id === source.workId && entry.sectionId === source.sectionId,
    );
    requireEconomy(
      work &&
        p.goal.workId === work.id &&
        (p.goal.sectionId ?? work.sectionId) === work.sectionId,
      'INVALID_SOURCE',
    );
    for (const id of source.resourceIds) {
      const definition = COMPANY_CATALOGUE.items.find(
        (entry) => entry.id === physicalItem(root.physical, id).definitionId,
      );
      requireEconomy(
        definition?.enabled && definition.kind === 'book' && definition.workId === work.id,
        'INVALID_SOURCE',
      );
    }
    const duration = ratio(coefficients.task.studyDurationBps);
    maxTicks = min(
      requested,
      ceilDiv(BigInt(work.durationTicks) * duration.numerator, duration.denominator),
    );
  }

  const quote = snapshotJson({
    sourceId: source.id,
    sourceVersion: source.sourceVersion,
    maxTicks: maxTicks.toString(),
    mentorId: source.kind === 'COURSE' ? source.mentorId : null,
    funding,
    coefficients,
  });
  requireEconomy(quote !== undefined, 'INVALID_SOURCE');
  return quote as unknown as LearningTaskQuote;
}
