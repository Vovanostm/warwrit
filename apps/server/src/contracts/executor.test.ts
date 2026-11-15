import {
  COMPANY_CATALOGUE,
  FIRST_HUNT_ENCOUNTER_LOCATION,
  FIRST_HUNT_PROOF_DEFINITION_ID,
  FIRST_HUNT_PROOF_ID,
  FIRST_HUNT_INSTANCE_ID,
  HUNT_PROFILES,
  createCombatEncounterApplication,
  campaignTick,
  receiveExternalPayment,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import type { FirstHuntCommandDto } from '@warwrit/protocol';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { describe, expect, it } from 'vitest';

import {
  canFirstHuntHelperOptIn,
  canFirstHuntParticipantLeave,
  isFirstHuntTerminalReceiptCurrentOrAncestor,
  isFirstHuntProofCustodian,
  prepareFirstHuntProofPickup,
  prepareOrdinaryHuntProofPresentation,
  resolveFirstHuntTerminalDisposition,
} from './executor.js';
import { issuerProofContainerId, validProofPresentationDelta } from '../company/repository.js';

describe('FIRST HUNT retained participation rights', () => {
  it('rejects late helper opt-in once any durable admission exists', () => {
    expect(canFirstHuntHelperOptIn(false)).toBe(true);
    expect(canFirstHuntHelperOptIn(true)).toBe(false);
  });

  it('keeps leave blocked until the matching terminal effects are acknowledged', () => {
    const pending = {
      terminalRevision: 8,
      effectsSourceId: null,
      effectsAppliedAt: null,
    };
    expect(
      canFirstHuntParticipantLeave({
        admission: pending,
        encounterStatus: 'resolved',
        encounterRevision: 8,
        expectedEffectsSourceId: 'first-hunt-terminal:encounter:8',
      }),
    ).toBe(false);
    expect(
      canFirstHuntParticipantLeave({
        actorRole: 'OWNER',
        allowOwnerWithdrawal: true,
        admission: pending,
        encounterStatus: 'resolved',
        encounterRevision: 8,
        expectedEffectsSourceId: 'first-hunt-terminal:encounter:8',
      }),
    ).toBe(false);
    expect(
      canFirstHuntParticipantLeave({
        actorRole: 'OWNER',
        allowOwnerWithdrawal: true,
        admission: undefined,
        encounterStatus: undefined,
        encounterRevision: undefined,
        expectedEffectsSourceId: undefined,
      }),
    ).toBe(true);
    expect(
      canFirstHuntParticipantLeave({
        actorRole: 'OWNER',
        allowOwnerWithdrawal: false,
        admission: {
          ...pending,
          effectsSourceId: 'first-hunt-terminal:encounter:8',
          effectsAppliedAt: new Date(1),
        },
        encounterStatus: 'resolved',
        encounterRevision: 8,
        expectedEffectsSourceId: 'first-hunt-terminal:encounter:8',
      }),
    ).toBe(false);
    expect(
      canFirstHuntParticipantLeave({
        actorRole: 'OWNER',
        allowOwnerWithdrawal: false,
        admission: undefined,
        encounterStatus: undefined,
        encounterRevision: undefined,
        expectedEffectsSourceId: undefined,
      }),
    ).toBe(false);
    expect(
      canFirstHuntParticipantLeave({
        actorRole: 'NONE',
        allowOwnerWithdrawal: true,
        admission: undefined,
        encounterStatus: undefined,
        encounterRevision: undefined,
        expectedEffectsSourceId: undefined,
      }),
    ).toBe(false);
    expect(
      canFirstHuntParticipantLeave({
        admission: {
          ...pending,
          effectsSourceId: 'first-hunt-terminal:encounter:8',
          effectsAppliedAt: new Date(1),
        },
        encounterStatus: 'resolved',
        encounterRevision: 8,
        expectedEffectsSourceId: 'first-hunt-terminal:encounter:8',
      }),
    ).toBe(true);
    expect(
      canFirstHuntParticipantLeave({
        admission: {
          ...pending,
          effectsSourceId: 'first-hunt-terminal:encounter:8',
          effectsAppliedAt: new Date(1),
        },
        encounterStatus: 'resolved',
        encounterRevision: 7,
        expectedEffectsSourceId: 'first-hunt-terminal:encounter:8',
      }),
    ).toBe(false);
    expect(
      canFirstHuntParticipantLeave({
        admission: pending,
        encounterStatus: 'active',
        encounterRevision: 7,
        expectedEffectsSourceId: undefined,
      }),
    ).toBe(false);
  });

  it('rejects an acknowledgement recorded for a different terminal effect source', () => {
    expect(
      canFirstHuntParticipantLeave({
        admission: {
          terminalRevision: 8,
          effectsSourceId: 'first-hunt-terminal:another-encounter:8',
          effectsAppliedAt: new Date(1),
        },
        encounterStatus: 'resolved',
        encounterRevision: 8,
        expectedEffectsSourceId: 'first-hunt-terminal:encounter:8',
      }),
    ).toBe(false);
  });

  it('replays the acknowledged immutable participants after a helper leaves', () => {
    const effectSourceId = 'first-hunt-terminal:encounter:8';
    expect(
      resolveFirstHuntTerminalDisposition({
        effectsAppliedAt: new Date(1),
        effectsSourceId: effectSourceId,
        requestedSourceId: effectSourceId,
        admittedCompanyIds: ['first-hunt-owner', 'first-hunt-helper'],
        ownerCompanyId: 'first-hunt-owner',
        helperCompanyId: null,
      }),
    ).toBe('REPLAY');
    expect(() =>
      resolveFirstHuntTerminalDisposition({
        effectsAppliedAt: new Date(1),
        effectsSourceId: effectSourceId,
        requestedSourceId: 'first-hunt-terminal:another-encounter:8',
        admittedCompanyIds: ['first-hunt-owner', 'first-hunt-helper'],
        ownerCompanyId: 'first-hunt-owner',
        helperCompanyId: null,
      }),
    ).toThrow('FIRST HUNT terminal effects were acknowledged for another revision');
  });

  it('replays the terminal receipt after a later proof pickup revision', () => {
    const previous = pickupState(2_000);
    const target = 'first-hunt-pickup-test-storage';
    const encounterId = 'first-hunt-pickup-test-encounter';
    const pickedUp = prepareFirstHuntProofPickup({
      previous,
      accountId: 'first-hunt-pickup-test-account',
      request: pickupCommand(target),
      worldId: previous.economy.lifecycle.worldId,
      campaignTick: previous.economy.lifecycle.campaignTick,
      encounterId,
      groundItem: groundProof(previous.economy.lifecycle.worldId, encounterId),
    });
    expect(pickedUp.kind).toBe('PREPARED');
    if (pickedUp.kind !== 'PREPARED') return;

    const terminalRevision = previous.economy.lifecycle.revision;
    const currentRevision = pickedUp.next.economy.lifecycle.revision;
    expect(BigInt(currentRevision)).toBe(BigInt(terminalRevision) + 1n);
    expect(
      isFirstHuntTerminalReceiptCurrentOrAncestor({
        receiptId: 'terminal-receipt',
        expectedReceiptId: 'terminal-receipt',
        commandId: 'terminal-command',
        expectedCommandId: 'terminal-command',
        resultingRevision: terminalRevision,
        currentRevision,
        response: {
          type: 'FIRST_HUNT_TERMINAL',
          commandId: 'terminal-command',
          receiptId: 'terminal-receipt',
          resultingRevision: terminalRevision,
        },
      }),
    ).toBe(true);
    expect(
      isFirstHuntTerminalReceiptCurrentOrAncestor({
        receiptId: 'terminal-receipt',
        expectedReceiptId: 'terminal-receipt',
        commandId: 'terminal-command',
        expectedCommandId: 'terminal-command',
        resultingRevision: currentRevision,
        currentRevision: terminalRevision,
        response: {
          type: 'FIRST_HUNT_TERMINAL',
          commandId: 'terminal-command',
          receiptId: 'terminal-receipt',
          resultingRevision: currentRevision,
        },
      }),
    ).toBe(false);
  });

  it('lets only the actual proof custodian present after leaving the contract', () => {
    const bearerCompanyId = 'first-hunt-helper';
    expect(isFirstHuntProofCustodian(bearerCompanyId, bearerCompanyId)).toBe(true);
    expect(isFirstHuntProofCustodian('foreign-company', bearerCompanyId)).toBe(false);
    expect(isFirstHuntProofCustodian(bearerCompanyId, null)).toBe(false);
  });
});

describe('FIRST HUNT proof pickup preparation', () => {
  it('uses the Company loot reducer to move the unique world proof into local company custody', () => {
    const previous = pickupState(2_000);
    const target = 'first-hunt-pickup-test-storage';
    const encounterId = 'first-hunt-pickup-test-encounter';
    const command = pickupCommand(target);
    const result = prepareFirstHuntProofPickup({
      previous,
      accountId: 'first-hunt-pickup-test-account',
      request: command,
      worldId: previous.economy.lifecycle.worldId,
      campaignTick: previous.economy.lifecycle.campaignTick,
      encounterId,
      groundItem: groundProof(previous.economy.lifecycle.worldId, encounterId),
    });

    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    const physical = result.next.economy.physical;
    const proof = physical?.items.find((item) => item.itemId === FIRST_HUNT_PROOF_ID);
    expect(proof).toMatchObject({
      owner: { kind: 'COMPANY', id: previous.economy.lifecycle.companyId },
      containerId: target,
      quantity: 1,
      tombstone: null,
    });
    expect(
      physical?.containers.some((container) => container.containerId === 'first-hunt-ground-proof'),
    ).toBe(false);
    expect(BigInt(result.next.economy.lifecycle.revision)).toBe(
      BigInt(previous.economy.lifecycle.revision) + 1n,
    );
    expect(BigInt(result.next.economy.lifecycle.knowledge.revision)).toBe(
      BigInt(previous.economy.lifecycle.knowledge.revision) + 1n,
    );
  });

  it('rejects a too-small local container without changing the company root', () => {
    const previous = pickupState(500);
    const target = 'first-hunt-pickup-test-storage';
    const encounterId = 'first-hunt-pickup-test-encounter';
    const result = prepareFirstHuntProofPickup({
      previous,
      accountId: 'first-hunt-pickup-test-account',
      request: pickupCommand(target),
      worldId: previous.economy.lifecycle.worldId,
      campaignTick: previous.economy.lifecycle.campaignTick,
      encounterId,
      groundItem: groundProof(previous.economy.lifecycle.worldId, encounterId),
    });

    expect(result).toEqual({ kind: 'REJECTED', code: 'CAPACITY' });
    expect(
      previous.economy.physical?.items.some((item) => item.itemId === FIRST_HUNT_PROOF_ID),
    ).toBe(false);
  });
});

describe('ordinary hunt proof presentation', () => {
  it('leaves FIRST HUNT on its existing redemption path', () => {
    const profile = HUNT_PROFILES.find((entry) => entry.instanceId === FIRST_HUNT_INSTANCE_ID)!;
    const { previous, sourceId } = ordinaryProofState(profile);
    expect(prepareOrdinaryHuntProofPresentation({ previous, profile, sourceId })).toBeUndefined();
  });

  it('transfers the single proof into issuer custody and validates the exact payment delta', () => {
    const { previous, profile, sourceId } = ordinaryProofState();
    const prepared = prepareOrdinaryHuntProofPresentation({ previous, profile, sourceId });
    expect(prepared).toBeDefined();
    if (!prepared) return;
    expect(prepared.containerId).toBe(
      issuerProofContainerId(previous.economy.lifecycle.worldId, profile.instanceId, sourceId),
    );
    const sourceItem = previous.economy.physical!.items.find(
      (item) => item.itemId === profile.proofId,
    )!;
    const presented = prepared.physical.items.find((item) => item.itemId === profile.proofId)!;
    expect(prepared.physical.items.filter((item) => item.itemId === profile.proofId)).toHaveLength(
      1,
    );
    expect(presented).toMatchObject({
      owner: { kind: 'WORLD', id: previous.economy.lifecycle.worldId },
      containerId: prepared.containerId,
      equipped: null,
      provenance: sourceItem.provenance,
      currentCondition: sourceItem.currentCondition,
      contentRevision: sourceItem.contentRevision,
    });
    expect(
      prepared.physical.items.filter(
        (item) => item.itemId === profile.proofId && item.owner.kind === 'COMPANY',
      ),
    ).toHaveLength(0);
    expect(
      prepared.physical.containers.find(
        (container) => container.containerId === prepared.containerId,
      ),
    ).toMatchObject({
      kind: 'STATIC',
      custodian: { kind: 'WORLD', id: previous.economy.lifecycle.worldId },
      access: 'CUSTODIAN',
      location: { kind: 'AT', ...profile.issuerLocation },
    });

    const receiptId = 'ordinary-proof-presentation-receipt';
    const pool = previous.economy.finance.pools.find((entry) => entry.poolId === 'local')!;
    const finance = receiveExternalPayment(previous.economy.finance, {
      fromWalletId: profile.walletId,
      toWalletId: pool.walletId,
      recipient: { kind: 'COMPANY', id: previous.economy.lifecycle.companyId },
      amountQ: BigInt(profile.rewardQ),
      atTick: campaignTick('10'),
      movementId: `first-hunt-presentation:${receiptId}`,
    });
    const next = readCompanyCombatAggregateState({
      ...previous,
      economy: {
        ...previous.economy,
        finance,
        lifecycle: {
          ...previous.economy.lifecycle,
          revision: (BigInt(previous.economy.lifecycle.revision) + 1n).toString(),
          knowledge: {
            ...previous.economy.lifecycle.knowledge,
            revision: (BigInt(previous.economy.lifecycle.knowledge.revision) + 1n).toString(),
          },
        },
        physical: prepared.physical,
      },
    });
    const transition = {
      operation: 'PRESENT' as const,
      instanceId: profile.instanceId,
      sourceId,
      issuerContainerId: prepared.containerId,
      issuerWalletId: profile.walletId,
      recipientWalletId: pool.walletId,
      rewardQ: profile.rewardQ,
      atTick: '10',
      worldWalletBeforeQ: profile.genesisWalletQ,
      worldRevisionBefore: '0',
    };
    expect(validProofPresentationDelta(previous, next, transition, receiptId, profile)).toBe(true);
    expect(
      validProofPresentationDelta(
        previous,
        next,
        { ...transition, issuerContainerId: 'changed-issuer-container' },
        receiptId,
        profile,
      ),
    ).toBe(false);
    const duplicateRetry = prepareOrdinaryHuntProofPresentation({
      previous: readCompanyCombatAggregateState({
        ...previous,
        economy: { ...previous.economy, physical: prepared.physical },
      }),
      profile,
      sourceId,
    });
    expect(duplicateRetry).toBeUndefined();

    const unrelatedItem = next.economy.physical!.items.find(
      (item) => item.itemId !== profile.proofId,
    );
    expect(unrelatedItem).toBeDefined();
    const tampered = readCompanyCombatAggregateState({
      ...next,
      economy: {
        ...next.economy,
        physical: {
          ...next.economy.physical!,
          items: next.economy.physical!.items.map((item) =>
            item.itemId === unrelatedItem!.itemId
              ? { ...item, currentCondition: Math.max(0, item.currentCondition - 1) }
              : item,
          ),
        },
      },
    });
    expect(validProofPresentationDelta(previous, tampered, transition, receiptId, profile)).toBe(
      false,
    );
  });

  it('presents the not-one-pack leader trophy through the authoritative proof path', () => {
    const profile = HUNT_PROFILES.find((entry) => entry.instanceId === 'ci.m1.not-one-pack.01')!;
    const { previous, sourceId } = ordinaryProofState(profile);
    const prepared = prepareOrdinaryHuntProofPresentation({ previous, profile, sourceId });
    expect(prepared?.physical.items.filter((item) => item.itemId === profile.proofId)).toHaveLength(
      1,
    );
    expect(
      prepared?.physical.containers.find((entry) => entry.containerId === prepared.containerId),
    ).toMatchObject({
      kind: 'STATIC',
      custodian: { kind: 'WORLD', id: previous.economy.lifecycle.worldId },
      location: { kind: 'AT', ...profile.issuerLocation },
    });
  });
});

function pickupState(capacityG: number): CompanyCombatAggregateState {
  const state = createCompanyCombatAggregateFixture().state;
  const lifecycle = state.economy.lifecycle;
  const physical = state.economy.physical;
  if (!physical) throw new Error('Company fixture physical state missing');
  const location = { kind: 'AT' as const, ...FIRST_HUNT_ENCOUNTER_LOCATION };
  const activeCharacters = lifecycle.characters.map((character) => ({
    ...character,
    presence: { ...character.presence, location },
  }));
  const target = {
    containerId: 'first-hunt-pickup-test-storage',
    kind: 'STATIC' as const,
    location,
    custodian: { kind: 'COMPANY' as const, id: lifecycle.companyId },
    carrier: null,
    capacityG,
    access: 'COMPANY' as const,
    closed: null,
  };
  const containers = [
    ...physical.containers.map((container) => ({ ...container, location })),
    target,
  ];
  return readCompanyCombatAggregateState({
    ...state,
    encounter: createCombatEncounterApplication(),
    economy: {
      ...state.economy,
      lifecycle: {
        ...lifecycle,
        characters: activeCharacters,
        parties: lifecycle.parties.map((party) => ({ ...party, location })),
        knowledge: {
          ...lifecycle.knowledge,
          characters: activeCharacters,
        },
      },
      physical: {
        ...physical,
        containers,
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: containers,
        },
      },
    },
  });
}

function ordinaryProofState(
  profile = HUNT_PROFILES.find((entry) => entry.instanceId !== FIRST_HUNT_INSTANCE_ID)!,
) {
  const sourceId = 'encounter:ordinary-proof-test:terminal';
  const state = createCompanyCombatAggregateFixture().state;
  const lifecycle = state.economy.lifecycle;
  const physical = state.economy.physical;
  if (!physical) throw new Error('Company fixture physical state missing');
  const location = { kind: 'AT' as const, ...profile.issuerLocation };
  const characters = lifecycle.characters.map((character) => ({
    ...character,
    presence: { ...character.presence, location },
  }));
  const containers = physical.containers.map((container) => ({ ...container, location }));
  const sourceContainer = {
    containerId: 'ordinary-proof-test-storage',
    kind: 'STATIC' as const,
    location,
    custodian: { kind: 'COMPANY' as const, id: lifecycle.companyId },
    carrier: null,
    capacityG: 10_000,
    access: 'COMPANY' as const,
    closed: null,
  };
  const proof = {
    itemId: profile.proofId,
    definitionId: profile.proofDefinitionId,
    owner: { kind: 'COMPANY' as const, id: lifecycle.companyId },
    containerId: sourceContainer.containerId,
    quantity: 1,
    currentCondition: 10_000,
    maximumCondition: 10_000,
    contentRevision: '0',
    provenance: { sourceId, parentItemId: null, ordinal: 0 },
    equipped: null,
    tombstone: null,
  };
  const previous = readCompanyCombatAggregateState({
    ...state,
    encounter: createCombatEncounterApplication(),
    economy: {
      ...state.economy,
      lifecycle: {
        ...lifecycle,
        characters,
        parties: lifecycle.parties.map((party) => ({ ...party, location })),
        knowledge: { ...lifecycle.knowledge, characters },
      },
      physical: {
        ...physical,
        containers: [...containers, sourceContainer],
        items: [...physical.items, proof],
        knowledge: {
          ...physical.knowledge,
          itemSnapshots: [...physical.knowledge.itemSnapshots, proof],
          containerSnapshots: [...containers, sourceContainer],
        },
      },
    },
  });
  return { previous, profile, sourceId };
}

function pickupCommand(toContainerId: string): Extract<FirstHuntCommandDto, { type: 'PICKUP' }> {
  return {
    schemaVersion: 1,
    commandId: 'first-hunt-pickup-test-command',
    expectedPublicRevision: '0',
    type: 'PICKUP',
    payload: { instanceId: 'ci.m1.raider-standard.01', toContainerId },
  };
}

function groundProof(worldId: string, encounterId: string) {
  const definition = COMPANY_CATALOGUE.items.find(
    (item) => item.id === FIRST_HUNT_PROOF_DEFINITION_ID,
  );
  if (!definition) throw new Error('FIRST HUNT proof definition missing');
  return {
    itemId: FIRST_HUNT_PROOF_ID,
    definitionId: definition.id,
    owner: { kind: 'WORLD' as const, id: worldId },
    containerId: 'first-hunt-ground-proof',
    quantity: 1,
    currentCondition: 10_000,
    maximumCondition: 10_000,
    contentRevision: '0',
    provenance: {
      sourceId: `encounter:${encounterId}:terminal`,
      parentItemId: null,
      ordinal: 0,
    },
    equipped: null,
    tombstone: null,
  };
}
