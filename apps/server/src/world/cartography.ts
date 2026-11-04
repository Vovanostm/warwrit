import { canonicalJson, PAINTED_ATLAS_REGION } from '@warwrit/game-core';
import type {
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldLabCartographyDto,
} from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Transaction } from 'kysely';
import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import type { CompanyRoutesOptions } from '../company/routes.js';
import {
  findOwnedCompanyId,
  loadCompanyAggregate,
  readCompanyCommandReceipt,
} from '../company/repository.js';
import { readDangerousRouteMembership } from '../contracts/repository.js';
import {
  cartographyKnowsTarget,
  cartographyKnowsSegment,
  readWorldLabCartography,
} from '../world-lab/cartography.js';
import { renderCartographyTile } from '../world-lab/cartography-raster.js';
import {
  executeContinuousMovement,
  MovementRejection,
  readContinuousMovementProjection,
} from './continuous-movement.js';
import { readWorldClock } from './clock.js';
import { readWorldRouteReceipt } from './repository.js';
import { PAINTED_GAME_WORLD_ID } from './map-context.js';

/** Ordinary authentication supplies these IDs; no laboratory session or fixture identity is involved. */
export async function readPaintedCartography(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  accountId: string,
  expectedCompanyId?: unknown,
) {
  if (worldId !== PAINTED_GAME_WORLD_ID) throw new MovementRejection('MAP_EDITION_MISMATCH');
  await transaction
    .selectFrom('identity_accounts')
    .select('id')
    .where('id', '=', accountId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
  if (!companyId || (expectedCompanyId !== undefined && companyId !== expectedCompanyId))
    throw new MovementRejection('NOT_AUTHORIZED');
  const state = await loadCompanyAggregate(transaction, worldId, companyId);
  const partyId = state?.economy.lifecycle.parties[0]?.partyId;
  if (!partyId) throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  const { movement } = await readContinuousMovementProjection(
    transaction,
    worldId,
    companyId,
    PAINTED_ATLAS_REGION,
  );
  const clock = await readWorldClock(transaction, worldId, new Date(Number(movement.serverTimeMs)));
  const cartography = await readWorldLabCartography(
    transaction,
    worldId,
    { companyId, partyId },
    movement,
    clock,
  );
  return {
    companyId,
    cartography: { ...cartography, mapEdition: PAINTED_ATLAS_REGION.mapEdition },
  };
}

function assertKnownPlan(
  cartography: WorldLabCartographyDto,
  response: WorldFreeMovementV2ResponseDto,
) {
  if (
    response.plan?.speedSpans.some(
      (span) => !cartographyKnowsSegment(cartography, span.from, span.to),
    )
  )
    throw new MovementRejection('MAP_INFORMATION_REQUIRED');
}
function assertKnownTarget(
  cartography: WorldLabCartographyDto,
  input: WorldFreeMovementV2RequestDto,
) {
  if (input.action.kind !== 'MOVE_TO') return;
  if (!cartographyKnowsTarget(cartography, input.action.target))
    throw new MovementRejection('MAP_INFORMATION_REQUIRED');
}

async function assertPaintedTargetAccess(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  input: WorldFreeMovementV2RequestDto,
  cartography: WorldLabCartographyDto,
) {
  assertKnownTarget(cartography, input);
  // Coordinate targets resolve to named sites on arrival too; apply the same entry authority.
  const target = input.action.kind === 'MOVE_TO' ? input.action.target : undefined;
  const targetSiteId =
    target?.kind === 'SITE'
      ? target.siteId
      : target?.kind === 'TERRAIN'
        ? PAINTED_ATLAS_REGION.sites.find(
            (site) => site.anchorFp.xFp === target.xFp && site.anchorFp.zFp === target.zFp,
          )?.siteId
        : undefined;
  if (targetSiteId === 'staraya-melnitsa') {
    const membership = await readDangerousRouteMembership(transaction, worldId, companyId);
    if (!membership) throw new MovementRejection('ROUTE_FORBIDDEN');
  }
}

/** Keep exact replay ahead of knowledge/preparation; rejected private detours roll back the entire draft. */
export async function executePaintedMovement(
  options: CompanyRoutesOptions,
  accountId: string,
  expectedCompanyId: unknown,
  input: WorldFreeMovementV2RequestDto,
) {
  return options.database.transaction().execute(async (transaction) => {
    await transaction
      .selectFrom('identity_accounts')
      .select('id')
      .where('id', '=', accountId)
      .forUpdate()
      .executeTakeFirstOrThrow();
    const companyId = await findOwnedCompanyId(transaction, options.worldId, accountId);
    if (!companyId || companyId !== expectedCompanyId)
      throw new MovementRejection('NOT_AUTHORIZED');
    const replay = await readWorldRouteReceipt(
      transaction,
      options.worldId,
      companyId,
      input.commandId,
    );
    if (replay) {
      if (replay.account_id !== accountId) throw new MovementRejection('NOT_AUTHORIZED');
      if (replay.request_key !== canonicalJson(input))
        throw new MovementRejection('COMMAND_ID_CONFLICT');
      return replay.response as WorldFreeMovementV2ResponseDto;
    }
    if (await readCompanyCommandReceipt(transaction, options.worldId, companyId, input.commandId))
      throw new MovementRejection('COMMAND_ID_CONFLICT');
    const { cartography } = await readPaintedCartography(
      transaction,
      options.worldId,
      accountId,
      companyId,
    );
    await assertPaintedTargetAccess(transaction, options.worldId, companyId, input, cartography);
    try {
      const response = await executeContinuousMovement(
        transaction,
        options.worldId,
        accountId,
        companyId,
        input,
        PAINTED_ATLAS_REGION,
      );
      if (input.action.kind === 'MOVE_TO') assertKnownPlan(cartography, response);
      return response;
    } catch (error) {
      if (
        input.action.kind === 'MOVE_TO' &&
        error instanceof MovementRejection &&
        ['NO_PATH', 'TARGET_BLOCKED', 'OUT_OF_BOUNDS', 'ROUTE_TOO_COMPLEX'].includes(error.code)
      )
        throw new MovementRejection('MAP_INFORMATION_REQUIRED');
      throw error;
    }
  });
}

export function registerPaintedCartographyRoutes(
  app: FastifyInstance,
  options: CompanyRoutesOptions,
) {
  app.get<{ Params: { revision: string; x: string; y: string } }>(
    '/world/cartography/tiles/:revision/:x/:y.png',
    async (request, reply) => {
      const accountId = await resolveSessionAccount(request, options.database);
      if (!accountId) return reply.code(401).send();
      const expectedCompanyId = request.headers[WORLD_EXPECTED_COMPANY_ID_HEADER];
      if (typeof expectedCompanyId !== 'string') return reply.code(403).send();
      if (!/^\d+$/u.test(request.params.x) || !/^\d+$/u.test(request.params.y))
        return reply.code(404).send();
      try {
        const result = await options.database.transaction().execute(async (transaction) => {
          const { cartography } = await readPaintedCartography(
            transaction,
            options.worldId,
            accountId,
            expectedCompanyId,
          );
          if (request.params.revision !== cartography.revision) return { stale: true as const };
          const charted = Buffer.from(cartography.charted, 'base64');
          const explored = Buffer.from(cartography.explored, 'base64');
          const knownBits = charted.map((value, index) => value | explored[index]!);
          const bytes = await renderCartographyTile({
            tileX: Number(request.params.x),
            tileY: Number(request.params.y),
            tileSize: cartography.imageTileSize,
            sheet: cartography.sheet,
            grid: cartography.grid,
            knownBits,
          });
          return { bytes };
        });
        if ('stale' in result)
          return reply.code(409).header('Cache-Control', 'private, no-store').send();
        if (!result.bytes) return reply.code(404).send();
        return reply
          .header('Cache-Control', 'private, no-store')
          .header('X-Content-Type-Options', 'nosniff')
          .type('image/png')
          .send(result.bytes);
      } catch (error) {
        if (error instanceof MovementRejection) return reply.code(403).send();
        if (error instanceof RangeError) return reply.code(404).send();
        throw error;
      }
    },
  );
}
