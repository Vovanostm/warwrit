import { createHash } from 'node:crypto';
import { sql, type Transaction } from 'kysely';
import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  FIRST_HUNT_INSTANCE_ID,
  huntProfile,
  availableContainerG,
  campaignTick,
  canonicalJson,
  canonicalStateJson,
  companySourceKey,
  parseCompanyCommand,
  receiveExternalPayment,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, HuntProfile } from '@warwrit/game-core';
import type { DatabaseSchema } from '../db/database.js';

export interface CompanyStorageReceipt {
  readonly receiptId: string;
  readonly commandId: string;
  readonly sourceKey: string | null;
  readonly requestKey: string;
  readonly response: Readonly<object>;
  readonly resultingRevision: string;
}

export interface CompanyStorageAuditEvent {
  readonly eventId: string;
  readonly revision: string;
  readonly event: Readonly<object>;
}

export interface CompanyStorageWrite {
  readonly receipt: CompanyStorageReceipt;
  readonly command: unknown;
  readonly auditEvents: readonly CompanyStorageAuditEvent[];
}

export type FirstHuntExternalCompanyTransition =
  | {
      readonly operation: 'PICKUP';
      readonly instanceId: string;
      readonly sourceId: string;
      readonly targetContainerId: string;
    }
  | {
      readonly operation: 'PRESENT';
      readonly instanceId: string;
      readonly sourceId: string;
      readonly issuerWalletId: string;
      readonly recipientWalletId: string;
      readonly rewardQ: string;
      readonly atTick: string;
      readonly worldWalletBeforeQ: string;
      readonly worldRevisionBefore: string;
    };

export async function loadCompanyAggregate(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
): Promise<CompanyCombatAggregateState | undefined> {
  const row = await transaction
    .selectFrom('company_snapshots')
    .select([
      'world_id',
      'company_id',
      'schema_version',
      'ruleset_id',
      'catalogue_version',
      'command_schema_version',
      'public_revision',
      'canonical_revision',
      'state',
    ])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirst();
  if (!row) return undefined;
  if (
    row.schema_version !== COMPANY_SCHEMA_VERSION ||
    row.ruleset_id !== COMPANY_RULESET_ID ||
    row.catalogue_version !== COMPANY_CATALOGUE_VERSION ||
    row.command_schema_version !== COMPANY_COMMAND_SCHEMA_VERSION
  )
    throw new TypeError('Unsupported company snapshot metadata');
  const state = readCompanyCombatAggregateState(row.state);
  if (
    state.economy.lifecycle.worldId !== row.world_id ||
    state.economy.lifecycle.companyId !== row.company_id ||
    state.economy.lifecycle.revision !== row.canonical_revision ||
    state.economy.lifecycle.knowledge.revision !== row.public_revision
  )
    throw new TypeError('Company snapshot scope does not match its root');
  return state;
}

export async function lockCompanyAggregate(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
): Promise<CompanyCombatAggregateState | undefined> {
  const row = await transaction
    .selectFrom('company_snapshots')
    .select([
      'world_id',
      'company_id',
      'schema_version',
      'ruleset_id',
      'catalogue_version',
      'command_schema_version',
      'public_revision',
      'canonical_revision',
      'state',
    ])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .forUpdate()
    .executeTakeFirst();
  if (!row) return undefined;
  const state = readCompanyCombatAggregateState(row.state);
  if (
    row.schema_version !== COMPANY_SCHEMA_VERSION ||
    row.ruleset_id !== COMPANY_RULESET_ID ||
    row.catalogue_version !== COMPANY_CATALOGUE_VERSION ||
    row.command_schema_version !== COMPANY_COMMAND_SCHEMA_VERSION ||
    state.economy.lifecycle.worldId !== row.world_id ||
    state.economy.lifecycle.companyId !== row.company_id ||
    state.economy.lifecycle.revision !== row.canonical_revision ||
    state.economy.lifecycle.knowledge.revision !== row.public_revision
  )
    throw new TypeError('Company snapshot scope does not match its root');
  return state;
}

export async function findOwnedCompanyId(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  accountId: string,
): Promise<string | undefined> {
  const row = await transaction
    .selectFrom('company_account_owners')
    .select('company_id')
    .where('world_id', '=', worldId)
    .where('account_id', '=', accountId)
    .executeTakeFirst();
  return row?.company_id;
}

/**
 * Persist one already-prepared root with its immutable receipt and ordered facts.
 * Call only inside the caller's transaction; command authorization and revision CAS
 * intentionally belong to the later executor.
 */
export async function saveCompanyAggregate(
  transaction: Transaction<DatabaseSchema>,
  stateValue: unknown,
  write: CompanyStorageWrite,
): Promise<CompanyCombatAggregateState> {
  const state = readCompanyCombatAggregateState(stateValue);
  const lifecycle = state.economy.lifecycle;
  const receipt = write.receipt;
  const parsedCommand = parseCompanyCommand(write.command);
  if (
    !isNonEmpty(receipt.receiptId) ||
    !isNonEmpty(receipt.commandId) ||
    !isNonEmpty(receipt.requestKey) ||
    !parsedCommand.ok ||
    !isRevision(receipt.resultingRevision) ||
    !isJsonObject(receipt.response)
  )
    throw new TypeError('Invalid company receipt');
  if (
    parsedCommand.command.worldId !== lifecycle.worldId ||
    parsedCommand.command.companyId !== lifecycle.companyId ||
    receipt.commandId !== parsedCommand.command.commandId ||
    receipt.requestKey !== canonicalJson(parsedCommand.command) ||
    receipt.sourceKey !== companySourceKey(parsedCommand.command)
  )
    throw new TypeError('Company receipt identity does not match command');
  if (receipt.resultingRevision !== lifecycle.revision)
    throw new TypeError('Company receipt revision does not match saved root');
  if (
    write.auditEvents.some(
      (entry) =>
        !isNonEmpty(entry.eventId) ||
        !isRevision(entry.revision) ||
        entry.revision !== lifecycle.revision ||
        !isJsonObject(entry.event),
    )
  )
    throw new TypeError('Invalid company audit event');
  if (new Set(write.auditEvents.map((entry) => entry.eventId)).size !== write.auditEvents.length)
    throw new TypeError('Duplicate company audit event');

  await transaction
    .insertInto('company_snapshots')
    .values({
      world_id: lifecycle.worldId,
      company_id: lifecycle.companyId,
      schema_version: COMPANY_SCHEMA_VERSION,
      ruleset_id: COMPANY_RULESET_ID,
      catalogue_version: COMPANY_CATALOGUE_VERSION,
      command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
      public_revision: lifecycle.knowledge.revision,
      canonical_revision: lifecycle.revision,
      state,
    })
    .onConflict((conflict) =>
      conflict.columns(['world_id', 'company_id']).doUpdateSet({
        schema_version: COMPANY_SCHEMA_VERSION,
        ruleset_id: COMPANY_RULESET_ID,
        catalogue_version: COMPANY_CATALOGUE_VERSION,
        command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
        public_revision: lifecycle.knowledge.revision,
        canonical_revision: lifecycle.revision,
        state,
        updated_at: sql<Date>`now()`,
      }),
    )
    .execute();

  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: lifecycle.worldId,
      company_id: lifecycle.companyId,
      receipt_id: receipt.receiptId,
      command_id: parsedCommand.command.commandId,
      source_key: companySourceKey(parsedCommand.command),
      request_key: receipt.requestKey,
      response: receipt.response,
      resulting_revision: receipt.resultingRevision,
    })
    .execute();

  if (write.auditEvents.length > 0) {
    await transaction
      .insertInto('company_audit_events')
      .values(
        write.auditEvents.map((entry) => ({
          world_id: lifecycle.worldId,
          company_id: lifecycle.companyId,
          revision: entry.revision,
          event_id: entry.eventId,
          event: entry.event,
        })),
      )
      .execute();
  }
  return state;
}

export async function listCompanyAuditEvents(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
): Promise<readonly CompanyStorageAuditEvent[]> {
  return transaction
    .selectFrom('company_audit_events')
    .select(['event_id', 'revision', 'event'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .orderBy('sequence', 'asc')
    .execute()
    .then((rows) =>
      rows.map((row) => ({
        eventId: row.event_id,
        revision: row.revision,
        event: row.event as Readonly<Record<string, unknown>>,
      })),
    );
}

export async function readCompanyReceipt(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  receiptId: string,
): Promise<CompanyStorageReceipt | undefined> {
  const row = await transaction
    .selectFrom('company_receipts')
    .select([
      'receipt_id',
      'command_id',
      'source_key',
      'request_key',
      'response',
      'resulting_revision',
    ])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('receipt_id', '=', receiptId)
    .executeTakeFirst();
  return (
    row && {
      receiptId: row.receipt_id,
      commandId: row.command_id,
      sourceKey: row.source_key,
      requestKey: row.request_key,
      response: row.response as Readonly<Record<string, unknown>>,
      resultingRevision: row.resulting_revision,
    }
  );
}

export async function readCompanyCommandReceipt(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  commandId: string,
): Promise<CompanyStorageReceipt | undefined> {
  const row = await transaction
    .selectFrom('company_receipts')
    .select([
      'receipt_id',
      'command_id',
      'source_key',
      'request_key',
      'response',
      'resulting_revision',
    ])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('command_id', '=', commandId)
    .executeTakeFirst();
  return row && storageReceipt(row);
}

export async function readCompanySourceReceipt(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  sourceKey: string,
): Promise<CompanyStorageReceipt | undefined> {
  const row = await transaction
    .selectFrom('company_receipts')
    .select([
      'receipt_id',
      'command_id',
      'source_key',
      'request_key',
      'response',
      'resulting_revision',
    ])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('source_key', '=', sourceKey)
    .executeTakeFirst();
  return row && storageReceipt(row);
}

/**
 * One compare-and-swap snapshot write plus its immutable company receipt/audit.
 * The caller owns the surrounding transaction and commits before returning success.
 */
export async function updateCompanyAggregateWithReceipt(
  transaction: Transaction<DatabaseSchema>,
  previousCanonicalRevision: string,
  expectedCanonicalRevision: string,
  stateValue: unknown,
  write: CompanyStorageWrite,
): Promise<CompanyCombatAggregateState> {
  const state = readCompanyCombatAggregateState(stateValue);
  const lifecycle = state.economy.lifecycle;
  const receipt = write.receipt;
  const parsedCommand = parseCompanyCommand(write.command);
  if (
    !isNonEmpty(receipt.receiptId) ||
    !isNonEmpty(receipt.commandId) ||
    !isNonEmpty(receipt.requestKey) ||
    !isCanonicalJson(receipt.requestKey) ||
    !parsedCommand.ok ||
    !isRevision(previousCanonicalRevision) ||
    !isRevision(expectedCanonicalRevision) ||
    BigInt(lifecycle.revision) <= BigInt(previousCanonicalRevision) ||
    lifecycle.revision !== expectedCanonicalRevision ||
    !isRevision(receipt.resultingRevision) ||
    !isJsonObject(receipt.response)
  )
    throw new TypeError('Invalid company command write');
  if (
    parsedCommand.command.worldId !== lifecycle.worldId ||
    parsedCommand.command.companyId !== lifecycle.companyId ||
    receipt.commandId !== parsedCommand.command.commandId ||
    receipt.sourceKey !== companySourceKey(parsedCommand.command) ||
    receipt.resultingRevision !== lifecycle.revision
  )
    throw new TypeError('Company command receipt identity does not match saved root');
  if (
    write.auditEvents.some(
      (entry) =>
        !isNonEmpty(entry.eventId) ||
        !isRevision(entry.revision) ||
        entry.revision !== lifecycle.revision ||
        !isJsonObject(entry.event),
    )
  )
    throw new TypeError('Invalid company audit event');
  if (new Set(write.auditEvents.map((entry) => entry.eventId)).size !== write.auditEvents.length)
    throw new TypeError('Duplicate company audit event');

  const updated = await transaction
    .updateTable('company_snapshots')
    .set({
      schema_version: COMPANY_SCHEMA_VERSION,
      ruleset_id: COMPANY_RULESET_ID,
      catalogue_version: COMPANY_CATALOGUE_VERSION,
      command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
      public_revision: lifecycle.knowledge.revision,
      canonical_revision: lifecycle.revision,
      state,
      updated_at: sql<Date>`now()`,
    })
    .where('world_id', '=', lifecycle.worldId)
    .where('company_id', '=', lifecycle.companyId)
    .where('canonical_revision', '=', previousCanonicalRevision)
    .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1) throw new Error('Company root CAS failed');

  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: lifecycle.worldId,
      company_id: lifecycle.companyId,
      receipt_id: receipt.receiptId,
      command_id: parsedCommand.command.commandId,
      source_key: receipt.sourceKey,
      request_key: receipt.requestKey,
      response: receipt.response,
      resulting_revision: receipt.resultingRevision,
    })
    .execute();

  if (write.auditEvents.length > 0) {
    await transaction
      .insertInto('company_audit_events')
      .values(
        write.auditEvents.map((entry) => ({
          world_id: lifecycle.worldId,
          company_id: lifecycle.companyId,
          revision: entry.revision,
          event_id: entry.eventId,
          event: entry.event,
        })),
      )
      .execute();
  }
  return state;
}

/** Persist one server-authorized external effect through the existing company receipt namespace. */
export async function updateCompanyAggregateWithExternalReceipt(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly previous: unknown;
    readonly next: unknown;
    readonly transition: FirstHuntExternalCompanyTransition;
    readonly commandId: string;
    readonly receiptId: string;
    readonly requestKey: string;
    readonly response: Readonly<Record<string, unknown>>;
    readonly eventId: string;
    readonly event: Readonly<Record<string, unknown>>;
  },
): Promise<CompanyCombatAggregateState> {
  const previous = readCompanyCombatAggregateState(input.previous);
  const next = readCompanyCombatAggregateState(input.next);
  const priorLife = previous.economy.lifecycle;
  const nextLife = next.economy.lifecycle;
  validateFirstHuntExternalTransition(previous, next, input);
  await validateFirstHuntProofClaimInTransaction(
    transaction,
    priorLife.worldId,
    priorLife.companyId,
    input,
  );
  if (
    priorLife.worldId !== nextLife.worldId ||
    priorLife.companyId !== nextLife.companyId ||
    BigInt(nextLife.revision) !== BigInt(priorLife.revision) + 1n ||
    BigInt(nextLife.knowledge.revision) !== BigInt(priorLife.knowledge.revision) + 1n ||
    nextLife.campaignTick !== priorLife.campaignTick ||
    !isNonEmpty(input.commandId) ||
    !isNonEmpty(input.receiptId) ||
    !isNonEmpty(input.eventId) ||
    !isCanonicalJson(input.requestKey) ||
    !isJsonObject(input.response) ||
    !isJsonObject(input.event)
  )
    throw new TypeError('Invalid FIRST HUNT external company transition');

  const locked = await transaction
    .selectFrom('company_snapshots')
    .select(['canonical_revision', 'public_revision', 'state'])
    .where('world_id', '=', priorLife.worldId)
    .where('company_id', '=', priorLife.companyId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !locked ||
    locked.canonical_revision !== priorLife.revision ||
    locked.public_revision !== priorLife.knowledge.revision ||
    canonicalStateJson(readCompanyCombatAggregateState(locked.state)) !==
      canonicalStateJson(previous)
  )
    throw new Error('Company root changed before FIRST HUNT external transition persistence');

  const updated = await transaction
    .updateTable('company_snapshots')
    .set({
      canonical_revision: nextLife.revision,
      public_revision: nextLife.knowledge.revision,
      state: next,
      updated_at: sql<Date>`now()`,
    })
    .where('world_id', '=', priorLife.worldId)
    .where('company_id', '=', priorLife.companyId)
    .where('canonical_revision', '=', priorLife.revision)
    .where('public_revision', '=', priorLife.knowledge.revision)
    .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1) throw new Error('Company root CAS failed');

  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: priorLife.worldId,
      company_id: priorLife.companyId,
      receipt_id: input.receiptId,
      command_id: input.commandId,
      source_key: null,
      request_key: input.requestKey,
      response: input.response,
      resulting_revision: nextLife.revision,
    })
    .execute();
  await applyFirstHuntProofClaimInTransaction(
    transaction,
    priorLife.worldId,
    priorLife.companyId,
    input,
  );
  await transaction
    .insertInto('company_audit_events')
    .values({
      world_id: priorLife.worldId,
      company_id: priorLife.companyId,
      revision: nextLife.revision,
      event_id: input.eventId,
      event: input.event,
    })
    .execute();
  return next;
}

/** Persist one reducer-verified FIRST HUNT terminal release and its durable evidence. */
export async function persistFirstHuntTerminalCompanyTransition(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly previous: CompanyCombatAggregateState;
    readonly next: CompanyCombatAggregateState;
    readonly encounterId: string;
    readonly terminalRevision: number;
    readonly bindingId: string;
    readonly finalStateDigest: string;
    readonly outcomeDigest: string;
    readonly practiceProfile: {
      readonly version: string;
      readonly profileId: string;
      readonly challengeLevel: number;
      readonly digest: string;
    };
    readonly contractProfileId: string;
    readonly contractTermsDigest: string;
  },
): Promise<void> {
  const previous = readCompanyCombatAggregateState(input.previous);
  const next = readCompanyCombatAggregateState(input.next);
  const before = previous.economy.lifecycle;
  const after = next.economy.lifecycle;
  const completed = next.encounter.completed.find(
    (entry) =>
      entry.bindingId === input.bindingId && entry.terminalRevision === input.terminalRevision,
  );
  if (
    before.worldId !== after.worldId ||
    before.companyId !== after.companyId ||
    BigInt(after.revision) <= BigInt(before.revision) ||
    // A terminal outcome need not change what the company publicly knows.
    BigInt(after.knowledge.revision) < BigInt(before.knowledge.revision) ||
    !Number.isSafeInteger(input.terminalRevision) ||
    input.terminalRevision < 0 ||
    previous.encounter.active?.binding.bindingId !== input.bindingId ||
    previous.encounter.active.binding.setup.battleId !== input.encounterId ||
    next.encounter.active !== null ||
    completed?.terminalSourceEventId !== `encounter:${input.encounterId}:terminal` ||
    completed.finalStateDigest !== input.finalStateDigest ||
    completed.outcomeDigest !== input.outcomeDigest ||
    !isNonEmpty(input.encounterId) ||
    !isNonEmpty(input.bindingId) ||
    !isDigest(input.finalStateDigest) ||
    !isDigest(input.outcomeDigest) ||
    !isNonEmpty(input.practiceProfile.version) ||
    !isNonEmpty(input.practiceProfile.profileId) ||
    !Number.isSafeInteger(input.practiceProfile.challengeLevel) ||
    !isNonEmpty(input.practiceProfile.digest) ||
    !isNonEmpty(input.contractProfileId) ||
    !isDigest(input.contractTermsDigest)
  )
    throw new TypeError('Invalid FIRST HUNT terminal company transition');

  const identity = {
    worldId: before.worldId,
    companyId: before.companyId,
    encounterId: input.encounterId,
    terminalRevision: input.terminalRevision,
  };
  const receiptIdentity = firstHuntTerminalReceiptIdentity(identity);
  const { commandId, receiptId, eventId } = receiptIdentity;
  const requestKey = canonicalJson({
    schemaVersion: 1,
    type: 'FIRST_HUNT_TERMINAL',
    ...identity,
    bindingId: input.bindingId,
    finalStateDigest: input.finalStateDigest,
    outcomeDigest: input.outcomeDigest,
    practiceProfile: input.practiceProfile,
    contractProfileId: input.contractProfileId,
    contractTermsDigest: input.contractTermsDigest,
  });
  const response = {
    schemaVersion: 1,
    type: 'FIRST_HUNT_TERMINAL',
    commandId,
    receiptId,
    resultingRevision: after.revision,
    publicRevision: after.knowledge.revision,
  };
  const event = {
    schemaVersion: 1,
    type: 'FirstHuntEncounterTerminalized',
    ...identity,
    bindingId: input.bindingId,
    finalStateDigest: input.finalStateDigest,
    outcomeDigest: input.outcomeDigest,
    practiceProfile: input.practiceProfile,
    contractProfileId: input.contractProfileId,
    contractTermsDigest: input.contractTermsDigest,
  };

  const locked = await lockCompanyAggregate(transaction, before.worldId, before.companyId);
  if (!locked || canonicalStateJson(locked) !== canonicalStateJson(previous))
    throw new Error('Company root changed before FIRST HUNT terminal persistence');
  const updated = await transaction
    .updateTable('company_snapshots')
    .set({
      canonical_revision: after.revision,
      public_revision: after.knowledge.revision,
      state: next,
      updated_at: sql<Date>`now()`,
    })
    .where('world_id', '=', before.worldId)
    .where('company_id', '=', before.companyId)
    .where('canonical_revision', '=', before.revision)
    .where('public_revision', '=', before.knowledge.revision)
    .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1)
    throw new Error('FIRST HUNT terminal company root CAS failed');
  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: before.worldId,
      company_id: before.companyId,
      receipt_id: receiptId,
      command_id: commandId,
      source_key: null,
      request_key: requestKey,
      response,
      resulting_revision: after.revision,
    })
    .execute();
  await transaction
    .insertInto('company_audit_events')
    .values({
      world_id: before.worldId,
      company_id: before.companyId,
      revision: after.revision,
      event_id: eventId,
      event,
    })
    .execute();
}

export function firstHuntTerminalReceiptIdentity(input: {
  readonly worldId: string;
  readonly companyId: string;
  readonly encounterId: string;
  readonly terminalRevision: number;
}): { readonly commandId: string; readonly receiptId: string; readonly eventId: string } {
  const digest = createHash('sha256').update(canonicalJson(input), 'utf8').digest('hex');
  const commandId = `first-hunt-terminal-${digest}`;
  return {
    commandId,
    receiptId: `first-hunt-terminal-receipt-${digest}`,
    eventId: `${commandId}:released`,
  };
}

function transitionHunt(transition: FirstHuntExternalCompanyTransition): HuntProfile {
  const hunt = huntProfile(transition.instanceId);
  if (!hunt) throw new TypeError('Hunt proof transition names no known hunt');
  return hunt;
}

/** The issuer wallet row of a hunt: FIRST HUNT keeps its original table. */
async function lockHuntIssuer(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  hunt: HuntProfile,
) {
  return hunt.instanceId === FIRST_HUNT_INSTANCE_ID
    ? transaction
        .selectFrom('world_first_hunt_state')
        .select(['wallet_id', 'wallet_q', 'revision'])
        .where('world_id', '=', worldId)
        .forUpdate()
        .executeTakeFirst()
    : transaction
        .selectFrom('world_hunt_states')
        .select(['wallet_id', 'wallet_q', 'revision'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', hunt.instanceId)
        .forUpdate()
        .executeTakeFirst();
}

async function validateFirstHuntProofClaimInTransaction(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  input: {
    readonly transition: FirstHuntExternalCompanyTransition;
    readonly receiptId: string;
  },
): Promise<void> {
  const hunt = transitionHunt(input.transition);
  const claim = await transaction
    .selectFrom('world_proof_claims')
    .select([
      'source_id',
      'ground_item',
      'custodian_company_id',
      'redeemed_company_id',
      'redemption_receipt_id',
    ])
    .where('world_id', '=', worldId)
    .where('item_id', '=', hunt.proofId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !claim ||
    claim.source_id !== input.transition.sourceId ||
    (input.transition.operation === 'PICKUP'
      ? claim.ground_item === null ||
        claim.custodian_company_id !== null ||
        claim.redeemed_company_id !== null ||
        claim.redemption_receipt_id !== null
      : claim.ground_item !== null ||
        claim.custodian_company_id !== companyId ||
        claim.redeemed_company_id !== null ||
        claim.redemption_receipt_id !== null)
  )
    throw new TypeError('FIRST HUNT proof claim does not match its company transition');

  if (input.transition.operation === 'PRESENT') {
    const issuer = await lockHuntIssuer(transaction, worldId, hunt);
    if (
      !issuer ||
      issuer.wallet_id !== input.transition.issuerWalletId ||
      issuer.wallet_q !== input.transition.worldWalletBeforeQ ||
      issuer.revision !== input.transition.worldRevisionBefore ||
      BigInt(issuer.wallet_q) < BigInt(input.transition.rewardQ)
    )
      throw new TypeError('FIRST HUNT issuer wallet is not ready for settlement');
  }
}

async function applyFirstHuntProofClaimInTransaction(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  input: {
    readonly transition: FirstHuntExternalCompanyTransition;
    readonly receiptId: string;
  },
): Promise<void> {
  const hunt = transitionHunt(input.transition);
  if (input.transition.operation === 'PICKUP') {
    const claimed = await transaction
      .updateTable('world_proof_claims')
      .set({ ground_item: null, custodian_company_id: companyId })
      .where('world_id', '=', worldId)
      .where('item_id', '=', hunt.proofId)
      .where('source_id', '=', input.transition.sourceId)
      .where('ground_item', 'is not', null)
      .where('custodian_company_id', 'is', null)
      .executeTakeFirst();
    if (Number(claimed.numUpdatedRows) !== 1)
      throw new Error('FIRST HUNT proof pickup claim CAS failed');
    return;
  }

  const rewardQ = BigInt(input.transition.rewardQ);
  const debit = {
    wallet_q: (BigInt(input.transition.worldWalletBeforeQ) - rewardQ).toString(),
    revision: (BigInt(input.transition.worldRevisionBefore) + 1n).toString(),
  };
  const issuer =
    hunt.instanceId === FIRST_HUNT_INSTANCE_ID
      ? await transaction
          .updateTable('world_first_hunt_state')
          .set(debit)
          .where('world_id', '=', worldId)
          .where('wallet_id', '=', input.transition.issuerWalletId)
          .where('wallet_q', '=', input.transition.worldWalletBeforeQ)
          .where('revision', '=', input.transition.worldRevisionBefore)
          .executeTakeFirst()
      : await transaction
          .updateTable('world_hunt_states')
          .set(debit)
          .where('world_id', '=', worldId)
          .where('instance_id', '=', hunt.instanceId)
          .where('wallet_id', '=', input.transition.issuerWalletId)
          .where('wallet_q', '=', input.transition.worldWalletBeforeQ)
          .where('revision', '=', input.transition.worldRevisionBefore)
          .executeTakeFirst();
  if (Number(issuer.numUpdatedRows) !== 1)
    throw new Error('FIRST HUNT issuer wallet debit CAS failed');
  const redeemed = await transaction
    .updateTable('world_proof_claims')
    .set({ redeemed_company_id: companyId, redemption_receipt_id: input.receiptId })
    .where('world_id', '=', worldId)
    .where('item_id', '=', hunt.proofId)
    .where('source_id', '=', input.transition.sourceId)
    .where('ground_item', 'is', null)
    .where('custodian_company_id', '=', companyId)
    .where('redeemed_company_id', 'is', null)
    .where('redemption_receipt_id', 'is', null)
    .executeTakeFirst();
  if (Number(redeemed.numUpdatedRows) !== 1)
    throw new Error('FIRST HUNT proof redemption CAS failed');
}

function validateFirstHuntExternalTransition(
  previous: CompanyCombatAggregateState,
  next: CompanyCombatAggregateState,
  input: {
    readonly transition: FirstHuntExternalCompanyTransition;
    readonly commandId: string;
    readonly receiptId: string;
    readonly requestKey: string;
    readonly response: Readonly<Record<string, unknown>>;
    readonly eventId: string;
    readonly event: Readonly<Record<string, unknown>>;
  },
): void {
  let request: Record<string, unknown>;
  try {
    request = JSON.parse(input.requestKey) as Record<string, unknown>;
  } catch {
    throw new TypeError('Invalid FIRST HUNT external company command');
  }
  const expectedType = input.transition.operation;
  const hunt = transitionHunt(input.transition);
  const expectedEventType =
    expectedType === 'PICKUP' ? 'FirstHuntProofPickedUp' : 'FirstHuntProofPresented';
  if (
    canonicalJson(request) !== input.requestKey ||
    request['schemaVersion'] !== 1 ||
    request['commandId'] !== input.commandId ||
    request['type'] !== expectedType ||
    !isJsonObject(request['payload']) ||
    request['payload']['instanceId'] !== hunt.instanceId ||
    (input.transition.operation === 'PICKUP' &&
      request['payload']['toContainerId'] !== input.transition.targetContainerId) ||
    !isNonEmpty(input.transition.sourceId) ||
    input.response['schemaVersion'] !== 1 ||
    input.response['ok'] !== true ||
    input.response['commandId'] !== input.commandId ||
    input.response['receiptId'] !== input.receiptId ||
    input.event['schemaVersion'] !== 1 ||
    input.event['type'] !== expectedEventType ||
    input.event['itemId'] !== hunt.proofId ||
    input.eventId !== `${input.commandId}:first-hunt-${expectedType.toLowerCase()}`
  )
    throw new TypeError('Invalid FIRST HUNT external company command');

  const { economy: beforeEconomy, ...beforeOther } = previous;
  const { economy: afterEconomy, ...afterOther } = next;
  const normalized = (economy: typeof beforeEconomy) => ({
    ...economy,
    lifecycle: {
      ...economy.lifecycle,
      revision: '0',
      knowledge: { ...economy.lifecycle.knowledge, revision: '0' },
    },
    finance: null,
    physical: null,
  });
  if (canonicalStateJson(beforeOther) !== canonicalStateJson(afterOther))
    throw new TypeError('FIRST HUNT external transition changed unrelated company state');
  if (
    canonicalStateJson(normalized(beforeEconomy)) !== canonicalStateJson(normalized(afterEconomy))
  )
    throw new TypeError('FIRST HUNT external transition changed unrelated company economy');

  if (expectedType === 'PICKUP') {
    // ClaimLoot appends exactly its own economy receipt; nothing else in finance moves.
    const { applied: beforeApplied, ...beforeFinance } = beforeEconomy.finance;
    const { applied: afterApplied, ...afterFinance } = afterEconomy.finance;
    if (
      canonicalStateJson(beforeFinance) !== canonicalStateJson(afterFinance) ||
      afterApplied.length !== beforeApplied.length + 1 ||
      canonicalStateJson(afterApplied.slice(0, beforeApplied.length)) !==
        canonicalStateJson(beforeApplied) ||
      afterApplied.at(-1)?.commandId !== input.commandId ||
      !validProofPickupDelta(previous, next, input.transition, hunt)
    )
      throw new TypeError('FIRST HUNT pickup is not an exact proof ClaimLoot transition');
    return;
  }

  if (
    canonicalStateJson(beforeEconomy.physical) !== canonicalStateJson(afterEconomy.physical) ||
    input.event['rewardQ'] !== input.transition.rewardQ ||
    request['payload'] === null ||
    !validProofPresentationDelta(previous, next, input.transition, input.receiptId, hunt)
  )
    throw new TypeError('FIRST HUNT presentation is not an exact proof settlement transition');
}

function byContainerId<T extends { readonly containerId: string }>(entries: readonly T[]): T[] {
  return entries.toSorted((left, right) =>
    left.containerId < right.containerId ? -1 : left.containerId > right.containerId ? 1 : 0,
  );
}

function validProofPickupDelta(
  previous: CompanyCombatAggregateState,
  next: CompanyCombatAggregateState,
  transition: Extract<FirstHuntExternalCompanyTransition, { operation: 'PICKUP' }>,
  hunt: HuntProfile,
): boolean {
  const before = previous.economy.physical;
  const after = next.economy.physical;
  if (!before || !after) return false;
  const proof = after.items.find((item) => item.itemId === hunt.proofId);
  const target = before.containers.find(
    (container) => container.containerId === transition.targetContainerId,
  );
  const definition = COMPANY_CATALOGUE.items.find((item) => item.id === proof?.definitionId);
  const previousSourceEffects = before.sourceEffects;
  const addedEffects = after.sourceEffects.filter(
    (effect) =>
      !previousSourceEffects.some(
        (prior) => canonicalStateJson(prior) === canonicalStateJson(effect),
      ),
  );
  const expectedEffectKey = canonicalStateJson([
    'LOOT_AUTHORIZATION',
    transition.sourceId,
    ['outcome', transition.sourceId],
  ]);
  let authorization: Record<string, unknown> | undefined;
  try {
    const requestKey = addedEffects[0]?.requestKey;
    if (requestKey !== undefined) {
      authorization = JSON.parse(requestKey) as Record<string, unknown>;
      if (canonicalStateJson(authorization) !== requestKey) authorization = undefined;
    }
  } catch {
    authorization = undefined;
  }
  const activeMembers = new Set(
    previous.economy.lifecycle.memberships
      .filter((membership) => membership.endedAt === null)
      .map((membership) => String(membership.characterId)),
  );
  return (
    !before.items.some((item) => item.itemId === hunt.proofId) &&
    proof !== undefined &&
    proof.owner.kind === 'COMPANY' &&
    proof.owner.id === previous.economy.lifecycle.companyId &&
    proof.containerId === transition.targetContainerId &&
    proof.quantity === 1 &&
    proof.provenance.sourceId === transition.sourceId &&
    proof.tombstone === null &&
    target !== undefined &&
    (target.custodian.kind === 'COMPANY'
      ? target.custodian.id === previous.economy.lifecycle.companyId
      : target.custodian.kind === 'CHARACTER' && activeMembers.has(target.custodian.id)) &&
    target.access === 'COMPANY' &&
    target.closed === null &&
    target.location.kind === 'AT' &&
    target.location.siteId === hunt.objectiveLocation.siteId &&
    target.location.areaId === hunt.objectiveLocation.areaId &&
    (target.kind === 'CARRIED' || target.kind === 'PARTY_SUPPLY' || target.kind === 'STATIC') &&
    availableContainerG(before, target.containerId) >= (definition?.weightG ?? Infinity) &&
    canonicalStateJson(before.items) ===
      canonicalStateJson(after.items.filter((item) => item.itemId !== hunt.proofId)) &&
    canonicalStateJson(before.containers) === canonicalStateJson(after.containers) &&
    canonicalStateJson(before.conditions) === canonicalStateJson(after.conditions) &&
    canonicalStateJson(before.vitals) === canonicalStateJson(after.vitals) &&
    canonicalStateJson(before.custody) === canonicalStateJson(after.custody) &&
    canonicalStateJson(before.food) === canonicalStateJson(after.food) &&
    canonicalStateJson(before.foodCarry) === canonicalStateJson(after.foodCarry) &&
    canonicalStateJson(before.careHandovers) === canonicalStateJson(after.careHandovers) &&
    before.processedTick === after.processedTick &&
    addedEffects.length === 1 &&
    addedEffects[0]?.key === expectedEffectKey &&
    authorization?.['kind'] === 'LOOT_AUTHORIZATION' &&
    authorization?.['sourceEventId'] === transition.sourceId &&
    authorization?.['outcomeId'] === transition.sourceId &&
    canonicalStateJson(authorization?.['itemIds']) === canonicalStateJson([hunt.proofId]) &&
    canonicalStateJson(authorization?.['fromContainerIds']) ===
      canonicalStateJson(['first-hunt-ground-proof']) &&
    canonicalStateJson(authorization?.['ownerAfter']) ===
      canonicalStateJson({ kind: 'COMPANY', id: previous.economy.lifecycle.companyId }) &&
    after.sourceEffects.length === before.sourceEffects.length + 1 &&
    canonicalStateJson(before.knowledge.itemSnapshots) ===
      canonicalStateJson(
        after.knowledge.itemSnapshots.filter((item) => item.itemId !== hunt.proofId),
      ) &&
    canonicalStateJson(before.knowledge.conditionSnapshots) ===
      canonicalStateJson(after.knowledge.conditionSnapshots) &&
    canonicalStateJson(before.knowledge.vitalSnapshots) ===
      canonicalStateJson(after.knowledge.vitalSnapshots) &&
    // ClaimLoot re-records what the company knows about the target container; that
    // snapshot becomes the actual container (it may have been stale after travel).
    canonicalStateJson(
      byContainerId(
        before.knowledge.containerSnapshots.filter(
          (entry) => entry.containerId !== transition.targetContainerId,
        ),
      ),
    ) ===
      canonicalStateJson(
        byContainerId(
          after.knowledge.containerSnapshots.filter(
            (entry) => entry.containerId !== transition.targetContainerId,
          ),
        ),
      ) &&
    canonicalStateJson(
      after.knowledge.containerSnapshots.find(
        (entry) => entry.containerId === transition.targetContainerId,
      ),
    ) === canonicalStateJson(target) &&
    canonicalStateJson(
      after.knowledge.itemSnapshots.find((item) => item.itemId === hunt.proofId),
    ) === canonicalStateJson(proof)
  );
}

function validProofPresentationDelta(
  previous: CompanyCombatAggregateState,
  next: CompanyCombatAggregateState,
  transition: Extract<FirstHuntExternalCompanyTransition, { operation: 'PRESENT' }>,
  receiptId: string,
  hunt: HuntProfile,
): boolean {
  const companyId = previous.economy.lifecycle.companyId;
  const sourceItem = previous.economy.physical?.items.find(
    (item) => item.itemId === hunt.proofId && item.tombstone === null,
  );
  const pool = previous.economy.finance.pools.find((entry) => entry.poolId === 'local');
  const recipient = previous.economy.finance.wallets.find(
    (wallet) => wallet.walletId === transition.recipientWalletId,
  );
  if (
    !sourceItem ||
    sourceItem.quantity !== 1 ||
    sourceItem.owner.kind !== 'COMPANY' ||
    sourceItem.owner.id !== companyId ||
    sourceItem.provenance.sourceId !== transition.sourceId ||
    pool?.walletId !== transition.recipientWalletId ||
    recipient?.owner.kind !== 'COMPANY' ||
    recipient.owner.id !== companyId ||
    transition.issuerWalletId !== hunt.walletId ||
    transition.rewardQ !== hunt.rewardQ ||
    !isRevision(transition.atTick) ||
    !isRevision(transition.worldWalletBeforeQ) ||
    !isRevision(transition.worldRevisionBefore) ||
    BigInt(transition.worldWalletBeforeQ) < BigInt(transition.rewardQ)
  )
    return false;
  let expectedFinance;
  try {
    expectedFinance = receiveExternalPayment(previous.economy.finance, {
      fromWalletId: transition.issuerWalletId,
      toWalletId: transition.recipientWalletId,
      recipient: { kind: 'COMPANY', id: companyId },
      amountQ: BigInt(transition.rewardQ),
      atTick: campaignTick(transition.atTick),
      movementId: `first-hunt-presentation:${receiptId}`,
    });
  } catch {
    return false;
  }
  return canonicalStateJson(next.economy.finance) === canonicalStateJson(expectedFinance);
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
}

function isJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    canonicalStateJson(value);
    return true;
  } catch {
    return false;
  }
}

function storageReceipt(row: {
  readonly receipt_id: string;
  readonly command_id: string;
  readonly source_key: string | null;
  readonly request_key: string;
  readonly response: unknown;
  readonly resulting_revision: string;
}): CompanyStorageReceipt {
  if (!isJsonObject(row.response)) throw new TypeError('Invalid stored company receipt');
  return {
    receiptId: row.receipt_id,
    commandId: row.command_id,
    sourceKey: row.source_key,
    requestKey: row.request_key,
    response: row.response,
    resultingRevision: row.resulting_revision,
  };
}

function isCanonicalJson(value: string): boolean {
  try {
    return canonicalStateJson(JSON.parse(value)) === value;
  } catch {
    return false;
  }
}
