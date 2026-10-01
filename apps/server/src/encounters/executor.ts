import { createHash, randomUUID } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import type { EncounterCommandDto, EncounterCommandResponse } from '@warwrit/protocol';
import { sql, type Kysely, type RawBuilder, type Transaction } from 'kysely';

import type { FirstHuntTerminalEvidence } from '../contracts/executor.js';
import type { DatabaseSchema } from '../db/database.js';
import { loadCompanyAggregate } from '../company/repository.js';
import { createCombatLabFixture } from '../combat-lab/scenario.js';
import { firstHuntTimeoutCommandId } from './admission.js';
import { prepareFirstHuntTerminalEvidence } from './terminal-evidence.js';
import type { TerminalCommandRow } from './terminal-evidence.js';

const WORLD_ID = 'main';
const FIXTURE_SCHEMA_VERSION = 1;
const HUMAN_ACTIVATION_DEADLINE_MS = 30_000;
const AFK_ACTIVATION_DEADLINE_MS = 1_000;
const HUMAN_POLICY_VERSION = 'first-hunt-human-deadline-v1';
const AFK_POLICY_VERSION = 'first-hunt-afk-v1';
export interface EncounterStoredRow {
  readonly world_id?: string;
  readonly id: string;
  readonly schema_version: number;
  readonly setup: combat.BattleSetup | combat.BattleSetupV2;
  readonly state: combat.BattleState;
  readonly revision: number;
  readonly status: 'active' | 'resolved';
  readonly activation_id: string | null;
  readonly activation_epoch: number;
  readonly deadline_at: Date | null;
  readonly ai_wake_at: Date | null;
}

interface ParticipantRow {
  readonly account_id?: string;
  readonly side_id: unknown;
  readonly unit_ids: unknown;
  readonly admission_source: 'fixture' | 'company_binding';
  readonly afk?: boolean;
  readonly resume_requested_after_epoch?: number | null;
}

interface ReceiptRow {
  readonly account_id: string | null;
  readonly source_kind: 'account' | 'system_ai' | 'system_timeout';
  readonly activation_policy_id: string | null;
  readonly receipt_id: string;
  readonly body_digest: Buffer;
  readonly response: EncounterCommandResponse;
  readonly resulting_revision: number;
}

interface StoredCommandRow {
  readonly revision: number;
  readonly command_id: string;
  readonly account_id: string | null;
  readonly source_kind: 'account' | 'system_ai' | 'system_timeout';
  readonly activation_policy_id: string | null;
  readonly campaign_tick: string | null;
  readonly body_digest: Buffer;
  readonly command: combat.CombatCommand;
}

type SqlExecutor = Kysely<DatabaseSchema> | Transaction<DatabaseSchema>;

function aiWakeAdmissionAuthority(
  encounterId: RawBuilder<unknown>,
  encounterWorldId: RawBuilder<unknown>,
  schemaVersion: RawBuilder<unknown>,
  controllerSource: RawBuilder<unknown>,
): RawBuilder<boolean> {
  return sql<boolean>`(
    (${controllerSource} = 'fixture' and ${schemaVersion} = 1 and
      not exists (
        select 1 from encounter_participants as participant
        where participant.encounter_id = ${encounterId}
          and participant.admission_source <> 'fixture'
      )) or
    (${controllerSource} = 'world_hostile' and ${schemaVersion} = 2 and
      exists (
        select 1 from encounter_admissions as admission
        where admission.encounter_id = ${encounterId}
          and admission.world_id = ${encounterWorldId}
      ))
  )`;
}

function systemCommandDigest(
  kind: 'system_ai' | 'system_timeout',
  encounterId: string,
  command: combat.CombatCommand,
): Buffer {
  return createHash('sha256')
    .update(JSON.stringify([`warwrit:encounter:${kind}:v1`, encounterId, command]), 'utf8')
    .digest();
}

async function replayMatches(
  executor: SqlExecutor,
  encounter: EncounterStoredRow,
): Promise<boolean> {
  try {
    const fixtureEncounter =
      encounter.schema_version === 1 &&
      encounter.setup.schemaVersion === combat.COMBAT_SCHEMA_VERSION &&
      encounter.setup.rulesetId === combat.M0_COMBAT_RULESET_ID;
    const companyBindingEncounter =
      encounter.schema_version === combat.COMBAT_V2_SCHEMA_VERSION &&
      encounter.setup.schemaVersion === combat.COMBAT_V2_SCHEMA_VERSION &&
      (encounter.setup.rulesetId === combat.M1_DOMAIN_BRIDGE_RULESET_ID ||
        encounter.setup.rulesetId === combat.M1_DOMAIN_BRIDGE_V2_RULESET_ID);
    if (
      (!fixtureEncounter && !companyBindingEncounter) ||
      encounter.setup.battleId !== encounter.id ||
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
      select revision, command_id, account_id, source_kind, activation_policy_id,
        campaign_tick, body_digest, command
      from encounter_commands where encounter_id = ${encounter.id}
      order by revision asc
    `.execute(executor);
    if (
      commandResult.rows.length !== encounter.revision ||
      commandResult.rows.some(({ revision }, index) => revision !== index + 1)
    )
      return false;
    const replay: combat.VersionedCombatReplay =
      encounter.setup.schemaVersion === combat.COMBAT_V2_SCHEMA_VERSION
        ? {
            schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
            setup: encounter.setup,
            commands: commandResult.rows.map(({ command }) => command),
          }
        : {
            schemaVersion: combat.COMBAT_SCHEMA_VERSION,
            setup: encounter.setup,
            commands: commandResult.rows.map(({ command }) => command),
          };
    const grantsResult = await sql<ParticipantRow & { readonly account_id: string }>`
      select account_id, side_id, unit_ids, admission_source
      from encounter_participants where encounter_id = ${encounter.id}
    `.execute(executor);
    const grants = new Map(grantsResult.rows.map((grant) => [grant.account_id, grant]));
    const controllersResult = await sql<{
      readonly unit_id: string;
      readonly doctrine: combat.AiDoctrine;
      readonly admission_source: 'fixture' | 'world_hostile';
    }>`
      select unit_id, doctrine, admission_source
      from encounter_ai_controllers where encounter_id = ${encounter.id}
    `.execute(executor);
    const controllers = new Map(
      controllersResult.rows.map((controller) => [controller.unit_id, controller]),
    );
    const policiesResult = await sql<{
      readonly activation_id: string;
      readonly activation_epoch: number;
      readonly account_id: string;
      readonly unit_id: string;
      readonly policy_version: string;
      readonly mode: 'HUMAN' | 'AFK';
      readonly campaign_tick: string;
      readonly timeout_command_id: string;
    }>`
      select activation_id, activation_epoch, account_id, unit_id, policy_version,
        mode, campaign_tick, timeout_command_id
      from encounter_activation_policies where encounter_id = ${encounter.id}
    `.execute(executor);
    const policies = new Map(policiesResult.rows.map((policy) => [policy.activation_id, policy]));
    let sourceReplayState = combat.replayCombat(
      encounter.setup.schemaVersion === combat.COMBAT_V2_SCHEMA_VERSION
        ? { schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION, setup: encounter.setup, commands: [] }
        : { schemaVersion: combat.COMBAT_SCHEMA_VERSION, setup: encounter.setup, commands: [] },
    ).state;
    const accountedUnits = new Set<string>();
    const expectedParticipantSource = fixtureEncounter ? 'fixture' : 'company_binding';
    const expectedControllerSource = fixtureEncounter ? 'fixture' : 'world_hostile';
    for (const grant of grantsResult.rows) {
      if (
        grant.admission_source !== expectedParticipantSource ||
        !hasValidParticipantGrant(grant, encounter.setup.units)
      )
        return false;
      for (const unitId of grant.unit_ids) {
        if (accountedUnits.has(unitId)) return false;
        accountedUnits.add(unitId);
      }
    }
    for (const controller of controllersResult.rows) {
      if (
        controller.admission_source !== expectedControllerSource ||
        accountedUnits.has(controller.unit_id) ||
        !encounter.setup.units.some((unit) => unit.id === controller.unit_id)
      )
        return false;
      accountedUnits.add(controller.unit_id);
    }
    if (
      accountedUnits.size !== encounter.setup.units.length ||
      encounter.setup.units.some((unit) => !accountedUnits.has(unit.id))
    )
      return false;
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
          (row.account_id !== null ||
            actorController === undefined ||
            row.activation_policy_id !== null))
      )
        return false;
      if (
        row.source_kind === 'system_ai' &&
        JSON.stringify(combat.chooseAiCommand(sourceReplayState, actorController!.doctrine)) !==
          JSON.stringify(row.command)
      )
        return false;
      if (row.source_kind === 'system_timeout') {
        const policy = row.activation_policy_id
          ? policies.get(row.activation_policy_id)
          : undefined;
        const timeoutGrant = policy === undefined ? undefined : grants.get(policy.account_id);
        if (
          row.account_id !== null ||
          policy === undefined ||
          timeoutGrant === undefined ||
          !Array.isArray(timeoutGrant.unit_ids) ||
          !timeoutGrant.unit_ids.includes(policy.unit_id) ||
          (policy.mode === 'HUMAN' && policy.policy_version !== HUMAN_POLICY_VERSION) ||
          (policy.mode === 'AFK' && policy.policy_version !== AFK_POLICY_VERSION) ||
          policy.activation_id !== row.command.activationId ||
          policy.unit_id !== row.command.actorId ||
          policy.timeout_command_id !== row.command_id ||
          row.command.commandId !== row.command_id ||
          row.command.type !== 'wait' ||
          actorController !== undefined ||
          !row.body_digest.equals(
            systemCommandDigest('system_timeout', encounter.id, row.command),
          ) ||
          row.campaign_tick === null ||
          !/^(0|[1-9][0-9]*)$/u.test(row.campaign_tick)
        )
          return false;
        if (
          row.command_id !==
          firstHuntTimeoutCommandId(encounter.id, policy.activation_id, policy.policy_version)
        )
          return false;
      }
      if (
        row.source_kind === 'account' &&
        encounter.schema_version === combat.COMBAT_V2_SCHEMA_VERSION &&
        (row.activation_policy_id !== row.command.activationId ||
          row.campaign_tick === null ||
          !/^(0|[1-9][0-9]*)$/u.test(row.campaign_tick))
      )
        return false;
      if (
        row.source_kind === 'system_ai' &&
        encounter.schema_version === combat.COMBAT_V2_SCHEMA_VERSION &&
        (row.campaign_tick === null || !/^(0|[1-9][0-9]*)$/u.test(row.campaign_tick))
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
      readonly source_kind: 'account' | 'system_ai' | 'system_timeout';
      readonly activation_policy_id: string | null;
      readonly body_digest: Buffer;
      readonly resulting_revision: number;
      readonly response: EncounterCommandResponse;
    }>`
      select command_id, receipt_id, account_id, source_kind, activation_policy_id,
        body_digest, resulting_revision, response
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
        receipt.activation_policy_id === command.activation_policy_id &&
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

export function verifyEncounterReplayRow(
  transaction: Transaction<DatabaseSchema>,
  encounter: EncounterStoredRow,
): Promise<boolean> {
  return replayMatches(transaction, encounter);
}

/**
 * Return only evidence that can be justified from the locked persisted sources. Until the
 * terminal-time company application inputs are durably available, this intentionally reports
 * NOT_READY instead of synthesizing company effects from the combat projection.
 */
export async function prepareCompanyTerminalEvidence(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly worldId: string;
    readonly encounterId: string;
    readonly terminalRevision: number;
    readonly companyId: string;
    readonly previous: combat.CompanyCombatAggregateState;
    readonly contractProfileId: string;
    readonly contractTermsDigest: string;
  },
): Promise<FirstHuntTerminalEvidence> {
  const stored = await transaction
    .selectFrom('encounters')
    .selectAll()
    .where('world_id', '=', input.worldId)
    .where('id', '=', input.encounterId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !stored ||
    stored.status !== 'resolved' ||
    stored.revision !== input.terminalRevision ||
    !(await verifyEncounterReplayRow(transaction, stored as unknown as EncounterStoredRow))
  )
    return { status: 'NOT_READY', residuals: Object.freeze(['ENCOUNTER_REPLAY_INVALID']) };

  const persisted = await loadCompanyAggregate(transaction, input.worldId, input.companyId);
  const previous = combat.readCompanyCombatAggregateState(input.previous);
  const active = previous.encounter.active;
  if (
    !persisted ||
    combat.canonicalStateJson(persisted) !== combat.canonicalStateJson(previous) ||
    active === null
  )
    return { status: 'NOT_READY', residuals: Object.freeze(['COMPANY_ROOT_NOT_ACTIVE']) };
  if (
    previous.economy.lifecycle.worldId !== input.worldId ||
    previous.economy.lifecycle.companyId !== input.companyId ||
    active?.binding.worldId !== input.worldId ||
    active?.binding.setup.battleId !== input.encounterId ||
    !active?.binding.participants.some((participant) => participant.companyId === input.companyId)
  )
    return { status: 'NOT_READY', residuals: Object.freeze(['COMPANY_BINDING_MISMATCH']) };

  const commandRows = await sql<{
    readonly revision: number;
    readonly campaign_tick: string | null;
    readonly command: combat.CombatCommand;
  }>`
    select revision, campaign_tick, command from encounter_commands
    where encounter_id = ${input.encounterId} order by revision asc
  `.execute(transaction);
  return prepareFirstHuntTerminalEvidence({
    ...input,
    stored: { ...stored, state: stored.state as combat.BattleState },
    commandRows: commandRows.rows as readonly TerminalCommandRow[],
  });
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

async function campaignTickAtRequest(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  nowMs: number,
): Promise<string | null> {
  const result = await transaction
    .selectFrom('world_campaign_clocks')
    .select(['epoch_ms', 'starting_tick'])
    .where('world_id', '=', worldId)
    .executeTakeFirst();
  if (!result) return null;
  try {
    const tick = combat.campaignTickAt(
      combat.createCampaignClock(result.epoch_ms, result.starting_tick),
      String(nowMs),
    );
    return /^(0|[1-9][0-9]*)$/u.test(tick) ? tick : null;
  } catch {
    return null;
  }
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
  readonly admission_source: 'fixture' | 'world_hostile';
}

async function controllerFor(
  transaction: SqlExecutor,
  encounterId: string,
  unitId: string,
): Promise<ControllerRow | undefined> {
  const result = await sql<ControllerRow>`
    select doctrine, admission_source from encounter_ai_controllers
    where encounter_id = ${encounterId} and unit_id = ${unitId}
  `.execute(transaction);
  return result.rows[0];
}

interface TransitionAuthority {
  readonly kind: 'account' | 'system_ai' | 'system_timeout';
  readonly accountId: string | null;
  readonly digest: Buffer;
  readonly activationPolicyId: string | null;
  readonly campaignTick: string | null;
}

interface ActivationPolicyRow {
  readonly activation_id: string;
  readonly activation_epoch: number;
  readonly account_id: string;
  readonly unit_id: string;
  readonly policy_version: string;
  readonly mode: 'HUMAN' | 'AFK';
  readonly started_at: Date;
  readonly deadline_at: Date;
  readonly campaign_tick: string;
  readonly timeout_command_id: string;
}

async function persistTransition(
  transaction: Transaction<DatabaseSchema>,
  encounter: EncounterStoredRow,
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
  let nextPolicy: Omit<ActivationPolicyRow, 'activation_epoch'> | undefined;
  let clearAfkAccountId: string | undefined;
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
      aiWakeAt = null;
      if (encounter.schema_version === combat.COMBAT_V2_SCHEMA_VERSION) {
        const participantResult = await sql<ParticipantRow & { readonly account_id: string }>`
          select account_id, side_id, unit_ids, admission_source, afk,
            resume_requested_after_epoch
          from encounter_participants
          where encounter_id = ${encounter.id}
            and unit_ids @> ${JSON.stringify([nextActor])}::jsonb
        `.execute(transaction);
        const participant = participantResult.rows[0];
        if (
          participant === undefined ||
          participant.admission_source !== 'company_binding' ||
          !Array.isArray(participant.unit_ids) ||
          !participant.unit_ids.includes(nextActor!)
        )
          return undefined;
        const resumeRequested =
          participant.resume_requested_after_epoch !== null &&
          participant.resume_requested_after_epoch !== undefined;
        const mode =
          participant.afk === true &&
          !(
            participant.resume_requested_after_epoch !== null &&
            participant.resume_requested_after_epoch !== undefined &&
            participant.resume_requested_after_epoch <= encounter.activation_epoch
          )
            ? 'AFK'
            : 'HUMAN';
        const policyVersion = mode === 'AFK' ? AFK_POLICY_VERSION : HUMAN_POLICY_VERSION;
        const startedAt = new Date();
        const deadline = new Date(
          startedAt.getTime() +
            (mode === 'AFK' ? AFK_ACTIVATION_DEADLINE_MS : HUMAN_ACTIVATION_DEADLINE_MS),
        );
        const activationId = nextActivation?.id;
        if (!activationId || authority.campaignTick === null) return undefined;
        nextPolicy = {
          activation_id: activationId,
          account_id: participant.account_id,
          unit_id: nextActor!,
          policy_version: policyVersion,
          mode,
          started_at: startedAt,
          deadline_at: deadline,
          campaign_tick: authority.campaignTick,
          timeout_command_id: firstHuntTimeoutCommandId(encounter.id, activationId, policyVersion),
        };
        deadlineAt = deadline;
        if (resumeRequested) clearAfkAccountId = participant.account_id;
      } else {
        deadlineAt = new Date(Date.now() + HUMAN_ACTIVATION_DEADLINE_MS);
      }
    } else {
      deadlineAt = null;
      aiWakeAt = new Date();
    }
  }

  let timedOutAccountId: string | undefined;
  if (authority.kind === 'system_timeout' && authority.activationPolicyId !== null) {
    const policy = await transaction
      .selectFrom('encounter_activation_policies')
      .select(['account_id', 'unit_id'])
      .where('encounter_id', '=', encounter.id)
      .where('activation_id', '=', authority.activationPolicyId)
      .executeTakeFirst();
    if (!policy) return undefined;
    timedOutAccountId = policy.account_id;
  }
  if (timedOutAccountId !== undefined) {
    await sql`
      update encounter_participants set afk = true
      where encounter_id = ${encounter.id} and account_id = ${timedOutAccountId}
    `.execute(transaction);
  }
  if (clearAfkAccountId !== undefined) {
    await sql`
      update encounter_participants set afk = false, resume_requested_after_epoch = null
      where encounter_id = ${encounter.id} and account_id = ${clearAfkAccountId}
    `.execute(transaction);
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
      (encounter_id, revision, command_id, account_id, source_kind,
       activation_policy_id, campaign_tick, body_digest, command)
    values
      (${encounter.id}, ${result.state.revision}, ${commandId}, ${authority.accountId},
       ${authority.kind}, ${authority.activationPolicyId}, ${authority.campaignTick},
       ${authority.digest}, ${JSON.stringify(command)}::json)
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
  if (nextPolicy !== undefined) {
    const activationEpoch = encounter.activation_epoch + (activationStarted ? 1 : 0);
    await transaction
      .insertInto('encounter_activation_policies')
      .values({
        encounter_id: encounter.id,
        ...nextPolicy,
        activation_epoch: activationEpoch,
      })
      .execute();
  }
  if (
    result.state.status === 'resolved' &&
    encounter.schema_version === combat.COMBAT_V2_SCHEMA_VERSION
  ) {
    await transaction
      .updateTable('encounter_admissions')
      .set({ terminal_revision: result.state.revision })
      .where('encounter_id', '=', encounter.id)
      .where('terminal_revision', 'is', null)
      .execute();
  }
  await sql`
    insert into encounter_receipts
      (encounter_id, command_id, receipt_id, account_id, source_kind,
       activation_policy_id, body_digest, response, resulting_revision)
    values
      (${encounter.id}, ${commandId}, ${response.receiptId}, ${authority.accountId},
       ${authority.kind}, ${authority.activationPolicyId}, ${authority.digest}, ${JSON.stringify(response)}::jsonb,
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
    select account_id, side_id, unit_ids, admission_source, afk, resume_requested_after_epoch
    from encounter_participants
    where encounter_id = ${encounterId} and account_id = ${accountId}
  `.execute(transaction);
  return result.rows[0];
}

function hasValidParticipantGrant(
  admitted: ParticipantRow,
  units: readonly Pick<combat.BattleState['units'][number], 'id' | 'sideId'>[],
): admitted is ParticipantRow & { readonly side_id: string; readonly unit_ids: readonly string[] } {
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

function hasCombatUnitIdentities(
  units: readonly unknown[],
): units is readonly Pick<combat.BattleState['units'][number], 'id' | 'sideId'>[] {
  return units.every((unit) => {
    if (unit === null || typeof unit !== 'object' || Array.isArray(unit)) return false;
    const record = unit as Record<string, unknown>;
    return typeof record['id'] === 'string' && typeof record['sideId'] === 'string';
  });
}

export async function executeEncounterCommand(
  database: Kysely<DatabaseSchema>,
  accountId: string,
  dto: EncounterCommandDto,
  activeCompanyBinding = false,
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
      select account_id, source_kind, activation_policy_id, receipt_id, body_digest,
        response, resulting_revision
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

    const encounterResult = await sql<EncounterStoredRow>`
      select id, world_id, schema_version, setup, state, revision, status, activation_id,
        activation_epoch, deadline_at, ai_wake_at from encounters
      where id = ${dto.encounterId} for update
    `.execute(transaction);
    const encounter = encounterResult.rows[0];
    if (encounter === undefined) return rejected('NOT_FOUND');
    const participantUnits = (encounter.state as { readonly units?: unknown } | null)?.units;
    if (!Array.isArray(participantUnits) || !hasCombatUnitIdentities(participantUnits))
      return rejected('CONFLICT');
    const fixtureEncounter = encounter.schema_version === FIXTURE_SCHEMA_VERSION;
    const companyBindingEncounter =
      encounter.schema_version === combat.COMBAT_V2_SCHEMA_VERSION &&
      admitted.admission_source === 'company_binding';
    if (
      (!fixtureEncounter && (!companyBindingEncounter || !activeCompanyBinding)) ||
      (fixtureEncounter && admitted.admission_source !== 'fixture') ||
      !hasValidParticipantGrant(admitted, participantUnits)
    )
      return rejected('UNAUTHORIZED');

    const racedReceiptResult = await sql<ReceiptRow>`
      select account_id, source_kind, activation_policy_id, receipt_id, body_digest,
        response, resulting_revision
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
      actor === undefined ||
      actor.sideId !== admitted.side_id ||
      !admitted.unit_ids.includes(dto.actorId) ||
      state.activation?.unitId !== actor.id ||
      state.activation.id !== dto.activationId ||
      aiController !== undefined
    ) {
      return rejected('UNAUTHORIZED');
    }
    const nowMs = Date.now();
    if (encounter.deadline_at === null || encounter.deadline_at.getTime() <= nowMs)
      return rejected('CONFLICT');

    let activationPolicyId: string | null = null;
    let commandTick: string | null = null;
    if (companyBindingEncounter) {
      const policy = await transaction
        .selectFrom('encounter_activation_policies')
        .selectAll()
        .where('encounter_id', '=', encounter.id)
        .where('activation_id', '=', dto.activationId)
        .executeTakeFirst();
      if (
        !policy ||
        policy.account_id !== accountId ||
        policy.unit_id !== dto.actorId ||
        policy.mode !== 'HUMAN' ||
        policy.deadline_at.getTime() !== encounter.deadline_at.getTime() ||
        policy.activation_epoch !== encounter.activation_epoch
      )
        return rejected('UNAUTHORIZED');
      activationPolicyId = policy.activation_id;
      commandTick = await campaignTickAtRequest(transaction, encounter.world_id ?? WORLD_ID, nowMs);
      if (commandTick === null) return rejected('CONFLICT');
    }

    const command = toCombatCommand(dto);
    const acceptedResponse = await persistTransition(transaction, encounter, command, {
      kind: 'account',
      accountId,
      digest,
      activationPolicyId,
      campaignTick: commandTick,
    });
    return acceptedResponse ?? rejected('INVALID_COMMAND');
  });
}

export async function requestEncounterResume(
  database: Kysely<DatabaseSchema>,
  accountId: string,
  encounterId: string,
): Promise<
  { readonly version: 1; readonly encounterId: string; readonly afterEpoch: number } | undefined
> {
  return database.transaction().execute(async (transaction) => {
    const encounterResult = await sql<EncounterStoredRow>`
      select id, world_id, schema_version, setup, state, revision, status, activation_id,
        activation_epoch, deadline_at, ai_wake_at
      from encounters where id = ${encounterId} for update
    `.execute(transaction);
    const encounter = encounterResult.rows[0];
    if (
      encounter === undefined ||
      encounter.schema_version !== combat.COMBAT_V2_SCHEMA_VERSION ||
      encounter.status !== 'active' ||
      encounter.activation_id === null ||
      !(await replayMatches(transaction, encounter))
    )
      return undefined;

    const participantResult = await sql<{
      readonly unit_ids: unknown;
      readonly admission_source: 'fixture' | 'company_binding';
      readonly afk: boolean;
      readonly resume_requested_after_epoch: number | null;
    }>`
      select unit_ids, admission_source, afk, resume_requested_after_epoch
      from encounter_participants
      where encounter_id = ${encounterId} and account_id = ${accountId}
    `.execute(transaction);
    const participant = participantResult.rows[0];
    if (
      participant?.admission_source !== 'company_binding' ||
      participant.afk !== true ||
      !Array.isArray(participant.unit_ids) ||
      participant.unit_ids.length === 0
    )
      return undefined;

    const afterEpoch = encounter.activation_epoch;
    if (participant.resume_requested_after_epoch !== afterEpoch) {
      const updated = await sql`
        update encounter_participants set resume_requested_after_epoch = ${afterEpoch}
        where encounter_id = ${encounterId} and account_id = ${accountId} and afk = true
      `.execute(transaction);
      if (Number(updated.numAffectedRows) !== 1) return undefined;
    }
    return { version: 1, encounterId, afterEpoch };
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
      and exists (
        select 1 from encounter_ai_controllers as controller
        where controller.encounter_id = encounters.id
          and controller.unit_id = encounters.state #>> '{activation,unitId}'
          and ${aiWakeAdmissionAuthority(
            sql.ref('encounters.id'),
            sql.ref('encounters.world_id'),
            sql.ref('encounters.schema_version'),
            sql.ref('controller.admission_source'),
          )}
      )
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
    const encounterResult = await sql<EncounterStoredRow>`
      select id, world_id, schema_version, setup, state, revision, status, activation_id,
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
      activation.id !== wake.activationId
    )
      return undefined;

    const controller = await controllerFor(transaction, encounter.id, activation.unitId);
    const fixtureAi =
      encounter.schema_version === FIXTURE_SCHEMA_VERSION &&
      encounter.setup.schemaVersion === combat.COMBAT_SCHEMA_VERSION &&
      encounter.setup.rulesetId === combat.M0_COMBAT_RULESET_ID &&
      controller?.admission_source === 'fixture';
    const worldHostileAi =
      encounter.schema_version === combat.COMBAT_V2_SCHEMA_VERSION &&
      encounter.setup.schemaVersion === combat.COMBAT_V2_SCHEMA_VERSION &&
      (encounter.setup.rulesetId === combat.M1_DOMAIN_BRIDGE_RULESET_ID ||
        encounter.setup.rulesetId === combat.M1_DOMAIN_BRIDGE_V2_RULESET_ID) &&
      controller?.admission_source === 'world_hostile';
    const admissionAuthority = await sql<{ readonly accepted: boolean }>`
      select ${aiWakeAdmissionAuthority(
        sql.val(encounter.id),
        sql.val(encounter.world_id ?? WORLD_ID),
        sql.val(encounter.schema_version),
        sql.val(controller?.admission_source ?? ''),
      )} as accepted
    `.execute(transaction);
    if (
      (!fixtureAi && !worldHostileAi) ||
      admissionAuthority.rows[0]?.accepted !== true ||
      !(await replayMatches(transaction, encounter))
    )
      return undefined;
    const command = combat.chooseAiCommand(encounter.state, controller.doctrine);
    const nowMs = Date.now();
    const commandTick = worldHostileAi
      ? await campaignTickAtRequest(transaction, encounter.world_id ?? WORLD_ID, nowMs)
      : null;
    if (worldHostileAi && commandTick === null) return undefined;
    return persistTransition(transaction, encounter, command, {
      kind: 'system_ai',
      accountId: null,
      digest: createHash('sha256')
        .update(JSON.stringify(['system_ai', encounter.id, command]))
        .digest(),
      activationPolicyId: null,
      campaignTick: commandTick,
    });
  });
}

export interface EncounterTimeout {
  readonly encounterId: string;
  readonly revision: number;
  readonly activationId: string;
  readonly activationEpoch: number;
  readonly dueAt: Date;
}

export async function listDueEncounterTimeouts(
  database: Kysely<DatabaseSchema>,
  now = new Date(),
): Promise<readonly EncounterTimeout[]> {
  const result = await sql<{
    readonly id: string;
    readonly revision: number;
    readonly activation_id: string | null;
    readonly activation_epoch: number;
    readonly deadline_at: Date | null;
  }>`
    select id, revision, activation_id, activation_epoch, deadline_at
    from encounters
    where status = 'active' and deadline_at <= ${now}
      and exists (
        select 1 from encounter_activation_policies as policy
        where policy.encounter_id = encounters.id
          and policy.activation_id = encounters.activation_id
          and policy.activation_epoch = encounters.activation_epoch
          and policy.deadline_at = encounters.deadline_at
      )
    order by deadline_at asc, id asc
  `.execute(database);
  return result.rows.flatMap((row) =>
    row.activation_id === null || row.deadline_at === null
      ? []
      : [
          {
            encounterId: row.id,
            revision: row.revision,
            activationId: row.activation_id,
            activationEpoch: row.activation_epoch,
            dueAt: row.deadline_at,
          },
        ],
  );
}

export async function executeEncounterTimeout(
  database: Kysely<DatabaseSchema>,
  timeout: EncounterTimeout,
  now = new Date(),
): Promise<EncounterCommandResponse | undefined> {
  return database.transaction().execute(async (transaction) => {
    const encounterResult = await sql<EncounterStoredRow>`
      select id, world_id, schema_version, setup, state, revision, status, activation_id,
        activation_epoch, deadline_at, ai_wake_at
      from encounters where id = ${timeout.encounterId} for update
    `.execute(transaction);
    const encounter = encounterResult.rows[0];
    if (
      encounter === undefined ||
      encounter.schema_version !== combat.COMBAT_V2_SCHEMA_VERSION ||
      encounter.setup.schemaVersion !== combat.COMBAT_V2_SCHEMA_VERSION ||
      encounter.status !== 'active' ||
      encounter.revision !== timeout.revision ||
      encounter.activation_id !== timeout.activationId ||
      encounter.activation_epoch !== timeout.activationEpoch ||
      encounter.deadline_at === null ||
      encounter.deadline_at.getTime() !== timeout.dueAt.getTime() ||
      encounter.deadline_at.getTime() > now.getTime() ||
      encounter.ai_wake_at !== null ||
      encounter.state.activation?.id !== timeout.activationId
    )
      return undefined;

    const policy = await transaction
      .selectFrom('encounter_activation_policies')
      .selectAll()
      .where('encounter_id', '=', encounter.id)
      .where('activation_id', '=', timeout.activationId)
      .executeTakeFirst();
    const actorId = encounter.state.activation.unitId;
    const participant = await transaction
      .selectFrom('encounter_participants')
      .select(['account_id', 'unit_ids', 'admission_source'])
      .where('encounter_id', '=', encounter.id)
      .where('account_id', '=', policy?.account_id ?? '')
      .executeTakeFirst();
    if (
      !policy ||
      policy.activation_epoch !== timeout.activationEpoch ||
      policy.unit_id !== actorId ||
      policy.deadline_at.getTime() !== encounter.deadline_at.getTime() ||
      participant?.admission_source !== 'company_binding' ||
      !Array.isArray(participant.unit_ids) ||
      !participant.unit_ids.includes(actorId) ||
      (await controllerFor(transaction, encounter.id, actorId)) !== undefined ||
      !(await replayMatches(transaction, encounter))
    )
      return undefined;

    const tick = await campaignTickAtRequest(
      transaction,
      encounter.world_id ?? WORLD_ID,
      now.getTime(),
    );
    if (tick === null) return undefined;
    const commandId = firstHuntTimeoutCommandId(
      encounter.id,
      policy.activation_id,
      policy.policy_version,
    );
    if (commandId !== policy.timeout_command_id) return undefined;
    const command: combat.CombatCommand = {
      type: 'wait',
      commandId: combat.commandId(commandId),
      activationId: policy.activation_id,
      actorId: combat.unitId(policy.unit_id),
    };
    return persistTransition(transaction, encounter, command, {
      kind: 'system_timeout',
      accountId: null,
      digest: systemCommandDigest('system_timeout', encounter.id, command),
      activationPolicyId: policy.activation_id,
      campaignTick: tick,
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
      const result = await sql<EncounterStoredRow>`
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

export async function verifyEncounterReplay(
  database: Kysely<DatabaseSchema>,
  encounterId: string,
): Promise<boolean> {
  return database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute(async (transaction) => {
      const encounterResult = await sql<EncounterStoredRow>`
        select id, schema_version, setup, state, revision, status, activation_id,
          activation_epoch, deadline_at, ai_wake_at
        from encounters where id = ${encounterId}
      `.execute(transaction);
      const encounter = encounterResult.rows[0];
      return encounter === undefined ? false : replayMatches(transaction, encounter);
    });
}
