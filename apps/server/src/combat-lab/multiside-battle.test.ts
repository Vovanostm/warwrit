import { describe, expect, it } from 'vitest';
import type { CombatLabBattleConfigV2 } from '@warwrit/protocol';
import {
  createMultisideBattleSetup,
  defaultMultisideBattle,
  isMultisideBattle,
  maximumMultisideBattle,
} from './multiside-battle.js';

type MutableBattle = Omit<CombatLabBattleConfigV2, 'sides' | 'parties' | 'units'> & {
  sides: CombatLabBattleConfigV2['sides'][number][];
  parties: CombatLabBattleConfigV2['parties'][number][];
  units: CombatLabBattleConfigV2['units'][number][];
};
const mutable = (config: CombatLabBattleConfigV2): MutableBattle =>
  structuredClone(config) as MutableBattle;

describe('multiside combat lab configuration', () => {
  it('accepts a full 12+12+12 setup with distinct sides, parties and positions', () => {
    const config = maximumMultisideBattle();
    expect(config.units).toHaveLength(36);
    expect(isMultisideBattle(config)).toBe(true);
  });

  it('adapts all sides, groups, exits and units into a validated schema-3 setup', () => {
    const setup = createMultisideBattleSetup('three-side-lab', maximumMultisideBattle());
    expect(setup.schemaVersion).toBe(3);
    expect(setup.rulesetId).toBe('m1-domain-bridge-v6');
    expect(setup.sides).toHaveLength(3);
    expect(setup.parties).toHaveLength(4);
    expect(setup.units).toHaveLength(36);
    expect(
      setup.units.filter((unit) => unit.sideId === 'north' && unit.partyId === 'player-party-a'),
    ).toHaveLength(6);
  });

  it('rejects a player party above six', () => {
    const copy = mutable(maximumMultisideBattle());
    copy.parties = copy.parties.filter((party) => party.id !== 'player-party-b');
    copy.units = copy.units.map((unit) =>
      unit.partyId === 'player-party-b' ? { ...unit, partyId: 'player-party-a' } : unit,
    );
    expect(isMultisideBattle(copy)).toBe(false);
  });

  it('rejects authored ranks that the V6 campaign bridge cannot execute', () => {
    const copy = mutable(defaultMultisideBattle());
    copy.units = copy.units.map((unit, index) =>
      index === 0 ? { ...unit, skillRanks: { 'shield-brace': 1 } } : unit,
    );
    expect(isMultisideBattle(copy)).toBe(false);
  });

  it('rejects a thirteenth unit on one side', () => {
    const config = maximumMultisideBattle();
    const copy = mutable(config);
    const extra = {
      ...copy.units[0]!,
      id: 'extra-on-north',
      partyId: 'north-hostiles',
      sideId: 'middle',
      position: { q: 9, r: 9 },
    };
    copy.units = [...copy.units, extra];
    expect(isMultisideBattle(copy)).toBe(false);
  });

  it('rejects unknown or cross-side party membership and a fourth side', () => {
    const config = defaultMultisideBattle();
    const unknownParty = mutable(config);
    unknownParty.units[0] = { ...unknownParty.units[0]!, partyId: 'missing' };
    expect(isMultisideBattle(unknownParty)).toBe(false);

    const crossSide = mutable(config);
    crossSide.units[0] = { ...crossSide.units[0]!, sideId: 'opponent' };
    expect(isMultisideBattle(crossSide)).toBe(false);

    const fourthSide = mutable(config);
    fourthSide.sides = [...fourthSide.sides, { id: 'fourth', retreatHexes: [{ q: 7, r: 0 }] }];
    expect(isMultisideBattle(fourthSide)).toBe(false);
  });
});
