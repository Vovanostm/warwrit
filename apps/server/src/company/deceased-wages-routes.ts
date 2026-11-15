import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import { deceasedWageQuotes, isEntityId } from '@warwrit/game-core';
import type { DeceasedWageQuoteDto, OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { hasExactKeys, isRecord } from '../record-guards.js';
import type { DatabaseSchema } from '../db/database.js';
import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import { findOwnedCompanyId, lockCompanyAggregate } from './repository.js';
import { observeLocalCompanyConditions } from './observation.js';

export function registerCompanyDeceasedWagesRoutes(
  app: FastifyInstance,
  options: { readonly database: Kysely<DatabaseSchema>; readonly worldId: string },
): void {
  app.get(
    '/company/deceased-wages',
    async (request, reply): Promise<DeceasedWageQuoteDto | unknown> => {
      const accountId = await resolveSessionAccount(request, options.database);
      if (!accountId) return reply.code(401).send({ error: 'authentication required' });
      const expectedCompanyId = readExpectedCompanyId(request.raw.rawHeaders);
      if (!expectedCompanyId) return reply.code(400).send({ error: 'company context required' });
      return options.database.transaction().execute(async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId)))
          return reply.code(401).send({ error: 'authentication required' });
        const companyId = await findOwnedCompanyId(transaction, options.worldId, accountId);
        if (!companyId || companyId !== expectedCompanyId)
          return reply.code(403).send({ error: 'company required' });
        const loaded = await lockCompanyAggregate(transaction, options.worldId, companyId);
        if (!loaded) throw new Error('Owned company snapshot is unavailable');
        const state = await observeLocalCompanyConditions(transaction, loaded, new Date());
        const party =
          state.economy.lifecycle.parties.length === 1
            ? state.economy.lifecycle.parties[0]
            : undefined;
        return {
          publicRevision: state.economy.lifecycle.knowledge.revision,
          local: party?.location.kind === 'AT' && party.location.siteId === 'kamenny-brod',
          people: deceasedWageQuotes(state.economy),
        } satisfies DeceasedWageQuoteDto;
      });
    },
  );
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

export type PayDeceasedWagesRequest = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { readonly type: 'PayDeceasedWages' }
>;
export type PayDeceasedWagesPayload = PayDeceasedWagesRequest['payload'];

export function isPayDeceasedWagesPayload(value: unknown): value is PayDeceasedWagesPayload {
  return (
    isRecord(value) && hasExactKeys(value, ['characterId']) && isEntityId(value['characterId'])
  );
}

/** Strict command arm parser; ownership, company header and receipt replay stay in routing. */
export function parsePayDeceasedWagesRequest(value: unknown): PayDeceasedWagesRequest | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'commandId',
      'expectedPublicRevision',
      'type',
      'payload',
    ]) ||
    value['schemaVersion'] !== 2 ||
    value['type'] !== 'PayDeceasedWages' ||
    !isEntityId(value['commandId']) ||
    typeof value['expectedPublicRevision'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/u.test(value['expectedPublicRevision']) ||
    !isPayDeceasedWagesPayload(value['payload'])
  )
    return undefined;
  return value as unknown as PayDeceasedWagesRequest;
}

export function payDeceasedWagesCommandIntent(request: PayDeceasedWagesRequest) {
  return {
    type: 'PayDeceasedWages' as const,
    payload: { characterId: request.payload.characterId },
  };
}
