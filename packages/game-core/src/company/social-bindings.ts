import { COMPANY_RULES } from './definitions.js';
import { canonicalJson, choice, id, natural, object, snapshotJson, unsigned } from './input.js';
import type { ValueOf } from './input.js';
import type { LifecycleState } from './lifecycle-types.js';
import { deriveEffectiveRelation, recordDirectedRelation, recordLearnedFact } from './social.js';
import type { ExactRelationAxis, SocialState } from './social.js';

const axes = object({
  friendship: natural(0, 100),
  rivalry: natural(0, 100),
  fear: natural(0, 100),
  respect: natural(0, 100),
});
const legacyBinding = object({
  base: object({ sourceEventId: id, fromId: id, toId: id, base: axes }),
  notification: object({
    kind: choice('HEIR_NOTIFICATION'),
    id,
    companyId: id,
    worldId: id,
    revision: unsigned,
    sourceEventId: id,
    atTick: unsigned,
    crisisId: id,
    heirId: id,
    leaderId: id,
    relation: object({ respect: natural(0, 100), rivalry: natural(0, 100) }),
  }),
  channel: choice('EXPERIENCE', 'WITNESS', 'REPORT'),
  salience: natural(),
});
export type LegacyHeirSocialBinding = ValueOf<typeof legacyBinding>;

function requireBinding(condition: unknown, code = 'INVALID_SOCIAL_BINDING'): asserts condition {
  if (!condition) throw new Error(code);
}
function actualPeople(state: LifecycleState, ...ids: string[]): void {
  requireBinding(
    new Set(ids).size === ids.length &&
      ids.every((id) => state.characters.some((person) => person.identity.characterId === id)),
  );
}
function equalsInteger(axis: ExactRelationAxis, value: number): boolean {
  return axis.numerator === (BigInt(value) * BigInt(axis.denominator)).toString();
}

/** Internal composition only; the retained opening receipt is the source, not a player payload. */
export function bindOpeningContactReaction(
  state: SocialState,
  lifecycle: LifecycleState,
  commandId: string,
): SocialState {
  const receipt = lifecycle.applied.find((entry) => entry.commandId === commandId);
  const starts = receipt?.events.filter((event) => event.type === 'CompanyStarted');
  const grants = receipt?.requirements.filter((entry) => entry.kind === 'OPENING_ASSETS');
  requireBinding(lifecycle.company && starts?.length === 1 && grants?.length === 1);
  const start = starts[0]!;
  const reaction = grants[0]!.assets.contactReaction;
  const founder = lifecycle.company.founderId;
  actualPeople(lifecycle, reaction.contactId, founder);
  requireBinding(
    canonicalJson(start.subjectIds) === canonicalJson([founder]) &&
      lifecycle.company.chronicleIds.includes(start.id),
  );
  requireBinding(
    state.relations.every(
      (relation) =>
        relation.baseSourceEventId !== start.id ||
        (relation.fromId === reaction.contactId && relation.toId === founder),
    ),
    'OPENING_RELATION_CONFLICT',
  );
  return recordDirectedRelation(state, {
    sourceEventId: start.id,
    fromId: reaction.contactId,
    toId: founder,
    base: { friendship: 0, fear: 0, respect: reaction.respect, rivalry: reaction.rivalry },
  }).state;
}

/**
 * The adapter must supply the authentic pre-response base AND original notification evidence.
 * Missing archives are a migration prerequisite; never manufacture either from clamped post-state.
 * The legacy notification/intent stays lifecycle-owned. This function changes only E01 state.
 */
export function bindLegacyHeirReaction(
  state: SocialState,
  lifecycle: LifecycleState,
  crisisId: string,
  value: unknown,
): SocialState {
  const bypass = lifecycle.bypasses.find((entry) => entry.crisisId === crisisId);
  requireBinding(bypass);
  if (!bypass.notification) return state;
  const binding = snapshotJson(value);
  requireBinding(legacyBinding.read(binding), 'LEGACY_RELATION_BINDING_REQUIRED');
  const { base, notification: evidence } = binding;
  const notice = bypass.notification;
  actualPeople(lifecycle, bypass.heirId, bypass.leaderId);
  requireBinding(
    evidence.companyId === lifecycle.companyId &&
      evidence.worldId === lifecycle.worldId &&
      evidence.crisisId === crisisId &&
      evidence.heirId === bypass.heirId &&
      evidence.leaderId === bypass.leaderId &&
      evidence.atTick === notice.learnedAt &&
      base.fromId === bypass.heirId &&
      base.toId === bypass.leaderId &&
      base.sourceEventId !== bypass.eventId &&
      unsigned.read(bypass.happenedAt) &&
      unsigned.read(lifecycle.campaignTick) &&
      BigInt(notice.learnedAt) >= BigInt(bypass.happenedAt) &&
      BigInt(notice.learnedAt) <= BigInt(lifecycle.campaignTick),
  );
  const semanticKey = canonicalJson({
    type: 'Observe',
    payload: {
      observationId: evidence.id,
      observerRef: { kind: 'CHARACTER', id: bypass.heirId },
      subjectRef: { kind: 'CHARACTER', id: bypass.leaderId },
      factId: bypass.eventId,
      sourceId: evidence.sourceEventId,
    },
  });
  const receipt = lifecycle.applied.find((entry) => entry.semanticKey === semanticKey);
  const notification = receipt?.events.find(
    (event) =>
      event.type === 'HeirNotified' &&
      event.atTick === notice.learnedAt &&
      canonicalJson(event.subjectIds) === canonicalJson([bypass.heirId]),
  );
  const rule = COMPANY_RULES.heirBypass;
  requireBinding(
    notification &&
      notice.contribution.respect === rule.respectDelta &&
      notice.contribution.rivalry === rule.rivalryDelta,
  );
  const seeded = recordDirectedRelation(state, base).state;
  const fact = {
    memoryId: notification.id,
    personId: bypass.heirId,
    otherId: bypass.leaderId,
    factId: bypass.eventId,
    sourceEventId: evidence.sourceEventId,
    happenedAt: bypass.happenedAt,
    learnedAt: notice.learnedAt,
    factType: 'HeirBypassed',
    channel: binding.channel,
    emotionalDelta: { friendship: 0, fear: 0, ...notice.contribution },
    decayTicks: COMPANY_RULES.socialMemoryDecayTicks,
    salience: binding.salience,
  };
  const learned = recordLearnedFact(seeded, fact);
  if (learned.replayed) {
    requireBinding(
      canonicalJson({ ...learned.value, channel: fact.channel }) === canonicalJson(fact),
      'LEGACY_REACTION_CONFLICT',
    );
    return learned.state;
  }
  const before = deriveEffectiveRelation(seeded, bypass.heirId, bypass.leaderId, notice.learnedAt)!;
  const after = deriveEffectiveRelation(
    learned.state,
    bypass.heirId,
    bypass.leaderId,
    notice.learnedAt,
  )!;
  requireBinding(
    equalsInteger(before.respect, evidence.relation.respect) &&
      equalsInteger(before.rivalry, evidence.relation.rivalry) &&
      equalsInteger(after.respect, notice.respect) &&
      equalsInteger(after.rivalry, notice.rivalry) &&
      after.activeMemoryIds.includes(fact.memoryId),
    'LEGACY_RELATION_BINDING_MISMATCH',
  );
  return learned.state;
}
