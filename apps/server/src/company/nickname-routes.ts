import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  canonicalJson,
  campaignTick,
  companySourceKey,
  parseCompanyCommand,
  prepareCompanyEconomy,
  projectCompanyLifecycle,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  CompanyCommand,
  LifecycleEvent,
} from '@warwrit/game-core';
import type {
  CompanyCommandAcceptedDto,
  CompanyCommandRejectionDto,
  CompanyNicknamesDto,
  ResolveCompanyNicknameRequestDto,
} from '@warwrit/protocol';
import {
  isResolveCompanyNicknameRequest,
  WORLD_EXPECTED_COMPANY_ID_HEADER,
} from '@warwrit/protocol';
import { randomUUID } from 'node:crypto';

import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  readCompanyCommandReceipt,
  updateCompanyAggregateWithReceipt,
} from './repository.js';

export interface CompanyNicknameRoutesOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly worldId: string;
}

export function companyNicknamesView(
  state: Parameters<typeof projectCompanyLifecycle>[0],
  observerCompanyId: string,
): CompanyNicknamesDto | null {
  const projection = projectCompanyLifecycle(state, observerCompanyId);
  if (!projection) return null;
  const names = new Map(
    projection.characters.map((character) => [character.characterId, character.name]),
  );
  return {
    schemaVersion: 1,
    companyId: projection.companyId,
    publicRevision: projection.revision,
    pending: projection.nicknameProposals.map((proposal) => ({
      proposalId: proposal.proposalId,
      characterId: proposal.characterId,
      characterName: names.get(proposal.characterId) ?? null,
      textKey: proposal.textKey,
      reasonKey: proposal.reasonKey,
      proposedAt: proposal.proposedAt,
    })),
    history: projection.nicknameHistory.map((nickname) => ({
      proposalId: nickname.proposalId,
      characterId: nickname.characterId,
      characterName: names.get(nickname.characterId) ?? null,
      sourceEventId: nickname.sourceEventId,
      textKey: nickname.textKey,
      reasonKey: nickname.reasonKey,
      proposedAt: nickname.proposedAt ?? null,
      resolution: nickname.resolution ?? 'ACCEPTED',
      decidedAt: nickname.decidedAt ?? nickname.acceptedAt!,
      acceptedAt: nickname.acceptedAt ?? null,
    })),
  };
}

export function prepareNicknameResolution(input: {
  readonly state: CompanyCombatAggregateState;
  readonly request: ResolveCompanyNicknameRequestDto;
  readonly accountId: string;
  readonly atTick: string;
}):
  | { readonly kind: 'REJECTED'; readonly error: string; readonly publicRevision: string }
  | {
      readonly kind: 'PREPARED';
      readonly state: CompanyCombatAggregateState;
      readonly command: CompanyCommand;
      readonly events: readonly LifecycleEvent[];
    } {
  const lifecycle = input.state.economy.lifecycle;
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: input.request.commandId,
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    actorRef: { kind: 'PLAYER', id: input.accountId },
    expectedRevision: input.request.expectedPublicRevision,
    campaignTick: campaignTick(input.atTick),
    rulesetId: COMPANY_RULESET_ID,
    type: 'ResolveNickname',
    payload: { proposalId: input.request.proposalId, accept: input.request.accept },
  });
  if (!parsed.ok || parsed.command.type !== 'ResolveNickname')
    return {
      kind: 'REJECTED',
      error: 'INVALID_COMMAND',
      publicRevision: lifecycle.knowledge.revision,
    };
  const prepared = prepareCompanyEconomy(input.state.economy, parsed.command, {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal: parsed.command.actorRef,
    publicRevision: lifecycle.knowledge.revision,
    canonicalRevision: lifecycle.revision,
    atTick: campaignTick(input.atTick),
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts: [],
    physicalFacts: [],
  });
  if (prepared.kind !== 'PREPARED')
    return {
      kind: 'REJECTED',
      error: prepared.error,
      publicRevision: lifecycle.knowledge.revision,
    };
  if (prepared.receipt.requirements.length > 0)
    return {
      kind: 'REJECTED',
      error: 'UNSUPPORTED_ACTION',
      publicRevision: lifecycle.knowledge.revision,
    };
  try {
    return {
      kind: 'PREPARED',
      state: readCompanyCombatAggregateState({ ...input.state, economy: prepared.next }),
      command: parsed.command,
      events: prepared.receipt.events,
    };
  } catch {
    return {
      kind: 'REJECTED',
      error: 'INVALID_STATE',
      publicRevision: lifecycle.knowledge.revision,
    };
  }
}

export function registerCompanyNicknameRoutes(
  app: FastifyInstance,
  { database, worldId }: CompanyNicknameRoutesOptions,
): void {
  app.get('/company/nicknames', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const expectedCompanyId = request.headers[WORLD_EXPECTED_COMPANY_ID_HEADER];
    if (typeof expectedCompanyId !== 'string')
      return reply.code(400).send({ error: 'expected company required' });

    const result = await database.transaction().execute(async (transaction) => {
      if (!(await lockIdentityAccount(transaction, accountId)))
        return { kind: 'UNAUTHORIZED' as const };
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (!companyId || companyId !== expectedCompanyId) return { kind: 'FORBIDDEN' as const };
      const state = await lockCompanyAggregate(transaction, worldId, companyId);
      if (!state) throw new Error('Owned company snapshot is unavailable');
      return {
        kind: 'OK' as const,
        view: companyNicknamesView(state.economy.lifecycle, companyId),
      };
    });
    if (result.kind === 'UNAUTHORIZED')
      return reply.code(401).send({ error: 'authentication required' });
    if (result.kind === 'FORBIDDEN') return reply.code(403).send({ error: 'company required' });
    return result.view;
  });

  app.post('/company/nicknames/resolve', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const expectedCompanyId = request.headers[WORLD_EXPECTED_COMPANY_ID_HEADER];
    if (typeof expectedCompanyId !== 'string')
      return reply.code(400).send({ error: 'expected company required' });
    if (!isResolveCompanyNicknameRequest(request.body))
      return reply.code(400).send({ error: 'invalid nickname resolution request' });
    const input = request.body as ResolveCompanyNicknameRequestDto;
    const requestKey = canonicalJson(input);

    const result = await database.transaction().execute(async (transaction) => {
      if (!(await lockIdentityAccount(transaction, accountId)))
        return { kind: 'UNAUTHORIZED' as const };
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (!companyId || companyId !== expectedCompanyId) return { kind: 'FORBIDDEN' as const };
      const previous = await lockCompanyAggregate(transaction, worldId, companyId);
      if (!previous) throw new Error('Owned company snapshot is unavailable');
      const lifecycle = previous.economy.lifecycle;

      // Exact retries are answered before revision freshness or any simulation work.
      const prior = await readCompanyCommandReceipt(
        transaction,
        worldId,
        companyId,
        input.commandId,
      );
      if (prior) {
        if (prior.requestKey !== requestKey)
          return { kind: 'CONFLICT' as const, publicRevision: lifecycle.knowledge.revision };
        const replay = acceptedReceipt(prior.response, input.commandId);
        return replay
          ? { kind: 'REPLAY' as const, response: replay }
          : {
              kind: 'INVALID' as const,
              publicRevision: lifecycle.knowledge.revision,
              code: 'INVALID_COMMAND' as const,
            };
      }
      if (input.expectedPublicRevision !== lifecycle.knowledge.revision)
        return { kind: 'STALE' as const, publicRevision: lifecycle.knowledge.revision };

      const prepared = prepareNicknameResolution({
        state: previous,
        request: input,
        accountId,
        atTick: lifecycle.campaignTick,
      });
      if (prepared.kind !== 'PREPARED')
        return {
          kind: 'INVALID' as const,
          publicRevision: lifecycle.knowledge.revision,
          code: commandRejectionCode(prepared.error),
        };
      const next = prepared.state;
      const response = {
        commandId: input.commandId,
        ok: true as const,
        publicRevision: next.economy.lifecycle.knowledge.revision,
      };
      const commandRequestKey = requestKey;
      await updateCompanyAggregateWithReceipt(
        transaction,
        lifecycle.revision,
        next.economy.lifecycle.revision,
        next,
        {
          command: prepared.command,
          receipt: {
            receiptId: randomUUID(),
            commandId: input.commandId,
            sourceKey: companySourceKey(prepared.command),
            requestKey: commandRequestKey,
            response,
            resultingRevision: next.economy.lifecycle.revision,
          },
          auditEvents: prepared.events.map((event) => ({
            eventId: event.id,
            revision: next.economy.lifecycle.revision,
            event,
          })),
        },
      );
      return { kind: 'COMMITTED' as const, response };
    });

    if (result.kind === 'UNAUTHORIZED')
      return reply.code(401).send({ error: 'authentication required' });
    if (result.kind === 'FORBIDDEN') return reply.code(403).send({ error: 'company required' });
    if (result.kind === 'CONFLICT')
      return reply.code(409).send({
        commandId: input.commandId,
        ok: false,
        publicRevision: result.publicRevision,
        code: 'IDEMPOTENCY_CONFLICT',
      } satisfies CompanyCommandRejectionDto);
    if (result.kind === 'STALE')
      return reply.code(409).send({
        commandId: input.commandId,
        ok: false,
        publicRevision: result.publicRevision,
        code: 'STALE_REVISION',
      } satisfies CompanyCommandRejectionDto);
    if (result.kind === 'INVALID')
      return reply.code(409).send({
        commandId: input.commandId,
        ok: false,
        publicRevision: result.publicRevision,
        code: result.code,
      } satisfies CompanyCommandRejectionDto);
    return result.response;
  });
}

function commandRejectionCode(error: string): CompanyCommandRejectionDto['code'] {
  if (
    error === 'STALE_REVISION' ||
    error === 'UNSUPPORTED_ACTION' ||
    error === 'IDEMPOTENCY_CONFLICT' ||
    error === 'NOT_AUTHORIZED'
  )
    return error;
  return 'INVALID_COMMAND';
}

function acceptedReceipt(value: unknown, commandId: string): CompanyCommandAcceptedDto | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const response = value as Record<string, unknown>;
  if (
    Object.keys(response).toSorted().join('\0') !== 'commandId\0ok\0publicRevision' ||
    response['commandId'] !== commandId ||
    response['ok'] !== true ||
    typeof response['publicRevision'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/u.test(response['publicRevision'])
  )
    return undefined;
  return response as unknown as CompanyCommandAcceptedDto;
}
