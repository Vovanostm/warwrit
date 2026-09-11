import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  admitStudyInterval,
  advanceStudySection,
  createStudyAccessState,
  entityId,
  readStudyAccessState,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  MaterializedCompanyState,
  PhysicalEvidence,
  StudyAccessRequest,
  StudyAccessState,
} from '@warwrit/game-core';
import { command, context, economy, place, tick } from './company-economy-fixture.js';
import { addContainer, addItem, container, item, itemAccess } from './company-physical-fixture.js';

const owner = { kind: 'COMPANY' as const, id: 'company' };
const work = COMPANY_CATALOGUE.works.find(
  (candidate) =>
    candidate.id === 'wound-care-basics' && candidate.sectionId === 'wound-care-basics-1',
);
if (!work) throw new Error('Missing C02 study fixture');

function setup(at = 10, copies = 1, definitionId = 'study-book-medicine') {
  let state = economy([1n], 100n, at);
  state = addContainer(state, container('books', owner));
  for (let index = 1; index <= copies; index += 1)
    state = addItem(state, item(`book-${index}`, definitionId, owner, 'books'));
  return state as CompanyEconomyState & MaterializedCompanyState;
}
type Root = ReturnType<typeof setup>;
const withPhysical = (root: Root, physical: Root['physical']): Root => ({
  ...root,
  physical,
});

function request(
  intervalId: string,
  itemId: string,
  from: number,
  to: number,
  characterId = 'leader',
): StudyAccessRequest {
  return {
    intervalId,
    characterId,
    workId: work.id,
    sectionId: work.sectionId,
    itemId,
    accessEvidenceId: `access-${intervalId}`,
    fromTick: String(from),
    toTick: String(to),
  };
}

type Access = Extract<PhysicalEvidence, { kind: 'ITEM_ACCESS' }>;
function access(
  root: Root,
  input: StudyAccessRequest,
  patch: Partial<Access> = {},
): Access {
  return {
    ...itemAccess(root, input.accessEvidenceId, 'STUDY', ['books'], [input.itemId]),
    operatorId: input.characterId,
    ...patch,
  };
}

function admit(
  root: Root,
  occupied: StudyAccessState,
  input: StudyAccessRequest,
  fact: Access = access(root, input),
) {
  const cmd = command(root, 'Observe', {}, `study-context-${input.intervalId}`, 'SYSTEM');
  return admitStudyInterval(occupied, root, context(root, cmd, [], [], [fact]), input);
}

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('C02 — actual study-book access and exclusive copy intervals', () => {
  it('admits a local matching copy without mutating physical state or C01 mastery', () => {
    const root = setup();
    const input = request('first', 'book-1', 10, 20);
    const physicalBefore = reload(root.physical);
    const mastery = advanceStudySection(
      null,
      { characterId: 'leader', workId: work.id, sectionId: work.sectionId },
      '1',
    ).next;
    const masteryBefore = reload(mastery);

    const next = admit(root, createStudyAccessState(), input);

    expect(next.intervals).toEqual([
      {
        schemaVersion: 1,
        ...input,
        workVersion: work.version,
        containerId: 'books',
      },
    ]);
    expect(root.physical).toEqual(physicalBefore);
    expect(mastery).toEqual(masteryBefore);
  });

  it('rejects known-only, remote/closed, tombstoned, non-book and wrong-work items', () => {
    const input = request('bad', 'book-1', 10, 20);

    const knownBase = setup(10, 0);
    const ghost = item('book-1', 'study-book-medicine', owner, 'books');
    const knownRoot = withPhysical(knownBase, {
      ...knownBase.physical,
      knowledge: {
        ...knownBase.physical.knowledge,
        itemSnapshots: [...knownBase.physical.knowledge.itemSnapshots, ghost],
      },
    });
    expect(() =>
      admit(knownRoot, createStudyAccessState(), input, access(knownRoot, input)),
    ).toThrow();

    const remoteBase = setup();
    const remote = withPhysical(remoteBase, {
      ...remoteBase.physical,
      containers: remoteBase.physical.containers.map((entry) =>
        entry.containerId === 'books'
          ? { ...entry, location: { kind: 'AT', siteId: place.siteId, areaId: 'archive' } }
          : entry,
      ),
    });
    expect(() => admit(remote, createStudyAccessState(), input, access(remote, input))).toThrow();

    const closedBase = setup();
    const closed = withPhysical(closedBase, {
      ...closedBase.physical,
      containers: closedBase.physical.containers.map((entry) =>
        entry.containerId === 'books'
          ? { ...entry, closed: { sourceId: 'close', causeId: 'locked', atTick: tick(10) } }
          : entry,
      ),
    });
    expect(() => admit(closed, createStudyAccessState(), input, access(closed, input))).toThrow();

    const tombstoneBase = setup();
    const tombstoned = withPhysical(tombstoneBase, {
      ...tombstoneBase.physical,
      items: tombstoneBase.physical.items.map((entry) =>
        entry.itemId === 'book-1'
          ? { ...entry, tombstone: { sourceId: 'loss', causeId: 'burned', atTick: tick(9) } }
          : entry,
      ),
    });
    expect(() =>
      admit(tombstoned, createStudyAccessState(), input, access(tombstoned, input)),
    ).toThrow();

    const wrongKind = setup(10, 1, 'sword');
    expect(() =>
      admit(wrongKind, createStudyAccessState(), input, access(wrongKind, input)),
    ).toThrow();
    const wrongWork = setup(10, 1, 'study-book-command');
    expect(() =>
      admit(wrongWork, createStudyAccessState(), input, access(wrongWork, input)),
    ).toThrow();
  });

  it('rejects access evidence for another learner/item/container/purpose/location or scope', () => {
    const root = setup();
    const input = request('proof', 'book-1', 10, 20);
    const good = access(root, input);
    const bad: Access[] = [
      { ...good, operatorId: 'worker-0' },
      { ...good, itemIds: ['fixture-rations-0'] },
      { ...good, containerIds: ['fixture-supply'] },
      { ...good, purpose: 'TRANSFER' },
      { ...good, location: { kind: 'AT', siteId: place.siteId, areaId: 'archive' } },
      { ...good, ordinal: -1 },
      { ...good, companyId: entityId<'Company'>('foreign') },
    ];
    for (const fact of bad)
      expect(() => admit(root, createStudyAccessState(), input, fact)).toThrow();
  });

  it('rejects overlap on the exact copy but allows adjacency and later reuse after reload', () => {
    const firstRoot = setup(10);
    const first = request('first', 'book-1', 10, 20);
    const occupied = admit(firstRoot, createStudyAccessState(), first);

    const overlapRoot = setup(19);
    const overlap = request('overlap', 'book-1', 19, 30);
    expect(() => admit(overlapRoot, occupied, overlap)).toThrow();

    const adjacentRoot = setup(20);
    const adjacent = request('adjacent', 'book-1', 20, 30);
    const adjacentState = admit(adjacentRoot, reload(occupied), adjacent);
    expect(adjacentState.intervals.map((entry) => [entry.fromTick, entry.toTick])).toEqual([
      ['10', '20'],
      ['20', '30'],
    ]);
    expect(readStudyAccessState(reload(adjacentState))).toEqual(adjacentState);

    const laterRoot = setup(30);
    const later = request('later', 'book-1', 30, 35);
    expect(admit(laterRoot, adjacentState, later).intervals).toHaveLength(3);
    expect(() =>
      admit(firstRoot, createStudyAccessState(), request('zero', 'book-1', 10, 10)),
    ).toThrow();
  });

  it('allows two physical copies of one work to overlap for different learners', () => {
    const root = setup(10, 2);
    const leader = request('leader-copy', 'book-1', 10, 20);
    const worker = request('worker-copy', 'book-2', 10, 20, 'worker-0');
    const occupied = admit(root, createStudyAccessState(), leader);
    const next = admit(root, occupied, worker, access(root, worker));

    expect(next.intervals).toHaveLength(2);
    expect(next.intervals.map((entry) => entry.itemId).sort()).toEqual(['book-1', 'book-2']);
  });

  it('does not let present access authorize a future interval', () => {
    const root = setup(10);
    const future = request('future', 'book-1', 11, 20);
    expect(() => admit(root, createStudyAccessState(), future, access(root, future))).toThrow();
  });
});
