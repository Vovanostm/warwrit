import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { sql, type Kysely } from 'kysely';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  SUPPLY_INITIAL_RATIONS,
  canonicalJson,
  campaignTick,
  companySourceKey,
  isEntityId,
  isExactInteger,
  materializeCompanyPhysicalState,
  parseCompanyCommand,
  prepareCompanyEconomy,
  prepareEquipmentSale,
  equipmentSaleQuote,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  CompanyCommand,
  CompanyCombatAggregateState,
  SettlementSupplies,
} from '@warwrit/game-core';
import type {
  EquipmentMarketDto,
  EquipmentSaleRequestDto,
  EquipmentSaleResponseDto,
} from '@warwrit/protocol';
import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import { readPartyRoute } from '../world/repository.js';
import {
  prepareDueContinuousMovement,
  persistDueContinuousMovementRoute,
} from '../world/continuous-movement.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  readCompanyCommandReceipt,
  readCompanySourceReceipt,
  updateCompanyAggregateWithReceipt,
} from './repository.js';
import { prepareStationaryFoodFacts } from './travel-food.js';
import { readCarriedSupplyPurse } from './supplies.js';
import { prepareCourseAdvance, prepareCourseInterruption } from './courses.js';

export interface EquipmentMarketRoutesOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly worldId: string;
}

const SITE_ID = 'kamenny-brod';

export function registerEquipmentMarketRoutes(
  app: FastifyInstance,
  { database, worldId }: EquipmentMarketRoutesOptions,
): void {
  app.get<{ Params: { siteId: string } }>(
    '/company/equipment-market/:siteId',
    async (request, reply) => {
      const accountId = await resolveSessionAccount(request, database);
      if (!accountId) return reply.code(401).send({ error: 'authentication required' });
      if (request.params.siteId !== SITE_ID)
        return reply.code(404).send({ error: 'no equipment market here' });
      const result = await database.transaction().execute(async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId))) return null;
        const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
        if (!companyId) return null;
        const state = await lockCompanyAggregate(transaction, worldId, companyId);
        if (!state) throw new Error('Owned company snapshot is unavailable');
        const expectedCompanyId = readExpectedCompanyId(request.raw.rawHeaders);
        if (expectedCompanyId !== undefined && expectedCompanyId !== companyId)
          return 'UNAVAILABLE' as const;
        const economy = state.economy;
        const party =
          economy.lifecycle.parties.length === 1 ? economy.lifecycle.parties[0] : undefined;
        if (
          economy.lifecycle.company?.runStatus !== 'ACTIVE' ||
          party?.location.kind !== 'AT' ||
          party.location.siteId !== SITE_ID ||
          economy.lifecycle.characters.some((person) => person.presence.encounterBindingId !== null)
        )
          return 'UNAVAILABLE' as const;
        await transaction
          .insertInto('settlement_supplies')
          .values({
            world_id: worldId,
            site_id: SITE_ID,
            revision: '0',
            rations: SUPPLY_INITIAL_RATIONS,
            cash_q: '0',
          })
          .onConflict((conflict) => conflict.columns(['world_id', 'site_id']).doNothing())
          .execute();
        const row = await transaction
          .selectFrom('settlement_supplies')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('site_id', '=', SITE_ID)
          .forUpdate()
          .executeTakeFirstOrThrow();
        const shop: SettlementSupplies = {
          worldId,
          siteId: SITE_ID,
          revision: String(row.revision),
          rations: row.rations,
          cashQ: String(row.cash_q),
        };
        const carriedPurse = await readCarriedSupplyPurse(
          transaction,
          worldId,
          companyId,
          accountId,
        );
        const root = materializeCompanyPhysicalState(economy);
        const items = [];
        for (const item of root.physical.items) {
          if (
            item.tombstone !== null ||
            item.owner.kind !== 'COMPANY' ||
            item.owner.id !== companyId ||
            equipmentSaleQuote(item.definitionId) === undefined
          )
            continue;
          const command = quoteCommand(state, companyId, item.itemId, shop.revision);
          const candidate = prepareEquipmentSale(root, command, shop, carriedPurse);
          const equippedByName = item.equipped
            ? state.economy.lifecycle.knowledge.characters.find(
                (person) => person.identity.characterId === item.equipped?.characterId,
              )?.identity.birthName
            : undefined;
          const interruptsLearning = state.learning.tasks.tasks.some(
            (task) =>
              !task.stop &&
              !task.terminal &&
              task.start.command.payload.resourceIds.includes(item.itemId),
          );
          if (candidate.kind === 'PREPARED')
            items.push({
              itemId: item.itemId,
              definitionId: item.definitionId,
              priceQ: candidate.priceQ,
              currentCondition: item.currentCondition,
              maximumCondition: item.maximumCondition,
              equipped: item.equipped !== null,
              ...(equippedByName === undefined ? {} : { equippedByName }),
              interruptsLearning,
              canSell: true,
              refusal: null,
            });
          else if (candidate.code === 'INSUFFICIENT_FUNDS')
            items.push({
              itemId: item.itemId,
              definitionId: item.definitionId,
              priceQ: equipmentSaleQuote(item.definitionId)!,
              currentCondition: item.currentCondition,
              maximumCondition: item.maximumCondition,
              equipped: item.equipped !== null,
              ...(equippedByName === undefined ? {} : { equippedByName }),
              interruptsLearning,
              canSell: false,
              refusal: 'INSUFFICIENT_FUNDS' as const,
            });
        }
        return {
          publicRevision: state.economy.lifecycle.knowledge.revision,
          siteId: SITE_ID,
          revision: String(row.revision),
          merchantCashQ: String(row.cash_q),
          items,
        } satisfies EquipmentMarketDto;
      });
      if (result === 'UNAVAILABLE')
        return reply.code(409).send({ error: 'local equipment market access required' });
      return result === null ? reply.code(403).send({ error: 'company required' }) : result;
    },
  );

  app.post<{ Params: { siteId: string } }>(
    '/company/equipment-market/:siteId/sell',
    async (request, reply) => {
      const accountId = await resolveSessionAccount(request, database);
      if (!accountId) return reply.code(401).send({ error: 'authentication required' });
      const requestDto = parseEquipmentSaleRequest(request.body);
      if (!requestDto)
        return reply.code(400).send(reject(commandIdFrom(request.body), 'INVALID_COMMAND', '0'));
      const companyIdHeader = readExpectedCompanyId(request.raw.rawHeaders);
      const requestKey = canonicalJson([request.params.siteId, requestDto]);
      const result = await database.transaction().execute(async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId)))
          return reject(requestDto.commandId, 'NOT_AUTHORIZED', '0');
        const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
        if (!companyId || companyIdHeader !== companyId)
          return reject(requestDto.commandId, 'NOT_AUTHORIZED', '0');

        const byCommand = await readCompanyCommandReceipt(
          transaction,
          worldId,
          companyId,
          requestDto.commandId,
        );
        if (byCommand) {
          if (byCommand.requestKey !== requestKey)
            return reject(requestDto.commandId, 'IDEMPOTENCY_CONFLICT', '0');
          return (
            acceptedReceipt(byCommand.response, requestDto.commandId) ??
            reject(requestDto.commandId, 'INVALID_COMMAND', '0')
          );
        }
        const sourceKey = canonicalJson(['SellItem', requestDto.itemId]);
        const bySource = await readCompanySourceReceipt(transaction, worldId, companyId, sourceKey);
        if (bySource)
          return reject(requestDto.commandId, 'IDEMPOTENCY_CONFLICT', bySource.resultingRevision);

        const previous = await lockCompanyAggregate(transaction, worldId, companyId);
        if (!previous) throw new Error('Owned company snapshot is unavailable');
        const previousLifecycle = previous.economy.lifecycle;
        if (requestDto.expectedRevision !== previousLifecycle.knowledge.revision)
          return reject(
            requestDto.commandId,
            'STALE_REVISION',
            previousLifecycle.knowledge.revision,
          );
        if (request.params.siteId !== SITE_ID)
          return reject(
            requestDto.commandId,
            'CONTACT_OR_ACCESS_REQUIRED',
            previousLifecycle.knowledge.revision,
          );

        const clock = await readWorldClock(transaction, worldId, new Date(), true);
        const partyId =
          previousLifecycle.parties.length === 1
            ? previousLifecycle.parties[0]?.partyId
            : undefined;
        const route = partyId
          ? await readPartyRoute(transaction, worldId, companyId, partyId, true)
          : undefined;
        const due = prepareDueContinuousMovement(previous, route, clock, randomUUID());
        let state = due.state;
        const lifecycle = state.economy.lifecycle;
        if (
          state.encounter.active !== null ||
          lifecycle.parties.length !== 1 ||
          lifecycle.parties[0]?.location.kind !== 'AT' ||
          lifecycle.parties[0].location.siteId !== SITE_ID ||
          lifecycle.company?.runStatus !== 'ACTIVE'
        )
          return reject(
            requestDto.commandId,
            'CONTACT_OR_ACCESS_REQUIRED',
            previousLifecycle.knowledge.revision,
          );
        const food = prepareStationaryFoodFacts(state, clock.tick, requestDto.commandId);
        if (food.kind !== 'PREPARED')
          return reject(
            requestDto.commandId,
            food.reason === 'INSUFFICIENT_ITEMS' ? 'INSUFFICIENT_ITEMS' : 'UNSUPPORTED_ACTION',
            previousLifecycle.knowledge.revision,
          );
        let courseAdvanceEvents: readonly Readonly<object>[] = [];
        if (BigInt(clock.tick) > BigInt(lifecycle.campaignTick)) {
          const advance = parseCompanyCommand({
            schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
            commandId: randomUUID(),
            sourceEventId: randomUUID(),
            worldId,
            companyId,
            actorRef: { kind: 'SYSTEM', id: 'equipment-sale-clock' },
            expectedRevision: lifecycle.revision,
            campaignTick: clock.tick,
            rulesetId: COMPANY_RULESET_ID,
            type: 'AdvanceCampaign',
            payload: { toTick: clock.tick, authoritativeInputs: [] },
          });
          if (!advance.ok || advance.command.type !== 'AdvanceCampaign')
            return reject(
              requestDto.commandId,
              'INVALID_COMMAND',
              previousLifecycle.knowledge.revision,
            );
          const courseAdvance = prepareCourseAdvance({
            state,
            command: advance.command,
            physicalFacts: food.facts,
          });
          if (courseAdvance.kind === 'PREPARED') {
            state = courseAdvance.next;
            courseAdvanceEvents = courseAdvance.events;
          } else {
            const activeTasks = state.learning.tasks.tasks.filter(
              (task) => !task.stop && !task.terminal,
            );
            if (activeTasks.length > 0)
              return reject(
                requestDto.commandId,
                'UNSUPPORTED_ACTION',
                previousLifecycle.knowledge.revision,
              );
            const timed = prepareCompanyEconomy(state.economy, advance.command, {
              worldId,
              companyId,
              principal: { kind: 'SYSTEM', id: 'equipment-sale-clock' },
              publicRevision: lifecycle.knowledge.revision,
              canonicalRevision: lifecycle.revision,
              atTick: campaignTick(clock.tick),
              internalGrant: {
                commandId: advance.command.commandId,
                sourceEventId: advance.command.sourceEventId!,
                canonicalRequest: canonicalJson(advance.command),
              },
              completeGraph: true,
              contactIds: [],
              facts: [],
              financeFacts: [],
              physicalFacts: food.facts,
              practiceFacts: [],
            });
            if (
              timed.kind !== 'PREPARED' ||
              timed.replayed ||
              timed.receipt.requirements.length !== 0 ||
              !timed.next.physical
            )
              return reject(
                requestDto.commandId,
                'UNSUPPORTED_ACTION',
                previousLifecycle.knowledge.revision,
              );
            state = readCompanyCombatAggregateState({ ...state, economy: timed.next });
          }
        }

        const currentLifecycle = state.economy.lifecycle;
        const commandResult = parseCompanyCommand({
          schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
          commandId: requestDto.commandId,
          worldId,
          companyId,
          actorRef: { kind: 'PLAYER', id: accountId },
          expectedRevision: requestDto.expectedRevision,
          campaignTick: clock.tick,
          rulesetId: COMPANY_RULESET_ID,
          type: 'SellItem',
          payload: {
            siteId: SITE_ID,
            itemId: requestDto.itemId,
            shopRevision: requestDto.shopRevision,
          },
        });
        if (!commandResult.ok || commandResult.command.type !== 'SellItem')
          return reject(
            requestDto.commandId,
            'INVALID_COMMAND',
            currentLifecycle.knowledge.revision,
          );
        const shopRow = await transaction
          .selectFrom('settlement_supplies')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('site_id', '=', SITE_ID)
          .forUpdate()
          .executeTakeFirst();
        const shop: SettlementSupplies = {
          worldId,
          siteId: SITE_ID,
          revision: shopRow ? String(shopRow.revision) : '0',
          rations: shopRow?.rations ?? SUPPLY_INITIAL_RATIONS,
          cashQ: shopRow ? String(shopRow.cash_q) : '0',
        };
        const carriedPurse = await readCarriedSupplyPurse(
          transaction,
          worldId,
          companyId,
          accountId,
        );
        const root = materializeCompanyPhysicalState(state.economy);
        const sale = prepareEquipmentSale(root, commandResult.command, shop, carriedPurse);
        if (sale.kind !== 'PREPARED')
          return reject(
            requestDto.commandId,
            mapSaleRejection(sale.code),
            currentLifecycle.knowledge.revision,
          );
        const existingTraderItem = await sql<{ readonly present: boolean }>`
          select exists (
            select 1 from settlement_equipment where world_id = ${worldId} and item_id = ${sale.sold.itemId}
          ) as present
        `.execute(transaction);
        if (existingTraderItem.rows[0]?.present)
          return reject(
            requestDto.commandId,
            'IDEMPOTENCY_CONFLICT',
            currentLifecycle.knowledge.revision,
          );

        const postSale = readCompanyCombatAggregateState({ ...state, economy: sale.next });
        const interruptedTask = postSale.learning.tasks.tasks.find(
          (task) =>
            !task.stop &&
            !task.terminal &&
            task.start.command.payload.resourceIds.includes(requestDto.itemId),
        );
        let next = postSale;
        let courseInterruptionEvents: readonly Readonly<object>[] = [];
        if (interruptedTask) {
          const interruption = prepareCourseInterruption({
            state: postSale,
            commandId: randomUUID(),
            sourceEventId: randomUUID(),
            atTick: clock.tick,
            reason: 'PREREQUISITES',
            physicalFacts: food.facts,
          });
          if (interruption.kind !== 'PREPARED')
            return reject(
              requestDto.commandId,
              'UNSUPPORTED_ACTION',
              currentLifecycle.knowledge.revision,
            );
          next = interruption.next;
          courseInterruptionEvents = interruption.events;
        }
        const response: EquipmentSaleResponseDto = {
          commandId: requestDto.commandId,
          ok: true,
          publicRevision: next.economy.lifecycle.knowledge.revision,
        };
        const auditEvents = [
          ...due.events.map((event) => ({ eventId: randomUUID(), event })),
          ...courseAdvanceEvents.map((event, index) => ({
            eventId: `${requestDto.commandId}:course-advance:${index}`,
            event,
          })),
          ...courseInterruptionEvents.map((event, index) => ({
            eventId: `${requestDto.commandId}:course-interruption:${index}`,
            event,
          })),
          {
            eventId: `${requestDto.commandId}:equipment-sale`,
            event: {
              type: 'EquipmentSold',
              itemId: sale.sold.itemId,
              definitionId: sale.sold.definitionId,
              priceQ: sale.priceQ,
              merchantRevision: sale.shop.revision,
            },
          },
        ];
        await updateCompanyAggregateWithReceipt(
          transaction,
          previousLifecycle.revision,
          next.economy.lifecycle.revision,
          next,
          {
            command: commandResult.command,
            receipt: {
              receiptId: randomUUID(),
              commandId: requestDto.commandId,
              sourceKey: companySourceKey(commandResult.command),
              requestKey,
              response,
              resultingRevision: next.economy.lifecycle.revision,
            },
            auditEvents: auditEvents.map((entry) => ({
              ...entry,
              revision: next.economy.lifecycle.revision,
            })),
          },
        );
        if (!shopRow) throw new Error('Cannot sell against an uninitialized merchant balance');
        const updatedShop = await transaction
          .updateTable('settlement_supplies')
          .set({ revision: sale.shop.revision, cash_q: sale.shop.cashQ })
          .where('world_id', '=', worldId)
          .where('site_id', '=', SITE_ID)
          .where('revision', '=', shopRow.revision)
          .executeTakeFirst();
        if (Number(updatedShop.numUpdatedRows) !== 1)
          throw new Error('Merchant balance changed before sale');
        await sql`
          insert into settlement_equipment (
            world_id, item_id, site_id, owner_kind, owner_id, source_id,
            acquired_by_company_id, item
          ) values (
            ${worldId}, ${sale.sold.itemId}, ${SITE_ID}, ${sale.sold.owner.kind},
            ${sale.sold.owner.id}, ${sale.sold.provenance.sourceId}, ${companyId},
            ${JSON.stringify(sale.sold)}::jsonb
          )
        `.execute(transaction);
        if (due.changed) await persistDueContinuousMovementRoute(transaction, due);
        return response;
      });
      return reply
        .code(result.ok ? 200 : result.code === 'NOT_AUTHORIZED' ? 403 : 409)
        .send(result);
    },
  );
}

function parseEquipmentSaleRequest(value: unknown): EquipmentSaleRequestDto | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (
    canonicalJson(Object.keys(input).sort()) !==
      canonicalJson(['commandId', 'expectedRevision', 'itemId', 'schemaVersion', 'shopRevision']) ||
    input['schemaVersion'] !== 1 ||
    !isEntityId(input['commandId']) ||
    !isEntityId(input['itemId']) ||
    !isExactInteger(input['expectedRevision']) ||
    !isExactInteger(input['shopRevision'])
  )
    return undefined;
  return input as unknown as EquipmentSaleRequestDto;
}

function quoteCommand(
  state: CompanyCombatAggregateState,
  companyId: string,
  itemId: string,
  revision: string,
): Extract<CompanyCommand, { type: 'SellItem' }> {
  return {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: `equipment-quote-${createHash('sha256').update(itemId).digest('hex').slice(0, 32)}`,
    worldId: state.economy.lifecycle.worldId,
    companyId,
    actorRef: { kind: 'PLAYER', id: 'equipment-market-quote' },
    expectedRevision: state.economy.lifecycle.knowledge.revision,
    campaignTick: state.economy.lifecycle.campaignTick,
    rulesetId: COMPANY_RULESET_ID,
    type: 'SellItem',
    payload: { siteId: SITE_ID, itemId, shopRevision: revision },
  };
}

function readExpectedCompanyId(rawHeaders: readonly string[]): string | undefined {
  let expected: string | undefined;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() !== 'x-warwrit-expected-company-id') continue;
    if (expected !== undefined || !isEntityId(rawHeaders[index + 1])) return undefined;
    expected = rawHeaders[index + 1];
  }
  return expected;
}

function commandIdFrom(value: unknown): string {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)['commandId'] === 'string'
    ? String((value as Record<string, unknown>)['commandId'])
    : 'unknown';
}

function reject(
  commandId: string,
  code: Extract<EquipmentSaleResponseDto, { ok: false }>['code'],
  publicRevision: string,
): Extract<EquipmentSaleResponseDto, { ok: false }> {
  return { commandId, ok: false, publicRevision, code };
}

function acceptedReceipt(value: unknown, commandId: string): EquipmentSaleResponseDto | undefined {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>)['commandId'] === commandId &&
    (value as Record<string, unknown>)['ok'] === true &&
    typeof (value as Record<string, unknown>)['publicRevision'] === 'string'
  )
    return value as EquipmentSaleResponseDto;
  return undefined;
}

function mapSaleRejection(
  code: Extract<ReturnType<typeof prepareEquipmentSale>, { kind: 'REJECTED' }>['code'],
): Extract<EquipmentSaleResponseDto, { ok: false }>['code'] {
  switch (code) {
    case 'CONTACT_OR_ACCESS_REQUIRED':
    case 'STALE_REVISION':
    case 'INSUFFICIENT_FUNDS':
    case 'IDEMPOTENCY_CONFLICT':
      return code;
    case 'INCOMPATIBLE_ACTIVITY':
      return 'UNSUPPORTED_ACTION';
    case 'ITEM_NOT_OWNED':
    case 'INVALID_ITEM':
      return 'CONTACT_OR_ACCESS_REQUIRED';
    case 'UNSALEABLE_ITEM':
      return 'UNSALEABLE_ITEM';
    case 'INVALID_STATE':
      return 'INVALID_COMMAND';
  }
}
