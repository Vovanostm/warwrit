import { sql, type Kysely, type Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';

type CartographyTransaction = Transaction<DatabaseSchema>;
type CartographyDatabase = Kysely<DatabaseSchema> | Transaction<DatabaseSchema>;

export interface CartographyMapManifest {
  readonly mapId: string;
  readonly edition: string;
  readonly regionId: string;
  readonly gridEdition: string;
  readonly columns: number;
  readonly rows: number;
  readonly originXQ: string;
  readonly originZQ: string;
  readonly cellSizeFp: string;
  readonly coverageSnapshot: Uint8Array;
  readonly siteSnapshot: readonly Readonly<Record<string, unknown>>[];
}

export interface CompanyMapGrant {
  readonly worldId: string;
  readonly companyId: string;
  readonly sourceRef: string;
  readonly mapId: string;
  readonly edition: string;
  readonly sourceKind: 'HOME' | 'MAP_PURCHASE' | 'QUEST_MARKER';
  readonly receiptId: string | null;
  readonly grantedAt: Date;
}

export interface CompanyPlaceObservation {
  readonly siteId: string;
  readonly firstDiscoveredAt: Date;
  readonly lastObservedAt: Date;
  readonly firstVisitedAt: Date | null;
  readonly lastVisitedAt: Date | null;
  readonly knownSnapshot: Readonly<Record<string, unknown>>;
  readonly sourceKind: 'SIGHTING' | 'VISIT';
  readonly sourceRef: string;
}

export interface CartographyCursor {
  readonly partyId: string;
  readonly movementEpoch: string;
  readonly exploredThroughMs: string;
  readonly lastXQ: string;
  readonly lastZQ: string;
}

export interface StoredCompanyCartography {
  readonly revision: string;
  readonly columns: number;
  readonly rows: number;
  readonly exploredBits: Buffer;
  readonly places: readonly CompanyPlaceObservation[];
  readonly cursor: CartographyCursor | null;
}

interface RegionKnowledgeRow {
  readonly revision: string;
  readonly grid_columns: number;
  readonly grid_rows: number;
  readonly cursor_party_id: string | null;
  readonly movement_epoch: string | null;
  readonly explored_through_ms: string | null;
  readonly last_x_q: string | null;
  readonly last_z_q: string | null;
}

function requireText(value: string, field: string, maxLength?: number): void {
  if (value.trim().length === 0 || (maxLength !== undefined && value.length > maxLength))
    throw new TypeError(`Invalid cartography ${field}`);
}

function requireInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647)
    throw new TypeError(`Invalid cartography ${field}`);
}

function requireIntegerString(value: string, field: string, allowNegative = false): void {
  const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
  if (
    !pattern.test(value) ||
    value.replace('-', '').length > 128 ||
    BigInt(value).toString() !== value
  )
    throw new TypeError(`Invalid cartography ${field}`);
}

function requireObject(
  value: unknown,
  field: string,
): asserts value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`Invalid cartography ${field}`);
}

function requireTimestamp(value: Date, field: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    throw new TypeError(`Invalid cartography ${field}`);
}

function requireGridDimensions(columns: number, rows: number): void {
  requireInteger(columns, 'columns');
  requireInteger(rows, 'rows');
  const cellCount = columns * rows;
  if (!Number.isSafeInteger(cellCount))
    throw new TypeError('Cartography grid dimensions are too large');
}

function requireBitmapLength(bits: Uint8Array, columns: number, rows: number): void {
  if (!(bits instanceof Uint8Array)) throw new TypeError('Invalid cartography bitmap');
  requireGridDimensions(columns, rows);
  if (bits.length !== Math.ceil((columns * rows) / 8))
    throw new TypeError('Cartography bitmap length does not match its grid');
  const usedBitsInLastByte = (columns * rows) % 8;
  if (usedBitsInLastByte > 0 && (bits[bits.length - 1]! & ~((1 << usedBitsInLastByte) - 1)) !== 0) {
    throw new TypeError('Cartography bitmap has bits outside its grid');
  }
}

function readCursor(row: RegionKnowledgeRow): CartographyCursor | null {
  if (row.cursor_party_id === null) return null;
  if (
    row.movement_epoch === null ||
    row.explored_through_ms === null ||
    row.last_x_q === null ||
    row.last_z_q === null
  ) {
    throw new TypeError('Invalid saved cartography cursor');
  }
  return {
    partyId: row.cursor_party_id,
    movementEpoch: row.movement_epoch,
    exploredThroughMs: row.explored_through_ms,
    lastXQ: row.last_x_q,
    lastZQ: row.last_z_q,
  };
}

async function lockCompanyRegion(
  transaction: CartographyTransaction,
  input: {
    readonly worldId: string;
    readonly companyId: string;
    readonly regionId: string;
    readonly gridEdition: string;
    readonly columns: number;
    readonly rows: number;
  },
): Promise<RegionKnowledgeRow> {
  await sql`
    insert into company_region_knowledge
      (world_id, company_id, region_id, grid_edition, grid_columns, grid_rows)
    values (
      ${input.worldId}, ${input.companyId}, ${input.regionId}, ${input.gridEdition},
      ${input.columns}, ${input.rows}
    )
    on conflict (world_id, company_id, region_id, grid_edition) do nothing
  `.execute(transaction);
  const result = await sql<RegionKnowledgeRow>`
    select revision::text as revision, grid_columns, grid_rows, cursor_party_id,
           movement_epoch::text as movement_epoch,
           explored_through_ms::text as explored_through_ms,
           last_x_q::text as last_x_q, last_z_q::text as last_z_q
      from company_region_knowledge
     where world_id = ${input.worldId}
       and company_id = ${input.companyId}
       and region_id = ${input.regionId}
       and grid_edition = ${input.gridEdition}
     for update
  `.execute(transaction);
  const row = result.rows[0];
  if (!row) throw new Error('Company cartography region disappeared while locking');
  if (row.grid_columns !== input.columns || row.grid_rows !== input.rows)
    throw new Error('Company cartography grid dimensions changed for an existing edition');
  return row;
}

/** Registers a frozen map edition once; a later definition cannot broaden old grants. */
export async function registerCartographyMap(
  transaction: CartographyTransaction,
  manifest: CartographyMapManifest,
): Promise<void> {
  requireText(manifest.mapId, 'map id');
  requireText(manifest.edition, 'map edition');
  requireText(manifest.regionId, 'region id');
  requireText(manifest.gridEdition, 'grid edition');
  requireText(manifest.originXQ, 'grid origin x');
  requireText(manifest.originZQ, 'grid origin z');
  requireText(manifest.cellSizeFp, 'grid cell size');
  requireIntegerString(manifest.originXQ, 'grid origin x', true);
  requireIntegerString(manifest.originZQ, 'grid origin z', true);
  requireIntegerString(manifest.cellSizeFp, 'grid cell size');
  requireInteger(manifest.columns, 'columns');
  requireInteger(manifest.rows, 'rows');
  requireBitmapLength(manifest.coverageSnapshot, manifest.columns, manifest.rows);
  if (!Array.isArray(manifest.siteSnapshot))
    throw new TypeError('Invalid cartography site snapshot');
  for (const site of manifest.siteSnapshot) requireObject(site, 'site snapshot');

  const sites = JSON.stringify(manifest.siteSnapshot);
  await sql`
    insert into world_map_editions
      (map_id, edition, region_id, grid_edition, grid_columns, grid_rows,
       origin_x_q, origin_z_q, cell_size_fp, coverage_snapshot, site_snapshot)
    values (
      ${manifest.mapId}, ${manifest.edition}, ${manifest.regionId}, ${manifest.gridEdition},
      ${manifest.columns}, ${manifest.rows}, ${manifest.originXQ}, ${manifest.originZQ},
      ${manifest.cellSizeFp}, ${Buffer.from(manifest.coverageSnapshot)}, ${sites}::jsonb
    )
    on conflict (map_id, edition) do nothing
  `.execute(transaction);
  const mismatch = await sql`
    select 1
      from world_map_editions
     where map_id = ${manifest.mapId}
       and edition = ${manifest.edition}
       and (region_id is distinct from ${manifest.regionId}
         or grid_edition is distinct from ${manifest.gridEdition}
         or grid_columns is distinct from ${manifest.columns}
         or grid_rows is distinct from ${manifest.rows}
         or origin_x_q is distinct from ${manifest.originXQ}
         or origin_z_q is distinct from ${manifest.originZQ}
         or cell_size_fp is distinct from ${manifest.cellSizeFp}
         or coverage_snapshot is distinct from ${Buffer.from(manifest.coverageSnapshot)}
         or site_snapshot is distinct from ${sites}::jsonb)
  `.execute(transaction);
  if (mismatch.rows.length > 0)
    throw new Error('Cartography map edition is immutable and already has different content');
}

/** Creates a region knowledge header for a company without resetting its progress. */
export async function ensureCompanyCartography(
  transaction: CartographyTransaction,
  input: {
    readonly worldId: string;
    readonly companyId: string;
    readonly regionId: string;
    readonly gridEdition: string;
    readonly columns: number;
    readonly rows: number;
  },
): Promise<void> {
  requireText(input.worldId, 'world id');
  requireText(input.companyId, 'company id');
  requireText(input.regionId, 'region id');
  requireText(input.gridEdition, 'grid edition');
  requireInteger(input.columns, 'columns');
  requireInteger(input.rows, 'rows');
  await lockCompanyRegion(transaction, input);
}

/**
 * Grants a registered chart, initializes its region header, and advances visible knowledge once.
 * Callers must hold the canonical company lock to serialize source and receipt checks.
 */
export async function grantCompanyMap(
  transaction: CartographyTransaction,
  grant: CompanyMapGrant,
): Promise<CompanyMapGrant> {
  requireText(grant.worldId, 'world id');
  requireText(grant.companyId, 'company id');
  requireText(grant.sourceRef, 'grant source', 256);
  requireText(grant.mapId, 'map id', 128);
  requireText(grant.edition, 'map edition', 128);
  requireTimestamp(grant.grantedAt, 'grant time');
  if (
    grant.sourceKind !== 'HOME' &&
    grant.sourceKind !== 'MAP_PURCHASE' &&
    grant.sourceKind !== 'QUEST_MARKER'
  ) {
    throw new TypeError('Invalid cartography grant source');
  }
  if ((grant.sourceKind === 'MAP_PURCHASE') !== (grant.receiptId !== null))
    throw new TypeError('Map purchase grants require a receipt id');
  if (grant.receiptId !== null) requireText(grant.receiptId, 'receipt id');

  const editionResult = await sql<{
    readonly region_id: string;
    readonly grid_edition: string;
    readonly grid_columns: number;
    readonly grid_rows: number;
  }>`
    select region_id, grid_edition, grid_columns, grid_rows
      from world_map_editions
     where map_id = ${grant.mapId} and edition = ${grant.edition}
  `.execute(transaction);
  const edition = editionResult.rows[0];
  if (!edition) throw new Error('Cartography map edition is not registered');

  const priorResult = await sql<{
    readonly source_ref: string;
    readonly map_id: string;
    readonly edition: string;
    readonly source_kind: CompanyMapGrant['sourceKind'];
    readonly receipt_id: string | null;
    readonly granted_at: Date;
  }>`
    select source_ref, map_id, edition, source_kind, receipt_id, granted_at
      from company_map_grants
     where world_id = ${grant.worldId}
       and company_id = ${grant.companyId}
       and (source_ref = ${grant.sourceRef}
         or (${grant.receiptId}::text is not null and receipt_id = ${grant.receiptId}))
  `.execute(transaction);
  if (priorResult.rows.length > 0) {
    const prior = priorResult.rows[0];
    if (
      priorResult.rows.length !== 1 ||
      !prior ||
      prior.map_id !== grant.mapId ||
      prior.edition !== grant.edition ||
      prior.source_kind !== grant.sourceKind ||
      prior.receipt_id !== grant.receiptId
    ) {
      throw new Error('Company map grant source conflicts with previously granted knowledge');
    }
    return { ...grant, sourceRef: prior.source_ref, grantedAt: prior.granted_at };
  }

  await lockCompanyRegion(transaction, {
    worldId: grant.worldId,
    companyId: grant.companyId,
    regionId: edition.region_id,
    gridEdition: edition.grid_edition,
    columns: edition.grid_columns,
    rows: edition.grid_rows,
  });
  const inserted = await sql<{
    readonly world_id: string;
    readonly company_id: string;
    readonly source_ref: string;
    readonly map_id: string;
    readonly edition: string;
    readonly source_kind: CompanyMapGrant['sourceKind'];
    readonly receipt_id: string | null;
    readonly granted_at: Date;
  }>`
    insert into company_map_grants
      (world_id, company_id, source_ref, map_id, edition, source_kind, receipt_id, granted_at)
    values (
      ${grant.worldId}, ${grant.companyId}, ${grant.sourceRef}, ${grant.mapId},
      ${grant.edition}, ${grant.sourceKind}, ${grant.receiptId}, ${grant.grantedAt}
    )
    returning world_id, company_id, source_ref, map_id, edition, source_kind, receipt_id, granted_at
  `.execute(transaction);
  const row = inserted.rows[0];
  if (!row) throw new Error('Company map grant was not inserted under the company lock');
  const updated = await sql<{ readonly revision: string }>`
    update company_region_knowledge
       set revision = revision + 1
     where world_id = ${grant.worldId}
       and company_id = ${grant.companyId}
       and region_id = ${edition.region_id}
       and grid_edition = ${edition.grid_edition}
    returning revision::text as revision
  `.execute(transaction);
  if (!updated.rows[0]) throw new Error('Company cartography region disappeared after grant');
  return { ...grant, grantedAt: row.granted_at };
}

/** Reads only this company's map grants and their frozen, server-owned contents. */
export async function readCompanyMapGrants(
  database: CartographyDatabase,
  worldId: string,
  companyId: string,
): Promise<readonly (CompanyMapGrant & CartographyMapManifest)[]> {
  const result = await sql<{
    readonly world_id: string;
    readonly company_id: string;
    readonly source_ref: string;
    readonly map_id: string;
    readonly edition: string;
    readonly source_kind: CompanyMapGrant['sourceKind'];
    readonly receipt_id: string | null;
    readonly granted_at: Date;
    readonly region_id: string;
    readonly grid_edition: string;
    readonly grid_columns: number;
    readonly grid_rows: number;
    readonly origin_x_q: string;
    readonly origin_z_q: string;
    readonly cell_size_fp: string;
    readonly coverage_snapshot: Buffer;
    readonly site_snapshot: unknown;
  }>`
    select grants.world_id, grants.company_id, grants.source_ref, grants.map_id,
           grants.edition, grants.source_kind, grants.receipt_id, grants.granted_at,
           editions.region_id, editions.grid_edition, editions.grid_columns, editions.grid_rows,
           editions.origin_x_q::text as origin_x_q, editions.origin_z_q::text as origin_z_q,
           editions.cell_size_fp::text as cell_size_fp, editions.coverage_snapshot,
           editions.site_snapshot
      from company_map_grants as grants
      join world_map_editions as editions
        on editions.map_id = grants.map_id and editions.edition = grants.edition
     where grants.world_id = ${worldId} and grants.company_id = ${companyId}
     order by grants.granted_at, grants.source_ref
  `.execute(database);
  return result.rows.map((row) => {
    if (!Array.isArray(row.site_snapshot))
      throw new TypeError('Invalid saved cartography site snapshot');
    return {
      worldId: row.world_id,
      companyId: row.company_id,
      sourceRef: row.source_ref,
      mapId: row.map_id,
      edition: row.edition,
      sourceKind: row.source_kind,
      receiptId: row.receipt_id,
      grantedAt: row.granted_at,
      regionId: row.region_id,
      gridEdition: row.grid_edition,
      columns: row.grid_columns,
      rows: row.grid_rows,
      originXQ: row.origin_x_q,
      originZQ: row.origin_z_q,
      cellSizeFp: row.cell_size_fp,
      coverageSnapshot: Buffer.from(row.coverage_snapshot),
      siteSnapshot: row.site_snapshot as readonly Readonly<Record<string, unknown>>[],
    };
  });
}

function chunkUpdates(
  bits: Uint8Array,
  columns: number,
  rows: number,
): Map<string, { readonly x: number; readonly y: number; readonly bits: Buffer }> {
  // Region and chunk bitmaps use row-major cells, with the least significant bit first.
  const chunks = new Map<
    string,
    { readonly x: number; readonly y: number; readonly bits: Buffer }
  >();
  const cellCount = columns * rows;
  for (let byteIndex = 0; byteIndex < bits.length; byteIndex += 1) {
    let value = bits[byteIndex]!;
    if (value === 0) continue;
    while (value !== 0) {
      const bitOffset = Math.clz32(value & -value) ^ 31;
      const cellIndex = byteIndex * 8 + bitOffset;
      if (cellIndex >= cellCount) break;
      const x = cellIndex % columns;
      const y = Math.floor(cellIndex / columns);
      const chunkX = Math.floor(x / 64);
      const chunkY = Math.floor(y / 64);
      const key = `${chunkX},${chunkY}`;
      let chunk = chunks.get(key);
      if (!chunk) {
        chunk = { x: chunkX, y: chunkY, bits: Buffer.alloc(512) };
        chunks.set(key, chunk);
      }
      const localIndex = (y % 64) * 64 + (x % 64);
      chunk.bits[Math.floor(localIndex / 8)]! |= 1 << (localIndex % 8);
      value &= value - 1;
    }
  }
  return chunks;
}

function mergeChunk(existing: Buffer | undefined, update: Buffer): Buffer | null {
  const merged = Buffer.from(existing ?? Buffer.alloc(512));
  let changed = false;
  for (let index = 0; index < 512; index += 1) {
    const before = merged[index]!;
    const after = before | update[index]!;
    if (after !== before) changed = true;
    merged[index] = after;
  }
  return changed ? merged : null;
}

function decodePlace(row: {
  readonly site_id: string;
  readonly first_discovered_at: Date;
  readonly last_observed_at: Date;
  readonly first_visited_at: Date | null;
  readonly last_visited_at: Date | null;
  readonly known_snapshot: unknown;
  readonly source_kind: CompanyPlaceObservation['sourceKind'];
  readonly source_ref: string;
}): CompanyPlaceObservation {
  requireObject(row.known_snapshot, 'saved place snapshot');
  return {
    siteId: row.site_id,
    firstDiscoveredAt: row.first_discovered_at,
    lastObservedAt: row.last_observed_at,
    firstVisitedAt: row.first_visited_at,
    lastVisitedAt: row.last_visited_at,
    knownSnapshot: row.known_snapshot,
    sourceKind: row.source_kind,
    sourceRef: row.source_ref,
  };
}

interface ValidatedPlaceObservation {
  readonly place: CompanyPlaceObservation;
  readonly snapshot: string;
}

function validatePlaceObservations(
  places: readonly CompanyPlaceObservation[],
): readonly ValidatedPlaceObservation[] {
  if (!Array.isArray(places)) throw new TypeError('Invalid cartography place observations');
  const seenSiteIds = new Set<string>();
  return places.map((place) => {
    const validated = validatePlaceObservation(place);
    if (seenSiteIds.has(validated.place.siteId))
      throw new TypeError('Cartography place observations contain duplicate site ids');
    seenSiteIds.add(validated.place.siteId);
    return validated;
  });
}

function validatePlaceObservation(place: CompanyPlaceObservation): ValidatedPlaceObservation {
  if (place === null || typeof place !== 'object' || Array.isArray(place))
    throw new TypeError('Invalid cartography place observation');
  requireText(place.siteId, 'site id', 128);
  requireText(place.sourceRef, 'observation source', 256);
  requireObject(place.knownSnapshot, 'place snapshot');
  requireTimestamp(place.firstDiscoveredAt, 'discovery time');
  requireTimestamp(place.lastObservedAt, 'observation time');
  if (place.firstVisitedAt !== null) requireTimestamp(place.firstVisitedAt, 'first visit time');
  if (place.lastVisitedAt !== null) requireTimestamp(place.lastVisitedAt, 'last visit time');
  validatePlaceTimeline(place);
  validatePlaceSource(place);
  const snapshot = JSON.stringify(place.knownSnapshot);
  if (snapshot === undefined) throw new TypeError('Invalid cartography place snapshot');
  return { place, snapshot };
}

function validatePlaceTimeline(place: CompanyPlaceObservation): void {
  if (place.firstDiscoveredAt > place.lastObservedAt)
    throw new TypeError('Place discovery cannot follow its observation');
  validateVisitInterval(place);
  if (
    (place.firstVisitedAt !== null && place.firstDiscoveredAt > place.firstVisitedAt) ||
    (place.lastVisitedAt !== null && place.lastVisitedAt > place.lastObservedAt)
  ) {
    throw new TypeError('Place visits must be supported by discovery and observation');
  }
}

function validateVisitInterval(place: CompanyPlaceObservation): void {
  if ((place.firstVisitedAt === null) !== (place.lastVisitedAt === null))
    throw new TypeError('Place visit times must be supplied together');
  if (
    place.firstVisitedAt !== null &&
    place.lastVisitedAt !== null &&
    place.firstVisitedAt > place.lastVisitedAt
  ) {
    throw new TypeError('Place first visit cannot follow its last visit');
  }
}

function validatePlaceSource(place: CompanyPlaceObservation): void {
  if (place.sourceKind !== 'SIGHTING' && place.sourceKind !== 'VISIT')
    throw new TypeError('Invalid cartography place source');
  if (place.sourceKind === 'VISIT' && place.lastVisitedAt === null)
    throw new TypeError('Visit observations must include visit times');
}

function validateCartographyCursor(cursor: CartographyCursor | undefined): void {
  if (cursor === undefined) return;
  if (cursor === null || typeof cursor !== 'object' || Array.isArray(cursor))
    throw new TypeError('Invalid cartography cursor');
  requireText(cursor.partyId, 'cursor party id');
  requireIntegerString(cursor.movementEpoch, 'movement epoch');
  requireIntegerString(cursor.exploredThroughMs, 'exploration cursor time');
  requireIntegerString(cursor.lastXQ, 'cursor x', true);
  requireIntegerString(cursor.lastZQ, 'cursor z', true);
}

interface RecordCompanyExplorationInput {
  readonly worldId: string;
  readonly companyId: string;
  readonly regionId: string;
  readonly gridEdition: string;
  readonly columns: number;
  readonly rows: number;
  readonly exploredBits: Uint8Array;
  readonly places: readonly CompanyPlaceObservation[];
  readonly cursor?: CartographyCursor;
}

function validateExplorationInput(input: RecordCompanyExplorationInput): void {
  for (const [value, field] of [
    [input.worldId, 'world id'],
    [input.companyId, 'company id'],
    [input.regionId, 'region id'],
    [input.gridEdition, 'grid edition'],
  ] as const) {
    requireText(value, field, field === 'region id' || field === 'grid edition' ? 128 : undefined);
  }
  requireBitmapLength(input.exploredBits, input.columns, input.rows);
  validateCartographyCursor(input.cursor);
}

async function ensurePlacesStayInRegion(
  transaction: CartographyTransaction,
  input: RecordCompanyExplorationInput,
  places: readonly ValidatedPlaceObservation[],
): Promise<void> {
  if (places.length === 0) return;
  const priorPlaces = await sql<{
    readonly site_id: string;
    readonly region_id: string;
    readonly grid_edition: string;
  }>`
    select site_id, region_id, grid_edition
      from company_place_observations
     where world_id = ${input.worldId}
       and company_id = ${input.companyId}
       and site_id = any(${places.map(({ place }) => place.siteId)}::text[])
  `.execute(transaction);
  for (const priorPlace of priorPlaces.rows) {
    if (priorPlace.region_id !== input.regionId || priorPlace.grid_edition !== input.gridEdition)
      throw new Error('Company place observation changed its region or grid edition');
  }
}

function validateCursorAdvance(
  nextCursor: CartographyCursor | undefined,
  priorCursor: CartographyCursor | null,
): void {
  if (!nextCursor || !priorCursor) return;
  if (BigInt(nextCursor.movementEpoch) < BigInt(priorCursor.movementEpoch))
    throw new Error('Stale cartography movement epoch');
  if (BigInt(nextCursor.exploredThroughMs) < BigInt(priorCursor.exploredThroughMs))
    throw new Error('Stale cartography exploration time');
  if (
    nextCursor.movementEpoch === priorCursor.movementEpoch &&
    nextCursor.partyId !== priorCursor.partyId
  ) {
    throw new Error('Cartography cursor party changed without a new movement epoch');
  }
  if (
    nextCursor.movementEpoch === priorCursor.movementEpoch &&
    nextCursor.exploredThroughMs === priorCursor.exploredThroughMs &&
    (nextCursor.lastXQ !== priorCursor.lastXQ || nextCursor.lastZQ !== priorCursor.lastZQ)
  ) {
    throw new Error('Cartography cursor position changed without advancing world time');
  }
}

async function mergeExploredChunks(
  transaction: CartographyTransaction,
  input: RecordCompanyExplorationInput,
): Promise<boolean> {
  let changed = false;
  for (const update of chunkUpdates(input.exploredBits, input.columns, input.rows).values()) {
    const existingResult = await sql<{ readonly explored_bits: Buffer }>`
      select explored_bits
        from company_exploration_chunks
       where world_id = ${input.worldId}
         and company_id = ${input.companyId}
         and region_id = ${input.regionId}
         and grid_edition = ${input.gridEdition}
         and chunk_x = ${update.x}
         and chunk_y = ${update.y}
    `.execute(transaction);
    const merged = mergeChunk(existingResult.rows[0]?.explored_bits, update.bits);
    if (!merged) continue;
    await sql`
      insert into company_exploration_chunks
        (world_id, company_id, region_id, grid_edition, chunk_x, chunk_y, explored_bits)
      values (
        ${input.worldId}, ${input.companyId}, ${input.regionId}, ${input.gridEdition},
        ${update.x}, ${update.y}, ${merged}
      )
      on conflict (world_id, company_id, region_id, grid_edition, chunk_x, chunk_y)
      do update set explored_bits = excluded.explored_bits
    `.execute(transaction);
    changed = true;
  }
  return changed;
}

async function mergePlaceObservations(
  transaction: CartographyTransaction,
  input: RecordCompanyExplorationInput,
  places: readonly ValidatedPlaceObservation[],
): Promise<boolean> {
  let changed = false;
  for (const { place, snapshot: siteSnapshot } of places) {
    const result = await sql`
      insert into company_place_observations
        (world_id, company_id, site_id, region_id, grid_edition, first_discovered_at,
         last_observed_at, first_visited_at, last_visited_at, known_snapshot, source_kind, source_ref)
      values (
        ${input.worldId}, ${input.companyId}, ${place.siteId}, ${input.regionId},
        ${input.gridEdition}, ${place.firstDiscoveredAt}, ${place.lastObservedAt},
        ${place.firstVisitedAt}, ${place.lastVisitedAt}, ${siteSnapshot}::jsonb,
        ${place.sourceKind}, ${place.sourceRef}
      )
      on conflict (world_id, company_id, site_id) do update set
        first_discovered_at = least(company_place_observations.first_discovered_at, excluded.first_discovered_at),
        last_observed_at = greatest(company_place_observations.last_observed_at, excluded.last_observed_at),
        first_visited_at = case
          when company_place_observations.first_visited_at is null then excluded.first_visited_at
          when excluded.first_visited_at is null then company_place_observations.first_visited_at
          else least(company_place_observations.first_visited_at, excluded.first_visited_at)
        end,
        last_visited_at = case
          when company_place_observations.last_visited_at is null then excluded.last_visited_at
          when excluded.last_visited_at is null then company_place_observations.last_visited_at
          else greatest(company_place_observations.last_visited_at, excluded.last_visited_at)
        end,
        known_snapshot = case
          when excluded.last_observed_at > company_place_observations.last_observed_at
            or (excluded.last_observed_at = company_place_observations.last_observed_at
              and excluded.source_ref > company_place_observations.source_ref)
            then excluded.known_snapshot
          else company_place_observations.known_snapshot
        end,
        source_kind = case
          when excluded.last_observed_at > company_place_observations.last_observed_at
            or (excluded.last_observed_at = company_place_observations.last_observed_at
              and excluded.source_ref > company_place_observations.source_ref)
            then excluded.source_kind
          else company_place_observations.source_kind
        end,
        source_ref = case
          when excluded.last_observed_at > company_place_observations.last_observed_at
            or (excluded.last_observed_at = company_place_observations.last_observed_at
              and excluded.source_ref > company_place_observations.source_ref)
            then excluded.source_ref
          else company_place_observations.source_ref
        end
      where company_place_observations.region_id = excluded.region_id
        and company_place_observations.grid_edition = excluded.grid_edition
        and row(
          company_place_observations.first_discovered_at,
          company_place_observations.last_observed_at,
          company_place_observations.first_visited_at,
          company_place_observations.last_visited_at,
          company_place_observations.known_snapshot,
          company_place_observations.source_kind,
          company_place_observations.source_ref
        ) is distinct from row(
          least(company_place_observations.first_discovered_at, excluded.first_discovered_at),
          greatest(company_place_observations.last_observed_at, excluded.last_observed_at),
          case
            when company_place_observations.first_visited_at is null then excluded.first_visited_at
            when excluded.first_visited_at is null then company_place_observations.first_visited_at
            else least(company_place_observations.first_visited_at, excluded.first_visited_at)
          end,
          case
            when company_place_observations.last_visited_at is null then excluded.last_visited_at
            when excluded.last_visited_at is null then company_place_observations.last_visited_at
            else greatest(company_place_observations.last_visited_at, excluded.last_visited_at)
          end,
          case
            when excluded.last_observed_at > company_place_observations.last_observed_at
              or (excluded.last_observed_at = company_place_observations.last_observed_at
                and excluded.source_ref > company_place_observations.source_ref)
              then excluded.known_snapshot
            else company_place_observations.known_snapshot
          end,
          case
            when excluded.last_observed_at > company_place_observations.last_observed_at
              or (excluded.last_observed_at = company_place_observations.last_observed_at
                and excluded.source_ref > company_place_observations.source_ref)
              then excluded.source_kind
            else company_place_observations.source_kind
          end,
          case
            when excluded.last_observed_at > company_place_observations.last_observed_at
              or (excluded.last_observed_at = company_place_observations.last_observed_at
                and excluded.source_ref > company_place_observations.source_ref)
              then excluded.source_ref
            else company_place_observations.source_ref
          end
        )
      returning site_id
    `.execute(transaction);
    if (result.rows.length > 0) changed = true;
  }
  return changed;
}

async function persistCartographyCursor(
  transaction: CartographyTransaction,
  input: RecordCompanyExplorationInput,
  priorCursor: CartographyCursor | null,
): Promise<void> {
  const nextCursor = input.cursor;
  if (!nextCursor) return;
  if (
    priorCursor &&
    nextCursor.partyId === priorCursor.partyId &&
    nextCursor.movementEpoch === priorCursor.movementEpoch &&
    nextCursor.exploredThroughMs === priorCursor.exploredThroughMs &&
    nextCursor.lastXQ === priorCursor.lastXQ &&
    nextCursor.lastZQ === priorCursor.lastZQ
  ) {
    return;
  }
  await sql`
    update company_region_knowledge
       set cursor_party_id = ${nextCursor.partyId},
           movement_epoch = ${nextCursor.movementEpoch},
           explored_through_ms = ${nextCursor.exploredThroughMs},
           last_x_q = ${nextCursor.lastXQ},
           last_z_q = ${nextCursor.lastZQ}
     where world_id = ${input.worldId}
       and company_id = ${input.companyId}
       and region_id = ${input.regionId}
       and grid_edition = ${input.gridEdition}
  `.execute(transaction);
}

async function advanceRegionRevision(
  transaction: CartographyTransaction,
  input: RecordCompanyExplorationInput,
  previousRevision: string,
  changed: boolean,
): Promise<string> {
  if (!changed) return previousRevision;
  const updated = await sql<{ readonly revision: string }>`
    update company_region_knowledge
       set revision = revision + 1
     where world_id = ${input.worldId}
       and company_id = ${input.companyId}
       and region_id = ${input.regionId}
       and grid_edition = ${input.gridEdition}
    returning revision::text as revision
  `.execute(transaction);
  const row = updated.rows[0];
  if (!row) throw new Error('Company cartography region disappeared while advancing');
  return row.revision;
}

/**
 * OR-merges explored cells, observations and the movement cursor in one transaction.
 * Callers must hold the canonical company lock so site preflight stays race-free across regions.
 */
export async function recordCompanyExploration(
  transaction: CartographyTransaction,
  input: RecordCompanyExplorationInput,
): Promise<string> {
  validateExplorationInput(input);
  const validatedPlaces = validatePlaceObservations(input.places);
  await ensurePlacesStayInRegion(transaction, input, validatedPlaces);

  const locked = await lockCompanyRegion(transaction, input);
  const priorCursor = readCursor(locked);
  validateCursorAdvance(input.cursor, priorCursor);

  let changed = await mergeExploredChunks(transaction, input);
  changed = (await mergePlaceObservations(transaction, input, validatedPlaces)) || changed;
  await persistCartographyCursor(transaction, input, priorCursor);
  return advanceRegionRevision(transaction, input, locked.revision, changed);
}

/** Reconstructs one region's packed explored bitmap; this read performs no writes. */
export async function readCompanyCartography(
  database: CartographyDatabase,
  input: {
    readonly worldId: string;
    readonly companyId: string;
    readonly regionId: string;
    readonly gridEdition: string;
    readonly columns: number;
    readonly rows: number;
  },
): Promise<StoredCompanyCartography> {
  requireGridDimensions(input.columns, input.rows);
  const knowledgeResult = await sql<RegionKnowledgeRow>`
    select revision::text as revision, grid_columns, grid_rows, cursor_party_id,
           movement_epoch::text as movement_epoch,
           explored_through_ms::text as explored_through_ms,
           last_x_q::text as last_x_q, last_z_q::text as last_z_q
      from company_region_knowledge
     where world_id = ${input.worldId}
       and company_id = ${input.companyId}
       and region_id = ${input.regionId}
       and grid_edition = ${input.gridEdition}
  `.execute(database);
  const knowledge = knowledgeResult.rows[0];
  const revision = knowledge?.revision ?? '0';
  if (knowledge && (knowledge.grid_columns !== input.columns || knowledge.grid_rows !== input.rows))
    throw new Error('Requested cartography dimensions do not match the saved grid edition');
  const exploredBits = Buffer.alloc(Math.ceil((input.columns * input.rows) / 8));
  const chunks = await sql<{
    readonly chunk_x: number;
    readonly chunk_y: number;
    readonly explored_bits: Buffer;
  }>`
    select chunk_x, chunk_y, explored_bits
      from company_exploration_chunks
     where world_id = ${input.worldId}
       and company_id = ${input.companyId}
       and region_id = ${input.regionId}
       and grid_edition = ${input.gridEdition}
  `.execute(database);
  for (const chunk of chunks.rows) {
    for (let localIndex = 0; localIndex < 4096; localIndex += 1) {
      if ((chunk.explored_bits[Math.floor(localIndex / 8)]! & (1 << (localIndex % 8))) === 0)
        continue;
      const x = chunk.chunk_x * 64 + (localIndex % 64);
      const y = chunk.chunk_y * 64 + Math.floor(localIndex / 64);
      if (x < input.columns && y < input.rows) {
        const cellIndex = y * input.columns + x;
        exploredBits[Math.floor(cellIndex / 8)]! |= 1 << (cellIndex % 8);
      }
    }
  }
  const places = await sql<{
    readonly site_id: string;
    readonly first_discovered_at: Date;
    readonly last_observed_at: Date;
    readonly first_visited_at: Date | null;
    readonly last_visited_at: Date | null;
    readonly known_snapshot: unknown;
    readonly source_kind: CompanyPlaceObservation['sourceKind'];
    readonly source_ref: string;
  }>`
    select site_id, first_discovered_at, last_observed_at, first_visited_at, last_visited_at,
           known_snapshot, source_kind, source_ref
      from company_place_observations
     where world_id = ${input.worldId}
       and company_id = ${input.companyId}
       and region_id = ${input.regionId}
       and grid_edition = ${input.gridEdition}
     order by site_id
  `.execute(database);
  return {
    revision,
    columns: input.columns,
    rows: input.rows,
    exploredBits,
    places: places.rows.map(decodePlace),
    cursor: knowledge ? readCursor(knowledge) : null,
  };
}
