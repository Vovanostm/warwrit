import { createHash, randomUUID } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import type {
  EncounterCommandDto,
  EncounterCommandResponse,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';
import { sql, type Kysely, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { createCombatLabFixture } from '../combat-lab/scenario.js';

const WORLD_ID = 'main';
const FIXTURE_SCHEMA_VERSION = 1;
const HUMAN_ACTIVATION_DEADLINE_MS = 30_000;

interface EncounterRow {
  readonly id: string;
  readonly schema_version: number;
  readonly setup: combat.BattleSetup;
  readonly state: combat.BattleState;
  readonly revision: number;
  readonly status: 'active' | 'resolved';
  readonly activation_id: string | null;
  readonly activation_epoch: number;
  readonly deadline_at: Date | null;
  readonly ai_wake_at: Date | null;
}

interface ParticipantRow {
  readonly side_id: unknown;
  readonly unit_ids: unknown;
}

interface ReceiptRow {
  readonly account_id: string | null;
  readonly source_kind: 'account' | 'system_ai';
  readonly receipt_id: string;
  readonly body_digest: Buffer;
  readonly response: EncounterCommandResponse;
  readonly resulting_revision: number;
}

interface StoredCommandRow {
  readonly revision: number;
  readonly command_id: string;
  readonly account_id: string | null;
  readonly source_kind: 'account' | 'system_ai';
  readonly body_digest: Buffer;
  readonly command: combat.CombatCommand;
}

type SqlExecutor = Kysely<DatabaseSchema> | Transaction<DatabaseSchema>;

async function replayMatches(executor: SqlExecutor, encounter: EncounterRow): Promise<boolean> {
  try {
    if (
      encounter.schema_version !== FIXTURE_SCHEMA_VERSION ||
      encounter.setup.schemaVersion !== combat.COMBAT_SCHEMA_VERSION ||
      encounter.setup.battleId !== encounter.id ||
      encounter.setup.rulesetId !== 'm0-prototype-v1' ||
      encounter.state.schemaVersion !== combat.COMBAT_SCHEMA_VERSION ||
      encounter.state.battleId !== encounter.id ||
      encounter.state.rulesetId !== encounter.setup.rulesetId ||
      encounter.state.revision !== encounter.revision ||
      encounter.state.status !== encounter.status ||
      (encounter.state.activation?.id ?? null) !== encounter.activation_id
    )
      return false;
    if (encounter.status === 'resolved') {
      if (encounter.ai_wake_at !== null) return false;
    } else {
      const currentActor = encounter.state.activation?.unitId;
      if (currentActor === undefined) return false;
      const currentController = await controllerFor(executor, encounter.id, currentActor);
      if (
        (currentController === undefined &&
          (encounter.deadline_at === null || encounter.ai_wake_at !== null)) ||
        (currentController !== undefined &&
          (encounter.deadline_at !== null || encounter.ai_wake_at === null))
      )
        return false;
    }

    combat.assertBattleState(encounter.state);
    const commandResult = await sql<StoredCommandRow>`
      select revision, command_id, account_id, source_kind, body_digest, command
      from encounter_commands where encounter_id = ${encounter.id}
      order by revision asc
    `.execute(executor);
    if (
      commandResult.rows.length !== encounter.revision ||
      commandResult.rows.some(({ revision }, index) => revision !== index + 1)
    )
      return false;
    const replay: combat.CombatReplay = {
      schemaVersion: combat.COMBAT_SCHEMA_VERSION,
      setup: encounter.setup,
      commands: commandResult.rows.map(({ command }) => command),
    };
    const grantsResult = await sql<ParticipantRow & { readonly account_id: string }>`
      select account_id, side_id, unit_ids
      from encounter_participants where encounter_id = ${encounter.id}
    `.execute(executor);
    const grants = new Map(grantsResult.rows.map((grant) => [grant.account_id, grant]));
    const controllersResult = await sql<{
      readonly unit_id: string;
      readonly doctrine: combat.AiDoctrine;
    }>`
      select unit_id, doctrine from encounter_ai_controllers where encounter_id = ${encounter.id}
    `.execute(executor);
    const controllers = new Map(
      controllersResult.rows.map((controller) => [controller.unit_id, controller]),
    );
    let sourceReplayState = combat.startBattle(encounter.setup).state;
    for (const row of commandResult.rows) {
      const actorGrant = row.account_id === null ? undefined : grants.get(row.account_id);
      const actorController = controllers.get(row.command.actorId);
      if (
        (row.source_kind === 'account' &&
          (row.account_id === null ||
            actorGrant === undefined ||
            !Array.isArray(actorGrant.unit_ids) ||
            !actorGrant.unit_ids.includes(row.command.actorId) ||
            actorGrant.side_id !==
              encounter.setup.units.find((unit) => unit.id === row.command.actorId)?.sideId ||
            actorController !== undefined)) ||
        (row.source_kind === 'system_ai' &&
          (row.account_id !== null || actorController === undefined))
      )
        return false;
      if (
        row.source_kind === 'system_ai' &&
        JSON.stringify(combat.chooseAiCommand(sourceReplayState, actorController!.doctrine)) !==
          JSON.stringify(row.command)
      )
        return false;
      const step = combat.applyCombatCommand(sourceReplayState, row.command);
      if (!step.ok) return false;
      sourceReplayState = step.state;
    }
    const replayed = combat.replayCombat(replay);
    if (
      combat.canonicalCombatState(replayed.state) !== combat.canonicalCombatState(encounter.state)
    )
      return false;
    if (
      replayed.events.filter((event) => event.type === 'activation.started').length !==
      encounter.activation_epoch
    )
      return false;
    const eventResult = await sql<{
      readonly revision: number;
      readonly ordinal: number;
      readonly event_id: string;
      readonly event: combat.CombatEvent;
    }>`
      select revision, ordinal, event_id, event from encounter_events where encounter_id = ${encounter.id}
      order by revision asc, ordinal asc
    `.execute(executor);
    const receiptResult = await sql<{
      readonly command_id: string;
      readonly receipt_id: string;
      readonly account_id: string | null;
      readonly source_kind: 'account' | 'system_ai';
      readonly body_digest: Buffer;
      readonly resulting_revision: number;
      readonly response: EncounterCommandResponse;
    }>`
      select command_id, receipt_id, account_id, source_kind, body_digest, resulting_revision, response
      from encounter_receipts where encounter_id = ${encounter.id}
    `.execute(executor);
    if (receiptResult.rows.length !== commandResult.rows.length) return false;
    const receiptsByCommand = new Map(
      receiptResult.rows.map((receipt) => [receipt.command_id, receipt]),
    );
    const receiptsMatch = commandResult.rows.every((command) => {
      const receipt = receiptsByCommand.get(command.command_id);
      return (
        receipt !== undefined &&
        receipt.account_id === command.account_id &&
        receipt.source_kind === command.source_kind &&
        receipt.body_digest.equals(command.body_digest) &&
        receipt.resulting_revision === command.revision &&
        receipt.receipt_id === `${encounter.id}:${command.revision}` &&
        receipt.response.status === 'accepted' &&
        receipt.response.encounterId === encounter.id &&
        receipt.response.commandId === command.command_id &&
        receipt.response.receiptId === receipt.receipt_id &&
        receipt.response.revision === command.revision
      );
    });
    if (!receiptsMatch) return false;
    if (eventResult.rows.length !== replayed.events.length) return false;
    const ordinals = new Map<number, number>();
    return eventResult.rows.every((stored, index) => {
      const event = replayed.events[index];
      if (event === undefined) return false;
      const ordinal = ordinals.get(event.revision) ?? 0;
      ordinals.set(event.revision, ordinal + 1);
      return (
        stored.revision === event.revision &&
        stored.ordinal === ordinal &&
        stored.event_id === `${encounter.id}:${event.revision}:${ordinal}` &&
        JSON.stringify(stored.event) === JSON.stringify(event)
      );
    });
  } catch {
    return false;
  }
}

function bodyDigest(command: EncounterCommandDto): Buffer {
  return createHash('sha256')
    .update(
      JSON.stringify([
        command.version,
        command.encounterId,
        command.commandId,
        command.expectedRevision,
        command.activationId,
        command.actorId,
        command.intent.type,
        command.intent.type === 'move'
          ? [command.intent.to.q, command.intent.to.r]
          : command.intent.type === 'attack'
            ? command.intent.targetId
            : null,
      ]),
    )
    .digest();
}

export async function createFixtureEncounter(
  database: Kysely<DatabaseSchema>,
  accountId: string,
): Promise<
  Pick<EncounterCommandResponse, 'version'> & {
    readonly encounterId: string;
    readonly revision: number;
    readonly status: 'active' | 'resolved';
  }
> {
  const encounterId = randomUUID();
  const fixture = createCombatLabFixture(encounterId);
  const setup = fixture.originalSetup();
  const initial = combat.startBattle(setup);
  const unitIds = setup.units
    .filter((unit) => unit.sideId === fixture.controlledSideId)
    .map((unit) => unit.id);
  const activeUnit = initial.state.units.find(
    (unit) => unit.id === initial.state.activation?.unitId,
  );
  if (activeUnit?.sideId !== fixture.controlledSideId) {
    throw new Error('Fixture must begin on its admitted side');
  }
  const deadline = new Date(Date.now() + HUMAN_ACTIVATION_DEADLINE_MS);
  const aiControllers = setup.units.filter((unit) => unit.sideId !== fixture.controlledSideId);

  await database.transaction().execute(async (transaction) => {
    await sql`
      insert into encounters
        (id, world_id, schema_version, setup, state, revision, status,
         activation_id, activation_epoch, deadline_at)
      values
        (${encounterId}, ${WORLD_ID}, ${FIXTURE_SCHEMA_VERSION},
         ${JSON.stringify(setup)}::json, ${JSON.stringify(initial.state)}::json,
         ${initial.state.revision}, ${initial.state.status},
         ${initial.state.activation?.id ?? null}, 1, ${deadline})
    `.execute(transaction);
    for (const unit of aiControllers) {
      await sql`
        insert into encounter_ai_controllers
          (encounter_id, unit_id, doctrine, admission_source)
        values (${encounterId}, ${unit.id}, 'aggressive', 'fixture')
      `.execute(transaction);
    }
    await sql`
      insert into encounter_participants
        (encounter_id, account_id, side_id, unit_ids, admission_source)
      values
        (${encounterId}, ${accountId}, ${fixture.controlledSideId},
         ${JSON.stringify(unitIds)}::jsonb, 'fixture')
    `.execute(transaction);
    for (const [ordinal, event] of initial.events.entries()) {
      const eventId = `${encounterId}:0:${ordinal}`;
      await sql`
        insert into encounter_events (encounter_id, revision, ordinal, event_id, event)
        values (${encounterId}, 0, ${ordinal}, ${eventId}, ${JSON.stringify(event)}::json)
      `.execute(transaction);
    }
  });
  return { version: 1, encounterId, revision: 0, status: initial.state.status };
}

interface ControllerRow {
  readonly doctrine: combat.AiDoctrine;
}

async function controllerFor(
  transaction: SqlExecutor,
  encounterId: string,
  unitId: string,
): Promise<ControllerRow | undefined> {
  const result = await sql<ControllerRow>`
    select doctrine from encounter_ai_controllers
    where encounter_id = ${encounterId} and unit_id = ${unitId}
  `.execute(transaction);
  return result.rows[0];
}

interface TransitionAuthority {
  readonly kind: 'account' | 'system_ai';
  readonly accountId: string | null;
  readonly digest: Buffer;
}

async function persistTransition(
  transaction: Transaction<DatabaseSchema>,
  encounter: EncounterRow,
  command: combat.CombatCommand,
  authority: TransitionAuthority,
): Promise<EncounterCommandResponse | undefined> {
  const result = combat.applyCombatCommand(encounter.state, command);
  if (!result.ok) return undefined;

  const nextActivation = result.state.activation;
  const activationChanged = nextActivation?.id !== encounter.activation_id;
  const activationStarted = result.events.some((event) => event.type === 'activation.started');
  let deadlineAt = encounter.deadline_at;
  let aiWakeAt = encounter.ai_wake_at;
  if (result.state.status === 'resolved') {
    deadlineAt = null;
    aiWakeAt = null;
  } else if (activationChanged || authority.kind === 'system_ai') {
    const nextActor = nextActivation?.unitId;
    const nextController =
      nextActor === undefined
        ? undefined
        : await controllerFor(transaction, encounter.id, nextActor);
    if (nextController === undefined) {
      deadlineAt = new Date(Date.now() + HUMAN_ACTIVATION_DEADLINE_MS);
      aiWakeAt = null;
    } else {
      deadlineAt = null;
      aiWakeAt = new Date();
    }
  }

  const commandId = command.commandId;
  const response: Extract<EncounterCommandResponse, { status: 'accepted' }> = {
    version: 1,
    encounterId: encounter.id,
    commandId,
    receiptId: `${encounter.id}:${result.state.revision}`,
    status: 'accepted',
    revision: result.state.revision,
  };
  await sql`
    insert into encounter_commands
      (encounter_id, revision, command_id, account_id, source_kind, body_digest, command)
    values
      (${encounter.id}, ${result.state.revision}, ${commandId}, ${authority.accountId},
       ${authority.kind}, ${authority.digest}, ${JSON.stringify(command)}::json)
  `.execute(transaction);
  for (const [ordinal, event] of result.events.entries()) {
    const eventId = `${encounter.id}:${result.state.revision}:${ordinal}`;
    await sql`
      insert into encounter_events (encounter_id, revision, ordinal, event_id, event)
      values (${encounter.id}, ${result.state.revision}, ${ordinal}, ${eventId},
        ${JSON.stringify(event)}::json)
    `.execute(transaction);
  }
  await sql`
    update encounters set
      state = ${JSON.stringify(result.state)}::json,
      revision = ${result.state.revision}, status = ${result.state.status},
      activation_id = ${nextActivation?.id ?? null},
      activation_epoch = activation_epoch + ${activationStarted ? 1 : 0},
      deadline_at = ${deadlineAt}, ai_wake_at = ${aiWakeAt}
    where id = ${encounter.id}
  `.execute(transaction);
  await sql`
    insert into encounter_receipts
      (encounter_id, command_id, receipt_id, account_id, source_kind, body_digest, response, resulting_revision)
    values
      (${encounter.id}, ${commandId}, ${response.receiptId}, ${authority.accountId},
       ${authority.kind}, ${authority.digest}, ${JSON.stringify(response)}::jsonb,
       ${result.state.revision})
  `.execute(transaction);
  return response;
}

function toCombatCommand(dto: EncounterCommandDto): combat.CombatCommand {
  const base = {
    commandId: combat.commandId(dto.commandId),
    activationId: dto.activationId,
    actorId: combat.unitId(dto.actorId),
  };
  switch (dto.intent.type) {
    case 'move':
      return { ...base, type: 'move', to: combat.hex(dto.intent.to.q, dto.intent.to.r) };
    case 'attack':
      return { ...base, type: 'attack', targetId: combat.unitId(dto.intent.targetId) };
    case 'defend':
    case 'wait':
    case 'retreat':
      return { ...base, type: dto.intent.type };
  }
}

async function participant(
  transaction: Transaction<DatabaseSchema>,
  encounterId: string,
  accountId: string,
): Promise<ParticipantRow | undefined> {
  const result = await sql<ParticipantRow>`
    select side_id, unit_ids
    from encounter_participants
    where encounter_id = ${encounterId} and account_id = ${accountId}
  `.execute(transaction);
  return result.rows[0];
}

function hasValidParticipantGrant(
  admitted: ParticipantRow,
  units: readonly combat.BattleState['units'][number][],
): admitted is { readonly side_id: string; readonly unit_ids: readonly string[] } {
  if (
    typeof admitted.side_id !== 'string' ||
    admitted.side_id.length === 0 ||
    !Array.isArray(admitted.unit_ids) ||
    admitted.unit_ids.length === 0
  )
    return false;

  const grantedUnitIds = new Set<string>();
  for (const unitId of admitted.unit_ids) {
    if (
      typeof unitId !== 'string' ||
      unitId.length === 0 ||
      grantedUnitIds.has(unitId) ||
      !units.some((unit) => unit.id === unitId && unit.sideId === admitted.side_id)
    )
      return false;
    grantedUnitIds.add(unitId);
  }
  return true;
}

export async function executeEncounterCommand(
  database: Kysely<DatabaseSchema>,
  accountId: string,
  dto: EncounterCommandDto,
): Promise<EncounterCommandResponse> {
  const digest = bodyDigest(dto);
  const rejected = (code: Extract<EncounterCommandResponse, { status: 'rejected' }>['code']) => ({
    version: 1 as const,
    commandId: dto.commandId,
    status: 'rejected' as const,
    code,
  });

  return database.transaction().execute(async (transaction) => {
    const admitted = await participant(transaction, dto.encounterId, accountId);
    if (admitted === undefined) return rejected('NOT_FOUND');

    const priorResult = await sql<ReceiptRow>`
      select account_id, source_kind, receipt_id, body_digest, response, resulting_revision
      from encounter_receipts
      where encounter_id = ${dto.encounterId} and command_id = ${dto.commandId}
    `.execute(transaction);
    const prior = priorResult.rows[0];
    if (prior !== undefined) {
      if (prior.source_kind !== 'account' || prior.account_id !== accountId)
        return rejected('NOT_FOUND');
      if (
        prior.receipt_id !== `${dto.encounterId}:${prior.resulting_revision}` ||
        prior.response.status !== 'accepted' ||
        prior.response.encounterId !== dto.encounterId ||
        prior.response.commandId !== dto.commandId ||
        prior.response.receiptId !== prior.receipt_id ||
        prior.response.revision !== prior.resulting_revision
      )
        return rejected('CONFLICT');
      return prior.body_digest.equals(digest) ? prior.response : rejected('CONFLICT');
    }

    const encounterResult = await sql<EncounterRow>`
      select id, schema_version, setup, state, revision, status, activation_id,
        activation_epoch, deadline_at, ai_wake_at from encounters
      where id = ${dto.encounterId} for update
    `.execute(transaction);
    const encounter = encounterResult.rows[0];
    if (encounter === undefined) return rejected('NOT_FOUND');

    const racedReceiptResult = await sql<ReceiptRow>`
      select account_id, source_kind, receipt_id, body_digest, response, resulting_revision
      from encounter_receipts
      where encounter_id = ${dto.encounterId} and command_id = ${dto.commandId}
    `.execute(transaction);
    const racedReceipt = racedReceiptResult.rows[0];
    if (racedReceipt !== undefined) {
      if (racedReceipt.source_kind !== 'account' || racedReceipt.account_id !== accountId)
        return rejected('NOT_FOUND');
      if (
        racedReceipt.receipt_id !== `${dto.encounterId}:${racedReceipt.resulting_revision}` ||
        racedReceipt.response.status !== 'accepted' ||
        racedReceipt.response.encounterId !== dto.encounterId ||
        racedReceipt.response.commandId !== dto.commandId ||
        racedReceipt.response.receiptId !== racedReceipt.receipt_id ||
        racedReceipt.response.revision !== racedReceipt.resulting_revision
      )
        return rejected('CONFLICT');
      return racedReceipt.body_digest.equals(digest) ? racedReceipt.response : rejected('CONFLICT');
    }

    const state = encounter.state;
    if (
      !(await replayMatches(transaction, encounter)) ||
      state.revision !== dto.expectedRevision ||
      encounter.status !== 'active'
    ) {
      return rejected('CONFLICT');
    }
    const actor = state.units.find((unit) => unit.id === dto.actorId);
    const aiController =
      actor === undefined ? undefined : await controllerFor(transaction, dto.encounterId, actor.id);
    if (
      !hasValidParticipantGrant(admitted, state.units) ||
      actor === undefined ||
      actor.sideId !== admitted.side_id ||
      !admitted.unit_ids.includes(dto.actorId) ||
      state.activation?.unitId !== actor.id ||
      state.activation.id !== dto.activationId ||
      aiController !== undefined
    ) {
      return rejected('UNAUTHORIZED');
    }
    if (encounter.deadline_at === null || encounter.deadline_at.getTime() <= Date.now())
      return rejected('CONFLICT');

    const command = toCombatCommand(dto);
    const acceptedResponse = await persistTransition(transaction, encounter, command, {
      kind: 'account',
      accountId,
      digest,
    });
    return acceptedResponse ?? rejected('INVALID_COMMAND');
  });
}

export interface EncounterAiWake {
  readonly encounterId: string;
  readonly revision: number;
  readonly activationId: string;
  readonly activationEpoch: number;
  readonly dueAt: Date;
}

export async function listDueEncounterAiWakes(
  database: Kysely<DatabaseSchema>,
  now = new Date(),
): Promise<readonly EncounterAiWake[]> {
  const result = await sql<{
    readonly id: string;
    readonly revision: number;
    readonly activation_id: string | null;
    readonly activation_epoch: number;
    readonly ai_wake_at: Date | null;
  }>`
    select id, revision, activation_id, activation_epoch, ai_wake_at
    from encounters
    where status = 'active' and ai_wake_at <= ${now}
    order by ai_wake_at asc, id asc
  `.execute(database);
  return result.rows.flatMap((row) =>
    row.activation_id === null || row.ai_wake_at === null
      ? []
      : [
          {
            encounterId: row.id,
            revision: row.revision,
            activationId: row.activation_id,
            activationEpoch: row.activation_epoch,
            dueAt: row.ai_wake_at,
          },
        ],
  );
}

export async function executeEncounterAiWake(
  database: Kysely<DatabaseSchema>,
  wake: EncounterAiWake,
): Promise<EncounterCommandResponse | undefined> {
  return database.transaction().execute(async (transaction) => {
    const encounterResult = await sql<EncounterRow>`
      select id, schema_version, setup, state, revision, status, activation_id,
        activation_epoch, deadline_at, ai_wake_at
      from encounters where id = ${wake.encounterId} for update
    `.execute(transaction);
    const encounter = encounterResult.rows[0];
    const activation = encounter?.state.activation;
    if (
      encounter === undefined ||
      encounter.status !== 'active' ||
      encounter.revision !== wake.revision ||
      encounter.activation_id !== wake.activationId ||
      encounter.activation_epoch !== wake.activationEpoch ||
      encounter.ai_wake_at === null ||
      encounter.ai_wake_at.getTime() !== wake.dueAt.getTime() ||
      encounter.ai_wake_at.getTime() > Date.now() ||
      encounter.deadline_at !== null ||
      activation == null ||
      activation.id !== wake.activationId ||
      !(await replayMatches(transaction, encounter))
    )
      return undefined;

    const controller = await controllerFor(transaction, encounter.id, activation.unitId);
    if (controller === undefined) return undefined;
    const command = combat.chooseAiCommand(encounter.state, controller.doctrine);
    const digest = createHash('sha256')
      .update(JSON.stringify(['system_ai', encounter.id, command]))
      .digest();
    return persistTransition(transaction, encounter, command, {
      kind: 'system_ai',
      accountId: null,
      digest,
    });
  });
}

export async function readEncounterMetadata(
  database: Kysely<DatabaseSchema>,
  accountId: string,
  encounterId: string,
) {
  return database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute(async (transaction) => {
      const result = await sql<EncounterRow>`
        select e.id, e.schema_version, e.setup, e.state, e.revision, e.status,
          e.activation_id, e.activation_epoch, e.deadline_at, e.ai_wake_at
        from encounters e
        join encounter_participants p on p.encounter_id = e.id
        where e.id = ${encounterId} and p.account_id = ${accountId}
      `.execute(transaction);
      const row = result.rows[0];
      if (row === undefined || !(await replayMatches(transaction, row))) return undefined;
      return { revision: row.revision, status: row.status };
    });
}

export async function readEncounterProjection(
  database: Kysely<DatabaseSchema>,
  accountId: string,
  encounterId: string,
): Promise<EncounterPublicProjectionDto | undefined> {
  return database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute(async (transaction) => {
      const result = await sql<EncounterRow & ParticipantRow>`
        select e.id, e.schema_version, e.setup, e.state, e.revision, e.status,
          e.activation_id, e.activation_epoch, e.deadline_at, e.ai_wake_at,
          p.side_id, p.unit_ids
        from encounters e
        join encounter_participants p on p.encounter_id = e.id
        where e.id = ${encounterId} and p.account_id = ${accountId}
      `.execute(transaction);
      const row = result.rows[0];
      if (
        row === undefined ||
        !hasValidParticipantGrant(row, row.state.units) ||
        !(await replayMatches(transaction, row))
      )
        return undefined;

      const activation = row.state.activation;
      return {
        version: 1,
        encounterId: row.id,
        revision: row.revision,
        status: row.status,
        round: row.state.round,
        activationId: activation?.id ?? null,
        actorUnitId: activation?.unitId ?? null,
        deadlineAt: row.deadline_at?.toISOString() ?? null,
        controllableUnitIds: [...row.unit_ids],
        units: row.state.units.map((unit) => ({
          id: unit.id,
          sideId: unit.sideId,
          q: unit.position.q,
          r: unit.position.r,
          health: unit.health,
          status: unit.status,
        })),
      };
    });
}

export async function verifyEncounterReplay(
  database: Kysely<DatabaseSchema>,
  encounterId: string,
): Promise<boolean> {
  return database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute(async (transaction) => {
      const encounterResult = await sql<EncounterRow>`
        select id, schema_version, setup, state, revision, status, activation_id,
          activation_epoch, deadline_at, ai_wake_at
        from encounters where id = ${encounterId}
      `.execute(transaction);
      const encounter = encounterResult.rows[0];
      return encounter === undefined ? false : replayMatches(transaction, encounter);
    });
}
