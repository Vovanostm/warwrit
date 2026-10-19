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
    !hasAttackRefusals(view) ||
    !hasMovementAffordability(view) ||
    !hasSkillReach(view)
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
    (view.attackPreview === undefined || Array.isArray(view.attackPreview)) &&
    view.attackRefusals.every((row) => validRefusal(row, view, seen))
  );
}

function hasMovementAffordability(view: Partial<CombatLabView>): boolean {
  if (view.movementPreview === undefined) return true;
  return (
    Array.isArray(view.movementPreview) &&
    view.movementPreview.every(
      (row) =>
        isRecord(row) &&
        (row['attackAffordableAfter'] === undefined ||
          typeof row['attackAffordableAfter'] === 'boolean'),
    )
  );
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}
function safeHex(value: unknown): value is { q: number; r: number } {
  return plainRecord(value) && Number.isSafeInteger(value['q']) && Number.isSafeInteger(value['r']);
}
function hexIdentity(cell: { q: number; r: number }): string {
  return `${cell.q},${cell.r}`;
}
function reachCompanions(view: Partial<CombatLabView>): boolean {
  return (
    view.units!.every(isRecord) &&
    view.map!.hexes.every(safeHex) &&
    view.map!.blocked.every(safeHex) &&
    (view.skills === undefined || (Array.isArray(view.skills) && view.skills.every(isRecord)))
  );
}
function reachContext(view: Partial<CombatLabView>): boolean {
  if (view.scenarioId !== SPRITE_COMBAT_LAB_SCENARIO || view.rulesetId !== 'sprite-prototype-v3')
    return false;
  if (view.status !== 'active' || !isRecord(view.activation)) return false;
  if (typeof view.activation.id !== 'string' || view.activation.id.length === 0) return false;
  return (
    Array.isArray(view.skills) &&
    view.units!.some(
      (unit) =>
        unit.id === view.activation!.actorId &&
        unit.status === 'active' &&
        unit.sideId === view.controlledSideId,
    )
  );
}
function reachIdentity(row: Record<string, unknown>, view: Partial<CombatLabView>): boolean {
  return (
    typeof row['actorId'] === 'string' &&
    row['actorId'].length > 0 &&
    row['actorId'] === view.activation!.actorId &&
    row['activationId'] === view.activation!.id &&
    nonnegative(row['revision']) &&
    row['revision'] === view.viewRevision
  );
}
function reachRanges(row: Record<string, unknown>, view: Partial<CombatLabView>): boolean {
  if (
    !['shield-brace', 'armor-pressure', 'reach-thrust', 'aimed-shot', 'rally'].includes(
      row['skillId'] as string,
    )
  )
    return false;
  const skill = view.skills!.find((skill) => skill.skillId === row['skillId']);
  return (
    skill !== undefined &&
    nonnegative(row['minimumRange']) &&
    nonnegative(row['maximumRange']) &&
    row['minimumRange'] <= row['maximumRange'] &&
    row['minimumRange'] === skill.minimumRange &&
    row['maximumRange'] === skill.maximumRange
  );
}
function reachCells(cells: unknown, hexes: Set<string>, blocked: Set<string>): boolean {
  if (!Array.isArray(cells)) return false;
  const seen = new Set<string>();
  return cells.every((cell: unknown) => {
    if (!safeHex(cell) || !hasOnlyKeys(cell, ['q', 'r'])) return false;
    const key = hexIdentity(cell);
    if (seen.has(key) || !hexes.has(key) || blocked.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function validSkillReach(row: unknown, view: Partial<CombatLabView>, seen: Set<unknown>): boolean {
  if (
    !plainRecord(row) ||
    !hasOnlyKeys(row, [
      'actorId',
      'activationId',
      'revision',
      'skillId',
      'minimumRange',
      'maximumRange',
      'cells',
    ])
  )
    return false;
  if (!reachIdentity(row, view) || !reachRanges(row, view) || seen.has(row['skillId']))
    return false;
  seen.add(row['skillId']);
  return reachCells(
    row['cells'],
    new Set(view.map!.hexes.map(hexIdentity)),
    new Set(view.map!.blocked.map(hexIdentity)),
  );
}
function hasSkillReach(view: Partial<CombatLabView>): boolean {
  if (view.skillReach === undefined) return true;
  if (!Array.isArray(view.skillReach) || !reachCompanions(view)) return false;
  if (view.skillReach.length === 0) return true;
  if (!reachContext(view)) return false;
  const seen = new Set<unknown>();
  return view.skillReach.every((row) => validSkillReach(row, view, seen));
}
