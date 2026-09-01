import {
  battleId,
  COMBAT_RULES_V1,
  COMBAT_SCHEMA_VERSION,
  M0_WEAPON_IDS,
  createHexagon,
  createRandomState,
  drawRandomInt,
  hexKey,
  sideId,
  unitId,
  type BattleSetup,
  type CombatMap,
  type CombatSideSetup,
  type Hex,
  type RandomState,
  type UnitAttributes,
  type WeaponId,
} from '@warwrit/game-core';

interface GeneratorCursor {
  state: RandomState;
}

function next(cursor: GeneratorCursor, minimum: number, maximum: number): number {
  const draw = drawRandomInt(cursor.state, minimum, maximum);
  cursor.state = draw.state;
  return draw.value;
}

function edge(hexes: readonly Hex[], q: number): readonly Hex[] {
  return hexes.filter((value) => value.q === q).toSorted((left, right) => left.r - right.r);
}

function interiorObstacles(
  cursor: GeneratorCursor,
  hexes: readonly Hex[],
  radius: number,
): readonly Hex[] {
  const candidates = hexes.filter(
    ({ q, r }) => Math.abs(q) < radius && r !== 0 && Math.abs(r) < radius,
  );
  const obstacleCount = Math.min(next(cursor, 0, 4), candidates.length);
  const selected: Hex[] = [];
  const remaining = [...candidates];
  while (selected.length < obstacleCount) {
    const index = next(cursor, 0, remaining.length - 1);
    const [value] = remaining.splice(index, 1);
    if (value !== undefined) {
      selected.push(value);
    }
  }
  return selected;
}

function choosePositions(
  candidates: readonly Hex[],
  count: number,
  blocked: ReadonlySet<string>,
): readonly Hex[] {
  const positions = candidates.filter((value) => !blocked.has(hexKey(value))).slice(0, count);
  if (positions.length !== count) {
    throw new Error(`Unable to place ${count} units on the generated deployment edge`);
  }
  return positions;
}

function attributes(cursor: GeneratorCursor): UnitAttributes {
  return {
    health: next(cursor, 70, 110),
    armor: next(cursor, 20, 65),
    stamina: next(cursor, 70, 110),
    initiative: next(cursor, 45, 95),
    accuracy: next(cursor, 8, 28),
    defense: next(cursor, 5, 22),
    morale: next(cursor, 50, 90),
  };
}

function weapon(cursor: GeneratorCursor): WeaponId {
  const selected = M0_WEAPON_IDS[next(cursor, 0, M0_WEAPON_IDS.length - 1)];
  if (selected === undefined) {
    throw new Error('Generated weapon index must exist');
  }
  return selected;
}

export function createGeneratedBattleSetup(seed: number): BattleSetup {
  const cursor: GeneratorCursor = { state: createRandomState(seed) };
  const radius = seed % 4 === 0 ? 4 : 3;
  const hexes = createHexagon(radius);
  const blocked = interiorObstacles(cursor, hexes, radius);
  const blockedKeys = new Set(blocked.map(hexKey));
  const totalUnits = next(cursor, COMBAT_RULES_V1.units.minimum, COMBAT_RULES_V1.units.maximum);
  const alphaCount =
    totalUnits % 2 === 0
      ? totalUnits / 2
      : seed % 2 === 0
        ? Math.floor(totalUnits / 2)
        : Math.ceil(totalUnits / 2);
  const betaCount = totalUnits - alphaCount;
  const alphaSide = sideId('alpha');
  const betaSide = sideId('beta');
  const alphaEdge = edge(hexes, -radius);
  const betaEdge = edge(hexes, radius);
  const alphaDeployment = hexes.toSorted((left, right) => left.q - right.q || left.r - right.r);
  const betaDeployment = alphaDeployment.toReversed();
  const alphaPositions = choosePositions(alphaDeployment, alphaCount, blockedKeys);
  const alphaPositionKeys = new Set(alphaPositions.map(hexKey));
  const betaPositions = choosePositions(
    betaDeployment.filter((position) => !alphaPositionKeys.has(hexKey(position))),
    betaCount,
    blockedKeys,
  );

  const map: CombatMap = { hexes, blocked };
  const sides: readonly [CombatSideSetup, CombatSideSetup] = [
    { id: alphaSide, retreatHexes: alphaEdge },
    { id: betaSide, retreatHexes: betaEdge },
  ];
  const units = [
    ...alphaPositions.map((position, index) => ({
      id: unitId(`alpha-${index}`),
      sideId: alphaSide,
      position,
      weaponId: weapon(cursor),
      attributes: attributes(cursor),
    })),
    ...betaPositions.map((position, index) => ({
      id: unitId(`beta-${index}`),
      sideId: betaSide,
      position,
      weaponId: weapon(cursor),
      attributes: attributes(cursor),
    })),
  ];

  return {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    battleId: battleId(`generated-${seed >>> 0}`),
    rulesetId: COMBAT_RULES_V1.id,
    seed,
    map,
    sides,
    units,
  };
}
