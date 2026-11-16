import type { NavigationField, PointFp, TerrainId } from './continuous-movement.js';

export type WorldSightTime = 'day' | 'night';
export type WorldSightWeather = 'clear' | 'rain' | 'fog';

export interface WorldSightConditions {
  readonly time: WorldSightTime;
  readonly weather: WorldSightWeather;
}

/** Immutable coarse sight data derived from the navigation edition. */
export interface WorldSightField {
  readonly columns: number;
  readonly rows: number;
  readonly cellSizeFp: number;
  readonly origin: PointFp;
  /** Terrain sight-cost multiplier. 1000 is open ground; values above it shorten sight. */
  readonly opacityPermille: readonly number[];
  /** Coarse terrain elevation in fp. It affects occlusion, never movement. */
  readonly heightsFp: readonly number[];
}

export const WORLD_SIGHT_DAY_BUDGET_FP = 1088;
const PERMILLE = 1000;
const WORLD_SIGHT_NIGHT_PERMILLE = 520;
const WORLD_SIGHT_RAIN_PERMILLE = 750;
const WORLD_SIGHT_FOG_PERMILLE = 450;
const EYE_HEIGHT_FP = 24;

// Provisional lab estimates: terrain contributes visibility cost and coarse elevation only.
const TERRAIN_SIGHT: Readonly<Record<TerrainId, { opacityPermille: number; heightFp: number }>> =
  Object.freeze({
    grassland: { opacityPermille: 1000, heightFp: 0 },
    forest: { opacityPermille: 3200, heightFp: 0 },
    hills: { opacityPermille: 1200, heightFp: 80 },
    marsh: { opacityPermille: 1350, heightFp: -8 },
    riverbank: { opacityPermille: 1100, heightFp: -4 },
    rock: { opacityPermille: 1100, heightFp: 112 },
    deep_water: { opacityPermille: 1000, heightFp: -16 },
    cliff: { opacityPermille: 1000, heightFp: 192 },
  });

function gridSize(field: Pick<WorldSightField, 'columns' | 'rows'>): number {
  return field.columns * field.rows;
}

function validateField(field: WorldSightField): void {
  if (
    !Number.isSafeInteger(field.columns) ||
    field.columns <= 0 ||
    !Number.isSafeInteger(field.rows) ||
    field.rows <= 0 ||
    !Number.isSafeInteger(field.cellSizeFp) ||
    field.cellSizeFp <= 0 ||
    !Number.isSafeInteger(field.origin.xFp) ||
    !Number.isSafeInteger(field.origin.zFp) ||
    field.columns * field.rows > 49_152 ||
    field.opacityPermille.length !== gridSize(field) ||
    field.heightsFp.length !== gridSize(field) ||
    field.opacityPermille.some((value) => !Number.isSafeInteger(value) || value < 1000) ||
    field.heightsFp.some((value) => !Number.isSafeInteger(value))
  ) {
    throw new RangeError('Invalid world sight field');
  }
}

/** Build visibility terrain from the exact immutable navigation lattice. */
interface SightGridMetrics {
  readonly columns: number;
  readonly rows: number;
  readonly cellSizeFp: number;
  readonly sourceColumns: number;
  readonly sourceRows: number;
}

function isValidSightDimensions(columns: number, rows: number): boolean {
  return (
    Number.isSafeInteger(columns) &&
    columns > 0 &&
    Number.isSafeInteger(rows) &&
    rows > 0 &&
    columns * rows <= 49_152
  );
}

function hasValidSearchSpacing(field: NavigationField): boolean {
  const grid = field.searchGrid;
  return (
    grid === undefined ||
    (Number.isFinite(grid.xStepFp) &&
      grid.xStepFp > 0 &&
      Number.isFinite(grid.zStepFp) &&
      grid.zStepFp > 0)
  );
}

function sightGridMetrics(field: NavigationField): SightGridMetrics {
  const columns = field.region.columns;
  const rows = field.region.rows;
  const cellSizeFp = field.region.cellSizeFp;
  const sourceColumns = field.searchGrid?.columns ?? columns;
  const sourceRows = field.searchGrid?.rows ?? rows;
  if (
    !isValidSightDimensions(columns, rows) ||
    !isValidSightDimensions(sourceColumns, sourceRows) ||
    field.terrainIds.length !== sourceColumns * sourceRows ||
    !Number.isSafeInteger(cellSizeFp) ||
    cellSizeFp <= 0 ||
    !hasValidSearchSpacing(field)
  ) {
    throw new RangeError('Invalid navigation sight lattice');
  }
  return { columns, rows, cellSizeFp, sourceColumns, sourceRows };
}

function sourceTerrainId(
  field: NavigationField,
  metrics: SightGridMetrics,
  column: number,
  row: number,
): TerrainId {
  if (!field.searchGrid) return field.terrainIds[row * metrics.sourceColumns + column]!;
  const xFp = field.region.origin.xFp + (column + 0.5) * metrics.cellSizeFp;
  const zFp = field.region.origin.zFp + (row + 0.5) * metrics.cellSizeFp;
  const sourceRow = Math.max(
    0,
    Math.min(
      metrics.sourceRows - 1,
      Math.round((zFp - field.region.origin.zFp) / field.searchGrid.zStepFp - 0.5),
    ),
  );
  const sourceColumn = Math.max(
    0,
    Math.min(
      metrics.sourceColumns - 1,
      Math.round(
        (xFp - field.region.origin.xFp) / field.searchGrid.xStepFp - 0.5 - (sourceRow % 2) / 2,
      ),
    ),
  );
  return field.terrainIds[sourceRow * metrics.sourceColumns + sourceColumn]!;
}

function sightLayers(field: NavigationField, metrics: SightGridMetrics) {
  const opacityPermille: number[] = [];
  const heightsFp: number[] = [];
  for (let index = 0; index < metrics.columns * metrics.rows; index += 1) {
    const terrainId = sourceTerrainId(
      field,
      metrics,
      index % metrics.columns,
      Math.floor(index / metrics.columns),
    );
    const terrain = TERRAIN_SIGHT[terrainId];
    if (!terrain) throw new RangeError('Unknown terrain in world sight field');
    opacityPermille.push(terrain.opacityPermille);
    heightsFp.push(terrain.heightFp);
  }
  return { opacityPermille, heightsFp };
}

export function createWorldSightField(field: NavigationField): WorldSightField {
  const metrics = sightGridMetrics(field);
  const layers = sightLayers(field, metrics);
  const sightField = {
    columns: metrics.columns,
    rows: metrics.rows,
    cellSizeFp: metrics.cellSizeFp,
    origin: Object.freeze({ ...field.region.origin }),
    opacityPermille: Object.freeze(layers.opacityPermille),
    heightsFp: Object.freeze(layers.heightsFp),
  };
  validateField(sightField);
  return Object.freeze(sightField);
}

/** Return the row-major cell for a point, or -1 when it lies outside the field. */
export function worldSightIndex(field: WorldSightField, point: PointFp): number {
  if (!Number.isFinite(point.xFp) || !Number.isFinite(point.zFp)) return -1;
  const column = Math.floor((point.xFp - field.origin.xFp) / field.cellSizeFp);
  const row = Math.floor((point.zFp - field.origin.zFp) / field.cellSizeFp);
  return column < 0 || row < 0 || column >= field.columns || row >= field.rows
    ? -1
    : row * field.columns + column;
}

function center(field: WorldSightField, index: number): PointFp {
  const column = index % field.columns;
  const row = Math.floor(index / field.columns);
  return {
    xFp: field.origin.xFp + (column + 0.5) * field.cellSizeFp,
    zFp: field.origin.zFp + (row + 0.5) * field.cellSizeFp,
  };
}

function sightBudget(conditions: WorldSightConditions): number {
  const time =
    conditions.time === 'day'
      ? PERMILLE
      : conditions.time === 'night'
        ? WORLD_SIGHT_NIGHT_PERMILLE
        : invalidSightCondition();
  const weather =
    conditions.weather === 'clear'
      ? PERMILLE
      : conditions.weather === 'rain'
        ? WORLD_SIGHT_RAIN_PERMILLE
        : conditions.weather === 'fog'
          ? WORLD_SIGHT_FOG_PERMILLE
          : invalidSightCondition();
  return Math.floor((WORLD_SIGHT_DAY_BUDGET_FP * time * weather) / (PERMILLE * PERMILLE));
}

function invalidSightCondition(): never {
  throw new RangeError('Invalid world sight condition');
}

function cellAt(field: WorldSightField, column: number, row: number): number {
  return column < 0 || row < 0 || column >= field.columns || row >= field.rows
    ? -1
    : row * field.columns + column;
}

function terrainCost(field: WorldSightField, index: number, distanceFp: number): number {
  return Math.ceil((distanceFp * field.opacityPermille[index]!) / PERMILLE);
}

function blocksHeight(
  field: WorldSightField,
  index: number,
  stepDistanceFp: number,
  totalDistanceFp: number,
  startHeightFp: number,
  endHeightFp: number,
): boolean {
  const sightHeight =
    startHeightFp + ((endHeightFp - startHeightFp) * stepDistanceFp) / totalDistanceFp;
  return field.heightsFp[index]! + EYE_HEIGHT_FP > sightHeight;
}

interface SightRay {
  readonly targetIndex: number;
  readonly targetColumn: number;
  readonly targetRow: number;
  readonly stepX: number;
  readonly stepZ: number;
  readonly xStepFraction: number;
  readonly zStepFraction: number;
  readonly totalDistanceFp: number;
  readonly sourceHeightFp: number;
  readonly targetHeightFp: number;
  column: number;
  row: number;
  nextXFraction: number;
  nextZFraction: number;
  traveledFp: number;
}

interface SightRayStep {
  readonly fromIndex: number;
  readonly enteredIndex: number;
  readonly sideX: number;
  readonly sideZ: number;
  readonly corner: boolean;
  readonly segmentFp: number;
}

function createSightRay(field: WorldSightField, fromIndex: number, toIndex: number): SightRay {
  const from = center(field, fromIndex);
  const to = center(field, toIndex);
  const dx = to.xFp - from.xFp;
  const dz = to.zFp - from.zFp;
  const absX = Math.abs(dx);
  const absZ = Math.abs(dz);
  const stepX = Math.sign(dx);
  const stepZ = Math.sign(dz);
  const xStepFraction = stepX === 0 ? Infinity : field.cellSizeFp / absX;
  const zStepFraction = stepZ === 0 ? Infinity : field.cellSizeFp / absZ;
  return {
    targetIndex: toIndex,
    targetColumn: toIndex % field.columns,
    targetRow: Math.floor(toIndex / field.columns),
    stepX,
    stepZ,
    xStepFraction,
    zStepFraction,
    totalDistanceFp: Math.hypot(dx, dz),
    sourceHeightFp: field.heightsFp[fromIndex]! + EYE_HEIGHT_FP,
    targetHeightFp: field.heightsFp[toIndex]! + EYE_HEIGHT_FP,
    column: fromIndex % field.columns,
    row: Math.floor(fromIndex / field.columns),
    nextXFraction: xStepFraction / 2,
    nextZFraction: zStepFraction / 2,
    traveledFp: 0,
  };
}

function nextSightRayStep(field: WorldSightField, ray: SightRay): SightRayStep {
  const crossing = Math.min(ray.nextXFraction, ray.nextZFraction);
  const corner = Math.abs(ray.nextXFraction - ray.nextZFraction) < 1e-9;
  const previousDistanceFp = ray.traveledFp;
  ray.traveledFp = crossing * ray.totalDistanceFp;
  const segmentFp = Math.max(0, ray.traveledFp - previousDistanceFp);
  const fromIndex = ray.row * field.columns + ray.column;
  let sideX = -1;
  let sideZ = -1;

  if (corner) {
    sideX = cellAt(field, ray.column + ray.stepX, ray.row);
    sideZ = cellAt(field, ray.column, ray.row + ray.stepZ);
    ray.column += ray.stepX;
    ray.row += ray.stepZ;
    ray.nextXFraction += ray.xStepFraction;
    ray.nextZFraction += ray.zStepFraction;
  } else if (ray.nextXFraction < ray.nextZFraction) {
    ray.column += ray.stepX;
    ray.nextXFraction += ray.xStepFraction;
  } else {
    ray.row += ray.stepZ;
    ray.nextZFraction += ray.zStepFraction;
  }

  return {
    fromIndex,
    enteredIndex: cellAt(field, ray.column, ray.row),
    sideX,
    sideZ,
    corner,
    segmentFp,
  };
}

function cornerBlocksSight(field: WorldSightField, ray: SightRay, step: SightRayStep): boolean {
  return (
    step.corner &&
    ((step.sideX >= 0 &&
      step.sideX !== ray.targetIndex &&
      blocksHeight(
        field,
        step.sideX,
        ray.traveledFp,
        ray.totalDistanceFp,
        ray.sourceHeightFp,
        ray.targetHeightFp,
      )) ||
      (step.sideZ >= 0 &&
        step.sideZ !== ray.targetIndex &&
        blocksHeight(
          field,
          step.sideZ,
          ray.traveledFp,
          ray.totalDistanceFp,
          ray.sourceHeightFp,
          ray.targetHeightFp,
        )))
  );
}

function rayHasReachedTarget(ray: SightRay): boolean {
  return ray.column === ray.targetColumn && ray.row === ray.targetRow;
}

/**
 * Supercover traversal checks both cells touched at a diagonal corner. A ridge
 * or exhausted forest path therefore cannot leak a sight line through a corner.
 */
function canSeeCell(
  field: WorldSightField,
  fromIndex: number,
  toIndex: number,
  budgetFp: number,
): boolean {
  if (fromIndex === toIndex) return true;
  const ray = createSightRay(field, fromIndex, toIndex);
  let opacityCostFp = 0;

  while (!rayHasReachedTarget(ray)) {
    const step = nextSightRayStep(field, ray);
    opacityCostFp += terrainCost(field, step.fromIndex, step.segmentFp);
    if (cornerBlocksSight(field, ray, step) || step.enteredIndex < 0) return false;
    if (step.enteredIndex === toIndex) return opacityCostFp < budgetFp;
    if (
      blocksHeight(
        field,
        step.enteredIndex,
        ray.traveledFp,
        ray.totalDistanceFp,
        ray.sourceHeightFp,
        ray.targetHeightFp,
      )
    )
      return false;
    if (opacityCostFp >= budgetFp) return false;
  }
  return true;
}

/** Row-major, low-bit-first mask for cells visible from the observer point. */
export function worldSightCells(
  field: WorldSightField,
  observer: PointFp,
  conditions: WorldSightConditions,
): Uint8Array {
  validateField(field);
  const observerIndex = worldSightIndex(field, observer);
  const mask = new Uint8Array(Math.ceil(gridSize(field) / 8));
  if (observerIndex < 0) return mask;
  const budgetFp = sightBudget(conditions);
  const origin = center(field, observerIndex);
  const maxCellRadius = Math.ceil(budgetFp / field.cellSizeFp) + 1;
  const originColumn = observerIndex % field.columns;
  const originRow = Math.floor(observerIndex / field.columns);
  for (
    let row = Math.max(0, originRow - maxCellRadius);
    row <= Math.min(field.rows - 1, originRow + maxCellRadius);
    row += 1
  ) {
    for (
      let column = Math.max(0, originColumn - maxCellRadius);
      column <= Math.min(field.columns - 1, originColumn + maxCellRadius);
      column += 1
    ) {
      const index = row * field.columns + column;
      const point = center(field, index);
      // The target cell's near face can be seen at the edge of the sight budget.
      if (Math.hypot(point.xFp - origin.xFp, point.zFp - origin.zFp) > budgetFp + field.cellSizeFp)
        continue;
      if (canSeeCell(field, observerIndex, index, budgetFp))
        mask[index >>> 3] = mask[index >>> 3]! | (1 << (index & 7));
    }
  }
  return mask;
}

/** Check one target using exactly the same discrete cells as the area query. */
export function canObserveWorldPoint(
  field: WorldSightField,
  observer: PointFp,
  target: PointFp,
  conditions: WorldSightConditions,
): boolean {
  validateField(field);
  const observerIndex = worldSightIndex(field, observer);
  const targetIndex = worldSightIndex(field, target);
  return (
    observerIndex >= 0 &&
    targetIndex >= 0 &&
    canSeeCell(field, observerIndex, targetIndex, sightBudget(conditions))
  );
}

export function sightHasCell(mask: Uint8Array, index: number): boolean {
  return (
    Number.isSafeInteger(index) &&
    index >= 0 &&
    index < mask.length * 8 &&
    (mask[index >>> 3]! & (1 << (index & 7))) !== 0
  );
}

/** Merge explored masks without retaining either caller-owned byte buffer. */
export function mergeExploredBits(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.length !== right.length) throw new RangeError('Explored masks have different sizes');
  const merged = new Uint8Array(left.length);
  for (let index = 0; index < left.length; index += 1) merged[index] = left[index]! | right[index]!;
  return merged;
}
