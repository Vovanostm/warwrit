import {
  PAINTED_ATLAS_REGION,
  buildNavigationField,
  paintedAtlasNearbySite,
} from '@warwrit/game-core';
import type { PointFp } from '@warwrit/game-core';
import type { WorldLabObservedGroupDto, WorldLabSlot, WorldLabStateDto } from '@warwrit/protocol';
import { sql, type Kysely } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock, readWorldLight } from '../world/clock.js';
import {
  readContinuousMovementProjection,
  readContinuousMovementSnapshot,
} from '../world/continuous-movement.js';
import { readWorldLabNpcGroups } from './npc-store.js';
import { worldLabNpcObservation } from './npc-worker.js';
import type { WorldLabFixture } from './model.js';

// Explicitly oversized for the six-group mechanics lab; this is not an MMO sight rule.
const LAB_SIGHT_RADIUS_FP = 1_024;
const navigationField = buildNavigationField(PAINTED_ATLAS_REGION);

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
  ownPoint: PointFp,
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
      Math.hypot(
        Number(movement.point.xMicroFp) / 65_536 - ownPoint.xFp,
        Number(movement.point.zMicroFp) / 65_536 - ownPoint.zFp,
      ) <= LAB_SIGHT_RADIUS_FP
    )
      groups.push({
        id: other.companyId,
        kind: 'PLAYER',
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
  const ownPoint = {
    xFp: Number(ownMovement.point.xMicroFp) / 65_536,
    zFp: Number(ownMovement.point.zMicroFp) / 65_536,
  };
  const groups = await observeNearbyPlayers(database, worldId, fixtures, accountId, ownPoint, now);
  // Sample time after the stored plans: concurrent NPC decisions can start
  // a new plan after the observation request began.
  const npcGroups = await readWorldLabNpcGroups(database, worldId);
  const observedNow = typeof now === 'function' ? now() : now;
  const clock = await database
    .transaction()
    .execute((transaction) => readWorldClock(transaction, worldId, observedNow));
  const light = readWorldLight(clock).phase;
  for (const group of npcGroups) {
    if (group.mapEdition !== PAINTED_ATLAS_REGION.mapEdition)
      throw new TypeError('World lab NPC map edition does not match the active atlas');
    if (group.kind === 'CREATURE' && light !== 'NIGHT') continue;
    const observed = worldLabNpcObservation(group, clock.nowMs);
    if (
      Math.hypot(
        Number(observed.point.xMicroFp) / 65_536 - ownPoint.xFp,
        Number(observed.point.zMicroFp) / 65_536 - ownPoint.zFp,
      ) <= LAB_SIGHT_RADIUS_FP
    )
      groups.push(observed);
  }
  groups.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const nearby = paintedAtlasNearbySite(navigationField, ownMovement.point);
  const ownPartyId = ownFixture.partyId;
  return {
    schemaVersion: 1,
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
    nearbySite: nearby ? { siteId: nearby.siteId, name: nearby.name } : null,
  };
}
