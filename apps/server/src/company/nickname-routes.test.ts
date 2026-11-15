import { describe, expect, it } from 'vitest';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';

import { companyNicknamesView } from './nickname-routes.js';

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
});
