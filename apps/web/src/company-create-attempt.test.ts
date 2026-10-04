import { expect, it, vi } from 'vitest';

import type { CompanyOpeningOptionsResponseDto } from '@warwrit/protocol';

import {
  getOrCreateCompanyCreateAttempt,
  refreshedCompanyCreatePayload,
} from './company-create-attempt.js';

it('renews expired opening IDs without changing the named company or chosen companions', () => {
  const shown: CompanyOpeningOptionsResponseDto['opening'] = {
    candidateSetId: 'old-options',
    companyId: 'old-company',
    origin: { id: 'broken-company', label: 'Origin' },
    culture: { id: 'north', label: 'Culture' },
    homeland: { id: 'severny-dvor', label: 'Homeland' },
    familyStory: { id: 'no-present-kin', label: 'Family' },
    bannerId: 'broken-company',
    leaderDefaults: {
      sex: 'male',
      birthCultureId: 'north',
      birthplaceId: 'severny-dvor',
      originId: 'broken-company',
      speciesId: 'human',
      bornAt: '0',
    },
    startingAssets: { crowns: 900, signingCrowns: 50, rations: 30 },
    candidates: [
      { characterId: 'old-rell', templateId: 'front', name: 'Rell', sex: 'male' },
      { characterId: 'old-mora', templateId: 'reach', name: 'Mora', sex: 'female' },
    ],
    selection: { minCount: 1, maxCount: 2 },
    availability: { allCanonicalPlayerChoicesOpen: false },
  };
  const fresh = {
    ...shown,
    candidateSetId: 'fresh-options',
    companyId: 'fresh-company',
    candidates: [
      { ...shown.candidates[1]!, characterId: 'fresh-mora' },
      { ...shown.candidates[0]!, characterId: 'fresh-rell' },
    ],
  };
  const input = {
    name: ' Ash Company ',
    leaderName: ' Mara ',
    selectedCandidateIds: ['old-rell', 'old-mora'],
  };
  const payload = refreshedCompanyCreatePayload(shown, fresh, input);
  expect(payload).toMatchObject({
    candidateSetId: 'fresh-options',
    selectedCandidateIds: ['fresh-rell', 'fresh-mora'],
    name: 'Ash Company',
    leaderInput: { birthName: 'Mara' },
  });
  expect(() =>
    refreshedCompanyCreatePayload(
      shown,
      {
        ...fresh,
        startingAssets: { ...fresh.startingAssets!, rations: 6 },
      },
      input,
    ),
  ).toThrow('Начальные условия изменились');
  expect(() => refreshedCompanyCreatePayload(shown, { ...fresh, candidates: [] }, input)).toThrow(
    'Список спутников изменился',
  );
});

it('replays the exact company create request after its response is lost', async () => {
  const slot = { current: undefined };
  let nextCommandId = 0;
  const createRequest = vi.fn(() => ({
    schemaVersion: 1 as const,
    commandId: `attempt-${++nextCommandId}`,
    type: 'CreateCompany' as const,
    payload: {
      originId: 'origin-1',
      cultureId: 'culture-1',
      homelandId: 'homeland-1',
      familyStoryId: 'family-1',
      leaderInput: {
        sex: 'female',
        birthCultureId: 'culture-1',
        birthplaceId: 'place-1',
        originId: 'origin-1',
        speciesId: 'human',
        bornAt: '0',
        birthName: 'Mara',
      },
      candidateSetId: 'options-1',
      selectedCandidateIds: ['candidate-1'],
      name: 'Ash Company',
      bannerId: 'server-banner-1',
    },
  }));

  const requestBodies: string[] = [];
  let sends = 0;
  const submit = async () => {
    const request = getOrCreateCompanyCreateAttempt(slot, createRequest);
    requestBodies.push(JSON.stringify(request));
    sends += 1;
    if (sends === 1) throw new Error('response lost after submission');
    return request;
  };

  await expect(submit()).rejects.toThrow('response lost after submission');
  const retryAttempt = await submit();

  expect(requestBodies[1]).toBe(requestBodies[0]);
  expect(retryAttempt.commandId).toBe('attempt-1');
  expect(createRequest).toHaveBeenCalledTimes(1);
});
