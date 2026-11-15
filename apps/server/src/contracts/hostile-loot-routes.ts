import { randomUUID } from 'node:crypto';
import {
  availableContainerG,
  canonicalJson,
  COMPANY_CATALOGUE,
  companySourceKey,
  huntProfile,
  isEntityId,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  HostileLootAvailabilityDto,
  HostileLootPickupResponseDto,
  HostileLootSourceDto,
} from '@warwrit/protocol';
import { isHostileLootPickupRequestDto, WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Kysely, Transaction } from 'kysely';

import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import {
  findOwnedCompanyId,
  loadCompanyAggregate,
  lockCompanyAggregate,
  readCompanyCommandReceipt,
  readCompanySourceReceipt,
  updateCompanyAggregateWithReceipt,
} from '../company/repository.js';
import { readWorldClock } from '../world/clock.js';
import { claimHostileGearItems } from './first-hunt-gear.js';
import {
  readHuntWorldState,
  selectHuntWorldRow,
  updateHuntWorldRow,
} from './first-hunt-runtime.js';
import { prepareHostileLootPickup } from './hostile-loot.js';

export function registerHostileLootRoutes(
  app: FastifyInstance,
  options: { readonly database: Kysely<DatabaseSchema>; readonly worldId: string },
): void {
  const { database, worldId } = options;

  app.get<{ Params: { instanceId: string } }>(
    '/company/hostile-loot/:instanceId',
    async (request, reply) => {
      const accountId = await resolveSessionAccount(request, database);
      if (!accountId) return reply.code(401).send({ error: 'authentication required' });
      const profile = huntProfile(request.params.instanceId);
      if (!profile) return reply.code(404).send({ error: 'unknown hunt' });
      const result = await database.transaction().execute(async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId))) return null;
        const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
        if (!companyId) return null;
        const rawWorld = await selectHuntWorldRow(transaction, worldId, profile, false);
        if (!rawWorld) return null;
        const world = readHuntWorldState(worldId, profile, rawWorld);
        const state = await loadCompanyAggregate(transaction, worldId, companyId);
        if (!state) throw new Error('Owned company snapshot is unavailable');
        const physical = state.economy.physical;
        if (!physical)
          return {
            schemaVersion: 1 as const,
            publicRevision: state.economy.lifecycle.knowledge.revision,
            sources: [],
            targetContainerIds: [],
          };
        const candidates: HostileLootSourceDto[] = [];
        for (const hostile of world.hostiles) {
          const gear = hostile.gear;
          if (
            !gear ||
            (hostile.currentPools['health'] !== 0 && hostile.disposition !== 'surrendered') ||
            !gear.terminalSourceId ||
            gear.terminalRevision === undefined ||
            gear.items.length === 0 ||
            !(await hasVerifiedTerminal(
              transaction,
              worldId,
              profile.instanceId,
              gear.terminalSourceId,
              gear.terminalRevision,
            ))
          )
            continue;
          const items = gear.items.filter((item) => !gear.claimedItemIds?.includes(item.itemId));
          if (items.length === 0) continue;
          candidates.push({
            hostileId: hostile.entityId,
            terminalSourceId: gear.terminalSourceId,
            terminalRevision: gear.terminalRevision,
            location: profile.objectiveLocation,
            items: items.map((item) => ({
              itemId: item.itemId,
              definitionId: item.definitionId,
              currentCondition: item.currentCondition,
              maximumCondition: item.maximumCondition,
            })),
          });
        }
        const targetContainerIds = physical.containers
          .filter((container) => {
            const owned =
              (container.custodian.kind === 'COMPANY' && container.custodian.id === companyId) ||
              (container.custodian.kind === 'CHARACTER' &&
                state.economy.lifecycle.memberships.some(
                  (membership) =>
                    membership.endedAt === null &&
                    String(membership.characterId) === container.custodian.id,
                ));
            return (
              owned &&
              container.access === 'COMPANY' &&
              container.closed === null &&
              ['CARRIED', 'PARTY_SUPPLY', 'STATIC'].includes(container.kind) &&
              container.location.kind === 'AT' &&
              container.location.siteId === profile.objectiveLocation.siteId &&
              container.location.areaId === profile.objectiveLocation.areaId &&
              candidates.some((candidate) =>
                candidate.items.some((item) => {
                  const definition = COMPANY_CATALOGUE.items.find(
                    (entry) => entry.id === item.definitionId,
                  );
                  return (
                    definition !== undefined &&
                    availableContainerG(physical, container.containerId) >= definition.weightG
                  );
                }),
              )
            );
          })
          .map((container) => container.containerId)
          .toSorted();
        return {
          schemaVersion: 1 as const,
          publicRevision: state.economy.lifecycle.knowledge.revision,
          sources: candidates,
          targetContainerIds,
        } satisfies HostileLootAvailabilityDto;
      });
      if (result === null) return reply.code(403).send({ error: 'company required' });
      reply.header('cache-control', 'no-store');
      return result;
    },
  );

  app.post<{ Params: { instanceId: string }; Body: unknown }>(
    '/company/hostile-loot/:instanceId/pickup',
    async (request, reply) => {
      const accountId = await resolveSessionAccount(request, database);
      if (!accountId) return reply.code(401).send({ error: 'authentication required' });
      const requestDto = request.body;
      const profile = huntProfile(request.params.instanceId);
      if (
        !isHostileLootPickupRequestDto(requestDto) ||
        !profile ||
        requestDto.instanceId !== profile.instanceId
      )
        return reply
          .code(400)
          .send(
            rejection(
              typeof (requestDto as { commandId?: unknown } | null)?.commandId === 'string'
                ? String((requestDto as { commandId: string }).commandId)
                : 'invalid-command',
              'INVALID_COMMAND',
              '0',
            ),
          );
      const expectedCompanyId = readExpectedCompanyId(request.raw.rawHeaders);
      const requestKey = canonicalJson(requestDto);
      const response = await database.transaction().execute(async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId)))
          return rejection(requestDto.commandId, 'NOT_AUTHORIZED', '0');
        const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
        if (!companyId || expectedCompanyId !== companyId)
          return rejection(requestDto.commandId, 'NOT_AUTHORIZED', '0');
        const byCommand = await readCompanyCommandReceipt(
          transaction,
          worldId,
          companyId,
          requestDto.commandId,
        );
        if (byCommand) {
          if (byCommand.requestKey !== requestKey)
            return rejection(
              requestDto.commandId,
              'IDEMPOTENCY_CONFLICT',
              byCommand.resultingRevision,
            );
          return (
            acceptedReceipt(byCommand.response, requestDto.commandId) ??
            rejection(requestDto.commandId, 'NOT_AVAILABLE', byCommand.resultingRevision)
          );
        }
        const hintRow = await selectHuntWorldRow(transaction, worldId, profile, false);
        if (!hintRow) return rejection(requestDto.commandId, 'NOT_AVAILABLE', '0');
        const hintWorld = readHuntWorldState(worldId, profile, hintRow);
        const hint = hintWorld.hostiles.find((entry) => entry.entityId === requestDto.hostileId);
        const hintGear = hint?.gear;
        if (!hint || !hintGear?.terminalSourceId || hintGear.terminalRevision === undefined)
          return rejection(requestDto.commandId, 'NOT_AVAILABLE', '0');
        const admission = await lockVerifiedTerminal(
          transaction,
          worldId,
          profile.instanceId,
          hintGear.terminalSourceId,
          hintGear.terminalRevision,
        );
        if (!admission) return rejection(requestDto.commandId, 'NOT_AVAILABLE', '0');
        const state = await lockCompanyAggregate(transaction, worldId, companyId);
        if (!state) throw new Error('Owned company snapshot is unavailable');
        const publicRevision = state.economy.lifecycle.knowledge.revision;
        if (requestDto.expectedPublicRevision !== publicRevision)
          return rejection(requestDto.commandId, 'STALE_REVISION', publicRevision);
        const rawWorld = await selectHuntWorldRow(transaction, worldId, profile);
        if (!rawWorld) return rejection(requestDto.commandId, 'NOT_AVAILABLE', publicRevision);
        const world = readHuntWorldState(worldId, profile, rawWorld);
        const hostile = world.hostiles.find((entry) => entry.entityId === requestDto.hostileId);
        const gear = hostile?.gear;
        if (
          !hostile ||
          !gear?.terminalSourceId ||
          gear.terminalRevision === undefined ||
          gear.terminalSourceId !== hintGear.terminalSourceId ||
          gear.terminalRevision !== hintGear.terminalRevision
        )
          return rejection(requestDto.commandId, 'NOT_AVAILABLE', publicRevision);
        const previous = readCompanyCombatAggregateState(state);
        const clock = await readWorldClock(transaction, worldId);
        const prepared = prepareHostileLootPickup({
          previous,
          accountId,
          request: requestDto,
          worldId,
          profile,
          hostile,
          terminalSourceId: gear.terminalSourceId,
          terminalRevision: gear.terminalRevision,
          campaignTick: clock.tick,
        });
        if (prepared.kind !== 'PREPARED')
          return rejection(requestDto.commandId, prepared.code, publicRevision);
        const sourceKey = companySourceKey(prepared.command);
        if (sourceKey) {
          const bySource = await readCompanySourceReceipt(
            transaction,
            worldId,
            companyId,
            sourceKey,
          );
          if (bySource)
            return rejection(
              requestDto.commandId,
              'IDEMPOTENCY_CONFLICT',
              bySource.resultingRevision,
            );
        }
        const receiptId = randomUUID();
        const nextPublicRevision = (BigInt(publicRevision) + 1n).toString();
        const accepted: HostileLootPickupResponseDto = {
          schemaVersion: 1,
          commandId: requestDto.commandId,
          ok: true,
          receiptId,
          publicRevision: nextPublicRevision,
        };
        const nextHostile = claimHostileGearItems({
          worldId,
          profile,
          hostile,
          itemIds: [requestDto.itemId],
          terminalSourceId: gear.terminalSourceId,
          terminalRevision: gear.terminalRevision,
        });
        await updateCompanyAggregateWithReceipt(
          transaction,
          previous.economy.lifecycle.revision,
          prepared.next.economy.lifecycle.revision,
          prepared.next,
          {
            command: prepared.command,
            receipt: {
              receiptId,
              commandId: requestDto.commandId,
              sourceKey,
              requestKey,
              response: accepted,
              resultingRevision: prepared.next.economy.lifecycle.revision,
            },
            auditEvents: [
              {
                eventId: `${requestDto.commandId}:hostile-loot-picked-up`,
                revision: prepared.next.economy.lifecycle.revision,
                event: {
                  schemaVersion: 1,
                  type: 'HostileLootPickedUp',
                  instanceId: profile.instanceId,
                  hostileId: hostile.entityId,
                  itemId: requestDto.itemId,
                  terminalSourceId: gear.terminalSourceId,
                  targetContainerId: requestDto.toContainerId,
                },
              },
            ],
          },
        );
        await updateHuntWorldRow(transaction, world, {
          revision: (BigInt(world.revision) + 1n).toString(),
          hostiles: world.hostiles.map((entry) =>
            entry.entityId === hostile.entityId ? nextHostile : entry,
          ),
        });
        return accepted;
      });
      return response;
    },
  );
}

function rejection(
  commandId: string,
  code: Exclude<HostileLootPickupResponseDto['code'], undefined>,
  publicRevision: string,
): HostileLootPickupResponseDto {
  return { schemaVersion: 1, commandId, ok: false, code, publicRevision };
}

function readExpectedCompanyId(rawHeaders: readonly string[]): string | undefined {
  let companyId: string | undefined;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() !== WORLD_EXPECTED_COMPANY_ID_HEADER) continue;
    const value = rawHeaders[index + 1];
    if (companyId !== undefined || !isEntityId(value)) return undefined;
    companyId = value;
  }
  return companyId;
}

function acceptedReceipt(
  value: unknown,
  commandId: string,
): HostileLootPickupResponseDto | undefined {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (value as Record<string, unknown>)['schemaVersion'] !== 1 ||
    (value as Record<string, unknown>)['commandId'] !== commandId ||
    (value as Record<string, unknown>)['ok'] !== true ||
    typeof (value as Record<string, unknown>)['receiptId'] !== 'string' ||
    typeof (value as Record<string, unknown>)['publicRevision'] !== 'string'
  )
    return undefined;
  return value as HostileLootPickupResponseDto;
}

async function hasVerifiedTerminal(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  instanceId: string,
  sourceId: string,
  terminalRevision: number,
): Promise<boolean> {
  return (
    (await lockVerifiedTerminal(transaction, worldId, instanceId, sourceId, terminalRevision)) !==
    undefined
  );
}

async function lockVerifiedTerminal(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  instanceId: string,
  sourceId: string,
  terminalRevision: number,
) {
  const match = /^encounter:([^:]+):terminal$/.exec(sourceId);
  if (!match || !isEntityId(match[1])) return undefined;
  const admission = await transaction
    .selectFrom('encounter_admissions')
    .select(['encounter_id', 'terminal_revision', 'effects_applied_at'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', instanceId)
    .where('encounter_id', '=', match[1])
    .forUpdate()
    .executeTakeFirst();
  if (
    !admission ||
    admission.terminal_revision !== terminalRevision ||
    admission.effects_applied_at === null
  )
    return undefined;
  const encounter = await transaction
    .selectFrom('encounters')
    .select(['status', 'revision'])
    .where('id', '=', admission.encounter_id)
    .forUpdate()
    .executeTakeFirst();
  return encounter?.status === 'resolved' && encounter.revision === terminalRevision
    ? admission
    : undefined;
}
