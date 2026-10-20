import { isEncounterTacticalPreviewDto } from '@warwrit/protocol';
import type {
  EncounterControlGrantDto,
  EncounterCommandDto,
  EncounterCommandResponse,
  EncounterPublicProjectionDto,
  EncounterPublicUnitDto,
} from '@warwrit/protocol';

export interface EncounterRenderUnit extends EncounterPublicUnitDto {
  readonly worldX: number;
  readonly worldZ: number;
}

export interface EncounterRenderProjection {
  readonly encounterId: string;
  readonly revision: number;
  readonly status: EncounterPublicProjectionDto['status'];
  readonly round: number;
  readonly units: readonly EncounterRenderUnit[];
  readonly map?: EncounterPublicProjectionDto['map'];
}

export interface RenderUnitDelta {
  readonly added: readonly EncounterRenderUnit[];
  readonly removed: readonly string[];
  readonly moved: readonly {
    readonly id: string;
    readonly from: { readonly q: number; readonly r: number };
    readonly to: { readonly q: number; readonly r: number };
  }[];
  readonly updated: readonly EncounterRenderUnit[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const optionalUnitKeys = [
  'maximumHealth',
  'weaponId',
  'armor',
  'stamina',
  'morale',
  'guarding',
  'panicking',
  'threat',
  'weaponReach',
];
const unitStatuses = ['active', 'dead', 'retreated', 'surrendered'];
const weaponIds = ['bow', 'great-weapon', 'raider', 'spear', 'sword-shield', 'fists'];
const unitResourceKeys = ['armor', 'stamina', 'morale'] as const;
const unitBooleanKeys = ['guarding', 'panicking'] as const;

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function validUnitShape(value: Record<string, unknown>): boolean {
  const knownKeys = new Set(['id', 'sideId', 'q', 'r', 'health', 'status', ...optionalUnitKeys]);
  const { id, sideId, q, r, health, status } = value;
  return (
    Object.keys(value).length >= 6 &&
    Object.keys(value).every((key) => knownKeys.has(key)) &&
    typeof id === 'string' &&
    id.length > 0 &&
    typeof sideId === 'string' &&
    sideId.length > 0 &&
    isSafeInteger(q) &&
    isSafeInteger(r) &&
    isSafeInteger(health) &&
    health >= 0 &&
    unitStatuses.includes(String(status))
  );
}

function validUnitOptionalFields(value: Record<string, unknown>): boolean {
  if (Object.hasOwn(value, 'weaponId') && !weaponIds.includes(value['weaponId'] as string))
    return false;
  if (
    unitResourceKeys.some(
      (key) =>
        Object.hasOwn(value, key) && (!isSafeInteger(value[key]) || (value[key] as number) < 0),
    )
  )
    return false;
  return unitBooleanKeys.every(
    (key) => !Object.hasOwn(value, key) || typeof value[key] === 'boolean',
  );
}

function readUnitThreat(value: Record<string, unknown>): {
  readonly valid: boolean;
  readonly value?: EncounterPublicUnitDto['threat'];
} {
  if (!Object.hasOwn(value, 'threat')) return { valid: true };
  const threat = value['threat'];
  if (threat === null) return { valid: true, value: null };
  if (
    !isRecord(threat) ||
    Object.keys(threat).length !== 3 ||
    typeof threat['targetId'] !== 'string' ||
    typeof threat['responseReceived'] !== 'boolean' ||
    !readDamageRange(threat['damage'])
  )
    return { valid: false };
  return {
    valid: true,
    value: {
      targetId: threat['targetId'],
      damage: { ...threat['damage'] },
      responseReceived: threat['responseReceived'],
    },
  };
}

function readUnitWeaponReach(value: Record<string, unknown>): {
  readonly valid: boolean;
  readonly value?: EncounterPublicUnitDto['weaponReach'];
} {
  if (!Object.hasOwn(value, 'weaponReach')) return { valid: true };
  const reach = value['weaponReach'];
  if (
    !isRecord(reach) ||
    Object.keys(reach).length !== 3 ||
    !isSafeInteger(reach['minimumRange']) ||
    !isSafeInteger(reach['maximumRange']) ||
    reach['minimumRange'] < 0 ||
    reach['maximumRange'] < reach['minimumRange'] ||
    !Array.isArray(reach['cells'])
  )
    return { valid: false };
  const cells = readCoordinateList(reach['cells']);
  if (!cells) return { valid: false };
  return {
    valid: true,
    value: { minimumRange: reach['minimumRange'], maximumRange: reach['maximumRange'], cells },
  };
}

function readUnit(value: unknown): EncounterPublicUnitDto | undefined {
  if (!isRecord(value) || !validUnitShape(value) || !validUnitOptionalFields(value))
    return undefined;
  const { id, sideId, q, r, health, maximumHealth, status } = value;
  const threat = readUnitThreat(value);
  const weaponReach = readUnitWeaponReach(value);
  if (!threat.valid || !weaponReach.valid) return undefined;
  const resources = Object.fromEntries(
    unitResourceKeys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]),
  );
  return Object.freeze({
    id: id as string,
    sideId: sideId as string,
    q: q as number,
    r: r as number,
    health: health as number,
    ...(isSafeInteger(maximumHealth) && maximumHealth > 0 && maximumHealth >= (health as number)
      ? { maximumHealth }
      : {}),
    ...(Object.hasOwn(value, 'weaponId')
      ? { weaponId: value['weaponId'] as NonNullable<EncounterPublicUnitDto['weaponId']> }
      : {}),
    ...resources,
    ...(Object.hasOwn(value, 'guarding') ? { guarding: value['guarding'] as boolean } : {}),
    ...(Object.hasOwn(value, 'panicking') ? { panicking: value['panicking'] as boolean } : {}),
    ...(threat.value === undefined ? {} : { threat: threat.value }),
    ...(weaponReach.value ? { weaponReach: weaponReach.value } : {}),
    status: status as EncounterPublicUnitDto['status'],
  });
}

function readDamageRange(value: unknown): value is { minimum: number; maximum: number } {
  return (
    isRecord(value) &&
    Object.keys(value).length === 2 &&
    isSafeInteger(value['minimum']) &&
    isSafeInteger(value['maximum']) &&
    value['minimum'] >= 0 &&
    value['maximum'] >= value['minimum']
  );
}

function readCoordinateList(
  value: readonly unknown[],
): readonly { q: number; r: number }[] | undefined {
  const result: { q: number; r: number }[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      Object.keys(entry).length !== 2 ||
      !isSafeInteger(entry['q']) ||
      !isSafeInteger(entry['r'])
    )
      return undefined;
    const hex = { q: entry['q'], r: entry['r'] };
    const key = `${hex.q},${hex.r}`;
    if (seen.has(key)) return undefined;
    seen.add(key);
    result.push(Object.freeze(hex));
  }
  return Object.freeze(result);
}

const projectionKeys = [
  'version',
  'encounterId',
  'revision',
  'status',
  'round',
  'activationId',
  'actorUnitId',
  'deadlineAt',
  'units',
  'map',
  'initiativeOrder',
  'turnIndex',
  'nextRoundInitiative',
  'outcome',
] as const;
const optionalProjectionKeys = new Set([
  'initiativeOrder',
  'turnIndex',
  'nextRoundInitiative',
  'outcome',
]);

function validProjectionShape(value: Record<string, unknown>): boolean {
  const hasMap = Object.hasOwn(value, 'map');
  const requiredKeys = projectionKeys.filter(
    (key) => !optionalProjectionKeys.has(key) && (key !== 'map' || hasMap),
  );
  return (
    Object.keys(value).every((key) => (projectionKeys as readonly string[]).includes(key)) &&
    requiredKeys.every((key) => key in value)
  );
}

function validProjectionIdentity(value: Record<string, unknown>, expected?: string): boolean {
  return (
    value['version'] === 1 &&
    typeof value['encounterId'] === 'string' &&
    (expected === undefined || value['encounterId'] === expected)
  );
}

function validProjectionTurn(value: Record<string, unknown>): boolean {
  return (
    isSafeInteger(value['revision']) &&
    ['active', 'resolved'].includes(String(value['status'])) &&
    isSafeInteger(value['round']) &&
    (value['activationId'] === null || typeof value['activationId'] === 'string') &&
    (value['actorUnitId'] === null || typeof value['actorUnitId'] === 'string') &&
    (value['deadlineAt'] === null || typeof value['deadlineAt'] === 'string') &&
    Array.isArray(value['units'])
  );
}

function validInitiativeOrder(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every((id) => typeof id === 'string') &&
      new Set(value).size === value.length)
  );
}

function validTurnIndex(value: unknown, order: unknown): boolean {
  return (
    value === undefined ||
    (isSafeInteger(value) && value >= 0 && (!Array.isArray(order) || value < order.length))
  );
}

function validNextRound(value: unknown): boolean {
  return (
    value === undefined ||
    (isRecord(value) &&
      Object.keys(value).length === 2 &&
      isSafeInteger(value['round']) &&
      Array.isArray(value['unitIds']) &&
      value['unitIds'].every((id) => typeof id === 'string') &&
      new Set(value['unitIds']).size === value['unitIds'].length)
  );
}

function validOutcome(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (isRecord(value) &&
      Object.keys(value).length === 2 &&
      ['last-side-standing', 'round-limit'].includes(String(value['reason'])) &&
      (value['winnerSideId'] === null || typeof value['winnerSideId'] === 'string'))
  );
}

function copyProjectionUnits(
  value: readonly unknown[],
): readonly EncounterPublicUnitDto[] | undefined {
  const units: EncounterPublicUnitDto[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    const unit = readUnit(item);
    if (!unit || ids.has(unit.id)) return undefined;
    ids.add(unit.id);
    units.push(unit);
  }
  return Object.freeze(units);
}

function copyProjectionOutcome(
  value: unknown,
): EncounterPublicProjectionDto['outcome'] | undefined {
  if (value === undefined || value === null) return value;
  const outcome = value as {
    reason: 'last-side-standing' | 'round-limit';
    winnerSideId: string | null;
  };
  return { reason: outcome.reason, winnerSideId: outcome.winnerSideId };
}

/** Strictly copy only the approved public projection fields into detached immutable values. */
export function readEncounterProjection(
  value: unknown,
  expectedEncounterId?: string,
): EncounterPublicProjectionDto | undefined {
  if (
    !isRecord(value) ||
    !validProjectionShape(value) ||
    !validProjectionIdentity(value, expectedEncounterId) ||
    !validProjectionTurn(value)
  )
    return undefined;
  const hasMap = Object.hasOwn(value, 'map');
  const map = hasMap ? readPublicMap(value['map']) : undefined;
  if (hasMap && !map) return undefined;
  const initiativeOrder = value['initiativeOrder'];
  const turnIndex = value['turnIndex'];
  const nextRound = value['nextRoundInitiative'];
  const outcome = value['outcome'];
  if (
    !validInitiativeOrder(initiativeOrder) ||
    !validTurnIndex(turnIndex, initiativeOrder) ||
    !validNextRound(nextRound) ||
    !validOutcome(outcome)
  )
    return undefined;
  const units = copyProjectionUnits(value['units'] as readonly unknown[]);
  if (!units) return undefined;
  const outcomeValue = copyProjectionOutcome(outcome);

  return Object.freeze({
    version: 1,
    encounterId: value['encounterId'] as string,
    revision: value['revision'] as number,
    status: value['status'] as EncounterPublicProjectionDto['status'],
    round: value['round'] as number,
    activationId: value['activationId'] as string | null,
    actorUnitId: value['actorUnitId'] as string | null,
    deadlineAt: value['deadlineAt'] as string | null,
    ...(initiativeOrder
      ? { initiativeOrder: Object.freeze([...(initiativeOrder as string[])]) }
      : {}),
    ...(turnIndex !== undefined ? { turnIndex: turnIndex as number } : {}),
    ...(nextRound
      ? {
          nextRoundInitiative: Object.freeze({
            round: (nextRound as { round: number }).round,
            unitIds: Object.freeze([...(nextRound as { unitIds: string[] }).unitIds]),
          }),
        }
      : {}),
    ...(outcomeValue === undefined ? {} : { outcome: outcomeValue }),
    units,
    ...(map ? { map } : {}),
  });
}

function readPublicMap(value: unknown): EncounterPublicProjectionDto['map'] | undefined {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !['hexes', 'blocked', 'tiles'].includes(key)) ||
    !Array.isArray(value['hexes']) ||
    !Array.isArray(value['blocked'])
  )
    return undefined;
  const hexes = value['hexes'];
  const blocked = value['blocked'];
  const readCoordinates = (values: readonly unknown[]) => {
    const result: { q: number; r: number }[] = [];
    const seen = new Set<string>();
    let previous: { q: number; r: number } | undefined;
    for (const entry of values) {
      if (
        !isRecord(entry) ||
        Object.keys(entry).length !== 2 ||
        !isSafeInteger(entry['q']) ||
        !isSafeInteger(entry['r'])
      )
        return undefined;
      const coordinate = { q: entry['q'], r: entry['r'] };
      const key = `${coordinate.q},${coordinate.r}`;
      if (
        seen.has(key) ||
        (previous &&
          (coordinate.q < previous.q ||
            (coordinate.q === previous.q && coordinate.r <= previous.r)))
      )
        return undefined;
      seen.add(key);
      result.push(Object.freeze(coordinate));
      previous = coordinate;
    }
    return { values: Object.freeze(result), keys: seen };
  };
  const parsedHexes = readCoordinates(hexes);
  const parsedBlocked = readCoordinates(blocked);
  if (
    !parsedHexes ||
    !parsedBlocked ||
    parsedBlocked.values.some(({ q, r }) => !parsedHexes.keys.has(`${q},${r}`))
  )
    return undefined;
  let tiles: NonNullable<EncounterPublicProjectionDto['map']>['tiles'];
  if (Object.hasOwn(value, 'tiles')) {
    if (!Array.isArray(value['tiles'])) return undefined;
    const copied: NonNullable<NonNullable<EncounterPublicProjectionDto['map']>['tiles']>[number][] =
      [];
    for (const tile of value['tiles']) {
      if (
        !isRecord(tile) ||
        Object.keys(tile).length !== 4 ||
        !isSafeInteger(tile['q']) ||
        !isSafeInteger(tile['r']) ||
        !isSafeInteger(tile['height']) ||
        ![0, 1, 2].includes(tile['height']) ||
        !['plain', 'mud', 'fire'].includes(String(tile['terrain']))
      )
        return undefined;
      copied.push({
        q: tile['q'],
        r: tile['r'],
        height: tile['height'] as 0 | 1 | 2,
        terrain: tile['terrain'] as 'plain' | 'mud' | 'fire',
      });
    }
    tiles = Object.freeze(copied);
  }
  return Object.freeze({
    hexes: parsedHexes.values,
    blocked: parsedBlocked.values,
    ...(tiles ? { tiles } : {}),
  });
}

/** Colyseus array fields decode to iterable ArraySchema objects, not plain arrays. */
function copyRoomMap(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const copyHexes = (hexes: unknown) =>
    hexes !== null && typeof hexes === 'object' && Symbol.iterator in hexes
      ? Array.from(hexes as Iterable<unknown>, (hex) =>
          isRecord(hex) ? { q: hex['q'], r: hex['r'] } : hex,
        )
      : hexes;
  const tiles =
    value['tiles'] !== null &&
    typeof value['tiles'] === 'object' &&
    Symbol.iterator in value['tiles']
      ? Array.from(value['tiles'] as Iterable<unknown>, (tile) =>
          isRecord(tile)
            ? { q: tile['q'], r: tile['r'], height: tile['height'], terrain: tile['terrain'] }
            : tile,
        )
      : value['tiles'];
  return {
    hexes: copyHexes(value['hexes']),
    blocked: copyHexes(value['blocked']),
    ...(tiles === undefined ? {} : { tiles }),
  };
}

function entriesOfUnits(value: unknown): readonly [string, unknown][] | undefined {
  if (value instanceof Map) return [...value.entries()].map(([key, unit]) => [String(key), unit]);
  if (!isRecord(value)) return undefined;
  const entries: [string, unknown][] = [];
  if (typeof value['forEach'] === 'function') {
    (value['forEach'] as (callback: (unit: unknown, id: unknown) => void) => void)((unit, id) =>
      entries.push([String(id), unit]),
    );
    return entries;
  }
  return Object.entries(value);
}

function copyRoomUnit(key: string, raw: unknown): Record<string, unknown> | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    id: raw['id'] ?? key,
    sideId: raw['sideId'],
    ...(raw['weaponId'] === undefined || raw['weaponId'] === ''
      ? {}
      : { weaponId: raw['weaponId'] }),
    q: raw['q'],
    r: raw['r'],
    health: raw['health'],
    maximumHealth: raw['maximumHealth'],
    ...(raw['armor'] === undefined ? {} : { armor: raw['armor'] }),
    ...(raw['stamina'] === undefined ? {} : { stamina: raw['stamina'] }),
    ...(raw['morale'] === undefined ? {} : { morale: raw['morale'] }),
    ...(raw['guarding'] === undefined ? {} : { guarding: raw['guarding'] }),
    ...(raw['panicking'] === undefined ? {} : { panicking: raw['panicking'] }),
    ...(raw['threatTargetId']
      ? {
          threat: {
            targetId: raw['threatTargetId'],
            damage: { minimum: raw['threatDamageMinimum'], maximum: raw['threatDamageMaximum'] },
            responseReceived: raw['threatResponseReceived'],
          },
        }
      : {}),
    ...(typeof raw['weaponReachMaximum'] === 'number' && raw['weaponReachMaximum'] > 0
      ? {
          weaponReach: {
            minimumRange: raw['weaponReachMinimum'],
            maximumRange: raw['weaponReachMaximum'],
            cells:
              raw['weaponReachCells'] !== null &&
              typeof raw['weaponReachCells'] === 'object' &&
              Symbol.iterator in raw['weaponReachCells']
                ? Array.from(raw['weaponReachCells'] as Iterable<unknown>, (cell) =>
                    isRecord(cell) ? { q: cell['q'], r: cell['r'] } : cell,
                  )
                : raw['weaponReachCells'],
          },
        }
      : {}),
    status: raw['status'],
  };
}

function copyRoomUnits(
  entries: readonly [string, unknown][],
): readonly Record<string, unknown>[] | undefined {
  const units: Record<string, unknown>[] = [];
  for (const [key, raw] of entries) {
    const unit = copyRoomUnit(key, raw);
    if (!unit) return undefined;
    units.push(unit);
  }
  return units;
}

function nullableRoomString(value: Record<string, unknown>, field: string) {
  return value[field] === '' ? null : (value[field] ?? null);
}

/** Convert a reflected Colyseus room state into the same detached public DTO shape. */
export function readRoomProjection(
  value: unknown,
  expectedEncounterId: string,
): EncounterPublicProjectionDto | undefined {
  if (!isRecord(value)) return undefined;
  const entries = entriesOfUnits(value['units']);
  if (!entries) return undefined;
  const units = copyRoomUnits(entries);
  if (!units) return undefined;
  const hasMap = Object.hasOwn(value, 'map');
  const map = hasMap ? readPublicMap(copyRoomMap(value['map'])) : undefined;
  if (hasMap && !map) return undefined;
  return readEncounterProjection(
    {
      version: value['version'],
      encounterId: value['encounterId'],
      revision: value['revision'],
      status: value['status'],
      round: value['round'],
      activationId: nullableRoomString(value, 'activationId'),
      actorUnitId: nullableRoomString(value, 'actorUnitId'),
      initiativeOrder: copyRoomStringArray(value['initiativeOrder']),
      turnIndex: value['turnIndex'],
      ...(typeof value['nextRound'] === 'number' && value['nextRound'] > 0
        ? {
            nextRoundInitiative: {
              round: value['nextRound'],
              unitIds: copyRoomStringArray(value['nextRoundUnitIds']),
            },
          }
        : {}),
      deadlineAt: nullableRoomString(value, 'deadlineAt'),
      ...(Object.hasOwn(value, 'outcomeReason')
        ? {
            outcome: value['outcomeReason']
              ? {
                  reason: value['outcomeReason'],
                  winnerSideId: nullableRoomString(value, 'winnerSideId'),
                }
              : null,
          }
        : {}),
      units,
      ...(map ? { map } : {}),
    },
    expectedEncounterId,
  );
}

function copyRoomStringArray(value: unknown): unknown {
  return value !== null && typeof value === 'object' && Symbol.iterator in value
    ? Array.from(value as Iterable<unknown>)
    : value;
}

/** Map axial q/r coordinates to a neutral flat scene plane. */
export function toEncounterRenderProjection(
  projection: EncounterPublicProjectionDto,
): EncounterRenderProjection {
  return Object.freeze({
    encounterId: projection.encounterId,
    revision: projection.revision,
    status: projection.status,
    round: projection.round,
    units: Object.freeze(
      projection.units.map((unit) =>
        Object.freeze({
          ...unit,
          worldX: unit.q + unit.r * 0.5,
          worldZ: unit.r * Math.sqrt(3) * 0.5,
        }),
      ),
    ),
    ...(projection.map ? { map: projection.map } : {}),
  });
}

function validResumeControl(
  value: Record<string, unknown>,
  hasSelfAfk: boolean,
  hasResumeEpoch: boolean,
): boolean {
  return !(
    (hasSelfAfk && typeof value['selfAfk'] !== 'boolean') ||
    (hasResumeEpoch &&
      value['resumeRequestedAfterEpoch'] !== null &&
      (!isSafeInteger(value['resumeRequestedAfterEpoch']) ||
        (value['resumeRequestedAfterEpoch'] as number) < 0))
  );
}

function readActorActions(
  value: unknown,
  ids: unknown,
): EncounterControlGrantDto['actorActions'] | null {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 3 ||
    typeof value['activationId'] !== 'string' ||
    typeof value['actorId'] !== 'string' ||
    !Array.isArray(ids) ||
    !ids.includes(value['actorId']) ||
    !Array.isArray(value['permittedIntents']) ||
    !value['permittedIntents'].every((intent) =>
      ['move', 'attack', 'defend', 'wait', 'retreat', 'flee', 'surrender', 'autoplay'].includes(
        intent,
      ),
    ) ||
    new Set(value['permittedIntents']).size !== value['permittedIntents'].length ||
    !value['permittedIntents'].includes('wait')
  )
    return null;
  return Object.freeze({
    activationId: value['activationId'],
    actorId: value['actorId'],
    permittedIntents: Object.freeze([...value['permittedIntents']]),
  }) as EncounterControlGrantDto['actorActions'];
}

export function readEncounterControlGrant(
  value: unknown,
  expectedEncounterId: string,
): EncounterControlGrantDto | undefined {
  if (!isRecord(value)) return undefined;
  const ids = value['controllableUnitIds'];
  const hasSelfAfk = Object.hasOwn(value, 'selfAfk');
  const hasResumeEpoch = Object.hasOwn(value, 'resumeRequestedAfterEpoch');
  const actorActions = readActorActions(value['actorActions'], ids);
  const hasTactical = Object.hasOwn(value, 'tactical');
  const tactical = readTacticalGrant(value['tactical'], actorActions);
  if (hasTactical && !tactical) return undefined;

  if (
    Object.keys(value).length !==
      4 +
        Number(hasSelfAfk) +
        Number(hasResumeEpoch) +
        Number(actorActions !== undefined) +
        Number(hasTactical) ||
    hasSelfAfk !== hasResumeEpoch ||
    actorActions === null ||
    Object.keys(value).some(
      (key) =>
        ![
          'version',
          'encounterId',
          'revision',
          'controllableUnitIds',
          'selfAfk',
          'actorActions',
          'tactical',
          'resumeRequestedAfterEpoch',
        ].includes(key),
    ) ||
    value['version'] !== 1 ||
    value['encounterId'] !== expectedEncounterId ||
    !isSafeInteger(value['revision']) ||
    !Array.isArray(ids) ||
    ids.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(ids).size !== ids.length ||
    !validResumeControl(value, hasSelfAfk, hasResumeEpoch)
  )
    return undefined;
  return Object.freeze({
    version: 1,
    encounterId: expectedEncounterId,
    revision: value['revision'],
    controllableUnitIds: Object.freeze([...ids]) as readonly string[],
    ...(actorActions ? { actorActions } : {}),
    ...(tactical ? { tactical } : {}),
    ...(hasSelfAfk ? { selfAfk: value['selfAfk'] as boolean } : {}),
    ...(hasResumeEpoch
      ? { resumeRequestedAfterEpoch: value['resumeRequestedAfterEpoch'] as number | null }
      : {}),
  });
}

/** Accept only the exact receipt response for the command just sent. */
export function readEncounterCommandResponse(
  value: unknown,
  command: EncounterCommandDto,
): EncounterCommandResponse | undefined {
  if (!isRecord(value) || value['version'] !== 1 || value['commandId'] !== command.commandId)
    return undefined;
  if (
    value['status'] === 'accepted' &&
    Object.keys(value).length === 6 &&
    value['encounterId'] === command.encounterId &&
    typeof value['receiptId'] === 'string' &&
    value['receiptId'].length > 0 &&
    isSafeInteger(value['revision']) &&
    value['revision'] >= command.expectedRevision
  )
    return value as unknown as EncounterCommandResponse;
  if (
    value['status'] === 'rejected' &&
    Object.keys(value).length === 4 &&
    ['NOT_FOUND', 'CONFLICT', 'UNAUTHORIZED', 'INVALID_COMMAND'].includes(String(value['code']))
  )
    return value as unknown as EncounterCommandResponse;
  return undefined;
}

export function selectableUnitIds(
  projection: EncounterPublicProjectionDto,
  grant: EncounterControlGrantDto | undefined,
): readonly string[] {
  if (
    !grant ||
    grant.encounterId !== projection.encounterId ||
    grant.revision !== projection.revision
  )
    return Object.freeze([]);
  const visible = new Set(projection.units.map((unit) => unit.id));
  return Object.freeze(grant.controllableUnitIds.filter((id) => visible.has(id)));
}

export function retainedSelection(
  selectedUnitId: string | null,
  projection: EncounterPublicProjectionDto,
  grant: EncounterControlGrantDto | undefined,
): string | null {
  return selectedUnitId !== null && selectableUnitIds(projection, grant).includes(selectedUnitId)
    ? selectedUnitId
    : null;
}

export function canIssueEncounterIntent(
  projection: EncounterPublicProjectionDto,
  grant: EncounterControlGrantDto | undefined,
  selectedUnitId: string | null,
): boolean {
  const actorUnitId = projection.actorUnitId;
  const actorUnit = projection.units.find((unit) => unit.id === actorUnitId);
  return (
    projection.status === 'active' &&
    actorUnitId !== null &&
    actorUnit?.status === 'active' &&
    grant?.selfAfk !== true &&
    selectedUnitId === actorUnitId &&
    selectableUnitIds(projection, grant).includes(actorUnitId)
  );
}

export function diffRenderUnits(
  previous: readonly EncounterRenderUnit[],
  next: readonly EncounterRenderUnit[],
): RenderUnitDelta {
  const oldById = new Map(previous.map((unit) => [unit.id, unit]));
  const newById = new Map(next.map((unit) => [unit.id, unit]));
  const added: EncounterRenderUnit[] = [];
  const removed: string[] = [];
  const moved: RenderUnitDelta['moved'][number][] = [];
  const updated: EncounterRenderUnit[] = [];

  for (const unit of next) {
    const old = oldById.get(unit.id);
    if (!old) {
      added.push(unit);
      continue;
    }
    if (old.q !== unit.q || old.r !== unit.r) {
      moved.push({ id: unit.id, from: { q: old.q, r: old.r }, to: { q: unit.q, r: unit.r } });
    }
    if (
      old.sideId !== unit.sideId ||
      old.health !== unit.health ||
      old.maximumHealth !== unit.maximumHealth ||
      old.status !== unit.status
    )
      updated.push(unit);
  }
  for (const unit of previous) if (!newById.has(unit.id)) removed.push(unit.id);
  return Object.freeze({
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    moved: Object.freeze(moved.map((item) => Object.freeze(item))),
    updated: Object.freeze(updated),
  });
}

/** Private condition hint only; ordinary costs, targets and server authority still apply. */
export function encounterConditionAllows(
  grant: EncounterControlGrantDto | undefined,
  activationId: string | null | undefined,
  actorId: string | null | undefined,
  intent: EncounterCommandDto['intent']['type'],
): boolean {
  const actions = grant?.actorActions;
  if (!actions) return true;
  return (
    actions.activationId === activationId &&
    actions.actorId === actorId &&
    actions.permittedIntents.some((permitted) => permitted === intent)
  );
}

function readTacticalGrant(
  value: unknown,
  actions: EncounterControlGrantDto['actorActions'] | null,
): EncounterControlGrantDto['tactical'] {
  if (!isEncounterTacticalPreviewDto(value) || !actions) return undefined;
  if (value.activationId !== actions.activationId || value.actorId !== actions.actorId)
    return undefined;
  return structuredClone(value);
}
