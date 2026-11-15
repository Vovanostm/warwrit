import { describe, expect, it } from 'vitest';
import {
  DECEASED_KIN_WAGE_SINK_ID,
  payDeceasedWages,
  parseCompanyCommand,
  prepareCompanyEconomy,
  entityId,
  type CompanyCommand,
  type CompanyEconomyState,
  type FinanceEvidence,
  type LocalMoneyAccess,
  type PhysicalEvidence,
} from '@warwrit/game-core';
import {
  access,
  cash,
  claims,
  command,
  context,
  economy,
  observation,
  physicalScope,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';

const kamennyBrod = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'market' };

function deceasedState(balance = 5000n): CompanyEconomyState {
  let state = claims(economy([1n, 1n], balance, 1000), [5n, 1n]);
  const characterId = 'worker-0';
  const deathAt = tick(999);
  const membershipId = 'service-worker-0';
  state = {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      characters: state.lifecycle.characters.map((character) =>
        character.identity.characterId === characterId
          ? {
              ...character,
              presence: {
                ...character.presence,
                availability: 'DEAD',
                assignment: 'NONE',
                fieldPartyId: null,
              },
            }
          : character,
      ),
      knowledge: {
        ...state.lifecycle.knowledge,
        characters: state.lifecycle.knowledge.characters.map((character) =>
          character.identity.characterId === characterId
            ? {
                ...character,
                presence: {
                  ...character.presence,
                  availability: 'DEAD',
                  assignment: 'NONE',
                  fieldPartyId: null,
                },
              }
            : character,
        ),
      },
    },
    finance: {
      ...state.finance,
      accounts: state.finance.accounts.map((account) =>
        account.membershipId === membershipId
          ? {
              ...account,
              known: true,
              knownDeath: true,
              death: {
                sourceId: 'combat-death',
                atTick: deathAt,
                recipient: { kind: 'ESTATE' as const, id: characterId },
              },
            }
          : account,
      ),
      claims: state.finance.claims.map((claim) =>
        claim.membershipId === membershipId
          ? {
              ...claim,
              fromTick: tick(994),
              toTick: deathAt,
              earned: [
                { fromTick: tick(994), toTick: deathAt, dailyWageMilli: '1', maintenanceId: null },
              ],
              paidQ: cash(0),
              reportedQ: cash(99),
              reportedCoveredQ: cash(0),
            }
          : claim,
      ),
    },
  };
  return atKamennyBrod(state);
}

function atKamennyBrod(state: CompanyEconomyState): CompanyEconomyState {
  return {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      parties: state.lifecycle.parties.map((party) => ({ ...party, location: kamennyBrod })),
      characters: state.lifecycle.characters.map((character) => ({
        ...character,
        presence: { ...character.presence, location: kamennyBrod },
      })),
      knowledge: {
        ...state.lifecycle.knowledge,
        characters: state.lifecycle.knowledge.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location: kamennyBrod },
        })),
      },
    },
    finance: {
      ...state.finance,
      wallets: state.finance.wallets.map((wallet) => ({ ...wallet, location: kamennyBrod })),
    },
  };
}

function request(state: CompanyEconomyState) {
  return command(state, 'PayDeceasedWages', { characterId: 'worker-0' }, 'settle-deceased-wages');
}

function localAccess(state: CompanyEconomyState, cmd = request(state)): LocalMoneyAccess {
  const source = access(state) as LocalMoneyAccess;
  return {
    ...source,
    id: 'deceased-wage-access',
    sourceEventId: cmd.sourceEventId!,
    location: kamennyBrod,
    poolIds: ['local'],
  };
}

function run(state: CompanyEconomyState, cmd = request(state), facts?: FinanceEvidence[]) {
  return payDeceasedWages(
    state,
    cmd as Extract<CompanyCommand, { type: 'PayDeceasedWages' }>,
    context(state, cmd, facts ?? [localAccess(state, cmd)]),
  );
}

describe('N04 finite deceased wage settlement', () => {
  it('settles the debt after an ordinary RecordDeath and company observation', () => {
    let state = claims(economy([1n, 1n], 5000n, 1000), [5n, 1n]);
    const currentMembership = state.lifecycle.memberships.find(
      (membership) => membership.membershipId === 'service-worker-0',
    )!;
    const oldMembership = {
      ...currentMembership,
      membershipId: entityId<'Membership'>('service-worker-0-old-real'),
      startedAt: tick(800),
      endedAt: tick(900),
      basis: 'FOUNDER' as const,
      wageScheduleId: null,
    };
    const oldAccount = {
      ...state.finance.accounts.find((account) => account.membershipId === 'service-worker-0')!,
      membershipId: oldMembership.membershipId,
      schedule: null,
      known: true,
      knownDeath: false,
      death: null,
    };
    const oldClaim = {
      ...state.finance.claims.find((claim) => claim.membershipId === 'service-worker-0')!,
      claimId: entityId<'WageClaim'>('service-worker-0-old-claim'),
      membershipId: oldMembership.membershipId,
      fromTick: tick(890),
      toTick: tick(900),
      dailyWageMilli: '2',
      earned: [
        { fromTick: tick(890), toTick: tick(900), dailyWageMilli: '2', maintenanceId: null },
      ],
      reportedQ: cash(1),
    };
    state = {
      ...state,
      lifecycle: {
        ...state.lifecycle,
        memberships: [
          ...state.lifecycle.memberships.map((membership) =>
            membership.membershipId === currentMembership.membershipId
              ? { ...membership, startedAt: tick(950) }
              : membership,
          ),
          oldMembership,
        ],
      },
      finance: {
        ...state.finance,
        accounts: [...state.finance.accounts, oldAccount],
        claims: state.finance.claims
          .map((claim) =>
            claim.membershipId === 'service-worker-0'
              ? {
                  ...claim,
                  fromTick: tick(994),
                  toTick: tick(1000),
                  earned: [
                    {
                      fromTick: tick(994),
                      toTick: tick(1000),
                      dailyWageMilli: '1',
                      maintenanceId: null,
                    },
                  ],
                  reportedQ: cash(1),
                }
              : claim,
          )
          .concat(oldClaim),
      },
    };
    state = atKamennyBrod(state);
    const deathCommand = command(
      state,
      'RecordDeath',
      {
        receiptId: 'death-finance-receipt',
        characterId: 'worker-0',
        actualDeathTick: tick(1000),
        causeId: 'fatal-battle',
        custodyOutcomeId: 'death-physical-outcome',
      },
      'record-worker-death',
      'OUTCOME_RECEIPT',
    );
    const financeFact: FinanceEvidence = {
      ...scope(state, 'death-finance-receipt'),
      sourceEventId: deathCommand.sourceEventId!,
      kind: 'FINANCIAL_DEATH',
      characterId: 'worker-0',
      actualDeathTick: tick(1000),
      recipient: { kind: 'ESTATE', id: 'worker-0' },
      causeId: 'fatal-battle',
      custodyOutcomeId: 'death-physical-outcome',
    };
    const physicalFact: PhysicalEvidence = {
      ...physicalScope(state, 'death-physical-outcome'),
      sourceEventId: deathCommand.sourceEventId!,
      kind: 'DEATH_OUTCOME',
      characterId: 'worker-0',
      actualDeathTick: tick(1000),
      causeId: 'fatal-battle',
      location: kamennyBrod,
      corpseContainerId: 'worker-corpse',
    };
    const dead = prepared(
      prepareCompanyEconomy(
        state,
        deathCommand,
        context(state, deathCommand, [financeFact], [], [physicalFact]),
      ),
    ).next;
    const observed = observation(dead, 'worker-0').result.next;
    const originalEstate = observed.finance.accounts.find(
      (account) => account.membershipId === 'service-worker-0',
    )!.death!.recipient;
    const settlement = run(observed);

    expect(
      observed.finance.claims.find((claim) => claim.membershipId === 'service-worker-0'),
    ).toMatchObject({ reportedQ: '6', paidQ: '0' });
    expect(settlement.settlement.amountQ).toBe('26');
    expect(settlement.settlement.claimAllocations).toMatchObject([
      { claimId: 'claim-0', amountQ: '6' },
      { claimId: 'service-worker-0-old-claim', amountQ: '20' },
    ]);
    expect(
      settlement.next.finance.claims.find((claim) => claim.membershipId === 'service-worker-0'),
    ).toMatchObject({ reportedQ: '6', paidQ: '6' });
    expect(
      settlement.next.finance.claims.find(
        (claim) => claim.membershipId === 'service-worker-0-old-real',
      ),
    ).toMatchObject({ reportedQ: '20', paidQ: '20' });
    expect(
      settlement.next.finance.accounts.find(
        (account) => account.membershipId === 'service-worker-0',
      )?.death?.recipient,
    ).toEqual(originalEstate);
  });

  it('debits only actual earned debt to the stable kin sink, clears its backed hold, and preserves the estate receipt', () => {
    const state = deceasedState();
    const claim = state.finance.claims[0]!;
    const reservation = {
      reservationId: 'deceased-wage-hold',
      walletId: 'purse',
      claimId: claim.claimId,
      amountQ: cash(2),
      purpose: 'PENDING_CONFIRMATION' as const,
    };
    const held = {
      ...state,
      finance: { ...state.finance, reservations: [...state.finance.reservations, reservation] },
    };
    const before = structuredClone(held);
    const result = run(held);

    expect(held).toEqual(before);
    expect(result.settlement).toMatchObject({
      kind: 'DECEASED_WAGES_SETTLED',
      characterId: 'worker-0',
      amountQ: '5',
      sinkId: DECEASED_KIN_WAGE_SINK_ID,
      deathAt: '999',
      atTick: '1000',
      claimAllocations: [{ claimId: claim.claimId, poolId: 'local', amountQ: '5' }],
    });
    expect(result.next.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ).toBe(
      '4995',
    );
    expect(result.next.finance.claims[0]?.paidQ).toBe('5');
    expect(result.next.finance.reservations).toEqual([]);
    expect(result.next.finance.accounts[1]?.death?.recipient).toEqual({
      kind: 'ESTATE',
      id: 'worker-0',
    });
    expect(result.next.finance.movements.at(-1)).toMatchObject({
      from: 'purse',
      to: DECEASED_KIN_WAGE_SINK_ID,
      amountQ: '5',
      purpose: 'WAGE',
    });
    expect(result.next.finance.sourceEffects.at(-1)?.key).toContain('DECEASED_WAGES_SETTLED');
  });

  it('settles claims across a rejoined person’s historical memberships when only the current account carries the death marker', () => {
    let state = deceasedState();
    const currentMembership = state.lifecycle.memberships.find(
      (membership) => membership.membershipId === 'service-worker-0',
    )!;
    const oldMembership = {
      ...currentMembership,
      membershipId: entityId<'Membership'>('service-worker-0-old'),
      startedAt: tick(0),
      endedAt: tick(600),
    };
    const currentMembershipAgain = {
      ...currentMembership,
      membershipId: entityId<'Membership'>('service-worker-0-returned'),
      startedAt: tick(700),
      endedAt: null,
    };
    const oldAccount = {
      ...state.finance.accounts.find((account) => account.membershipId === 'service-worker-0')!,
      membershipId: oldMembership.membershipId,
      known: true,
      knownDeath: false,
      death: null,
    };
    const oldClaim = {
      ...state.finance.claims[0]!,
      claimId: 'old-service-claim',
      membershipId: oldMembership.membershipId,
      fromTick: tick(590),
      toTick: tick(595),
      earned: [
        { fromTick: tick(590), toTick: tick(595), dailyWageMilli: '2', maintenanceId: null },
      ],
      reportedQ: cash(500),
    };
    const returnedAccount = {
      ...state.finance.accounts.find((account) => account.membershipId === 'service-worker-0')!,
      membershipId: currentMembershipAgain.membershipId,
    };
    const returnedClaim = {
      ...state.finance.claims[0]!,
      claimId: 'returned-service-claim',
      membershipId: currentMembershipAgain.membershipId,
      fromTick: tick(900),
      toTick: tick(903),
      earned: [
        { fromTick: tick(900), toTick: tick(903), dailyWageMilli: '1', maintenanceId: null },
      ],
      reportedQ: cash(300),
    };
    state = {
      ...state,
      lifecycle: {
        ...state.lifecycle,
        memberships: [
          ...state.lifecycle.memberships.filter(
            (membership) => membership.characterId !== 'worker-0',
          ),
          oldMembership,
          currentMembershipAgain,
        ],
      },
      finance: {
        ...state.finance,
        accounts: [
          ...state.finance.accounts.filter(
            (account) => account.membershipId !== 'service-worker-0',
          ),
          oldAccount,
          returnedAccount,
        ],
        claims: [
          ...state.finance.claims.filter((claim) => claim.membershipId !== 'service-worker-0'),
          oldClaim,
          returnedClaim,
        ],
      },
    };
    const result = run(state);
    expect(result.settlement.amountQ).toBe('13');
    expect(result.settlement.claimAllocations.map((entry) => entry.claimId)).toEqual([
      oldClaim.claimId,
      returnedClaim.claimId,
    ]);
    expect(
      result.next.finance.claims
        .filter((claim) => [oldClaim.claimId, returnedClaim.claimId].includes(claim.claimId))
        .map((claim) => claim.paidQ),
    ).toEqual(['10', '3']);
  });

  it('rejects unknown death, stale time, remote cash, and a duplicate source without mutating input', () => {
    const state = deceasedState();
    const cmd = request(state);
    const input = structuredClone(state);
    expect(parseCompanyCommand(cmd).ok).toBe(true);
    const unknown = {
      ...state,
      lifecycle: {
        ...state.lifecycle,
        knowledge: {
          ...state.lifecycle.knowledge,
          characters: state.lifecycle.knowledge.characters.map((character) =>
            character.identity.characterId === 'worker-0'
              ? {
                  ...character,
                  presence: { ...character.presence, availability: 'AVAILABLE' as const },
                }
              : character,
          ),
        },
      },
    };
    expect(() => run(unknown, cmd)).toThrow();

    const unrecorded = {
      ...state,
      finance: {
        ...state.finance,
        accounts: state.finance.accounts.map((account) =>
          account.membershipId === 'service-worker-0'
            ? { ...account, knownDeath: false, death: null }
            : account,
        ),
      },
    };
    expect(() => run(unrecorded, cmd)).toThrow();

    const stale = { ...cmd, campaignTick: tick(999) };
    expect(() => run(state, stale)).toThrow();

    const remote = {
      ...localAccess(state, cmd),
      location: { kind: 'AT' as const, siteId: 'bereznyak', areaId: 'green' },
    };
    expect(() => run(state, cmd, [remote])).toThrow();

    const settled = run(state, cmd);
    expect(() => run(settled.next, cmd)).toThrow();
    expect(state).toEqual(input);
  });

  it('cannot spend unrelated held cash and refuses insufficient local funds', () => {
    const base = deceasedState(5000n);
    const unrelatedClaim = base.finance.claims[1]!;
    const state = {
      ...base,
      finance: {
        ...base.finance,
        claims: base.finance.claims.map((claim) =>
          claim.claimId === unrelatedClaim.claimId
            ? {
                ...claim,
                fromTick: tick(0),
                toTick: tick(999),
                dailyWageMilli: '5',
                earned: [
                  {
                    fromTick: tick(0),
                    toTick: tick(999),
                    dailyWageMilli: '5',
                    maintenanceId: null,
                  },
                ],
                reportedQ: cash(4995),
              }
            : claim,
        ),
      },
    };
    const claim = state.finance.claims[0]!;
    const heldAndAvailable = {
      ...state,
      finance: {
        ...state.finance,
        reservations: [
          {
            reservationId: 'other-claim',
            walletId: 'purse',
            claimId: unrelatedClaim.claimId,
            amountQ: cash(4995),
            purpose: 'PRE_ENTRY' as const,
          },
          {
            reservationId: 'target-claim',
            walletId: 'purse',
            claimId: claim.claimId,
            amountQ: cash(2),
            purpose: 'PENDING_CONFIRMATION' as const,
          },
        ],
      },
    };
    const availableResult = run(heldAndAvailable);
    expect(
      availableResult.next.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ,
    ).toBe('4995');
    expect(availableResult.next.finance.reservations).toMatchObject([
      { claimId: unrelatedClaim.claimId, amountQ: '4995' },
    ]);

    const heldElsewhere = {
      ...state,
      finance: {
        ...state.finance,
        reservations: [
          {
            reservationId: 'other-claim',
            walletId: 'purse',
            claimId: unrelatedClaim.claimId,
            amountQ: cash(4998),
            purpose: 'PRE_ENTRY' as const,
          },
          {
            reservationId: 'target-claim',
            walletId: 'purse',
            claimId: claim.claimId,
            amountQ: cash(2),
            purpose: 'PENDING_CONFIRMATION' as const,
          },
        ],
      },
    };
    expect(() => run(heldElsewhere)).toThrow();
    expect(heldElsewhere.finance.wallets[0]?.cashQ).toBe('5000');

    const poor = deceasedState(4n);
    expect(() => run(poor)).toThrow();
    expect(poor.finance.claims[0]?.paidQ).toBe('0');
  });
});
