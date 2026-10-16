import {
  COMBAT_LAB_VERSION,
  COMBAT_LAB_SCENARIO,
  SPRITE_COMBAT_LAB_SCENARIO,
  type CombatLabView,
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
  if (!hasViewIdentity(view) || !hasViewCollections(view) || !hasInitiativeForecast(view))
    return false;
  return view.scenarioId === SPRITE_COMBAT_LAB_SCENARIO
    ? isSpriteView(view)
    : view.scenarioId === COMBAT_LAB_SCENARIO;
}
