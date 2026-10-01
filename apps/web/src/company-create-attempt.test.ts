import { expect, it, vi } from 'vitest';

import { getOrCreateCompanyCreateAttempt } from './company-create-attempt.js';

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
