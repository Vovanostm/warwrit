import { describe, expect, it } from 'vitest';

import { lookup } from '../i18n/index.js';
import { issuerBuilding, issuerVenue, visitingIssuer } from './contract-visits.js';

describe('T032 quest meeting points', () => {
  it('sends Savva to the Bereznyak elder and labels his source-backed hunt', () => {
    expect(issuerBuilding('ci.m1.not-one-pack.01')).toBe('elder');
    expect(issuerVenue('ci.m1.not-one-pack.01')).toBe('Дом старейшины');
    expect(lookup('contract.ci.m1.not-one-pack.01.title')).toBe('Вожак с рваным ухом');
    expect(lookup('npc.woodland-village-caller.savva-krivonos.01')).toBe(
      'Савва Кривонос, сосед Тихона Бортника',
    );
  });

  it('sends Gordey to the Kamenny Brod watch and shows both sealed scenario findings', () => {
    const instanceId = 'ci.m1.tracks-over-tracks.01';
    expect(issuerBuilding(instanceId)).toBe('watch');
    expect(issuerVenue(instanceId)).toBe('Караульня');
    expect(
      visitingIssuer({ siteId: 'kamenny-brod', building: 'watch' }, instanceId, 'kamenny-brod'),
    ).toBe(true);
    expect(lookup('contract.ci.m1.tracks-over-tracks.01.title')).toBe('Свежие следы на дороге');
    expect(
      lookup('contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.bandits-fresh-traces'),
    ).toContain('подкованные сапоги');
  });
});

import type { OrdinaryContractBoardDto } from '@warwrit/protocol';

import { contractTerrainTargetMarkers } from './contract-visits.js';

const target = {
  mapEdition: 'porechye-atlas-lab-v1',
  xFp: -2548,
  zFp: 1127,
  radiusFp: 128,
};

function board(overrides: Partial<OrdinaryContractBoardDto['contracts'][number]> = {}) {
  const contract: OrdinaryContractBoardDto['contracts'][number] = {
    instanceId: 'ci.m1.man-by-road.01',
    template: 'RESCUE',
    issuerRoleId: 'herbalist',
    issuerLocation: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
    rewardQ: '25000000',
    revision: '0',
    yourRole: 'OWNER',
    helperSlot: 'AVAILABLE',
    state: 'ACTIVE',
    completedByYou: false,
    canAccept: false,
    canReturnCargo: false,
    yourCargo: [],
    canHelp: false,
    canWithdraw: false,
    steps: [
      {
        stepId: 'find-sidor',
        action: 'SEARCH',
        location: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
        terrainTarget: target,
        doneByYou: false,
        blocker: null,
        completes: false,
      },
    ],
    yourCustody: [],
    ...overrides,
  };
  return { schemaVersion: 1 as const, contracts: [contract] };
}

describe('contract terrain targets', () => {
  it('marks the active roadside target once at its authored painted-map point', () => {
    expect(contractTerrainTargetMarkers(board())).toEqual([
      {
        label: 'Человек на обочине',
        mapEdition: 'porechye-atlas-lab-v1',
        xFp: -2548,
        zFp: 1127,
      },
    ]);
  });

  it('hides private, completed, done, and mutually excluded targets', () => {
    const hidden = [
      board({ yourRole: 'NONE' }),
      board({ state: 'COMPLETED' }),
      board({ steps: [{ ...board().contracts[0]!.steps[0]!, doneByYou: true }] }),
      board({ steps: [{ ...board().contracts[0]!.steps[0]!, blocker: 'ALTERNATIVE_CHOSEN' }] }),
    ];
    for (const value of hidden) expect(contractTerrainTargetMarkers(value)).toEqual([]);
  });
});
