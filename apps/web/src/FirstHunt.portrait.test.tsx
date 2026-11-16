// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { FirstHuntReadResponseDto } from '@warwrit/protocol';
import { FirstHunt } from './FirstHunt.js';

const cases = [
  {
    instanceId: 'ci.m1.raider-standard.01',
    issuerId: 'npc.city-watch-contact.kamenny-brod.01',
    filename: 'gordey-lapa-v1.png',
    location: 'kamenny-brod',
    area: 'kamenny-brod-market',
    building: 'watch',
    proofFilename: 'raider-standard-v1.png',
  },
  {
    instanceId: 'ci.m1.wolf-trail.01',
    issuerId: 'npc.woodland-village-caller.bereznyak.01',
    filename: 'tikhon-bortnik-v1.png',
    location: 'bereznyak',
    area: 'bereznyak-green',
    building: 'elder',
    proofFilename: undefined,
  },
  {
    instanceId: 'ci.m1.mill-beast.01',
    issuerId: 'npc.local-warning-keeper.tikhaya-gat.01',
    filename: 'frol-zvonar-v1.png',
    location: 'tikhaya-gat',
    area: 'tikhaya-gat-bank',
    building: 'inn',
    proofFilename: 'beast-claw-v1.png',
  },
] as const;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

async function mount(testCase: (typeof cases)[number], issuerId = testCase.issuerId) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const response: FirstHuntReadResponseDto = {
    schemaVersion: 1,
    publicRevision: '4',
    contract: {
      instanceId: testCase.instanceId,
      definitionEdition: `ct.${testCase.instanceId}`,
      termsDigest: 'a'.repeat(64),
      terms: {
        profileId: `ct.${testCase.instanceId}`,
        issuerId,
        issuerLocation: { siteId: testCase.location, areaId: testCase.area },
        objectiveLocation: { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' },
        rewardQ: '100000000',
        claimPolicy: 'UNIQUE_CURRENT_BEARER',
        maximumHelpers: 1,
      },
      yourRole: 'OWNER',
      knownState: 'ACTIVE',
      yourJoinIntent: false,
      helperSlot: 'AVAILABLE',
      encounterId: null,
      pickupTargets: [],
      yourProof: null,
    },
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response))));
  await act(async () =>
    root?.render(
      <FirstHunt
        scope={{ accountId: 'account', companyId: 'company', instanceId: testCase.instanceId }}
        location={testCase.location}
        visit={{ siteId: testCase.location, building: testCase.building }}
        canVisit
        onVisitIssuer={() => {}}
        onJournal={() => {}}
        onUnauthorized={() => {}}
      />,
    ),
  );
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  host?.remove();
  host = undefined;
  vi.unstubAllGlobals();
});

it.each(cases)('shows the portrait matching $instanceId and issuerId', async (testCase) => {
  await mount(testCase);
  expect(host?.querySelector('.first-hunt-issuer img')?.getAttribute('src')).toContain(
    testCase.filename,
  );
  const proofImage = host?.querySelector('.trophy-proof-target img');
  if (testCase.proofFilename) {
    expect(proofImage?.getAttribute('src')).toContain(testCase.proofFilename);
  } else {
    expect(proofImage).toBeNull();
  }
});

it('does not show a portrait when contract and issuer identities disagree', async () => {
  await mount(cases[1]!, cases[0]!.issuerId);
  expect(host?.querySelector('.first-hunt-issuer img')).toBeNull();
});
