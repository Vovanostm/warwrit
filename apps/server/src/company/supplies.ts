import {
  SUPPLY_SHOPS,
  SUPPLY_PRICE_Q,
  SUPPLY_INITIAL_RATIONS,
  supplySpendableCashQ,
} from '@warwrit/game-core';
import type { Kysely, Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import type { SupplyShopDto } from '@warwrit/protocol';
import { lockCompanyAggregate } from './repository.js';

export async function readSupplyShop(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  siteId: string,
  companyId: string,
  accountId: string,
): Promise<SupplyShopDto | undefined> {
  if (!SUPPLY_SHOPS.includes(siteId)) return undefined;
  await database
    .insertInto('settlement_supplies')
    .values({
      world_id: worldId,
      site_id: siteId,
      revision: '0',
      rations: SUPPLY_INITIAL_RATIONS,
      cash_q: '0',
    })
    .onConflict((conflict) => conflict.columns(['world_id', 'site_id']).doNothing())
    .execute();
  const row = await database
    .selectFrom('settlement_supplies')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('site_id', '=', siteId)
    .executeTakeFirstOrThrow();
  return database.transaction().execute(async (transaction) => {
    const company = await lockCompanyAggregate(transaction, worldId, companyId);
    if (!company) return undefined;
    const carriedPurse = await readCarriedSupplyPurse(transaction, worldId, companyId, accountId);
    return {
      siteId,
      revision: String(row.revision),
      rations: row.rations,
      rationPriceQ: SUPPLY_PRICE_Q,
      availableCashQ: supplySpendableCashQ(company.economy, siteId, carriedPurse),
    };
  });
}

export async function readCarriedSupplyPurse(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  accountId: string,
) {
  // The issued opening attests the one field purse that travels with this exact party.
  // Never use an arbitrary company wallet (e.g. a remote store) as carried money.
  const opening = await transaction
    .selectFrom('company_opening_options')
    .select('evidence')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('account_id', '=', accountId)
    .where('consumed_at', 'is not', null)
    .executeTakeFirst();
  return validatedCarriedPurse(opening?.evidence, worldId, companyId);
}

function validatedCarriedPurse(value: unknown, worldId: string, companyId: string) {
  const evidence = value as
    | {
        readonly id?: string;
        readonly partyId?: string;
        readonly worldId?: string;
        readonly companyId?: string;
      }
    | undefined;
  if (!evidence) return undefined;
  if (evidence.worldId !== worldId) return undefined;
  if (evidence.companyId !== companyId) return undefined;
  return carriedPurseIdentity(evidence);
}

function carriedPurseIdentity(evidence: { readonly id?: string; readonly partyId?: string }) {
  if (typeof evidence.id !== 'string' || typeof evidence.partyId !== 'string') return undefined;
  return { walletId: `${evidence.id}:company-purse`, partyId: evidence.partyId };
}
