import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { readFile } from 'node:fs/promises';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULES,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';
import { ensureWorldRecruitPool } from './recruitment.js';
import { loadCompanyAggregate } from './repository.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('local recruitment (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'charges once, keeps hiring separate from joining, and lets one company consume a shared offer',
    async () => {
      if (database === undefined || connectionString === undefined)
        throw new Error('company test database missing');

      const worldId = randomUUID();
      const companies = [randomUUID(), randomUUID()] as const;
      const accounts = [randomUUID(), randomUUID()] as const;
      const sessions = [randomUUID(), randomUUID()] as const;
      const issuer = `recruit-test-${worldId}`;
      const appConfig = loadServerConfig({
        DATABASE_URL: connectionString,
        OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
        OIDC_CLIENT_ID: 'warwrit-local',
        OIDC_CLIENT_SECRET: 'local-only-secret',
        OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
        PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
        HOST: '127.0.0.1',
        PORT: '3107',
      });
      const app = buildApp({
        identity: { config: appConfig.identity!, database },
        company: { database, worldId },
      });
      apps.push(app);
      const location = {
        kind: 'AT' as const,
        siteId: 'kamenny-brod',
        areaId: 'kamenny-brod-market',
      };
      const fixture = createCompanyCombatAggregateFixture().state;
      const storedStates = companies.map((companyId) => {
        const source = JSON.parse(
          JSON.stringify(fixture)
            .replaceAll('"world"', JSON.stringify(worldId))
            .replaceAll('"a-company"', JSON.stringify(companyId)),
        ) as typeof fixture;
        const party = source.economy.lifecycle.parties[0];
        if (!party) throw new Error('fixture has no field party');
        const lifecycle = source.economy.lifecycle;
        const active = new Set(
          lifecycle.memberships
            .filter((membership) => membership.endedAt === null)
            .map((membership) => membership.characterId),
        );
        const physical = source.economy.physical;
        if (!physical) throw new Error('fixture has no physical state');
        const localCharacters = lifecycle.characters.map((character) =>
          active.has(character.identity.characterId)
            ? {
                ...character,
                presence: {
                  ...character.presence,
                  location,
                  ...(character.identity.characterId === 'a-worker-1'
                    ? { fieldPartyId: null, assignment: 'NONE' as const }
                    : {}),
                },
              }
            : character,
        );
        return readCompanyCombatAggregateState({
          ...source,
          economy: {
            ...source.economy,
            lifecycle: {
              ...lifecycle,
              characters: localCharacters,
              knowledge: {
                ...lifecycle.knowledge,
                characters: lifecycle.knowledge.characters.map(
                  (known) =>
                    localCharacters.find(
                      (person) => person.identity.characterId === known.identity.characterId,
                    ) ?? known,
                ),
              },
              parties: lifecycle.parties.map((entry) => ({ ...entry, location })),
            },
            finance: {
              ...source.economy.finance,
              wallets: source.economy.finance.wallets.map((wallet) => ({
                ...wallet,
                location,
                cashQ:
                  wallet.walletId ===
                  source.economy.finance.pools.find((pool) => pool.poolId === 'local')?.walletId
                    ? (100n * BigInt(COMPANY_RULES.moneyQPerCrown)).toString()
                    : wallet.cashQ,
              })),
            },
            physical: {
              ...physical,
              containers: physical.containers.map((container) => ({ ...container, location })),
            },
          },
        });
      });
      const headers = sessions.map((session, index) => ({
        cookie: `warwrit_session=${session}`,
        origin: 'http://127.0.0.1:3107',
        [WORLD_EXPECTED_COMPANY_ID_HEADER]: companies[index]!,
      }));

      try {
        await database
          .insertInto('identity_accounts')
          .values(accounts.map((id, index) => ({ id, issuer, subject: String(index) })))
          .execute();
        await database
          .insertInto('identity_sessions')
          .values(
            sessions.map((session, index) => ({
              token_digest: createHash('sha256').update(session).digest(),
              account_id: accounts[index]!,
              expires_at: new Date(Date.now() + 60_000),
            })),
          )
          .execute();
        await database.transaction().execute(async (transaction) => {
          for (const [index, state] of storedStates.entries()) {
            await transaction
              .insertInto('company_snapshots')
              .values({
                world_id: worldId,
                company_id: companies[index]!,
                schema_version: COMPANY_SCHEMA_VERSION,
                ruleset_id: COMPANY_RULESET_ID,
                catalogue_version: COMPANY_CATALOGUE_VERSION,
                command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
                public_revision: state.economy.lifecycle.knowledge.revision,
                canonical_revision: state.economy.lifecycle.revision,
                state,
              })
              .execute();
            await transaction
              .insertInto('company_account_owners')
              .values({
                world_id: worldId,
                company_id: companies[index]!,
                account_id: accounts[index]!,
              })
              .execute();
          }
          await ensureWorldRecruitPool(transaction, worldId);
          await transaction
            .deleteFrom('world_recruit_offers')
            .where('world_id', '=', worldId)
            .where('site_id', '=', 'bereznyak')
            .execute();
          await ensureWorldRecruitPool(transaction, worldId);
          const materializedOffers = await transaction
            .selectFrom('world_recruit_offers')
            .select('site_id')
            .where('world_id', '=', worldId)
            .execute();
          expect(materializedOffers.map((entry) => entry.site_id).toSorted()).toEqual([
            'bereznyak',
            'kamenny-brod',
            'tikhaya-gat',
          ]);
          await transaction
            .insertInto('world_recruit_offers')
            .values(
              companies.map((companyId, index) => ({
                world_id: worldId,
                offer_id: `command-scope-offer-${index}-${worldId}`,
                offer_revision: '1',
                site_id: 'kamenny-brod',
                area_id: 'kamenny-brod-market',
                character_id: `command-scope-character-${index}-${worldId}`,
                candidate: {},
                vitals: {},
                wallet: {},
                consumed_company_id: companyId,
                consumed_command_id: 'same-command-id',
                consumed_at: new Date(),
              })),
            )
            .execute();
          await transaction
            .insertInto('world_recruit_offers')
            .values({
              world_id: worldId,
              offer_id: `wrong-area-${worldId}`,
              offer_revision: '1',
              site_id: 'kamenny-brod',
              area_id: 'elsewhere-in-kamenny-brod',
              character_id: `wrong-area-character-${worldId}`,
              candidate: {},
              vitals: {},
              wallet: {},
            })
            .execute();
          await transaction
            .insertInto('world_campaign_clocks')
            .values({
              world_id: worldId,
              epoch_ms: String(Date.now()),
              starting_tick: String(storedStates[0]!.economy.lifecycle.campaignTick),
            })
            .execute();
        });

        // Hidden availability must not change roster affordances before observation.
        const beforeHiddenChange = await app.inject({
          method: 'GET',
          url: '/company',
          headers: headers[0]!,
        });
        const original = storedStates[0]!;
        const hidden = {
          ...original,
          economy: {
            ...original.economy,
            lifecycle: {
              ...original.economy.lifecycle,
              characters: original.economy.lifecycle.characters.map((person) =>
                person.identity.characterId === 'a-worker-1'
                  ? {
                      ...person,
                      presence: {
                        ...person.presence,
                        availability: 'OUT_OF_CONTACT' as const,
                        fieldPartyId: null,
                        assignment: 'NONE' as const,
                      },
                    }
                  : person,
              ),
            },
          },
        };
        await database
          .updateTable('company_snapshots')
          .set({ state: hidden })
          .where('world_id', '=', worldId)
          .where('company_id', '=', companies[0])
          .execute();
        const afterHiddenChange = await app.inject({
          method: 'GET',
          url: '/company',
          headers: headers[0]!,
        });
        expect(afterHiddenChange.json().company.characters).toEqual(
          beforeHiddenChange.json().company.characters,
        );
        // A local reserve is sufficient contact even if every field member is unavailable.
        const reserveContact = {
          ...original,
          economy: {
            ...original.economy,
            lifecycle: {
              ...original.economy.lifecycle,
              characters: original.economy.lifecycle.characters.map((person) =>
                person.presence.fieldPartyId !== null
                  ? {
                      ...person,
                      presence: {
                        ...person.presence,
                        availability: 'OUT_OF_CONTACT' as const,
                        fieldPartyId: null,
                        assignment: 'NONE' as const,
                      },
                    }
                  : person,
              ),
            },
          },
        };
        await database
          .updateTable('company_snapshots')
          .set({ state: reserveContact })
          .where('world_id', '=', worldId)
          .where('company_id', '=', companies[0])
          .execute();
        const reserveOffers = await app.inject({
          method: 'GET',
          url: '/company/recruits/kamenny-brod',
          headers: headers[0]!,
        });
        expect(reserveOffers.statusCode, reserveOffers.body).toBe(200);
        expect(reserveOffers.json().offers).toHaveLength(1);
        await database
          .updateTable('company_snapshots')
          .set({ state: original })
          .where('world_id', '=', worldId)
          .where('company_id', '=', companies[0])
          .execute();

        const previews = await Promise.all(
          headers.map((header) =>
            app.inject({ method: 'GET', url: '/company/recruits/kamenny-brod', headers: header }),
          ),
        );
        for (const preview of previews) expect(preview.statusCode).toBe(200);
        const offers = previews.map(
          (preview) =>
            preview.json().offers as readonly {
              offerId: string;
              offerRevision: string;
              name: string;
              physician: boolean;
              signingQ: string;
              aptitudes: readonly { skillId: string; valueBps: number }[];
            }[],
        );
        const physician = offers[0]!.find((offer) => offer.physician);
        expect(physician).toMatchObject({ name: 'Ратко', signingQ: '50000000' });
        expect(physician?.aptitudes.find((entry) => entry.skillId === 'medicine')).toBeDefined();
        expect(offers[1]!.find((offer) => offer.physician)?.offerId).toBe(physician!.offerId);

        const baseRevisions = storedStates.map(
          (state) => state.economy.lifecycle.knowledge.revision,
        );
        const hireRequests = headers.map((header, index) => ({
          header,
          payload: {
            schemaVersion: 2 as const,
            commandId: `hire-${index}-${worldId}`,
            expectedPublicRevision: baseRevisions[index]!,
            type: 'Recruit' as const,
            payload: { offerId: physician!.offerId, offerRevision: physician!.offerRevision },
          },
        }));
        const hires = await Promise.all(
          hireRequests.map(({ header, payload }) =>
            app.inject({ method: 'POST', url: '/company/commands', headers: header, payload }),
          ),
        );
        const outcomes = hires.map((response) => ({
          status: response.statusCode,
          body: response.json(),
        }));
        expect(
          hires.map((response) => response.statusCode).toSorted(),
          JSON.stringify(outcomes),
        ).toEqual([200, 409]);
        const winner = hires.findIndex((response) => response.statusCode === 200);
        const loser = winner === 0 ? 1 : 0;
        expect(hires[loser]!.json()).toMatchObject({ code: 'OUT_OF_STOCK' });

        const replay = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: headers[winner]!,
          payload: hireRequests[winner]!.payload,
        });
        expect(replay.statusCode).toBe(200);
        expect(replay.json()).toEqual(hires[winner]!.json());

        const winnerState = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, companies[winner]!));
        const loserState = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, companies[loser]!));
        if (!winnerState || !loserState) throw new Error('company snapshots disappeared');
        const hiredCharacter = winnerState.economy.lifecycle.characters.find(
          (entry) =>
            entry.identity.characterId !== undefined &&
            entry.identity.birthName === physician!.name,
        );
        expect(hiredCharacter).toBeDefined();
        expect(hiredCharacter?.presence.fieldPartyId).toBeNull();
        const candidateWallet = winnerState.economy.finance.wallets.find(
          (wallet) =>
            wallet.owner.kind === 'CHARACTER' &&
            wallet.owner.id === hiredCharacter!.identity.characterId,
        );
        expect(candidateWallet?.cashQ).toBe('50000000');
        const recruitedMembership = winnerState.economy.lifecycle.memberships.find(
          (membership) =>
            membership.characterId === hiredCharacter!.identity.characterId &&
            membership.endedAt === null,
        );
        const recruitedAccount = winnerState.economy.finance.accounts.find(
          (account) => account.membershipId === recruitedMembership?.membershipId,
        );
        expect(recruitedAccount?.schedule?.rates).toEqual(
          COMPANY_RULES.economy.qualificationBands.map((band) => ({
            minimumLevel: band.level,
            dailyWageMilli: ((BigInt('10000') * BigInt(band.multiplierBps)) / 10_000n).toString(),
          })),
        );
        expect(
          winnerState.economy.finance.movements.filter(
            (movement) =>
              movement.purpose === 'SIGNING' && movement.to === candidateWallet?.walletId,
          ),
        ).toHaveLength(1);
        expect(loserState).toEqual(storedStates[loser]);

        const companyRead = await app.inject({
          method: 'GET',
          url: '/company',
          headers: headers[winner]!,
        });
        const companySummary = companyRead.json().company as {
          revision: string;
          characters: readonly {
            characterId: string;
            canJoinFieldParty: boolean;
            fieldPartyFull: boolean;
          }[];
        };
        expect(
          companySummary.characters.find(
            (entry) => entry.characterId === hiredCharacter!.identity.characterId,
          ),
        ).toMatchObject({ canJoinFieldParty: true, fieldPartyFull: false });
        const expectedPublicRevision = companySummary.revision;
        const join = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: headers[winner]!,
          payload: {
            schemaVersion: 2,
            commandId: `join-${worldId}`,
            expectedPublicRevision,
            type: 'JoinFieldParty',
            payload: { characterId: hiredCharacter!.identity.characterId },
          },
        });
        expect(join.statusCode, JSON.stringify(join.json())).toBe(200);
        const joined = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, companies[winner]!));
        expect(
          joined?.economy.lifecycle.characters.find(
            (entry) => entry.identity.characterId === hiredCharacter!.identity.characterId,
          )?.presence.fieldPartyId,
        ).toBe(joined?.economy.lifecycle.parties[0]?.partyId);
        const fullPartyRead = await app.inject({
          method: 'GET',
          url: '/company',
          headers: headers[winner]!,
        });
        const fullPartySummary = fullPartyRead.json().company as {
          characters: readonly {
            characterId: string;
            canJoinFieldParty: boolean;
            fieldPartyFull: boolean;
          }[];
        };
        expect(
          fullPartySummary.characters.find((entry) => entry.characterId === 'a-worker-1'),
        ).toMatchObject({
          canJoinFieldParty: false,
          fieldPartyFull: true,
        });
        // Roll back/reapply the new table; accepted hire receipts remain authoritative.
        await database.transaction().execute(async (transaction) => {
          await sql
            .raw(
              await readFile(
                new URL('../../migrations/0019_world_recruit_pool.down.sql', import.meta.url),
                'utf8',
              ),
            )
            .execute(transaction);
          await sql
            .raw(
              await readFile(
                new URL('../../migrations/0019_world_recruit_pool.up.sql', import.meta.url),
                'utf8',
              ),
            )
            .execute(transaction);
          await ensureWorldRecruitPool(transaction, worldId);
          const recovered = await transaction
            .selectFrom('world_recruit_offers')
            .selectAll()
            .where('world_id', '=', worldId)
            .where('offer_id', '=', physician!.offerId)
            .executeTakeFirstOrThrow();
          expect(recovered.consumed_company_id).toBe(companies[winner]);
          expect(recovered.consumed_command_id).toBe(hireRequests[winner]!.payload.commandId);
        });
        const afterRollback = await app.inject({
          method: 'GET',
          url: '/company/recruits/kamenny-brod',
          headers: headers[loser]!,
        });
        expect(afterRollback.json().offers).toEqual([]);
        const duplicatedHire = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: headers[loser]!,
          payload: { ...hireRequests[loser]!.payload, commandId: `after-rollback-${worldId}` },
        });
        expect(duplicatedHire.statusCode).toBe(409);
        expect(duplicatedHire.json().code).toBe('OUT_OF_STOCK');
      } finally {
        await database.transaction().execute(async (transaction) => {
          await transaction
            .deleteFrom('world_recruit_offers')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('company_account_owners')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('company_audit_events')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('company_receipts')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('company_snapshots')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('world_campaign_clocks')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('identity_sessions')
            .where('account_id', 'in', accounts)
            .execute();
          await transaction.deleteFrom('identity_accounts').where('id', 'in', accounts).execute();
        });
      }
    },
  );
});
