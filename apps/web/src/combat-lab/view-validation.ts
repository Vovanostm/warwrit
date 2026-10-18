import {
  COMBAT_LAB_VERSION,
  COMBAT_LAB_SCENARIO,
  SPRITE_COMBAT_LAB_SCENARIO,
  type CombatLabView,
  type CombatLabAttackRefusal,
} from '@warwrit/protocol';

function hasViewIdentity(view: Partial<CombatLabView>): boolean {
  return (
    view.version === COMBAT_LAB_VERSION &&
    typeof view.sessionId === 'string' &&
    typeof view.battleId === 'string' &&
    typeof view.scenarioId === 'string' &&
    typeof view.controlledSideId === 'string' &&
    Number.isSafeInteger(view.viewRevision) &&
    (view.status === 'active' || view.status === 'resolved')
  );
}

function hasViewCollections(view: Partial<CombatLabView>): boolean {
  return (
    Array.isArray(view.units) &&
    Array.isArray(view.initiativeOrder) &&
    Array.isArray(view.events) &&
    view.map !== undefined &&
    view.map !== null &&
    typeof view.map === 'object' &&
    Array.isArray(view.map.hexes) &&
    Array.isArray(view.map.blocked)
  );
}

function isSpriteView(view: Partial<CombatLabView>): boolean {
  return (
    view.battle !== undefined &&
    Array.isArray(view.map?.tiles) &&
    view.map.tiles.length === 165 &&
    (view.movementPreview === undefined || Array.isArray(view.movementPreview)) &&
    (view.attackPreview === undefined || Array.isArray(view.attackPreview)) &&
    (view.rangedAttackArea === undefined || Array.isArray(view.rangedAttackArea))
  );
}

function hasInitiativeForecast(view: Partial<CombatLabView>): boolean {
  const forecast = view.nextRoundInitiative;
  if (forecast === undefined) return true;
  if (
    forecast === null ||
    typeof forecast !== 'object' ||
    view.status !== 'active' ||
    view.round === undefined ||
    !Number.isSafeInteger(forecast.round) ||
    forecast.round !== view.round + 1 ||
    !Array.isArray(forecast.unitIds)
  )
    return false;
  return (
    new Set(forecast.unitIds).size === forecast.unitIds.length &&
    forecast.unitIds.every(
      (id) =>
        typeof id === 'string' &&
        view.units?.some((unit) => unit?.id === id && unit.status === 'active'),
    )
  );
}

export function isCombatLabView(value: unknown): value is CombatLabView {
  if (value === null || typeof value !== 'object') return false;
  const view = value as Partial<CombatLabView>;
  if (
    !hasViewIdentity(view) ||
    !hasViewCollections(view) ||
    !hasInitiativeForecast(view) ||
    !hasAttackRefusals(view)
  )
    return false;
  return view.scenarioId === SPRITE_COMBAT_LAB_SCENARIO
    ? isSpriteView(view)
    : view.scenarioId === COMBAT_LAB_SCENARIO;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nonnegative(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}
function resourcePair(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['actionPoints', 'stamina']) &&
    nonnegative(value['actionPoints']) &&
    nonnegative(value['stamina'])
  );
}
function refusalDiagnostics(row: Record<string, unknown>): boolean {
  const base = ['targetId', 'code'];
  switch (row['code']) {
    case 'out-of-range':
    case 'too-close':
      return (
        hasOnlyKeys(row, [...base, 'distance', 'minimumRange', 'maximumRange']) &&
        nonnegative(row['distance']) &&
        nonnegative(row['minimumRange']) &&
        nonnegative(row['maximumRange']) &&
        row['minimumRange'] <= row['maximumRange']
      );
    case 'insufficient-action-points':
    case 'insufficient-stamina':
      return (
        hasOnlyKeys(row, [...base, 'required', 'available']) &&
        resourcePair(row['required']) &&
        resourcePair(row['available'])
      );
    case 'no-line-of-sight':
    case 'not-actor-turn':
    case 'panicking':
    case 'battle-resolved':
    case 'threat-not-available':
      return hasOnlyKeys(row, base);
    default:
      return false;
  }
}
function validRefusal(
  row: unknown,
  view: Partial<CombatLabView>,
  seen: Set<string>,
): row is CombatLabAttackRefusal {
  if (!isRecord(row) || typeof row['targetId'] !== 'string' || row['targetId'].length === 0)
    return false;
  if (seen.has(row['targetId'])) return false;
  seen.add(row['targetId']);
  return (
    !!view.units?.some(
      (unit) =>
        unit?.id === row['targetId'] &&
        unit.status === 'active' &&
        unit.sideId !== view.controlledSideId,
    ) &&
    !view.attackPreview?.some((attack) => attack?.targetId === row['targetId']) &&
    refusalDiagnostics(row)
  );
}
function hasAttackRefusals(view: Partial<CombatLabView>): boolean {
  if (view.attackRefusals === undefined) return true;
  const seen = new Set<string>();
  return (
    Array.isArray(view.attackRefusals) &&
    view.attackRefusals.every((row) => validRefusal(row, view, seen))
  );
}
