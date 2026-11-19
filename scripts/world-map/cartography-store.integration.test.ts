import { randomUUID } from 'node:crypto';
import { sql, type Transaction } from 'kysely';
import { afterAll, expect, it } from 'vitest';
import type { DatabaseSchema } from '../../apps/server/src/db/database.js';
import { createDatabase } from '../../apps/server/src/db/database.js';
import {
  grantCompanyMap,
  readCompanyCartography,
  readCompanyMapGrants,
  recordCompanyExploration,
  registerCartographyMap,
  type CartographyCursor,
  type CartographyMapManifest,
  type CompanyMapGrant,
  type CompanyPlaceObservation,
} from '../../apps/server/src/world-lab/cartography-store.js';
import { ensureWorldLabSeed } from './world-lab-seed.js';

const url = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = url ? createDatabase(url) : undefined;
afterAll(async () => database?.destroy());

async function scenario() {
  if (!database) throw new Error('PostgreSQL required');
  const worldId = randomUUID();
  const fixtures = await ensureWorldLabSeed(database, worldId);
  return { worldId, a: fixtures[0]!, b: fixtures[1]! };
}

async function locked<T>(
  worldId: string,
  companyId: string,
  action: (tx: Transaction<DatabaseSchema>) => Promise<T>,
): Promise<T> {
  return database!.transaction().execute(async (tx) => {
    await tx
      .selectFrom('company_snapshots')
      .select('company_id')
      .where('world_id', '=', worldId)
      .where('company_id', '=', companyId)
      .forUpdate()
      .executeTakeFirstOrThrow();
    return action(tx);
  });
}

type ExplorationInput = Omit<
  Parameters<typeof recordCompanyExploration>[1],
  'worldId' | 'companyId'
>;

function writeInTransaction(
  tx: Transaction<DatabaseSchema>,
  s: Awaited<ReturnType<typeof scenario>>,
  companyId: string,
  input: ExplorationInput,
) {
  return recordCompanyExploration(tx, { ...input, worldId: s.worldId, companyId });
}

function readCartography(
  s: Awaited<ReturnType<typeof scenario>>,
  companyId: string,
  input: Pick<ExplorationInput, 'regionId' | 'gridEdition' | 'columns' | 'rows'>,
) {
  return readCompanyCartography(database!, { ...input, worldId: s.worldId, companyId });
}

function writeFor(
  s: Awaited<ReturnType<typeof scenario>>,
  companyId: string,
  grid: Pick<ExplorationInput, 'regionId' | 'gridEdition' | 'columns' | 'rows'>,
  exploredBits: Uint8Array,
  places: readonly CompanyPlaceObservation[] = [],
  nextCursor?: CartographyCursor,
) {
  return locked(s.worldId, companyId, (tx) =>
    writeInTransaction(tx, s, companyId, {
      ...grid,
      exploredBits,
      places,
      ...(nextCursor ? { cursor: nextCursor } : {}),
    }),
  );
}

function manifest(
  mapId: string,
  coverageSnapshot = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
): CartographyMapManifest {
  return {
    mapId,
    edition: 'edition-1',
    regionId: 'porechye',
    gridEdition: 'grid-1',
    columns: 8,
    rows: 8,
    originXQ: '0',
    originZQ: '0',
    cellSizeFp: '65536',
    coverageSnapshot,
    siteSnapshot: [{ siteId: 'bereznyak', name: 'Березняк', xQ: '10', zQ: '20' }],
  };
}

function grant(
  worldId: string,
  companyId: string,
  mapId: string,
  sourceRef: string,
  sourceKind: CompanyMapGrant['sourceKind'] = 'HOME',
): CompanyMapGrant {
  return {
    worldId,
    companyId,
    mapId,
    sourceRef,
    edition: 'edition-1',
    sourceKind,
    receiptId: null,
    grantedAt: new Date(1_000),
  };
}

function bits(columns: number, rows: number, cells: readonly number[]): Buffer {
  const result = Buffer.alloc(Math.ceil((columns * rows) / 8));
  for (const cell of cells) result[Math.floor(cell / 8)]! |= 1 << (cell % 8);
  return result;
}

function visit(
  times: readonly [number, number, number, number],
  sourceRef: string,
): CompanyPlaceObservation {
  return {
    siteId: 'old-ferry',
    firstDiscoveredAt: new Date(times[0]),
    lastObservedAt: new Date(times[1]),
    firstVisitedAt: new Date(times[2]),
    lastVisitedAt: new Date(times[3]),
    knownSnapshot: { siteId: 'old-ferry', name: 'Старый перевоз', xQ: '100', zQ: '200' },
    sourceKind: 'VISIT',
    sourceRef,
  };
}

function cursor(exploredThroughMs: string): CartographyCursor {
  return {
    partyId: 'party-cartography-test',
    movementEpoch: '0',
    exploredThroughMs,
    lastXQ: '1000',
    lastZQ: '2000',
  };
}

it.skipIf(!database)(
  'keeps editions immutable and advances knowledge only for a new scoped grant',
  async () => {
    const s = await scenario();
    const home = manifest('home-chart');
    const towns = manifest('towns-chart', Buffer.from([3, 0, 0, 0, 0, 0, 0, 0]));
    const remote = {
      ...manifest('remote-chart'),
      regionId: 'marches',
      gridEdition: 'marches-grid',
    };
    const homeGrant = grant(s.worldId, s.a.companyId, home.mapId, 'home:porechye');
    const homeGrid = {
      regionId: home.regionId,
      gridEdition: home.gridEdition,
      columns: home.columns,
      rows: home.rows,
    };
    await locked(s.worldId, s.a.companyId, async (tx) => {
      await registerCartographyMap(tx, home);
      await registerCartographyMap(tx, towns);
      await registerCartographyMap(tx, remote);
      await grantCompanyMap(tx, homeGrant);
      await writeInTransaction(tx, s, s.a.companyId, {
        ...homeGrid,
        exploredBits: bits(8, 8, [3]),
        places: [],
      });
    });
    const before = await readCartography(s, s.a.companyId, homeGrid);
    const scopedGrant = grant(
      s.worldId,
      s.a.companyId,
      towns.mapId,
      'quest:old-ferry',
      'QUEST_MARKER',
    );
    const added = await locked(s.worldId, s.a.companyId, (tx) => grantCompanyMap(tx, scopedGrant));
    const after = await readCartography(s, s.a.companyId, homeGrid);
    const replay = await locked(s.worldId, s.a.companyId, (tx) => grantCompanyMap(tx, scopedGrant));
    const afterReplay = await readCartography(s, s.a.companyId, homeGrid);

    await expect(
      locked(s.worldId, s.a.companyId, (tx) =>
        registerCartographyMap(tx, { ...home, coverageSnapshot: Buffer.alloc(8, 0xff) }),
      ),
    ).rejects.toThrow('immutable');
    await locked(s.worldId, s.a.companyId, async (tx) => {
      await expect(grantCompanyMap(tx, { ...homeGrant, mapId: remote.mapId })).rejects.toThrow(
        'conflicts',
      );
    });
    const grants = await readCompanyMapGrants(database!, s.worldId, s.a.companyId);
    const remoteHeader = await sql<{ readonly count: number }>`
      select count(*)::int as count from company_region_knowledge
       where world_id = ${s.worldId} and company_id = ${s.a.companyId} and region_id = 'marches'
    `.execute(database!);

    expect({
      revisions: [before.revision, after.revision, afterReplay.revision],
      exploredBit: afterReplay.exploredBits[0]! & 0b00001000,
      grantRefs: [added.sourceRef, replay.sourceRef],
      grants: grants.map(({ sourceRef, mapId }) => [sourceRef, mapId]),
      homeCoverage: Buffer.from(grants[0]!.coverageSnapshot),
      noHeaderFromCaughtConflict: remoteHeader.rows[0]?.count,
    }).toEqual({
      revisions: ['2', '3', '3'],
      exploredBit: 0b00001000,
      grantRefs: ['quest:old-ferry', 'quest:old-ferry'],
      grants: [
        ['home:porechye', home.mapId],
        ['quest:old-ferry', towns.mapId],
      ],
      homeCoverage: Buffer.from(home.coverageSnapshot),
      noHeaderFromCaughtConflict: 0,
    });
  },
  30_000,
);

it.skipIf(!database)(
  'OR-merges concurrent chunks, isolates companies, retains first visit and keeps cursor-only revision stable',
  async () => {
    const s = await scenario();
    const regionId = 'porechye-cartography-concurrent';
    const gridEdition = 'grid-concurrent-1';
    const grid = { regionId, gridEdition, columns: 128, rows: 64 };
    const write = (
      companyId: string,
      exploredBits: Uint8Array,
      places: readonly CompanyPlaceObservation[] = [],
      nextCursor?: CartographyCursor,
    ) => writeFor(s, companyId, grid, exploredBits, places, nextCursor);
    const read = (companyId: string) => readCartography(s, companyId, grid);
    const { columns, rows } = grid;
    const empty = Buffer.alloc((columns * rows) / 8);
    await Promise.all([
      write(s.a.companyId, bits(columns, rows, [2])),
      write(s.a.companyId, bits(columns, rows, [70])),
    ]);
    await write(
      s.a.companyId,
      empty,
      [visit([1_000, 2_000, 1_500, 1_500], 'visit-1')],
      cursor('2000'),
    );
    await write(
      s.a.companyId,
      empty,
      [visit([1_000, 3_000, 1_500, 2_500], 'visit-2')],
      cursor('3000'),
    );
    const beforeCursor = await read(s.a.companyId);
    const cursorRevision = await write(s.a.companyId, empty, [], cursor('4000'));
    const a = await read(s.a.companyId);
    const b = await read(s.b.companyId);
    const chunkCount = await sql<{ readonly count: number }>`
      select count(*)::int as count from company_exploration_chunks
       where world_id = ${s.worldId} and company_id = ${s.a.companyId}
         and region_id = ${regionId} and grid_edition = ${gridEdition}
    `.execute(database!);

    expect({
      bits: [a.exploredBits[0]! & 4, a.exploredBits[8]! & 64],
      chunks: chunkCount.rows[0]?.count,
      visits: [a.places[0]?.firstVisitedAt?.getTime(), a.places[0]?.lastVisitedAt?.getTime()],
      cursor: a.cursor?.exploredThroughMs,
      revisionStable: cursorRevision === beforeCursor.revision,
      companyB: [b.exploredBits.some((byte) => byte !== 0), b.places.length],
    }).toEqual({
      bits: [4, 64],
      chunks: 2,
      visits: [1_500, 2_500],
      cursor: '4000',
      revisionStable: true,
      companyB: [false, 0],
    });
  },
  30_000,
);

it.skipIf(!database)(
  'writes no region or chunk data when caught invalid-place and foreign-region rejections occur',
  async () => {
    const s = await scenario();
    const gridEdition = 'grid-validation-1';
    const columns = 8;
    const rows = 8;
    const writePlace = (
      tx: Transaction<DatabaseSchema>,
      regionId: string,
      exploredBits: Uint8Array,
      place: CompanyPlaceObservation,
    ) =>
      writeInTransaction(tx, s, s.a.companyId, {
        regionId,
        gridEdition,
        columns,
        rows,
        exploredBits,
        places: [place],
      });
    await locked(s.worldId, s.a.companyId, async (tx) => {
      await writePlace(
        tx,
        'porechye-home',
        Buffer.alloc(8),
        visit([1_000, 2_000, 1_500, 1_500], 'existing'),
      );
      await expect(
        writePlace(tx, 'porechye-invalid', bits(8, 8, [0]), visit([10, 10, 5, 5], 'bad-time')),
      ).rejects.toThrow('supported by discovery');
      await expect(
        writePlace(
          tx,
          'porechye-foreign',
          bits(8, 8, [1]),
          visit([1_000, 3_000, 1_500, 2_500], 'foreign'),
        ),
      ).rejects.toThrow('changed its region');
    });
    const counts = await sql<{ readonly regions: number; readonly chunks: number }>`
      select
        (select count(*)::int from company_region_knowledge
          where world_id = ${s.worldId} and company_id = ${s.a.companyId}
            and region_id in ('porechye-invalid', 'porechye-foreign')) as regions,
        (select count(*)::int from company_exploration_chunks
          where world_id = ${s.worldId} and company_id = ${s.a.companyId}
            and region_id in ('porechye-invalid', 'porechye-foreign')) as chunks
    `.execute(database!);
    expect(counts.rows[0]).toEqual({ regions: 0, chunks: 0 });
  },
  30_000,
);
