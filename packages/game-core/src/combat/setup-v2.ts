import { invariant } from '../primitives.js';
import { hexKey } from './hex.js';
import {
  M0_WEAPON_IDS,
  type BattleId,
  type CombatMap,
  type CombatSideSetup,
  type CombatUnitSetup,
  type SideId,
  type UnitId,
} from './types.js';

export const COMBAT_V2_SCHEMA_VERSION = 2 as const;
export const M1_DOMAIN_BRIDGE_RULESET_ID = 'm1-domain-bridge-v1' as const;

const V2_UNIT_LIMITS = {
  minimum: 2,
  maximum: 12,
} as const;

export interface CombatInitialPoolsV2 {
  readonly health: number;
  readonly armor: number;
  readonly stamina: number;
  readonly morale: number;
}

export interface CombatUnitSetupV2 extends CombatUnitSetup {
  readonly initialPools: CombatInitialPoolsV2;
}

export interface BattleSetupV2 {
  readonly schemaVersion: typeof COMBAT_V2_SCHEMA_VERSION;
  readonly battleId: BattleId;
  readonly rulesetId: typeof M1_DOMAIN_BRIDGE_RULESET_ID;
  readonly seed: number;
  readonly map: CombatMap;
  readonly sides: readonly [CombatSideSetup, CombatSideSetup];
  readonly units: readonly CombatUnitSetupV2[];
}

function validateInteger(value: number, name: string, minimum = 0): void {
  invariant(
    Number.isSafeInteger(value) && value >= minimum,
    `${name} must be an integer >= ${minimum}`,
  );
}

function validateHex(value: { readonly q: number; readonly r: number }, name: string): void {
  invariant(
    Number.isSafeInteger(value.q) && Number.isSafeInteger(value.r),
    `${name} coordinates must be safe integers`,
  );
}

function validateCurrentPool(current: number, maximum: number, name: string, minimum = 0): void {
  validateInteger(current, name, minimum);
  invariant(current <= maximum, `${name} must not exceed its maximum ${maximum}`);
}

function validateUnitPools(unit: CombatUnitSetupV2): void {
  const { attributes } = unit;
  validateInteger(attributes.health, `${unit.id}.attributes.health`, 1);
  validateInteger(attributes.armor, `${unit.id}.attributes.armor`);
  validateInteger(attributes.stamina, `${unit.id}.attributes.stamina`, 1);
  validateInteger(attributes.initiative, `${unit.id}.attributes.initiative`, 1);
  validateInteger(attributes.accuracy, `${unit.id}.attributes.accuracy`);
  validateInteger(attributes.defense, `${unit.id}.attributes.defense`);
  validateInteger(attributes.morale, `${unit.id}.attributes.morale`, 1);
  invariant(attributes.morale <= 100, `${unit.id}.attributes.morale must be <= 100`);

  invariant(unit.initialPools !== undefined, `${unit.id}.initialPools must be provided`);
  validateCurrentPool(unit.initialPools.health, attributes.health, `${unit.id}.initialPools.health`, 1);
  validateCurrentPool(unit.initialPools.armor, attributes.armor, `${unit.id}.initialPools.armor`);
  validateCurrentPool(unit.initialPools.stamina, attributes.stamina, `${unit.id}.initialPools.stamina`);
  validateCurrentPool(unit.initialPools.morale, attributes.morale, `${unit.id}.initialPools.morale`, 1);
}

export function validateBattleSetupV2(setup: BattleSetupV2): BattleSetupV2 {
  invariant(
    setup.schemaVersion === COMBAT_V2_SCHEMA_VERSION,
    `V2 battle setup schemaVersion must be ${COMBAT_V2_SCHEMA_VERSION}`,
  );
  invariant(
    setup.rulesetId === M1_DOMAIN_BRIDGE_RULESET_ID,
    `V2 battle setup ruleset must be ${M1_DOMAIN_BRIDGE_RULESET_ID}`,
  );
  invariant(setup.battleId.length > 0, 'Battle id must not be empty');
  invariant(Number.isSafeInteger(setup.seed), 'Battle seed must be a safe integer');
  invariant(setup.sides.length === 2, 'V2 battle requires exactly two sides');
  invariant(
    setup.units.length >= V2_UNIT_LIMITS.minimum && setup.units.length <= V2_UNIT_LIMITS.maximum,
    `V2 battle must contain ${V2_UNIT_LIMITS.minimum}-${V2_UNIT_LIMITS.maximum} real units`,
  );

  const mapKeys = new Set(setup.map.hexes.map(hexKey));
  const blockedKeys = new Set(setup.map.blocked.map(hexKey));
  invariant(mapKeys.size === setup.map.hexes.length, 'Battle map hexes must be unique');
  invariant(blockedKeys.size === setup.map.blocked.length, 'Blocked battle map hexes must be unique');
  invariant(setup.map.hexes.length > 0, 'Battle map must contain at least one hex');
  setup.map.hexes.forEach((value, index) => validateHex(value, `map.hexes[${index}]`));
  setup.map.blocked.forEach((value, index) => validateHex(value, `map.blocked[${index}]`));
  for (const blocked of blockedKeys) {
    invariant(mapKeys.has(blocked), `Blocked hex ${blocked} must exist in the battle map`);
  }

  const sideIds = new Set<string>();
  for (const side of setup.sides) {
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

  const unitIds = new Set<string>();
  const occupied = new Set<string>();
  const unitsPerSide = new Map<SideId, number>();
  for (const unit of setup.units) {
    invariant(unit.id.length > 0, 'Unit id must not be empty');
    invariant(!unitIds.has(unit.id), `Duplicate unit id: ${unit.id}`);
    unitIds.add(unit.id);
    invariant(sideIds.has(unit.sideId), `Unit ${unit.id} references unknown side ${unit.sideId}`);
    unitsPerSide.set(unit.sideId, (unitsPerSide.get(unit.sideId) ?? 0) + 1);

    validateHex(unit.position, `${unit.id}.position`);
    const positionKey = hexKey(unit.position);
    invariant(mapKeys.has(positionKey), `Unit ${unit.id} must start on the battle map`);
    invariant(!blockedKeys.has(positionKey), `Unit ${unit.id} must not start on blocked terrain`);
    invariant(!occupied.has(positionKey), `Multiple units occupy ${positionKey}`);
    occupied.add(positionKey);

    invariant(M0_WEAPON_IDS.includes(unit.weaponId), `Unsupported V2 weapon profile: ${unit.weaponId}`);
    validateUnitPools(unit);
  }

  for (const side of setup.sides) {
    invariant((unitsPerSide.get(side.id) ?? 0) > 0, `Side ${side.id} must have at least one unit`);
  }

  return setup;
}
