import type {
  CombatLabBattleConfig,
  CombatLabCatalog,
  CombatLabHex,
  CombatLabTile,
  CombatLabCustomUnit,
} from '@warwrit/protocol';

export const editorSkills = [
  ['shield-brace', 'Упор щитом'],
  ['armor-pressure', 'Удар по броне'],
  ['reach-thrust', 'Дальний укол'],
  ['aimed-shot', 'Прицельный выстрел'],
  ['rally', 'Собраться'],
] as const;

const EDITOR_MAP_WIDTH = 15;
const EDITOR_MAP_HEIGHT = 11;
const EDITOR_SIDE_LIMIT = 6;
const EDITOR_SEED_MAX = 0xffff_ffff;

export type CombatLabMapDraft = Readonly<{
  version: 1;
  name: string;
  tiles: readonly CombatLabTile[];
}>;

export type TilePatch = Partial<Pick<CombatLabTile, 'height' | 'terrain' | 'blocked'>>;

const key = ({ q, r }: CombatLabHex) => `${q},${r}`;

function isEditorHex(value: unknown): value is CombatLabHex {
  if (value === null || typeof value !== 'object') return false;
  const hex = value as Record<string, unknown>;
  return (
    Number.isInteger(hex['q']) &&
    Number.isInteger(hex['r']) &&
    (hex['q'] as number) >= 0 &&
    (hex['q'] as number) < EDITOR_MAP_WIDTH &&
    (hex['r'] as number) >= 0 &&
    (hex['r'] as number) < EDITOR_MAP_HEIGHT
  );
}

export function createEmptyTiles(): CombatLabTile[] {
  return Array.from({ length: EDITOR_MAP_WIDTH * EDITOR_MAP_HEIGHT }, (_, index) => ({
    q: index % EDITOR_MAP_WIDTH,
    r: Math.floor(index / EDITOR_MAP_WIDTH),
    height: 0,
    terrain: 'plain',
    blocked: false,
  }));
}

export function paintBattleTile(
  tiles: readonly CombatLabTile[],
  hex: CombatLabHex,
  patch: TilePatch,
): CombatLabTile[] {
  if (!isEditorHex(hex)) return [...tiles];
  return tiles.map((tile) => (tile.q === hex.q && tile.r === hex.r ? { ...tile, ...patch } : tile));
}

export function placeBattleUnit(
  units: readonly CombatLabCustomUnit[],
  profileId: string,
  sideId: CombatLabCustomUnit['sideId'],
  position: CombatLabHex,
): CombatLabCustomUnit[] | null {
  if (!isEditorHex(position) || units.some((unit) => key(unit.position) === key(position))) {
    return null;
  }
  if (units.filter((unit) => unit.sideId === sideId).length >= EDITOR_SIDE_LIMIT) return null;
  const existing = new Set(units.map(({ id }) => id));
  let suffix = 1;
  while (existing.has(`${sideId}-${suffix}`)) suffix += 1;
  return [...units, { id: `${sideId}-${suffix}`, profileId, sideId, position, skillRanks: {} }];
}

export function removeBattleUnit(
  units: readonly CombatLabCustomUnit[],
  id: string,
): CombatLabCustomUnit[] {
  return units.filter((unit) => unit.id !== id);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((property) => Object.hasOwn(value, property))
  );
}

function validateMapContents(name: unknown, tiles: unknown): string[] {
  const errors: string[] = [];
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 80) {
    errors.push('Укажите название карты длиной до 80 символов.');
  }
  if (!Array.isArray(tiles) || tiles.length !== EDITOR_MAP_WIDTH * EDITOR_MAP_HEIGHT) {
    errors.push('Карта должна содержать ровно 165 клеток.');
    return errors;
  }

  const seen = new Set<string>();
  for (const tile of tiles) {
    if (!isObject(tile) || !hasExactKeys(tile, ['q', 'r', 'height', 'terrain', 'blocked'])) {
      errors.push('Каждая клетка должна содержать только q, r, height, terrain и blocked.');
      continue;
    }
    if (!isEditorHex(tile)) {
      errors.push('Координаты каждой клетки должны быть целыми в пределах 15×11.');
      continue;
    }
    const rawTile = tile as Record<string, unknown>;
    const tileKey = key(tile);
    if (seen.has(tileKey)) errors.push(`Клетка ${tileKey} указана дважды.`);
    seen.add(tileKey);
    if (![0, 1, 2].includes(rawTile['height'] as number))
      errors.push(`Высота ${tileKey}: только 0, 1 или 2.`);
    if (!['plain', 'mud', 'fire'].includes(rawTile['terrain'] as string)) {
      errors.push(`Поверхность ${tileKey}: plain, mud или fire.`);
    }
    if (typeof rawTile['blocked'] !== 'boolean')
      errors.push(`Препятствие ${tileKey}: требуется true или false.`);
  }
  if (seen.size !== EDITOR_MAP_WIDTH * EDITOR_MAP_HEIGHT) {
    errors.push('В карте должны быть все клетки поля 15×11 без пропусков.');
  }
  return [...new Set(errors)];
}

export function validateMapDraft(value: unknown): string[] {
  if (!isObject(value)) return ['Карта должна быть JSON-объектом.'];
  const errors = hasExactKeys(value, ['version', 'name', 'tiles'])
    ? []
    : ['Файл карты должен содержать только version, name и tiles.'];
  if (value['version'] !== 1) errors.push('Версия карты должна быть 1.');
  return [...errors, ...validateMapContents(value['name'], value['tiles'])];
}

export function validateBattleDraft(value: unknown, catalog: CombatLabCatalog): string[] {
  const errors: string[] = [];
  if (!isObject(value)) return ['Черновик боя должен быть JSON-объектом.'];
  if (!hasExactKeys(value, ['version', 'name', 'seed', 'map', 'units'])) {
    errors.push('Бой должен содержать только version, name, seed, map и units.');
  }
  if (value['version'] !== 1) errors.push('Версия боя должна быть 1.');
  if (
    typeof value['name'] !== 'string' ||
    value['name'].trim().length === 0 ||
    value['name'].length > 80
  ) {
    errors.push('Укажите название боя длиной до 80 символов.');
  }
  if (
    !Number.isSafeInteger(value['seed']) ||
    (value['seed'] as number) < 0 ||
    (value['seed'] as number) > EDITOR_SEED_MAX
  ) {
    errors.push(`Seed должен быть целым числом от 0 до ${EDITOR_SEED_MAX}.`);
  }
  const rawMap = isObject(value['map']) ? value['map'] : null;
  if (rawMap === null) errors.push('Не задана карта боя.');
  else {
    if (!hasExactKeys(rawMap, ['name', 'tiles'])) {
      errors.push('Карта боя должна содержать только name и tiles.');
    }
    errors.push(...validateMapContents(rawMap['name'], rawMap['tiles']));
  }

  if (!Array.isArray(value['units'])) {
    errors.push('Состав боя должен быть списком бойцов.');
    return [...new Set(errors)];
  }
  const allowedProfiles = new Set(catalog.profiles.map(({ id }) => id));
  const ids = new Set<string>();
  const occupied = new Set<string>();
  const counts = { human: 0, opponent: 0 };
  const blocked = new Set<string>();
  if (rawMap !== null && Array.isArray(rawMap['tiles'])) {
    for (const tile of rawMap['tiles']) {
      if (
        isObject(tile) &&
        isEditorHex(tile) &&
        (tile as Record<string, unknown>)['blocked'] === true
      )
        blocked.add(key(tile));
    }
  }
  for (const unit of value['units']) {
    if (
      !isObject(unit) ||
      !hasExactKeys(unit, [
        'id',
        'profileId',
        'sideId',
        'position',
        ...(Object.hasOwn(unit, 'skillRanks') ? ['skillRanks'] : []),
      ])
    ) {
      errors.push(
        'Боец должен содержать id, profileId, sideId, position и необязательные skillRanks.',
      );
      continue;
    }
    const rawUnit = unit as Record<string, unknown>;
    if (Object.hasOwn(rawUnit, 'skillRanks')) {
      const ranks = rawUnit['skillRanks'];
      if (
        !isObject(ranks) ||
        Object.entries(ranks).some(
          ([id, rank]) =>
            !editorSkills.some(([skillId]) => skillId === id) ||
            ![1, 2, 3].includes(rank as number),
        )
      )
        errors.push(
          `Приёмы бойца ${String(rawUnit['id'])}: допустимы изученные ранги 1–3 известных приёмов.`,
        );
    }

    if (
      typeof rawUnit['id'] !== 'string' ||
      rawUnit['id'].trim().length === 0 ||
      rawUnit['id'].length > 64
    ) {
      errors.push('У каждого бойца должен быть уникальный ID длиной до 64 символов.');
    } else if (ids.has(rawUnit['id'])) errors.push(`ID бойца ${rawUnit['id']} повторяется.`);
    else ids.add(rawUnit['id']);
    if (typeof rawUnit['profileId'] !== 'string' || !allowedProfiles.has(rawUnit['profileId'])) {
      errors.push(`Профиль бойца ${String(rawUnit['id'])} отсутствует в каталоге.`);
    }
    if (rawUnit['sideId'] !== 'human' && rawUnit['sideId'] !== 'opponent') {
      errors.push(`Сторона бойца ${String(rawUnit['id'])} должна быть human или opponent.`);
    } else counts[rawUnit['sideId']] += 1;
    if (!isObject(rawUnit['position']) || !hasExactKeys(rawUnit['position'], ['q', 'r'])) {
      errors.push(`Позиция бойца ${String(rawUnit['id'])} должна содержать только q и r.`);
      continue;
    }
    if (!isEditorHex(rawUnit['position'])) {
      errors.push(`Позиция бойца ${String(rawUnit['id'])} должна быть целой внутри поля 15×11.`);
      continue;
    }
    const positionKey = key(rawUnit['position']);
    if (occupied.has(positionKey)) errors.push(`Клетка ${positionKey} занята несколькими бойцами.`);
    occupied.add(positionKey);
    if (blocked.has(positionKey))
      errors.push(`Боец ${String(rawUnit['id'])} стоит на препятствии ${positionKey}.`);
  }
  if (counts.human < 1 || counts.human > EDITOR_SIDE_LIMIT) {
    errors.push(`Стороне human нужно от 1 до ${EDITOR_SIDE_LIMIT} бойцов.`);
  }
  if (counts.opponent < 1 || counts.opponent > EDITOR_SIDE_LIMIT) {
    errors.push(`Стороне opponent нужно от 1 до ${EDITOR_SIDE_LIMIT} бойцов.`);
  }
  if (rawMap !== null && Array.isArray(rawMap['tiles'])) {
    const openEdges = new Set<string>();
    for (const tile of rawMap['tiles']) {
      if (!isObject(tile) || !isEditorHex(tile)) continue;
      const rawTile = tile as Record<string, unknown>;
      if (rawTile['blocked'] !== true && (tile.q === 0 || tile.q === EDITOR_MAP_WIDTH - 1)) {
        openEdges.add(String(tile.q));
      }
    }
    if (!openEdges.has('0'))
      errors.push('На краю q=0 нужна хотя бы одна свободная клетка для отхода.');
    if (!openEdges.has(String(EDITOR_MAP_WIDTH - 1))) {
      errors.push(
        `На краю q=${EDITOR_MAP_WIDTH - 1} нужна хотя бы одна свободная клетка для отхода.`,
      );
    }
  }
  // Connectivity and combat admission are validated by the server's canonical core.
  return [...new Set(errors)];
}

export function toMapDraft(battle: CombatLabBattleConfig): CombatLabMapDraft {
  return { version: 1, name: battle.map.name, tiles: battle.map.tiles };
}
