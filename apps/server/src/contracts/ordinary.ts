import { executeCommandTransaction } from '../db/command-transaction.js';
import { settleDueContinuousMovementInTransaction } from '../world/continuous-movement.js';
import { randomInt, randomUUID } from 'node:crypto';

import {
  canonicalJson,
  canonicalStateJson,
  canPerform,
  continuousLocationPoint,
  CONTINUOUS_WORLD_REGION,
  huntProfile,
  ORDINARY_CONTRACT_PROFILES,
  FIRST_HUNT_PROOF_ID,
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractProfileVersion,
  ordinaryContractTerms,
  ordinaryStepBlocker,
  MILL_DESCENT_KIT_ID,
  MILL_DESCENT_KIT_INITIAL_STOCK,
  MILL_DESCENT_KIT_PRICE_Q,
  MILL_DESCENT_KIT_SITE,
  prepareMillDescentKitPurchase,
  consumeMillDescentKit,
  materializeCompanyPhysicalState,
  readCompanyCombatAggregateState,
  prepareOrdinaryContractCommand,
  PAINTED_ATLAS_REGION,
  readOrdinaryContractState,
  refuseNextWhoseWolvesIssuerOffer,
  whoseWolvesOfferWasRefused,
  WHOSE_WOLVES_ISSUER_ID,
  WHOSE_WOLVES_INSTANCE_ID,
  type CompanyCombatAggregateState,
  type ContractPlace,
  type OrdinaryContractContext,
  type OrdinaryContractProfile,
  type OrdinaryContractState,
  type OrdinaryStepGate,
} from '@warwrit/game-core';
import { foulWellHerbalistRemoved, readFoulWellOutcome } from './foul-well-state.js';
import type {
  OrdinaryContractBoardDto,
  OrdinaryContractCommandDto,
  OrdinaryContractCommandResponseDto,
  OrdinaryContractDto,
} from '@warwrit/protocol';
import { isOrdinaryContractCommand } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import { sql, type Kysely, type Transaction } from 'kysely';

import { resolveSessionAccount } from '../auth/session.js';
import { persistContractRewardPayment } from '../company/contract-payout.js';
import { readCarriedSupplyPurse } from '../company/supplies.js';
import { grantEmptyWatchOldFordMarker } from './cartography.js';
import { catchUpStationaryCompany } from '../company/executor.js';
import {
  findOwnedCompanyId,
  loadCompanyAggregate,
  lockCompanyAggregate,
} from '../company/repository.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock, readWorldLight } from '../world/clock.js';
import {
  EMPTY_WATCH_CAMP_DELAY_TICKS,
  canObserveEmptyWatchFordAt,
  emptyWatchFordFact,
  emptyWatchTerminalFact,
} from './empty-watch.js';
import {
  ensureFirstHuntGenesisInTransaction,
  ensureHuntGenesisInTransaction,
  isAvailableHuntHostile,
  selectHuntWorldRow,
  readHuntWorldState,
  updateHuntWorldRow,
  type FirstHuntHostileState,
} from './first-hunt-runtime.js';

const MILL_BEAST = huntProfile('ci.m1.mill-beast.01')!;
const VOICE_UNDER_BOARDS = 'ci.m1.voice-under-boards.01';

async function voiceUnderBoardsUnlocked(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<boolean> {
  const proof = await transaction
    .selectFrom('world_proof_claims')
    .select('redemption_receipt_id')
    .where('world_id', '=', worldId)
    .where('item_id', '=', FIRST_HUNT_PROOF_ID)
    .executeTakeFirst();
  return proof?.redemption_receipt_id !== null && proof?.redemption_receipt_id !== undefined;
}

const ordinaryIssuerNpcByRole: Readonly<Record<string, string>> = Object.freeze({
  'local-village-steward': WHOSE_WOLVES_ISSUER_ID,
});

type Rejection = Extract<OrdinaryContractCommandResponseDto, { ok: false }>['code'];

async function persistOrdinaryCompanyChange(
  transaction: Transaction<DatabaseSchema>,
  previous: CompanyCombatAggregateState,
  nextValue: unknown,
  input: {
    readonly commandId: string;
    readonly requestKey: string;
    readonly response: OrdinaryContractCommandResponseDto;
    readonly event: Readonly<Record<string, unknown>>;
  },
): Promise<CompanyCombatAggregateState> {
  const next = readCompanyCombatAggregateState(nextValue);
  const life = previous.economy.lifecycle;
  const nextLife = next.economy.lifecycle;
  const locked = await transaction
    .selectFrom('company_snapshots')
    .select(['canonical_revision', 'public_revision', 'state'])
    .where('world_id', '=', life.worldId)
    .where('company_id', '=', life.companyId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !locked ||
    locked.canonical_revision !== life.revision ||
    locked.public_revision !== life.knowledge.revision ||
    canonicalStateJson(readCompanyCombatAggregateState(locked.state)) !==
      canonicalStateJson(previous)
  )
    throw new Error('Company root changed before ordinary contract materials were persisted');
  const updated = await transaction
    .updateTable('company_snapshots')
    .set({
      canonical_revision: nextLife.revision,
      public_revision: nextLife.knowledge.revision,
      state: next,
      updated_at: sql<Date>`now()`,
    })
    .where('world_id', '=', life.worldId)
    .where('company_id', '=', life.companyId)
    .where('canonical_revision', '=', life.revision)
    .where('public_revision', '=', life.knowledge.revision)
    .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1) throw new Error('Company root CAS failed');
  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: life.worldId,
      company_id: life.companyId,
      receipt_id: randomUUID(),
      command_id: input.commandId,
      source_key: null,
      request_key: input.requestKey,
      response: input.response,
      resulting_revision: nextLife.revision,
    })
    .execute();
  await transaction
    .insertInto('company_audit_events')
    .values({
      world_id: life.worldId,
      company_id: life.companyId,
      revision: nextLife.revision,
      event_id: `${input.commandId}:ordinary-contract-material`,
      event: input.event,
    })
    .execute();
  return next;
}

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

function standingTerrainPosition(
  state: CompanyCombatAggregateState | undefined,
):
  | { readonly mapEdition: string; readonly xMicroFp: string; readonly zMicroFp: string }
  | undefined {
  const party = state?.economy.lifecycle.parties[0];
  if (!party || party.location.kind === 'MOVING') return undefined;
  const region =
    party.location.kind === 'TERRAIN' &&
    party.location.regionVersion === PAINTED_ATLAS_REGION.mapEdition
      ? PAINTED_ATLAS_REGION
      : CONTINUOUS_WORLD_REGION;
  const point = continuousLocationPoint(party.location, region);
  return point
    ? {
        mapEdition: region.mapEdition,
        xMicroFp: point.xMicroFp,
        zMicroFp: point.zMicroFp,
      }
    : undefined;
}

async function ensureOrdinaryGenesis(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<void> {
  for (const offeredProfile of ORDINARY_CONTRACT_PROFILES) {
    let profile = offeredProfile;
    if (offeredProfile.instanceId === 'ci.m1.light-sack.01') {
      const existing = await transaction
        .selectFrom('ordinary_contracts')
        .select('instance_id')
        .where('world_id', '=', worldId)
        .where('instance_id', '=', offeredProfile.instanceId)
        .executeTakeFirst();
      if (existing) continue;
      const definitionId =
        randomInt(2) === 0 ? 'ct.m1.light-sack.measure-error.v1' : 'ct.m1.light-sack.damp-rye.v1';
      const scenarioProfile = ordinaryContractProfileVersion(
        offeredProfile.instanceId,
        definitionId,
      );
      if (!scenarioProfile) throw new TypeError('Light-sack scenario profile is missing');
      profile = scenarioProfile;
    }
    if (offeredProfile.instanceId === 'ci.m1.tracks-over-tracks.01') {
      const existing = await transaction
        .selectFrom('ordinary_contracts')
        .select('instance_id')
        .where('world_id', '=', worldId)
        .where('instance_id', '=', offeredProfile.instanceId)
        .executeTakeFirst();
      if (existing) continue;
      const definitionId =
        randomInt(2) === 0
          ? 'ct.m1.tracks-over-tracks.kosars.v1'
          : 'ct.m1.tracks-over-tracks.bandits.v1';
      const scenarioProfile = ordinaryContractProfileVersion(
        offeredProfile.instanceId,
        definitionId,
      );
      if (!scenarioProfile) throw new TypeError('Track-investigation scenario profile is missing');
      profile = scenarioProfile;
    }
    if (offeredProfile.instanceId === VOICE_UNDER_BOARDS) {
      const existing = await transaction
        .selectFrom('ordinary_contracts')
        .select(['profile_id', 'state'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', offeredProfile.instanceId)
        .executeTakeFirst();
      if (existing?.profile_id === 'ct.m1.voice-under-boards.v1') {
        const previousProfile = ordinaryContractProfileVersion(
          offeredProfile.instanceId,
          existing.profile_id,
        );
        if (!previousProfile) throw new TypeError('Legacy mill rescue profile is missing');
        const previousState = readOrdinaryContractState(
          previousProfile,
          existing.state,
          existing.profile_id,
        );
        if (previousState.ownerCompanyId === null && previousState.outcome === null)
          await transaction
            .updateTable('ordinary_contracts')
            .set({ profile_id: offeredProfile.definitionId })
            .where('world_id', '=', worldId)
            .where('instance_id', '=', offeredProfile.instanceId)
            .where('profile_id', '=', existing.profile_id)
            .execute();
        continue;
      }
      if (existing) continue;
    }
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
  await transaction
    .insertInto('mill_descent_kit_stock')
    .values({
      world_id: worldId,
      revision: '0',
      quantity: MILL_DESCENT_KIT_INITIAL_STOCK,
      price_q: MILL_DESCENT_KIT_PRICE_Q,
      cash_q: '0',
    })
    .onConflict((conflict) => conflict.column('world_id').doNothing())
    .execute();
}

/** World conditions read from authoritative state; never from the client. */
async function readGates(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<Readonly<Record<OrdinaryStepGate, boolean>>> {
  const clock = await readWorldClock(transaction, worldId);
  const foulWellOutcome = await readFoulWellOutcome(transaction, worldId);
  const herbalistExiled = foulWellHerbalistRemoved(foulWellOutcome, clock.tick);
  const allDefeated = (state: { readonly hostiles: readonly FirstHuntHostileState[] }) =>
    !state.hostiles.some(isAvailableHuntHostile);
  const raiders = await ensureFirstHuntGenesisInTransaction(transaction, worldId);
  const beast = await ensureHuntGenesisInTransaction(transaction, worldId, MILL_BEAST);
  const nightThreatVisible =
    readWorldLight(clock).phase === 'NIGHT' && beast.hostiles.some(isAvailableHuntHostile);
  return {
    DAYLIGHT: readWorldLight(clock).phase === 'DAY',
    RAIDERS_DEFEATED: allDefeated(raiders),
    BEAST_DEFEATED: allDefeated(beast),
    LIVING_MILL_BEAST_AT_NIGHT: nightThreatVisible,
    HERBALIST_PRESENT: !herbalistExiled,
    HERBALIST_EXILED: herbalistExiled,
  };
}

export function contractView(
  profile: OrdinaryContractProfile,
  state: OrdinaryContractState,
  companyId: string | undefined,
  standingAt: ContractPlace | null,
  gates: Readonly<Record<OrdinaryStepGate, boolean>>,
  battleStarted: boolean,
  currentTick = '0',
  prerequisiteMet = true,
  kitStock?: { readonly revision: string; readonly quantity: number; readonly priceQ: string },
  terrainPosition?: OrdinaryContractContext['terrainPosition'],
  issuerRefusedOffer = false,
): OrdinaryContractDto {
  const terms = state.acceptedTerms ?? ordinaryContractTerms(profile);
  const deadlineTicks =
    state.acceptedTerms?.deadlineTicks ??
    (state.ownerCompanyId === null ? profile.deadlineTicks : undefined);
  const deadlineAtTick = state.acceptedTerms?.deadlineAtTick;
  const deadlinePassed =
    deadlineAtTick !== undefined && BigInt(currentTick) >= BigInt(deadlineAtTick);
  const projectedState =
    deadlinePassed && state.outcome === null
      ? {
          ...state,
          outcome: {
            kind: 'EXPIRED' as const,
            companyId: state.ownerCompanyId!,
            sourceEventId: `system:ordinary-contract-expiry:${state.instanceId}:${deadlineAtTick}`,
            atTick: deadlineAtTick,
          },
        }
      : state;
  const role =
    companyId && companyId === state.ownerCompanyId
      ? 'OWNER'
      : companyId && companyId === state.helperCompanyId
        ? 'HELPER'
        : 'NONE';
  const atIssuer =
    standingAt?.siteId === terms.issuerPlace.siteId &&
    standingAt.areaId === terms.issuerPlace.areaId;
  const terminalFact = projectedState.facts.find(
    (fact) =>
      fact.companyId === projectedState.outcome?.companyId &&
      fact.sourceEventId === projectedState.outcome?.sourceEventId &&
      fact.atTick === projectedState.outcome?.atTick,
  );
  const outcome = projectedState.outcome;
  const emptyWatchTerminal =
    profile.instanceId === 'ci.m1.empty-watch-record.01' && state.outcome
      ? emptyWatchTerminalFact(state)
      : undefined;
  const terminalStep = outcome
    ? terms.steps.find(
        (step) =>
          step.completes &&
          step.produces.every((slotId) =>
            state.facts.some(
              (fact) => fact.companyId === outcome.companyId && fact.slotId === slotId,
            ),
          ) &&
          step.produces.some((slotId) =>
            state.facts.some(
              (fact) =>
                fact.companyId === outcome.companyId &&
                fact.slotId === slotId &&
                fact.sourceEventId === outcome.sourceEventId &&
                fact.atTick === outcome.atTick,
            ),
          ),
      )
    : undefined;
  const noPayout =
    projectedState.outcome?.payoutPolicy === 'NO_PAYOUT' ||
    terminalStep?.payoutPolicy === 'NO_PAYOUT';
  const emptyWatchPublicConsequences =
    profile.instanceId === 'ci.m1.empty-watch-record.01' &&
    emptyWatchTerminal?.slotId === 'empty-watch-sack-handed-over'
      ? {
          kind: 'EMPTY_WATCH_RECORD' as const,
          refugeeCamp:
            currentTick !== undefined &&
            BigInt(currentTick) >= BigInt(state.outcome!.atTick) + EMPTY_WATCH_CAMP_DELAY_TICKS
              ? ('REMOVED' as const)
              : ('PRESENT' as const),
          watchman: 'IN_CUSTODY' as const,
        }
      : emptyWatchTerminal?.slotId === 'empty-watch-proof-destroyed'
        ? {
            kind: 'EMPTY_WATCH_RECORD' as const,
            refugeeCamp: 'PRESENT' as const,
            watchman: 'ON_DUTY' as const,
          }
        : undefined;
  const lateFordStep = profile.steps.find((step) => step.stepId === 'ask-prokop-about-old-ford');
  const knowsOldFord =
    companyId !== undefined && emptyWatchFordFact(state, companyId) !== undefined;
  const visibleSteps = [
    ...terms.steps.filter(
      (step) => step.stepId !== 'ask-prokop-about-old-ford' && step.postCompletion !== true,
    ),
    ...(knowsOldFord && lateFordStep ? [lateFordStep] : []),
    ...terms.steps.filter(
      (step) =>
        step.postCompletion === true &&
        state.outcome?.companyId === companyId &&
        standingAt?.siteId === step.place.siteId &&
        standingAt.areaId === step.place.areaId &&
        step.requires.every((slotId) =>
          state.facts.some((fact) => fact.companyId === companyId && fact.slotId === slotId),
        ),
    ),
  ];
  const foulWellPublicConsequences =
    profile.instanceId === 'ci.m1.foul-well.01' &&
    terminalFact?.slotId === 'foul-well-truth-reported'
      ? {
          kind: 'FOUL_WELL' as const,
          herbalist: 'IN_VILLAGE' as const,
          herbsAtTrader: 'AVAILABLE' as const,
          ...(state.outcome?.companyId === companyId
            ? { chapelCarePriceMultiplier: 2 as const }
            : {}),
        }
      : profile.instanceId === 'ci.m1.foul-well.01' &&
          terminalFact?.slotId === 'foul-well-aghafya-accused'
        ? BigInt(currentTick) - BigInt(terminalFact.atTick) >= 7000n
          ? {
              kind: 'FOUL_WELL' as const,
              herbalist: 'EXILED' as const,
              herbsAtTrader: 'REMOVED' as const,
            }
          : {
              kind: 'FOUL_WELL' as const,
              herbalist: 'IN_VILLAGE' as const,
              herbsAtTrader: 'AVAILABLE' as const,
            }
        : undefined;
  const draggedSackOutcome =
    profile.instanceId === 'ci.m1.dragged-sack.01' &&
    terminalFact?.slotId === 'dragged-sack-delivered-full'
      ? ('FULL_SACK' as const)
      : profile.instanceId === 'ci.m1.dragged-sack.01' &&
          (terminalFact?.slotId === 'dragged-sack-delivered-short' ||
            terminalFact?.slotId === 'dragged-sack-returned-after-withdrawal')
        ? state.facts.some(
            (fact) =>
              fact.companyId === terminalFact.companyId &&
              fact.slotId === 'dragged-sack-flour-shared',
          )
          ? ('SHORT_SACK' as const)
          : ('FULL_SACK' as const)
        : undefined;
  const draggedSackPublicConsequences =
    draggedSackOutcome === undefined
      ? undefined
      : {
          kind: 'DRAGGED_SACK' as const,
          northernDvorGrain: draggedSackOutcome,
          yourCompanyKnowsYeremaSlept:
            companyId !== undefined &&
            projectedState.facts.some(
              (fact) => fact.companyId === companyId && fact.slotId === 'dragged-sack-yerema-slept',
            ),
        };
  return {
    instanceId: profile.instanceId,
    template: terms.template,
    issuerRoleId: terms.issuerRoleId,
    issuerLocation: terms.issuerPlace,
    rewardQ: terms.rewardQ,
    ...(profile.instanceId === VOICE_UNDER_BOARDS &&
    kitStock &&
    terms.steps.some((step) => step.action === 'BUY')
      ? {
          materialOffer: {
            itemId: MILL_DESCENT_KIT_ID,
            contents: 'lantern-rope-support-boards' as const,
            priceQ: kitStock.priceQ,
            stock: kitStock.quantity,
            revision: kitStock.revision,
          },
        }
      : {}),
    revision: state.revision,
    yourRole: role,
    helperSlot: state.helperCompanyId === null ? 'AVAILABLE' : 'OCCUPIED',
    state:
      projectedState.outcome?.kind === 'EXPIRED'
        ? 'EXPIRED'
        : state.outcome
          ? 'COMPLETED'
          : state.ownerCompanyId || state.custody.length > 0
            ? 'ACTIVE'
            : 'OFFERED',
    ...(deadlineTicks ? { deadlineTicks } : {}),
    completedByYou:
      projectedState.outcome?.kind === 'SUCCESS' &&
      projectedState.outcome.companyId === companyId &&
      !noPayout,
    ...(noPayout
      ? { terminalPayout: 'NO_PAYOUT' as const }
      : terminalStep
        ? { terminalPayout: 'PAID' as const }
        : projectedState.outcome?.kind === 'EXPIRED'
          ? { terminalPayout: 'NO_PAYOUT' as const }
          : {}),
    ...(emptyWatchPublicConsequences ? { publicConsequences: emptyWatchPublicConsequences } : {}),
    ...(foulWellPublicConsequences ? { publicConsequences: foulWellPublicConsequences } : {}),
    ...(terminalStep?.returnsCargoAfterWithdrawal && terminalStep.resultTextKey
      ? {
          terminalFindingTextKey: `contract.${profile.instanceId}.result.${terminalStep.resultTextKey}`,
        }
      : {}),
    ...(draggedSackPublicConsequences ? { publicConsequences: draggedSackPublicConsequences } : {}),
    canAccept:
      prerequisiteMet &&
      (profile.instanceId !== 'ci.m1.man-by-road.01' || gates.HERBALIST_PRESENT) &&
      companyId !== undefined &&
      projectedState.outcome === null &&
      state.ownerCompanyId === null &&
      !state.cargoCustody.some((entry) => entry.companyId !== null) &&
      state.custody.length === 0 &&
      atIssuer &&
      !issuerRefusedOffer,
    ...(issuerRefusedOffer ? { issuerRefusedOffer: true } : {}),
    canHelp:
      companyId !== undefined &&
      projectedState.outcome === null &&
      state.ownerCompanyId !== null &&
      state.ownerCompanyId !== companyId &&
      profile.allowHelper !== false &&
      state.helperCompanyId === null &&
      atIssuer,
    canWithdraw:
      companyId !== undefined &&
      (role === 'OWNER' || role === 'HELPER') &&
      projectedState.outcome === null &&
      !battleStarted &&
      state.custody.every((entry) => entry.companyId === companyId) &&
      !(
        role === 'OWNER' &&
        state.cargoCustody.some(
          (entry) => entry.companyId !== null && entry.companyId !== companyId,
        )
      ),
    canReturnCargo:
      companyId !== undefined &&
      (projectedState.outcome?.kind === 'EXPIRED'
        ? state.ownerCompanyId === companyId
        : projectedState.outcome === null && state.lastWithdrawal?.companyId === companyId) &&
      state.cargoCustody.some((entry) => entry.companyId === companyId) &&
      standingAt?.siteId === terms.issuerPlace.siteId &&
      standingAt.areaId === terms.issuerPlace.areaId,
    steps: visibleSteps
      .filter((step) => !step.returnsCargoAfterWithdrawal)
      .map((step) => {
        const doneByYou =
          companyId !== undefined &&
          step.produces.every((slotId) =>
            state.facts.some((fact) => fact.companyId === companyId && fact.slotId === slotId),
          );
        return {
          stepId: step.stepId,
          action: step.action,
          location: step.place,
          ...(step.terrainTarget ? { terrainTarget: { ...step.terrainTarget } } : {}),
          doneByYou,
          ...(doneByYou && step.resultTextKey !== undefined
            ? { findingTextKey: `contract.${profile.instanceId}.result.${step.resultTextKey}` }
            : {}),
          blocker:
            companyId === undefined
              ? 'NOT_A_PARTICIPANT'
              : profile.instanceId === VOICE_UNDER_BOARDS &&
                  step.stepId === 'buy-descent-kit' &&
                  kitStock?.quantity === 0
                ? 'CONDITION_NOT_MET'
                : ordinaryStepBlocker(projectedState, step, {
                    companyId,
                    standingAt,
                    gates,
                    atTick: currentTick,
                    ...(terrainPosition ? { terrainPosition } : {}),
                  }),
          completes: step.completes === true,
        };
      }),
    yourCustody: state.custody
      .filter((entry) => entry.companyId === companyId)
      .map((entry) => entry.personId),
    yourCargo: state.cargoCustody
      .filter((entry) => entry.companyId === companyId)
      .map((entry) => entry.cargoId),
  };
}

/** Only ordinary jobs tied to an authored battle source close the pre-battle exit. */
const withdrawalBattleSource: Readonly<Record<string, string>> = Object.freeze({
  'ci.m1.cellar-rescue.01': 'ci.m1.raider-standard.01',
  'ci.m1.mill-worker.01': 'ci.m1.mill-beast.01',
  'ci.m1.voice-under-boards.01': 'ci.m1.raider-standard.01',
});

async function ordinaryBattleStarted(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  profile: OrdinaryContractProfile,
): Promise<boolean> {
  const battleInstanceId = withdrawalBattleSource[profile.instanceId];
  if (!battleInstanceId) return false;
  return (
    (await transaction
      .selectFrom('encounter_admissions')
      .select('encounter_id')
      .where('world_id', '=', worldId)
      .where('instance_id', '=', battleInstanceId)
      .executeTakeFirst()) !== undefined
  );
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

async function observeEmptyWatchFordAtKamennyBrod(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  standingAt: ContractPlace | null,
  currentTick: string,
  nowMs: string,
  profile: OrdinaryContractProfile,
  state: OrdinaryContractState,
): Promise<OrdinaryContractState> {
  if (
    profile.instanceId !== 'ci.m1.empty-watch-record.01' ||
    !canObserveEmptyWatchFordAt(state, companyId, standingAt, currentTick) ||
    emptyWatchFordFact(state, companyId)
  )
    return state;
  const sourceEventId = `${state.outcome!.sourceEventId}:old-ford`;
  const observed = readOrdinaryContractState(profile, {
    ...state,
    revision: (BigInt(state.revision) + 1n).toString(),
    facts: [
      ...state.facts,
      {
        slotId: 'empty-watch-old-ford-revealed',
        companyId,
        sourceEventId,
        atTick: currentTick,
      },
    ],
  });
  await transaction
    .updateTable('ordinary_contracts')
    .set({ revision: observed.revision, state: observed })
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId)
    .executeTakeFirstOrThrow();
  await grantEmptyWatchOldFordMarker(transaction, worldId, companyId, new Date(Number(nowMs)));
  return observed;
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
  const offeredProfile = ordinaryContractProfile(request.instanceId);
  if (!offeredProfile) return reject('NOT_AVAILABLE');
  const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
  if (!companyId) return reject('NOT_AUTHORIZED');
  await ensureOrdinaryGenesis(transaction, worldId);

  const row = await transaction
    .selectFrom('ordinary_contracts')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('instance_id', '=', offeredProfile.instanceId)
    .forUpdate()
    .executeTakeFirst();
  if (!row) return reject('NOT_AVAILABLE');
  if (
    request.type === 'ACCEPT' &&
    request.instanceId === VOICE_UNDER_BOARDS &&
    !(await voiceUnderBoardsUnlocked(transaction, worldId))
  )
    return reject('NOT_AVAILABLE');
  const profile = ordinaryContractProfileVersion(offeredProfile.instanceId, row.profile_id);
  if (!profile)
    throw new TypeError('Ordinary contract row has no retained immutable profile version');
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
  const state = readOrdinaryContractState(profile, row.state, row.profile_id);
  if (row.wallet_id !== (state.acceptedTerms?.walletId ?? profile.walletId))
    throw new TypeError('Ordinary contract issuer wallet does not match its accepted terms');
  if (
    profile.instanceId === 'ci.m1.man-by-road.01' &&
    request.type === 'ACCEPT' &&
    !gates.HERBALIST_PRESENT
  )
    return reject('NOT_AVAILABLE');
  if (profile.instanceId === 'ci.m1.foul-well.01' && request.type === 'ACCEPT') {
    const priorProfile = ordinaryContractProfile('ci.m1.missing-herbs.01');
    const priorRow = await transaction
      .selectFrom('ordinary_contracts')
      .select(['profile_id', 'state'])
      .where('world_id', '=', worldId)
      .where('instance_id', '=', 'ci.m1.missing-herbs.01')
      .executeTakeFirst();
    if (
      !priorProfile ||
      !priorRow ||
      !readOrdinaryContractState(priorProfile, priorRow.state, priorRow.profile_id).outcome
    )
      return reject('NOT_AVAILABLE');
  }
  const terrainPosition = standingTerrainPosition(company);
  const prepared = prepareOrdinaryContractCommand(
    profile,
    state,
    request.type === 'STEP'
      ? { type: 'STEP', stepId: request.stepId ?? '' }
      : { type: request.type },
    {
      companyId,
      standingAt: standingPlace(company),
      ...(terrainPosition ? { terrainPosition } : {}),
      atTick: clock.tick,
      expectedRevision: request.expectedRevision,
      sourceEventId: `ordinary-contract:${profile.instanceId}:${request.commandId}`,
      gates,
      battleStarted: await ordinaryBattleStarted(transaction, worldId, profile),
    },
  );
  if (prepared.kind === 'REJECTED') return reject(prepared.code);

  const issuerNpcId = ordinaryIssuerNpcByRole[profile.issuerRoleId];
  if (request.type === 'ACCEPT' && issuerNpcId === WHOSE_WOLVES_ISSUER_ID) {
    const whoseWolvesProfile = huntProfile(WHOSE_WOLVES_INSTANCE_ID);
    if (whoseWolvesProfile) {
      const row = await selectHuntWorldRow(transaction, worldId, whoseWolvesProfile);
      if (row) {
        const world = readHuntWorldState(worldId, whoseWolvesProfile, row);
        const questState = world.questState;
        if (questState && whoseWolvesOfferWasRefused(questState, companyId, profile.instanceId))
          return reject('NOT_AVAILABLE');
        const refused = questState
          ? refuseNextWhoseWolvesIssuerOffer(questState, {
              companyId,
              instanceId: profile.instanceId,
              issuerId: issuerNpcId,
            })
          : undefined;
        if (refused) {
          await updateHuntWorldRow(transaction, world, {
            revision: (BigInt(world.revision) + 1n).toString(),
            questState: refused,
          });
          const response: OrdinaryContractCommandResponseDto = {
            schemaVersion: 1,
            commandId: request.commandId,
            ok: true,
            revision: state.revision,
            rewardQ: null,
          };
          await transaction
            .insertInto('ordinary_contract_receipts')
            .values({
              world_id: worldId,
              company_id: companyId,
              command_id: request.commandId,
              instance_id: profile.instanceId,
              request_key: requestKey,
              response,
              simulation_at_ms: null,
            })
            .execute();
          return response;
        }
      }
    }
  }

  if (
    profile.instanceId === VOICE_UNDER_BOARDS &&
    request.type === 'STEP' &&
    request.stepId === 'buy-descent-kit'
  ) {
    const stockRow = await transaction
      .selectFrom('mill_descent_kit_stock')
      .selectAll()
      .where('world_id', '=', worldId)
      .forUpdate()
      .executeTakeFirst();
    if (!stockRow) throw new TypeError('Mill descent kit stock is not initialized');
    const bought = prepareMillDescentKitPurchase(
      materializeCompanyPhysicalState(company.economy),
      {
        commandId: request.commandId,
        siteId: MILL_DESCENT_KIT_SITE,
        shopRevision: String(stockRow.revision),
      },
      {
        worldId,
        revision: String(stockRow.revision),
        quantity: stockRow.quantity,
        priceQ: String(stockRow.price_q),
        cashQ: String(stockRow.cash_q),
      },
      await readCarriedSupplyPurse(transaction, worldId, companyId, accountId),
    );
    if (bought.kind !== 'PREPARED')
      return reject(
        bought.code === 'OUT_OF_STOCK'
          ? 'OUT_OF_STOCK'
          : bought.code === 'CAPACITY'
            ? 'CAPACITY'
            : bought.code === 'INSUFFICIENT_FUNDS'
              ? 'INSUFFICIENT_PURCHASE_FUNDS'
              : 'NOT_AVAILABLE',
      );
    const response: OrdinaryContractCommandResponseDto = {
      schemaVersion: 1,
      commandId: request.commandId,
      ok: true,
      revision: prepared.next.revision,
      rewardQ: null,
    };
    const nextCompany = readCompanyCombatAggregateState({ ...company, economy: bought.next });
    await persistOrdinaryCompanyChange(transaction, company, nextCompany, {
      commandId: request.commandId,
      requestKey,
      response,
      event: {
        type: 'MillDescentKitPurchased',
        itemId: bought.itemId,
        priceQ: stockRow.price_q,
        stockRevision: (BigInt(stockRow.revision) + 1n).toString(),
      },
    });
    const updatedStock = await transaction
      .updateTable('mill_descent_kit_stock')
      .set({
        revision: bought.stock.revision,
        quantity: bought.stock.quantity,
        cash_q: bought.stock.cashQ,
      })
      .where('world_id', '=', worldId)
      .where('revision', '=', stockRow.revision)
      .executeTakeFirst();
    if (Number(updatedStock.numUpdatedRows) !== 1)
      throw new Error('Mill descent kit stock changed before purchase');
  }

  if (
    profile.instanceId === VOICE_UNDER_BOARDS &&
    request.type === 'STEP' &&
    request.stepId === 'release-ostap-quiet'
  ) {
    const root = materializeCompanyPhysicalState(company.economy);
    const kit = root.physical.items.find(
      (item) =>
        item.definitionId === MILL_DESCENT_KIT_ID &&
        item.owner.kind === 'COMPANY' &&
        item.owner.id === companyId &&
        item.tombstone === null,
    );
    if (!kit) return reject('MISSING_EVIDENCE');
    const consumed = consumeMillDescentKit(
      root,
      kit.itemId,
      request.commandId,
      root.lifecycle.campaignTick,
    );
    const response: OrdinaryContractCommandResponseDto = {
      schemaVersion: 1,
      commandId: request.commandId,
      ok: true,
      revision: prepared.next.revision,
      rewardQ: null,
    };
    const nextCompany = readCompanyCombatAggregateState({ ...company, economy: consumed });
    await persistOrdinaryCompanyChange(transaction, company, nextCompany, {
      commandId: request.commandId,
      requestKey,
      response,
      event: { type: 'MillDescentKitConsumed', itemId: kit.itemId, personId: 'person.ostap' },
    });
  }

  if (
    profile.instanceId === 'ci.m1.empty-watch-record.01' &&
    request.type === 'STEP' &&
    request.stepId === 'throw-sack-in-river'
  ) {
    await grantEmptyWatchOldFordMarker(
      transaction,
      worldId,
      companyId,
      new Date(Number(clock.nowMs)),
    );
  }

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
      issuerWalletId: state.acceptedTerms?.walletId ?? profile.walletId,
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
      simulation_at_ms: profile.instanceId === 'ci.m1.mill-worker.01' ? clock.nowMs : null,
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
      let company: Awaited<ReturnType<typeof loadCompanyAggregate>> | undefined;
      if (companyId) {
        // Keep the global contract row before the company snapshot, matching contract commands.
        // Then lock the snapshot before readGates acquires shared hunt-state rows.
        await transaction
          .selectFrom('ordinary_contracts')
          .select('instance_id')
          .where('world_id', '=', worldId)
          .where('instance_id', '=', 'ci.m1.empty-watch-record.01')
          .forUpdate()
          .executeTakeFirstOrThrow();
        company = await lockCompanyAggregate(transaction, worldId, companyId);
      }
      const clock = await readWorldClock(transaction, worldId);
      const gates = await readGates(transaction, worldId);
      const kitStockRow = await transaction
        .selectFrom('mill_descent_kit_stock')
        .selectAll()
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const kitStock = {
        revision: String(kitStockRow.revision),
        quantity: kitStockRow.quantity,
        priceQ: String(kitStockRow.price_q),
      };
      const rows = await transaction
        .selectFrom('ordinary_contracts')
        .select(['instance_id', 'profile_id', 'wallet_id', 'state'])
        .where('world_id', '=', worldId)
        .execute();
      const whoseWolvesProfile = huntProfile(WHOSE_WOLVES_INSTANCE_ID);
      const whoseWolvesRow =
        companyId && whoseWolvesProfile
          ? await selectHuntWorldRow(transaction, worldId, whoseWolvesProfile, false)
          : undefined;
      const whoseWolvesState =
        whoseWolvesRow && whoseWolvesProfile
          ? readHuntWorldState(worldId, whoseWolvesProfile, whoseWolvesRow).questState
          : undefined;
      const contracts = [] as OrdinaryContractDto[];
      for (const profile of ORDINARY_CONTRACT_PROFILES) {
        if (
          profile.instanceId === VOICE_UNDER_BOARDS &&
          !(await voiceUnderBoardsUnlocked(transaction, worldId))
        )
          continue;
        const row = rows.find((entry) => entry.instance_id === profile.instanceId);
        if (!row) continue;
        const projectedCompany = company;
        const profileVersion = ordinaryContractProfileVersion(profile.instanceId, row.profile_id);
        if (!profileVersion)
          throw new TypeError('Ordinary contract row has no retained immutable profile version');
        let state = readOrdinaryContractState(profileVersion, row.state, row.profile_id);
        let prerequisiteMet = true;
        if (profile.instanceId === 'ci.m1.foul-well.01') {
          const priorProfile = ordinaryContractProfile('ci.m1.missing-herbs.01');
          const priorRow = rows.find((entry) => entry.instance_id === 'ci.m1.missing-herbs.01');
          prerequisiteMet = Boolean(
            priorProfile &&
            priorRow &&
            readOrdinaryContractState(priorProfile, priorRow.state, priorRow.profile_id).outcome,
          );
        }
        if (
          profile.instanceId === 'ci.m1.man-by-road.01' &&
          !gates.HERBALIST_PRESENT &&
          state.ownerCompanyId === null &&
          state.outcome === null
        )
          continue;
        if (row.wallet_id !== (state.acceptedTerms?.walletId ?? profileVersion.walletId))
          throw new TypeError('Ordinary contract issuer wallet does not match its accepted terms');
        if (companyId)
          state = await observeEmptyWatchFordAtKamennyBrod(
            transaction,
            worldId,
            companyId,
            projectedCompany ? standingPlace(projectedCompany) : null,
            clock.tick,
            clock.nowMs,
            profileVersion,
            state,
          );
        contracts.push(
          contractView(
            profileVersion,
            state,
            companyId,
            projectedCompany ? standingPlace(projectedCompany) : null,
            gates,
            await ordinaryBattleStarted(transaction, worldId, profileVersion),
            clock.tick,
            prerequisiteMet,
            profile.instanceId === VOICE_UNDER_BOARDS ? kitStock : undefined,
            standingTerrainPosition(projectedCompany),
            companyId !== undefined &&
              whoseWolvesState !== undefined &&
              ordinaryIssuerNpcByRole[profileVersion.issuerRoleId] === WHOSE_WOLVES_ISSUER_ID &&
              whoseWolvesOfferWasRefused(whoseWolvesState, companyId, profile.instanceId),
          ),
        );
      }
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
