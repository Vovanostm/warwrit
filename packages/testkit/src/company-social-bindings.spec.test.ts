import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  COMPANY_RULES,
  bindLegacyHeirReaction,
  bindOpeningContactReaction,
  canonicalJson,
  createSocialState,
  deriveEffectiveRelation,
  moneyQ,
  recordLearnedFact,
  prepareCompanyLifecycle,
} from '@warwrit/game-core';
import type {
  HeirNotificationEvidence,
  LifecycleState,
  OpeningAssets,
  SocialState,
} from '@warwrit/game-core';
import { command, context, economy, scope, tick } from './company-economy-fixture.js';

function notify(lifecycle: LifecycleState, notice: HeirNotificationEvidence) {
  const root = { ...economy(), lifecycle };
  const cmd = command(
    root,
    'Observe',
    {
      observationId: notice.id,
      observerRef: { kind: 'CHARACTER', id: notice.heirId },
      subjectRef: { kind: 'CHARACTER', id: notice.leaderId },
      factId: lifecycle.bypasses[0]!.eventId,
      sourceId: notice.sourceEventId,
    },
    notice.id,
    'DOMAIN_RECEIPT',
    notice.atTick,
  );
  const result = prepareCompanyLifecycle(lifecycle, cmd, context(root, cmd, [], [notice]));
  if (result.kind !== 'PREPARED') throw new Error(result.error);
  return result.next;
}

// The original opening receipt is archived; first/repeat notification uses the real producer.
function fixture(respect = 26, rivalry = 52, leaving = true) {
  const root = economy();
  const loaded = root.lifecycle;
  const [founder, heir, leader, contact] = loaded.characters.map((p) => p.identity.characterId);
  assert(founder && heir && leader && contact);
  const notice: HeirNotificationEvidence = {
    ...scope(root, 'first-notice', tick(200)),
    kind: 'HEIR_NOTIFICATION',
    crisisId: 'crisis',
    heirId: heir,
    leaderId: leader,
    relation: { respect, rivalry },
  };
  const binding = {
    base: {
      sourceEventId: 'prior-relation',
      fromId: heir,
      toId: leader,
      base: { friendship: 7, fear: 9, respect, rivalry },
    },
    notification: notice,
    channel: 'REPORT' as const,
    salience: 4,
  };
  const assets = {
    cashQ: moneyQ('0'),
    items: [],
    serviceTerms: [],
    signingCharges: [],
    debt: null,
    hookId: 'origin-hook',
    contactReaction: { contactId: contact, respect: 5, rivalry: 0 },
  } satisfies OpeningAssets;
  const waiting: LifecycleState = {
    ...loaded,
    campaignTick: tick(200),
    company: {
      ...loaded.company!,
      currentLeaderId: leaving ? leader : heir,
      chronicleIds: ['opening'],
    },
    bypasses: [
      {
        crisisId: 'crisis',
        eventId: 'bypassed',
        heirId: heir,
        leaderId: leader,
        happenedAt: tick(100),
        notification: null,
      },
    ],
    applied: [
      {
        commandId: 'start',
        requestKey: 'stored-start',
        sourceKey: null,
        semanticKey: 'stored-start',
        events: [{ id: 'opening', type: 'CompanyStarted', atTick: tick(0), subjectIds: [founder] }],
        requirements: [{ kind: 'OPENING_ASSETS', assets }],
      },
    ],
  };
  const lifecycle = notify(waiting, notice);
  const notification = lifecycle.bypasses[0]!.notification!;
  const bind = (state = createSocialState(), input: unknown = binding, life = lifecycle) =>
    bindLegacyHeirReaction(state, life, 'crisis', input);
  const relation = (state: SocialState, at: string) =>
    deriveEffectiveRelation(state, heir, leader, at)!;
  return { lifecycle, waiting, binding, bind, relation, assets, notification, founder, contact };
}
const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const axis = (n: number, d = 1) => ({ numerator: String(n), denominator: String(d) });

test('opening binds only contact → founder; replay is unchanged and base does not decay', () => {
  const f = fixture();
  const { fromId: heir, toId: leader } = f.binding.base;
  const before = canonicalJson(f.lifecycle);
  const state = bindOpeningContactReaction(createSocialState(), f.lifecycle, 'start');
  const loaded = reload(state);
  assert.equal(bindOpeningContactReaction(loaded, reload(f.lifecycle), 'start'), loaded);
  assert.equal(state.chronicle.length, 0);
  assert.deepEqual(deriveEffectiveRelation(state, f.contact, f.founder, '99999')?.respect, axis(5));
  assert.equal(deriveEffectiveRelation(state, f.contact, leader, '200'), undefined);
  assert.equal(deriveEffectiveRelation(state, f.founder, f.contact, '200'), undefined);
  assert.equal(canonicalJson(f.lifecycle), before);
  assert.throws(() => bindOpeningContactReaction(state, f.lifecycle, 'missing'));
  const absent = { ...f.lifecycle, characters: [] };
  assert.throws(() => bindOpeningContactReaction(state, absent, 'start'));
  f.assets.contactReaction.respect = 99;
  assert.equal(state.relations[0]!.base.respect, 5);
  assert.throws(() => bindOpeningContactReaction(state, f.lifecycle, 'start'), /CONFLICT/);
  f.assets.contactReaction.contactId = heir;
  assert.throws(() => bindOpeningContactReaction(state, f.lifecycle, 'start'), /CONFLICT/);
});

test('authentic bases survive clamp edges, delayed learning, exact decay and JSON reload', () => {
  const cases = [
    [3, 97],
    [0, 100],
    [6, 92],
    [26, 52],
    [100, 0],
  ] as const;
  for (const [respect, rivalry] of cases) {
    const f = fixture(respect, rivalry);
    const before = canonicalJson(f.lifecycle);
    const state = f.bind();
    assert.deepEqual(f.relation(state, '200').respect, axis(f.notification.respect));
    assert.deepEqual(f.relation(state, '200').rivalry, axis(f.notification.rivalry));
    assert.deepEqual(f.relation(state, '199').respect, axis(respect));
    const loaded = reload(state);
    const end = (200n + BigInt(COMPANY_RULES.socialMemoryDecayTicks)).toString();
    const faded = f.relation(loaded, end);
    assert.deepEqual(faded.respect, axis(respect));
    assert.deepEqual(faded.rivalry, axis(rivalry));
    assert.deepEqual(faded.friendship, axis(7));
    assert.equal(f.bind(loaded, f.binding, reload(f.lifecycle)), loaded);
    assert.equal(canonicalJson(f.lifecycle), before);
  }
  const f = fixture(3, 97);
  const at = (200n + (3n * BigInt(COMPANY_RULES.socialMemoryDecayTicks)) / 4n).toString();
  assert.deepEqual(f.relation(f.bind(), at).respect, axis(3, 2));
});

test('other channels and later conditions cannot reapply memory or rewrite intent', () => {
  for (const leaving of [false, true]) {
    const f = fixture(26, 52, leaving);
    const state = f.bind();
    assert.equal(f.notification.departureIntent !== null, leaving);
    const first = state.chronicle[0]!;
    const other = recordLearnedFact(reload(state), {
      ...first,
      memoryId: 'later-memory',
      sourceEventId: 'later-witness',
      channel: 'WITNESS',
      learnedAt: '99999',
    });
    assert.equal(other.replayed, true);
    assert.deepEqual(other.value, first);
    const later = notify(reload(f.lifecycle), {
      ...f.binding.notification,
      id: 'second-notice',
      sourceEventId: 'source-second-notice',
      revision: f.lifecycle.revision,
      atTick: tick(99999),
      relation: { respect: 100, rivalry: 0 },
    });
    assert.deepEqual(later.bypasses[0]!.notification, f.notification);
    const before = canonicalJson(later);
    assert.equal(f.bind(other.state, { ...f.binding, channel: 'WITNESS' }, later), other.state);
    assert.equal(canonicalJson(later), before);
    assert.equal(other.state.chronicle.length, 1);
  }
});

test('unnotified bypass is inert; missing history and invalid provenance fail atomically', () => {
  const f = fixture(3, 97);
  const state = createSocialState();
  const waiting = f.waiting;
  const before = canonicalJson([state, waiting, f.lifecycle]);
  assert.equal(f.bind(state, null, waiting), state);
  assert.throws(() => f.bind(state, null), /LEGACY_RELATION_BINDING_REQUIRED/);
  const { base, notification } = f.binding;
  for (const input of [
    { ...f.binding, base: { ...base, base: { ...base.base, respect: 6, rivalry: 92 } } },
    { ...f.binding, notification: { ...notification, worldId: 'foreign' } },
    { ...f.binding, notification: { ...notification, sourceEventId: 'unrecorded' } },
    { ...f.binding, notification: { ...notification, atTick: '99' } },
    { ...f.binding, base: { ...base, toId: f.founder } },
  ])
    assert.throws(() => f.bind(state, input));
  assert.equal(canonicalJson([state, waiting, f.lifecycle]), before);
  const bound = f.bind();
  assert.throws(() => f.bind(bound, { ...f.binding, salience: 99 }), /LEGACY_REACTION_CONFLICT/);
  base.base.respect = 100;
  assert.equal(bound.relations[0]!.base.respect, 3);
  assert.throws(() => f.bind(bound), /RELATION_CONFLICT/);
});
