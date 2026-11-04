import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { PAINTED_ATLAS_REGION, paintedAtlasPoint } from '@warwrit/game-core';
import type { WorldFreeMovementV2RequestDto } from '@warwrit/protocol';
import { createDatabase } from '../../apps/server/src/db/database.js';
import { readWorldLabState } from '../../apps/server/src/world-lab/state.js';
import { executeWorldLabGroundOrder } from '../../apps/server/src/world-lab/pursuit.js';
import { readCompanyCartography } from '../../apps/server/src/world-lab/cartography-store.js';
import { cartographyIdentity } from '../../apps/server/src/world-lab/cartography-field.js';
import { ensureWorldLabSeed } from './world-lab-seed.js';

const url = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const db = url ? createDatabase(url) : undefined;
afterAll(async () => db?.destroy());

async function scenario() {
  if (!db) throw Error('PostgreSQL required');
  const worldId = randomUUID(),
    fixtures = await ensureWorldLabSeed(db, worldId),
    own = fixtures[0]!;
  const row = await db
    .selectFrom('world_campaign_clocks')
    .select('epoch_ms')
    .where('world_id', '=', worldId)
    .executeTakeFirstOrThrow();
  let time = Number(row.epoch_ms) + 600000;
  const context = { database: db, worldId, fixtures, now: () => new Date(time) };
  const state = () =>
    readWorldLabState(db, worldId, fixtures, own.accountId, context.now).then((value) => {
      if (!value) throw Error('Missing state');
      return value;
    });
  return {
    context,
    own,
    state,
    advanceTo: (at: number) => {
      time = at;
    },
  };
}

it.skipIf(!db)(
  'filters real hidden enemies and rejects guessed locations without persisting an order',
  async () => {
    const s = await scenario(),
      before = await s.state();
    expect(before.groups.some((group) => group.id === 'lab-bandits')).toBe(false);
    expect(before.cartography.sites.some((site) => site.siteId === 'staraya-melnitsa')).toBe(false);
    expect(before.cartography.sites.find((site) => site.siteId === 'bereznyak')?.visited).toBe(
      false,
    );
    const receipts = await db!
      .selectFrom('world_route_receipts')
      .select('command_id')
      .where('world_id', '=', s.context.worldId)
      .execute();
    for (const siteId of ['staraya-melnitsa', 'invented-secret-id']) {
      const input: WorldFreeMovementV2RequestDto = {
        schemaVersion: 2,
        commandId: randomUUID(),
        expectedPublicRevision: before.own.movement.publicRevision,
        expectedMovementEpoch: before.own.movement.movementEpoch,
        action: {
          kind: 'MOVE_TO',
          mapEdition: PAINTED_ATLAS_REGION.mapEdition,
          target: { kind: 'SITE', siteId },
        },
      };
      await expect(
        executeWorldLabGroundOrder(s.context, s.own, input, s.own.companyId),
      ).rejects.toMatchObject({ code: 'MAP_INFORMATION_REQUIRED' });
    }
    const after = await s.state();
    expect({
      movement: after.own.movement,
      revision: after.cartography.revision,
      receipts: await db!
        .selectFrom('world_route_receipts')
        .select('command_id')
        .where('world_id', '=', s.context.worldId)
        .execute(),
    }).toEqual({ movement: before.own.movement, revision: before.cartography.revision, receipts });
    s.advanceTo(s.context.now().getTime() + 100);
    expect((await s.state()).cartography.revision).toBe(before.cartography.revision);
  },
);

it.skipIf(!db)(
  'catches up retained travel through a new pool without a browser and keeps companies isolated',
  async () => {
    const s = await scenario(),
      before = await s.state();
    const input: WorldFreeMovementV2RequestDto = {
      schemaVersion: 2,
      commandId: randomUUID(),
      expectedPublicRevision: before.own.movement.publicRevision,
      expectedMovementEpoch: before.own.movement.movementEpoch,
      action: {
        kind: 'MOVE_TO',
        mapEdition: PAINTED_ATLAS_REGION.mapEdition,
        target: { kind: 'TERRAIN', ...paintedAtlasPoint([1765, 1244]) },
      },
    };
    const accepted = await executeWorldLabGroundOrder(s.context, s.own, input, s.own.companyId);
    if (!accepted.plan) throw Error('Expected accepted saved plan');
    s.advanceTo(Number(accepted.plan.arrivesAtMs) + 300000);
    const fresh = createDatabase(url!);
    try {
      const after = await readWorldLabState(
        fresh,
        s.context.worldId,
        s.context.fixtures,
        s.own.accountId,
        s.context.now,
      );
      if (!after) throw Error('Missing resumed company');
      const stored = await readCompanyCartography(
        fresh,
        cartographyIdentity(s.context.worldId, s.own.companyId),
      );
      const other = await readCompanyCartography(
        fresh,
        cartographyIdentity(s.context.worldId, s.context.fixtures[1]!.companyId),
      );
      expect({
        point: after.own.movement.point,
        cursor: stored.cursor?.exploredThroughMs,
        visited: stored.places.find((place) => place.siteId === 'bereznyak')?.firstVisitedAt,
        otherEmpty: other.exploredBits.every((byte) => byte === 0),
      }).toEqual({
        point: accepted.plan.goal,
        cursor: String(s.context.now().getTime()),
        visited: null,
        otherEmpty: true,
      });
      const old = Buffer.from(before.cartography.explored, 'base64');
      expect(stored.exploredBits.every((byte, index) => (byte & old[index]!) === old[index])).toBe(
        true,
      );
      expect(stored.exploredBits.equals(old)).toBe(false);
    } finally {
      await fresh.destroy();
    }
  },
);
