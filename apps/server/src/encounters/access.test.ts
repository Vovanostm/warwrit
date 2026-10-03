import * as combat from '@warwrit/game-core';
import {
  FIRST_HUNT_ALLIED_SLOTS,
  FIRST_HUNT_COMBAT_MAP,
  FIRST_HUNT_HOSTILE_GENESIS,
  FIRST_HUNT_RETREAT_HEXES,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
} from '@warwrit/game-core';
import { describe, expect, it } from 'vitest';

import { toEncounterPublicProjection } from './access.js';
import type { EncounterStoredRow } from './executor.js';

describe('public encounter projection', () => {
  it('publishes deterministic FIRST HUNT board geometry without private setup data', () => {
    const encounterId = 'public-projection-map';
    const alliedSide = combat.sideId('first-hunt-companies');
    const hostileSide = combat.sideId('first-hunt-hostiles');
    const hostile = FIRST_HUNT_HOSTILE_GENESIS[0];
    const alliedPosition = FIRST_HUNT_ALLIED_SLOTS[0];
    if (hostile === undefined || alliedPosition === undefined)
      throw new Error('FIRST HUNT profile units are unavailable');
    const setup: combat.BattleSetupV2 = {
      schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
      battleId: combat.battleId(encounterId),
      rulesetId: M1_DOMAIN_BRIDGE_V2_RULESET_ID,
      seed: 7,
      map: {
        hexes: [...FIRST_HUNT_COMBAT_MAP.hexes].reverse(),
        blocked: FIRST_HUNT_COMBAT_MAP.blocked,
      },
      sides: [
        { id: alliedSide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.allied },
        { id: hostileSide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.hostile },
      ],
      units: [
        {
          id: combat.unitId('test-company-member'),
          sideId: alliedSide,
          position: alliedPosition,
          weaponId: 'sword-shield',
          attributes: {
            health: 60,
            armor: 40,
            stamina: 80,
            initiative: 120,
            accuracy: 22,
            defense: 6,
            morale: 100,
          },
          initialPools: { health: 60, armor: 40, stamina: 80, morale: 100 },
        },
        {
          id: combat.unitId(hostile.entityId),
          sideId: hostileSide,
          position: hostile.position,
          weaponId: hostile.weaponId,
          attributes: hostile.attributes,
          initialPools: hostile.initialPools,
        },
      ],
    };
    const started = combat.startBattleV2(setup);
    const encounter: EncounterStoredRow = {
      id: encounterId,
      schema_version: combat.COMBAT_V2_SCHEMA_VERSION,
      setup,
      state: started.state,
      revision: started.state.revision,
      status: started.state.status,
      activation_id: started.state.activation?.id ?? null,
      activation_epoch: 1,
      deadline_at: null,
      ai_wake_at: null,
    };

    const projection = toEncounterPublicProjection(encounter);

    expect(projection.map).toEqual({
      hexes: setup.map.hexes.toSorted(combat.compareHex),
      blocked: [...setup.map.blocked].toSorted(combat.compareHex),
    });
    expect(Object.keys(projection.map ?? {}).sort()).toEqual(['blocked', 'hexes']);
    expect(Object.keys(projection.units[0] ?? {}).sort()).toEqual([
      'health',
      'id',
      'q',
      'r',
      'sideId',
      'status',
    ]);
    expect(projection).not.toHaveProperty('seed');
    expect(projection).not.toHaveProperty('sides');
    expect(projection).not.toHaveProperty('controllableUnitIds');
    expect(projection).not.toHaveProperty('setup');
  });
});
