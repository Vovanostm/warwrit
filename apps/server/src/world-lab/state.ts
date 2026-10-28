import {
  PAINTED_ATLAS_REGION,
  paintedAtlasNearbySite,
  sightHasCell,
  worldSightIndex,
} from '@warwrit/game-core';
import type { WorldLabObservedGroupDto, WorldLabSlot, WorldLabStateDto } from '@warwrit/protocol';
import { sql, type Kysely, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock, readWorldLight } from '../world/clock.js';
import {
  readContinuousMovementProjection,
  readContinuousMovementSnapshot,
} from '../world/continuous-movement.js';
import { readWorldLabNpcGroups } from './npc-store.js';
import { worldLabNpcObservation } from './npc-worker.js';
import type { WorldLabFixture } from './model.js';
import { readWorldLabPursuit } from './pursuit-store.js';
import { readWorldLabCartography } from './cartography.js';
import { navigationField, sightField } from './cartography-field.js';

interface SlotRow {
  readonly slot: WorldLabSlot;
  readonly account_id: string;
  readonly company_id: string;
  readonly party_id: string;
  readonly display_name: string;
}

export async function readWorldLabSlotByAccount(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  accountId: string,
): Promise<WorldLabFixture | undefined> {
  const result = await sql<SlotRow>`
    select slot, account_id, company_id, party_id, display_name
      from world_lab_slots
     where world_id = ${worldId} and account_id = ${accountId}
  `.execute(database);
  const row = result.rows[0];
  return (
    row && {
      slot: row.slot,
      accountId: row.account_id,
      companyId: row.company_id,
      partyId: row.party_id,
      name: row.display_name,
    }
  );
}

async function observeNearbyPlayers(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  fixtures: readonly WorldLabFixture[],
  ownAccountId: string,
  visible: Uint8Array,
  now: Date | (() => Date),
): Promise<WorldLabObservedGroupDto[]> {
  const groups: WorldLabObservedGroupDto[] = [];
  for (const other of fixtures) {
    if (other.accountId === ownAccountId) continue;
    const { movement } = await readContinuousMovementProjection(
      database,
      worldId,
      other.companyId,
      PAINTED_ATLAS_REGION,
      now,
    );
    if (
      sightHasCell(
        visible,
        worldSightIndex(sightField, {
          xFp: Number(movement.point.xMicroFp) / 65_536,
          zFp: Number(movement.point.zMicroFp) / 65_536,
        }),
      )
    )
      groups.push({
        id: other.companyId,
        kind: 'PLAYER',
        pursuable: false,
        name: other.name,
        point: movement.point,
        state: movement.mode === 'MOVING' ? 'MOVING' : 'IDLE',
        observedAtMs: movement.serverTimeMs,
        movementEpoch: movement.movementEpoch,
      });
  }
  return groups;
}

export async function readWorldLabState(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  fixtures: readonly WorldLabFixture[],
  accountId: string,
  now: Date | (() => Date) = () => new Date(),
  timeScale = 1,
): Promise<WorldLabStateDto | undefined> {
  if (!database.isTransaction)
    return database
      .transaction()
      .execute((transaction) =>
        readWorldLabState(transaction, worldId, fixtures, accountId, now, timeScale),
      );
  const ownFixture = fixtures.find((fixture) => fixture.accountId === accountId);
  if (!ownFixture) return undefined;
  const ownMovement = await readContinuousMovementSnapshot(
    database,
    worldId,
    accountId,
    PAINTED_ATLAS_REGION,
    now,
    ownFixture.companyId,
  );
  // Use one authoritative instant for own sight, targets and world conditions.
  const npcGroups = await readWorldLabNpcGroups(database, worldId);
  const observedNow = new Date(Number(ownMovement.serverTimeMs));
  const clock = await readWorldClock(database as Transaction<DatabaseSchema>, worldId, observedNow);
  const light = readWorldLight(clock).phase;
  const cartography = await readWorldLabCartography(
    database as Transaction<DatabaseSchema>,
    worldId,
    ownFixture,
    ownMovement,
    clock,
  );
  const visible = Buffer.from(cartography.visible, 'base64');
  const groups = await observeNearbyPlayers(
    database,
    worldId,
    fixtures,
    accountId,
    visible,
    observedNow,
  );
  for (const group of npcGroups) {
    if (group.mapEdition !== PAINTED_ATLAS_REGION.mapEdition)
      throw new TypeError('World lab NPC map edition does not match the active atlas');
    if (group.kind === 'CREATURE' && light !== 'NIGHT') continue;
    const observed = worldLabNpcObservation(group, clock.nowMs);
    if (
      sightHasCell(
        visible,
        worldSightIndex(sightField, {
          xFp: Number(observed.point.xMicroFp) / 65_536,
          zFp: Number(observed.point.zMicroFp) / 65_536,
        }),
      )
    )
      groups.push({ ...observed, pursuable: group.kind !== 'PATROL' });
  }
  groups.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const candidate = paintedAtlasNearbySite(navigationField, ownMovement.point);
  const nearby =
    candidate && cartography.sites.some((site) => site.siteId === candidate.siteId)
      ? candidate
      : undefined;
  const ownPartyId = ownFixture.partyId;
  return {
    schemaVersion: 2,
    cartography,
    worldId,
    mapEdition: PAINTED_ATLAS_REGION.mapEdition,
    // Own movement is read first. Later queries must not give an earlier
    // own-company observation a newer ordering token than a committed STOP.
    sequence: ownMovement.serverTimeMs,
    serverTimeMs: clock.nowMs,
    light,
    timeScale,
    slot: ownFixture.slot,
    own: {
      companyId: ownFixture.companyId,
      partyId: ownPartyId,
      name: ownFixture.name,
      movement: ownMovement,
    },
    groups,
    pursuit: await readWorldLabPursuit(database, worldId, ownFixture.companyId),
    nearbySite: nearby ? { siteId: nearby.siteId, name: nearby.name } : null,
  };
}
