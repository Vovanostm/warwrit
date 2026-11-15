import { describe, expect, it } from 'vitest';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';

import { companyNicknamesView, prepareNicknameResolution } from './nickname-routes.js';
import { proposeResilientNicknames } from './nicknames.js';

describe('company nickname view', () => {
  it('projects only nickname proposals and history the company has observed', () => {
    const state = createCompanyCombatAggregateFixture().state.economy.lifecycle;
    const characterId = state.characters[0]!.identity.characterId;
    const privateProposal = {
      proposalId: 'private-proposal',
      characterId,
      sourceEventId: 'private-source',
      cultureId: 'culture-north',
      deedKind: 'SURVIVED_NEAR_DEATH',
      reasonKey: 'nickname.reason.survived_near_death',
      textKey: 'nickname.resilient',
      proposedAt: state.campaignTick,
      resolution: 'PENDING' as const,
      resolvedAt: null,
    };
    const withPrivateProposal = { ...state, nicknameProposals: [privateProposal] };
    expect(companyNicknamesView(withPrivateProposal, 'another-company')).toBeNull();
    expect(companyNicknamesView(withPrivateProposal, state.companyId)?.pending).toEqual([]);

    const observed = {
      ...withPrivateProposal,
      knowledge: {
        ...withPrivateProposal.knowledge,
        nicknameProposals: [
          {
            proposalId: privateProposal.proposalId,
            characterId,
            sourceEventId: privateProposal.sourceEventId,
            cultureId: privateProposal.cultureId,
            deedKind: privateProposal.deedKind,
            reasonKey: privateProposal.reasonKey,
            textKey: privateProposal.textKey,
            proposedAt: privateProposal.proposedAt,
          },
        ],
        nicknameHistory: [
          {
            proposalId: 'rejected-proposal',
            characterId,
            sourceEventId: 'rejected-source',
            cultureId: 'culture-north',
            deedKind: 'SURVIVED_NEAR_DEATH',
            reasonKey: 'nickname.reason.survived_near_death',
            textKey: 'nickname.resilient',
            proposedAt: state.campaignTick,
            resolution: 'REJECTED' as const,
            decidedAt: state.campaignTick,
          },
        ],
      },
    };
    expect(companyNicknamesView(observed, state.companyId)).toMatchObject({
      companyId: state.companyId,
      pending: [
        {
          proposalId: 'private-proposal',
          characterId,
          characterName: state.characters.find(
            (person) => person.identity.characterId === characterId,
          )?.identity.birthName,
          textKey: 'nickname.resilient',
        },
      ],
      history: [
        {
          proposalId: 'rejected-proposal',
          characterId,
          textKey: 'nickname.resilient',
          resolution: 'REJECTED',
          sourceEventId: 'rejected-source',
        },
      ],
    });
  });

  it('accepts or rejects an observed proposal through the existing lifecycle transition', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const before = fixture.begun.next;
    const participant = fixture.begun.binding.participants[0]!;
    const battle = fixture.begun.binding.initial.state;
    const finalState = {
      ...battle,
      status: 'resolved' as const,
      outcome: { reason: 'last-side-standing' as const, winnerSideId: participant.sideId },
      units: battle.units.map((unit) =>
        unit.id === participant.unitId
          ? { ...unit, health: Math.floor(participant.vitals.maximumHealth / 4) }
          : unit,
      ),
    };
    const proposalState = proposeResilientNicknames({
      before,
      after: before,
      finalState,
      atTick: before.economy.lifecycle.campaignTick,
    }).state;
    const lifecycle = proposalState.economy.lifecycle;
    const proposal = lifecycle.nicknameProposals?.[0];
    if (!proposal) throw new Error('resilient proposal was not prepared');
    const known = {
      proposalId: proposal.proposalId,
      characterId: proposal.characterId,
      sourceEventId: proposal.sourceEventId,
      cultureId: proposal.cultureId,
      deedKind: proposal.deedKind,
      reasonKey: proposal.reasonKey,
      textKey: proposal.textKey,
      proposedAt: proposal.proposedAt,
    };
    const observedState = {
      ...proposalState,
      economy: {
        ...proposalState.economy,
        lifecycle: {
          ...lifecycle,
          knowledge: { ...lifecycle.knowledge, nicknameProposals: [known] },
        },
      },
    };
    const request = (accept: boolean, commandId: string) => ({
      schemaVersion: 1 as const,
      commandId,
      expectedPublicRevision: lifecycle.knowledge.revision,
      proposalId: proposal.proposalId,
      accept,
    });
    const accepted = prepareNicknameResolution({
      state: observedState,
      request: request(true, 'accept-nickname'),
      accountId: 'fixture-owner',
      atTick: lifecycle.campaignTick,
    });
    expect(accepted.kind).toBe('PREPARED');
    if (accepted.kind === 'PREPARED') {
      expect(
        accepted.state.economy.lifecycle.characters.find(
          (character) => character.identity.characterId === proposal.characterId,
        )?.nickname,
      ).toEqual({ proposalId: proposal.proposalId, textKey: 'nickname.resilient' });
      expect(accepted.state.economy.lifecycle.knowledge.nicknameHistory).toMatchObject([
        {
          proposalId: proposal.proposalId,
          textKey: 'nickname.resilient',
          resolution: 'ACCEPTED',
          decidedAt: lifecycle.campaignTick,
        },
      ]);
    }

    const rejected = prepareNicknameResolution({
      state: observedState,
      request: request(false, 'reject-nickname'),
      accountId: 'fixture-owner',
      atTick: lifecycle.campaignTick,
    });
    expect(rejected.kind).toBe('PREPARED');
    if (rejected.kind === 'PREPARED') {
      expect(rejected.state.economy.lifecycle.nicknameProposals?.[0]?.resolution).toBe('REJECTED');
      expect(rejected.state.economy.lifecycle.knowledge.nicknameHistory).toMatchObject([
        {
          proposalId: proposal.proposalId,
          resolution: 'REJECTED',
          decidedAt: lifecycle.campaignTick,
        },
      ]);
    }

    const stale = prepareNicknameResolution({
      state: observedState,
      request: { ...request(true, 'stale-nickname'), expectedPublicRevision: '999999' },
      accountId: 'fixture-owner',
      atTick: lifecycle.campaignTick,
    });
    expect(stale.kind).toBe('REJECTED');
  });
});
