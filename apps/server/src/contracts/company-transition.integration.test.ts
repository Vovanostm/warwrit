import { randomUUID } from 'node:crypto';

import {
  canonicalJson,
  canonicalRevision,
  publicRevision,
  readCompanyCombatAggregateState,
  receiveExternalPayment,
  campaignTick,
  FIRST_HUNT_PROOF_DEFINITION_ID,
  FIRST_HUNT_PROOF_ID,
  FIRST_HUNT_REWARD_Q,
  FIRST_HUNT_WALLET_ID,
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../db/database.js';
import { ensureFirstHuntGenesisInTransaction } from './first-hunt-runtime.js';
import { updateCompanyAggregateWithExternalReceipt } from '../company/repository.js';

const connectionString = process.env['WARWRIT_FIRST_HUNT_ISOLATED_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);

afterAll(async () => database?.destroy());

describe('FIRST HUNT revisioned company transition (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'settles retained proof and issuer payment atomically, rejects stale state, and rolls back all effects',
    async () => {
      if (database === undefined) throw new Error('isolated FIRST HUNT test database missing');
      const worldId = randomUUID();
      const companyId = randomUUID();
      const encounterId = randomUUID();
      const fixture = createCompanyCombatAggregateFixture().state;
      const replacements = new Map<string, string>([
        [String(fixture.economy.lifecycle.worldId), worldId],
        [String(fixture.economy.lifecycle.companyId), companyId],
      ]);
      const replaced = JSON.parse(
        JSON.stringify(fixture, (_key, value: unknown) =>
          typeof value === 'string' ? (replacements.get(value) ?? value) : value,
        ),
      ) as typeof fixture;
      const physical = replaced.economy.physical;
      if (!physical) throw new Error('fixture physical state missing');
      const proofSourceId = `encounter:${encounterId}:terminal`;
      const proof = {
        itemId: FIRST_HUNT_PROOF_ID,
        definitionId: FIRST_HUNT_PROOF_DEFINITION_ID,
        owner: { kind: 'COMPANY' as const, id: companyId },
        containerId: physical.containers[0]!.containerId,
        quantity: 1,
        currentCondition: 10000,
        maximumCondition: 10000,
        contentRevision: '0',
        provenance: { sourceId: proofSourceId, parentItemId: null, ordinal: 0 },
        equipped: null,
        tombstone: null,
      };
      const previous = readCompanyCombatAggregateState({
        ...replaced,
        economy: {
          ...replaced.economy,
          physical: {
            ...physical,
            items: [...physical.items, proof],
            knowledge: {
              ...physical.knowledge,
              itemSnapshots: [...physical.knowledge.itemSnapshots, proof],
            },
          },
        },
      });
      const lifecycle = previous.economy.lifecycle;
      const localPool = previous.economy.finance.pools.find((pool) => pool.poolId === 'local');
      const recipient = localPool
        ? previous.economy.finance.wallets.find((wallet) => wallet.walletId === localPool.walletId)
        : undefined;
      if (!recipient) throw new Error('fixture local company purse missing');

      const commandId = `first-hunt-present-${worldId}`;
      const receiptId = randomUUID();
      const rewardQ = FIRST_HUNT_REWARD_Q;
      const requestKey = canonicalJson({
        schemaVersion: 1,
        commandId,
        type: 'PRESENT',
        payload: { instanceId: 'ci.m1.raider-standard.01' },
      });
      const transition = {
        operation: 'PRESENT' as const,
        sourceId: proofSourceId,
        issuerWalletId: FIRST_HUNT_WALLET_ID,
        recipientWalletId: recipient.walletId,
        rewardQ,
        atTick: lifecycle.campaignTick,
        worldWalletBeforeQ: rewardQ,
        worldRevisionBefore: '0',
      };
      const next = readCompanyCombatAggregateState({
        ...previous,
        economy: {
          ...previous.economy,
          finance: receiveExternalPayment(previous.economy.finance, {
            fromWalletId: transition.issuerWalletId,
            toWalletId: transition.recipientWalletId,
            recipient: { kind: 'COMPANY', id: companyId },
            amountQ: BigInt(rewardQ),
            atTick: campaignTick(transition.atTick),
            movementId: `first-hunt-presentation:${receiptId}`,
          }),
          lifecycle: {
            ...lifecycle,
            revision: canonicalRevision((BigInt(lifecycle.revision) + 1n).toString()),
            knowledge: {
              ...lifecycle.knowledge,
              revision: publicRevision((BigInt(lifecycle.knowledge.revision) + 1n).toString()),
            },
          },
        },
      });
      const response = {
        schemaVersion: 1,
        commandId,
        ok: true,
        receiptId,
        publicRevision: '1',
      };
      const event = {
        schemaVersion: 1,
        type: 'FirstHuntProofPresented',
        itemId: FIRST_HUNT_PROOF_ID,
        rewardQ,
      };
      const input = {
        previous,
        next,
        transition,
        commandId,
        receiptId,
        requestKey,
        response,
        eventId: `${commandId}:first-hunt-present`,
        event,
      };

      try {
        await database.transaction().execute(async (transaction) => {
          const world = await ensureFirstHuntGenesisInTransaction(transaction, worldId);
          await transaction
            .updateTable('world_first_hunt_state')
            .set({ wallet_q: rewardQ })
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .insertInto('company_snapshots')
            .values({
              world_id: worldId,
              company_id: companyId,
              schema_version: COMPANY_SCHEMA_VERSION,
              ruleset_id: COMPANY_RULESET_ID,
              catalogue_version: COMPANY_CATALOGUE_VERSION,
              command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
              public_revision: lifecycle.knowledge.revision,
              canonical_revision: lifecycle.revision,
              state: previous,
            })
            .execute();
          await transaction
            .insertInto('encounters')
            .values({
              id: encounterId,
              world_id: worldId,
              schema_version: 2,
              setup: {},
              state: {},
              revision: 8,
              status: 'resolved',
              activation_id: null,
              activation_epoch: 0,
              deadline_at: new Date(),
            })
            .execute();
          await transaction
            .updateTable('contract_instances')
            .set({ owner_company_id: companyId })
            .where('world_id', '=', worldId)
            .where('instance_id', '=', 'ci.m1.raider-standard.01')
            .execute();
          await transaction
            .insertInto('encounter_commands')
            .values({
              encounter_id: encounterId,
              revision: 8,
              command_id: `first-hunt-test-terminal-${worldId}`,
              account_id: null,
              source_kind: 'system_ai',
              body_digest: Buffer.alloc(32),
              command: {},
            })
            .execute();
          await transaction
            .insertInto('encounter_admissions')
            .values({
              encounter_id: encounterId,
              world_id: worldId,
              instance_id: 'ci.m1.raider-standard.01',
              binding_version: 2,
              binding: {
                worldId,
                version: 's02-encounter-binding-2',
                participants: [{ companyId }],
              },
              terminal_revision: 8,
              effects_source_id: null,
              effects_applied_at: null,
            })
            .execute();
          await transaction
            .insertInto('world_proof_claims')
            .values({
              world_id: worldId,
              item_id: FIRST_HUNT_PROOF_ID,
              source_id: proofSourceId,
              encounter_id: encounterId,
              terminal_revision: 8,
              ground_item: null,
              custodian_company_id: companyId,
              redeemed_company_id: null,
              redemption_receipt_id: null,
            })
            .execute();
          const initialWorld = await transaction
            .selectFrom('world_first_hunt_state')
            .select(['wallet_id', 'revision'])
            .where('world_id', '=', worldId)
            .executeTakeFirstOrThrow();
          expect(initialWorld.wallet_id).toBe(world.walletId);
        });

        await expect(
          database.transaction().execute(async (transaction) => {
            await updateCompanyAggregateWithExternalReceipt(transaction, input);
            throw new Error('rollback sentinel');
          }),
        ).rejects.toThrow('rollback sentinel');
        expect(
          await database
            .selectFrom('company_snapshots')
            .select(['canonical_revision', 'state'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .executeTakeFirstOrThrow(),
        ).toMatchObject({ canonical_revision: lifecycle.revision, state: previous });
        expect(
          await database
            .selectFrom('world_first_hunt_state')
            .select('wallet_q')
            .where('world_id', '=', worldId)
            .executeTakeFirstOrThrow(),
        ).toEqual({ wallet_q: rewardQ });
        expect(
          await database
            .selectFrom('world_proof_claims')
            .select(['redeemed_company_id', 'redemption_receipt_id'])
            .where('world_id', '=', worldId)
            .where('item_id', '=', FIRST_HUNT_PROOF_ID)
            .executeTakeFirstOrThrow(),
        ).toEqual({ redeemed_company_id: null, redemption_receipt_id: null });

        await database
          .transaction()
          .execute((transaction) => updateCompanyAggregateWithExternalReceipt(transaction, input));
        const stored = await database
          .selectFrom('company_snapshots')
          .select(['canonical_revision', 'public_revision', 'state'])
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        expect(stored.canonical_revision).toBe(next.economy.lifecycle.revision);
        expect(stored.public_revision).toBe(next.economy.lifecycle.knowledge.revision);
        expect(readCompanyCombatAggregateState(stored.state)).toEqual(next);
        expect(
          await database
            .selectFrom('world_first_hunt_state')
            .select(['wallet_q', 'revision'])
            .where('world_id', '=', worldId)
            .executeTakeFirstOrThrow(),
        ).toEqual({ wallet_q: '0', revision: '1' });
        expect(
          await database
            .selectFrom('world_proof_claims')
            .select(['redeemed_company_id', 'redemption_receipt_id'])
            .where('world_id', '=', worldId)
            .where('item_id', '=', FIRST_HUNT_PROOF_ID)
            .executeTakeFirstOrThrow(),
        ).toEqual({ redeemed_company_id: companyId, redemption_receipt_id: receiptId });
        expect(
          await database
            .selectFrom('company_receipts')
            .select(['response', 'resulting_revision'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .where('command_id', '=', commandId)
            .executeTakeFirst(),
        ).toEqual({ response, resulting_revision: next.economy.lifecycle.revision });
        expect(
          await database
            .selectFrom('company_audit_events')
            .select(['revision', 'event'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .where('event_id', '=', input.eventId)
            .executeTakeFirst(),
        ).toEqual({ revision: next.economy.lifecycle.revision, event });

        await expect(
          database
            .transaction()
            .execute((transaction) =>
              updateCompanyAggregateWithExternalReceipt(transaction, input),
            ),
        ).rejects.toThrow('FIRST HUNT proof claim does not match its company transition');
        expect(
          await database
            .selectFrom('company_receipts')
            .select('command_id')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute(),
        ).toHaveLength(1);
      } finally {
        await database.transaction().execute(async (transaction) => {
          await transaction
            .deleteFrom('world_proof_claims')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('encounter_commands')
            .where('encounter_id', '=', encounterId)
            .execute();
          await transaction
            .deleteFrom('encounter_admissions')
            .where('encounter_id', '=', encounterId)
            .execute();
          await transaction.deleteFrom('encounters').where('id', '=', encounterId).execute();
          await transaction
            .deleteFrom('company_receipts')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('company_audit_events')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('contract_instances')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('company_snapshots')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('world_first_hunt_state')
            .where('world_id', '=', worldId)
            .execute();
        });
      }
    },
  );
});
