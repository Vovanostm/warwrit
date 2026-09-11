import {
  canonicalJson,
  choice,
  id,
  natural,
  object,
  optional,
  snapshotJson,
  unsigned,
} from './input.js';
import type { ValueOf } from './input.js';

const relationAxesInput = object({
  friendship: natural(0, 100),
  rivalry: natural(0, 100),
  fear: natural(0, 100),
  respect: natural(0, 100),
});
const relationDeltaInput = object({
  friendship: natural(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
  rivalry: natural(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
  fear: natural(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
  respect: natural(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
});
const relationSeedInput = object({
  sourceEventId: id,
  fromId: id,
  toId: id,
  base: relationAxesInput,
});
const learnedFactInput = object({
  memoryId: id,
  personId: id,
  otherId: optional(id),
  factId: id,
  sourceEventId: id,
  happenedAt: unsigned,
  learnedAt: unsigned,
  factType: id,
  channel: choice('EXPERIENCE', 'WITNESS', 'REPORT'),
  emotionalDelta: relationDeltaInput,
  decayTicks: unsigned,
  salience: natural(),
});

export type RelationAxes = ValueOf<typeof relationAxesInput>;
export type RelationDelta = ValueOf<typeof relationDeltaInput>;
export type LearnedFact = ValueOf<typeof learnedFactInput>;

export interface DirectedRelation {
  readonly fromId: string;
  readonly toId: string;
  readonly base: RelationAxes;
  readonly baseSourceEventId: string | null;
}
export interface SocialState {
  readonly relations: readonly DirectedRelation[];
  /** Append-only facts a person actually learned. E02 derives active memories from this chronicle. */
  readonly chronicle: readonly LearnedFact[];
}
export interface SocialTransition<T> {
  readonly state: SocialState;
  readonly value: T;
  readonly replayed: boolean;
}

export type SocialViolationCode =
  'INVALID_SOURCE' | 'INVALID_TIME' | 'RELATION_CONFLICT' | 'FACT_CONFLICT' | 'MEMORY_ID_CONFLICT';

export class SocialViolation extends Error {
  constructor(readonly code: SocialViolationCode) {
    super(code);
    this.name = 'SocialViolation';
  }
}

const NEUTRAL_RELATION: RelationAxes = Object.freeze({
  friendship: 0,
  rivalry: 0,
  fear: 0,
  respect: 0,
});

function requireSocial(condition: boolean, code: SocialViolationCode): asserts condition {
  if (!condition) throw new SocialViolation(code);
}

export function createSocialState(): SocialState {
  return { relations: [], chronicle: [] };
}

function relationFor(state: SocialState, fromId: string, toId: string) {
  return state.relations.find((relation) => relation.fromId === fromId && relation.toId === toId);
}

/** Seed one significant directed pair, for example from an origin/contact event. */
export function recordDirectedRelation(
  state: SocialState,
  value: unknown,
): SocialTransition<DirectedRelation> {
  const evidence = snapshotJson(value);
  requireSocial(relationSeedInput.read(evidence), 'INVALID_SOURCE');
  requireSocial(evidence.fromId !== evidence.toId, 'INVALID_SOURCE');
  const candidate: DirectedRelation = {
    fromId: evidence.fromId,
    toId: evidence.toId,
    base: evidence.base,
    baseSourceEventId: evidence.sourceEventId,
  };
  const previous = relationFor(state, candidate.fromId, candidate.toId);
  if (previous) {
    requireSocial(canonicalJson(previous) === canonicalJson(candidate), 'RELATION_CONFLICT');
    return { state, value: previous, replayed: true };
  }
  return {
    state: { ...state, relations: [...state.relations, candidate] },
    value: candidate,
    replayed: false,
  };
}

function sameFact(left: LearnedFact, right: LearnedFact): boolean {
  return (
    left.personId === right.personId &&
    left.factId === right.factId &&
    left.factType === right.factType &&
    left.happenedAt === right.happenedAt &&
    (left.otherId ?? null) === (right.otherId ?? null)
  );
}

/**
 * Record knowledge only for the explicit learner. A later channel for the same fact is a replay:
 * the first learned memory remains the sole emotional contribution.
 */
export function recordLearnedFact(
  state: SocialState,
  value: unknown,
): SocialTransition<LearnedFact> {
  const evidence = snapshotJson(value);
  requireSocial(learnedFactInput.read(evidence), 'INVALID_SOURCE');
  requireSocial(BigInt(evidence.learnedAt) >= BigInt(evidence.happenedAt), 'INVALID_TIME');

  const known = state.chronicle.find(
    (memory) => memory.personId === evidence.personId && memory.factId === evidence.factId,
  );
  if (known) {
    requireSocial(sameFact(known, evidence), 'FACT_CONFLICT');
    return { state, value: known, replayed: true };
  }
  requireSocial(
    !state.chronicle.some((memory) => memory.memoryId === evidence.memoryId),
    'MEMORY_ID_CONFLICT',
  );

  let relations = state.relations;
  if (
    evidence.otherId !== undefined &&
    evidence.otherId !== evidence.personId &&
    !relationFor(state, evidence.personId, evidence.otherId)
  ) {
    relations = [
      ...relations,
      {
        fromId: evidence.personId,
        toId: evidence.otherId,
        base: NEUTRAL_RELATION,
        baseSourceEventId: null,
      },
    ];
  }
  return {
    state: { ...state, relations, chronicle: [...state.chronicle, evidence] },
    value: evidence,
    replayed: false,
  };
}
