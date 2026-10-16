import * as combat from '@warwrit/game-core';
import type { CombatLabBattleConfig, CombatLabCatalog } from '@warwrit/protocol';

// Provisional lab equipment/stat presets. These are not bestiary abilities or campaign balance.
const profileRows = [
  ['W01', 'Меч + щит', 'sword-shield', 80, 36, 24, 55],
  ['W02', 'Топор + щит', 'raider', 85, 30, 20, 53],
  ['W03', 'Двуручный топор', 'great-weapon', 100, 28, 10, 45],
  ['W04', 'Копьё', 'spear', 75, 20, 18, 60],
  ['W05', 'Лук', 'bow', 65, 12, 12, 65],
  ['W06', 'Нож', 'raider', 60, 8, 25, 78],
  ['W07', 'Молот', 'great-weapon', 95, 42, 12, 43],
  ['W08', 'Арбалет', 'bow', 70, 22, 13, 52],
  ['W09', 'Алебарда', 'spear', 85, 28, 14, 50],
  ['W10', 'Командир', 'sword-shield', 90, 34, 22, 62],
  ['B001', 'Волк', 'raider', 50, 0, 15, 67],
  ['B002', 'Бурый медведь', 'great-weapon', 145, 18, 8, 37],
  ['B003', 'Дикий вепрь', 'raider', 105, 20, 12, 54],
  ['B017', 'Могильный зверь', 'raider', 85, 12, 14, 58],
  ['B019', 'Могильный сторож', 'great-weapon', 110, 40, 10, 42],
  ['B023', 'Висельная тень', 'spear', 70, 0, 23, 63],
  ['B025', 'Камышник', 'spear', 80, 6, 18, 57],
  ['B030', 'Береговая плакальщица', 'spear', 75, 4, 20, 61],
  ['B037', 'Пустоголос', 'raider', 85, 10, 18, 59],
  ['B053', 'Мельничная тварь', 'great-weapon', 130, 24, 12, 47],
] as const;

export const combatLabProfiles = profileRows.map(([id, name, weaponId]) => ({
  id,
  name,
  weaponId,
  kind: id.startsWith('W') ? ('human' as const) : ('creature' as const),
}));

const defaultSkillRanks: Readonly<Record<string, combat.CombatSkillRanks>> = {
  W01: { 'shield-brace': 1 },
  W02: { 'armor-pressure': 1 },
  W03: { 'armor-pressure': 1 },
  W04: { 'reach-thrust': 1 },
  W05: { 'aimed-shot': 1 },
  W06: { 'armor-pressure': 1 },
  W07: { 'armor-pressure': 1 },
  W08: { 'aimed-shot': 1 },
  W09: { 'reach-thrust': 1 },
  W10: { 'shield-brace': 1, rally: 1 },
};

export function defaultSpriteBattle(): CombatLabBattleConfig {
  return {
    version: 1,
    name: 'Старая мельница',
    seed: 20261009,
    map: {
      name: 'Развалины мельницы',
      tiles: Array.from({ length: 165 }, (_, index) => {
        const q = index % 15;
        const r = Math.floor(index / 15);
        return {
          q,
          r,
          height: q >= 10 && r <= 3 ? 1 : 0,
          terrain: q === 6 && r > 1 && r < 9 ? 'mud' : q === 8 && r === 5 ? 'fire' : 'plain',
          blocked: (q === 7 && (r === 3 || r === 7)) || (q === 8 && (r === 2 || r === 8)),
        };
      }),
    },
    units: [
      ...['W01', 'W04', 'W05', 'W02', 'W09', 'W10'].map((profileId, index) => ({
        id: `human-${index + 1}`,
        profileId,
        sideId: 'human' as const,
        // Two columns and three spaced ranks keep full figures readable in the fixed view.
        position: { q: 2 + (index % 2) * 2, r: 2 + Math.floor(index / 2) * 3 },
        skillRanks: { ...defaultSkillRanks[profileId] },
      })),
      ...['B001', 'B001', 'B003', 'B019', 'B053', 'B025'].map((profileId, index) => ({
        id: `opponent-${index + 1}`,
        profileId,
        sideId: 'opponent' as const,
        position: { q: 11 + (index % 2) * 2, r: 2 + Math.floor(index / 2) * 3 },
      })),
    ],
  };
}

export function combatLabCatalog(): CombatLabCatalog {
  return { profiles: combatLabProfiles, defaultBattle: defaultSpriteBattle() };
}

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

/** Exact bounded transport validation before setup allocation or combat mutation. */
export function isCustomBattle(value: unknown): value is CombatLabBattleConfig {
  if (
    !object(value) ||
    !keys(value, ['version', 'name', 'seed', 'map', 'units']) ||
    value['version'] !== 1 ||
    !text(value['name']) ||
    !Number.isSafeInteger(value['seed']) ||
    (value['seed'] as number) < 0 ||
    (value['seed'] as number) > 0xffffffff ||
    !object(value['map']) ||
    !keys(value['map'], ['name', 'tiles']) ||
    !text(value['map']['name']) ||
    !Array.isArray(value['map']['tiles']) ||
    value['map']['tiles'].length !== 165 ||
    !Array.isArray(value['units']) ||
    value['units'].length < 2 ||
    value['units'].length > 12
  )
    return false;
  const tileKeys = new Set<string>();
  const blocked = new Set<string>();
  for (const tile of value['map']['tiles']) {
    if (
      !object(tile) ||
      !keys(tile, ['q', 'r', 'height', 'terrain', 'blocked']) ||
      !coordinate(tile['q'], tile['r']) ||
      ![0, 1, 2].includes(tile['height'] as number) ||
      !['plain', 'mud', 'fire'].includes(tile['terrain'] as string) ||
      typeof tile['blocked'] !== 'boolean'
    )
      return false;
    const key = `${tile['q']},${tile['r']}`;
    if (tileKeys.has(key)) return false;
    tileKeys.add(key);
    if (tile['blocked']) blocked.add(key);
  }
  if (
    ![0, 14].every((q) =>
      Array.from({ length: 11 }, (_, r) => `${q},${r}`).some((key) => !blocked.has(key)),
    )
  )
    return false;
  const ids = new Set<string>();
  const positions = new Set<string>();
  const counts = { human: 0, opponent: 0 };
  for (const unit of value['units']) {
    if (
      !object(unit) ||
      !keys(unit, [
        'id',
        'profileId',
        'sideId',
        'position',
        ...(Object.hasOwn(unit, 'skillRanks') ? ['skillRanks'] : []),
      ]) ||
      (Object.hasOwn(unit, 'skillRanks') &&
        (!object(unit['skillRanks']) ||
          !combat.validateCombatSkillRanks(unit['skillRanks'] as combat.CombatSkillRanks))) ||
      !text(unit['id']) ||
      (unit['id'] as string).length > 64 ||
      ids.has(unit['id'] as string) ||
      !combatLabProfiles.some((profile) => profile.id === unit['profileId']) ||
      (unit['sideId'] !== 'human' && unit['sideId'] !== 'opponent') ||
      !object(unit['position']) ||
      !keys(unit['position'], ['q', 'r']) ||
      !coordinate(unit['position']['q'], unit['position']['r'])
    )
      return false;
    const key = `${unit['position']['q']},${unit['position']['r']}`;
    if (positions.has(key) || blocked.has(key)) return false;
    positions.add(key);
    ids.add(unit['id'] as string);
    counts[unit['sideId']] += 1;
  }
  return (
    counts.human >= 1 &&
    counts.human <= 6 &&
    counts.opponent >= 1 &&
    counts.opponent <= 6 &&
    combat.areBattleSpawnsConnected(
      {
        hexes: value['map']['tiles'] as CombatLabBattleConfig['map']['tiles'],
        blocked: (value['map']['tiles'] as CombatLabBattleConfig['map']['tiles']).filter(
          (tile) => tile.blocked,
        ),
      },
      (value['units'] as CombatLabBattleConfig['units']).map((unit) => unit.position),
    )
  );
}

export function createCustomBattleFixture(id: string, config: CombatLabBattleConfig) {
  combat.invariant(isCustomBattle(config), 'Invalid custom battle');
  const saved = structuredClone(config);
  const input: CombatLabBattleConfig = {
    ...saved,
    units: saved.units.map((unit) => ({
      ...unit,
      skillRanks: { ...(unit.skillRanks ?? defaultSkillRanks[unit.profileId] ?? {}) },
    })),
  };
  const { tiles } = input.map;
  const setup: combat.BattleSetup = {
    schemaVersion: 1,
    rulesetId: 'sprite-prototype-v3',
    battleId: combat.battleId(id),
    seed: input.seed,
    map: {
      hexes: tiles.map(({ q, r }) => combat.hex(q, r)),
      blocked: tiles.filter((tile) => tile.blocked).map(({ q, r }) => combat.hex(q, r)),
      tiles: tiles.map(({ q, r, height, terrain }) => ({ q, r, height, terrain })),
    },
    sides: [
      {
        id: combat.sideId('human'),
        retreatHexes: tiles
          .filter((tile) => tile.q === 0 && !tile.blocked)
          .map(({ q, r }) => combat.hex(q, r)),
      },
      {
        id: combat.sideId('opponent'),
        retreatHexes: tiles
          .filter((tile) => tile.q === 14 && !tile.blocked)
          .map(({ q, r }) => combat.hex(q, r)),
      },
    ],
    units: input.units.map((unit) => {
      const row = profileRows.find((row) => row[0] === unit.profileId);
      combat.invariant(row !== undefined, 'Unknown prototype profile');
      return {
        id: combat.unitId(unit.id),
        sideId: combat.sideId(unit.sideId),
        position: combat.hex(unit.position.q, unit.position.r),
        weaponId: row[2],
        skillRanks: { ...unit.skillRanks },
        trainedMelee: unit.profileId.startsWith('W'),
        moralePolicy: unit.profileId.startsWith('W')
          ? 'human'
          : ['B001', 'B002', 'B003'].includes(unit.profileId)
            ? 'beast'
            : 'steady',
        ...(unit.profileId === 'B053' ? { threatProfile: 'mill-slam' as const } : {}),
        attributes: {
          health: row[3],
          armor: row[4],
          defense: row[5],
          initiative: row[6],
          accuracy: unit.profileId === 'W08' ? 38 : unit.profileId === 'W05' ? 30 : 25,
          stamina: 100,
          morale: unit.profileId === 'W10' ? 100 : 80,
        },
      };
    }),
  };
  return {
    controlledSideId: 'human',
    originalSetup: () => structuredClone(setup),
    start: () => combat.startBattle(setup),
    battle: input,
  };
}
