import {
  COMPANY_CATALOGUE,
  FIRST_HUNT_ENCOUNTER_LOCATION,
  FIRST_HUNT_PROOF_DEFINITION_ID,
  FIRST_HUNT_PROOF_ID,
  createCombatEncounterApplication,
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
  resolveFirstHuntTerminalDisposition,
} from './executor.js';

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
