import { COMPANY_CATALOGUE } from './definitions.js';
import { requireEconomy } from './economy-state.js';
import type { EconomyContext } from './economy-types.js';
import { activeMembership, canPerform, person, sameLocation } from './lifecycle-state.js';
import type { AtLocation, CommandOf } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { physicalContainer, physicalItem } from './physical-state.js';
import { isEntityId, isExactInteger } from './values.js';
import type { MoneyQ } from './values.js';

export interface LearningSourceEvidence {
  readonly id: string;
  readonly companyId: string;
  readonly worldId: string;
  readonly revision: string;
  readonly atTick: string;
  readonly expiresAt: string;
  readonly learnerId: string;
  readonly location: AtLocation;
  readonly resourceIds: readonly string[];
  readonly sourceVersion: string;
  readonly kind: 'COURSE' | 'SELF_STUDY';
  readonly methodId: 'funded-practice' | 'book-study';
  readonly skillId?: string;
  readonly providerId?: string;
  readonly mentorId?: string;
  readonly poolId?: string;
  readonly providerWalletId?: string;
  readonly moneyAccessEvidenceId?: string;
  readonly costQPerDay?: MoneyQ;
  readonly maxTicks?: string;
  readonly workId?: string;
  readonly sectionId?: string;
}

export interface LearningSourceContext extends EconomyContext {
  readonly learningFacts: readonly LearningSourceEvidence[];
}

function coveredByMaintenance(root: MaterializedCompanyState, characterId: string, at: bigint) {
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

function sameIds(left: readonly string[], right: readonly string[]) {
  return [...left].sort().join('\u0000') === [...right].sort().join('\u0000');
}

export function admitLearningSource(
  root: MaterializedCompanyState,
  command: CommandOf<'StartLearning'>,
  context: LearningSourceContext,
): LearningSourceEvidence {
  const payload = command.payload;
  const learner = person(root.lifecycle, payload.characterId);
  requireEconomy(
    root.lifecycle.campaignTick === context.atTick &&
      root.finance.processedTick === context.atTick &&
      root.physical.processedTick === context.atTick &&
      activeMembership(root.lifecycle, payload.characterId)?.companyId === root.lifecycle.companyId &&
      context.contactIds.includes(payload.characterId) &&
      learner.presence.location.kind === 'AT' &&
      canPerform(learner, 'study') &&
      !coveredByMaintenance(root, payload.characterId, BigInt(context.atTick)),
    'INCOMPATIBLE_ACTIVITY',
  );

  const method = COMPANY_CATALOGUE.methods.find(
    (entry) => entry.id === payload.methodId && entry.enabled,
  );
  requireEconomy(method, 'INVALID_SOURCE');
  const matches = context.learningFacts.filter(
    (source) =>
      source.learnerId === payload.characterId &&
      source.methodId === payload.methodId &&
      sameIds(source.resourceIds, payload.resourceIds),
  );
  requireEconomy(matches.length === 1, 'INVALID_SOURCE');
  const source = matches[0]!;
  requireEconomy(
    isEntityId(source.id) &&
      isEntityId(source.sourceVersion) &&
      source.companyId === context.companyId &&
      source.worldId === context.worldId &&
      source.revision === context.canonicalRevision &&
      source.atTick === context.atTick &&
      isExactInteger(source.expiresAt) &&
      BigInt(source.expiresAt) > BigInt(context.atTick) &&
      source.resourceIds.length > 0 &&
      source.resourceIds.every((id) => isEntityId(id)) &&
      new Set(source.resourceIds).size === source.resourceIds.length,
    'INVALID_SOURCE',
  );
  requireEconomy(
    sameLocation(learner.presence.location, source.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  for (const id of source.resourceIds) {
    const item = physicalItem(root.physical, id);
    requireEconomy(item.containerId !== null, 'CONTACT_OR_ACCESS_REQUIRED');
    const container = physicalContainer(root.physical, item.containerId);
    requireEconomy(
      container.location.kind === 'AT' && sameLocation(container.location, source.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
  }
  return source;
}
