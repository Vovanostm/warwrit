import { executeCommandTransaction } from '../db/command-transaction.js';
import { settleDueContinuousMovementInTransaction } from '../world/continuous-movement.js';
import { randomUUID } from 'node:crypto';

import {
  canonicalJson,
  canPerform,
  huntProfile,
  ORDINARY_CONTRACT_PROFILES,
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryStepBlocker,
  prepareOrdinaryContractCommand,
  readOrdinaryContractState,
  type CompanyCombatAggregateState,
  type ContractPlace,
  type OrdinaryContractProfile,
  type OrdinaryContractState,
  type OrdinaryStepGate,
} from '@warwrit/game-core';
import type {
  OrdinaryContractBoardDto,
  OrdinaryContractCommandDto,
  OrdinaryContractCommandResponseDto,
  OrdinaryContractDto,
} from '@warwrit/protocol';
import { isOrdinaryContractCommand } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Kysely, Transaction } from 'kysely';

import { resolveSessionAccount } from '../auth/session.js';
import { persistContractRewardPayment } from '../company/contract-payout.js';
import { catchUpStationaryCompany } from '../company/executor.js';
import {
  findOwnedCompanyId,
  loadCompanyAggregate,
  lockCompanyAggregate,
} from '../company/repository.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock, readWorldLight } from '../world/clock.js';
import {
  ensureFirstHuntGenesisInTransaction,
  ensureHuntGenesisInTransaction,
  type FirstHuntHostileState,
} from './first-hunt-runtime.js';

const MILL_BEAST = huntProfile('ci.m1.mill-beast.01')!;

type Rejection = Extract<OrdinaryContractCommandResponseDto, { ok: false }>['code'];

/** Where the company's single field party stands still, or null while moving or fighting. */
function standingPlace(state: CompanyCombatAggregateState): ContractPlace | null {
  const lifecycle = state.economy.lifecycle;
  for (const party of lifecycle.parties) {
    if (party.location.kind !== 'AT') continue;
    const members = lifecycle.characters.filter(
      (character) => character.presence.fieldPartyId === party.partyId,
    );
    const first = members[0]?.presence.location;
    if (
      first?.kind === 'AT' &&
      members.every(
        (character) =>
          character.presence.location.kind === 'AT' &&
          character.presence.location.siteId === first.siteId &&
          character.presence.location.areaId === first.areaId &&
          character.presence.encounterBindingId === null &&
          canPerform(character, 'travel'),
      )
    )
      return { siteId: first.siteId, areaId: first.areaId };
  }
  return null;
}

async function ensureOrdinaryGenesis(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<void> {
  for (const profile of ORDINARY_CONTRACT_PROFILES) {
    await transaction
      .insertInto('ordinary_contracts')
      .values({
        world_id: worldId,
        instance_id: profile.instanceId,
        profile_id: profile.definitionId,
        revision: '0',
        wallet_id: profile.walletId,
        wallet_q: profile.genesisWalletQ,
        state: ordinaryContractGenesis(profile),
      })
      .onConflict((conflict) => conflict.columns(['world_id', 'instance_id']).doNothing())
      .execute();
  }
}

/** World conditions read from authoritative state; never from the client. */
async function readGates(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<Readonly<Record<OrdinaryStepGate, boolean>>> {
  const clock = await readWorldClock(transaction, worldId);
  const allDead = (state: { readonly hostiles: readonly FirstHuntHostileState[] }) =>
    state.hostiles.every((hostile) => hostile.currentPools['health'] === 0);
  const raiders = await ensureFirstHuntGenesisInTransaction(transaction, worldId);
  const beast = await ensureHuntGenesisInTransaction(transaction, worldId, MILL_BEAST);
  return {
    DAYLIGHT: readWorldLight(clock).phase === 'DAY',
    RAIDERS_DEFEATED: allDead(raiders),
    BEAST_DEFEATED: allDead(beast),
  };
}

function contractView(
  profile: OrdinaryContractProfile,
  state: OrdinaryContractState,
  companyId: string | undefined,
  standingAt: ContractPlace | null,
  gates: Readonly<Record<OrdinaryStepGate, boolean>>,
): OrdinaryContractDto {
  const role =
    companyId && companyId === state.ownerCompanyId
      ? 'OWNER'
      : companyId && companyId === state.helperCompanyId
        ? 'HELPER'
        : 'NONE';
  const atIssuer =
    standingAt?.siteId === profile.issuerPlace.siteId &&
    standingAt.areaId === profile.issuerPlace.areaId;
  return {
    instanceId: profile.instanceId,
    template: profile.template,
    issuerRoleId: profile.issuerRoleId,
    issuerLocation: profile.issuerPlace,
    rewardQ: profile.rewardQ,
    revision: state.revision,
    yourRole: role,
    helperSlot: state.helperCompanyId === null ? 'AVAILABLE' : 'OCCUPIED',
    state: state.outcome ? 'COMPLETED' : state.ownerCompanyId ? 'ACTIVE' : 'OFFERED',
    completedByYou: state.outcome !== null && state.outcome.companyId === companyId,
    canAccept:
      companyId !== undefined &&
      state.outcome === null &&
      state.ownerCompanyId === null &&
      atIssuer,
    canHelp:
      companyId !== undefined &&
      state.outcome === null &&
      state.ownerCompanyId !== null &&
      state.ownerCompanyId !== companyId &&
      state.helperCompanyId === null &&
      atIssuer,
    steps: profile.steps.map((step) => ({
      stepId: step.stepId,
      action: step.action,
      location: step.place,
      doneByYou:
        companyId !== undefined &&
        step.produces.every((slotId) =>
          state.facts.some((fact) => fact.companyId === companyId && fact.slotId === slotId),
        ),
      blocker:
        companyId === undefined
          ? 'NOT_A_PARTICIPANT'
          : ordinaryStepBlocker(state, step, { companyId, standingAt, gates }),
      completes: step.completes === true,
    })),
    yourCustody: state.custody
      .filter((entry) => entry.companyId === companyId)
      .map((entry) => entry.personId),
  };
}

function isAccepted(
  value: unknown,
  commandId: string,
): value is Extract<OrdinaryContractCommandResponseDto, { ok: true }> {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)['ok'] === true &&
    (value as Record<string, unknown>)['commandId'] === commandId
  );
}

async function executeOrdinaryCommand(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly worldId: string;
    readonly accountId: string;
    readonly request: OrdinaryContractCommandDto;
    readonly requestKey: string;
  },
): Promise<OrdinaryContractCommandResponseDto> {
  const { worldId, accountId, request, requestKey } = input;
  const reject = (code: Rejection): OrdinaryContractCommandResponseDto => ({
    schemaVersion: 1,
    commandId: request.commandId,
    ok: false,
    code,
  });
  const profile = ordinaryContractProfile(request.instanceId);
  if (!profile) return reject('NOT_AVAILABLE');
  const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
  if (!companyId) return reject('NOT_AUTHORIZED');
  await ensureOrdinaryGenesis(transaction, worldId);

  const row = await transaction
    .selectFrom('ordinary_contracts')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId)
    .forUpdate()
    .executeTakeFirst();
  if (!row) return reject('NOT_AVAILABLE');
  if (!(await lockCompanyAggregate(transaction, worldId, companyId)))
    return reject('NOT_AUTHORIZED');

  const prior = await transaction
    .selectFrom('ordinary_contract_receipts')
    .select(['request_key', 'response'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where('command_id', '=', request.commandId)
    .executeTakeFirst();
  if (prior) {
    if (prior.request_key !== requestKey || !isAccepted(prior.response, request.commandId))
      return reject('INVALID_COMMAND');
    return prior.response;
  }

  // The party cannot depart while this command holds its route row.
  await transaction
    .selectFrom('world_party_routes')
    .select('party_id')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .forUpdate()
    .execute();
  let company = await loadCompanyAggregate(transaction, worldId, companyId);
  if (!company) return reject('NOT_AUTHORIZED');
  const clock = await readWorldClock(transaction, worldId, new Date(), true);
  company = await settleDueContinuousMovementInTransaction(transaction, company, accountId, clock);
  const gates = await readGates(transaction, worldId);
  const state = readOrdinaryContractState(profile, row.state);
  const prepared = prepareOrdinaryContractCommand(
    profile,
    state,
    request.type === 'STEP'
      ? { type: 'STEP', stepId: request.stepId ?? '' }
      : { type: request.type },
    {
      companyId,
      standingAt: standingPlace(company),
      atTick: clock.tick,
      expectedRevision: request.expectedRevision,
      sourceEventId: `ordinary-contract:${profile.instanceId}:${request.commandId}`,
      gates,
    },
  );
  if (prepared.kind === 'REJECTED') return reject(prepared.code);

  let walletQ = BigInt(row.wallet_q);
  if (prepared.payout) {
    const rewardQ = BigInt(prepared.payout.rewardQ);
    if (walletQ < rewardQ) return reject('INSUFFICIENT_FUNDS');
    // Settle the time the party has stood still first, so the payment is an exact delta.
    const caughtUp = await catchUpStationaryCompany({
      transaction,
      accountId,
      state: company,
      atTick: clock.tick,
      requestKind: 'ORDINARY_CONTRACT_PAYOUT_CATCH_UP',
    });
    if (caughtUp === undefined) return reject('NOT_AVAILABLE');
    company = caughtUp;
    walletQ -= rewardQ;
  }

  const response: OrdinaryContractCommandResponseDto = {
    schemaVersion: 1,
    commandId: request.commandId,
    ok: true,
    revision: prepared.next.revision,
    rewardQ: prepared.payout?.rewardQ ?? null,
  };
  if (prepared.payout) {
    await persistContractRewardPayment(transaction, {
      previous: company,
      issuerWalletId: profile.walletId,
      rewardQ: prepared.payout.rewardQ,
      atTick: clock.tick,
      commandId: request.commandId,
      receiptId: randomUUID(),
      requestKey,
      response,
      event: {
        schemaVersion: 1,
        type: 'ContractRewardPaid',
        instanceId: profile.instanceId,
        rewardQ: prepared.payout.rewardQ,
      },
    });
  }
  const updated = await transaction
    .updateTable('ordinary_contracts')
    .set({ revision: prepared.next.revision, state: prepared.next, wallet_q: walletQ.toString() })
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId)
    .where('revision', '=', state.revision)
    .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1) throw new Error('Ordinary contract CAS failed');
  await transaction
    .insertInto('ordinary_contract_receipts')
    .values({
      world_id: worldId,
      company_id: companyId,
      command_id: request.commandId,
      instance_id: profile.instanceId,
      request_key: requestKey,
      response,
    })
    .execute();
  return response;
}

export function registerOrdinaryContractRoutes(
  app: FastifyInstance,
  options: { readonly database: Kysely<DatabaseSchema>; readonly worldId: string },
): void {
  const { database, worldId } = options;

  app.get('/contracts/board', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const body = await database.transaction().execute(async (transaction) => {
      await ensureOrdinaryGenesis(transaction, worldId);
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      const company = companyId
        ? await loadCompanyAggregate(transaction, worldId, companyId)
        : undefined;
      const standingAt = company ? standingPlace(company) : null;
      const gates = await readGates(transaction, worldId);
      const rows = await transaction
        .selectFrom('ordinary_contracts')
        .select(['instance_id', 'state'])
        .where('world_id', '=', worldId)
        .execute();
      const contracts = ORDINARY_CONTRACT_PROFILES.flatMap((profile) => {
        const row = rows.find((entry) => entry.instance_id === profile.instanceId);
        return row
          ? [
              contractView(
                profile,
                readOrdinaryContractState(profile, row.state),
                companyId,
                standingAt,
                gates,
              ),
            ]
          : [];
      });
      const board: OrdinaryContractBoardDto = { schemaVersion: 1, contracts };
      return board;
    });
    reply.header('cache-control', 'no-store');
    return body;
  });

  app.post('/contracts/ordinary/commands', { bodyLimit: 1024 }, async (request, reply) => {
    if (!isOrdinaryContractCommand(request.body))
      return reply.code(400).send({ error: 'invalid command' });
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const body = request.body;
    const response = await executeCommandTransaction(
      database,
      (transaction) =>
        executeOrdinaryCommand(transaction, {
          worldId,
          accountId,
          request: body,
          requestKey: canonicalJson(body),
        }),
      (result) => result.ok,
    );
    const status = response.ok ? 200 : response.code === 'NOT_AUTHORIZED' ? 403 : 409;
    return reply.code(status).send(response);
  });
}
