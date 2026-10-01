import { randomUUID } from 'node:crypto';
import {
  availableContainerG,
  campaignTick,
  canonicalRevision,
  COMPANY_CATALOGUE,
  canonicalJson,
  canPerform,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_PROFILE_ID,
  FIRST_HUNT_PROOF_ID,
  FIRST_HUNT_PROOF_DEFINITION_ID,
  publicRevision,
  readCompanyCombatAggregateState,
  receiveExternalPayment,
  prepareFirstHuntLifecycleTransition,
  type CompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  FirstHuntPickupTargetDto,
  FirstHuntCommandDto,
  FirstHuntCommandResponseDto,
  FirstHuntReadResponseDto,
} from '@warwrit/protocol';
import { isFirstHuntCommand } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Kysely, Transaction } from 'kysely';

import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { findOwnedCompanyId, loadCompanyAggregate } from '../company/repository.js';
import { lockCompanyAggregate } from '../company/repository.js';
import { persistFirstHuntCompanyTransition } from '../company/executor.js';
import { admitFirstHuntInTransaction } from '../encounters/admission.js';
import { readWorldClock } from '../world/clock.js';
import { readFirstHuntReceipt, persistFirstHuntReceipt } from './repository.js';
import {
  canFirstHuntHelperOptIn,
  canFirstHuntParticipantLeave,
  isFirstHuntProofCustodian,
  prepareFirstHuntProofPickup,
} from './executor.js';
import {
  ensureFirstHuntGenesis,
  ensureFirstHuntGenesisInTransaction,
  FIRST_HUNT_TERMS,
  readFirstHuntWorldState,
} from './first-hunt-runtime.js';

type ContractRow = DatabaseSchema['contract_instances'];

export function registerFirstHuntRoutes(
  app: FastifyInstance,
  options: { readonly database: Kysely<DatabaseSchema>; readonly worldId: string },
): void {
  const { database, worldId } = options;

  app.get('/contracts/first-hunt', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const companyId = await database
      .transaction()
      .execute((transaction) => findOwnedCompanyId(transaction, worldId, accountId));
    await ensureFirstHuntGenesis(database, worldId);
    const response = await database.transaction().execute(async (transaction) => {
      const contract = await readContract(transaction, worldId);
      if (!contract) return null;
      const admission = await transaction
        .selectFrom('encounter_admissions')
        .select(['encounter_id', 'effects_applied_at'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', FIRST_HUNT_INSTANCE_ID)
        .executeTakeFirst();
      const encounter = admission
        ? await transaction
            .selectFrom('encounters')
            .select(['id', 'status'])
            .where('id', '=', admission.encounter_id)
            .executeTakeFirst()
        : undefined;
      const proof = admission
        ? await transaction
            .selectFrom('world_proof_claims')
            .select([
              'item_id',
              'ground_item',
              'custodian_company_id',
              'redeemed_company_id',
              'redemption_receipt_id',
            ])
            .where('world_id', '=', worldId)
            .where('source_id', '=', proofSourceId(admission.encounter_id))
            .executeTakeFirst()
        : undefined;
      const role =
        companyId && contract.owner_company_id === companyId
          ? 'OWNER'
          : companyId && contract.helper_company_id === companyId
            ? 'HELPER'
            : 'NONE';
      const state = proof?.redemption_receipt_id
        ? 'SETTLED'
        : proof?.ground_item !== null && proof?.ground_item !== undefined
          ? 'PROOF_AVAILABLE'
          : proof?.custodian_company_id
            ? 'PROOF_HELD'
            : encounter?.status === 'active'
              ? 'ENCOUNTER_ACTIVE'
              : contract.owner_company_id
                ? 'ACTIVE'
                : 'OFFERED';
      const proofCompanyId =
        companyId &&
        (proof?.custodian_company_id === companyId || proof?.redeemed_company_id === companyId)
          ? companyId
          : undefined;
      const proofAggregate = proofCompanyId
        ? await loadCompanyAggregate(transaction, worldId, proofCompanyId)
        : undefined;
      const currentAggregate = companyId
        ? await loadCompanyAggregate(transaction, worldId, companyId)
        : undefined;
      const physicalProof = proofAggregate?.economy.physical?.items.find(
        (item) => item.itemId === proof?.item_id && item.tombstone === null,
      );
      const yourProof =
        proof && proofCompanyId && physicalProof?.containerId
          ? {
              itemId: proof.item_id,
              containerId: physicalProof.containerId,
              redemption: proof.redemption_receipt_id
                ? ('REDEEMED' as const)
                : ('UNREDEEMED' as const),
            }
          : null;
      const body: FirstHuntReadResponseDto = {
        schemaVersion: 1,
        publicRevision: contract.revision,
        contract: contract
          ? {
              instanceId: FIRST_HUNT_INSTANCE_ID,
              definitionEdition: FIRST_HUNT_PROFILE_ID,
              termsDigest: contract.terms_digest.toString('hex'),
              terms: FIRST_HUNT_TERMS,
              yourRole: role,
              knownState: state,
              yourJoinIntent:
                role === 'OWNER'
                  ? contract.owner_join !== null
                  : role === 'HELPER' && contract.helper_join !== null,
              helperSlot: contract.helper_company_id ? 'OCCUPIED' : 'AVAILABLE',
              encounterId: admission?.encounter_id ?? null,
              pickupTargets:
                companyId &&
                (role === 'OWNER' || role === 'HELPER') &&
                proof?.ground_item !== null &&
                proof?.ground_item !== undefined &&
                admission?.effects_applied_at !== null &&
                encounter?.status === 'resolved' &&
                currentAggregate &&
                isAtArea(
                  currentAggregate,
                  FIRST_HUNT_TERMS.objectiveLocation.siteId,
                  FIRST_HUNT_TERMS.objectiveLocation.areaId,
                ) &&
                currentAggregate.economy.lifecycle.characters.some(
                  (character) =>
                    character.presence.availability === 'AVAILABLE' &&
                    character.presence.encounterBindingId === null &&
                    character.presence.location.kind === 'AT' &&
                    character.presence.location.siteId ===
                      FIRST_HUNT_TERMS.objectiveLocation.siteId &&
                    character.presence.location.areaId ===
                      FIRST_HUNT_TERMS.objectiveLocation.areaId &&
                    canPerform(character, 'travel'),
                )
                  ? firstHuntPickupTargets(currentAggregate, companyId)
                  : [],
              yourProof,
            }
          : null,
      };
      return body;
    });
    reply.header('cache-control', 'no-store');
    return response;
  });

  app.post('/contracts/commands', { bodyLimit: 1024 }, async (request, reply) => {
    if (!isFirstHuntCommand(request.body))
      return reply.code(400).send({ error: 'invalid command' });
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const response = await executeContractCommand({
      database,
      worldId,
      accountId,
      request: request.body,
      requestKey: canonicalJson(request.body),
    });
    const status = response.ok ? 200 : response.code === 'NOT_AUTHORIZED' ? 403 : 409;
    return reply.code(status).send(response);
  });
}

async function executeContractCommand(input: {
  readonly database: Kysely<DatabaseSchema>;
  readonly worldId: string;
  readonly accountId: string;
  readonly request: FirstHuntCommandDto;
  readonly requestKey: string;
}): Promise<FirstHuntCommandResponseDto> {
  const { database, worldId, accountId, request, requestKey } = input;
  await ensureFirstHuntGenesis(database, worldId);
  return database.transaction().execute(async (transaction) => {
    const reject = (
      code: Extract<FirstHuntCommandResponseDto, { ok: false }>['code'],
      revision = '0',
    ): FirstHuntCommandResponseDto => ({
      schemaVersion: 1,
      commandId: request.commandId,
      ok: false,
      publicRevision: revision,
      code,
    });

    const account = await transaction
      .selectFrom('identity_accounts')
      .select('id')
      .where('id', '=', accountId)
      .forUpdate()
      .executeTakeFirst();
    if (!account) return reject('NOT_AUTHORIZED');
    const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
    if (!companyId) return reject('NOT_AUTHORIZED');

    const observedContract = await readContract(transaction, worldId);
    if (!observedContract || observedContract.profile_id !== FIRST_HUNT_PROFILE_ID)
      return reject('NOT_AVAILABLE');
    const lockedCompanyIds = [
      ...new Set([
        companyId,
        ...(observedContract.owner_company_id ? [observedContract.owner_company_id] : []),
        ...(observedContract.helper_company_id ? [observedContract.helper_company_id] : []),
      ]),
    ].toSorted(compareIds);
    for (const lockedCompanyId of lockedCompanyIds) {
      if (!(await lockCompanyAggregate(transaction, worldId, lockedCompanyId)))
        return reject('NOT_AUTHORIZED', observedContract.revision);
    }
    const snapshots = new Map<
      string,
      {
        readonly canonical_revision: string;
        readonly public_revision: string;
      }
    >();
    for (const lockedCompanyId of lockedCompanyIds) {
      const snapshot = await transaction
        .selectFrom('company_snapshots')
        .select(['canonical_revision', 'public_revision'])
        .where('world_id', '=', worldId)
        .where('company_id', '=', lockedCompanyId)
        .executeTakeFirst();
      if (snapshot) snapshots.set(lockedCompanyId, snapshot);
    }
    const snapshot = snapshots.get(companyId);
    if (!snapshot) return reject('NOT_AUTHORIZED', observedContract.revision);

    const prior = await readFirstHuntReceipt(transaction, {
      worldId,
      companyId,
      commandId: request.commandId,
    });
    if (prior) {
      if (prior.request_key !== requestKey) return reject('INVALID_COMMAND');
      const replay = readAcceptedResponse(prior.response, request.commandId);
      return replay ?? reject('INVALID_COMMAND');
    }

    await transaction
      .selectFrom('world_party_routes')
      .select('party_id')
      .where('world_id', '=', worldId)
      .where('company_id', 'in', lockedCompanyIds)
      .orderBy('party_id', 'asc')
      .forUpdate()
      .execute();
    const now = new Date();
    const clock = await readWorldClock(transaction, worldId, now, true);
    const world = await transaction
      .selectFrom('world_first_hunt_state')
      .selectAll()
      .where('world_id', '=', worldId)
      .forUpdate()
      .executeTakeFirst();
    if (!world) return reject('NOT_AVAILABLE');
    const worldState = readFirstHuntWorldState(worldId, world);

    const contract = await transaction
      .selectFrom('contract_instances')
      .selectAll()
      .where('world_id', '=', worldId)
      .where('instance_id', '=', request.payload.instanceId)
      .forUpdate()
      .executeTakeFirst();
    if (!contract || contract.profile_id !== FIRST_HUNT_PROFILE_ID) return reject('NOT_AVAILABLE');
    if (
      contract.owner_company_id !== observedContract.owner_company_id ||
      contract.helper_company_id !== observedContract.helper_company_id
    )
      return reject('NOT_AVAILABLE', contract.revision);
    const role =
      companyId === contract.owner_company_id
        ? 'OWNER'
        : companyId === contract.helper_company_id
          ? 'HELPER'
          : 'NONE';

    if (request.expectedPublicRevision !== contract.revision)
      return reject('STALE_REVISION', contract.revision);

    const companyStates = new Map<
      string,
      NonNullable<Awaited<ReturnType<typeof loadCompanyAggregate>>>
    >();
    for (const lockedCompanyId of lockedCompanyIds) {
      const value = await loadCompanyAggregate(transaction, worldId, lockedCompanyId);
      if (value) companyStates.set(lockedCompanyId, value);
    }
    const state = companyStates.get(companyId);
    if (!state) return reject('NOT_AUTHORIZED', contract.revision);
    const commandType = request.type;
    if (commandType === 'HELP') {
      const admission = await transaction
        .selectFrom('encounter_admissions')
        .select('encounter_id')
        .where('world_id', '=', worldId)
        .where('instance_id', '=', contract.instance_id)
        .forUpdate()
        .executeTakeFirst();
      if (!canFirstHuntHelperOptIn(admission !== undefined))
        return reject('NOT_AVAILABLE', contract.revision);
    }
    let encounterActive = false;
    if (commandType === 'LEAVE') {
      const admission = await transaction
        .selectFrom('encounter_admissions')
        .select(['encounter_id', 'terminal_revision', 'effects_source_id', 'effects_applied_at'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', contract.instance_id)
        .forUpdate()
        .executeTakeFirst();
      const encounter = admission
        ? await transaction
            .selectFrom('encounters')
            .select(['status', 'revision'])
            .where('id', '=', admission.encounter_id)
            .forUpdate()
            .executeTakeFirst()
        : undefined;
      if (
        !canFirstHuntParticipantLeave({
          admission:
            admission === undefined
              ? undefined
              : {
                  terminalRevision: admission.terminal_revision,
                  effectsSourceId: admission.effects_source_id,
                  effectsAppliedAt: admission.effects_applied_at,
                },
          encounterStatus: encounter?.status,
          encounterRevision: encounter?.revision,
          expectedEffectsSourceId:
            admission && admission.terminal_revision !== null
              ? `first-hunt-terminal:${admission.encounter_id}:${admission.terminal_revision}`
              : undefined,
        })
      )
        return reject('NOT_AVAILABLE', contract.revision);
      encounterActive = encounter?.status === 'active';
    }
    if (BigInt(state.economy.lifecycle.campaignTick) > BigInt(clock.tick))
      return reject('NOT_AVAILABLE', contract.revision);
    const ownerJoin = readJoinIntent(contract.owner_join, contract.owner_company_id);
    const helperJoin = readJoinIntent(contract.helper_join, contract.helper_company_id);
    if (
      (contract.owner_join !== null && ownerJoin === undefined) ||
      (contract.helper_join !== null && helperJoin === undefined)
    )
      return reject('NOT_AVAILABLE', contract.revision);
    const atIssuer = isAtArea(
      state,
      FIRST_HUNT_TERMS.issuerLocation.siteId,
      FIRST_HUNT_TERMS.issuerLocation.areaId,
    );
    const atObjective =
      isAtArea(
        state,
        FIRST_HUNT_TERMS.objectiveLocation.siteId,
        FIRST_HUNT_TERMS.objectiveLocation.areaId,
      ) &&
      state.encounter.active === null &&
      !state.economy.lifecycle.parties.some((party) => party.location.kind === 'TRANSIT');
    if (commandType === 'PICKUP' || commandType === 'PRESENT') {
      if (commandType === 'PICKUP' && role !== 'OWNER' && role !== 'HELPER')
        return reject('NOT_AUTHORIZED', contract.revision);
      const admission = await transaction
        .selectFrom('encounter_admissions')
        .select(['encounter_id', 'terminal_revision', 'effects_applied_at'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', contract.instance_id)
        .forUpdate()
        .executeTakeFirst();
      const encounter = admission
        ? await transaction
            .selectFrom('encounters')
            .select(['id', 'status', 'revision'])
            .where('id', '=', admission.encounter_id)
            .forUpdate()
            .executeTakeFirst()
        : undefined;
      const proof = admission
        ? await transaction
            .selectFrom('world_proof_claims')
            .selectAll()
            .where('world_id', '=', worldId)
            .where('source_id', '=', proofSourceId(admission.encounter_id))
            .forUpdate()
            .executeTakeFirst()
        : undefined;
      if (
        !admission ||
        !encounter ||
        encounter.status !== 'resolved' ||
        admission.terminal_revision === null ||
        admission.terminal_revision !== encounter.revision ||
        admission.effects_applied_at === null ||
        !proof ||
        proof.item_id !== FIRST_HUNT_PROOF_ID
      )
        return reject('NOT_AVAILABLE', contract.revision);

      const nextRevision = (BigInt(contract.revision) + 1n).toString();
      const receiptId = randomUUID();
      if (commandType === 'PICKUP') {
        if (proof.ground_item === null || proof.custodian_company_id !== null || !atObjective)
          return reject('NOT_AVAILABLE', contract.revision);
        const prepared = prepareFirstHuntProofPickup({
          previous: state,
          accountId,
          request,
          worldId,
          campaignTick: clock.tick,
          encounterId: admission.encounter_id,
          groundItem: proof.ground_item,
        });
        if (prepared.kind !== 'PREPARED')
          return reject(
            prepared.code === 'CAPACITY' ? 'CAPACITY' : 'NOT_AVAILABLE',
            contract.revision,
          );
        const sourceId = proofSourceId(admission.encounter_id);
        const response = await persistFirstHuntCompanyTransition({
          transaction,
          accountId,
          previous: state,
          next: prepared.next,
          commandId: request.commandId,
          receiptId,
          requestKey,
          publicRevision: nextRevision,
          operation: 'PICKUP',
          itemId: FIRST_HUNT_PROOF_ID,
          transition: {
            operation: 'PICKUP',
            sourceId,
            targetContainerId: request.payload.toContainerId,
          },
        });
        const updated = await transaction
          .updateTable('contract_instances')
          .set({ revision: nextRevision })
          .where('world_id', '=', worldId)
          .where('instance_id', '=', contract.instance_id)
          .where('revision', '=', contract.revision)
          .executeTakeFirst();
        if (Number(updated.numUpdatedRows) !== 1)
          throw new Error('FIRST HUNT contract revision CAS failed');
        return response;
      }

      if (
        proof.ground_item !== null ||
        !isFirstHuntProofCustodian(companyId, proof.custodian_company_id) ||
        proof.redeemed_company_id !== null ||
        proof.redemption_receipt_id !== null ||
        !isAtArea(
          state,
          FIRST_HUNT_TERMS.issuerLocation.siteId,
          FIRST_HUNT_TERMS.issuerLocation.areaId,
        )
      )
        return reject('NOT_AVAILABLE', contract.revision);
      const physical = state.economy.physical;
      const proofItem = physical?.items.find(
        (item) => item.itemId === FIRST_HUNT_PROOF_ID && item.tombstone === null,
      );
      const proofContainer = proofItem?.containerId
        ? physical?.containers.find((container) => container.containerId === proofItem.containerId)
        : undefined;
      if (
        !proofItem ||
        proofItem.quantity !== 1 ||
        proofItem.owner.kind !== 'COMPANY' ||
        proofItem.owner.id !== companyId ||
        !proofContainer ||
        proofContainer.access !== 'COMPANY' ||
        proofContainer.closed !== null ||
        proofContainer.location.kind !== 'AT' ||
        proofContainer.location.siteId !== FIRST_HUNT_TERMS.issuerLocation.siteId ||
        proofContainer.location.areaId !== FIRST_HUNT_TERMS.issuerLocation.areaId
      )
        return reject('NOT_AVAILABLE', contract.revision);
      const activeCharacterIds = new Set<string>(
        state.economy.lifecycle.memberships
          .filter((membership) => membership.endedAt === null)
          .map((membership) => String(membership.characterId)),
      );
      if (
        (proofContainer.custodian.kind === 'COMPANY' &&
          proofContainer.custodian.id !== companyId) ||
        (proofContainer.custodian.kind === 'CHARACTER' &&
          !activeCharacterIds.has(proofContainer.custodian.id)) ||
        proofContainer.custodian.kind === 'WORLD'
      )
        return reject('NOT_AVAILABLE', contract.revision);

      const localPool = state.economy.finance.pools.find((pool) => pool.poolId === 'local');
      const recipient = localPool
        ? state.economy.finance.wallets.find(
            (wallet) =>
              wallet.walletId === localPool.walletId &&
              wallet.owner.kind === 'COMPANY' &&
              String(wallet.owner.id) === companyId,
          )
        : undefined;
      const rewardQ = BigInt(FIRST_HUNT_TERMS.rewardQ);
      if (!recipient) return reject('NOT_AVAILABLE', contract.revision);
      if (BigInt(worldState.walletQ) < rewardQ)
        return reject('INSUFFICIENT_FUNDS', contract.revision);
      const finance = receiveExternalPayment(state.economy.finance, {
        fromWalletId: worldState.walletId,
        toWalletId: recipient.walletId,
        recipient: { kind: 'COMPANY', id: companyId },
        amountQ: rewardQ,
        atTick: campaignTick(clock.tick),
        movementId: `first-hunt-presentation:${receiptId}`,
      });
      const nextCompanyRevision = canonicalRevision(
        (BigInt(state.economy.lifecycle.revision) + 1n).toString(),
      );
      const nextCompanyPublicRevision = publicRevision(
        (BigInt(state.economy.lifecycle.knowledge.revision) + 1n).toString(),
      );
      const next = readCompanyCombatAggregateState({
        ...state,
        economy: {
          ...state.economy,
          finance,
          lifecycle: {
            ...state.economy.lifecycle,
            revision: nextCompanyRevision,
            knowledge: {
              ...state.economy.lifecycle.knowledge,
              revision: nextCompanyPublicRevision,
            },
          },
        },
      });
      await persistFirstHuntCompanyTransition({
        transaction,
        accountId,
        previous: state,
        next,
        commandId: request.commandId,
        receiptId,
        requestKey,
        publicRevision: nextRevision,
        operation: 'PRESENT',
        itemId: FIRST_HUNT_PROOF_ID,
        transition: {
          operation: 'PRESENT',
          sourceId: proof.source_id,
          issuerWalletId: worldState.walletId,
          recipientWalletId: recipient.walletId,
          rewardQ: FIRST_HUNT_TERMS.rewardQ,
          atTick: clock.tick,
          worldWalletBeforeQ: worldState.walletQ,
          worldRevisionBefore: worldState.revision,
        },
        rewardQ: FIRST_HUNT_TERMS.rewardQ,
      });
      const updated = await transaction
        .updateTable('contract_instances')
        .set({ revision: nextRevision })
        .where('world_id', '=', worldId)
        .where('instance_id', '=', contract.instance_id)
        .where('revision', '=', contract.revision)
        .executeTakeFirst();
      if (Number(updated.numUpdatedRows) !== 1)
        throw new Error('FIRST HUNT contract revision CAS failed');
      return {
        schemaVersion: 1,
        commandId: request.commandId,
        ok: true,
        receiptId,
        publicRevision: nextRevision,
      };
    }
    const participation = prepareFirstHuntLifecycleTransition(
      {
        revision: contract.revision,
        ownerCompanyId: contract.owner_company_id,
        helperCompanyId: contract.helper_company_id,
        ownerJoin: ownerJoin ?? null,
        helperJoin: helperJoin ?? null,
      },
      commandType === 'ACCEPT' || commandType === 'HELP'
        ? {
            type: commandType,
            companyId,
            accountId,
            expectedRevision: request.expectedPublicRevision,
            expectedTermsDigest: contract.terms_digest.toString('hex'),
            termsDigest: request.payload.termsDigest,
            atIssuer,
          }
        : commandType === 'LEAVE'
          ? {
              type: commandType,
              companyId,
              accountId,
              expectedRevision: request.expectedPublicRevision,
              encounterActive,
            }
          : {
              type: commandType,
              companyId,
              accountId,
              expectedRevision: request.expectedPublicRevision,
              publicRevision: snapshot.public_revision,
              campaignTick: clock.tick,
              atObjective,
            },
    );
    if (participation.kind === 'REJECTED') return reject(participation.code, contract.revision);
    const nextRevision = participation.next.revision;
    const values = {
      owner_company_id: participation.next.ownerCompanyId,
      helper_company_id: participation.next.helperCompanyId,
      owner_join: participation.next.ownerJoin,
      helper_join: participation.next.helperJoin,
    };
    const proposedContract = { ...contract, ...values };
    const shouldActivate =
      commandType === 'JOIN' &&
      proposedContract.owner_join !== null &&
      (proposedContract.helper_company_id === null || proposedContract.helper_join !== null);
    const activeEncounterId = shouldActivate
      ? await admitFirstHuntInTransaction({
          transaction,
          worldId,
          contract: proposedContract,
          companyStates,
          world: worldState,
          atTick: clock.tick,
          now,
        })
      : undefined;
    if (shouldActivate && activeEncounterId === undefined)
      return reject('NOT_AVAILABLE', contract.revision);

    const committed = await transaction
      .updateTable('contract_instances')
      .set({ ...values, revision: nextRevision })
      .where('world_id', '=', worldId)
      .where('instance_id', '=', contract.instance_id)
      .where('revision', '=', contract.revision)
      .executeTakeFirst();
    if (Number(committed.numUpdatedRows) !== 1)
      throw new Error('FIRST HUNT contract revision CAS failed');

    const receiptId = randomUUID();
    const response: Extract<FirstHuntCommandResponseDto, { ok: true }> = {
      schemaVersion: 1,
      commandId: request.commandId,
      ok: true,
      receiptId,
      publicRevision: nextRevision,
    };
    await persistFirstHuntReceipt(transaction, {
      worldId,
      companyId,
      commandId: request.commandId,
      receiptId,
      requestKey,
      response,
      expectedCanonicalRevision: snapshot.canonical_revision,
    });
    return response;
  });
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function readContract(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<ContractRow | undefined> {
  const row = await transaction
    .selectFrom('contract_instances')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('instance_id', '=', FIRST_HUNT_INSTANCE_ID)
    .executeTakeFirst();
  return row;
}

interface StoredJoinIntent {
  readonly companyId: string;
  readonly accountId: string;
  readonly publicRevision: string;
  readonly campaignTick: string;
}

function readJoinIntent(value: unknown, companyId: string | null): StoredJoinIntent | undefined {
  if (value === null) return undefined;
  if (
    !companyId ||
    !isRecord(value) ||
    Object.keys(value).length !== 4 ||
    value['companyId'] !== companyId ||
    !isNonEmpty(value['accountId']) ||
    !isDecimal(value['publicRevision']) ||
    !isDecimal(value['campaignTick'])
  )
    return undefined;
  return {
    companyId,
    accountId: value['accountId'],
    publicRevision: value['publicRevision'],
    campaignTick: value['campaignTick'],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
}

function isAtArea(
  state: Awaited<ReturnType<typeof loadCompanyAggregate>> & {},
  siteId: string,
  areaId: string,
): boolean {
  if (!state) return false;
  const lifecycle = state.economy.lifecycle;
  return lifecycle.parties.some((party) => {
    if (party.location.kind !== 'AT' || party.location.siteId !== siteId) return false;
    const members = lifecycle.characters.filter(
      (character) => character.presence.fieldPartyId === party.partyId,
    );
    return (
      members.length > 0 &&
      members.every(
        (character) =>
          character.presence.location.kind === 'AT' &&
          character.presence.location.siteId === siteId &&
          character.presence.location.areaId === areaId &&
          canPerform(character, 'travel'),
      )
    );
  });
}

function readAcceptedResponse(
  value: unknown,
  commandId: string,
): FirstHuntCommandResponseDto | undefined {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'ok' in value &&
    value.ok === true &&
    'commandId' in value &&
    value.commandId === commandId &&
    'receiptId' in value &&
    typeof value.receiptId === 'string' &&
    'publicRevision' in value &&
    typeof value.publicRevision === 'string'
  )
    return value as FirstHuntCommandResponseDto;
  return undefined;
}

function proofSourceId(encounterId: string): string {
  return `encounter:${encounterId}:terminal`;
}

function firstHuntPickupTargets(
  state: CompanyCombatAggregateState,
  companyId: string,
): readonly FirstHuntPickupTargetDto[] {
  const physical = state.economy.physical;
  if (!physical) return [];
  const proofDefinition = COMPANY_CATALOGUE.items.find(
    (entry) => entry.id === FIRST_HUNT_PROOF_DEFINITION_ID && entry.enabled,
  );
  if (!proofDefinition) return [];

  const activeCharacterIds = new Set<string>(
    state.economy.lifecycle.memberships
      .filter((membership) => membership.endedAt === null)
      .map((membership) => String(membership.characterId)),
  );
  return physical.containers
    .filter((container) => {
      const companyOwned =
        (container.custodian.kind === 'COMPANY' && container.custodian.id === companyId) ||
        (container.custodian.kind === 'CHARACTER' &&
          activeCharacterIds.has(container.custodian.id));
      return (
        companyOwned &&
        container.access === 'COMPANY' &&
        container.closed === null &&
        (container.kind === 'CARRIED' ||
          container.kind === 'PARTY_SUPPLY' ||
          container.kind === 'STATIC') &&
        container.location.kind === 'AT' &&
        container.location.siteId === FIRST_HUNT_TERMS.objectiveLocation.siteId &&
        container.location.areaId === FIRST_HUNT_TERMS.objectiveLocation.areaId &&
        availableContainerG(physical, container.containerId) >= proofDefinition.weightG
      );
    })
    .toSorted((left, right) =>
      left.containerId < right.containerId ? -1 : left.containerId > right.containerId ? 1 : 0,
    )
    .map((container) => ({
      containerId: container.containerId,
      label:
        container.kind === 'CARRIED'
          ? 'Carried container'
          : container.kind === 'PARTY_SUPPLY'
            ? 'Party supply'
            : 'Container',
      availableWeightG: String(availableContainerG(physical, container.containerId)),
    }));
}
