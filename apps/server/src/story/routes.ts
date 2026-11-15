import { randomUUID } from 'node:crypto';

import {
  CACHE_DISCLOSURE_STORY,
  canonicalJson,
  ordinaryContractProfile,
  prepareStoryCommand,
  projectStory,
  readOrdinaryContractState,
  readStoryCompanyState,
  readStoryWorldState,
  STORY_MISSION_ID,
  type StoryCommand,
  type StoryCompanyState,
  type StoryPreparation,
  type StoryWorldState,
} from '@warwrit/game-core';
import type {
  StoryCommandRequestDto,
  StoryCommandResponseDto,
  StoryReadResponseDto,
} from '@warwrit/protocol';
import { isStoryCommandRequest } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import { type Kysely, type Transaction } from 'kysely';

import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import { catchUpStationaryCompany } from '../company/executor.js';
import { persistContractRewardPayment } from '../company/contract-payout.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  loadCompanyAggregate,
} from '../company/repository.js';
import { executeCommandTransaction } from '../db/command-transaction.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import { settleDueContinuousMovementInTransaction } from '../world/continuous-movement.js';
import {
  lockStoryCompany,
  lockStoryWorld,
  readStoryWorldIfPresent,
  readStoryDeliveryEvidence,
  saveStoryStates,
} from './repository.js';

const millWorkerProfile = ordinaryContractProfile('ci.m1.mill-worker.01')!;
const storyWalletId = 'wallet.steward.severny-dvor.01';
const storyRewardQ = 40_000_000n;

function responseFor(
  world: StoryWorldState,
  company: StoryCompanyState,
  atTick: string,
): StoryReadResponseDto {
  return {
    schemaVersion: 1,
    worldRevision: world.revision,
    companyRevision: company.revision,
    ...projectStory(CACHE_DISCLOSURE_STORY, world, company, atTick),
    missionId: STORY_MISSION_ID,
  } as StoryReadResponseDto;
}

function coreCommand(request: StoryCommandRequestDto): StoryCommand {
  return request.command.type === 'CHOOSE'
    ? { type: 'CHOOSE', choiceId: request.command.choiceId }
    : { type: request.command.type };
}

type StoryRejectionCode = Exclude<
  Extract<StoryCommandResponseDto, { ok: false }>['code'],
  | 'INVALID_COMMAND'
  | 'NOT_AUTHORIZED'
  | 'NOT_AT_LOCATION'
  | 'INSUFFICIENT_FUNDS'
  | 'CONFLICTING_REPLAY'
>;

function rejectionCode(
  prepared: Extract<StoryPreparation, { kind: 'REJECTED' }>,
): StoryRejectionCode {
  return prepared.code;
}

function rejection(
  commandId: string,
  code: Extract<StoryCommandResponseDto, { ok: false }>['code'],
  story: StoryReadResponseDto | null,
): StoryCommandResponseDto {
  return { schemaVersion: 1, commandId, ok: false, code, story };
}

function standingAtStoryYard(state: Awaited<ReturnType<typeof loadCompanyAggregate>>): boolean {
  if (!state) return false;
  return state.economy.lifecycle.parties.some((party) => {
    if (party.location.kind !== 'AT' || party.location.siteId !== 'severny-dvor') return false;
    const members = state.economy.lifecycle.characters.filter(
      (character) => character.presence.fieldPartyId === party.partyId,
    );
    return (
      members.length > 0 &&
      members.every(
        (character) =>
          character.presence.location.kind === 'AT' &&
          character.presence.location.siteId === 'severny-dvor' &&
          character.presence.location.areaId === 'severny-dvor-yard' &&
          character.presence.encounterBindingId === null &&
          character.presence.availability === 'AVAILABLE',
      )
    );
  });
}

async function lockMillWorkerRow(transaction: Transaction<DatabaseSchema>, worldId: string) {
  return transaction
    .selectFrom('ordinary_contracts')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('instance_id', '=', millWorkerProfile.instanceId)
    .forUpdate()
    .executeTakeFirst();
}

async function readQaOffset(transaction: Transaction<DatabaseSchema>, worldId: string) {
  const row = await transaction
    .selectFrom('world_campaign_clocks')
    .select('qa_offset_ms')
    .where('world_id', '=', worldId)
    .executeTakeFirst();
  if (!row) throw new Error('World campaign clock is unavailable');
  return row.qa_offset_ms;
}

async function resolveStoryWorld(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  accountId: string,
  companyId: string,
  storyUnavailable: () => StoryCommandResponseDto,
): Promise<{
  readonly world: StoryWorldState;
  readonly company: StoryCompanyState;
  readonly companyRoot: NonNullable<Awaited<ReturnType<typeof loadCompanyAggregate>>>;
  readonly atTick: string;
  readonly issuerRow: NonNullable<Awaited<ReturnType<typeof lockMillWorkerRow>>>;
}> {
  const initialClock = await readWorldClock(transaction, worldId);
  const evidence = await readStoryDeliveryEvidence(
    transaction,
    worldId,
    initialClock,
    await readQaOffset(transaction, worldId),
  );
  if (!evidence) throw new StoryUnavailableError(storyUnavailable());
  const existingWorld = await readStoryWorldIfPresent(
    transaction,
    worldId,
    evidence.identity,
    evidence.source,
  );
  const eligibilitySource = existingWorld?.eligibilitySource ?? evidence.source;
  if (!eligibilitySource) throw new StoryUnavailableError(storyUnavailable());
  if (BigInt(initialClock.tick) < BigInt(eligibilitySource.availableAtTick))
    throw new StoryUnavailableError(storyUnavailable());

  const { state: world } = await lockStoryWorld(transaction, worldId, eligibilitySource);
  const issuerRow = await lockMillWorkerRow(transaction, worldId);
  if (!issuerRow) throw new TypeError('Mill-worker issuer row disappeared');
  const lockedOrdinary = readOrdinaryContractState(millWorkerProfile, issuerRow.state);
  if (
    !lockedOrdinary.outcome ||
    lockedOrdinary.outcome.companyId !== evidence.identity.companyId ||
    lockedOrdinary.outcome.sourceEventId !== evidence.identity.sourceEventId ||
    lockedOrdinary.outcome.atTick !== evidence.identity.deliveredAtTick ||
    issuerRow.wallet_id !== storyWalletId ||
    issuerRow.profile_id !== millWorkerProfile.definitionId
  )
    throw new TypeError('Trusted story prerequisite changed while acquiring locks');

  if (!(await lockCompanyAggregate(transaction, worldId, companyId)))
    throw new StoryUnavailableError(storyUnavailable());
  await transaction
    .selectFrom('world_party_routes')
    .select('party_id')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .forUpdate()
    .execute();
  const companyRoot = await loadCompanyAggregate(transaction, worldId, companyId);
  if (!companyRoot) throw new StoryUnavailableError(storyUnavailable());
  const clock = await readWorldClock(transaction, worldId, new Date(), true);
  const companyAfterMovement = await settleDueContinuousMovementInTransaction(
    transaction,
    companyRoot,
    accountId,
    clock,
  );
  const currentEvidence = await readStoryDeliveryEvidence(
    transaction,
    worldId,
    clock,
    await readQaOffset(transaction, worldId),
  );
  if (
    !currentEvidence ||
    currentEvidence.identity.companyId !== evidence.identity.companyId ||
    currentEvidence.identity.sourceEventId !== evidence.identity.sourceEventId ||
    currentEvidence.identity.deliveredAtTick !== evidence.identity.deliveredAtTick
  )
    throw new TypeError('Story eligibility source changed while locking world state');
  const { state: company } = await lockStoryCompany(transaction, worldId, companyId, world);
  if (!standingAtStoryYard(companyAfterMovement))
    throw new StoryUnavailableError(rejection('pending', 'NOT_AT_LOCATION', null));
  return {
    world,
    company,
    companyRoot: companyAfterMovement,
    atTick: clock.tick,
    issuerRow,
  };
}

class StoryUnavailableError extends Error {
  constructor(readonly response: StoryCommandResponseDto) {
    super('Story is unavailable to this company now');
  }
}

async function executeStoryCommand(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly worldId: string;
    readonly accountId: string;
    readonly companyId: string;
    readonly request: StoryCommandRequestDto;
    readonly requestKey: string;
  },
): Promise<StoryCommandResponseDto> {
  const { worldId, accountId, companyId, request, requestKey } = input;
  const reject = (code: Extract<StoryCommandResponseDto, { ok: false }>['code']) =>
    rejection(request.commandId, code, null);
  const allowed = await transaction
    .selectFrom('company_account_owners')
    .select('company_id')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('account_id', '=', accountId)
    .forUpdate()
    .executeTakeFirst();
  if (!allowed) return reject('NOT_AUTHORIZED');

  const prior = await transaction
    .selectFrom('story_command_receipts')
    .select(['account_id', 'request_key', 'response'])
    .where('world_id', '=', worldId)
    .where('mission_id', '=', STORY_MISSION_ID)
    .where('company_id', '=', companyId)
    .where('command_id', '=', request.commandId)
    .executeTakeFirst();
  if (prior) {
    if (prior.account_id !== accountId || prior.request_key !== requestKey)
      return rejection(request.commandId, 'CONFLICTING_REPLAY', null);
    if (
      typeof prior.response !== 'object' ||
      prior.response === null ||
      Array.isArray(prior.response) ||
      (prior.response as Record<string, unknown>)['ok'] !== true ||
      (prior.response as Record<string, unknown>)['commandId'] !== request.commandId
    )
      throw new TypeError('Stored story receipt is invalid');
    return prior.response as StoryCommandResponseDto;
  }

  let current: Awaited<ReturnType<typeof resolveStoryWorld>> | undefined;
  try {
    current = await resolveStoryWorld(transaction, worldId, accountId, companyId, () =>
      reject('NOT_AVAILABLE'),
    );
  } catch (error) {
    if (error instanceof StoryUnavailableError) return error.response;
    throw error;
  }

  const { world, company, atTick, issuerRow } = current;
  const currentProjection = responseFor(world, company, atTick);
  if (!standingAtStoryYard(current.companyRoot))
    return rejection(request.commandId, 'NOT_AT_LOCATION', currentProjection);
  const prepared = prepareStoryCommand(
    CACHE_DISCLOSURE_STORY,
    world,
    company,
    coreCommand(request),
    {
      companyId,
      standingPlaceId: 'severny-dvor-yard',
      atTick,
      expectedWorldRevision: request.expectedWorldRevision,
      expectedCompanyRevision: request.expectedCompanyRevision,
      sourceEventId: `story:${STORY_MISSION_ID}:${request.commandId}`,
    },
  );
  if (prepared.kind === 'REJECTED')
    return rejection(request.commandId, rejectionCode(prepared), currentProjection);

  let rewardPaidQ: string | null = null;
  if (prepared.payoutEligibility) {
    if (!/^(0|[1-9][0-9]*)$/u.test(issuerRow.wallet_q))
      throw new TypeError('Story issuer wallet balance is invalid');
    const balance = BigInt(issuerRow.wallet_q);
    if (issuerRow.wallet_id !== storyWalletId || balance < storyRewardQ)
      return rejection(request.commandId, 'INSUFFICIENT_FUNDS', currentProjection);
    const caughtUp = await catchUpStationaryCompany({
      transaction,
      accountId,
      state: current.companyRoot,
      atTick,
      requestKind: 'STORY_E01_PAYOUT_CATCH_UP',
    });
    if (!caughtUp) return rejection(request.commandId, 'NOT_AVAILABLE', currentProjection);
    await persistContractRewardPayment(transaction, {
      previous: caughtUp,
      issuerWalletId: issuerRow.wallet_id,
      rewardQ: prepared.payoutEligibility.rewardQ,
      atTick,
      commandId: request.commandId,
      receiptId: randomUUID(),
      requestKey,
      response: {
        schemaVersion: 1,
        commandId: request.commandId,
        rewardQ: prepared.payoutEligibility.rewardQ,
      },
      event: {
        schemaVersion: 1,
        type: 'ContractRewardPaid',
        instanceId: millWorkerProfile.instanceId,
        rewardQ: prepared.payoutEligibility.rewardQ,
      },
    });
    const debited = await transaction
      .updateTable('ordinary_contracts')
      .set({ wallet_q: (balance - storyRewardQ).toString() })
      .where('world_id', '=', worldId)
      .where('instance_id', '=', millWorkerProfile.instanceId)
      .where('wallet_q', '=', issuerRow.wallet_q)
      .executeTakeFirst();
    if (Number(debited.numUpdatedRows) !== 1) throw new Error('Story issuer wallet debit failed');
    rewardPaidQ = prepared.payoutEligibility.rewardQ;
  }

  await saveStoryStates(transaction, {
    worldId,
    companyId,
    world: prepared.world,
    company: prepared.company,
    previousWorldRevision: world.revision,
    previousCompanyRevision: company.revision,
  });
  const story = responseFor(prepared.world, prepared.company, atTick);
  const response: StoryCommandResponseDto = {
    schemaVersion: 1,
    commandId: request.commandId,
    ok: true,
    story,
    rewardPaidQ,
  };
  await transaction
    .insertInto('story_command_receipts')
    .values({
      world_id: worldId,
      mission_id: STORY_MISSION_ID,
      company_id: companyId,
      command_id: request.commandId,
      account_id: accountId,
      request_key: requestKey,
      response,
    })
    .execute();
  return response;
}

export function registerStoryRoutes(
  app: FastifyInstance,
  options: { readonly database: Kysely<DatabaseSchema>; readonly worldId: string },
): void {
  const { database, worldId } = options;

  app.get('/story', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const result = await database.transaction().execute(async (transaction) => {
      if (!(await lockIdentityAccount(transaction, accountId))) return undefined;
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (!companyId) return undefined;
      const owner = await transaction
        .selectFrom('company_account_owners')
        .select('company_id')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .where('account_id', '=', accountId)
        .forUpdate()
        .executeTakeFirst();
      if (!owner) return undefined;
      const initialClock = await readWorldClock(transaction, worldId);
      const evidence = await readStoryDeliveryEvidence(
        transaction,
        worldId,
        initialClock,
        await readQaOffset(transaction, worldId),
      );
      if (!evidence) return null;
      const existingWorld = await readStoryWorldIfPresent(
        transaction,
        worldId,
        evidence.identity,
        evidence.source,
      );
      const eligibilitySource = existingWorld?.eligibilitySource ?? evidence.source;
      if (!eligibilitySource) return null;
      if (BigInt(initialClock.tick) < BigInt(eligibilitySource.availableAtTick)) {
        const world = {
          version: 1 as const,
          missionId: STORY_MISSION_ID,
          definitionVersion: 1 as const,
          revision: '0',
          eligibilitySource,
          outcome: null,
        };
        const company = {
          version: 1 as const,
          missionId: STORY_MISSION_ID,
          definitionVersion: 1 as const,
          companyId,
          revision: '0',
          status: 'OFFERED' as const,
          currentSceneId: 'S00' as const,
          pendingAccusation: null,
          receiptsInspected: false,
          cacheReasonAsked: false,
          metActors: [],
          facts: [],
        };
        const root = await lockCompanyAggregate(transaction, worldId, companyId);
        if (!root) return undefined;
        await transaction
          .selectFrom('world_party_routes')
          .select('party_id')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .forUpdate()
          .execute();
        const loaded = await loadCompanyAggregate(transaction, worldId, companyId);
        if (!standingAtStoryYard(loaded)) return 'NOT_AT_LOCATION' as const;
        return responseFor(world, company, initialClock.tick);
      }

      let current: Awaited<ReturnType<typeof resolveStoryWorld>> | undefined;
      try {
        current = await resolveStoryWorld(
          transaction,
          worldId,
          accountId,
          companyId,
          () => null as never,
        );
      } catch (error) {
        if (error instanceof StoryUnavailableError) return 'NOT_AT_LOCATION' as const;
        throw error;
      }
      return responseFor(current.world, current.company, current.atTick);
    });
    if (result === undefined) return reply.code(403).send({ error: 'company access required' });
    if (result === null) return reply.code(404).send({ error: 'story unavailable' });
    if (result === 'NOT_AT_LOCATION')
      return reply.code(409).send({ error: 'company must be at Severny Dvor' });
    reply.header('cache-control', 'no-store');
    return result;
  });

  app.post('/story/commands', { bodyLimit: 2048 }, async (request, reply) => {
    if (!isStoryCommandRequest(request.body))
      return reply.code(400).send({ error: 'invalid story command' });
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const body = request.body;
    const response = await executeCommandTransaction(
      database,
      async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId)))
          return rejection(body.commandId, 'NOT_AUTHORIZED', null);
        const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
        if (!companyId) return rejection(body.commandId, 'NOT_AUTHORIZED', null);
        return executeStoryCommand(transaction, {
          worldId,
          accountId,
          companyId,
          request: body,
          requestKey: canonicalJson(body),
        });
      },
      (result) => result.ok,
    );
    const status = response.ok
      ? 200
      : response.code === 'NOT_AUTHORIZED'
        ? 403
        : response.code === 'NOT_AVAILABLE' || response.code === 'NOT_ELIGIBLE'
          ? 404
          : 409;
    return reply.code(status).send(response);
  });
}
