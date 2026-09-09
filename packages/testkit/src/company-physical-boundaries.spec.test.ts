import { describe, expect, it } from 'vitest';
import { entityId, prepareCompanyEconomy, projectCompanyPhysical } from '@warwrit/game-core';
import type { CompanyEconomyState, PhysicalEvidence } from '@warwrit/game-core';
import {
  command,
  context,
  economy,
  physicalScope,
  place,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';
import {
  addContainer,
  addItem,
  container,
  item,
  itemAccess,
  visibleCharacter,
} from './company-physical-fixture.js';

function equippedWorker() {
  let state = economy([1n], 100n, 0);
  state = addContainer(
    state,
    container('pack', { kind: 'CHARACTER', id: 'worker-0' }, 30000, {
      kind: 'CHARACTER',
      id: 'worker-0',
    }),
  );
  state = addItem(state, {
    ...item('sword', 'sword', { kind: 'CHARACTER', id: 'worker-0' }, 'pack'),
    equipped: { characterId: 'worker-0', slots: ['MAIN_HAND'] },
  });
  return state;
}
function capture(state: CompanyEconomyState) {
  const cmd = command(
    state,
    'Capture',
    {
      receiptId: 'capture-proof',
      characterId: 'worker-0',
      captorRef: { kind: 'WORLD', id: 'world' },
      locationRef: place,
      seizedItems: [],
    },
    'capture',
    'OUTCOME_RECEIPT',
  );
  const fact: PhysicalEvidence = {
    ...physicalScope(state, 'capture-proof'),
    sourceEventId: cmd.sourceEventId,
    kind: 'CAPTURE_OUTCOME',
    characterId: 'worker-0',
    captor: { kind: 'WORLD', id: 'world' },
    location: place,
  };
  return prepared(prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact]))).next;
}
function missing() {
  const loaded = visibleCharacter(economy([1n], 10n, 100), 'worker-0', (p) => ({
    ...p,
    presence: {
      ...p.presence,
      availability: 'OUT_OF_CONTACT',
      assignment: 'NONE',
      fieldPartyId: null,
    },
  }));
  return {
    ...loaded,
    finance: {
      ...loaded.finance,
      accounts: loaded.finance.accounts.map((a) =>
        a.membershipId === 'service-worker-0' ? { ...a, actualPaused: true, knownPaused: true } : a,
      ),
    },
  };
}

describe('WP-02.4 — cross-component physical boundaries', () => {
  it('P2: two carried containers do not grant the same body twice its weight allowance', () => {
    let state = economy([], 10n, 0);
    for (const id of ['pack-one', 'pack-two'])
      state = addContainer(
        state,
        container(id, { kind: 'CHARACTER', id: 'leader' }, 30000, {
          kind: 'CHARACTER',
          id: 'leader',
        }),
      );
    state = addItem(
      state,
      item('carried-food', 'ration', { kind: 'COMPANY', id: 'company' }, 'pack-one', 30),
    );
    const cmd = command(state, 'TransferItem', {
      itemId: 'fixture-rations-0',
      quantity: 40,
      fromContainerId: 'fixture-supply',
      toContainerId: 'pack-two',
      accessEvidenceId: 'load-access',
    });
    const proof = itemAccess(
      state,
      'load-access',
      'TRANSFER',
      ['fixture-supply', 'pack-two'],
      ['fixture-rations-0'],
    );
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [proof]));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'CAPACITY' });
    expect(result.state).toBe(state);
  });

  it('P2: another available operator cannot remove equipment from an active encounter', () => {
    const state = visibleCharacter(equippedWorker(), 'worker-0', (p) => ({
      ...p,
      presence: {
        ...p.presence,
        availability: 'IN_ENCOUNTER',
        encounterBindingId: entityId('battle'),
      },
    }));
    const cmd = command(state, 'TransferItem', {
      itemId: 'sword',
      quantity: 1,
      fromContainerId: 'pack',
      toContainerId: 'fixture-supply',
      accessEvidenceId: 'take-gear',
    });
    const result = prepareCompanyEconomy(
      state,
      cmd,
      context(
        state,
        cmd,
        [],
        [],
        [itemAccess(state, 'take-gear', 'TRANSFER', ['pack', 'fixture-supply'], ['sword'])],
      ),
    );
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INCOMPATIBLE_ACTIVITY' });
    expect(result.state).toBe(state);
  });

  it('P1/P2/P8: due loot is local, capacity-bound and source-once; container retirement preserves causal history', () => {
    let state = economy([], 10n, 0);
    state = addContainer(state, container('loot', { kind: 'WORLD', id: 'world' }, 30000));
    state = addItem(
      state,
      item('loot-rations', 'ration', { kind: 'WORLD', id: 'world' }, 'loot', 3),
    );
    const cmd = command(state, 'ClaimLoot', {
      outcomeId: 'battle-outcome',
      itemQuantities: [{ itemId: 'loot-rations', quantity: 2 }],
      toContainerId: 'fixture-supply',
      accessEvidenceId: 'loot-access',
      claimAuthorizationId: 'claim-proof',
    });
    const proof: PhysicalEvidence = {
      ...physicalScope(state, 'claim-proof'),
      kind: 'LOOT_AUTHORIZATION',
      outcomeId: 'battle-outcome',
      itemIds: ['loot-rations'],
      fromContainerIds: ['loot'],
      ownerAfter: { kind: 'COMPANY', id: 'company' },
    };
    const access = itemAccess(
      state,
      'loot-access',
      'LOOT',
      ['loot', 'fixture-supply'],
      ['loot-rations'],
    );
    const absent = prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [access]));
    expect(absent.kind).toBe('REJECTED');
    expect(absent.state).toBe(state);
    const remote = {
      ...state,
      physical: {
        ...state.physical!,
        containers: state.physical!.containers.map((c) =>
          c.containerId === 'loot' ? { ...c, location: { ...place, areaId: 'other-room' } } : c,
        ),
      },
    };
    const refused = prepareCompanyEconomy(
      remote,
      cmd,
      context(remote, cmd, [], [], [access, proof]),
    );
    expect(refused).toMatchObject({ kind: 'REJECTED', error: 'CONTACT_OR_ACCESS_REQUIRED' });
    expect(refused.state).toBe(remote);
    const claimed = prepared(
      prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [access, proof])),
    ).next;
    const descendants = claimed.physical!.items.filter(
      (i) => i.itemId === 'loot-rations' || i.provenance.parentItemId === 'loot-rations',
    );
    expect(descendants.reduce((n, i) => n + i.quantity, 0)).toBe(3);
    expect(descendants.find((i) => i.itemId === 'loot-rations')?.owner).toEqual({
      kind: 'WORLD',
      id: 'world',
    });
    expect(descendants.find((i) => i.itemId !== 'loot-rations')).toMatchObject({
      quantity: 2,
      owner: { kind: 'COMPANY', id: 'company' },
    });
    expect(prepared(prepareCompanyEconomy(claimed, cmd, context(claimed, cmd))).next).toBe(claimed);
    const reuse = command(
      claimed,
      'ClaimLoot',
      {
        ...(cmd.payload as object),
        outcomeId: 'battle-outcome',
        itemQuantities: [{ itemId: 'loot-rations', quantity: 1 }],
        toContainerId: 'fixture-supply',
        accessEvidenceId: 'loot-access',
        claimAuthorizationId: 'claim-proof-alias',
      },
      'different-loot-request',
    );
    const reused = prepareCompanyEconomy(
      claimed,
      reuse,
      context(
        claimed,
        reuse,
        [],
        [],
        [
          { ...access, revision: claimed.lifecycle.revision },
          { ...proof, id: 'claim-proof-alias', revision: claimed.lifecycle.revision },
        ],
      ),
    );
    expect(reused).toMatchObject({ kind: 'REJECTED', error: 'IDEMPOTENCY_CONFLICT' });
    expect(reused.state).toBe(claimed);
    const retire = command(
      claimed,
      'ApplyContainerLifecycle',
      {
        receiptId: 'destroy-loot',
        containerId: 'loot',
        causeId: 'verified-fire',
        notBefore: '0',
        disposition: 'DESTROY_WITH_CAUSE',
      },
      'fire',
      'WORLD_RECEIPT',
    );
    const fact: PhysicalEvidence = {
      ...physicalScope(claimed, 'destroy-loot'),
      sourceEventId: retire.sourceEventId,
      kind: 'CONTAINER_DISPOSITION',
      containerId: 'loot',
      causeId: 'verified-fire',
      notBefore: tick(0),
      disposition: 'DESTROY_WITH_CAUSE',
    };
    const closed = prepared(
      prepareCompanyEconomy(claimed, retire, context(claimed, retire, [], [], [fact])),
    ).next;
    expect(closed.physical!.items.find((i) => i.itemId === 'loot-rations')).toMatchObject({
      quantity: 1,
      containerId: null,
      tombstone: { sourceId: fact.sourceEventId, causeId: 'verified-fire' },
    });
    expect(
      closed.physical!.containers.find((c) => c.containerId === 'loot')?.closed,
    ).not.toBeNull();
    expect(projectCompanyPhysical(closed, 'company')).toEqual(
      projectCompanyPhysical(claimed, 'company'),
    );
    expect(prepared(prepareCompanyEconomy(closed, retire, context(closed, retire))).next).toBe(
      closed,
    );
  });

  it('P2: company supply and personal packs share the same party transport allowance', () => {
    let state = economy([1n], 10n, 0);
    for (const id of ['leader', 'worker-0']) {
      state = addContainer(
        state,
        container(`pack-${id}`, { kind: 'CHARACTER', id }, 30000, { kind: 'CHARACTER', id }),
      );
      state = addItem(
        state,
        item(`load-${id}`, 'ration', { kind: 'CHARACTER', id }, `pack-${id}`, 30),
      );
    }
    state = addContainer(state, {
      ...container('party-cargo', { kind: 'COMPANY', id: 'company' }, 60000, {
        kind: 'PARTY',
        id: 'party',
      }),
      kind: 'PARTY_SUPPLY',
    });
    state = addItem(
      state,
      item('shared-load', 'ration', { kind: 'COMPANY', id: 'company' }, 'party-cargo', 60),
    );
    const cmd = command(state, 'TransferItem', {
      itemId: 'fixture-rations-0',
      quantity: 1,
      fromContainerId: 'fixture-supply',
      toContainerId: 'party-cargo',
      accessEvidenceId: 'add-shared-load',
    });
    const fact = itemAccess(
      state,
      'add-shared-load',
      'TRANSFER',
      ['fixture-supply', 'party-cargo'],
      ['fixture-rations-0'],
    );
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact]));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'CAPACITY' });
    expect(result.state).toBe(state);
  });

  it('P1/P8: a partial gift authorization cannot be spent again with a fresh command source', () => {
    let state = addContainer(
      economy([], 10n, 0),
      container('gift-store', { kind: 'COMPANY', id: 'company' }, 30000),
    );
    state = addItem(
      state,
      item('gift-stack', 'ration', { kind: 'COMPANY', id: 'company' }, 'fixture-supply', 3),
    );
    const payload = {
      itemId: 'gift-stack',
      quantity: 1,
      fromContainerId: 'fixture-supply',
      toContainerId: 'gift-store',
      accessEvidenceId: 'gift-access',
      ownershipReceiptId: 'gift-proof',
    };
    const first = command(state, 'TransferItem', payload, 'first-gift');
    const access = itemAccess(
      state,
      'gift-access',
      'TRANSFER',
      ['fixture-supply', 'gift-store'],
      ['gift-stack'],
    );
    const fact: PhysicalEvidence = {
      ...physicalScope(state, 'gift-proof'),
      kind: 'OWNERSHIP_AUTHORIZATION',
      itemId: 'gift-stack',
      quantity: 1,
      fromOwner: { kind: 'COMPANY', id: 'company' },
      toOwner: { kind: 'CHARACTER', id: 'leader' },
      operation: 'GIFT',
    };
    const next = prepared(
      prepareCompanyEconomy(state, first, context(state, first, [], [], [access, fact])),
    ).next;
    const retry = command(next, 'TransferItem', payload, 'same-gift-redelivery');
    expect(prepared(prepareCompanyEconomy(next, retry, context(next, retry))).next).toBe(next);
    const second = command(
      next,
      'TransferItem',
      { ...payload, ownershipReceiptId: 'gift-proof-alias' },
      'second-gift',
    );
    const result = prepareCompanyEconomy(
      next,
      second,
      context(
        next,
        second,
        [],
        [],
        [
          { ...access, revision: next.lifecycle.revision },
          { ...fact, id: 'gift-proof-alias', revision: next.lifecycle.revision },
        ],
      ),
    );
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'IDEMPOTENCY_CONFLICT' });
    expect(result.state).toBe(next);
    expect(next.physical!.items.find((i) => i.itemId === 'gift-stack')?.quantity).toBe(2);
  });

  it('P1/P2/P8: container retirement cannot teleport stock or use another primary source', () => {
    const state = addContainer(economy([], 10n, 0), {
      ...container('remote-store', { kind: 'COMPANY', id: 'company' }, 200000),
      location: { ...place, areaId: 'remote-room' },
    });
    const cmd = command(
      state,
      'ApplyContainerLifecycle',
      {
        receiptId: 'retirement-proof',
        containerId: 'fixture-supply',
        causeId: 'move-stock',
        notBefore: '0',
        disposition: 'TRANSFER',
        destinationId: 'remote-store',
      },
      'retirement',
      'WORLD_RECEIPT',
    );
    const fact: PhysicalEvidence = {
      ...physicalScope(state, 'retirement-proof'),
      sourceEventId: cmd.sourceEventId,
      kind: 'CONTAINER_DISPOSITION',
      containerId: 'fixture-supply',
      causeId: 'move-stock',
      notBefore: tick(0),
      disposition: 'TRANSFER',
      destinationId: 'remote-store',
    };
    const refusal = prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact]));
    expect(refusal).toMatchObject({ kind: 'REJECTED', error: 'CONTACT_OR_ACCESS_REQUIRED' });
    expect(refusal.state).toBe(state);
    const local: CompanyEconomyState = {
      ...state,
      physical: {
        ...state.physical!,
        containers: state.physical!.containers.map((c) =>
          c.containerId === 'remote-store' ? { ...c, location: place } : c,
        ),
      },
    };
    const forged = prepareCompanyEconomy(
      local,
      cmd,
      context(local, cmd, [], [], [{ ...fact, sourceEventId: 'unrelated-source' }]),
    );
    expect(forged).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(forged.state).toBe(local);
    const next = prepared(
      prepareCompanyEconomy(local, cmd, context(local, cmd, [], [], [fact])),
    ).next;
    expect(next.physical!.items.every((i) => i.containerId === 'remote-store')).toBe(true);
    expect(
      next.physical!.containers.find((c) => c.containerId === 'fixture-supply')?.closed,
    ).not.toBeNull();
  });

  it('P1/P8: a container cannot transfer its contents to itself and then close over live items', () => {
    const state = economy([], 10n, 0);
    const cmd = command(
      state,
      'ApplyContainerLifecycle',
      {
        receiptId: 'invalid-disposition',
        containerId: 'fixture-supply',
        causeId: 'retirement',
        notBefore: '0',
        disposition: 'TRANSFER',
        destinationId: 'fixture-supply',
      },
      'self-transfer',
      'WORLD_RECEIPT',
    );
    const fact: PhysicalEvidence = {
      ...physicalScope(state, 'invalid-disposition'),
      sourceEventId: cmd.sourceEventId,
      kind: 'CONTAINER_DISPOSITION',
      containerId: 'fixture-supply',
      causeId: 'retirement',
      notBefore: tick(0),
      disposition: 'TRANSFER',
      destinationId: 'fixture-supply',
    };
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact]));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INVALID_ARGUMENT' });
    expect(result.state).toBe(state);
  });

  it('P6/P7/P8: captive transfers move unseized carried property, never title or company membership', () => {
    const shared = equippedWorker();
    const captive = capture(shared);
    const remote = { ...place, siteId: 'prison' };
    const transfer = command(
      captive,
      'TransferCaptive',
      {
        receiptId: 'custody-transfer',
        characterId: 'worker-0',
        fromCustodianId: 'world',
        toCustodianId: 'provider',
        locationRef: remote,
        exchangeProofId: 'exchange',
      },
      'transfer-captive',
      'OUTCOME_RECEIPT',
    );
    const proof: PhysicalEvidence = {
      ...physicalScope(captive, 'exchange'),
      sourceEventId: transfer.sourceEventId,
      kind: 'CAPTIVE_TRANSFER',
      characterId: 'worker-0',
      fromCustodianId: 'world',
      toCustodian: { kind: 'CHARACTER', id: 'provider' },
      location: remote,
    };
    const moved = prepared(
      prepareCompanyEconomy(captive, transfer, context(captive, transfer, [], [], [proof])),
    ).next;
    expect(moved.physical!.containers.find((c) => c.containerId === 'pack')?.location).toEqual(
      remote,
    );
    expect(moved.physical!.items.find((i) => i.itemId === 'sword')?.owner).toEqual({
      kind: 'CHARACTER',
      id: 'worker-0',
    });
    expect(projectCompanyPhysical(moved, 'company')).toEqual(
      projectCompanyPhysical(shared, 'company'),
    );
    const release = command(
      moved,
      'ReleaseCaptive',
      {
        receiptId: 'release',
        characterId: 'worker-0',
        route: 'RESCUE',
        locationRef: place,
        proofId: 'rescue-proof',
      },
      'release',
      'OUTCOME_RECEIPT',
    );
    const releaseProof: PhysicalEvidence = {
      ...physicalScope(moved, 'rescue-proof'),
      sourceEventId: release.sourceEventId,
      kind: 'RELEASE_OUTCOME',
      characterId: 'worker-0',
      route: 'RESCUE',
      fromCustodian: { kind: 'CHARACTER', id: 'provider' },
      location: place,
    };
    const released = prepared(
      prepareCompanyEconomy(moved, release, context(moved, release, [], [], [releaseProof])),
    ).next;
    expect(released.finance.accounts[1]?.actualPaused).toBe(true);
    expect(released.physical!.containers.find((c) => c.containerId === 'pack')?.location).toEqual(
      place,
    );
    expect(released.lifecycle.characters[1]?.presence.fieldPartyId).toBeNull();
    const resume = command(released, 'ReturnToService', {
      characterId: 'worker-0',
      arrivalEvidenceId: 'real-arrival',
      assignment: 'FIELD',
    });
    const result = prepared(
      prepareCompanyEconomy(
        released,
        resume,
        context(
          released,
          resume,
          [],
          [
            {
              ...scope(released, 'real-arrival'),
              kind: 'ARRIVAL',
              characterId: 'worker-0',
              segmentId: 'return-route',
              from: 'prison',
              location: place,
            },
          ],
        ),
      ),
    ).next;
    expect(result.lifecycle.characters[1]?.presence.fieldPartyId).toBe('party');
    expect(result.finance.accounts[1]?.actualPaused).toBe(false);
    expect(result.lifecycle.memberships[1]?.endedAt).toBeNull();
  });

  it.each(['ALIVE', 'CAPTIVE'] as const)(
    'P6/P8: missing resolution %s requires a due factual outcome and does not resume service',
    (outcome) => {
      const state = missing();
      const cmd = command(
        state,
        'ResolveMissing',
        {
          resolutionId: 'resolution',
          characterId: 'worker-0',
          notBefore: '100',
          outcomeReceiptId: 'missing-proof',
        },
        'resolve-missing',
        'WORLD_RECEIPT',
      );
      const fact: PhysicalEvidence = {
        ...physicalScope(state, 'missing-proof'),
        sourceEventId: cmd.sourceEventId,
        kind: 'MISSING_RESOLUTION',
        characterId: 'worker-0',
        notBefore: tick(100),
        outcome,
        location: place,
        ...(outcome === 'CAPTIVE' ? { custodian: { kind: 'WORLD' as const, id: 'world' } } : {}),
      };
      const earlyCommand = { ...cmd, payload: { ...(cmd.payload as object), notBefore: '101' } };
      const early = prepareCompanyEconomy(
        state,
        earlyCommand,
        context(state, earlyCommand, [], [], [{ ...fact, notBefore: tick(101) }]),
      );
      expect(early.kind).toBe('REJECTED');
      expect(early.state).toBe(state);
      const next = prepared(
        prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact])),
      ).next;
      expect(next.lifecycle.characters[1]?.presence.availability).toBe(
        outcome === 'CAPTIVE' ? 'CAPTIVE' : 'AVAILABLE',
      );
      expect(next.lifecycle.characters[1]?.presence.fieldPartyId).toBeNull();
      expect(next.finance.accounts[1]?.actualPaused).toBe(true);
      expect(next.physical!.containers.some((c) => c.kind === 'CORPSE')).toBe(false);
      expect(prepared(prepareCompanyEconomy(next, cmd, context(next, cmd))).next).toBe(next);
    },
  );

  it('P6/P8: an unrecognized missing outcome cannot default to an alive character', () => {
    const state = missing();
    const cmd = command(
      state,
      'ResolveMissing',
      {
        resolutionId: 'resolution',
        characterId: 'worker-0',
        notBefore: '100',
        outcomeReceiptId: 'missing-proof',
      },
      'unknown-outcome',
      'WORLD_RECEIPT',
    );
    const fact = {
      ...physicalScope(state, 'missing-proof'),
      sourceEventId: cmd.sourceEventId,
      kind: 'MISSING_RESOLUTION',
      characterId: 'worker-0',
      notBefore: tick(100),
      outcome: 'UNKNOWN',
      location: place,
    } as unknown as PhysicalEvidence;
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact]));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(result.state).toBe(state);
  });
});
