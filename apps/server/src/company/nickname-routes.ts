import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import { canonicalJson, projectCompanyLifecycle } from '@warwrit/game-core';
import type {
  CompanyNicknamesDto,
  OrdinaryPlayerCompanyCommandV2Dto,
  ResolveCompanyNicknameRequestDto,
} from '@warwrit/protocol';
import {
  isResolveCompanyNicknameRequest,
  WORLD_EXPECTED_COMPANY_ID_HEADER,
} from '@warwrit/protocol';

import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { findOwnedCompanyId, lockCompanyAggregate } from './repository.js';
import { executeOrdinaryPlayerCompanyCommand } from './executor.js';

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
    const ordinaryRequest: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: input.commandId,
      expectedPublicRevision: input.expectedPublicRevision,
      type: 'ResolveNickname',
      payload: { proposalId: input.proposalId, accept: input.accept },
    };
    const requestKey = canonicalJson(ordinaryRequest);
    const result = await database.transaction().execute((transaction) =>
      executeOrdinaryPlayerCompanyCommand({
        transaction,
        accountId,
        expectedCompanyId,
        worldId,
        request: ordinaryRequest,
        requestKey,
        now: new Date(),
      }),
    );
    return reply.code(result.kind === 'COMMITTED' ? 200 : result.statusCode).send(result.response);
  });
}
