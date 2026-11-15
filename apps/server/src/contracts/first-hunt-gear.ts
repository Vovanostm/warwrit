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
    item.definitionId === gearDefinitions(hostile)?.[1]
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
  readonly terminalRevision: number;
  readonly location: AtLocation;
}): FirstHuntHostileState {
  const { hostile } = input;
  if (
    hostile.disposition !== 'surrendered' ||
    hostile.currentPools['health']! <= 0 ||
    !isEntityId(input.terminalSourceId) ||
    !Number.isSafeInteger(input.terminalRevision) ||
    input.terminalRevision < 0 ||
    !isAtLocation(input.location)
  )
    throw new TypeError('Only a living surrendered hostile can drop gear');
  if (!hostile.gear) return hostile;
  validateFirstHuntHostileGear(input.worldId, input.profile, hostile, hostile.gear);
  if (hostile.gear.status === 'DROPPED') {
    if (
      hostile.gear.dropSourceId !== input.terminalSourceId ||
      hostile.gear.terminalRevision !== input.terminalRevision
    )
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
    terminalSourceId: input.terminalSourceId,
    terminalRevision: input.terminalRevision,
    container,
    items,
  };
  validateFirstHuntHostileGear(input.worldId, input.profile, { ...hostile, gear }, gear);
  return { ...hostile, gear };
}

/** Attach the verified terminal boundary to retained gear, including dead-hostile gear. */
export function recordHostileGearTerminal(input: {
  readonly worldId: string;
  readonly profile: HuntProfile;
  readonly hostile: FirstHuntHostileState;
  readonly terminalSourceId: string;
  readonly terminalRevision: number;
}): FirstHuntHostileState {
  if (!input.hostile.gear) return input.hostile;
  if (
    (input.hostile.currentPools['health'] !== 0 && input.hostile.disposition !== 'surrendered') ||
    !isEntityId(input.terminalSourceId) ||
    !Number.isSafeInteger(input.terminalRevision) ||
    input.terminalRevision < 0
  )
    throw new TypeError('Hostile gear terminal identity is invalid');
  validateFirstHuntHostileGear(input.worldId, input.profile, input.hostile, input.hostile.gear);
  const gear: FirstHuntHostileGearState = {
    ...input.hostile.gear,
    terminalSourceId: input.terminalSourceId,
    terminalRevision: input.terminalRevision,
  };
  validateFirstHuntHostileGear(input.worldId, input.profile, { ...input.hostile, gear }, gear);
  return { ...input.hostile, gear };
}

/** Remove claimed physical instances from the world source while retaining their IDs. */
export function claimHostileGearItems(input: {
  readonly worldId: string;
  readonly profile: HuntProfile;
  readonly hostile: FirstHuntHostileState;
  readonly itemIds: readonly string[];
  readonly terminalSourceId: string;
  readonly terminalRevision: number;
}): FirstHuntHostileState {
  const { hostile } = input;
  const gear = hostile.gear;
  if (
    !gear ||
    (hostile.currentPools['health'] !== 0 && hostile.disposition !== 'surrendered') ||
    gear.terminalSourceId !== input.terminalSourceId ||
    gear.terminalRevision !== input.terminalRevision ||
    input.itemIds.length === 0 ||
    new Set(input.itemIds).size !== input.itemIds.length
  )
    throw new TypeError('Hostile gear is not available from this verified outcome');
  validateFirstHuntHostileGear(input.worldId, input.profile, hostile, gear);
  const selected = new Set(input.itemIds);
  if (input.itemIds.some((id) => !gear.items.some((item) => item.itemId === id)))
    throw new TypeError('Hostile gear item is already claimed or unavailable');
  const nextGear: FirstHuntHostileGearState = {
    ...gear,
    items: gear.items.filter((item) => !selected.has(item.itemId)),
    claimedItemIds: [...(gear.claimedItemIds ?? []), ...input.itemIds].toSorted(),
  };
  validateFirstHuntHostileGear(
    input.worldId,
    input.profile,
    { ...hostile, gear: nextGear },
    nextGear,
  );
  return { ...hostile, gear: nextGear };
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
  const terminalSourceId = value['terminalSourceId'];
  const terminalRevision = value['terminalRevision'];
  const claimedItemIds = value['claimedItemIds'] ?? [];
  const optionalKeys = [
    ...(status === 'DROPPED' ? ['dropSourceId'] : []),
    ...(terminalSourceId === undefined ? [] : ['terminalSourceId', 'terminalRevision']),
    ...(value['claimedItemIds'] === undefined ? [] : ['claimedItemIds']),
  ];
  const expectedGearKeys = [
    'schemaVersion',
    'sourceId',
    'admissionId',
    'status',
    ...optionalKeys,
    'container',
    'items',
  ];
  if (
    !exactKeys(value, expectedGearKeys) ||
    value['schemaVersion'] !== GEAR_SCHEMA_VERSION ||
    typeof hostileId !== 'string' ||
    typeof sourceId !== 'string' ||
    !isEntityId(admissionId) ||
    !['HELD', 'DROPPED'].includes(status as string) ||
    (terminalSourceId !== undefined &&
      (!isEntityId(terminalSourceId) ||
        typeof terminalRevision !== 'number' ||
        !Number.isSafeInteger(terminalRevision) ||
        terminalRevision < 0)) ||
    (terminalSourceId === undefined && terminalRevision !== undefined) ||
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
  if (
    !expectedDefinitions ||
    !Array.isArray(rawItems) ||
    !Array.isArray(claimedItemIds) ||
    claimedItemIds.some((id) => typeof id !== 'string')
  )
    throw new TypeError('Hostile gear is outside the authored equipment source');

  const allItemIds = expectedDefinitions.map((definitionId) =>
    deterministicId(sourceId, hostileId, definitionId),
  );
  if (
    new Set(claimedItemIds).size !== claimedItemIds.length ||
    claimedItemIds.some((id) => !allItemIds.includes(id)) ||
    rawItems.length + claimedItemIds.length !== allItemIds.length
  )
    throw new TypeError('Hostile gear claimed-item set is invalid');

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

  const expectedItems = expectedDefinitions.flatMap((definitionId, index) => {
    const itemId = allItemIds[index]!;
    if (claimedItemIds.includes(itemId)) return [];
    const item = rawItems.find((entry) => isRecord(entry) && entry['itemId'] === itemId);
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
      item['itemId'] !== itemId ||
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
    return [item as unknown as ItemInstance];
  });
  if (
    new Set(expectedItems.map((item) => item.itemId)).size !== expectedItems.length ||
    rawItems.length !== expectedItems.length
  )
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
