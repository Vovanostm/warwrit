import { describe, expect, it, vi } from 'vitest';

import { isFirstHuntReadResponse, type FirstHuntReadResponseDto } from '@warwrit/protocol';
import {
  availableFirstHuntActions,
  createFirstHuntAttempt,
  firstHuntEncounterDiscoveryId,
  firstHuntAttemptKey,
  FIRST_HUNT_ACTIVATION_POLL_DELAYS_MS,
  readFirstHuntCommandResponse,
  readFirstHuntAttempt,
  saveFirstHuntAttempt,
  shouldPollForFirstHuntActivation,
  startFirstHuntActivationPolling,
  type FirstHuntStorage,
} from './first-hunt-attempt.js';
import {
  firstHuntCommandError,
  firstHuntGuidance,
  firstHuntReadyView,
  firstHuntRoleLabel,
  firstHuntStateLabel,
} from './FirstHunt.js';
import {
  canIssueEncounterIntent,
  readEncounterControlGrant,
  readEncounterProjection,
} from './renderer/projection.js';

const offer: FirstHuntReadResponseDto = {
  schemaVersion: 1,
  publicRevision: '3',
  contract: {
    instanceId: 'ci.m1.raider-standard.01',
    definitionEdition: 'first-hunt-runtime-profile-2026-10-01-v1',
    termsDigest: 'a'.repeat(64),
    terms: {
      profileId: 'first-hunt-runtime-profile-2026-10-01-v1',
      issuerId: 'npc.city-watch-contact.kamenny-brod.01',
      issuerLocation: { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' },
      objectiveLocation: { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' },
      rewardQ: '100000000',
      claimPolicy: 'UNIQUE_CURRENT_BEARER',
      maximumHelpers: 1,
    },
    yourRole: 'NONE',
    knownState: 'OFFERED',
    yourJoinIntent: false,
    helperSlot: 'AVAILABLE',
    encounterId: null,
    pickupTargets: [],
    yourProof: null,
  },
};

class MemoryStorage implements FirstHuntStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe('FIRST HUNT browser command attempts', () => {
  it('accepts only the complete public response and rejects extra or private fields', () => {
    expect(
      isFirstHuntReadResponse({ schemaVersion: 1, publicRevision: '3', contract: offer.contract }),
    ).toBe(true);
    expect(
      isFirstHuntReadResponse({
        schemaVersion: 1,
        publicRevision: '3',
        contract: { ...offer.contract, walletBalance: '100000000' },
      }),
    ).toBe(false);
    expect(
      isFirstHuntReadResponse({ ...offer, hiddenHostiles: ['world.raider.old-mill.front.01'] }),
    ).toBe(false);
  });

  it('reuses the exact owner-scoped command body without adding client authority', () => {
    const scope = { accountId: 'account-one', companyId: 'company-one' };
    const storage = new MemoryStorage();
    const attempt = createFirstHuntAttempt({
      scope,
      current: offer,
      commandId: 'accept-once',
      type: 'ACCEPT',
    });
    saveFirstHuntAttempt(storage, attempt);

    const replay = readFirstHuntAttempt(storage, scope);
    expect(replay?.body).toBe(attempt.body);
    expect(JSON.parse(attempt.body)).toEqual({
      schemaVersion: 1,
      commandId: 'accept-once',
      expectedPublicRevision: '3',
      type: 'ACCEPT',
      payload: {
        instanceId: 'ci.m1.raider-standard.01',
        termsDigest: 'a'.repeat(64),
      },
    });
    expect(readFirstHuntAttempt(storage, { ...scope, companyId: 'company-two' })).toBeUndefined();
    expect(storage.getItem(firstHuntAttemptKey(scope))).not.toBeNull();
  });

  it('keeps exact response identity and rejects malformed or private reply fields', () => {
    const accepted = {
      schemaVersion: 1,
      commandId: 'accept-once',
      ok: true,
      receiptId: 'receipt-one',
      publicRevision: '4',
    };
    expect(readFirstHuntCommandResponse(accepted, 'accept-once')).toEqual(accepted);
    expect(readFirstHuntCommandResponse(accepted, 'another-command')).toBeUndefined();
    expect(
      readFirstHuntCommandResponse({ ...accepted, walletBalance: '100000000' }, 'accept-once'),
    ).toBeUndefined();
    expect(
      readFirstHuntCommandResponse(
        {
          schemaVersion: 1,
          commandId: 'accept-once',
          ok: false,
          code: 'PRIVATE_STATE',
          publicRevision: '4',
        },
        'accept-once',
      ),
    ).toBeUndefined();
    expect(
      readFirstHuntCommandResponse(
        {
          schemaVersion: 1,
          commandId: 'accept-once',
          ok: false,
          code: 'STALE_REVISION',
          publicRevision: '4',
        },
        'accept-once',
      ),
    ).toMatchObject({ ok: false, code: 'STALE_REVISION' });
    expect(
      readFirstHuntCommandResponse(
        {
          schemaVersion: 1,
          commandId: 'accept-once',
          ok: false,
          code: 'CAPACITY',
          publicRevision: '4',
        },
        'accept-once',
      ),
    ).toMatchObject({ ok: false, code: 'CAPACITY' });
  });

  it('uses only a server-proposed local destination for proof pickup and retains it for retry', () => {
    const current: FirstHuntReadResponseDto = {
      ...offer,
      contract: {
        ...offer.contract!,
        yourRole: 'OWNER',
        knownState: 'PROOF_AVAILABLE',
        pickupTargets: [
          { containerId: 'owned-pack-7', label: 'Carried container', availableWeightG: '5000' },
        ],
      },
    };
    const contract = current.contract!;
    const actions = availableFirstHuntActions(contract, 'staraya-melnitsa', true);
    expect(actions).toContain('PICKUP');
    expect(availableFirstHuntActions(contract, 'kamenny-brod', true)).not.toContain('PICKUP');
    const storage = new MemoryStorage();
    const attempt = createFirstHuntAttempt({
      scope: { accountId: 'account-one', companyId: 'company-one' },
      current,
      commandId: 'pickup-once',
      type: 'PICKUP',
      containerId: contract.pickupTargets[0]!.containerId,
    });
    saveFirstHuntAttempt(storage, attempt);
    expect(JSON.parse(attempt.body).payload).toEqual({
      instanceId: contract.instanceId,
      toContainerId: 'owned-pack-7',
    });
    expect(
      readFirstHuntAttempt(storage, { accountId: 'account-one', companyId: 'company-one' })?.body,
    ).toBe(attempt.body);
  });

  it('enables contract actions only for the observer role, state, location, and proof custody', () => {
    const contract = offer.contract!;
    expect(availableFirstHuntActions(contract, 'kamenny-brod', false)).toEqual(['ACCEPT']);
    expect(
      availableFirstHuntActions(
        { ...contract, knownState: 'ACTIVE', helperSlot: 'AVAILABLE' },
        'kamenny-brod',
        false,
      ),
    ).toEqual(['HELP']);
    expect(
      availableFirstHuntActions(
        { ...contract, yourRole: 'OWNER', knownState: 'ACTIVE' },
        'staraya-melnitsa',
        false,
      ),
    ).toEqual(['JOIN']);
    expect(
      availableFirstHuntActions(
        { ...contract, yourRole: 'HELPER', knownState: 'ENCOUNTER_ACTIVE' },
        'staraya-melnitsa',
        true,
      ),
    ).toEqual([]);
    expect(
      availableFirstHuntActions(
        {
          ...contract,
          yourRole: 'OWNER',
          knownState: 'PROOF_HELD',
          yourProof: { itemId: 'proof-one', containerId: 'pack-one', redemption: 'UNREDEEMED' },
        },
        'kamenny-brod',
        false,
      ),
    ).toEqual(['PRESENT']);
    expect(
      availableFirstHuntActions(
        {
          ...contract,
          yourRole: 'OWNER',
          knownState: 'SETTLED',
          yourProof: { itemId: 'proof-one', containerId: 'pack-one', redemption: 'REDEEMED' },
        },
        'kamenny-brod',
        false,
      ),
    ).toEqual([]);
  });

  it('tracks paired JOIN activation independently from own JOIN acceptance', () => {
    const helperBeforeHelp = {
      ...offer.contract!,
      knownState: 'ACTIVE' as const,
      helperSlot: 'AVAILABLE' as const,
    };
    expect(availableFirstHuntActions(helperBeforeHelp, 'kamenny-brod', false)).toEqual(['HELP']);

    const helperAfterHelp = {
      ...offer.contract!,
      yourRole: 'HELPER' as const,
      knownState: 'ACTIVE' as const,
      helperSlot: 'OCCUPIED' as const,
    };
    expect(availableFirstHuntActions(helperAfterHelp, 'staraya-melnitsa', false)).toEqual([
      'LEAVE',
      'JOIN',
    ]);
    expect(shouldPollForFirstHuntActivation(helperAfterHelp)).toBe(false);

    const ownerBeforeJoin = {
      ...offer.contract!,
      yourRole: 'OWNER' as const,
      knownState: 'ACTIVE' as const,
      helperSlot: 'OCCUPIED' as const,
    };
    expect(availableFirstHuntActions(ownerBeforeJoin, 'staraya-melnitsa', false)).toEqual(['JOIN']);
    const ownerAfterJoin = {
      ...ownerBeforeJoin,
      yourJoinIntent: true,
    };
    expect(shouldPollForFirstHuntActivation(ownerAfterJoin)).toBe(true);
    expect(firstHuntEncounterDiscoveryId(ownerAfterJoin)).toBeUndefined();
    expect(shouldPollForFirstHuntActivation({ ...ownerAfterJoin, yourJoinIntent: false })).toBe(
      false,
    );
    expect(FIRST_HUNT_ACTIVATION_POLL_DELAYS_MS).toEqual([3000, 6000, 12000, 24000, 30000]);

    const helperAfterJoin = {
      ...helperAfterHelp,
      knownState: 'ENCOUNTER_ACTIVE' as const,
      yourJoinIntent: true,
      encounterId: 'encounter-paired',
    };
    expect(firstHuntEncounterDiscoveryId(helperAfterJoin)).toBe('encounter-paired');
    expect(
      firstHuntEncounterDiscoveryId({ ...ownerAfterJoin, encounterId: 'encounter-paired' }),
    ).toBe('encounter-paired');
    expect(shouldPollForFirstHuntActivation(helperAfterJoin)).toBe(false);
  });

  it('discovers paired JOIN activation after more than a minute and stops polling', async () => {
    vi.useFakeTimers();
    const active: FirstHuntReadResponseDto = {
      ...offer,
      contract: {
        ...offer.contract!,
        yourRole: 'OWNER',
        knownState: 'ACTIVE',
        helperSlot: 'OCCUPIED',
        yourJoinIntent: true,
      },
    };
    const activated: FirstHuntReadResponseDto = {
      ...active,
      contract: {
        ...active.contract!,
        knownState: 'ENCOUNTER_ACTIVE',
        encounterId: 'encounter-paired-late',
      },
    };
    let reads = 0;
    const refresh = vi.fn(async () => (++reads === 5 ? activated : active));
    const onEncounterDiscovered = vi.fn();
    const stop = startFirstHuntActivationPolling({
      initialContract: active.contract!,
      refresh,
      onEncounterDiscovered,
    });

    try {
      await vi.advanceTimersByTimeAsync(75_000);

      expect(refresh).toHaveBeenCalledTimes(5);
      expect(onEncounterDiscovered).toHaveBeenCalledExactlyOnceWith('encounter-paired-late');
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(120_000);
      expect(refresh).toHaveBeenCalledTimes(5);
      expect(onEncounterDiscovered).toHaveBeenCalledExactlyOnceWith('encounter-paired-late');
    } finally {
      stop();
      vi.useRealTimers();
    }
  });

  it('does not overlap refreshes and stays stopped when cleaned up during a read', async () => {
    vi.useFakeTimers();
    const active: FirstHuntReadResponseDto = {
      ...offer,
      contract: {
        ...offer.contract!,
        yourRole: 'OWNER',
        knownState: 'ACTIVE',
        helperSlot: 'OCCUPIED',
        yourJoinIntent: true,
      },
    };
    let finishRead: ((response: FirstHuntReadResponseDto) => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<FirstHuntReadResponseDto>((resolve) => {
          finishRead = resolve;
        }),
    );
    const stop = startFirstHuntActivationPolling({
      initialContract: active.contract!,
      refresh,
      onEncounterDiscovered: vi.fn(),
    });

    try {
      await vi.advanceTimersByTimeAsync(3_000);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);

      stop();
      finishRead!(active);
      await vi.advanceTimersByTimeAsync(120_000);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      stop();
      vi.useRealTimers();
    }
  });

  it('retains server rejection feedback after refresh and does not misstate another company’s proof', () => {
    const rejection = firstHuntCommandError('CAPACITY');
    expect(rejection).toBe('Для всех участников не хватает места в бою.');
    expect(firstHuntCommandError('INCOMPATIBLE_ACTIVITY')).toBe(
      'Состав компании не может сейчас участвовать в этом действии.',
    );
    expect(firstHuntReadyView(offer, undefined, rejection)).toMatchObject({
      status: 'ready',
      error: rejection,
    });
    expect(firstHuntReadyView(offer, undefined, undefined)).not.toHaveProperty('error');

    const heldByOther: NonNullable<FirstHuntReadResponseDto['contract']> = {
      ...offer.contract!,
      yourRole: 'OWNER',
      knownState: 'PROOF_HELD',
      yourProof: null,
    };
    expect(firstHuntRoleLabel('OWNER')).toContain('владелец контракта');
    expect(firstHuntStateLabel(heldByOther)).toBe('трофей удерживается участником');
    expect(firstHuntGuidance(heldByOther, 'kamenny-brod')).toContain(
      'не можете предъявить его от имени другой компании',
    );
    expect(availableFirstHuntActions(heldByOther, 'kamenny-brod', true)).not.toContain('PRESENT');
  });

  it('gates encounter intents on the current authenticated turn grant and strict self AFK fields', () => {
    const projection = {
      version: 1 as const,
      encounterId: 'encounter-one',
      revision: 5,
      status: 'active' as const,
      round: 2,
      activationId: 'activation-one',
      actorUnitId: 'unit-one',
      deadlineAt: '2026-10-01T00:00:00.000Z',
      units: [
        { id: 'unit-one', sideId: 'side-own', q: 0, r: 0, health: 10, status: 'active' as const },
      ],
    };
    const grant = readEncounterControlGrant(
      {
        version: 1,
        encounterId: 'encounter-one',
        revision: 5,
        controllableUnitIds: ['unit-one'],
        selfAfk: true,
        resumeRequestedAfterEpoch: 3,
      },
      'encounter-one',
    );
    expect(grant?.selfAfk).toBe(true);
    expect(grant?.resumeRequestedAfterEpoch).toBe(3);
    expect(canIssueEncounterIntent(projection, grant, 'unit-one')).toBe(false);
    const activeGrant = { ...grant!, selfAfk: false, resumeRequestedAfterEpoch: null };
    expect(canIssueEncounterIntent(projection, activeGrant, 'unit-one')).toBe(true);
    expect(canIssueEncounterIntent(projection, { ...activeGrant, revision: 4 }, 'unit-one')).toBe(
      false,
    );
    expect(canIssueEncounterIntent(projection, activeGrant, 'other-unit')).toBe(false);
    expect(
      readEncounterControlGrant(
        {
          version: 1,
          encounterId: 'encounter-one',
          revision: 5,
          controllableUnitIds: ['unit-one'],
          selfAfk: true,
        },
        'encounter-one',
      ),
    ).toBeUndefined();
    expect(
      readEncounterControlGrant(
        {
          version: 1,
          encounterId: 'encounter-one',
          revision: 5,
          controllableUnitIds: ['unit-one'],
          selfAfk: true,
          resumeRequestedAfterEpoch: null,
          otherAccountAfk: false,
        },
        'encounter-one',
      ),
    ).toBeUndefined();
  });

  it('accepts only the optional detached public map and preserves old projection compatibility', () => {
    const projection = {
      version: 1,
      encounterId: 'encounter-one',
      revision: 5,
      status: 'active',
      round: 2,
      activationId: 'activation-one',
      actorUnitId: 'unit-one',
      deadlineAt: null,
      units: [{ id: 'unit-one', sideId: 'side-own', q: 0, r: 0, health: 10, status: 'active' }],
    };
    expect(readEncounterProjection(projection, 'encounter-one')?.map).toBeUndefined();
    const mapped = readEncounterProjection(
      {
        ...projection,
        map: {
          hexes: [
            { q: -1, r: 0 },
            { q: 0, r: 0 },
          ],
          blocked: [{ q: 0, r: 0 }],
        },
      },
      'encounter-one',
    );
    expect(mapped?.map?.blocked).toEqual([{ q: 0, r: 0 }]);
    expect(
      readEncounterProjection(
        {
          ...projection,
          map: {
            hexes: [
              { q: 0, r: 0 },
              { q: -1, r: 0 },
            ],
            blocked: [],
          },
        },
        'encounter-one',
      ),
    ).toBeUndefined();
    expect(
      readEncounterProjection(
        {
          ...projection,
          map: {
            hexes: [{ q: 0, r: 0 }],
            blocked: [],
            hiddenHostiles: ['unseen'],
          },
        },
        'encounter-one',
      ),
    ).toBeUndefined();
  });
});
