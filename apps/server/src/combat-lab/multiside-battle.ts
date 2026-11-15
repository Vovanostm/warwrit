import * as combat from '@warwrit/game-core';
import type { CombatLabBattleConfigV2 } from '@warwrit/protocol';
import {
  combatLabProfiles,
  defaultSpriteBattle,
  createCombatLabProfiledUnitSetup,
  validateBattleTiles,
} from './custom-battle.js';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: readonly string[]) =>
  Object.keys(value).length === expected.length &&
  expected.every((key) => Object.hasOwn(value, key));
const text = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 80;
const coordinate = (q: unknown, r: unknown) =>
  Number.isSafeInteger(q) &&
  Number.isSafeInteger(r) &&
  (q as number) >= 0 &&
  (q as number) < 15 &&
  (r as number) >= 0 &&
  (r as number) < 11;

export function defaultMultisideBattle(): CombatLabBattleConfigV2 {
  const legacy = defaultSpriteBattle();
  return {
    version: 2,
    name: legacy.name,
    seed: legacy.seed,
    map: legacy.map,
    sides: [
      {
        id: 'human',
        retreatHexes: legacy.map.tiles
          .filter((tile) => tile.q === 0 && !tile.blocked)
          .map(({ q, r }) => ({ q, r })),
      },
      {
        id: 'opponent',
        retreatHexes: legacy.map.tiles
          .filter((tile) => tile.q === 14 && !tile.blocked)
          .map(({ q, r }) => ({ q, r })),
      },
    ],
    parties: [
      { id: 'human-party', sideId: 'human', kind: 'player', controllerId: 'lab-player' },
      { id: 'opponent-party', sideId: 'opponent', kind: 'npc' },
    ],
    units: legacy.units.map((unit) => ({
      ...unit,
      skillRanks: {},
      partyId: unit.sideId === 'human' ? 'human-party' : 'opponent-party',
    })),
  };
}

export function maximumMultisideBattle(): CombatLabBattleConfigV2 {
  const tiles: CombatLabBattleConfigV2['map']['tiles'] = Array.from(
    { length: 165 },
    (_, index) => ({
      q: index % 15,
      r: Math.floor(index / 15),
      height: 0 as const,
      terrain: 'plain' as const,
      blocked: false,
    }),
  );
  const sides = ['north', 'middle', 'south'];
  const parties: CombatLabBattleConfigV2['parties'][number][] = [
    { id: 'player-party-a', sideId: sides[0]!, kind: 'player', controllerId: 'lab-player' },
    { id: 'player-party-b', sideId: sides[0]!, kind: 'player', controllerId: 'lab-ally' },
    { id: 'north-hostiles', sideId: sides[1]!, kind: 'npc' },
    { id: 'south-hostiles', sideId: sides[2]!, kind: 'npc' },
  ];
  const units: CombatLabBattleConfigV2['units'][number][] = [];
  const profiles = [
    'W01',
    'W04',
    'W05',
    'W02',
    'W09',
    'W10',
    'B001',
    'B003',
    'B019',
    'B053',
    'B025',
    'B002',
  ];
  sides.forEach((sideId, sideIndex) => {
    for (let index = 0; index < 12; index += 1) {
      const id = `side-${sideIndex + 1}-unit-${index + 1}`;
      const partyId =
        sideIndex === 0
          ? index < 6
            ? 'player-party-a'
            : 'player-party-b'
          : `${sideIndex === 1 ? 'north' : 'south'}-hostiles`;
      const positions = [
        { q: 1 + (index % 4), r: 1 + Math.floor(index / 4) * 3 },
        { q: 5 + (index % 4), r: 1 + Math.floor(index / 4) * 3 },
        { q: 10 + (index % 4), r: 1 + Math.floor(index / 4) * 3 },
      ];
      units.push({
        id,
        profileId: profiles[index]!,
        sideId,
        partyId,
        position: positions[sideIndex]!,
        skillRanks: {},
      });
    }
  });
  const retreatHexes = (q: number) =>
    tiles.filter((tile) => tile.q === q).map(({ q: x, r }) => ({ q: x, r }));
  return {
    version: 2,
    name: 'Три стороны',
    seed: 20261115,
    map: { name: 'Открытое поле', tiles },
    sides: sides.map((id, index) => ({
      id,
      retreatHexes: retreatHexes(index === 0 ? 0 : index === 1 ? 7 : 14),
    })),
    parties,
    units,
  };
}

/** Strict bounded validation for the new side/party transport envelope. */
export function isMultisideBattle(value: unknown): value is CombatLabBattleConfigV2 {
  if (
    !object(value) ||
    !keys(value, ['version', 'name', 'seed', 'map', 'sides', 'parties', 'units']) ||
    value['version'] !== 2 ||
    !text(value['name']) ||
    !Number.isSafeInteger(value['seed']) ||
    (value['seed'] as number) < 0 ||
    (value['seed'] as number) > 0xffffffff
  )
    return false;
  const map = value['map'];
  if (
    !object(map) ||
    !keys(map, ['name', 'tiles']) ||
    !text(map['name']) ||
    !Array.isArray(map['tiles']) ||
    map['tiles'].length !== 165
  )
    return false;
  const blocked = validateBattleTiles(map['tiles']);
  if (blocked === null) return false;
  if (
    !Array.isArray(value['sides']) ||
    value['sides'].length < 2 ||
    value['sides'].length > 3 ||
    !Array.isArray(value['parties']) ||
    value['parties'].length < 2 ||
    value['parties'].length > 36 ||
    !Array.isArray(value['units']) ||
    value['units'].length < 2 ||
    value['units'].length > 36
  )
    return false;
  const tileRows = map['tiles'] as CombatLabBattleConfigV2['map']['tiles'];
  const sideIds = new Set<string>();
  for (const side of value['sides']) {
    if (
      !object(side) ||
      !keys(side, ['id', 'retreatHexes']) ||
      !text(side['id']) ||
      (side['id'] as string).length > 64 ||
      sideIds.has(side['id'] as string) ||
      !Array.isArray(side['retreatHexes']) ||
      side['retreatHexes'].length < 1 ||
      side['retreatHexes'].length > 165
    )
      return false;
    const exits = new Set<string>();
    for (const hex of side['retreatHexes']) {
      if (!object(hex) || !keys(hex, ['q', 'r']) || !coordinate(hex['q'], hex['r'])) return false;
      const key = `${hex['q']},${hex['r']}`;
      if (blocked.has(key) || exits.has(key)) return false;
      exits.add(key);
    }
    sideIds.add(side['id'] as string);
  }
  const partyIds = new Set<string>();
  const parties = new Map<string, { sideId: string; kind: 'player' | 'npc' }>();
  for (const party of value['parties']) {
    if (
      !object(party) ||
      !keys(party, [
        'id',
        'sideId',
        'kind',
        ...(Object.hasOwn(party, 'controllerId') ? ['controllerId'] : []),
      ]) ||
      !text(party['id']) ||
      (party['id'] as string).length > 64 ||
      partyIds.has(party['id'] as string) ||
      !text(party['sideId']) ||
      !sideIds.has(party['sideId'] as string) ||
      (party['kind'] !== 'player' && party['kind'] !== 'npc')
    )
      return false;
    if (
      (party['kind'] === 'player' || Object.hasOwn(party, 'controllerId')) &&
      (!text(party['controllerId']) || (party['controllerId'] as string).length > 64)
    )
      return false;
    partyIds.add(party['id'] as string);
    parties.set(party['id'] as string, { sideId: party['sideId'] as string, kind: party['kind'] });
  }
  const unitIds = new Set<string>();
  const positions = new Set<string>();
  const sideCounts = new Map<string, number>();
  const partyCounts = new Map<string, number>();
  for (const unit of value['units']) {
    if (
      !object(unit) ||
      !keys(unit, [
        'id',
        'profileId',
        'sideId',
        'partyId',
        'position',
        ...(Object.hasOwn(unit, 'skillRanks') ? ['skillRanks'] : []),
      ]) ||
      !text(unit['id']) ||
      (unit['id'] as string).length > 64 ||
      unitIds.has(unit['id'] as string) ||
      !combatLabProfiles.some((profile) => profile.id === unit['profileId']) ||
      !text(unit['sideId']) ||
      !sideIds.has(unit['sideId'] as string) ||
      !text(unit['partyId']) ||
      !parties.has(unit['partyId'] as string) ||
      parties.get(unit['partyId'] as string)!.sideId !== unit['sideId'] ||
      !object(unit['position']) ||
      !keys(unit['position'], ['q', 'r']) ||
      !coordinate(unit['position']['q'], unit['position']['r']) ||
      (Object.hasOwn(unit, 'skillRanks') &&
        (!object(unit['skillRanks']) || Object.keys(unit['skillRanks']).length !== 0))
    )
      return false;
    const positionKey = `${unit['position']['q']},${unit['position']['r']}`;
    if (blocked.has(positionKey) || positions.has(positionKey)) return false;
    positions.add(positionKey);
    unitIds.add(unit['id'] as string);
    sideCounts.set(unit['sideId'] as string, (sideCounts.get(unit['sideId'] as string) ?? 0) + 1);
    partyCounts.set(
      unit['partyId'] as string,
      (partyCounts.get(unit['partyId'] as string) ?? 0) + 1,
    );
  }
  if ([...sideIds].some((id) => (sideCounts.get(id) ?? 0) < 1 || sideCounts.get(id)! > 12))
    return false;
  if (
    [...parties.keys()].some(
      (id) =>
        (partyCounts.get(id) ?? 0) < 1 ||
        (parties.get(id)!.kind === 'player' && partyCounts.get(id)! > 6),
    )
  )
    return false;
  return combat.areBattleSpawnsConnected(
    { hexes: tileRows, blocked: tileRows.filter((tile) => tile.blocked) },
    (value['units'] as CombatLabBattleConfigV2['units']).map((unit) => unit.position),
  );
}

export function createMultisideBattleSetup(
  id: string,
  config: CombatLabBattleConfigV2,
): combat.BattleSetupV3 {
  combat.invariant(isMultisideBattle(config), 'Invalid multiside battle');
  const tiles = config.map.tiles;
  const setup: combat.BattleSetupV3 = {
    schemaVersion: combat.COMBAT_V3_SCHEMA_VERSION,
    rulesetId: combat.M1_DOMAIN_BRIDGE_V6_RULESET_ID,
    battleId: combat.battleId(id),
    seed: config.seed,
    map: {
      hexes: tiles.map(({ q, r }) => combat.hex(q, r)),
      blocked: tiles.filter((tile) => tile.blocked).map(({ q, r }) => combat.hex(q, r)),
      tiles: tiles.map(({ q, r, height, terrain }) => ({ q, r, height, terrain })),
    },
    sides: config.sides.map((side) => ({
      id: combat.sideId(side.id),
      retreatHexes: side.retreatHexes.map(({ q, r }) => combat.hex(q, r)),
    })),
    parties: config.parties.map(({ id: partyId, sideId, kind, controllerId }) => ({
      id: partyId,
      sideId: combat.sideId(sideId),
      kind,
      ...(controllerId ? { controllerId } : {}),
    })),
    units: config.units.map((unit) => ({
      ...createCombatLabProfiledUnitSetup(unit),
      partyId: unit.partyId,
    })),
  };
  return combat.validateBattleSetupV3(setup);
}
