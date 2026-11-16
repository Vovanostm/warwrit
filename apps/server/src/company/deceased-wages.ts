import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  canonicalJson,
  companySourceKey,
  parseCompanyCommand,
  payDeceasedWages,
  publicRevision,
} from '@warwrit/game-core';
import type {
  AtLocation,
  CampaignTick,
  CompanyEconomyState,
  LocalMoneyAccess,
} from '@warwrit/game-core';
import type { CompanyCommandAcceptedDto } from '@warwrit/protocol';
import { sql, type Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import { catchUpStationaryCompany } from './executor.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  readCompanyCommandReceipt,
  updateCompanyAggregateWithReceipt,
} from './repository.js';
import type { CompanyStorageWrite } from './repository.js';
import { locateCarriedCompanyPurse, readCarriedSupplyPurse } from './supplies.js';
import type { PayDeceasedWagesRequest } from './deceased-wages-routes.js';
import { hasExactKeys, isRecord } from '../record-guards.js';

export interface DeceasedWageAccessScope {
  readonly worldId: string;
  readonly companyId: string;
  readonly atTick: CampaignTick;
  readonly commandId: string;
  readonly sourceEventId: string;
  readonly characterId: string;
  readonly expectedPublicRevision: string;
  readonly carriedPurse: { readonly walletId: string; readonly partyId: string } | undefined;
}

export type DeceasedWageCommandExecution =
  | { readonly kind: 'COMMITTED'; readonly response: CompanyCommandAcceptedDto }
  | {
      readonly kind: 'REJECTED';
      readonly statusCode: number;
      readonly response: {
        readonly commandId: string;
        readonly ok: false;
        readonly publicRevision: string;
        readonly code:
          | 'NOT_AUTHORIZED'
          | 'CONTACT_OR_ACCESS_REQUIRED'
          | 'IDEMPOTENCY_CONFLICT'
          | 'STALE_REVISION'
          | 'INSUFFICIENT_FUNDS'
          | 'UNSUPPORTED_ACTION'
          | 'INVALID_COMMAND';
      };
    };

type DeceasedWageRejectCode = DeceasedWageCommandExecution extends infer Result
  ? Result extends { readonly kind: 'REJECTED'; readonly response: { readonly code: infer Code } }
    ? Code
    : never
  : never;

export type DeceasedWageAccess =
  | { readonly kind: 'REJECTED'; readonly reason: 'CONTACT_OR_ACCESS_REQUIRED' }
  | {
      readonly kind: 'PREPARED';
      readonly access: LocalMoneyAccess;
      readonly contactIds: readonly string[];
    };

export function deceasedWageAccessId(scope: DeceasedWageAccessScope): string {
  const key = canonicalJson([
    scope.worldId,
    scope.companyId,
    scope.commandId,
    scope.sourceEventId,
    scope.characterId,
  ]);
  return `deceased-wage-access:${createHash('sha256').update(key).digest('hex')}`;
}

function samePlace(
  location: { readonly kind: string; readonly siteId?: string; readonly areaId?: string },
  place: AtLocation,
) {
  return (
    location.kind === 'AT' && location.siteId === place.siteId && location.areaId === place.areaId
  );
}

function companyWallet(root: CompanyEconomyState, walletId: string) {
  const found = root.finance.wallets.filter((wallet) => wallet.walletId === walletId);
  const wallet = found.length === 1 ? found[0] : undefined;
  return wallet?.owner.kind === 'COMPANY' && wallet.owner.id === root.lifecycle.companyId
    ? wallet
    : undefined;
}

/** Prepare one local access fact for all historical claim pools; the domain validates debt. */
export function prepareDeceasedWageAccess(
  root: CompanyEconomyState,
  scope: DeceasedWageAccessScope,
): DeceasedWageAccess {
  const rejected = { kind: 'REJECTED', reason: 'CONTACT_OR_ACCESS_REQUIRED' } as const;
  if (
    root.lifecycle.worldId !== scope.worldId ||
    root.lifecycle.companyId !== scope.companyId ||
    root.lifecycle.knowledge.revision !== scope.expectedPublicRevision ||
    root.lifecycle.campaignTick !== scope.atTick ||
    root.finance.processedTick !== scope.atTick ||
    !scope.carriedPurse
  )
    return rejected;

  const parties = root.lifecycle.parties.filter(
    (party) => party.partyId === scope.carriedPurse!.partyId,
  );
  const party = parties.length === 1 ? parties[0] : undefined;
  const place = party?.location.kind === 'AT' ? party.location : undefined;
  if (!place || place.siteId !== 'kamenny-brod') return rejected;

  const purse = companyWallet(root, scope.carriedPurse.walletId);
  if (!purse || !samePlace(purse.location, place)) return rejected;

  const membershipIds = new Set<string>(
    root.lifecycle.memberships
      .filter(
        (membership) =>
          membership.companyId === scope.companyId && membership.characterId === scope.characterId,
      )
      .map((membership) => membership.membershipId),
  );
  if (membershipIds.size === 0) return rejected;
  const poolIds = [
    ...new Set(
      root.finance.claims
        .filter((claim) => membershipIds.has(claim.membershipId))
        .map((claim) => claim.poolId),
    ),
  ].sort();
  if (poolIds.length === 0) return rejected;

  for (const poolId of poolIds) {
    const pools = root.finance.pools.filter((pool) => pool.poolId === poolId);
    const wallet = pools.length === 1 ? companyWallet(root, pools[0]!.walletId) : undefined;
    if (!wallet || !samePlace(wallet.location, place)) return rejected;
  }

  const contactIds = root.lifecycle.characters
    .filter(
      (character) =>
        samePlace(character.presence.location, place) &&
        character.presence.availability === 'AVAILABLE' &&
        character.presence.encounterBindingId === null,
    )
    .map((character) => character.identity.characterId)
    .sort();
  const operatorId = contactIds.find((id) =>
    root.lifecycle.memberships.some(
      (membership) =>
        membership.companyId === scope.companyId &&
        membership.characterId === id &&
        membership.endedAt === null,
    ),
  );
  if (!operatorId) return rejected;

  return {
    kind: 'PREPARED',
    contactIds,
    access: {
      kind: 'LOCAL_MONEY_ACCESS',
      id: deceasedWageAccessId(scope),
      companyId: scope.companyId,
      worldId: scope.worldId,
      revision: root.lifecycle.revision,
      atTick: scope.atTick,
      sourceEventId: scope.sourceEventId,
      operatorId,
      location: { ...place },
      poolIds,
      // Kin is represented by the accepted external sink; no recipient wallet is required.
      recipientWalletIds: [],
    },
  };
}

/**
 * Persist one accepted V2 deceased-payroll request. Exact receipts are checked before
 * revision/time/location preconditions so a retry after a committed response loss replays.
 */
export async function executePayDeceasedWages(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly accountId: string;
  readonly worldId: string;
  readonly expectedCompanyId: string | undefined;
  readonly request: PayDeceasedWagesRequest;
  readonly requestKey: string;
  readonly now: Date;
}): Promise<DeceasedWageCommandExecution> {
  const reject = (
    code: DeceasedWageRejectCode,
    revision = '0',
    statusCode = 409,
  ): DeceasedWageCommandExecution => ({
    kind: 'REJECTED',
    statusCode,
    response: { commandId: input.request.commandId, ok: false, publicRevision: revision, code },
  });
  if (!input.expectedCompanyId || input.requestKey !== canonicalJson(input.request))
    return reject('INVALID_COMMAND', '0', 400);

  const account = await input.transaction
    .selectFrom('identity_accounts')
    .select('id')
    .where('id', '=', input.accountId)
    .forUpdate()
    .executeTakeFirst();
  if (!account) return reject('NOT_AUTHORIZED', '0', 401);

  const companyId = await findOwnedCompanyId(input.transaction, input.worldId, input.accountId);
  if (!companyId || companyId !== input.expectedCompanyId)
    return reject('NOT_AUTHORIZED', '0', 403);

  const previous = await lockCompanyAggregate(input.transaction, input.worldId, companyId);
  if (!previous) throw new Error('Owned company snapshot is unavailable');
  const previousEconomy = previous.economy;
  const previousLife = previousEconomy.lifecycle;

  const existing = await readCompanyCommandReceipt(
    input.transaction,
    input.worldId,
    companyId,
    input.request.commandId,
  );
  if (existing) {
    if (existing.requestKey !== input.requestKey)
      return reject('IDEMPOTENCY_CONFLICT', previousLife.knowledge.revision);
    const response = acceptedCompanyReceipt(existing.response, input.request.commandId);
    return response
      ? { kind: 'COMMITTED', response }
      : reject('INVALID_COMMAND', previousLife.knowledge.revision);
  }

  if (input.request.expectedPublicRevision !== previousLife.knowledge.revision)
    return reject('STALE_REVISION', previousLife.knowledge.revision);

  await sql`SAVEPOINT deceased_wage_catch_up`.execute(input.transaction);
  const releaseCatchUp = async () => {
    await sql`RELEASE SAVEPOINT deceased_wage_catch_up`.execute(input.transaction);
  };
  const rollbackCatchUp = async () => {
    await sql`ROLLBACK TO SAVEPOINT deceased_wage_catch_up`.execute(input.transaction);
    await releaseCatchUp();
  };
  const clock = await readWorldClock(input.transaction, input.worldId, input.now, true);
  const caughtUp = await catchUpStationaryCompany({
    transaction: input.transaction,
    accountId: input.accountId,
    state: previous,
    atTick: clock.tick,
    requestKind: 'DECEASED_WAGES_CATCH_UP',
  });
  if (!caughtUp) {
    await rollbackCatchUp();
    return reject('UNSUPPORTED_ACTION', previousLife.knowledge.revision);
  }
  const current = caughtUp;
  const currentEconomy = current.economy;
  const currentLife = currentEconomy.lifecycle;
  if (
    current.encounter.active !== null ||
    currentLife.parties.some(
      (party) => party.location.kind === 'TRANSIT' || party.location.kind === 'MOVING',
    ) ||
    currentLife.campaignTick !== currentEconomy.finance.processedTick
  ) {
    await rollbackCatchUp();
    return reject('UNSUPPORTED_ACTION', previousLife.knowledge.revision);
  }

  const party = currentLife.parties.length === 1 ? currentLife.parties[0] : undefined;
  if (!party || party.location.kind !== 'AT' || party.location.siteId !== 'kamenny-brod') {
    await rollbackCatchUp();
    return reject('CONTACT_OR_ACCESS_REQUIRED', previousLife.knowledge.revision);
  }
  const carriedPurse = await readCarriedSupplyPurse(
    input.transaction,
    input.worldId,
    companyId,
    input.accountId,
  );
  const located = locateCarriedCompanyPurse(current, carriedPurse);
  const preparedEconomy = located.economy;
  const sourceEventId = input.request.commandId;
  const scope: DeceasedWageAccessScope = {
    worldId: input.worldId,
    companyId,
    atTick: currentLife.campaignTick,
    commandId: input.request.commandId,
    sourceEventId,
    characterId: input.request.payload.characterId,
    expectedPublicRevision: currentLife.knowledge.revision,
    carriedPurse,
  };
  const preparedAccess = prepareDeceasedWageAccess(preparedEconomy, scope);
  if (preparedAccess.kind !== 'PREPARED') {
    await rollbackCatchUp();
    return reject('CONTACT_OR_ACCESS_REQUIRED', previousLife.knowledge.revision);
  }

  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: input.request.commandId,
    worldId: input.worldId,
    companyId,
    actorRef: { kind: 'PLAYER', id: input.accountId },
    expectedRevision: publicRevision(currentLife.knowledge.revision),
    campaignTick: currentLife.campaignTick,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId,
    type: 'PayDeceasedWages',
    payload: { characterId: input.request.payload.characterId },
  });
  if (!parsed.ok || parsed.command.type !== 'PayDeceasedWages') {
    await rollbackCatchUp();
    return reject('INVALID_COMMAND', previousLife.knowledge.revision);
  }

  let result: ReturnType<typeof payDeceasedWages>;
  try {
    result = payDeceasedWages(preparedEconomy, parsed.command, {
      worldId: input.worldId,
      companyId,
      principal: { kind: 'PLAYER', id: input.accountId },
      publicRevision: currentLife.knowledge.revision,
      canonicalRevision: currentLife.revision,
      atTick: currentLife.campaignTick,
      completeGraph: true,
      contactIds: preparedAccess.contactIds,
      facts: [],
      financeFacts: [preparedAccess.access],
    });
  } catch (error) {
    await rollbackCatchUp();
    return reject(mapSettlementError(error), previousLife.knowledge.revision);
  }

  const sourceKey = companySourceKey(parsed.command);
  const next = { ...located, economy: result.next };
  const response: CompanyCommandAcceptedDto = {
    commandId: input.request.commandId,
    ok: true,
    publicRevision: result.next.lifecycle.knowledge.revision,
  };
  const write: CompanyStorageWrite = {
    command: parsed.command,
    receipt: {
      receiptId: randomUUID(),
      commandId: input.request.commandId,
      sourceKey,
      requestKey: input.requestKey,
      response,
      resultingRevision: result.next.lifecycle.revision,
    },
    auditEvents: [
      {
        eventId: deceasedWageAccessId(scope),
        revision: result.next.lifecycle.revision,
        event: {
          ...result.settlement,
          commandId: input.request.commandId,
        },
      },
    ],
  };
  await updateCompanyAggregateWithReceipt(
    input.transaction,
    currentLife.revision,
    result.next.lifecycle.revision,
    next,
    write,
  );
  await releaseCatchUp();
  return { kind: 'COMMITTED', response };
}

function acceptedCompanyReceipt(
  value: unknown,
  commandId: string,
): CompanyCommandAcceptedDto | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['commandId', 'ok', 'publicRevision']) ||
    value['commandId'] !== commandId ||
    value['ok'] !== true ||
    typeof value['publicRevision'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/u.test(value['publicRevision'])
  )
    return undefined;
  return value as unknown as CompanyCommandAcceptedDto;
}

function mapSettlementError(
  error: unknown,
):
  | 'CONTACT_OR_ACCESS_REQUIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'STALE_REVISION'
  | 'INSUFFICIENT_FUNDS'
  | 'UNSUPPORTED_ACTION' {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (
    code === 'CONTACT_OR_ACCESS_REQUIRED' ||
    code === 'IDEMPOTENCY_CONFLICT' ||
    code === 'STALE_REVISION' ||
    code === 'INSUFFICIENT_FUNDS'
  )
    return code;
  return 'UNSUPPORTED_ACTION';
}
