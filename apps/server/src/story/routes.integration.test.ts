import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  canonicalJson,
  campaignTickAt,
  createCampaignClock,
  ordinaryContractGenesis,
  ordinaryContractProfile,
  prepareOrdinaryContractCommand,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, OrdinaryContractState } from '@warwrit/game-core';
import type {
  StoryCommandPayloadDto,
  StoryCommandResponseDto,
  StoryReadResponseDto,
} from '@warwrit/protocol';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadCompanyAggregate } from '../company/repository.js';
import { loadServerConfig } from '../config.js';
import { createDatabase, type DatabaseSchema } from '../db/database.js';

const connectionString = process.env['DATABASE_URL'];
const database = connectionString ? createDatabase(connectionString) : undefined;
const apps: ReturnType<typeof buildApp>[] = [];
const millWorker = ordinaryContractProfile('ci.m1.mill-worker.01')!;
const yard = { kind: 'AT' as const, siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
const away = { kind: 'AT' as const, siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-village' };

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

interface StoryActor {
  readonly companyId: string;
  readonly accountId: string;
  readonly sessionToken: string;
}

interface Scenario {
  readonly worldId: string;
  readonly app: ReturnType<typeof buildApp>;
  readonly owners: readonly [StoryActor, StoryActor];
  readonly foreign: StoryActor;
}

function companyFixture(worldId: string, companyId: string): CompanyCombatAggregateState {
  const base = createCompanyCombatAggregateFixture().state;
  const lifecycle = base.economy.lifecycle;
  const basePartyId = lifecycle.parties[0]?.partyId;
  if (!basePartyId) throw new Error('Company fixture party missing');
  const members = lifecycle.characters.filter((person) => person.presence.fieldPartyId !== null);
  const replacements = new Map<string, string>([
    [lifecycle.worldId, worldId],
    [lifecycle.companyId, companyId],
    [basePartyId, randomUUID()],
    ...members.map((person) => [person.identity.characterId, randomUUID()] as const),
  ]);
  const remapped = JSON.parse(
    JSON.stringify(base, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as CompanyCombatAggregateState;
  const partyId = replacements.get(basePartyId)!;
  const physical = remapped.economy.physical;
  if (!physical) throw new Error('Company fixture physical state missing');
  const rationContainerId = physical.items.find(
    (item) => item.definitionId === 'ration',
  )?.containerId;
  if (!rationContainerId) throw new Error('Company fixture ration container missing');
  const moveContainer = (container: (typeof physical.containers)[number]) =>
    container.containerId === rationContainerId
      ? {
          ...container,
          kind: 'PARTY_SUPPLY' as const,
          location: yard,
          carrier: { kind: 'PARTY' as const, id: partyId },
        }
      : { ...container, location: yard };
  return readCompanyCombatAggregateState({
    ...remapped,
    economy: {
      ...remapped.economy,
      lifecycle: {
        ...remapped.economy.lifecycle,
        parties: remapped.economy.lifecycle.parties.map((party) => ({ ...party, location: yard })),
        characters: remapped.economy.lifecycle.characters.map((person) =>
          person.presence.fieldPartyId === null
            ? person
            : { ...person, presence: { ...person.presence, location: yard } },
        ),
      },
      physical: {
        ...physical,
        containers: physical.containers.map(moveContainer),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(moveContainer),
        },
      },
    },
  });
}

async function seedCompany(worldId: string): Promise<StoryActor> {
  if (!database || !connectionString)
    throw new Error('Isolated story integration database missing');
  const companyId = randomUUID();
  const accountId = randomUUID();
  const sessionToken = randomUUID();
  const initial = companyFixture(worldId, companyId);
  const lifecycle = initial.economy.lifecycle;
  await database
    .insertInto('identity_accounts')
    .values({ id: accountId, issuer: `story-test-${accountId}`, subject: 'owner' })
    .execute();
  await database
    .insertInto('identity_sessions')
    .values({
      token_digest: createHash('sha256').update(sessionToken).digest(),
      account_id: accountId,
      expires_at: new Date(Date.now() + 60 * 60_000),
    })
    .execute();
  await database
    .insertInto('company_snapshots')
    .values({
      world_id: worldId,
      company_id: companyId,
      schema_version: COMPANY_SCHEMA_VERSION,
      ruleset_id: COMPANY_RULESET_ID,
      catalogue_version: COMPANY_CATALOGUE_VERSION,
      command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
      public_revision: lifecycle.knowledge.revision,
      canonical_revision: lifecycle.revision,
      state: initial,
    })
    .execute();
  await database
    .insertInto('company_account_owners')
    .values({ world_id: worldId, company_id: companyId, account_id: accountId })
    .execute();
  return { companyId, accountId, sessionToken };
}

async function seedOrdinaryDelivery(
  worldId: string,
  companyId: string,
  walletQ = '80000000',
  simulationAtMs: string | null = String(Date.now() - 3_000_000),
  startingTick = '0',
): Promise<void> {
  if (!database) throw new Error('Isolated story integration database missing');
  const deliveryAtMs = simulationAtMs ?? String(Date.now() - 3_000_000);
  const epochMs = (BigInt(deliveryAtMs) - 3_000_000n).toString();
  await database
    .insertInto('world_campaign_clocks')
    .values({ world_id: worldId, epoch_ms: epochMs, starting_tick: startingTick })
    .execute();
  const atTick = campaignTickAt(createCampaignClock(epochMs, startingTick), deliveryAtMs);
  let state: OrdinaryContractState = ordinaryContractGenesis(millWorker);
  const gates = { DAYLIGHT: true, RAIDERS_DEFEATED: true, BEAST_DEFEATED: true } as const;
  let deliveryBody: Record<string, unknown> | undefined;
  for (const command of [
    { type: 'ACCEPT' as const },
    ...millWorker.steps.map((step) => ({ type: 'STEP' as const, stepId: step.stepId })),
  ]) {
    const stepId = command.type === 'STEP' ? command.stepId : undefined;
    const step = stepId ? millWorker.steps.find((entry) => entry.stepId === stepId)! : undefined;
    const commandId = randomUUID();
    const previousRevision = state.revision;
    const prepared = prepareOrdinaryContractCommand(millWorker, state, command, {
      companyId,
      standingAt: step?.place ?? millWorker.issuerPlace,
      atTick,
      expectedRevision: previousRevision,
      sourceEventId: `ordinary-contract:${millWorker.instanceId}:${commandId}`,
      gates,
    });
    if (prepared.kind !== 'PREPARED')
      throw new Error(`Ordinary fixture rejected: ${prepared.code}`);
    state = prepared.next;
    if (stepId === 'deliver') {
      deliveryBody = {
        schemaVersion: 1,
        commandId,
        instanceId: millWorker.instanceId,
        expectedRevision: previousRevision,
        type: 'STEP',
        stepId,
      };
    }
  }
  if (!deliveryBody || !state.outcome) throw new Error('Ordinary fixture delivery missing');
  const finalCommandId = String(deliveryBody['commandId']);
  await database
    .insertInto('ordinary_contracts')
    .values({
      world_id: worldId,
      instance_id: millWorker.instanceId,
      profile_id: millWorker.definitionId,
      revision: state.revision,
      wallet_id: millWorker.walletId,
      wallet_q: walletQ,
      state,
    })
    .execute();
  await database
    .insertInto('ordinary_contract_receipts')
    .values({
      world_id: worldId,
      company_id: companyId,
      command_id: finalCommandId,
      instance_id: millWorker.instanceId,
      request_key: canonicalJson(deliveryBody),
      response: {
        schemaVersion: 1,
        commandId: finalCommandId,
        ok: true,
        revision: state.revision,
        rewardQ: millWorker.rewardQ,
      },
      simulation_at_ms: simulationAtMs,
      ...(simulationAtMs === null ? { created_at: new Date(Number(deliveryAtMs)) } : {}),
    })
    .execute();
}

async function makeScenario(
  walletQ = '80000000',
  simulationAtMs: string | null = String(Date.now() - 3_000_000),
): Promise<Scenario> {
  if (!database || !connectionString)
    throw new Error('Isolated story integration database missing');
  const worldId = randomUUID();
  const ownerA = await seedCompany(worldId);
  const ownerB = await seedCompany(worldId);
  const foreign = {
    accountId: randomUUID(),
    companyId: randomUUID(),
    sessionToken: randomUUID(),
  };
  await database
    .insertInto('identity_accounts')
    .values({
      id: foreign.accountId,
      issuer: `story-test-${foreign.accountId}`,
      subject: 'unowned',
    })
    .execute();
  await database
    .insertInto('identity_sessions')
    .values({
      token_digest: createHash('sha256').update(foreign.sessionToken).digest(),
      account_id: foreign.accountId,
      expires_at: new Date(Date.now() + 60 * 60_000),
    })
    .execute();
  const startingTick = createCompanyCombatAggregateFixture().state.economy.lifecycle.campaignTick;
  await seedOrdinaryDelivery(worldId, ownerA.companyId, walletQ, simulationAtMs, startingTick);
  const config = loadServerConfig({
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
    identity: { config: config.identity!, database },
    company: { database, worldId },
  });
  apps.push(app);
  return { worldId, app, owners: [ownerA, ownerB], foreign };
}

function headers(actor: StoryActor) {
  return {
    cookie: `warwrit_session=${actor.sessionToken}`,
    origin: 'http://127.0.0.1:3107',
  };
}

async function readStory(scenario: Scenario, actor: StoryActor): Promise<StoryReadResponseDto> {
  const response = await scenario.app.inject({
    method: 'GET',
    url: '/story',
    headers: headers(actor),
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json<StoryReadResponseDto>();
}

async function command(
  scenario: Scenario,
  actor: StoryActor,
  story: StoryReadResponseDto,
  payload: StoryCommandPayloadDto,
  commandId = randomUUID(),
): Promise<{
  readonly response: Extract<StoryCommandResponseDto, { ok: true }>;
  readonly story: StoryReadResponseDto;
}> {
  const response = await scenario.app.inject({
    method: 'POST',
    url: '/story/commands',
    headers: headers(actor),
    payload: {
      schemaVersion: 1,
      commandId,
      expectedWorldRevision: story.worldRevision,
      expectedCompanyRevision: story.companyRevision,
      command: payload,
    },
  });
  const body = response.json<StoryCommandResponseDto>();
  if (!body.ok)
    throw new Error(
      `Story command ${payload.type} rejected (${response.statusCode}): ${response.body}`,
    );
  expect(response.statusCode, response.body).toBe(200);
  return { response: body, story: body.story };
}

async function advanceToUlitaAccusation(
  scenario: Scenario,
  actor: StoryActor,
): Promise<{
  readonly story: StoryReadResponseDto;
  readonly terminalCommandId: ReturnType<typeof randomUUID>;
}> {
  let story = await readStory(scenario, actor);
  if (story.availability !== 'OFFERED') throw new Error(`Story not offered: ${story.availability}`);
  story = (await command(scenario, actor, story, { type: 'ACCEPT' })).story;
  const choices = [
    'to-senka',
    'ask-guard',
    'to-ulita',
    'ask-son',
    'to-kondrat',
    'ask-sacks',
    'to-ulita',
    'inspect-sack',
    'ask-sack-origin',
    'ask-senka-sack',
    'ask-senka-sack',
    'to-ulita',
    'open-confrontation',
    'confront-ulita',
    'ask-where-grain',
    'open-accusation',
    'accuse-ulita',
  ] as const;
  for (const choiceId of choices)
    story = (await command(scenario, actor, story, { type: 'CHOOSE', choiceId })).story;
  return { story, terminalCommandId: randomUUID() };
}

describe('authenticated story routes (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'keeps company findings private and pays proven E01 exactly once',
    async () => {
      if (!database) throw new Error('Isolated story integration database missing');
      const scenario = await makeScenario();
      const [ownerA, ownerB] = scenario.owners;
      const anonymous = await scenario.app.inject({ method: 'GET', url: '/story' });
      expect(anonymous.statusCode).toBe(401);
      const foreign = await scenario.app.inject({
        method: 'GET',
        url: '/story',
        headers: headers(scenario.foreign),
      });
      expect(foreign.statusCode).toBe(403);
      const ownerBRead = await readStory(scenario, ownerB);
      expect(ownerBRead.journal).toEqual([]);
      const { story: accusation, terminalCommandId } = await advanceToUlitaAccusation(
        scenario,
        ownerA,
      );
      const ownerBAfter = await readStory(scenario, ownerB);
      expect(ownerBAfter.journal).toEqual([]);
      const beforeCompany = await database
        .transaction()
        .execute((transaction) =>
          loadCompanyAggregate(transaction, scenario.worldId, ownerA.companyId),
        );
      if (!beforeCompany) throw new Error('Company aggregate missing');
      const localPool = beforeCompany.economy.finance.pools.find((pool) => pool.poolId === 'local');
      const beforeCash = localPool
        ? BigInt(
            beforeCompany.economy.finance.wallets.find(
              (wallet) => wallet.walletId === localPool.walletId,
            )!.cashQ,
          )
        : 0n;
      const issuerBefore = await database
        .selectFrom('ordinary_contracts')
        .select('wallet_q')
        .where('world_id', '=', scenario.worldId)
        .where('instance_id', '=', millWorker.instanceId)
        .executeTakeFirstOrThrow();
      expect(issuerBefore.wallet_q).toBe('80000000');
      const final = await command(
        scenario,
        ownerA,
        accusation,
        { type: 'CONFIRM' },
        terminalCommandId,
      );
      expect(final.response.rewardPaidQ).toBe('40000000');
      expect(final.story.publicOutcome?.endingId).toBe('E01');
      const afterCompany = await database
        .transaction()
        .execute((transaction) =>
          loadCompanyAggregate(transaction, scenario.worldId, ownerA.companyId),
        );
      if (!afterCompany || !localPool) throw new Error('Paid company aggregate missing');
      const afterCash = BigInt(
        afterCompany.economy.finance.wallets.find(
          (wallet) => wallet.walletId === localPool.walletId,
        )!.cashQ,
      );
      expect(afterCash - beforeCash).toBe(40_000_000n);
      const issuerAfter = await database
        .selectFrom('ordinary_contracts')
        .select('wallet_q')
        .where('world_id', '=', scenario.worldId)
        .where('instance_id', '=', millWorker.instanceId)
        .executeTakeFirstOrThrow();
      expect(issuerAfter.wallet_q).toBe('40000000');

      const frozen = await database
        .selectFrom('story_world_states')
        .select('state')
        .where('world_id', '=', scenario.worldId)
        .executeTakeFirstOrThrow();
      const frozenAvailability = (
        frozen.state as { eligibilitySource: { availableAtTick: string } }
      ).eligibilitySource.availableAtTick;
      await database
        .updateTable('world_campaign_clocks')
        .set({ qa_offset_ms: '21600000' })
        .where('world_id', '=', scenario.worldId)
        .execute();
      await readStory(scenario, ownerA);
      const afterJump = await database
        .selectFrom('story_world_states')
        .select('state')
        .where('world_id', '=', scenario.worldId)
        .executeTakeFirstOrThrow();
      expect(
        (afterJump.state as { eligibilitySource: { availableAtTick: string } }).eligibilitySource
          .availableAtTick,
      ).toBe(frozenAvailability);

      const snapshot = await database
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', scenario.worldId)
        .where('company_id', '=', ownerA.companyId)
        .executeTakeFirstOrThrow();
      const stored = snapshot.state as CompanyCombatAggregateState;
      const physical = stored.economy.physical;
      if (!physical) throw new Error('Company physical state missing');
      const moveContainer = (container: (typeof physical.containers)[number]) => ({
        ...container,
        location: away,
      });
      const moved = readCompanyCombatAggregateState({
        ...stored,
        economy: {
          ...stored.economy,
          lifecycle: {
            ...stored.economy.lifecycle,
            parties: stored.economy.lifecycle.parties.map((party) => ({
              ...party,
              location: away,
            })),
            characters: stored.economy.lifecycle.characters.map((person) =>
              person.presence.fieldPartyId === null
                ? person
                : { ...person, presence: { ...person.presence, location: away } },
            ),
          },
          physical: {
            ...physical,
            containers: physical.containers.map(moveContainer),
            knowledge: {
              ...physical.knowledge,
              containerSnapshots: physical.knowledge.containerSnapshots.map(moveContainer),
            },
          },
        },
      });
      await database
        .updateTable('company_snapshots')
        .set({ state: moved })
        .where('world_id', '=', scenario.worldId)
        .where('company_id', '=', ownerA.companyId)
        .execute();
      const replay = await command(
        scenario,
        ownerA,
        accusation,
        { type: 'CONFIRM' },
        terminalCommandId,
      );
      expect(replay.response).toEqual(final.response);
      const conflict = await scenario.app.inject({
        method: 'POST',
        url: '/story/commands',
        headers: headers(ownerA),
        payload: {
          schemaVersion: 1,
          commandId: terminalCommandId,
          expectedWorldRevision: accusation.worldRevision,
          expectedCompanyRevision: accusation.companyRevision,
          command: { type: 'RETURN' },
        },
      });
      expect(conflict.statusCode).toBe(409);
      expect(conflict.json().code).toBe('CONFLICTING_REPLAY');

      const awayCommandId = randomUUID();
      const awayCommand = await scenario.app.inject({
        method: 'POST',
        url: '/story/commands',
        headers: headers(ownerA),
        payload: {
          schemaVersion: 1,
          commandId: awayCommandId,
          expectedWorldRevision: final.story.worldRevision,
          expectedCompanyRevision: final.story.companyRevision,
          command: { type: 'RETURN' },
        },
      });
      expect(awayCommand.statusCode).toBe(409);
      expect(awayCommand.json()).toMatchObject({
        commandId: awayCommandId,
        ok: false,
        code: 'NOT_AT_LOCATION',
      });
    },
  );

  it.skipIf(database === undefined)(
    'closes a false E02 accusation without issuing a reward',
    async () => {
      if (!database) throw new Error('Isolated story integration database missing');
      const scenario = await makeScenario();
      const [owner] = scenario.owners;
      let { story } = await advanceToUlitaAccusation(scenario, owner);
      story = (await command(scenario, owner, story, { type: 'CHOOSE', choiceId: 'back' })).story;
      story = (await command(scenario, owner, story, { type: 'CHOOSE', choiceId: 'accuse-senka' }))
        .story;
      const finished = await command(scenario, owner, story, { type: 'CONFIRM' });
      expect(finished.story.publicOutcome?.endingId).toBe('E02');
      expect(finished.response.rewardPaidQ).toBeNull();
      const issuer = await database
        .selectFrom('ordinary_contracts')
        .select('wallet_q')
        .where('world_id', '=', scenario.worldId)
        .where('instance_id', '=', millWorker.instanceId)
        .executeTakeFirstOrThrow();
      expect(issuer.wallet_q).toBe('80000000');
    },
  );

  it.skipIf(database === undefined)('rolls back an underfunded E01 terminal command', async () => {
    if (!database) throw new Error('Isolated story integration database missing');
    const scenario = await makeScenario('0');
    const [owner] = scenario.owners;
    const { story } = await advanceToUlitaAccusation(scenario, owner);
    const terminalCommandId = randomUUID();
    const response = await scenario.app.inject({
      method: 'POST',
      url: '/story/commands',
      headers: headers(owner),
      payload: {
        schemaVersion: 1,
        commandId: terminalCommandId,
        expectedWorldRevision: story.worldRevision,
        expectedCompanyRevision: story.companyRevision,
        command: { type: 'CONFIRM' },
      },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('INSUFFICIENT_FUNDS');
    const world = await database
      .selectFrom('story_world_states')
      .select('state')
      .where('world_id', '=', scenario.worldId)
      .executeTakeFirstOrThrow();
    expect((world.state as { outcome: unknown }).outcome).toBeNull();
    expect(
      await database
        .selectFrom('story_command_receipts')
        .select('command_id')
        .where('world_id', '=', scenario.worldId)
        .where('command_id', '=', terminalCommandId)
        .executeTakeFirst(),
    ).toBeUndefined();
    const issuer = await database
      .selectFrom('ordinary_contracts')
      .select('wallet_q')
      .where('world_id', '=', scenario.worldId)
      .where('instance_id', '=', millWorker.instanceId)
      .executeTakeFirstOrThrow();
    expect(issuer.wallet_q).toBe('0');
  });

  it.skipIf(database === undefined)(
    'allows only one of two concurrent world-ending commands',
    async () => {
      if (!database) throw new Error('Isolated story integration database missing');
      const scenario = await makeScenario();
      const [ownerA, ownerB] = scenario.owners;
      const [{ story: accusationA }, { story: accusationB }] = await Promise.all([
        advanceToUlitaAccusation(scenario, ownerA),
        advanceToUlitaAccusation(scenario, ownerB),
      ]);
      const confirm = (owner: StoryActor, story: StoryReadResponseDto) =>
        scenario.app.inject({
          method: 'POST',
          url: '/story/commands',
          headers: headers(owner),
          payload: {
            schemaVersion: 1,
            commandId: randomUUID(),
            expectedWorldRevision: story.worldRevision,
            expectedCompanyRevision: story.companyRevision,
            command: { type: 'CONFIRM' },
          },
        });
      const results = await Promise.all([
        confirm(ownerA, accusationA),
        confirm(ownerB, accusationB),
      ]);
      expect(results.filter((result) => result.statusCode === 200)).toHaveLength(1);
      expect(results.filter((result) => result.statusCode === 409)).toHaveLength(1);
      const world = await database
        .selectFrom('story_world_states')
        .select('state')
        .where('world_id', '=', scenario.worldId)
        .executeTakeFirstOrThrow();
      expect((world.state as { outcome: { endingId: string } }).outcome.endingId).toBe('E01');
    },
  );

  it.skipIf(database === undefined)(
    'keeps prior null-timestamp deliveries readable when QA time never advanced',
    async () => {
      if (!database) throw new Error('Isolated story integration database missing');
      const scenario = await makeScenario('80000000', null);
      const [owner] = scenario.owners;
      const story = await readStory(scenario, owner);
      expect(story.availability).toBe('OFFERED');
      const receipt = await database
        .selectFrom('ordinary_contract_receipts')
        .select('simulation_at_ms')
        .where('world_id', '=', scenario.worldId)
        .executeTakeFirstOrThrow();
      expect(receipt.simulation_at_ms).toBeNull();
    },
  );

  it.skipIf(database === undefined)(
    'rejects a corrupted exact availability tick earlier than trusted derivation',
    async () => {
      if (!database) throw new Error('Isolated story integration database missing');
      const scenario = await makeScenario();
      const [owner] = scenario.owners;
      await readStory(scenario, owner);
      const stored = await database
        .selectFrom('story_world_states')
        .select('state')
        .where('world_id', '=', scenario.worldId)
        .executeTakeFirstOrThrow();
      const world = JSON.parse(JSON.stringify(stored.state)) as {
        eligibilitySource: { availableAtTick: string; deliveredAtTick: string };
      };
      world.eligibilitySource.availableAtTick = world.eligibilitySource.deliveredAtTick;
      await database
        .updateTable('story_world_states')
        .set({ state: world })
        .where('world_id', '=', scenario.worldId)
        .execute();
      const response = await scenario.app.inject({
        method: 'GET',
        url: '/story',
        headers: headers(owner),
      });
      expect(response.statusCode).toBe(500);
      expect(response.json().message).toContain('Story world row does not match');
    },
  );
});
