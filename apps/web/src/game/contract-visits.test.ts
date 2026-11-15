import type { OrdinaryContractBoardDto } from '@warwrit/protocol';
import { describe, expect, it } from 'vitest';

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
