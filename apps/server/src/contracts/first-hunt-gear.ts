import {
  COMPANY_CATALOGUE,
  HUNT_PROFILES,
  M1_DOMAIN_BRIDGE_V6_RULESET_ID,
  canonicalJson,
  isEntityId,
  type AtLocation,
  type HuntProfile,
  type ItemInstance,
  type PhysicalContainer,
} from '@warwrit/game-core';

import type {
  FirstHuntHostileGearState,
  FirstHuntHostileState,
  FirstHuntWorldState,
} from './first-hunt-runtime.js';

const GEAR_SCHEMA_VERSION = 1 as const;

/** These authored combat profiles have matching physical catalogue definitions. */
const HUMANOID_GEAR_DEFINITIONS = Object.freeze({
  'raider-weapon': 'raider-weapon',
  bow: 'bow',
  'great-weapon': 'great-weapon',
  'padded-coat': 'padded-coat',
} as const);

/**
 * Initialize canonical, world-owned physical gear only at a newly validated V6 admission.
 * Existing/missing gear is retained as-is; reading or replaying an older row never backfills it.
 */
export function initializeHostileGearForNewV6Admission(input: {
  readonly world: FirstHuntWorldState;
  readonly encounterId: string;
  readonly rulesetId: string;
  readonly location: AtLocation;
}): readonly FirstHuntHostileState[] {
  if (
    input.rulesetId !== M1_DOMAIN_BRIDGE_V6_RULESET_ID ||
    !isEntityId(input.encounterId) ||
    !isAtLocation(input.location)
  )
    throw new TypeError('Hostile gear requires a validated V6 admission');

  return input.world.hostiles.map((hostile) => {
    if (hostile.gear !== undefined || hostile.currentPools['health'] === 0) return hostile;
    const definitions = gearDefinitions(hostile);
    if (!definitions) return hostile;
    return {
      ...hostile,
      gear: createHostileGear({
        worldId: input.world.worldId,
        hostile,
        encounterId: input.encounterId,
        location: input.location,
        definitions,
      }),
    };
  });
}

/** Reconcile terminal combat pools into the retained canonical gear instances. */
export function reconcileHostileGearPools(
  worldId: string,
  hostile: FirstHuntHostileState,
  newPools: Readonly<Record<string, number>>,
): FirstHuntHostileState {
  if (!isPool(newPools, hostile.attributes))
    throw new TypeError('Verified hostile pools are invalid');
  const next: FirstHuntHostileState = { ...hostile, currentPools: newPools };
  if (!hostile.gear) return next;

  const profile = HUNT_PROFILES.find((entry) =>
    entry.hostiles.some((unit) => unit.entityId === hostile.entityId),
  );
  if (!profile) throw new TypeError('Hostile gear profile is unavailable');
  validateFirstHuntHostileGear(worldId, profile, hostile, hostile.gear);
  const items = hostile.gear.items.map((item, index) =>
    index === 1
      ? { ...item, currentCondition: Math.min(hostile.armorCondition, newPools['armor']!) }
      : item,
  );
  const gear: FirstHuntHostileGearState = { ...hostile.gear, items };
  validateFirstHuntHostileGear(worldId, profile, { ...next, gear }, gear);
  return { ...next, gear };
}

/** Ground the stored gear after the caller verifies the terminal battle surrender. */
export function groundSurrenderedHostileGear(input: {
  readonly worldId: string;
  readonly profile: HuntProfile;
  readonly hostile: FirstHuntHostileState;
  readonly terminalSourceId: string;
  readonly location: AtLocation;
}): FirstHuntHostileState {
  const { hostile } = input;
  if (
    hostile.disposition !== 'surrendered' ||
    hostile.currentPools['health']! <= 0 ||
    !isEntityId(input.terminalSourceId) ||
    !isAtLocation(input.location)
  )
    throw new TypeError('Only a living surrendered hostile can drop gear');
  if (!hostile.gear) return hostile;
  validateFirstHuntHostileGear(input.worldId, input.profile, hostile, hostile.gear);
  if (hostile.gear.status === 'DROPPED') {
    if (hostile.gear.dropSourceId !== input.terminalSourceId)
      throw new TypeError('Hostile gear was already dropped by another terminal source');
    return hostile;
  }

  const containerId = deterministicId(hostile.gear.sourceId, input.terminalSourceId, 'ground');
  const totalWeight = hostile.gear.items.reduce((weight, item) => {
    const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === item.definitionId);
    if (!definition?.enabled) throw new TypeError('Hostile gear definition is unavailable');
    return weight + definition.weightG * item.quantity;
  }, 0);
  const container: PhysicalContainer = {
    containerId,
    kind: 'GROUND_BUNDLE',
    location: input.location,
    custodian: { kind: 'WORLD', id: input.worldId },
    carrier: null,
    capacityG: totalWeight,
    access: 'CUSTODIAN',
    closed: null,
  };
  const items = hostile.gear.items.map((item) => ({
    ...item,
    containerId,
    equipped: null,
  }));
  const gear: FirstHuntHostileGearState = {
    ...hostile.gear,
    status: 'DROPPED',
    dropSourceId: input.terminalSourceId,
    container,
    items,
  };
  validateFirstHuntHostileGear(input.worldId, input.profile, { ...hostile, gear }, gear);
  return { ...hostile, gear };
}

/** Strict stored-data validator; absent legacy gear is handled by the caller. */
export function validateFirstHuntHostileGear(
  worldId: string,
  profile: HuntProfile,
  hostileValue: unknown,
  value: unknown,
): asserts value is FirstHuntHostileGearState {
  if (!isRecord(hostileValue) || !isRecord(value))
    throw new TypeError('Hostile gear state is invalid');
  const hostileId = hostileValue['entityId'];
  const sourceId = value['sourceId'];
  const admissionId = value['admissionId'];
  const status = value['status'];
  const dropSourceId = value['dropSourceId'];
  const expectedGearKeys =
    status === 'DROPPED'
      ? ['schemaVersion', 'sourceId', 'admissionId', 'status', 'dropSourceId', 'container', 'items']
      : ['schemaVersion', 'sourceId', 'admissionId', 'status', 'container', 'items'];
  if (
    !exactKeys(value, expectedGearKeys) ||
    value['schemaVersion'] !== GEAR_SCHEMA_VERSION ||
    typeof hostileId !== 'string' ||
    typeof sourceId !== 'string' ||
    !isEntityId(admissionId) ||
    !['HELD', 'DROPPED'].includes(status as string) ||
    sourceId !== gearSourceId(worldId, admissionId, hostileId) ||
    !validDispositionAndPool(hostileValue) ||
    (status === 'DROPPED' && hostileValue['disposition'] !== 'surrendered')
  )
    throw new TypeError('Hostile gear identity or status is invalid');
  if (typeof sourceId !== 'string' || typeof hostileId !== 'string')
    throw new TypeError('Hostile gear identity is invalid');
  if (status === 'DROPPED' && !isEntityId(dropSourceId))
    throw new TypeError('Hostile gear drop source is invalid');
  const rawItems = value['items'];
  const expectedDefinitions = gearDefinitions(hostileValue as unknown as FirstHuntHostileState);
  if (!expectedDefinitions || !Array.isArray(rawItems) || rawItems.length !== 2)
    throw new TypeError('Hostile gear is outside the authored equipment source');

  const profileLocation = expectedLocation(profile);
  const itemDefinitions = expectedDefinitions.map((id) => {
    const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === id && entry.enabled);
    if (!definition) throw new TypeError('Hostile gear definition is unavailable');
    return definition;
  });
  const container = value['container'];
  if (!isRecord(container)) throw new TypeError('Hostile gear container is invalid');
  const expectedContainerId =
    status === 'HELD'
      ? deterministicId(sourceId, hostileId, 'container')
      : deterministicId(sourceId, dropSourceId as string, 'ground');
  const expectedKind = status === 'HELD' ? 'STATIC' : 'GROUND_BUNDLE';
  const containerLocation = profileLocation;
  if (
    !exactKeys(container, [
      'containerId',
      'kind',
      'location',
      'custodian',
      'carrier',
      'capacityG',
      'access',
      'closed',
    ]) ||
    container['containerId'] !== expectedContainerId ||
    container['kind'] !== expectedKind ||
    !isAtLocation(containerLocation) ||
    canonicalJson(container['location']) !== canonicalJson(containerLocation) ||
    !isWorldOwner(container['custodian'], worldId) ||
    container['carrier'] !== null ||
    container['capacityG'] !== itemDefinitions.reduce((sum, entry) => sum + entry.weightG, 0) ||
    container['access'] !== 'CUSTODIAN' ||
    container['closed'] !== null ||
    (status === 'HELD' ? dropSourceId !== undefined : !isEntityId(dropSourceId))
  )
    throw new TypeError('Hostile gear container does not match its retained source');

  const expectedItems = expectedDefinitions.map((definitionId, index) => {
    const item = rawItems[index];
    if (!isRecord(item)) throw new TypeError('Hostile gear item is invalid');
    const definition = itemDefinitions[index]!;
    const condition =
      index === 0
        ? hostileValue['weaponCondition']
        : Math.min(
            Number(hostileValue['armorCondition']),
            Number((hostileValue['currentPools'] as Record<string, unknown>)['armor']),
          );
    const maximumCondition = definition.maxArmor ?? 10000;
    if (
      !exactKeys(item, [
        'itemId',
        'definitionId',
        'owner',
        'containerId',
        'quantity',
        'currentCondition',
        'maximumCondition',
        'contentRevision',
        'provenance',
        'equipped',
        'tombstone',
      ]) ||
      item['itemId'] !== deterministicId(sourceId, hostileId, definitionId) ||
      item['definitionId'] !== definitionId ||
      !isWorldOwner(item['owner'], worldId) ||
      item['containerId'] !== expectedContainerId ||
      item['quantity'] !== 1 ||
      item['currentCondition'] !== condition ||
      item['maximumCondition'] !== maximumCondition ||
      item['contentRevision'] !== '0' ||
      !isRecord(item['provenance']) ||
      !exactKeys(item['provenance'], ['sourceId', 'parentItemId', 'ordinal']) ||
      item['provenance']['sourceId'] !== sourceId ||
      item['provenance']['parentItemId'] !== null ||
      item['provenance']['ordinal'] !== index ||
      item['equipped'] !== null ||
      item['tombstone'] !== null
    )
      throw new TypeError('Hostile gear item does not match its retained source');
    return item as unknown as ItemInstance;
  });
  if (new Set(expectedItems.map((item) => item.itemId)).size !== expectedItems.length)
    throw new TypeError('Hostile gear item IDs are not unique');
}

function createHostileGear(input: {
  readonly worldId: string;
  readonly hostile: FirstHuntHostileState;
  readonly encounterId: string;
  readonly location: AtLocation;
  readonly definitions: readonly [string, string];
}): FirstHuntHostileGearState {
  const sourceId = gearSourceId(input.worldId, input.encounterId, input.hostile.entityId);
  const containerId = deterministicId(sourceId, input.hostile.entityId, 'container');
  const definitions = input.definitions.map((id) => {
    const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === id && entry.enabled);
    if (!definition) throw new TypeError(`Authored hostile gear definition ${id} is unavailable`);
    return definition;
  });
  const container: PhysicalContainer = {
    containerId,
    kind: 'STATIC',
    location: input.location,
    custodian: { kind: 'WORLD', id: input.worldId },
    carrier: null,
    capacityG: definitions.reduce((sum, definition) => sum + definition.weightG, 0),
    access: 'CUSTODIAN',
    closed: null,
  };
  const items: ItemInstance[] = definitions.map((definition, ordinal) => ({
    itemId: deterministicId(sourceId, input.hostile.entityId, definition.id),
    definitionId: definition.id,
    owner: { kind: 'WORLD', id: input.worldId },
    containerId,
    quantity: 1,
    currentCondition:
      ordinal === 0
        ? input.hostile.weaponCondition
        : Math.min(input.hostile.armorCondition, input.hostile.currentPools['armor']!),
    maximumCondition: definition.maxArmor ?? 10000,
    contentRevision: '0',
    provenance: { sourceId, parentItemId: null, ordinal },
    equipped: null,
    tombstone: null,
  }));
  return {
    schemaVersion: GEAR_SCHEMA_VERSION,
    sourceId,
    admissionId: input.encounterId,
    status: 'HELD',
    container,
    items,
  };
}

function gearDefinitions(hostile: FirstHuntHostileState): readonly [string, string] | undefined {
  if (
    !Object.hasOwn(HUMANOID_GEAR_DEFINITIONS, hostile.weaponItemId) ||
    hostile.armorItemId !== 'padded-coat'
  )
    return undefined;
  return [
    HUMANOID_GEAR_DEFINITIONS[hostile.weaponItemId as keyof typeof HUMANOID_GEAR_DEFINITIONS],
    'padded-coat',
  ];
}

function gearSourceId(worldId: string, admissionId: string, hostileId: string): string {
  return deterministicId('first-hunt-hostile-gear-v1', worldId, admissionId, hostileId, 'source');
}

function deterministicId(...parts: readonly string[]): string {
  return JSON.stringify(parts);
}

function expectedLocation(profile: HuntProfile): AtLocation {
  return { kind: 'AT', ...profile.objectiveLocation };
}

function isAtLocation(value: unknown): value is AtLocation {
  return (
    isRecord(value) &&
    exactKeys(value, ['kind', 'siteId', 'areaId']) &&
    value['kind'] === 'AT' &&
    typeof value['siteId'] === 'string' &&
    typeof value['areaId'] === 'string'
  );
}

function isWorldOwner(value: unknown, worldId: string): boolean {
  return (
    isRecord(value) &&
    exactKeys(value, ['kind', 'id']) &&
    value['kind'] === 'WORLD' &&
    value['id'] === worldId
  );
}

function validDispositionAndPool(value: Record<string, unknown>): boolean {
  return (
    (value['disposition'] === undefined || value['disposition'] === 'surrendered') &&
    isRecord(value['currentPools']) &&
    Number.isSafeInteger(value['currentPools']['health']) &&
    (value['disposition'] !== 'surrendered' || Number(value['currentPools']['health']) > 0)
  );
}

function isPool(
  value: Readonly<Record<string, number>>,
  maximums: Readonly<Record<string, number>>,
): boolean {
  const keys = ['armor', 'health', 'morale', 'stamina'];
  return (
    Object.keys(value).toSorted().join('\0') === keys.join('\0') &&
    keys.every(
      (key) =>
        Number.isSafeInteger(value[key]) &&
        Number.isSafeInteger(maximums[key]) &&
        value[key]! >= 0 &&
        value[key]! <= maximums[key]!,
    )
  );
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).toSorted().join('\0') === [...keys].toSorted().join('\0');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
