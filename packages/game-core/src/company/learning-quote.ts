import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { poolWallet, requireEconomy, requirePoolAccess, spendableQ, walletFor } from './economy-state.js';
import type { EconomyContext } from './economy-types.js';
import { snapshotJson } from './input.js';
import { activeMembership, canPerform, person, sameLocation } from './lifecycle-state.js';
import type { CommandOf } from './lifecycle-types.js';
import { evaluatePerkEffects } from './perk-effects.js';
import type { CharacterPerkEffectSnapshot, ExactBps } from './perk-effects.js';
import { physicalContainer, physicalItem } from './physical-state.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { skillLevel } from './skill-progress.js';
import { isEntityId, isExactInteger, moneyQ } from './values.js';
import type { AtLocation } from './lifecycle-types.js';
import type { CanonicalRevision, CampaignTick, MoneyQ, WorldId, CompanyId } from './values.js';

export const LEARNING_QUOTE_SCHEMA_VERSION = 1 as const;

type LearningGoal = CommandOf<'StartLearning'>['payload']['goal'];
interface LearningSourceScope {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly worldId: WorldId;
  readonly revision: CanonicalRevision;
  readonly sourceEventId: string;
  readonly atTick: CampaignTick;
  readonly expiresAt: CampaignTick;
  readonly learnerId: string;
  readonly location: AtLocation;
  readonly resourceIds: readonly string[];
  readonly sourceVersion: string;
}
export interface LearningCourseEvidence extends LearningSourceScope {
  readonly kind: 'COURSE';
  readonly methodId: 'funded-practice';
  readonly skillId: string;
  readonly providerId: string;
  readonly mentorId: string;
  readonly poolId: string;
  readonly providerWalletId: string;
  readonly moneyAccessEvidenceId: string;
  readonly costQPerDay: MoneyQ;
  readonly maxTicks: string;
}
export interface SelfStudyEvidence extends LearningSourceScope {
  readonly kind: 'SELF_STUDY';
  readonly methodId: 'book-study';
  readonly workId: string;
  readonly sectionId: string;
}
export type LearningSourceEvidence = LearningCourseEvidence | SelfStudyEvidence;
export interface LearningQuoteContext extends EconomyContext {
  readonly learningFacts: readonly LearningSourceEvidence[];
}
export interface LearningTaskQuote {
  readonly schemaVersion: typeof LEARNING_QUOTE_SCHEMA_VERSION;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly learnerId: string;
  readonly methodId: string;
  readonly startTick: CampaignTick;
  readonly goal: LearningGoal;
  readonly maxTicks: string;
  readonly resourceIds: readonly string[];
  readonly mentorId: string | null;
  readonly funding: null | {
    readonly poolId: string;
    readonly walletId: string;
    readonly providerWalletId: string;
    readonly maxBudgetQ: MoneyQ;
    readonly authorizedBudgetQ: MoneyQ;
    readonly baseCostQPerDay: MoneyQ;
    readonly effectiveCostQPerDay: { readonly numerator: string; readonly denominator: string };
  };
  readonly content: null | {
    readonly workId: string;
    readonly sectionId: string;
    readonly workVersion: number;
    readonly completionTicks: string;
  };
  readonly coefficients: CharacterPerkEffectSnapshot;
}

function min(...values: bigint[]) {
  return values.reduce((result, value) => (value < result ? value : result));
}
function ceilDiv(numerator: bigint, denominator: bigint) {
  return (numerator + denominator - 1n) / denominator;
}
function ratio(value: ExactBps) {
  const numerator = BigInt(value.numerator);
  const denominator = BigInt(value.denominator) * 10000n;
  requireEconomy(numerator > 0n && denominator > 0n, 'INVALID_STATE');
  return { numerator, denominator };
}
function sameIds(a: readonly string[], b: readonly string[]) {
  return [...a].sort().join('\u0000') === [...b].sort().join('\u0000');
}
function maintenanceCovers(root: MaterializedCompanyState, characterId: string, at: bigint) {
  return root.finance.maintenance.some(
    (entry) =>
      BigInt(entry.startedAt) <= at &&
      (entry.endedAt === null || at < BigInt(entry.endedAt)) &&
      entry.beneficiaryIds.includes(characterId) &&
      !entry.beneficiaryEnds.some(
        (end) => end.characterId === characterId && BigInt(end.atTick) <= at,
      ),
  );
}
function validateSource(source: LearningSourceEvidence, context: LearningQuoteContext) {
  requireEconomy(
    isEntityId(source.id) &&
      isEntityId(source.sourceEventId) &&
      isEntityId(source.sourceVersion) &&
      source.companyId === context.companyId &&
      source.worldId === context.worldId &&
      source.revision === context.canonicalRevision &&
      source.atTick === context.atTick &&
      isExactInteger(source.expiresAt) &&
      BigInt(source.expiresAt) > BigInt(context.atTick) &&
      source.resourceIds.length > 0 &&
      source.resourceIds.every(isEntityId) &&
      new Set(source.resourceIds).size === source.resourceIds.length,
    'INVALID_SOURCE',
  );
}
function actualResources(root: MaterializedCompanyState, source: LearningSourceEvidence) {
  for (const id of source.resourceIds) {
    const item = physicalItem(root.physical, id);
    const container = physicalContainer(root.physical, item.containerId!);
    requireEconomy(
      container.location.kind === 'AT' && sameLocation(container.location, source.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
  }
}
function sourceFor(
  context: LearningQuoteContext,
  characterId: string,
  methodId: string,
  resourceIds: readonly string[],
) {
  const matches = context.learningFacts.filter(
    (source) =>
      source.learnerId === characterId &&
      source.methodId === methodId &&
      sameIds(source.resourceIds, resourceIds),
  );
  requireEconomy(matches.length === 1, 'INVALID_SOURCE');
  const source = matches[0]!;
  validateSource(source, context);
  return source;
}

/** C03 only: returns a detached finite quote. It does not start, advance, debit or persist learning. */
export function quoteLearningTask(
  root: MaterializedCompanyState,
  command: CommandOf<'StartLearning'>,
  context: LearningQuoteContext,
): LearningTaskQuote {
  const p = command.payload;
  const learner = person(root.lifecycle, p.characterId);
  requireEconomy(
    activeMembership(root.lifecycle, p.characterId)?.companyId === root.lifecycle.companyId &&
      context.contactIds.includes(p.characterId) &&
      learner.presence.location.kind === 'AT' &&
      canPerform(learner, 'study') &&
      !maintenanceCovers(root, p.characterId, BigInt(context.atTick)),
    'INCOMPATIBLE_ACTIVITY',
  );
  const requestedTicks = BigInt(p.goal.maxTicks);
  requireEconomy(requestedTicks > 0n, 'INVALID_SOURCE');
  const method = COMPANY_CATALOGUE.methods.find((entry) => entry.id === p.methodId && entry.enabled);
  requireEconomy(method, 'INVALID_SOURCE');
  const source = sourceFor(context, p.characterId, p.methodId, p.resourceIds);
  requireEconomy(sameLocation(learner.presence.location, source.location), 'CONTACT_OR_ACCESS_REQUIRED');
  actualResources(root, source);

  const task = source.kind === 'COURSE' ? 'TRAINING' : 'STUDY';
  const coefficients = evaluatePerkEffects(root, {
    kind: 'CHARACTER',
    characterId: p.characterId,
    task,
  });
  let maxTicks: bigint;
  let funding: LearningTaskQuote['funding'] = null;
  let content: LearningTaskQuote['content'] = null;

  if (source.kind === 'COURSE') {
    requireEconomy(method.interval === 'CAMPAIGN_DAY' && 'skillId' in p.goal, 'INVALID_SOURCE');
    requireEconomy(
      source.skillId === p.goal.skillId &&
        COMPANY_CATALOGUE.skills.some((skill) => skill.id === source.skillId && skill.enabled) &&
        isExactInteger(source.maxTicks) &&
        BigInt(source.maxTicks) > 0n &&
        isExactInteger(source.costQPerDay) &&
        BigInt(source.costQPerDay) > 0n &&
        source.poolId === p.budgetPoolId,
      'INVALID_SOURCE',
    );
    const currentLevel = skillLevel(learner.skills[source.skillId] ?? 0);
    requireEconomy(
      p.goal.targetLevel === undefined || p.goal.targetLevel > currentLevel,
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
    const budgetCap = BigInt(p.maxBudgetQ);
    const authorized = min(budgetCap, spendableQ(root.finance, payer.walletId));
    requireEconomy(budgetCap > 0n && authorized > 0n, 'UNPAID_OBLIGATIONS');
    const cost = ratio(coefficients.task.trainingCostBps);
    const rateNumerator = BigInt(source.costQPerDay) * cost.numerator;
    const affordable =
      (authorized * BigInt(COMPANY_RULES.ticksPerDay) * cost.denominator) / rateNumerator;
    maxTicks = min(requestedTicks, BigInt(source.maxTicks), affordable);
    requireEconomy(maxTicks > 0n, 'UNPAID_OBLIGATIONS');
    funding = {
      poolId: source.poolId,
      walletId: payer.walletId,
      providerWalletId: source.providerWalletId,
      maxBudgetQ: moneyQ(budgetCap.toString()),
      authorizedBudgetQ: moneyQ(authorized.toString()),
      baseCostQPerDay: source.costQPerDay,
      effectiveCostQPerDay: {
        numerator: rateNumerator.toString(),
        denominator: cost.denominator.toString(),
      },
    };
  } else {
    requireEconomy(method.interval === 'FINITE_SECTION' && 'workId' in p.goal, 'INVALID_SOURCE');
    const work = COMPANY_CATALOGUE.works.find(
      (entry) =>
        entry.id === p.goal.workId &&
        entry.sectionId === (p.goal.sectionId ?? source.sectionId) &&
        entry.id === source.workId &&
        entry.sectionId === source.sectionId,
    );
    requireEconomy(work && BigInt(p.maxBudgetQ) === 0n, 'INVALID_SOURCE');
    for (const id of source.resourceIds) {
      const definition = COMPANY_CATALOGUE.items.find(
        (entry) => entry.id === physicalItem(root.physical, id).definitionId,
      );
      requireEconomy(definition?.enabled && definition.kind === 'book' && definition.workId === work.id, 'INVALID_SOURCE');
    }
    const duration = ratio(coefficients.task.studyDurationBps);
    const completionTicks = ceilDiv(BigInt(work.durationTicks) * duration.numerator, duration.denominator);
    maxTicks = min(requestedTicks, completionTicks);
    content = {
      workId: work.id,
      sectionId: work.sectionId,
      workVersion: work.version,
      completionTicks: completionTicks.toString(),
    };
  }

  const quote = snapshotJson({
    schemaVersion: LEARNING_QUOTE_SCHEMA_VERSION,
    sourceId: source.id,
    sourceVersion: source.sourceVersion,
    learnerId: p.characterId,
    methodId: p.methodId,
    startTick: context.atTick,
    goal: p.goal,
    maxTicks: maxTicks.toString(),
    resourceIds: [...source.resourceIds],
    mentorId: source.kind === 'COURSE' ? source.mentorId : null,
    funding,
    content,
    coefficients,
  });
  requireEconomy(quote !== undefined, 'INVALID_SOURCE');
  return quote as LearningTaskQuote;
}
