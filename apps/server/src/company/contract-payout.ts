import {
  campaignTick,
  canonicalRevision,
  canonicalStateJson,
  publicRevision,
  readCompanyCombatAggregateState,
  receiveExternalPayment,
  type CompanyCombatAggregateState,
} from '@warwrit/game-core';
import { sql, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';

/**
 * Pay a contract reward from an issuer wallet into the company's local purse and persist the
 * company root with its receipt and audit event. The next root is derived here, so nothing
 * but the payment and the two revisions can change.
 */
export async function persistContractRewardPayment(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly previous: CompanyCombatAggregateState;
    readonly issuerWalletId: string;
    readonly rewardQ: string;
    readonly atTick: string;
    readonly commandId: string;
    readonly receiptId: string;
    readonly requestKey: string;
    readonly response: Readonly<Record<string, unknown>>;
    readonly event: Readonly<Record<string, unknown>>;
  },
): Promise<CompanyCombatAggregateState> {
  const { previous } = input;
  const life = previous.economy.lifecycle;
  const companyId = String(life.companyId);
  const pool = previous.economy.finance.pools.find((entry) => entry.poolId === 'local');
  const purse = previous.economy.finance.wallets.find(
    (wallet) =>
      wallet.walletId === pool?.walletId &&
      wallet.owner.kind === 'COMPANY' &&
      String(wallet.owner.id) === companyId,
  );
  if (!purse) throw new TypeError('Company has no local purse for a contract reward');
  const finance = receiveExternalPayment(previous.economy.finance, {
    fromWalletId: input.issuerWalletId,
    toWalletId: purse.walletId,
    recipient: { kind: 'COMPANY', id: companyId },
    amountQ: BigInt(input.rewardQ),
    atTick: campaignTick(input.atTick),
    movementId: `contract-reward:${input.receiptId}`,
  });
  const next = readCompanyCombatAggregateState({
    ...previous,
    economy: {
      ...previous.economy,
      finance,
      lifecycle: {
        ...life,
        revision: canonicalRevision((BigInt(life.revision) + 1n).toString()),
        knowledge: {
          ...life.knowledge,
          revision: publicRevision((BigInt(life.knowledge.revision) + 1n).toString()),
        },
      },
    },
  });

  const locked = await transaction
    .selectFrom('company_snapshots')
    .select(['canonical_revision', 'public_revision', 'state'])
    .where('world_id', '=', life.worldId)
    .where('company_id', '=', companyId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !locked ||
    locked.canonical_revision !== life.revision ||
    locked.public_revision !== life.knowledge.revision ||
    canonicalStateJson(readCompanyCombatAggregateState(locked.state)) !==
      canonicalStateJson(previous)
  )
    throw new Error('Company root changed before the contract reward was persisted');
  const updated = await transaction
    .updateTable('company_snapshots')
    .set({
      canonical_revision: next.economy.lifecycle.revision,
      public_revision: next.economy.lifecycle.knowledge.revision,
      state: next,
      updated_at: sql<Date>`now()`,
    })
    .where('world_id', '=', life.worldId)
    .where('company_id', '=', companyId)
    .where('canonical_revision', '=', life.revision)
    .where('public_revision', '=', life.knowledge.revision)
    .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1) throw new Error('Company root CAS failed');
  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: life.worldId,
      company_id: companyId,
      receipt_id: input.receiptId,
      command_id: input.commandId,
      source_key: null,
      request_key: input.requestKey,
      response: input.response,
      resulting_revision: next.economy.lifecycle.revision,
    })
    .execute();
  await transaction
    .insertInto('company_audit_events')
    .values({
      world_id: life.worldId,
      company_id: companyId,
      revision: next.economy.lifecycle.revision,
      event_id: `${input.commandId}:contract-reward`,
      event: input.event,
    })
    .execute();
  return next;
}
