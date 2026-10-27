import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { WorldLabStateDto } from '@warwrit/protocol';
import {
  isWorldLabStateNotOlder,
  preserveNewerWorldLabGroups,
  readWorldLabVisit,
  readWorldLabState,
} from './world-lab-state.js';

const snapshot: WorldLabStateDto = {
  schemaVersion: 1,
  worldId: 'world.painted-atlas.lab-v1',
  mapEdition: 'porechye-atlas-lab-v1',
  sequence: '100',
  serverTimeMs: '100',
  light: 'DAY',
  timeScale: 1,
  slot: 'company-a',
  own: {
    companyId: 'company-a',
    partyId: 'party-a',
    name: 'Отряд',
    movement: {
      schemaVersion: 2,
      result: 'ACCEPTED',
      publicRevision: '1',
      movementEpoch: '0',
      serverTimeMs: '100',
      worldTick: '0',
      mode: 'STATIONARY_TERRAIN',
      point: { xMicroFp: '0', zMicroFp: '0' },
      plan: null,
    },
  },
  groups: [
    {
      id: 'wolf',
      kind: 'WILDLIFE',
      name: 'Стая',
      point: { xMicroFp: '-200', zMicroFp: '100' },
      state: 'IDLE',
      observedAtMs: '100',
      movementEpoch: '0',
    },
  ],
  nearbySite: null,
};

test('the map accepts a valid observation but rejects an invalid group coordinate', () => {
  assert.equal(readWorldLabState(snapshot), snapshot);
  const invalid = structuredClone(snapshot);
  (invalid.groups[0]!.point as { xMicroFp: string }).xMicroFp = 'NaN';
  assert.equal(readWorldLabState(invalid), undefined);
});

test('own movement and visit payloads retain their protocol boundaries', () => {
  const invalidOwn = structuredClone(snapshot);
  (invalidOwn.own.movement as { movementEpoch: string }).movementEpoch = '-1';
  assert.equal(readWorldLabState(invalidOwn), undefined);

  const visit = {
    schemaVersion: 1,
    siteId: 'mill',
    name: 'Мельница',
    image: '/assets/art/m1/places/settlements-v2/mill.webp',
  };
  assert.equal(readWorldLabVisit(visit, 'mill'), visit);
  assert.equal(readWorldLabVisit(visit, 'other'), undefined);
  assert.throws(() =>
    readWorldLabVisit(
      { ...visit, image: '/assets/art/m1/places/settlements-v2/../secret' },
      'mill',
    ),
  );
});

test('late messages and foreign worlds cannot replace the current snapshot', () => {
  assert.deepEqual(
    [
      isWorldLabStateNotOlder({ ...snapshot, sequence: '99' }, snapshot),
      isWorldLabStateNotOlder({ ...snapshot, worldId: 'other-world', sequence: '999' }, snapshot),
      isWorldLabStateNotOlder({ ...snapshot, sequence: '101' }, snapshot),
    ],
    [false, false, true],
  );
});

test('a delayed world read cannot undo an acknowledged stop with a later envelope time', () => {
  const stopped = structuredClone(snapshot);
  Object.assign(stopped.own.movement, {
    publicRevision: '3',
    movementEpoch: '2',
    serverTimeMs: '200',
  });
  const delayed = { ...snapshot, sequence: '300', serverTimeMs: '300' };
  assert.equal(isWorldLabStateNotOlder(delayed, stopped), false);
});

test('overlapping reads retain newer visible NPC epochs without retaining lost contacts', () => {
  const current = structuredClone(snapshot);
  (current.groups[0]! as { movementEpoch: string }).movementEpoch = '2';
  const newer = structuredClone(snapshot);
  Object.assign(newer.groups[0]!, { movementEpoch: '3', observedAtMs: '99' });
  assert.deepEqual(
    [
      preserveNewerWorldLabGroups(snapshot, current).groups,
      preserveNewerWorldLabGroups({ ...snapshot, groups: [] }, current).groups,
      preserveNewerWorldLabGroups(newer, current).groups,
    ],
    [current.groups, [], newer.groups],
  );
});

test('pursuit metadata is own-only and unknown pursuit modes cannot enter the UI', () => {
  const pursuit = {
    orderId: 'pursuit-1',
    targetId: 'wolf',
    targetName: 'Стая',
    lastPoint: snapshot.groups[0]!.point,
    status: 'CHASING',
    movementEpoch: '1',
  };
  const valid = { ...snapshot, pursuit };
  assert.equal(readWorldLabState(valid), valid);
  assert.equal(
    readWorldLabState({ ...valid, pursuit: { ...pursuit, status: 'HIDDEN_TRACKING' } }),
    undefined,
  );
});
