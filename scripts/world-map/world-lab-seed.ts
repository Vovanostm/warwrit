import { randomUUID } from 'node:crypto';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  PAINTED_ATLAS_REGION,
  PAINTED_ATLAS_SHEET,
  paintedAtlasPoint,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import { sql, type Kysely } from 'kysely';
import type { DatabaseSchema } from '../../apps/server/src/db/database.js';
import {
  ensureWorldLabNpcGroups,
  type WorldLabNpcGroup,
} from '../../apps/server/src/world-lab/npc-store.js';
import type { WorldLabFixture } from '../../apps/server/src/world-lab/model.js';

const PLAYER_FIXTURES = [
  { slot: 'company-a', pixel: [1731, 1244], siteId: 'bereznyak', name: 'Отряд Березняка' },
  { slot: 'company-b', pixel: [1760, 1244], siteId: null, name: 'Отряд в окрестностях' },
] as const satisfies readonly {
  readonly slot: WorldLabFixture['slot'];
  readonly pixel: readonly [number, number];
  readonly siteId: string | null;
  readonly name: string;
}[];

function initialCompany(
  worldId: string,
  companyId: string,
  pixel: readonly [number, number],
  siteId: string | null,
): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture().state;
  const lifecycle = fixture.economy.lifecycle;
  const party = lifecycle.parties[0];
  if (!party) throw new Error('World lab company fixture has no party');
  const replacements = new Map<string, string>([
    [lifecycle.worldId, worldId],
    [lifecycle.companyId, companyId],
  ]);
  const characterIds = lifecycle.characters.map((character) => character.identity.characterId);
  const partyIds = lifecycle.parties.map((entry) => entry.partyId);
  for (const id of [...characterIds, ...partyIds]) replacements.set(id, randomUUID());
  const remapped = JSON.parse(
    JSON.stringify(fixture, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as CompanyCombatAggregateState;
  const point = paintedAtlasPoint(pixel);
  const origin = siteId
    ? { kind: 'AT' as const, siteId, areaId: 'bereznyak-green' }
    : {
        kind: 'TERRAIN' as const,
        regionVersion: PAINTED_ATLAS_REGION.mapEdition,
        q: String(point.xFp * 65_536),
        r: String(point.zFp * 65_536),
      };
  const economy = remapped.economy;
  const physical = economy.physical;
  if (!physical) throw new Error('World lab company fixture has no physical state');
  const atOrigin = (location: typeof origin) => ({ ...location });
  const rationContainers = new Set(
    physical.items.filter((item) => item.definitionId === 'ration').map((item) => item.containerId),
  );
  const supplyPartyId = economy.lifecycle.parties[0]!.partyId;
  const placeContainer = (entry: (typeof physical.containers)[number]) => ({
    ...entry,
    location: atOrigin(origin),
    ...(rationContainers.has(entry.containerId)
      ? { kind: 'PARTY_SUPPLY' as const, carrier: { kind: 'PARTY' as const, id: supplyPartyId } }
      : {}),
  });
  const state = readCompanyCombatAggregateState({
    ...remapped,
    economy: {
      ...economy,
      lifecycle: {
        ...economy.lifecycle,
        parties: economy.lifecycle.parties.map((entry) => ({
          ...entry,
          location: atOrigin(origin),
        })),
        characters: economy.lifecycle.characters.map((entry) => ({
          ...entry,
          presence: { ...entry.presence, location: atOrigin(origin) },
        })),
      },
      physical: {
        ...physical,
        containers: physical.containers.map(placeContainer),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(placeContainer),
        },
      },
    },
  });
  return state;
}

function npcSeeds(worldId: string): readonly WorldLabNpcGroup[] {
  const definitions = [
    {
      groupId: 'lab-patrol',
      kind: 'PATROL',
      profileId: 'world-lab-patrol-v1',
      name: 'Дозорная группа',
      routeOffsets: [
        [0, 0],
        [41, 2],
        [82, 6],
      ],
      homePixel: [1690, 1242],
      activeAtNight: true,
    },
    {
      groupId: 'lab-bandits',
      kind: 'BANDITS',
      profileId: 'world-lab-bandits-v1',
      name: 'Вооружённый отряд',
      routeOffsets: [
        [0, 0],
        [14, -8],
        [27, 4],
      ],
      homePixel: [1648, 1174],
      activeAtNight: true,
    },
    {
      groupId: 'lab-wildlife',
      kind: 'WILDLIFE',
      profileId: 'world-lab-wildlife-v1',
      name: 'Лесная стая',
      routeOffsets: [
        [0, 0],
        [11, -6],
        [22, 4],
      ],
      homePixel: [1582, 1124],
      activeAtNight: true,
    },
    {
      groupId: 'lab-night-creature',
      kind: 'CREATURE',
      profileId: 'world-lab-night-creature-v1',
      name: 'Тварь у мельницы',
      routeOffsets: [
        [0, 0],
        [12, -8],
        [22, 5],
      ],
      homePixel: [0, 0],
      activeAtNight: true,
    },
  ] as const;
  return definitions.map((definition) => {
    const homePoint =
      definition.groupId === 'lab-night-creature'
        ? PAINTED_ATLAS_REGION.sites.find((entry) => entry.siteId === 'staraya-melnitsa')!.anchorFp
        : paintedAtlasPoint(definition.homePixel);
    const routePoints = definition.routeOffsets.map(([dx, dy]) => ({
      xFp: homePoint.xFp + Math.round(dx * PAINTED_ATLAS_SHEET.fpPerPixel),
      zFp: homePoint.zFp - Math.round(dy * PAINTED_ATLAS_SHEET.fpPerPixel),
    }));
    return {
      worldId,
      groupId: definition.groupId,
      kind: definition.kind,
      profileId: definition.profileId,
      mapEdition: PAINTED_ATLAS_REGION.mapEdition,
      home: {
        ...(definition.groupId === 'lab-night-creature' ? { siteId: 'staraya-melnitsa' } : {}),
        point: homePoint,
        routePoints,
        activeAtNight: definition.activeAtNight,
      },
      state: {
        schemaVersion: 1,
        name: definition.name,
        point: homePoint,
        plan: null,
        routeIndex: 1,
        movementEpoch: '0',
      },
      revision: '0',
      nextDecisionMs: '0',
    };
  });
}

export async function ensureWorldLabSeed(
  database: Kysely<DatabaseSchema>,
  worldId: string,
): Promise<readonly WorldLabFixture[]> {
  const existing = await sql<{
    readonly slot: WorldLabFixture['slot'];
    readonly account_id: string;
    readonly company_id: string;
    readonly party_id: string;
    readonly display_name: string;
  }>`
    select slot, account_id, company_id, party_id, display_name
      from world_lab_slots where world_id = ${worldId} order by slot
  `.execute(database);
  if (existing.rows.length === 2) {
    await ensureWorldLabNpcGroups(database, npcSeeds(worldId));
    return existing.rows.map((row) => ({
      slot: row.slot,
      accountId: row.account_id,
      companyId: row.company_id,
      partyId: row.party_id,
      name: row.display_name,
    }));
  }
  if (existing.rows.length !== 0)
    throw new Error('World lab fixtures are partially seeded; refusing to replace them');

  const fixtures: WorldLabFixture[] = PLAYER_FIXTURES.map(({ slot, name }) => ({
    slot,
    accountId: randomUUID(),
    companyId: randomUUID(),
    partyId: randomUUID(),
    name,
  }));
  await database.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('world_campaign_clocks')
      .values({
        world_id: worldId,
        epoch_ms: String(Date.now() - 600_000),
        starting_tick: createCompanyCombatAggregateFixture().state.economy.lifecycle.campaignTick,
      })
      .onConflict((conflict) => conflict.column('world_id').doNothing())
      .execute();
    for (const [index, fixture] of fixtures.entries()) {
      const definition = PLAYER_FIXTURES[index]!;
      const state = initialCompany(worldId, fixture.companyId, definition.pixel, definition.siteId);
      const lifecycle = state.economy.lifecycle;
      const oldPartyId = lifecycle.parties[0]?.partyId;
      if (!oldPartyId) throw new Error('World lab company fixture party missing');
      const remappedState = readCompanyCombatAggregateState(
        JSON.parse(
          JSON.stringify(state, (_key, value: unknown) =>
            value === oldPartyId ? fixture.partyId : value,
          ),
        ) as CompanyCombatAggregateState,
      );
      await transaction
        .insertInto('identity_accounts')
        .values({
          id: fixture.accountId,
          issuer: `world-lab:${worldId}`,
          subject: fixture.slot,
        })
        .execute();
      await transaction
        .insertInto('company_snapshots')
        .values({
          world_id: worldId,
          company_id: fixture.companyId,
          schema_version: COMPANY_SCHEMA_VERSION,
          ruleset_id: COMPANY_RULESET_ID,
          catalogue_version: COMPANY_CATALOGUE_VERSION,
          command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
          public_revision: remappedState.economy.lifecycle.knowledge.revision,
          canonical_revision: remappedState.economy.lifecycle.revision,
          state: remappedState,
        })
        .execute();
      await transaction
        .insertInto('company_account_owners')
        .values({ world_id: worldId, account_id: fixture.accountId, company_id: fixture.companyId })
        .execute();
      await sql`
        insert into world_lab_slots
          (world_id, slot, account_id, company_id, party_id, display_name)
        values
          (${worldId}, ${fixture.slot}, ${fixture.accountId}, ${fixture.companyId},
           ${fixture.partyId}, ${fixture.name})
      `.execute(transaction);
    }
  });
  await ensureWorldLabNpcGroups(database, npcSeeds(worldId));
  return fixtures;
}
