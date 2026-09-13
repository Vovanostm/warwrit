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
import { isExactInteger } from './values.js';

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

export interface ExactRelationAxis {
  readonly numerator: string;
  readonly denominator: string;
}
export interface EffectiveRelation {
  readonly fromId: string;
  readonly toId: string;
  readonly friendship: ExactRelationAxis;
  readonly rivalry: ExactRelationAxis;
  readonly fear: ExactRelationAxis;
  readonly respect: ExactRelationAxis;
  readonly activeMemoryIds: readonly string[];
}

export const SOCIAL_ACTIVE_MEMORY_PERSON_LIMIT = 32 as const;
export const SOCIAL_ACTIVE_MEMORY_PAIR_LIMIT = 8 as const;

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

function memoryRemainingTicks(memory: LearnedFact, atTick: bigint): bigint {
  const learnedAt = BigInt(memory.learnedAt);
  const decayTicks = BigInt(memory.decayTicks);
  if (atTick < learnedAt || decayTicks <= 0n) return 0n;
  const age = atTick - learnedAt;
  return age >= decayTicks ? 0n : decayTicks - age;
}

function activeOrder(left: LearnedFact, right: LearnedFact): number {
  if (left.salience !== right.salience) return right.salience - left.salience;
  if (left.learnedAt !== right.learnedAt)
    return BigInt(left.learnedAt) > BigInt(right.learnedAt) ? -1 : 1;
  return left.memoryId === right.memoryId ? 0 : left.memoryId < right.memoryId ? -1 : 1;
}

/** Derived selection only: chronicle/base state never shrinks when a contribution expires or is displaced. */
export function selectActiveMemories(
  state: SocialState,
  personId: string,
  atTick: string,
): readonly LearnedFact[] {
  requireSocial(isExactInteger(atTick) && BigInt(atTick) >= 0n, 'INVALID_TIME');
  const now = BigInt(atTick);
  const candidates = state.chronicle
    .filter((memory) => memory.personId === personId && memoryRemainingTicks(memory, now) > 0n)
    .toSorted(activeOrder);
  const pairCounts = new Map<string, number>();
  const active: LearnedFact[] = [];
  for (const memory of candidates) {
    if (active.length === SOCIAL_ACTIVE_MEMORY_PERSON_LIMIT) break;
    if (memory.otherId !== undefined) {
      const count = pairCounts.get(memory.otherId) ?? 0;
      if (count >= SOCIAL_ACTIVE_MEMORY_PAIR_LIMIT) continue;
      pairCounts.set(memory.otherId, count + 1);
    }
    active.push(memory);
  }
  return active;
}

interface Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function normalized(numerator: bigint, denominator: bigint): Fraction {
  requireSocial(denominator > 0n, 'INVALID_SOURCE');
  if (numerator === 0n) return { numerator: 0n, denominator: 1n };
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function add(left: Fraction, right: Fraction): Fraction {
  const divisor = gcd(left.denominator, right.denominator);
  const leftScale = right.denominator / divisor;
  const rightScale = left.denominator / divisor;
  return normalized(
    left.numerator * leftScale + right.numerator * rightScale,
    left.denominator * leftScale,
  );
}

function exactAxis(
  base: number,
  active: readonly LearnedFact[],
  key: keyof RelationDelta,
  atTick: bigint,
): ExactRelationAxis {
  let value: Fraction = { numerator: BigInt(base), denominator: 1n };
  for (const memory of active) {
    const remaining = memoryRemainingTicks(memory, atTick);
    const decay = BigInt(memory.decayTicks);
    if (remaining === 0n || decay === 0n) continue;
    value = add(value, normalized(BigInt(memory.emotionalDelta[key]) * remaining, decay));
  }
  if (value.numerator <= 0n) return { numerator: '0', denominator: '1' };
  if (value.numerator >= 100n * value.denominator) return { numerator: '100', denominator: '1' };
  return { numerator: value.numerator.toString(), denominator: value.denominator.toString() };
}

/** Exact derived relation; public/UI integer rendering is deliberately deferred to E05. */
export function deriveEffectiveRelation(
  state: SocialState,
  fromId: string,
  toId: string,
  atTick: string,
): EffectiveRelation | undefined {
  requireSocial(isExactInteger(atTick) && BigInt(atTick) >= 0n, 'INVALID_TIME');
  const relation = relationFor(state, fromId, toId);
  if (!relation) return undefined;
  const now = BigInt(atTick);
  const active = selectActiveMemories(state, fromId, atTick).filter(
    (memory) => memory.otherId === toId,
  );
  return {
    fromId,
    toId,
    friendship: exactAxis(relation.base.friendship, active, 'friendship', now),
    rivalry: exactAxis(relation.base.rivalry, active, 'rivalry', now),
    fear: exactAxis(relation.base.fear, active, 'fear', now),
    respect: exactAxis(relation.base.respect, active, 'respect', now),
    activeMemoryIds: active.map((memory) => memory.memoryId),
  };
}
