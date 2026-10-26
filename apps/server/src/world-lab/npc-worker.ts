import {
  PAINTED_ATLAS_REGION,
  buildNavigationField,
  compileMovementPlan,
  findTravelPath,
  positionAt,
} from '@warwrit/game-core';
import type { ContinuousMovementPlan, PointFp, PointMicroFp } from '@warwrit/game-core';
import type { Kysely } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock, readWorldLight } from '../world/clock.js';
import {
  readWorldLabNpcGroups,
  updateWorldLabNpcGroup,
  type WorldLabNpcGroup,
} from './npc-store.js';

const field = buildNavigationField(PAINTED_ATLAS_REGION);
const DECISION_INTERVAL_MS = 1_000;
const DWELL_MS = 4_000;
const RETRY_MS = 3_000;

interface NpcState extends Record<string, unknown> {
  readonly schemaVersion: 1;
  readonly name: string;
  readonly point: PointFp;
  readonly plan: ContinuousMovementPlan | null;
  readonly routeIndex: number;
  readonly movementEpoch: string;
}

function readState(group: WorldLabNpcGroup): NpcState {
  const value = group.state;
  const point = value['point'];
  if (
    value['schemaVersion'] !== 1 ||
    typeof value['name'] !== 'string' ||
    point === null ||
    typeof point !== 'object' ||
    !Number.isSafeInteger((point as PointFp).xFp) ||
    !Number.isSafeInteger((point as PointFp).zFp) ||
    (value['plan'] !== null && typeof value['plan'] !== 'object') ||
    !Number.isSafeInteger(value['routeIndex']) ||
    (value['routeIndex'] as number) < 0 ||
    typeof value['movementEpoch'] !== 'string' ||
    !/^(0|[1-9]\d*)$/.test(value['movementEpoch'])
  )
    throw new TypeError(`Invalid saved world lab NPC state: ${group.groupId}`);
  return value as NpcState;
}

function readRoute(group: WorldLabNpcGroup): readonly PointFp[] {
  const route = group.home['routePoints'];
  if (
    !Array.isArray(route) ||
    route.length < 2 ||
    route.some(
      (point) =>
        point === null ||
        typeof point !== 'object' ||
        !Number.isSafeInteger((point as PointFp).xFp) ||
        !Number.isSafeInteger((point as PointFp).zFp),
    )
  )
    throw new TypeError(`Invalid saved world lab NPC route: ${group.groupId}`);
  return route as readonly PointFp[];
}

function projectedPoint(state: NpcState, nowMs: string): PointFp {
  if (state.plan === null) return state.point;
  const point = positionAt(state.plan, nowMs) as PointMicroFp;
  return {
    xFp: Math.round(Number(point.xMicroFp) / 65_536),
    zFp: Math.round(Number(point.zMicroFp) / 65_536),
  };
}

export function worldLabNpcObservation(
  group: WorldLabNpcGroup,
  nowMs: string,
): {
  readonly id: string;
  readonly kind: WorldLabNpcGroup['kind'];
  readonly name: string;
  readonly point: PointMicroFp;
  readonly state: 'MOVING' | 'IDLE';
  readonly observedAtMs: string;
  readonly movementEpoch: string;
} {
  const state = readState(group);
  const point = state.plan ? (positionAt(state.plan, nowMs) as PointMicroFp) : undefined;
  const location = point ?? {
    xMicroFp: String(state.point.xFp * 65_536),
    zMicroFp: String(state.point.zFp * 65_536),
  };
  return {
    id: group.groupId,
    kind: group.kind,
    name: state.name,
    point: location,
    state: state.plan ? 'MOVING' : 'IDLE',
    observedAtMs: nowMs,
    movementEpoch: state.movementEpoch,
  };
}

function planFor(group: WorldLabNpcGroup, state: NpcState, destination: PointFp, nowMs: string) {
  const path = findTravelPath(field, state.point, destination);
  if (!path || path.length < 2) return undefined;
  return compileMovementPlan({
    field,
    path,
    startedAtMs: nowMs,
    movementEpoch: (BigInt(state.movementEpoch) + 1n).toString(),
    planId: `${group.groupId}.${(BigInt(group.revision) + 1n).toString()}`,
  });
}

function dueNpcState(
  group: WorldLabNpcGroup,
  nowMs: string,
  isNight: boolean,
  phaseRemainingMs: string,
): { readonly state: NpcState; readonly nextDecisionMs: string } | undefined {
  const prior = readState(group);
  const route = readRoute(group);
  const nextIndex = (prior.routeIndex + 1) % route.length;
  if (prior.plan !== null) {
    if (BigInt(prior.plan.arrivesAtMs) > BigInt(nowMs)) return undefined;
    const arrived = projectedPoint(prior, prior.plan.arrivesAtMs);
    return {
      state: {
        ...prior,
        point: arrived,
        plan: null,
        routeIndex: nextIndex,
        movementEpoch: (BigInt(prior.movementEpoch) + 1n).toString(),
      },
      nextDecisionMs: (BigInt(nowMs) + BigInt(DWELL_MS)).toString(),
    };
  }

  if (group.kind === 'CREATURE' && group.home['activeAtNight'] === true && !isNight) {
    return {
      state: prior,
      nextDecisionMs: (BigInt(nowMs) + BigInt(phaseRemainingMs)).toString(),
    };
  }

  const destination = route[prior.routeIndex % route.length]!;
  const plan = planFor(group, prior, destination, nowMs);
  if (!plan) return { state: prior, nextDecisionMs: (BigInt(nowMs) + BigInt(RETRY_MS)).toString() };
  return {
    state: {
      ...prior,
      plan,
      movementEpoch: (BigInt(prior.movementEpoch) + 1n).toString(),
    },
    nextDecisionMs: plan.arrivesAtMs,
  };
}

export function startWorldLabNpcWorker(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  onError: (error: unknown) => void,
  now: () => Date = () => new Date(),
): () => Promise<void> {
  let stopped = false;
  let active: Promise<void> | undefined;
  const run = (): void => {
    if (stopped || active) return;
    active = database
      .transaction()
      .execute(async (transaction) => {
        const clock = await readWorldClock(transaction, worldId, now());
        const light = readWorldLight(clock);
        const remaining = (BigInt(light.phaseMs) - BigInt(light.msIntoPhase)).toString();
        const groups = await readWorldLabNpcGroups(transaction, worldId);
        for (const group of groups) {
          if (stopped) return;
          if (BigInt(group.nextDecisionMs) > BigInt(clock.nowMs)) continue;
          const next = dueNpcState(group, clock.nowMs, light.phase === 'NIGHT', remaining);
          if (next)
            await updateWorldLabNpcGroup(transaction, {
              prior: group,
              state: next.state,
              nextDecisionMs: next.nextDecisionMs,
            });
        }
      })
      .catch(onError)
      .finally(() => {
        active = undefined;
      });
  };
  const timer = setInterval(run, DECISION_INTERVAL_MS);
  timer.unref();
  run();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await active;
  };
}
