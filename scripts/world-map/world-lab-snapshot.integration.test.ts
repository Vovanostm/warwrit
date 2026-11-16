import { randomUUID } from 'node:crypto';
import { TableNode, type KyselyPlugin } from 'kysely';
import { afterAll, expect, it } from 'vitest';
import { PAINTED_ATLAS_REGION, paintedAtlasPoint } from '@warwrit/game-core';
import { createDatabase } from '../../apps/server/src/db/database.js';
import {
  executeContinuousMovement,
  readContinuousMovementProjection,
} from '../../apps/server/src/world/continuous-movement.js';
import {
  readWorldLabNpcGroups,
  updateWorldLabNpcGroup,
} from '../../apps/server/src/world-lab/npc-store.js';
import { worldLabNpcObservation } from '../../apps/server/src/world-lab/npc-worker.js';
import { readWorldLabState } from '../../apps/server/src/world-lab/state.js';
import { ensureWorldLabSeed } from './world-lab-seed.js';

const url = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = url ? createDatabase(url) : undefined;
afterAll(async () => database?.destroy());

it.skipIf(!database)(
  'observes captured targets at one own timestamp across a later route commit without clamping past time',
  async () => {
    const db = database!;
    const writer = createDatabase(url!);
    try {
      const worldId = randomUUID();
      const fixtures = await ensureWorldLabSeed(db, worldId);
      const own = fixtures[0]!;
      const other = fixtures[1]!;
      const epoch = await db
        .selectFrom('world_campaign_clocks')
        .select('epoch_ms')
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const observedAt = Number(epoch.epoch_ms) + 600_000;
      const committedAt = observedAt + 100;
      const otherBefore = await readContinuousMovementProjection(
        db,
        worldId,
        other.companyId,
        PAINTED_ATLAS_REGION,
        new Date(observedAt),
      );
      const npc = (await readWorldLabNpcGroups(db, worldId)).find(
        (group) => group.groupId === 'lab-bandits',
      )!;
      // Put the actual persisted NPC fixture beside the second company, inside
      // the first company's night sight. No worker runs in this isolated world.
      const npcBefore = await updateWorldLabNpcGroup(db, {
        prior: npc,
        state: { ...npc.state, point: paintedAtlasPoint([1760, 1244]) },
        nextDecisionMs: npc.nextDecisionMs,
      });
      const before = await readWorldLabState(
        db,
        worldId,
        fixtures,
        own.accountId,
        new Date(observedAt),
      );
      const oldPlayer = before!.groups.find((group) => group.id === other.companyId);
      const oldNpc = before!.groups.find((group) => group.id === npc.groupId);
      expect(oldPlayer).toBeDefined();
      expect(oldNpc).toBeDefined();
      const accountReads = new WeakSet<object>();
      let committed = false;
      let nowReads = 0;
      const interleave = {
        transformQuery({ node, queryId }) {
          if (
            node.kind === 'SelectQueryNode' &&
            node.from?.froms.some(
              (table) => TableNode.is(table) && table.table.identifier.name === 'identity_accounts',
            )
          )
            accountReads.add(queryId);
          return node;
        },
        async transformResult({ queryId, result }) {
          if (!committed && accountReads.has(queryId)) {
            // The reader has taken its own account lock, but not its clock lock.
            // Commit through a separate real pool while that result is delayed.
            const moved = await executeContinuousMovement(
              writer,
              worldId,
              other.accountId,
              other.companyId,
              {
                schemaVersion: 2,
                commandId: randomUUID(),
                expectedPublicRevision: otherBefore.movement.publicRevision,
                expectedMovementEpoch: otherBefore.movement.movementEpoch,
                action: {
                  kind: 'MOVE_TO',
                  mapEdition: PAINTED_ATLAS_REGION.mapEdition,
                  target: { kind: 'TERRAIN', ...paintedAtlasPoint([1765, 1244]) },
                },
              },
              PAINTED_ATLAS_REGION,
              new Date(committedAt),
            );
            expect(moved.plan?.startedAtMs).toBe(String(committedAt));
            const npcAfter = await updateWorldLabNpcGroup(writer, {
              prior: npcBefore,
              state: { ...npcBefore.state, plan: moved.plan, movementEpoch: moved.movementEpoch },
              nextDecisionMs: moved.plan!.arrivesAtMs,
            });
            expect(() => worldLabNpcObservation(npcAfter, String(observedAt))).toThrow(
              'TRUSTED_TIME_UNAVAILABLE',
            );
            committed = true;
          }
          return result;
        },
      } satisfies KyselyPlugin;
      const captured = await readWorldLabState(
        db.withPlugin(interleave),
        worldId,
        fixtures,
        own.accountId,
        () => {
          nowReads += 1;
          return new Date(observedAt);
        },
      );
      expect({ committed, nowReads }).toEqual({ committed: true, nowReads: 1 });
      expect(captured!.groups.find((group) => group.id === other.companyId)).toEqual(oldPlayer);
      expect(captured!.groups.find((group) => group.id === npc.groupId)).toEqual(oldNpc);
      expect(
        new Set([
          captured!.sequence,
          captured!.serverTimeMs,
          captured!.own.movement.serverTimeMs,
          ...captured!.groups.map((group) => group.observedAtMs),
        ]),
      ).toEqual(new Set([String(observedAt)]));
      await expect(
        readWorldLabState(db, worldId, fixtures, own.accountId, new Date(observedAt)),
      ).rejects.toThrow('TRUSTED_TIME_UNAVAILABLE');
      const fresh = await readWorldLabState(
        db,
        worldId,
        fixtures,
        own.accountId,
        new Date(committedAt),
      );
      for (const id of [other.companyId, npc.groupId])
        expect(fresh!.groups.find((group) => group.id === id)).toMatchObject({
          state: 'MOVING',
          movementEpoch: '1',
          observedAtMs: String(committedAt),
        });
    } finally {
      await writer.destroy();
    }
  },
);
