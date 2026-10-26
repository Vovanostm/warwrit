import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import type { NavigationRegion } from '@warwrit/game-core';
import { CONTINUOUS_WORLD_REGION } from '@warwrit/game-core';
import { processContinuousMovementCandidate } from './continuous-movement.js';
import { processWorldRouteCandidate } from './routes.js';

interface RouteWorkerCandidate {
  readonly company_id: string;
  readonly party_id: string;
  readonly accepted_by_account_id: string;
}

/** Start the bounded durable scan; each candidate is revalidated under the command lock order. */
export function startWorldRouteWorker(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  onError: (error: unknown) => void,
  intervalMs = 1_000,
  region: NavigationRegion = CONTINUOUS_WORLD_REGION,
  now: () => Date = () => new Date(),
): () => Promise<void> {
  let stopped = false;
  let active: Promise<void> | undefined;
  const drain = async (): Promise<void> => {
    const { rows } = await sql<RouteWorkerCandidate>`
      select company_id, party_id,
             accepted_route->>'acceptedByAccountId' as accepted_by_account_id
        from public.world_party_routes
       where world_id = ${worldId}
         and (accepted_route->'execution'->>'phase' in ('IN_TRANSIT', 'AT_BOUNDARY') or (status='IN_TRANSIT' and accepted_route->>'kind' in ('FREE_MOVEMENT','CONTINUOUS_MOVEMENT')))
       order by company_id, party_id
    `.execute(database);
    const currentTime = now();
    for (const row of rows) {
      if (stopped) return;
      if (typeof row.accepted_by_account_id !== 'string' || row.accepted_by_account_id.length === 0)
        continue;
      try {
        const candidate = {
          companyId: row.company_id,
          partyId: row.party_id,
          acceptedByAccountId: row.accepted_by_account_id,
        };
        await processContinuousMovementCandidate(database, worldId, candidate, now, region);
        await processWorldRouteCandidate(database, worldId, candidate, currentTime);
      } catch (error) {
        onError(error);
      }
    }
  };
  const run = (): void => {
    if (stopped || active) return;
    active = drain()
      .catch(onError)
      .finally(() => {
        active = undefined;
      });
  };
  const timer = setInterval(run, intervalMs);
  timer.unref();
  run();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await active;
  };
}
