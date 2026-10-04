import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Kysely } from 'kysely';
import {
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_RULES,
  bindOpeningContactReaction,
  canonicalJson,
  canonicalRevision,
  campaignTick,
  isEntityId,
  isExactInteger,
  moneyQ,
  parseCompanyCommand,
  prepareCompanyEconomy,
  projectCompanyLifecycle,
  publicRevision,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  CompanyCommandAcceptedDto,
  CompanyOpeningOptionsResponseDto,
  CompanyReadResponseDto,
  CreateCompanyRequestDto,
  OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';
import {
  ORDINARY_PLAYER_COMPANY_COMMAND_TYPES,
  WORLD_EXPECTED_COMPANY_ID_HEADER,
} from '@warwrit/protocol';
import { randomUUID } from 'node:crypto';

import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { findOwnedCompanyId, loadCompanyAggregate, saveCompanyAggregate } from './repository.js';
import { createOpeningAggregate, issueOpeningOption, openingOptionView } from './opening.js';
import type { IssuedOpeningOption } from './opening.js';
import { readWorldClock } from '../world/clock.js';
import { executeOrdinaryPlayerCompanyCommand } from './executor.js';
import { readSupplyShop } from './supplies.js';
import { projectCompanyHoldings } from './holdings.js';

export interface CompanyRoutesOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly worldId: string;
}

export function registerCompanyRoutes(
  app: FastifyInstance,
  { database, worldId }: CompanyRoutesOptions,
): void {
  app.get<{ Params: { siteId: string } }>('/company/supplies/:siteId', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const companyId = await database
      .transaction()
      .execute((transaction) => findOwnedCompanyId(transaction, worldId, accountId));
    if (!companyId) return reply.code(403).send({ error: 'company required' });
    const shop = await readSupplyShop(
      database,
      worldId,
      request.params.siteId,
      companyId,
      accountId,
    );
    return shop ?? reply.code(404).send({ error: 'no supply shop here' });
  });

  app.get('/company', async (request, reply): Promise<CompanyReadResponseDto | unknown> => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) {
      return reply.code(401).send({ error: 'authentication required' });
    }

    const company = await database.transaction().execute(async (transaction) => {
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (companyId === undefined) return null;
      const state = await loadCompanyAggregate(transaction, worldId, companyId);
      if (state === undefined) throw new Error('Owned company snapshot is unavailable');
      const view = projectCompanyLifecycle(state.economy.lifecycle, companyId);
      if (view === null) throw new Error('Owned company projection is unavailable');
      // Lifecycle knowledge refreshes only through observations; the owner always knows its
      // own company's current leader and whether its run has ended.
      const own = state.economy.lifecycle.company;
      return {
        holdings: projectCompanyHoldings(
          state,
          companyId,
          view.characters.map((character) => character.characterId),
        ),
        summary: {
          companyId: view.companyId,
          revision: view.revision,
          companyPresentation: view.companyPresentation,
          leaderId: own ? (own.actingLeaderId ?? own.currentLeaderId) : view.leaderId,
          runStatus: own?.runStatus ?? view.runStatus,
          characters: view.characters.map((character) => ({
            characterId: character.characterId,
            name: character.name,
            nicknameTextKey: character.nicknameTextKey,
            perkIds: [...character.perkIds],
            knownStatus: character.knownStatus,
          })),
        },
      };
    });

    return company === null
      ? { schemaVersion: 1, company: null }
      : { schemaVersion: 1, company: company.summary, holdings: company.holdings };
  });

  app.post('/company/opening-options', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });

    return database.transaction().execute(async (transaction) => {
      const account = await transaction
        .selectFrom('identity_accounts')
        .select('id')
        .where('id', '=', accountId)
        .forUpdate()
        .executeTakeFirst();
      if (!account) return reply.code(401).send({ error: 'authentication required' });
      if (await findOwnedCompanyId(transaction, worldId, accountId))
        return reply.code(409).send({ error: 'company already exists' });

      const now = new Date();
      const existing = await transaction
        .selectFrom('company_opening_options')
        .select(['evidence', 'expires_at'])
        .where('world_id', '=', worldId)
        .where('account_id', '=', accountId)
        .where('consumed_at', 'is', null)
        .where('expires_at', '>', now)
        .orderBy('created_at', 'desc')
        .forUpdate()
        .executeTakeFirst();
      if (existing) {
        const evidence = existing.evidence as IssuedOpeningOption['evidence'];
        return openingOptionView(evidence) satisfies CompanyOpeningOptionsResponseDto;
      }

      const clock = await readWorldClock(transaction, worldId, now, true);
      const option = issueOpeningOption(now, worldId, campaignTick(clock.tick));
      await transaction
        .insertInto('company_opening_options')
        .values({
          id: option.evidence.id,
          world_id: worldId,
          account_id: accountId,
          company_id: option.evidence.companyId,
          evidence: option.evidence,
          expires_at: option.expiresAt,
        })
        .execute();
      return openingOptionView(option.evidence) satisfies CompanyOpeningOptionsResponseDto;
    });
  });

  app.post('/company/commands', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });

    if (isOrdinaryCompanyRequest(request.body))
      return executeOrdinaryCompanyRequest(request, reply, database, worldId, accountId);

    const input = createCompanyInput(request.body);
    if (!input)
      return reply.code(400).send({ commandId: null, ok: false, code: 'INVALID_COMMAND' });

    const result = await database.transaction().execute(async (transaction) => {
      const account = await transaction
        .selectFrom('identity_accounts')
        .select('id')
        .where('id', '=', accountId)
        .forUpdate()
        .executeTakeFirst();
      if (!account) return { statusCode: 401, body: { error: 'authentication required' } };

      const optionRow = await transaction
        .selectFrom('company_opening_options')
        .selectAll()
        .where('world_id', '=', worldId)
        .where('account_id', '=', accountId)
        .where('id', '=', input.payload.candidateSetId)
        .forUpdate()
        .executeTakeFirst();
      if (!optionRow) return reject(input.commandId, 'INVALID_COMMAND');
      const evidence = optionRow.evidence as IssuedOpeningOption['evidence'];
      if (
        optionRow.company_id !== evidence.companyId ||
        evidence.worldId !== worldId ||
        evidence.id !== optionRow.id
      )
        return reject(input.commandId, 'INVALID_COMMAND');

      const commandValue = {
        schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
        commandId: input.commandId,
        worldId,
        companyId: evidence.companyId,
        actorRef: { kind: 'PLAYER', id: accountId },
        expectedRevision: publicRevision('0'),
        campaignTick: evidence.atTick,
        rulesetId: COMPANY_RULESET_ID,
        type: 'CreateCompany',
        payload: {
          ...input.payload,
          companyId: evidence.companyId,
          worldId,
          bannerId: evidence.originId,
        },
      };
      const parsed = parseCompanyCommand(commandValue);
      if (!parsed.ok || parsed.command.type !== 'CreateCompany')
        return reject(input.commandId, 'INVALID_COMMAND');
      const requestKey = canonicalJson(parsed.command);
      const ownedCompanyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (ownedCompanyId !== undefined) {
        if (
          ownedCompanyId !== evidence.companyId ||
          optionRow.consumed_command_id !== input.commandId ||
          optionRow.consumed_request_key !== requestKey
        )
          return reject(input.commandId, 'NOT_AUTHORIZED');
        const receipt = await transaction
          .selectFrom('company_receipts')
          .select(['request_key', 'response'])
          .where('world_id', '=', worldId)
          .where('company_id', '=', ownedCompanyId)
          .where('command_id', '=', input.commandId)
          .executeTakeFirst();
        if (!receipt || receipt.request_key !== requestKey)
          return reject(input.commandId, 'NOT_AUTHORIZED');
        return { statusCode: 200, body: receipt.response };
      }
      if (
        optionRow.consumed_at !== null ||
        optionRow.consumed_command_id !== null ||
        optionRow.consumed_request_key !== null ||
        optionRow.expires_at <= new Date()
      )
        return reject(input.commandId, 'INVALID_COMMAND');

      const initial = createOpeningAggregate(evidence, input.payload.selectedCandidateIds);
      const financeFacts = openingFinanceFacts(
        evidence,
        initial,
        input.payload.selectedCandidateIds,
      );
      const context = {
        worldId,
        companyId: evidence.companyId,
        principal: { kind: 'PLAYER' as const, id: accountId },
        publicRevision: publicRevision('0'),
        canonicalRevision: canonicalRevision('0'),
        atTick: evidence.atTick,
        completeGraph: true,
        contactIds: [evidence.contactId, evidence.providerId],
        facts: [evidence],
        financeFacts,
        physicalFacts: [],
        practiceFacts: [],
        learningFacts: [],
      };
      const prepared = prepareCompanyEconomy(initial.economy, parsed.command, context);
      if (prepared.kind !== 'PREPARED' || prepared.replayed) {
        return reject(input.commandId, 'INVALID_COMMAND');
      }

      const residuals = prepared.receipt.requirements;
      const nonfinancial = residuals.filter((item) => item.kind === 'OPENING_NONFINANCIAL');
      if (
        nonfinancial.length !== 1 ||
        nonfinancial[0]?.items.length !== 0 ||
        residuals.length !== 1
      )
        return reject(input.commandId, 'UNSUPPORTED_ACTION');

      const lifecycle = prepared.next.lifecycle;
      const social = bindOpeningContactReaction(initial.social, lifecycle, input.commandId);
      const state = readCompanyCombatAggregateState({
        ...initial,
        economy: prepared.next,
        social,
      });
      const assets = lifecycle.applied
        .find((entry) => entry.commandId === input.commandId)
        ?.requirements.find((entry) => entry.kind === 'OPENING_ASSETS');
      if (!assets || assets.kind !== 'OPENING_ASSETS')
        return reject(input.commandId, 'INVALID_COMMAND');
      const response: CompanyCommandAcceptedDto = {
        commandId: input.commandId,
        ok: true,
        publicRevision: lifecycle.knowledge.revision,
      };
      await saveCompanyAggregate(transaction, state, {
        command: parsed.command,
        receipt: {
          receiptId: randomUUID(),
          commandId: input.commandId,
          sourceKey: null,
          requestKey,
          response: { ...response },
          resultingRevision: lifecycle.revision,
        },
        auditEvents: [
          ...prepared.receipt.events.map((event) => ({
            eventId: event.id,
            revision: lifecycle.revision,
            event: { ...event },
          })),
          {
            eventId: randomUUID(),
            revision: lifecycle.revision,
            event: {
              type: 'OpeningHookSelected',
              commandId: input.commandId,
              candidateSetId: evidence.id,
              hookId: assets.assets.hookId,
            },
          },
        ],
      });
      await transaction
        .insertInto('company_account_owners')
        .values({ world_id: worldId, company_id: evidence.companyId, account_id: accountId })
        .execute();
      const consumed = await transaction
        .updateTable('company_opening_options')
        .set({
          consumed_at: new Date(),
          consumed_command_id: input.commandId,
          consumed_request_key: requestKey,
        })
        .where('world_id', '=', worldId)
        .where('account_id', '=', accountId)
        .where('id', '=', evidence.id)
        .where('consumed_at', 'is', null)
        .executeTakeFirst();
      if (Number(consumed.numUpdatedRows) !== 1)
        throw new Error('Opening option consumption lost its transaction lock');
      return { statusCode: 201, body: response };
    });
    return reply.code(result.statusCode).send(result.body);
  });
}

function parseOrdinaryCompanyCommandV2(
  value: unknown,
): OrdinaryPlayerCompanyCommandV2Dto | undefined {
  if (!isRecord(value)) return undefined;
  if (
    canonicalJson(Object.keys(value).sort()) !==
      canonicalJson(['commandId', 'expectedPublicRevision', 'payload', 'schemaVersion', 'type']) ||
    value['schemaVersion'] !== 2 ||
    !isEntityId(value['commandId']) ||
    !isExactInteger(value['expectedPublicRevision']) ||
    typeof value['type'] !== 'string' ||
    !ORDINARY_PLAYER_COMPANY_COMMAND_TYPES.some((type) => type === value['type']) ||
    !isRecord(value['payload'])
  )
    return undefined;

  const payload = value['payload'];
  try {
    canonicalJson(payload);
  } catch {
    return undefined;
  }

  if (value['type'] === 'BuySupplies') {
    if (
      canonicalJson(Object.keys(payload).sort()) !==
        canonicalJson(['quantity', 'shopRevision', 'siteId']) ||
      !isEntityId(payload['siteId']) ||
      !isExactInteger(payload['shopRevision']) ||
      !Number.isInteger(payload['quantity']) ||
      Number(payload['quantity']) < 1 ||
      Number(payload['quantity']) > 100
    )
      return undefined;
  } else if (value['type'] === 'RenameCompany') {
    if (
      canonicalJson(Object.keys(payload).sort()) !== canonicalJson(['bannerId', 'name']) ||
      typeof payload['name'] !== 'string' ||
      !isEntityId(payload['bannerId'])
    )
      return undefined;
  } else if (value['type'] === 'ChoosePerk') {
    if (
      canonicalJson(Object.keys(payload).sort()) !==
        canonicalJson(['characterId', 'milestone', 'perkId']) ||
      !isEntityId(payload['characterId']) ||
      !isEntityId(payload['perkId']) ||
      (payload['milestone'] !== 25 && payload['milestone'] !== 60)
    )
      return undefined;
  } else if (value['type'] === 'BeginFieldCamp' || value['type'] === 'EndFieldCamp') {
    if (Object.keys(payload).length !== 0) return undefined;
  } else if (value['type'] === 'EquipItem') {
    if (
      canonicalJson(Object.keys(payload).sort()) !==
        canonicalJson(['characterId', 'itemId', 'slotId']) ||
      !isEntityId(payload['characterId']) ||
      !isEntityId(payload['itemId']) ||
      !['HEAD', 'BODY', 'MAIN_HAND', 'OFF_HAND', 'BELT'].includes(String(payload['slotId']))
    )
      return undefined;
  }

  return value as unknown as OrdinaryPlayerCompanyCommandV2Dto;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readCompanyCommandId(value: unknown): string | null {
  return isRecord(value) && typeof value['commandId'] === 'string' ? value['commandId'] : null;
}

function readExpectedCompanyId(rawHeaders: readonly string[]): string | undefined {
  let expectedCompanyId: string | undefined;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() !== WORLD_EXPECTED_COMPANY_ID_HEADER) continue;
    if (expectedCompanyId !== undefined || !isEntityId(rawHeaders[index + 1])) return undefined;
    expectedCompanyId = rawHeaders[index + 1];
  }
  return expectedCompanyId;
}

function createCompanyInput(value: unknown): CreateCompanyRequestDto | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (
    input['schemaVersion'] !== 1 ||
    input['type'] !== 'CreateCompany' ||
    typeof input['commandId'] !== 'string' ||
    input['commandId'].trim() === '' ||
    input['payload'] === null ||
    typeof input['payload'] !== 'object' ||
    Array.isArray(input['payload'])
  )
    return undefined;
  return input as unknown as CreateCompanyRequestDto;
}

function reject(
  commandId: string,
  code: 'INVALID_COMMAND' | 'NOT_AUTHORIZED' | 'UNSUPPORTED_ACTION',
) {
  return {
    statusCode: 409,
    body: { commandId, ok: false, publicRevision: '0', code },
  };
}

function openingFinanceFacts(
  evidence: IssuedOpeningOption['evidence'],
  initial: ReturnType<typeof createOpeningAggregate>,
  selectedCandidateIds: readonly string[],
) {
  const origin = COMPANY_CATALOGUE.origins.find((item) => item.id === evidence.originId);
  const profile = COMPANY_CATALOGUE.openingProfiles.find((item) => item.id === evidence.profileId);
  if (!origin || !profile) throw new Error('Issued opening definition is unavailable');
  const qPerCrown = BigInt(COMPANY_RULES.moneyQPerCrown);
  const financeScope = {
    companyId: evidence.companyId,
    worldId: evidence.worldId,
    revision: canonicalRevision('0'),
    atTick: evidence.atTick,
  };
  const fundingWallet = initial.economy.finance.wallets.find(
    (wallet) => wallet.owner.kind === 'COMPANY' && wallet.owner.id === evidence.companyId,
  );
  if (!fundingWallet) throw new Error('Opening funding wallet is unavailable');
  return [
    {
      ...financeScope,
      id: randomUUID(),
      sourceEventId: evidence.sourceEventId,
      kind: 'OPENING_FUNDS' as const,
      openingEvidenceId: evidence.id,
      poolId: 'local',
      amountQ: moneyQ((BigInt(origin.cashCrowns) * qPerCrown).toString()),
    },
    ...[evidence.leaderId, ...selectedCandidateIds].map((characterId) => {
      const founder = characterId === evidence.leaderId;
      const signingWalletId = founder ? null : candidateSigningWallet(initial, characterId);
      return {
        ...financeScope,
        id: randomUUID(),
        sourceEventId: evidence.sourceEventId,
        kind: 'SERVICE_TERMS' as const,
        characterId,
        poolId: 'local',
        recipient: { kind: 'CHARACTER' as const, id: characterId },
        signingWalletId,
        rates: founder
          ? []
          : COMPANY_RULES.economy.qualificationBands.map((band) => ({
              minimumLevel: band.level,
              dailyWageMilli: profile.dailyWageMilli,
            })),
      };
    }),
  ];
}

function isOrdinaryCompanyRequest(value: unknown) {
  return isRecord(value) && value['schemaVersion'] === 2;
}
async function executeOrdinaryCompanyRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  database: Kysely<DatabaseSchema>,
  worldId: string,
  accountId: string,
) {
  const ordinary = parseOrdinaryCompanyCommandV2(request.body);
  if (!ordinary)
    return reply.code(400).send({
      commandId: readCompanyCommandId(request.body),
      ok: false,
      publicRevision: '0',
      code: 'INVALID_COMMAND',
    });
  const result = await database.transaction().execute((transaction) =>
    executeOrdinaryPlayerCompanyCommand({
      transaction,
      accountId,
      expectedCompanyId: readExpectedCompanyId(request.raw.rawHeaders),
      worldId,
      request: ordinary,
      requestKey: canonicalJson(ordinary),
      now: new Date(),
    }),
  );
  return reply.code(result.kind === 'COMMITTED' ? 200 : result.statusCode).send(result.response);
}

function candidateSigningWallet(
  initial: ReturnType<typeof createOpeningAggregate>,
  characterId: string,
) {
  const wallet = initial.economy.finance.wallets.find(
    (entry) => entry.owner.kind === 'CHARACTER' && entry.owner.id === characterId,
  );
  if (!wallet) throw new Error('Candidate signing wallet is unavailable');
  return wallet.walletId;
}
