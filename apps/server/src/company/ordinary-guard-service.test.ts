import { describe, expect, it } from 'vitest';
import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';
import { ordinaryCommandIntent, ordinaryCommandSucceeded } from './ordinary-command.js';

const ids = {
  partyId: 'party',
  openAgreementId: 'active-service',
  meetingEvidenceId: undefined,
  characterId: undefined,
  siteEligibilityId: undefined,
  accessEvidenceId: undefined,
  careEvidenceId: undefined,
  careDefinitionId: undefined,
  assignmentEvidenceId: undefined,
  assignmentLocationId: undefined,
  assignmentFundingPoolId: undefined,
  offerId: 'server-offer',
  offerRevision: undefined,
};

function accepted(...maintenance: readonly Record<string, unknown>[]) {
  return {
    replayed: false,
    receipt: { requirements: [] },
    next: { finance: { maintenance } },
  } as never;
}

describe('ordinary guard-service adapter', () => {
  it('uses server offer identity, local funding and explicit existing agreement IDs', () => {
    const accept: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'accept-service',
      expectedPublicRevision: '4',
      type: 'AcceptSafeService',
      payload: {
        offerId: 'client-copy',
        beneficiaryIds: ['leader', 'worker'],
        quoteRevision: '4',
      },
    };
    expect(ordinaryCommandIntent(accept, 'company', ids)).toEqual({
      type: 'AcceptSafeService',
      payload: {
        partyId: 'party',
        offerId: 'server-offer',
        beneficiaryIds: ['leader', 'worker'],
        fundingPoolId: 'local',
        quoteRevision: '4',
      },
    });

    const amend: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'amend-service',
      expectedPublicRevision: '5',
      type: 'AmendSafeService',
      payload: {
        agreementId: 'old-service',
        beneficiaryIds: ['leader', 'worker', 'newcomer'],
        quoteRevision: '5',
      },
    };
    expect(ordinaryCommandIntent(amend, 'company', ids)).toEqual({
      type: 'AmendSafeService',
      payload: {
        agreementId: 'old-service',
        beneficiaryIds: ['leader', 'worker', 'newcomer'],
        quoteRevision: '5',
      },
    });

    const end: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'end-service',
      expectedPublicRevision: '6',
      type: 'EndSafeService',
      payload: { agreementId: 'active-service' },
    };
    expect(ordinaryCommandIntent(end, 'company', ids)).toEqual({
      type: 'EndMaintenance',
      payload: { agreementOrCampId: 'active-service', reason: 'LEAVE' },
    });
  });

  it('accepts only complete entry, amended period and explicit exit effects', () => {
    const accept: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'accept-service',
      expectedPublicRevision: '4',
      type: 'AcceptSafeService',
      payload: { offerId: 'offer', beneficiaryIds: ['leader', 'worker'], quoteRevision: '4' },
    };
    expect(
      ordinaryCommandSucceeded(
        accept as never,
        accepted({
          kind: 'SAFE_SERVICE',
          agreementId: 'accepted',
          endedAt: null,
          beneficiaryIds: ['worker', 'leader'],
        }),
        ids,
      ),
    ).toBe(true);
    expect(
      ordinaryCommandSucceeded(
        accept as never,
        accepted({ kind: 'SAFE_SERVICE', agreementId: 'empty', endedAt: null, beneficiaryIds: [] }),
        ids,
      ),
    ).toBe(false);

    const amend: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'amend-service',
      expectedPublicRevision: '5',
      type: 'AmendSafeService',
      payload: {
        agreementId: 'old-service',
        beneficiaryIds: ['leader', 'worker', 'newcomer'],
        quoteRevision: '5',
      },
    };
    expect(
      ordinaryCommandSucceeded(
        amend as never,
        accepted(
          { kind: 'SAFE_SERVICE', agreementId: 'old-service', endedAt: '5' },
          {
            kind: 'SAFE_SERVICE',
            agreementId: 'new-service',
            endedAt: null,
            beneficiaryIds: ['newcomer', 'leader', 'worker'],
          },
        ),
        ids,
      ),
    ).toBe(true);

    const end: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'end-service',
      expectedPublicRevision: '6',
      type: 'EndSafeService',
      payload: { agreementId: 'active-service' },
    };
    expect(
      ordinaryCommandSucceeded(
        end as never,
        accepted({
          kind: 'SAFE_SERVICE',
          agreementId: 'active-service',
          endedAt: '6',
          knownEndedAt: '6',
        }),
        ids,
      ),
    ).toBe(true);
  });
});
