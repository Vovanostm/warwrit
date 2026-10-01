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

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function readUnit(value: unknown): EncounterPublicUnitDto | undefined {
  if (!isRecord(value)) return undefined;
  const { id, sideId, q, r, health, status } = value;
  if (
    Object.keys(value).length !== 6 ||
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof sideId !== 'string' ||
    sideId.length === 0 ||
    !isSafeInteger(q) ||
    !isSafeInteger(r) ||
    !isSafeInteger(health) ||
    !['active', 'dead', 'retreated'].includes(String(status))
  )
    return undefined;
  return Object.freeze({
    id,
    sideId,
    q,
    r,
    health,
    status: status as EncounterPublicUnitDto['status'],
  });
}

/** Strictly copy only the approved public projection fields into detached immutable values. */
export function readEncounterProjection(
  value: unknown,
  expectedEncounterId?: string,
): EncounterPublicProjectionDto | undefined {
  if (!isRecord(value)) return undefined;
  const allowedKeys = [
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
  ];
  const hasMap = Object.hasOwn(value, 'map');
  const units = value['units'];
  if (
    Object.keys(value).length !== allowedKeys.length - Number(!hasMap) ||
    allowedKeys.filter((key) => key !== 'map' || hasMap).some((key) => !(key in value)) ||
    value['version'] !== 1 ||
    typeof value['encounterId'] !== 'string' ||
    (expectedEncounterId !== undefined && value['encounterId'] !== expectedEncounterId) ||
    !isSafeInteger(value['revision']) ||
    !['active', 'resolved'].includes(String(value['status'])) ||
    !isSafeInteger(value['round']) ||
    !(value['activationId'] === null || typeof value['activationId'] === 'string') ||
    !(value['actorUnitId'] === null || typeof value['actorUnitId'] === 'string') ||
    !(value['deadlineAt'] === null || typeof value['deadlineAt'] === 'string') ||
    !Array.isArray(units)
  )
    return undefined;

  const map = hasMap ? readPublicMap(value['map']) : undefined;
  if (hasMap && !map) return undefined;

  const copiedUnits: EncounterPublicUnitDto[] = [];
  const ids = new Set<string>();
  for (const item of units) {
    const unit = readUnit(item);
    if (!unit || ids.has(unit.id)) return undefined;
    ids.add(unit.id);
    copiedUnits.push(unit);
  }

  return Object.freeze({
    version: 1,
    encounterId: value['encounterId'],
    revision: value['revision'],
    status: value['status'] as EncounterPublicProjectionDto['status'],
    round: value['round'],
    activationId: value['activationId'],
    actorUnitId: value['actorUnitId'],
    deadlineAt: value['deadlineAt'],
    units: Object.freeze(copiedUnits),
    ...(map ? { map } : {}),
  });
}

function readPublicMap(value: unknown): EncounterPublicProjectionDto['map'] | undefined {
  if (!isRecord(value) || Object.keys(value).length !== 2) return undefined;
  const hexes = value['hexes'];
  const blocked = value['blocked'];
  if (!Array.isArray(hexes) || !Array.isArray(blocked)) return undefined;
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
  return Object.freeze({ hexes: parsedHexes.values, blocked: parsedBlocked.values });
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

/** Convert a reflected Colyseus room state into the same detached public DTO shape. */
export function readRoomProjection(
  value: unknown,
  expectedEncounterId: string,
): EncounterPublicProjectionDto | undefined {
  if (!isRecord(value)) return undefined;
  const entries = entriesOfUnits(value['units']);
  if (!entries) return undefined;
  const units: Record<string, unknown>[] = [];
  for (const [key, raw] of entries) {
    if (!isRecord(raw)) return undefined;
    units.push({
      id: raw['id'] ?? key,
      sideId: raw['sideId'],
      q: raw['q'],
      r: raw['r'],
      health: raw['health'],
      status: raw['status'],
    });
  }
  const hasMap = Object.hasOwn(value, 'map');
  const map = hasMap ? readPublicMap(value['map']) : undefined;
  if (hasMap && !map) return undefined;
  const readNullable = (field: string) => (value[field] === '' ? null : (value[field] ?? null));
  return readEncounterProjection(
    {
      version: value['version'],
      encounterId: value['encounterId'],
      revision: value['revision'],
      status: value['status'],
      round: value['round'],
      activationId: readNullable('activationId'),
      actorUnitId: readNullable('actorUnitId'),
      deadlineAt: readNullable('deadlineAt'),
      units,
      ...(map ? { map } : {}),
    },
    expectedEncounterId,
  );
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

export function readEncounterControlGrant(
  value: unknown,
  expectedEncounterId: string,
): EncounterControlGrantDto | undefined {
  if (!isRecord(value)) return undefined;
  const ids = value['controllableUnitIds'];
  const hasSelfAfk = Object.hasOwn(value, 'selfAfk');
  const hasResumeEpoch = Object.hasOwn(value, 'resumeRequestedAfterEpoch');
  if (
    Object.keys(value).length !== 4 + Number(hasSelfAfk) + Number(hasResumeEpoch) ||
    hasSelfAfk !== hasResumeEpoch ||
    Object.keys(value).some(
      (key) =>
        ![
          'version',
          'encounterId',
          'revision',
          'controllableUnitIds',
          'selfAfk',
          'resumeRequestedAfterEpoch',
        ].includes(key),
    ) ||
    value['version'] !== 1 ||
    value['encounterId'] !== expectedEncounterId ||
    !isSafeInteger(value['revision']) ||
    !Array.isArray(ids) ||
    ids.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(ids).size !== ids.length ||
    (hasSelfAfk && typeof value['selfAfk'] !== 'boolean') ||
    (hasResumeEpoch &&
      value['resumeRequestedAfterEpoch'] !== null &&
      (!isSafeInteger(value['resumeRequestedAfterEpoch']) ||
        (value['resumeRequestedAfterEpoch'] as number) < 0))
  )
    return undefined;
  return Object.freeze({
    version: 1,
    encounterId: expectedEncounterId,
    revision: value['revision'],
    controllableUnitIds: Object.freeze([...ids]) as readonly string[],
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
    if (old.sideId !== unit.sideId || old.health !== unit.health || old.status !== unit.status)
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

/** The renderer never invents a class, name, weapon, or loadout absent from public data. */
export function neutralUnitLabel(unit: EncounterPublicUnitDto): string {
  return `Участник стороны ${unit.sideId}`;
}
