import type {
  CombatLabBattleConfig,
  CombatLabCatalog,
  CombatLabCustomUnit,
  CombatLabHex,
  CombatLabTile,
} from '@warwrit/protocol';
import {
  paintBattleTile,
  placeBattleUnit,
  validateBattleDraft,
  validateMapDraft,
} from './editor-model.js';
import type { TilePatch } from './editor-model.js';

export type EditorBrush =
  | 'plain'
  | 'mud'
  | 'fire'
  | 'blocked'
  | 'clear-blocked'
  | 'height-0'
  | 'height-1'
  | 'height-2'
  | 'place';
export type SavedDrafts = Record<string, CombatLabBattleConfig>;
const hexKey = ({ q, r }: CombatLabHex) => `${q},${r}`;

export function parseSavedDrafts(raw: string | null): SavedDrafts {
  if (raw === null) return {};
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as SavedDrafts;
}

export function validSavedDrafts(drafts: SavedDrafts, catalog: CombatLabCatalog): SavedDrafts {
  return Object.fromEntries(
    Object.entries(drafts).filter(([, draft]) => validateBattleDraft(draft, catalog).length === 0),
  );
}

export function editorCellCoordinates(q: string | null, r: string | null): CombatLabHex | null {
  if (q === null || r === null) return null;
  const hex = { q: Number(q), r: Number(r) };
  return Number.isInteger(hex.q) && Number.isInteger(hex.r) ? hex : null;
}

export function canDragPaint(buttons: number, brush: EditorBrush, disabled: boolean): boolean {
  return buttons === 1 && brush !== 'place' && !disabled;
}

function brushPatch(brush: Exclude<EditorBrush, 'place'>): TilePatch {
  if (brush === 'blocked') return { blocked: true };
  if (brush === 'clear-blocked') return { blocked: false };
  if (brush.startsWith('height-'))
    return { height: Number(brush.at(-1)) as CombatLabTile['height'] };
  return { terrain: brush as CombatLabTile['terrain'] };
}

type BrushResult = { readonly patch?: Partial<CombatLabBattleConfig>; readonly notice?: string };

function placeDraftUnit(
  battle: CombatLabBattleConfig,
  hex: CombatLabHex,
  profileId: string,
  sideId: CombatLabCustomUnit['sideId'],
): BrushResult {
  const placed = placeBattleUnit(battle.units, profileId, sideId, hex);
  if (placed === null)
    return {
      notice: 'Нельзя поставить бойца: клетка занята или сторона уже набрала 6 участников.',
    };
  const added = placed[placed.length - 1]!;
  return { patch: { units: placed }, notice: `Боец ${added.id} размещён на ${hexKey(hex)}.` };
}

export function applyEditorBrush(
  battle: CombatLabBattleConfig,
  hex: CombatLabHex,
  brush: EditorBrush,
  profileId: string,
  sideId: CombatLabCustomUnit['sideId'],
): BrushResult | null {
  const tile = battle.map.tiles.find((candidate) => candidate.q === hex.q && candidate.r === hex.r);
  if (tile === undefined) return null;
  if (brush === 'place') {
    return tile.blocked
      ? { notice: `Клетка ${hexKey(hex)} занята препятствием.` }
      : placeDraftUnit(battle, hex, profileId, sideId);
  }
  const patch = brushPatch(brush);
  if (
    patch.blocked === true &&
    battle.units.some((unit) => hexKey(unit.position) === hexKey(hex))
  ) {
    return { notice: 'Сначала уберите бойца с клетки, затем отметьте препятствие.' };
  }
  return {
    patch: { map: { ...battle.map, tiles: paintBattleTile(battle.map.tiles, hex, patch) } },
  };
}

type ImportResult =
  | { readonly status: 'accepted'; readonly battle: CombatLabBattleConfig; readonly notice: string }
  | { readonly status: 'rejected'; readonly errors: readonly string[]; readonly notice: string };

export function prepareBattleImport(
  data: unknown,
  kind: 'battle' | 'map',
  current: CombatLabBattleConfig,
  catalog: CombatLabCatalog,
): ImportResult {
  const errors = kind === 'battle' ? validateBattleDraft(data, catalog) : validateMapDraft(data);
  if (errors.length > 0)
    return {
      status: 'rejected',
      errors,
      notice:
        kind === 'battle'
          ? 'Импорт отменён: файл боя не прошёл проверку.'
          : 'Импорт отменён: карта должна содержать полную сетку 15×11.',
    };
  if (kind === 'battle') {
    const battle = data as CombatLabBattleConfig;
    return { status: 'accepted', battle, notice: `Бой «${battle.name}» загружен из JSON.` };
  }
  const map = data as { name: string; tiles: readonly CombatLabTile[] };
  const next = { ...current, map: { name: map.name, tiles: map.tiles } };
  const battleErrors = validateBattleDraft(next, catalog);
  if (battleErrors.length > 0)
    return {
      status: 'rejected',
      errors: battleErrors,
      notice: 'Импорт отменён: новые препятствия пересекаются с бойцами.',
    };
  return {
    status: 'accepted',
    battle: next,
    notice: `Карта «${map.name}» импортирована; состав боя сохранён.`,
  };
}

/** Clear the input before reading so the same file can be selected after a failed import. */
export async function readEditorImportFile(input: {
  files: ArrayLike<Pick<File, 'text'>> | null;
  value: string;
}): Promise<unknown> {
  const file = input.files?.[0];
  input.value = '';
  if (file === undefined) return undefined;
  return JSON.parse(await file.text()) as unknown;
}
