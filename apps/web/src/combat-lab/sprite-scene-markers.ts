import type { CombatLabHex, CombatLabSkillId } from '@warwrit/protocol';
import type { BattlePresentationView, Unit } from './battle-presentation.js';

type MarkerView = Pick<
  BattlePresentationView,
  | 'status'
  | 'controlledSideId'
  | 'activation'
  | 'viewRevision'
  | 'skillReach'
  | 'attackPreview'
  | 'skillPreview'
  | 'units'
  | 'movementPreview'
  | 'rangedAttackArea'
>;
const key = ({ q, r }: CombatLabHex) => `${q},${r}`;
interface Selection {
  readonly selectedId: string | null;
  readonly selectedSkill: CombatLabSkillId | null;
  readonly selectedCell: CombatLabHex | null;
  readonly hoveredTarget: { readonly hex: CombatLabHex; readonly unitId: string | null } | null;
  readonly highlightedId: string | null;
  readonly showFullGrid: boolean;
}
type Fill =
  'preview' | 'selection' | 'movement' | 'movement-attack' | 'movement-only' | 'target' | 'threat';
type Border =
  'grid' | 'blocked' | 'friendly' | 'enemy' | 'inspection' | 'path' | 'target' | 'threat';
interface CellStyle {
  readonly fill: Fill | null;
  readonly border: Border | null;
  readonly priority: number;
}
type Cue = (hex: CombatLabHex, fill: Fill | null, border: Border | null, priority: number) => void;

function playerTurn(view: MarkerView, actor: Unit | undefined): boolean {
  if (view.status !== 'active' || actor?.status !== 'active') return false;
  return (
    actor.sideId === view.controlledSideId && (view.activation?.actionPoints?.current ?? 0) > 0
  );
}
function targetPreviews(
  view: MarkerView,
  skill: CombatLabSkillId | null,
): readonly { readonly targetId: string }[] {
  if (!skill) return view.attackPreview ?? [];
  return view.skillPreview?.filter((preview) => preview.skillId === skill && preview.legal) ?? [];
}
export interface MovementBandSummary {
  readonly generic: boolean;
  readonly moveAttack: boolean;
  readonly movementOnly: boolean;
}

/** Classify only complete server-owned affordability rows; legacy or mixed rows stay generic. */
export function movementBandSummary(
  view: Pick<BattlePresentationView, 'movementPreview'>,
): MovementBandSummary {
  const rows = view.movementPreview ?? [];
  if (!rows.length) return { generic: false, moveAttack: false, movementOnly: false };
  if (!rows.every((row) => typeof row.attackAffordableAfter === 'boolean'))
    return { generic: true, moveAttack: false, movementOnly: false };
  return {
    generic: false,
    moveAttack: rows.some((row) => row.attackAffordableAfter === true),
    movementOnly: rows.some((row) => row.attackAffordableAfter === false),
  };
}

function movementCells(view: MarkerView, selection: Selection) {
  if (selection.selectedSkill) return [];
  const rows = view.movementPreview ?? [];
  const bands = movementBandSummary(view);
  return rows.map((preview) => ({
    ...preview,
    band: bands.generic
      ? ('movement' as const)
      : preview.attackAffordableAfter === true
        ? ('movement-attack' as const)
        : ('movement-only' as const),
  }));
}
function weaponReach(
  view: MarkerView,
  actor: Unit | undefined,
  selection: Selection,
): readonly CombatLabHex[] {
  if (view.status !== 'active' || selection.selectedSkill) return [];
  const unit = selection.selectedId
    ? view.units.find(({ id }) => id === selection.selectedId)
    : actor;
  if (unit?.status !== 'active') return [];
  return reachForUnit(view, unit, actor);
}
function reachForUnit(
  view: MarkerView,
  unit: Unit,
  actor: Unit | undefined,
): readonly CombatLabHex[] {
  if (unit.weaponReach) return unit.weaponReach.cells;
  return unit.id === actor?.id ? (view.rangedAttackArea ?? []) : [];
}
function selectedSkillReach(
  view: MarkerView,
  actor: Unit | undefined,
  selection: Selection,
): readonly CombatLabHex[] {
  if (!selection.selectedSkill || view.status !== 'active' || actor?.status !== 'active') return [];
  const row = view.skillReach?.find(
    (candidate) =>
      candidate.actorId === actor.id &&
      candidate.activationId === view.activation?.id &&
      candidate.revision === view.viewRevision &&
      candidate.skillId === selection.selectedSkill,
  );
  return row?.cells.length ? row.cells : [];
}
function baseCells(
  tiles: readonly (CombatLabHex & { readonly blocked: boolean })[],
  full: boolean,
  cue: Cue,
) {
  for (const tile of tiles) {
    if (full) cue(tile, null, 'grid', 0);
    if (tile.blocked) cue(tile, null, 'blocked', 2);
  }
}
function unitCells(view: MarkerView, selection: Selection, cue: Cue) {
  for (const unit of view.units) {
    if (unit.status !== 'active') continue;
    cue(unit.position, null, unit.sideId === view.controlledSideId ? 'friendly' : 'enemy', 1);
    if (unit.id === selection.selectedId) cue(unit.position, 'selection', 'path', 8);
  }
}
function threatCells(view: MarkerView, cue: Cue) {
  for (const unit of view.units) {
    if (unit.status === 'active' && unit.threat?.targetHex)
      cue(unit.threat.targetHex, 'threat', 'threat', 9);
  }
}
function legalMovement(view: MarkerView, selection: Selection, cue: Cue) {
  for (const preview of movementCells(view, selection)) {
    cue(preview.to, preview.band, selection.showFullGrid ? 'grid' : null, 3);
  }
}
function selectedPath(view: MarkerView, selection: Selection, cue: Cue) {
  const cell = selection.hoveredTarget?.hex ?? selection.selectedCell;
  const cellKey = cell ? key(cell) : '';
  const path = movementCells(view, selection).find((preview) => key(preview.to) === cellKey);
  if (!path) return;
  for (const hex of path.path) cue(hex, 'selection', 'path', 7);
}
function legalTargets(
  view: MarkerView,
  previews: readonly { readonly targetId: string }[],
  cue: Cue,
) {
  for (const preview of previews) {
    const unit = view.units.find(({ id }) => id === preview.targetId);
    if (unit?.status === 'active') cue(unit.position, 'target', 'target', 6);
  }
}
function inspection(
  view: MarkerView,
  selection: Selection,
  cells: ReadonlyMap<string, CellStyle>,
  cue: Cue,
) {
  if (selection.selectedCell) cue(selection.selectedCell, 'selection', 'path', 8);
  const hex =
    selection.hoveredTarget?.hex ??
    view.units.find(({ id }) => id === selection.highlightedId)?.position;
  if (!hex) return;
  cue(hex, cells.get(key(hex))?.fill ?? 'preview', 'inspection', 10);
}

/** Resolve only presentation priorities; legal commands remain the public preview's authority. */
export function markerPlan(
  view: MarkerView,
  tiles: readonly (CombatLabHex & { readonly blocked: boolean })[],
  selection: Selection,
) {
  const cells = new Map<string, CellStyle>();
  const tileKeys = new Set(tiles.map(key));
  const cue: Cue = (hex, fill, border, priority) => {
    const cellKey = key(hex);
    if (!tileKeys.has(cellKey)) return;
    const existing = cells.get(cellKey);
    if (existing && existing.priority > priority) return;
    cells.set(cellKey, { fill, border, priority });
  };
  const actor = view.units.find(({ id }) => id === view.activation?.actorId);
  const acting = playerTurn(view, actor);
  const previews = targetPreviews(view, selection.selectedSkill);
  const reachCells = selection.selectedSkill
    ? selectedSkillReach(view, actor, selection)
    : weaponReach(view, actor, selection);
  baseCells(tiles, selection.showFullGrid, cue);
  unitCells(view, selection, cue);
  threatCells(view, cue);
  if (acting && actor) {
    legalMovement(view, selection, cue);
    selectedPath(view, selection, cue);
    legalTargets(view, previews, cue);
  }
  inspection(view, selection, cells, cue);
  return {
    cells,
    reachCells,
    actor: actingUnitMarker(view),
    attackableIds: new Set(acting ? previews.map(({ targetId }) => targetId) : []),
    hoveredUnitId: selection.hoveredTarget?.unitId ?? selection.highlightedId,
  };
}

export function unitEdgeTone(
  unit: Unit,
  view: MarkerView,
  hoveredId: string | null,
  attackableIds: ReadonlySet<string>,
  night: boolean,
) {
  const base = night ? 'night' : 'day';
  if (unit.status !== 'active') return base;
  if (unit.id === hoveredId) return 'hover';
  return unit.sideId !== view.controlledSideId && attackableIds.has(unit.id) ? 'target' : base;
}

/** Activation identity is independent of inspection, action points and controlled side. */
function actingUnitMarker(view: Pick<BattlePresentationView, 'status' | 'activation' | 'units'>) {
  if (view.status !== 'active') return null;
  const unit = view.units.find(({ id }) => id === view.activation?.actorId);
  if (unit?.status !== 'active') return null;
  return { id: unit.id, name: unit.name ?? unit.id, sideId: unit.sideId, position: unit.position };
}

/** Position changes move retained geometry; only projected identity/name/side redraw its texture. */
export function actorMarkerKey(
  actor: ReturnType<typeof actingUnitMarker>,
  controlledSideId: string,
) {
  return actor ? JSON.stringify([actor.id, actor.name, actor.sideId, controlledSideId]) : null;
}
