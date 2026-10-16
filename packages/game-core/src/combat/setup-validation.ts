import { invariant } from '../primitives.js';
import { hexKey } from './hex.js';
import type { CombatMap, CombatSideSetup, CombatUnitSetup, Hex } from './types.js';

export function validateInteger(value: number, name: string, minimum = 0): void {
  invariant(
    Number.isSafeInteger(value) && value >= minimum,
    `${name} must be an integer >= ${minimum}`,
  );
}

export function validateHex(value: Hex, name: string): void {
  invariant(
    Number.isSafeInteger(value.q) && Number.isSafeInteger(value.r),
    `${name} coordinates must be safe integers`,
  );
}

export function validateCombatMap(map: CombatMap) {
  const mapKeys = new Set(map.hexes.map(hexKey));
  const blockedKeys = new Set(map.blocked.map(hexKey));
  invariant(mapKeys.size === map.hexes.length, 'Battle map hexes must be unique');
  invariant(blockedKeys.size === map.blocked.length, 'Blocked battle map hexes must be unique');
  invariant(map.hexes.length > 0, 'Battle map must contain at least one hex');
  map.hexes.forEach((value, index) => validateHex(value, `map.hexes[${index}]`));
  map.blocked.forEach((value, index) => validateHex(value, `map.blocked[${index}]`));
  return { mapKeys, blockedKeys };
}

function validateCombatSides(
  sides: readonly CombatSideSetup[],
  mapKeys: ReadonlySet<string>,
  blockedKeys: ReadonlySet<string>,
): Set<string> {
  for (const blocked of blockedKeys) {
    invariant(mapKeys.has(blocked), `Blocked hex ${blocked} must exist in the battle map`);
  }
  const sideIds = new Set<string>();
  for (const side of sides) {
    invariant(side.id.length > 0, 'Side id must not be empty');
    invariant(!sideIds.has(side.id), `Duplicate side id: ${side.id}`);
    sideIds.add(side.id);
    invariant(side.retreatHexes.length > 0, `Side ${side.id} must have a retreat edge`);
    for (const [index, retreatHex] of side.retreatHexes.entries()) {
      validateHex(retreatHex, `${side.id}.retreatHexes[${index}]`);
      const key = hexKey(retreatHex);
      invariant(mapKeys.has(key) && !blockedKeys.has(key), `Invalid retreat hex ${key}`);
    }
  }

  return sideIds;
}

export function createUnitAdmission(
  sides: readonly CombatSideSetup[],
  mapKeys: ReadonlySet<string>,
  blockedKeys: ReadonlySet<string>,
) {
  return {
    sideIds: validateCombatSides(sides, mapKeys, blockedKeys),
    unitIds: new Set<string>(),
    occupied: new Set<string>(),
    unitsPerSide: new Map<string, number>(),
  };
}

export function validateUnitIdentity(
  unit: CombatUnitSetup,
  unitIds: Set<string>,
  sideIds: ReadonlySet<string>,
): void {
  invariant(unit.id.length > 0, 'Unit id must not be empty');
  invariant(!unitIds.has(unit.id), `Duplicate unit id: ${unit.id}`);
  unitIds.add(unit.id);
  invariant(sideIds.has(unit.sideId), `Unit ${unit.id} references unknown side ${unit.sideId}`);
}

export function validateUnitPosition(
  unit: CombatUnitSetup,
  mapKeys: ReadonlySet<string>,
  blockedKeys: ReadonlySet<string>,
  occupied: Set<string>,
  phase: 'setup' | 'active' = 'setup',
): void {
  if (phase === 'setup') validateHex(unit.position, `${unit.id}.position`);
  const key = hexKey(unit.position);
  invariant(
    mapKeys.has(key),
    phase === 'setup'
      ? `Unit ${unit.id} must start on the battle map`
      : `${unit.id} must occupy a battle map hex`,
  );
  invariant(
    !blockedKeys.has(key),
    phase === 'setup'
      ? `Unit ${unit.id} must not start on blocked terrain`
      : `${unit.id} must not occupy blocked terrain`,
  );
  invariant(
    !occupied.has(key),
    phase === 'setup' ? `Multiple units occupy ${key}` : `Active units overlap at ${key}`,
  );
  occupied.add(key);
}
