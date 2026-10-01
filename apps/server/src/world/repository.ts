import { sql, type Transaction } from 'kysely';
import type { WorldTravelResponseDto, WorldTravelV2ResponseDto } from '@warwrit/protocol';
import type { DatabaseSchema } from '../db/database.js';

export interface StoredPartyRoute {
  readonly party_id: string;
  readonly route_epoch: string;
  readonly segment_id: string;
  readonly profile_id: string;
  readonly region_version: string;
  readonly status: 'IN_TRANSIT' | 'ARRIVED';
  readonly accepted_route: unknown;
}

export interface WorldRouteAuditEvent {
  readonly eventId: string;
  readonly revision: string;
  readonly event: Readonly<Record<string, unknown>>;
}

export async function readPartyRoute(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  partyId: string,
  lock = false,
): Promise<StoredPartyRoute | undefined> {
  let query = transaction
    .selectFrom('world_party_routes')
    .select([
      'party_id',
      'route_epoch',
      'segment_id',
      'profile_id',
      'region_version',
      'status',
      'accepted_route',
    ])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('party_id', '=', partyId);
  if (lock) query = query.forUpdate();
  return query.executeTakeFirst();
}

export async function readPartyRouteForCompany(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  lock = false,
): Promise<StoredPartyRoute | undefined> {
  let query = transaction
    .selectFrom('world_party_routes')
    .select([
      'party_id',
      'route_epoch',
      'segment_id',
      'profile_id',
      'region_version',
      'status',
      'accepted_route',
    ])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('status', '=', 'IN_TRANSIT');
  if (lock) query = query.forUpdate();
  const routes = await query.execute();
  if (routes.length > 1) throw new TypeError('Company has multiple active world routes');
  return routes[0];
}

export async function readWorldRouteReceipt(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  commandId: string,
): Promise<
  | {
      readonly account_id: string;
      readonly request_key: string;
      readonly response: unknown;
    }
  | undefined
> {
  return transaction
    .selectFrom('world_route_receipts')
    .select(['account_id', 'request_key', 'response'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('command_id', '=', commandId)
    .executeTakeFirst();
}

export async function persistWorldTravel(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly worldId: string;
  readonly companyId: string;
  readonly accountId: string;
  readonly commandId: string;
  readonly requestKey: string;
  readonly response: WorldTravelResponseDto | WorldTravelV2ResponseDto;
  readonly route: {
    readonly partyId: string;
    readonly routeEpoch: string;
    readonly segmentId: string;
    readonly profileId: string;
    readonly regionVersion: string;
    readonly status: 'IN_TRANSIT' | 'ARRIVED';
    readonly acceptedRoute: Readonly<Record<string, unknown>>;
  };
  readonly routeAction: 'DEPART' | 'ARRIVE';
}): Promise<void> {
  const { transaction } = input;

  if (input.routeAction === 'DEPART') {
    await transaction
      .insertInto('world_party_routes')
      .values({
        world_id: input.worldId,
        company_id: input.companyId,
        party_id: input.route.partyId,
        route_epoch: input.route.routeEpoch,
        segment_id: input.route.segmentId,
        profile_id: input.route.profileId,
        region_version: input.route.regionVersion,
        status: input.route.status,
        accepted_route: input.route.acceptedRoute,
      })
      .onConflict((conflict) =>
        conflict.columns(['world_id', 'company_id', 'party_id']).doUpdateSet({
          route_epoch: input.route.routeEpoch,
          segment_id: input.route.segmentId,
          profile_id: input.route.profileId,
          region_version: input.route.regionVersion,
          status: input.route.status,
          accepted_route: input.route.acceptedRoute,
          updated_at: sql<Date>`now()`,
        }),
      )
      .execute();
  } else {
    const changed = await transaction
      .updateTable('world_party_routes')
      .set({
        route_epoch: input.route.routeEpoch,
        segment_id: input.route.segmentId,
        profile_id: input.route.profileId,
        region_version: input.route.regionVersion,
        status: input.route.status,
        accepted_route: input.route.acceptedRoute,
        updated_at: sql<Date>`now()`,
      })
      .where('world_id', '=', input.worldId)
      .where('company_id', '=', input.companyId)
      .where('party_id', '=', input.route.partyId)
      .where('route_epoch', '=', input.route.routeEpoch)
      .where('segment_id', '=', input.route.segmentId)
      .where('status', '=', 'IN_TRANSIT')
      .executeTakeFirst();
    if (Number(changed.numUpdatedRows) !== 1) throw new Error('World route epoch CAS failed');
  }

  await transaction
    .insertInto('world_route_receipts')
    .values({
      world_id: input.worldId,
      company_id: input.companyId,
      command_id: input.commandId,
      account_id: input.accountId,
      request_key: input.requestKey,
      response: input.response,
      resulting_public_revision: input.response.publicRevision,
    })
    .execute();
}
