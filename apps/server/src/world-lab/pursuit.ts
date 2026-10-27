import { worldLabPursuitToken } from '@warwrit/protocol';
import { randomUUID } from 'node:crypto';
import type { Kysely, Transaction } from 'kysely';
import {
  PAINTED_ATLAS_REGION,
  buildNavigationField,
  canonicalJson,
  findTravelPath,
} from '@warwrit/game-core';
import type {
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldLabObservedGroupDto,
  WorldLabPursuitDto,
  WorldLabPursuitRequestDto,
} from '@warwrit/protocol';
import type { DatabaseSchema } from '../db/database.js';
import {
  executeContinuousMovement,
  MovementRejection,
  isWorldMovementId,
  isWorldMovementRevision,
} from '../world/continuous-movement.js';
import { readWorldRouteReceipt } from '../world/repository.js';
import { findOwnedCompanyId } from '../company/repository.js';
import { readWorldLabState } from './state.js';
import {
  clearWorldLabPursuit,
  readWorldLabPursuit,
  storeWorldLabPursuit,
} from './pursuit-store.js';
import type { WorldLabFixture } from './model.js';

interface PursuitContext {
  readonly database: Kysely<DatabaseSchema>;
  readonly worldId: string;
  readonly fixtures: readonly WorldLabFixture[];
  readonly now?: () => Date;
}
const field = buildNavigationField(PAINTED_ATLAS_REGION);
// Laboratory approach distance (~11m), not a combat/contact/admission rule.
const APPROACH_FP = 24;
const REPATH_FP = 16;
const point = (value: WorldLabPursuitDto['lastPoint']) => ({
  xFp: Math.round(Number(value.xMicroFp) / 65_536),
  zFp: Math.round(Number(value.zMicroFp) / 65_536),
});
const separation = (a: WorldLabPursuitDto['lastPoint'], b: WorldLabPursuitDto['lastPoint']) =>
  Math.hypot(Number(a.xMicroFp) - Number(b.xMicroFp), Number(a.zMicroFp) - Number(b.zMicroFp)) /
  65_536;

async function lockOwner(
  database: Transaction<DatabaseSchema>,
  context: PursuitContext,
  fixture: WorldLabFixture,
) {
  await database
    .selectFrom('identity_accounts')
    .select('id')
    .where('id', '=', fixture.accountId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  if (
    (await findOwnedCompanyId(database, context.worldId, fixture.accountId)) !== fixture.companyId
  )
    throw new MovementRejection('NOT_AUTHORIZED');
}

export function parseWorldLabPursuit(value: unknown): WorldLabPursuitRequestDto | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).length !== 5 ||
    body['schemaVersion'] !== 1 ||
    !isWorldMovementId(body['commandId']) ||
    !isWorldMovementId(body['targetGroupId']) ||
    !isWorldMovementRevision(body['expectedPublicRevision']) ||
    !isWorldMovementRevision(body['expectedMovementEpoch'])
  )
    return undefined;
  return body as unknown as WorldLabPursuitRequestDto;
}

function movementRequest(
  own: WorldFreeMovementV2ResponseDto,
  action: WorldFreeMovementV2RequestDto['action'],
  commandId = randomUUID(),
): WorldFreeMovementV2RequestDto {
  return {
    schemaVersion: 2,
    commandId,
    expectedPublicRevision: own.publicRevision,
    expectedMovementEpoch: own.movementEpoch,
    action,
  };
}
function toward(target: WorldLabPursuitDto['lastPoint']): WorldFreeMovementV2RequestDto['action'] {
  return {
    kind: 'MOVE_TO',
    mapEdition: PAINTED_ATLAS_REGION.mapEdition,
    target: { kind: 'TERRAIN', ...point(target) },
  };
}
function move(
  database: Kysely<DatabaseSchema>,
  context: PursuitContext,
  fixture: WorldLabFixture,
  input: WorldFreeMovementV2RequestDto,
  identity: unknown = input,
) {
  return executeContinuousMovement(
    database,
    context.worldId,
    fixture.accountId,
    fixture.companyId,
    input,
    PAINTED_ATLAS_REGION,
    context.now,
    identity,
  );
}

async function assertPursuitToken(
  database: Kysely<DatabaseSchema>,
  context: PursuitContext,
  fixture: WorldLabFixture,
  expected: unknown,
) {
  if (expected === undefined) return; // Compatibility with the original lab request shape.
  const current = await readWorldLabPursuit(database, context.worldId, fixture.companyId);
  if (expected !== worldLabPursuitToken(current?.orderId))
    throw new MovementRejection('STALE_MOVEMENT_EPOCH');
}

/** Same transaction and account lock as the mover: STOP/new orders beat an AI tick. */
export async function executeWorldLabGroundOrder(
  context: PursuitContext,
  fixture: WorldLabFixture,
  input: WorldFreeMovementV2RequestDto,
  expectedCompanyId: unknown,
  expectedPursuitToken?: unknown,
) {
  return context.database.transaction().execute(async (transaction) => {
    await lockOwner(transaction, context, fixture);
    const replay = await readWorldRouteReceipt(
      transaction,
      context.worldId,
      fixture.companyId,
      input.commandId,
    );
    if (!replay) await assertPursuitToken(transaction, context, fixture, expectedPursuitToken);
    const response = await executeContinuousMovement(
      transaction,
      context.worldId,
      fixture.accountId,
      expectedCompanyId,
      input,
      PAINTED_ATLAS_REGION,
      context.now,
    );
    if (!replay) await clearWorldLabPursuit(transaction, context.worldId, fixture.companyId);
    return response;
  });
}

/** Resolve a target only from this company's current lawful observation. */
export async function executeWorldLabPursuit(
  context: PursuitContext,
  fixture: WorldLabFixture,
  input: WorldLabPursuitRequestDto,
  expectedPursuitToken?: unknown,
) {
  return context.database.transaction().execute(async (transaction) => {
    await lockOwner(transaction, context, fixture);
    const identity = { kind: 'WORLD_LAB_PURSUIT', input };
    const replay = await readWorldRouteReceipt(
      transaction,
      context.worldId,
      fixture.companyId,
      input.commandId,
    );
    if (replay) {
      if (replay.account_id !== fixture.accountId || replay.request_key !== canonicalJson(identity))
        throw new MovementRejection('COMMAND_ID_CONFLICT');
      return replay.response as WorldFreeMovementV2ResponseDto;
    }
    await assertPursuitToken(transaction, context, fixture, expectedPursuitToken);
    const state = await readWorldLabState(
      transaction,
      context.worldId,
      context.fixtures,
      fixture.accountId,
      context.now,
    );
    const target = state?.groups.find(
      (group) => group.id === input.targetGroupId && group.pursuable,
    );
    if (!target) throw new RangeError('TARGET_NOT_VISIBLE');
    const response = await move(
      transaction,
      context,
      fixture,
      {
        schemaVersion: 2,
        commandId: input.commandId,
        expectedPublicRevision: input.expectedPublicRevision,
        expectedMovementEpoch: input.expectedMovementEpoch,
        action: toward(target.point),
      },
      identity,
    );
    await storeWorldLabPursuit(transaction, context.worldId, fixture.companyId, {
      orderId: randomUUID(),
      targetId: target.id,
      targetName: target.name,
      lastPoint: target.point,
      status: 'CHASING',
      movementEpoch: response.movementEpoch,
    });
    return response;
  });
}

function reached(own: WorldFreeMovementV2ResponseDto, target: WorldLabObservedGroupDto) {
  if (separation(own.point, target.point) > APPROACH_FP) return false;
  // A short straight-line distance across water is not physical arrival.
  const path = findTravelPath(field, point(own.point), point(target.point));
  if (!path) return false;
  const distance = path
    .slice(1)
    .reduce(
      (sum, p, index) => sum + Math.hypot(p.xFp - path[index]!.xFp, p.zFp - path[index]!.zFp),
      0,
    );
  return distance <= APPROACH_FP;
}

async function nextPursuitMovement(
  database: Kysely<DatabaseSchema>,
  context: PursuitContext,
  fixture: WorldLabFixture,
  own: WorldFreeMovementV2ResponseDto,
  pursuit: WorldLabPursuitDto,
  target: WorldLabObservedGroupDto | undefined,
): Promise<WorldLabPursuitDto> {
  if (!target) {
    const response = await move(
      database,
      context,
      fixture,
      movementRequest(own, toward(pursuit.lastPoint)),
    );
    return { ...pursuit, status: 'LAST_SEEN', movementEpoch: response.movementEpoch };
  }
  if (reached(own, target)) {
    const response = await move(database, context, fixture, movementRequest(own, { kind: 'STOP' }));
    return {
      ...pursuit,
      lastPoint: target.point,
      status: 'REACHED',
      movementEpoch: response.movementEpoch,
    };
  }
  if (own.plan && separation(own.plan.goal, target.point) < REPATH_FP)
    return { ...pursuit, lastPoint: target.point };
  const response = await move(
    database,
    context,
    fixture,
    movementRequest(own, toward(target.point)),
  );
  return { ...pursuit, lastPoint: target.point, movementEpoch: response.movementEpoch };
}

export async function stepWorldLabPursuit(context: PursuitContext, fixture: WorldLabFixture) {
  return context.database.transaction().execute(async (transaction) => {
    await lockOwner(transaction, context, fixture);
    const pursuit = await readWorldLabPursuit(transaction, context.worldId, fixture.companyId);
    if (!pursuit || pursuit.status !== 'CHASING') return;
    const state = await readWorldLabState(
      transaction,
      context.worldId,
      context.fixtures,
      fixture.accountId,
      context.now,
    );
    if (!state) return;
    const target = state.groups.find((group) => group.id === pursuit.targetId && group.pursuable);
    let next: WorldLabPursuitDto;
    try {
      next = await nextPursuitMovement(
        transaction,
        context,
        fixture,
        state.own.movement,
        pursuit,
        target,
      );
    } catch (error) {
      if (!(error instanceof RangeError || error instanceof MovementRejection)) throw error;
      const response = await move(
        transaction,
        context,
        fixture,
        movementRequest(state.own.movement, { kind: 'STOP' }),
      );
      next = { ...pursuit, status: 'BLOCKED', movementEpoch: response.movementEpoch };
    }
    await storeWorldLabPursuit(transaction, context.worldId, fixture.companyId, next);
  });
}

export function startWorldLabPursuitWorker(
  context: PursuitContext,
  onError: (error: unknown) => void,
) {
  let stopped = false;
  let active: Promise<void> | undefined;
  const run = () => {
    if (stopped || active) return;
    active = (async () => {
      for (const fixture of context.fixtures) {
        if (stopped) return;
        await stepWorldLabPursuit(context, fixture);
      }
    })()
      .catch(onError)
      .finally(() => {
        active = undefined;
      });
  };
  const timer = setInterval(run, 1_000);
  timer.unref();
  run();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await active;
  };
}
