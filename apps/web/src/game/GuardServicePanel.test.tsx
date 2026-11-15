// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { CompanySummaryDto, OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';
import { GuardServicePanel } from './GuardServicePanel.js';

const company: CompanySummaryDto = {
  companyId: 'company-one',
  revision: '7',
  companyPresentation: null,
  leaderId: 'leader',
  runStatus: 'ACTIVE',
  characters: [
    {
      characterId: 'leader',
      name: 'Мора',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE',
    },
    {
      characterId: 'worker',
      name: 'Ратибор',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE',
    },
  ],
};
const offer = {
  publicRevision: '7',
  local: true,
  providerName: 'Гордей Лапа' as const,
  offer: {
    offerId: 'guard-service-offer',
    quoteRevision: '7',
    beneficiaryIds: ['leader', 'worker'],
  },
};
let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  vi.unstubAllGlobals();
});

it('shows Gordey’s local terms and sends the exact offered group for explicit entry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'crypto',
    Object.assign(Object.create(crypto), { randomUUID: () => 'service-command' }),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => offer }) as Response),
  );
  const onCommand = vi.fn(async (_request: OrdinaryPlayerCompanyCommandV2Dto) => undefined);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <GuardServicePanel
        company={company}
        busy={false}
        actionPending={false}
        onRetry={() => undefined}
        onCommand={onCommand}
        onRefresh={() => undefined}
      />,
    );
  });
  expect(container.textContent).toContain('служит Гордею');
  await act(async () => {
    [...container!.querySelectorAll('button')]
      .find((button) => button.textContent === 'Принять службу')!
      .click();
  });
  expect(onCommand).toHaveBeenCalledWith({
    schemaVersion: 2,
    commandId: 'service-command',
    expectedPublicRevision: '7',
    type: 'AcceptSafeService',
    payload: {
      offerId: 'guard-service-offer',
      beneficiaryIds: ['leader', 'worker'],
      quoteRevision: '7',
    },
  });
});
