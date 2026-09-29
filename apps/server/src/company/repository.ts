import { sql, type Transaction } from 'kysely';
import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  canonicalJson,
  companySourceKey,
  parseCompanyCommand,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import type { DatabaseSchema } from '../db/database.js';

export interface CompanyStorageReceipt {
  readonly receiptId: string;
  readonly commandId: string;
  readonly sourceKey: string | null;
  readonly requestKey: string;
  readonly response: Readonly<Record<string, unknown>>;
  readonly resultingRevision: string;
}

export interface CompanyStorageAuditEvent {
  readonly eventId: string;
  readonly revision: string;
  readonly event: Readonly<Record<string, unknown>>;
}

export interface CompanyStorageWrite {
  readonly receipt: CompanyStorageReceipt;
  readonly command: unknown;
  readonly auditEvents: readonly CompanyStorageAuditEvent[];
}

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

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
}

function isJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    canonicalJson(value);
    return true;
  } catch {
    return false;
  }
}
