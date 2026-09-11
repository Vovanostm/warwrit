import { COMPANY_CATALOGUE } from './definitions.js';
import { array, choice, id, natural, object, snapshotJson, unsigned } from './input.js';
import type { ValueOf } from './input.js';
import type { EconomyContext } from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import {
  itemDefinition,
  physicalContainer,
  physicalItem,
  requireItemAccess,
  requirePhysical,
} from './physical-state.js';
import type { PhysicalError } from './physical-types.js';

const intervalInput = object({
  schemaVersion: choice(1),
  intervalId: id,
  characterId: id,
  workId: id,
  workVersion: natural(1),
  sectionId: id,
  itemId: id,
  containerId: id,
  accessEvidenceId: id,
  fromTick: unsigned,
  toTick: unsigned,
});
const stateInput = object({ schemaVersion: choice(1), intervals: array(intervalInput) });
const requestInput = object({
  intervalId: id,
  characterId: id,
  workId: id,
  sectionId: id,
  itemId: id,
  accessEvidenceId: id,
  fromTick: unsigned,
  toTick: unsigned,
});

export type StudyAccessInterval = ValueOf<typeof intervalInput>;
export type StudyAccessState = ValueOf<typeof stateInput>;
export type StudyAccessRequest = ValueOf<typeof requestInput>;

function workFor(workId: string, sectionId: string, error: PhysicalError) {
  const work = COMPANY_CATALOGUE.works.find(
    (candidate) => candidate.id === workId && candidate.sectionId === sectionId,
  );
  requirePhysical(work, error);
  return work;
}

function bounds(interval: { readonly fromTick: string; readonly toTick: string }) {
  const from = BigInt(interval.fromTick);
  const to = BigInt(interval.toTick);
  requirePhysical(from < to, 'INVALID_TIME');
  return { from, to };
}

function overlap(left: StudyAccessInterval, right: StudyAccessInterval): boolean {
  const a = bounds(left);
  const b = bounds(right);
  return a.from < b.to && b.from < a.to;
}

/** Reads only C02's occupied-copy ledger; physical and semantic state stay externally owned. */
export function readStudyAccessState(value: unknown): StudyAccessState {
  const snapshot = snapshotJson(value);
  requirePhysical(stateInput.read(snapshot), 'INVALID_STATE');
  requirePhysical(
    new Set(snapshot.intervals.map((interval) => interval.intervalId)).size ===
      snapshot.intervals.length,
    'INVALID_STATE',
  );
  for (let index = 0; index < snapshot.intervals.length; index += 1) {
    const interval = snapshot.intervals[index]!;
    bounds(interval);
    const work = workFor(interval.workId, interval.sectionId, 'INVALID_STATE');
    requirePhysical(interval.workVersion === work.version, 'INVALID_STATE');
    for (let previous = 0; previous < index; previous += 1) {
      const candidate = snapshot.intervals[previous]!;
      requirePhysical(
        candidate.itemId !== interval.itemId || !overlap(candidate, interval),
        'INVALID_STATE',
      );
    }
  }
  return snapshot;
}

export function createStudyAccessState(): StudyAccessState {
  return readStudyAccessState({ schemaVersion: 1, intervals: [] });
}

/**
 * Admits actual physical access for one finite copy interval. It does not start a task,
 * settle time/XP/cost, reserve the learner globally, or react to later transfer/loss.
 */
export function admitStudyInterval(
  stateValue: StudyAccessState,
  root: MaterializedCompanyState,
  context: EconomyContext,
  requestValue: StudyAccessRequest,
): StudyAccessState {
  const state = readStudyAccessState(stateValue);
  const request = snapshotJson(requestValue);
  requirePhysical(requestInput.read(request), 'INVALID_ARGUMENT');
  const requested = bounds(request);
  requirePhysical(request.fromTick === context.atTick, 'INVALID_TIME');
  requirePhysical(
    root.lifecycle.characters.some(
      (character) => character.identity.characterId === request.characterId,
    ),
    'CONTACT_OR_ACCESS_REQUIRED',
  );

  const work = workFor(request.workId, request.sectionId, 'INVALID_ARGUMENT');
  const item = physicalItem(root.physical, request.itemId);
  const definition = itemDefinition(item);
  requirePhysical(
    definition.kind === 'book' && definition.workId === request.workId,
    'INVALID_ARGUMENT',
  );
  requirePhysical(item.containerId !== null, 'CONTACT_OR_ACCESS_REQUIRED');
  const container = physicalContainer(root.physical, item.containerId);
  const access = requireItemAccess(
    root,
    context,
    request.accessEvidenceId,
    'STUDY',
    [container.containerId],
    [item.itemId],
  );
  requirePhysical(access.operatorId === request.characterId, 'INVALID_SOURCE');
  requirePhysical(
    !state.intervals.some((interval) => interval.intervalId === request.intervalId),
    'IDEMPOTENCY_CONFLICT',
  );
  requirePhysical(
    state.intervals.every((interval) => {
      if (interval.itemId !== request.itemId) return true;
      const existing = bounds(interval);
      return existing.to <= requested.from || requested.to <= existing.from;
    }),
    'CAPACITY',
  );

  const interval: StudyAccessInterval = {
    schemaVersion: 1,
    intervalId: request.intervalId,
    characterId: request.characterId,
    workId: request.workId,
    workVersion: work.version,
    sectionId: request.sectionId,
    itemId: item.itemId,
    containerId: container.containerId,
    accessEvidenceId: access.id,
    fromTick: request.fromTick,
    toTick: request.toTick,
  };
  return readStudyAccessState({ schemaVersion: 1, intervals: [...state.intervals, interval] });
}
