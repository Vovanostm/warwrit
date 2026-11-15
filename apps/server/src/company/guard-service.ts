import { createHash } from 'node:crypto';
import {
  campaignTick,
  canonicalRevision,
  COMPANY_RULES,
  type CompanyCombatAggregateState,
  type LocalMoneyAccess,
  type SafeServiceOffer,
} from '@warwrit/game-core';
import type { CompanyGuardServiceResponseDto } from '@warwrit/protocol';
import { isCompanyEntityId, WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Transaction } from 'kysely';
import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import type { WorldClockReading } from '../world/clock.js';
import type { CompanyRoutesOptions } from './routes.js';
import { findOwnedCompanyId, lockCompanyAggregate } from './repository.js';
import { localCompanyContacts } from './recruitment.js';
import { ensureCourseProvider, KAMENNY_BROD_GUARD_COURSE } from './courses.js';
import { localSiteHasHostiles } from './local-safe-place.js';

export const GUARD_SERVICE_TERMS_VERSION = 'kamenny-brod-guard-service-v1';
export const GUARD_SERVICE_PROVIDER_NAME = 'Гордей Лапа' as const;

export function guardServiceOfferId(
  worldId: string,
  companyId: string,
  revision: string,
  atTick: string,
): string {
  const digest = createHash('sha256')
    .update(`warwrit-kb-guard-service-v1:${worldId}:${companyId}:${revision}:${atTick}`)
    .digest('hex');
  return `guard-service-${digest.slice(0, 32)}`;
}

/** The adapter binds the accepted local provider and place; every term is server supplied. */
export function prepareGuardServiceOffer(input: {
  readonly state: CompanyCombatAggregateState;
  readonly worldId: string;
  readonly companyId: string;
  readonly atTick: string;
  readonly offerId: string;
}): { readonly state: CompanyCombatAggregateState; readonly offer?: SafeServiceOffer } {
  const state = ensureCourseProvider(input.state);
  const lifecycle = state.economy.lifecycle;
  const party = lifecycle.parties.length === 1 ? lifecycle.parties[0] : undefined;
  const location = KAMENNY_BROD_GUARD_COURSE.location;
  if (
    party?.location.kind !== 'AT' ||
    party.location.siteId !== location.siteId ||
    party.location.areaId !== location.areaId
  )
    return { state };
  const beneficiaryIds = lifecycle.characters
    .filter((character) => character.presence.fieldPartyId === party.partyId)
    .map((character) => character.identity.characterId)
    .toSorted();
  const contacts = localCompanyContacts(state, input.companyId, party.location);
  if (
    beneficiaryIds.length === 0 ||
    beneficiaryIds.length > COMPANY_RULES.partyHardMax ||
    beneficiaryIds.some((id) => !contacts.includes(id))
  )
    return { state };
  const offer: SafeServiceOffer = {
    id: input.offerId,
    sourceEventId: `safe-service-offer-${input.offerId}`,
    worldId: input.worldId,
    companyId: input.companyId,
    revision: canonicalRevision(lifecycle.revision),
    atTick: campaignTick(input.atTick),
    kind: 'SAFE_SERVICE_OFFER',
    partyId: party.partyId,
    location: { ...party.location },
    providerId: KAMENNY_BROD_GUARD_COURSE.providerId,
    offerRevision: lifecycle.knowledge.revision,
    termsVersion: GUARD_SERVICE_TERMS_VERSION,
    expiresAt: campaignTick((BigInt(input.atTick) + 1n).toString()),
    permittedBeneficiaryIds: beneficiaryIds,
    safe: true,
    inhabited: true,
    accessible: true,
  };
  return { state, offer };
}

export function prepareGuardServiceMoneyAccess(input: {
  readonly state: CompanyCombatAggregateState;
  readonly worldId: string;
  readonly companyId: string;
  readonly atTick: string;
  readonly evidenceId: string;
}): LocalMoneyAccess | undefined {
  const lifecycle = input.state.economy.lifecycle;
  const party = lifecycle.parties.length === 1 ? lifecycle.parties[0] : undefined;
  if (party?.location.kind !== 'AT') return undefined;
  const location = party.location;
  const operatorId = localCompanyContacts(input.state, input.companyId, location)[0];
  if (!operatorId) return undefined;
  const poolIds = input.state.economy.finance.pools
    .filter((pool) => {
      const wallet = input.state.economy.finance.wallets.find(
        (entry) => entry.walletId === pool.walletId,
      );
      if (wallet?.location.kind !== 'AT') return false;
      return (
        wallet.location.siteId === location.siteId && wallet.location.areaId === location.areaId
      );
    })
    .map((pool) => pool.poolId)
    .toSorted();
  if (!poolIds.includes('local')) return undefined;
  return {
    id: input.evidenceId,
    sourceEventId: input.evidenceId,
    worldId: input.worldId,
    companyId: input.companyId,
    revision: canonicalRevision(lifecycle.revision),
    atTick: campaignTick(input.atTick),
    kind: 'LOCAL_MONEY_ACCESS',
    operatorId,
    location: { ...location },
    poolIds,
    recipientWalletIds: [],
  };
}

export function guardServiceView(
  state: CompanyCombatAggregateState,
  offer: SafeServiceOffer | undefined,
  unsafe = false,
  local = false,
): CompanyGuardServiceResponseDto {
  const active = state.economy.finance.maintenance.find(
    (mode) => mode.kind === 'SAFE_SERVICE' && mode.endedAt === null,
  );
  return {
    publicRevision: String(state.economy.lifecycle.knowledge.revision),
    local,
    providerName: GUARD_SERVICE_PROVIDER_NAME,
    ...(unsafe ? { unavailableReason: 'PLACE_UNSAFE' as const } : {}),
    ...(offer
      ? {
          offer: {
            offerId: offer.id,
            quoteRevision: String(offer.offerRevision),
            beneficiaryIds: [...offer.permittedBeneficiaryIds],
          },
        }
      : {}),
    ...(active && active.partyId === state.economy.lifecycle.parties[0]?.partyId
      ? {
          agreement: {
            agreementId: active.agreementId,
            beneficiaryIds: active.beneficiaryIds.filter(
              (id) => !active.beneficiaryEnds.some((end) => end.characterId === id),
            ),
          },
        }
      : {}),
  };
}

export function registerGuardServiceRoute(
  app: FastifyInstance,
  {
    database,
    worldId,
    catchUpStationaryCompany,
  }: CompanyRoutesOptions & {
    readonly catchUpStationaryCompany: (input: {
      readonly transaction: Transaction<DatabaseSchema>;
      readonly accountId: string;
      readonly state: CompanyCombatAggregateState;
      readonly atTick: string;
      readonly requestKind: string;
      readonly clock?: WorldClockReading;
    }) => Promise<CompanyCombatAggregateState | undefined>;
  },
): void {
  app.get<{ Params: { siteId: string } }>(
    '/company/guard-service/:siteId',
    async (request, reply): Promise<CompanyGuardServiceResponseDto | unknown> => {
      const accountId = await resolveSessionAccount(request, database);
      if (!accountId) return reply.code(401).send({ error: 'authentication required' });
      const view = await database.transaction().execute(async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId))) return null;
        const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
        if (!companyId) return null;
        if (readExpectedCompanyId(request.raw.rawHeaders) !== companyId)
          return reply.code(409).send({ error: 'company scope changed' });
        let state = await lockCompanyAggregate(transaction, worldId, companyId);
        if (!state) throw new Error('Owned company snapshot is unavailable');
        const clock = await readWorldClock(transaction, worldId, new Date(), true);
        if (BigInt(clock.tick) > BigInt(state.economy.finance.processedTick)) {
          const caughtUp = await catchUpStationaryCompany({
            transaction,
            accountId,
            state,
            atTick: clock.tick,
            requestKind: 'GuardServiceOffer',
            clock,
          });
          if (!caughtUp) return reply.code(503).send({ error: 'guard service offer unavailable' });
          state = caughtUp;
        }
        const offerId = guardServiceOfferId(
          worldId,
          companyId,
          state.economy.lifecycle.knowledge.revision,
          clock.tick,
        );
        const atGuard = state.economy.lifecycle.parties.some(
          (party) =>
            party.location.kind === 'AT' &&
            party.location.siteId === KAMENNY_BROD_GUARD_COURSE.location.siteId &&
            party.location.areaId === KAMENNY_BROD_GUARD_COURSE.location.areaId,
        );
        const unsafe =
          atGuard &&
          (await localSiteHasHostiles(
            transaction,
            worldId,
            KAMENNY_BROD_GUARD_COURSE.location.siteId,
          ));
        const prepared =
          request.params.siteId === KAMENNY_BROD_GUARD_COURSE.location.siteId && !unsafe
            ? prepareGuardServiceOffer({
                state,
                worldId,
                companyId,
                atTick: clock.tick,
                offerId,
              })
            : { state };
        return guardServiceView(prepared.state, prepared.offer, unsafe, atGuard);
      });
      return view === null ? reply.code(403).send({ error: 'company required' }) : view;
    },
  );
}

function readExpectedCompanyId(rawHeaders: readonly string[]): string | undefined {
  let expectedCompanyId: string | undefined;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() !== WORLD_EXPECTED_COMPANY_ID_HEADER) continue;
    if (expectedCompanyId !== undefined || !isCompanyEntityId(rawHeaders[index + 1]))
      return undefined;
    expectedCompanyId = rawHeaders[index + 1];
  }
  return expectedCompanyId;
}
