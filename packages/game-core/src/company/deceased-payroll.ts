import { canonicalJson } from './input.js';
import { sameLocation } from './lifecycle-state.js';
import { companySemanticKey, companySourceKey } from './guards.js';
import {
  actualOwedQ,
  claimCoveredQ,
  claimEarnedQ,
  economyId,
  poolWallet,
  q,
  requireEconomy,
  requirePoolAccess,
  spendableQ,
  validateEconomy,
} from './economy-state.js';
import type { CompanyCommand } from './commands.js';
import type { CompanyEconomyState, EconomyContext, EconomyReceipt } from './economy-types.js';
import { canonicalRevision, publicRevision } from './values.js';
import type { CampaignTick, MoneyQ } from './values.js';

export const DECEASED_KIN_WAGE_SINK_ID = economyId('deceased-kin-wages', 'kamenny-brod');

export interface DeceasedWageSettlement {
  readonly kind: 'DECEASED_WAGES_SETTLED';
  readonly characterId: string;
  readonly amountQ: MoneyQ;
  readonly sinkId: string;
  readonly deathAt: CampaignTick;
  readonly atTick: CampaignTick;
  readonly sourceEventId: string;
  readonly claimAllocations: readonly {
    readonly claimId: string;
    readonly poolId: string;
    readonly amountQ: MoneyQ;
  }[];
  readonly movementIds: readonly string[];
}

export interface DeceasedWageSettlementResult {
  readonly next: CompanyEconomyState;
  readonly settlement: DeceasedWageSettlement;
}

type DeceasedWageCommand = Extract<CompanyCommand, { type: 'PayDeceasedWages' }>;

/**
 * Pays only the known, earned, pre-death debt to the accepted external kin sink.
 * The adapter owns receipt replay; this pure boundary rejects repeated source effects.
 */
export function payDeceasedWages(
  state: CompanyEconomyState,
  command: DeceasedWageCommand,
  context: EconomyContext,
): DeceasedWageSettlementResult {
  const { lifecycle, finance } = state;
  const characterId = command.payload.characterId;
  requireEconomy(
    command.actorRef.kind === 'PLAYER' &&
      command.worldId === lifecycle.worldId &&
      command.companyId === lifecycle.companyId &&
      context.worldId === lifecycle.worldId &&
      context.companyId === lifecycle.companyId,
    'INVALID_SOURCE',
  );
  requireEconomy(
    command.expectedRevision === lifecycle.knowledge.revision &&
      context.publicRevision === lifecycle.knowledge.revision &&
      context.canonicalRevision === lifecycle.revision &&
      command.campaignTick === context.atTick &&
      context.atTick === lifecycle.campaignTick &&
      context.atTick === finance.processedTick,
    'STALE_REVISION',
  );
  requireEconomy(command.sourceEventId !== undefined, 'INVALID_SOURCE');

  const actualPerson = lifecycle.characters.find(
    (person) => person.identity.characterId === characterId,
  );
  const knownPerson = lifecycle.knowledge.characters.find(
    (person) => person.identity.characterId === characterId,
  );
  requireEconomy(
    actualPerson?.presence.availability === 'DEAD' && knownPerson?.presence.availability === 'DEAD',
    'CONTACT_OR_ACCESS_REQUIRED',
  );

  const memberships = lifecycle.memberships.filter(
    (membership) =>
      membership.companyId === lifecycle.companyId && membership.characterId === characterId,
  );
  requireEconomy(memberships.length > 0, 'INVALID_SOURCE');
  const membershipIds = new Set<string>(memberships.map((membership) => membership.membershipId));
  requireEconomy(membershipIds.size === memberships.length, 'INVALID_STATE');
  const accounts = finance.accounts.filter((account) => membershipIds.has(account.membershipId));
  requireEconomy(
    accounts.length === memberships.length &&
      accounts.every((account) => account.known) &&
      memberships.every(
        (membership) =>
          accounts.filter((account) => account.membershipId === membership.membershipId).length ===
          1,
      ),
    'INVALID_SOURCE',
  );

  // One observed canonical death fact authorizes all historical memberships. Older service rows
  // need not have a duplicate death marker, but every marker that exists must agree.
  requireEconomy(
    accounts.every((account) => !account.knownDeath || account.death),
    'INVALID_STATE',
  );
  const knownDeaths = accounts.filter(
    (account) => account.known && account.knownDeath && account.death,
  );
  requireEconomy(knownDeaths.length > 0, 'CONTACT_OR_ACCESS_REQUIRED');
  const death = knownDeaths[0]!.death!;
  const deathMarkers = accounts.filter((account) => account.death !== null);
  requireEconomy(
    deathMarkers.every(
      (account) =>
        account.death!.sourceId === death.sourceId &&
        account.death!.atTick === death.atTick &&
        canonicalJson(account.death!.recipient) === canonicalJson(death.recipient),
    ),
    'INVALID_SOURCE',
  );
  requireEconomy(
    BigInt(death.atTick) <= BigInt(context.atTick) &&
      memberships.every((membership) => BigInt(membership.startedAt) <= BigInt(death.atTick)),
    'INVALID_SOURCE',
  );

  const sourceKey = canonicalJson(['DECEASED_WAGES_SETTLED', command.sourceEventId, characterId]);
  requireEconomy(
    !finance.sourceEffects.some((effect) => effect.key === sourceKey),
    'IDEMPOTENCY_CONFLICT',
  );

  const claims = finance.claims.filter((claim) => membershipIds.has(claim.membershipId));
  const claimAllocations = claims
    .map((claim) => {
      requireEconomy(
        claim.earned.every((period) => BigInt(period.toTick) <= BigInt(death.atTick)),
        'INVALID_SOURCE',
      );
      const amount = actualOwedQ(claim);
      requireEconomy(amount >= 0n, 'INVALID_STATE');
      return { claimId: claim.claimId, poolId: claim.poolId, amount };
    })
    .filter((claim) => claim.amount > 0n);
  const amount = claimAllocations.reduce((sum, claim) => sum + claim.amount, 0n);
  requireEconomy(amount > 0n, 'INVALID_ARGUMENT');

  const requestKey = canonicalJson({
    characterId,
    deathSourceId: death.sourceId,
    deathAt: death.atTick,
    atTick: context.atTick,
    claimAllocations: claimAllocations.map((claim) => ({
      claimId: claim.claimId,
      poolId: claim.poolId,
      amountQ: q(claim.amount),
    })),
  });
  const settledMembershipClaimIds = new Set(claims.map((claim) => claim.claimId));
  for (const allocation of claimAllocations) {
    const reservations = finance.reservations.filter(
      (reservation) => reservation.claimId === allocation.claimId,
    );
    requireEconomy(
      reservations.reduce((sum, reservation) => sum + BigInt(reservation.amountQ), 0n) <=
        allocation.amount,
      'INVALID_STATE',
    );
    const pool = finance.pools.find((entry) => entry.poolId === allocation.poolId);
    requireEconomy(pool, 'INVALID_SOURCE');
    const wallet = poolWallet(finance, allocation.poolId);
    requireEconomy(
      wallet.owner.kind === 'COMPANY' &&
        wallet.owner.id === lifecycle.companyId &&
        wallet.location.siteId === 'kamenny-brod',
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    const access = requirePoolAccess(state, allocation.poolId, context);
    requireEconomy(
      access.sourceEventId === command.sourceEventId &&
        access.location.siteId === 'kamenny-brod' &&
        sameLocation(wallet.location, access.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
  }

  // Release only holds backed by this deceased character's claims before checking cash. All
  // unrelated wage and learning reservations remain protected from this settlement.
  let nextFinance = {
    ...finance,
    reservations: finance.reservations.filter(
      (reservation) => !settledMembershipClaimIds.has(reservation.claimId),
    ),
    claims: finance.claims.map((claim) => {
      const allocation = claimAllocations.find((candidate) => candidate.claimId === claim.claimId);
      if (!membershipIds.has(claim.membershipId)) return claim;
      return {
        ...claim,
        reportedQ: q(claimEarnedQ(claim)),
        reportedCoveredQ: q(claimCoveredQ(claim)),
        ...(allocation ? { paidQ: q(BigInt(claim.paidQ) + allocation.amount) } : {}),
      };
    }),
    sourceEffects: [...finance.sourceEffects, { key: sourceKey, requestKey }],
  };

  const amountsByWallet = new Map<string, bigint>();
  for (const allocation of claimAllocations) {
    const wallet = poolWallet(finance, allocation.poolId);
    amountsByWallet.set(
      wallet.walletId,
      (amountsByWallet.get(wallet.walletId) ?? 0n) + allocation.amount,
    );
  }
  const movementIds: string[] = [];
  for (const [walletId, walletAmount] of amountsByWallet) {
    requireEconomy(spendableQ(nextFinance, walletId) >= walletAmount, 'INSUFFICIENT_FUNDS');
    const movementId = economyId(command.sourceEventId, characterId, walletId, 'deceased-wages');
    requireEconomy(
      !nextFinance.movements.some((movement) => movement.movementId === movementId),
      'IDEMPOTENCY_CONFLICT',
    );
    movementIds.push(movementId);
    nextFinance = {
      ...nextFinance,
      wallets: nextFinance.wallets.map((wallet) =>
        wallet.walletId === walletId
          ? { ...wallet, cashQ: q(BigInt(wallet.cashQ) - walletAmount) }
          : wallet,
      ),
      movements: [
        ...nextFinance.movements,
        {
          movementId,
          from: walletId,
          to: DECEASED_KIN_WAGE_SINK_ID,
          amountQ: q(walletAmount),
          atTick: context.atTick,
          purpose: 'WAGE' as const,
        },
      ],
    };
  }

  const receipt: EconomyReceipt = {
    commandId: command.commandId,
    requestKey: canonicalJson(command),
    semanticKey: companySemanticKey(command),
    sourceKey: companySourceKey(command),
    lifecycleReceipt: null,
    events: [],
    requirements: [],
    allocations: claimAllocations.map((claim) => ({
      claimId: claim.claimId,
      amountQ: q(claim.amount),
      channel: 'CASH',
    })),
  };
  const next = {
    ...state,
    lifecycle: {
      ...lifecycle,
      revision: canonicalRevision((BigInt(lifecycle.revision) + 1n).toString()),
      knowledge: {
        ...lifecycle.knowledge,
        revision: publicRevision((BigInt(lifecycle.knowledge.revision) + 1n).toString()),
      },
    },
    finance: { ...nextFinance, applied: [...nextFinance.applied, receipt] },
  };
  validateEconomy(next, {
    ...context,
    canonicalRevision: next.lifecycle.revision,
    publicRevision: next.lifecycle.knowledge.revision,
  });
  return {
    next,
    settlement: {
      kind: 'DECEASED_WAGES_SETTLED',
      characterId,
      amountQ: q(amount),
      sinkId: DECEASED_KIN_WAGE_SINK_ID,
      deathAt: death.atTick,
      atTick: context.atTick,
      sourceEventId: command.sourceEventId,
      claimAllocations: claimAllocations.map((claim) => ({
        claimId: claim.claimId,
        poolId: claim.poolId,
        amountQ: q(claim.amount),
      })),
      movementIds,
    },
  };
}
