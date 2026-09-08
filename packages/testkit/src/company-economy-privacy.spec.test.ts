import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  prepareCompanyEconomy,
  projectCompanyEconomy,
  projectEconomyRejection,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  FinanceEvidence,
  PhysicalEvidence,
} from '@warwrit/game-core';
import {
  access,
  advance,
  command,
  context,
  economy,
  observation,
  physicalScope,
  place,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';

function death(state: CompanyEconomyState, characterId: string, sourceEventId?: string) {
  const id = `death-${characterId}`;
  const custodyOutcomeId = `death-outcome-${characterId}`;
  const cmd = command(
    state,
    'RecordDeath',
    {
      receiptId: id,
      characterId,
      actualDeathTick: state.finance.processedTick,
      causeId: 'battle-outcome',
      custodyOutcomeId,
    },
    id,
    'OUTCOME_RECEIPT',
  );
  if (sourceEventId) cmd.sourceEventId = sourceEventId;
  const fact: FinanceEvidence = {
    ...scope(state, id),
    sourceEventId: cmd.sourceEventId,
    kind: 'FINANCIAL_DEATH',
    characterId,
    actualDeathTick: state.finance.processedTick,
    recipient: { kind: 'ESTATE', id: characterId },
    causeId: 'battle-outcome',
    custodyOutcomeId,
  };
  const physicalFact: PhysicalEvidence = {
    ...physicalScope(state, custodyOutcomeId),
    sourceEventId: cmd.sourceEventId,
    kind: 'DEATH_OUTCOME',
    characterId,
    actualDeathTick: state.finance.processedTick,
    causeId: 'battle-outcome',
    location: place,
    corpseContainerId: `corpse-${characterId}`,
  };
  const ctx = context(state, cmd, [fact], [], [physicalFact]);
  return { cmd, ctx, input: state, result: prepared(prepareCompanyEconomy(state, cmd, ctx)) };
}

function view(state: CompanyEconomyState) {
  return projectCompanyEconomy(state, 'company');
}

function earned(state: CompanyEconomyState, membershipId: string) {
  return state.finance.claims
    .filter((c) => c.membershipId === membershipId)
    .reduce(
      (s, c) =>
        s +
        c.earned.reduce(
          (sum, e) => sum + (BigInt(e.toTick) - BigInt(e.fromTick)) * BigInt(e.dailyWageMilli),
          0n,
        ),
      0n,
    );
}

describe('WP02.3 — financial knowledge and exact replay', () => {
  it('P7: hidden death is noninterfering over DEFAULT/TARGETED, insufficient funds and retries, until a legitimate report', () => {
    const shared = advance(economy([10n, 10n], 12000n, 0), 500).next;
    let alive = shared;
    let hidden = death(shared, 'worker-0').result.next;
    expect(view(hidden)).toEqual(view(alive));
    alive = advance(alive, 1000).next;
    hidden = advance(hidden, 1000).next;
    expect(earned(hidden, 'service-worker-0')).toBe(5000n);
    expect(earned(alive, 'service-worker-0')).toBe(10000n);
    expect(view(hidden)).toEqual(view(alive));
    const operations = [
      { mode: 'DEFAULT', amountQ: '6000' },
      { mode: 'TARGETED', amountQ: '4000', payeeId: 'worker-0' },
      { mode: 'DEFAULT', amountQ: '3000' },
      { mode: 'DEFAULT', amountQ: '2000' },
    ];
    for (const [index, op] of operations.entries()) {
      const cmd = command(
        alive,
        'PayClaims',
        { poolId: 'local', claimIds: [], ...op },
        `payment-${index}`,
      );
      const a = prepareCompanyEconomy(alive, cmd, context(alive, cmd, [access(alive)]));
      const b = prepareCompanyEconomy(hidden, cmd, context(hidden, cmd, [access(hidden)]));
      expect(b.kind).toBe(a.kind);
      if (a.kind === 'REJECTED' && b.kind === 'REJECTED') {
        expect(a.error).toBe('INSUFFICIENT_FUNDS');
        expect(projectEconomyRejection(hidden, b.error, 'company')).toEqual(
          projectEconomyRejection(alive, a.error, 'company'),
        );
        expect(a.state).toBe(alive);
        expect(b.state).toBe(hidden);
      } else {
        if (a.kind !== 'PREPARED' || b.kind !== 'PREPARED')
          throw new Error('paired outcome mismatch');
        expect(b.receipt.allocations).toEqual(a.receipt.allocations);
        alive = a.next;
        hidden = b.next;
        for (const world of [alive, hidden]) {
          const retry = prepared(prepareCompanyEconomy(world, cmd, context(world, cmd)));
          expect(retry.replayed).toBe(true);
          expect(retry.next).toBe(world);
        }
      }
      expect(view(hidden)).toEqual(view(alive));
    }
    expect(view(hidden)?.finance.wallets[0]?.spendableQ).toBe('0');
    const report = observation(hidden, 'worker-0');
    const disclosed = report.result.next;
    expect(view(disclosed)).not.toEqual(view(alive));
    expect(BigInt(view(disclosed)!.finance.wallets[0]!.spendableQ)).toBeGreaterThan(0n);
    expect(disclosed.finance.wallets).toEqual(hidden.finance.wallets);
    expect(
      disclosed.finance.claims.find((c) => c.membershipId === 'service-worker-0')?.reportedQ,
    ).toBe('5000');
    expect(
      disclosed.finance.accounts.find((a) => a.membershipId === 'service-worker-0')?.death
        ?.recipient,
    ).toEqual({ kind: 'ESTATE', id: 'worker-0' });
    const retry = prepared(
      prepareCompanyEconomy(disclosed, report.cmd, context(disclosed, report.cmd)),
    );
    expect(retry.next).toBe(disclosed);
    expect(view(disclosed)?.characters.find((c) => c.characterId === 'worker-0')?.knownStatus).toBe(
      'DEAD',
    );
  });

  it('P7: visible colleague payouts stay identical while the unconfirmed colleague gets only a backed hold', () => {
    const shared = advance(economy([10n, 10n], 15000n, 0), 500).next;
    const worlds = [shared, death(shared, 'worker-0').result.next].map(
      (s) => observation(advance(s, 1000).next, 'worker-1').result.next,
    );
    expect(view(worlds[0]!)).toEqual(view(worlds[1]!));
    const receipts = worlds.map((s) => {
      const cmd = command(s, 'PayClaims', {
        poolId: 'local',
        claimIds: [],
        mode: 'DEFAULT',
        amountQ: '10000',
      });
      return prepared(prepareCompanyEconomy(s, cmd, context(s, cmd, [access(s)])));
    });
    expect(receipts[0]!.receipt.allocations).toEqual(receipts[1]!.receipt.allocations);
    for (const result of receipts) {
      expect(result.next.finance.wallets.find((w) => w.walletId === 'wallet-worker-1')?.cashQ).toBe(
        '5000',
      );
      expect(result.next.finance.wallets.find((w) => w.walletId === 'wallet-worker-0')?.cashQ).toBe(
        '0',
      );
      expect(result.receipt.allocations.map((a) => a.channel).sort()).toEqual([
        'CASH',
        'PENDING_CONFIRMATION',
      ]);
    }
    expect(view(receipts[0]!.next)).toEqual(view(receipts[1]!.next));
  });

  it('P8: exact command conflicts precede source fallback; source fan-out remains subject-scoped and replay needs no stale fact', () => {
    const start = advance(economy([10n, 10n], 12000n, 0), 500).next;
    const first = death(start, 'worker-0', 'source-shared-battle');
    const identical = prepared(
      prepareCompanyEconomy(first.result.next, first.cmd, context(first.result.next, first.cmd)),
    );
    expect(identical.replayed).toBe(true);
    const retry = { ...first.cmd, commandId: 'new-delivery-id' };
    const sourceReplay = prepared(
      prepareCompanyEconomy(first.result.next, retry, context(first.result.next, retry)),
    );
    expect(sourceReplay.replayed).toBe(true);
    const second = death(first.result.next, 'worker-1', 'source-shared-battle');
    const conflicting = {
      ...first.cmd,
      payload: second.cmd.payload,
      sourceEventId: second.cmd.sourceEventId,
    };
    const result = prepareCompanyEconomy(
      second.result.next,
      conflicting,
      context(second.result.next, conflicting),
    );
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'IDEMPOTENCY_CONFLICT' });
    const wrongActor = { ...first.cmd, actorRef: { kind: 'PLAYER' as const, id: 'principal' } };
    expect(prepareCompanyEconomy(start, wrongActor, context(start, wrongActor))).toMatchObject({
      kind: 'REJECTED',
    });
    const injected = { ...first.cmd, settled: true };
    const withGrant = {
      ...first.ctx,
      internalGrant: {
        commandId: first.cmd.commandId,
        sourceEventId: first.cmd.sourceEventId,
        canonicalRequest: canonicalJson(injected),
      },
    };
    expect(prepareCompanyEconomy(first.input, injected, withGrant)).toMatchObject({
      kind: 'REJECTED',
      error: 'INVALID_COMMAND',
    });
  });

  it('P6/P7: loss of the last field worker stops actual support without disclosing hidden death', () => {
    const initial = economy([1n, 1n], 10000n, 0);
    const wound = command(
      initial,
      'ApplyCondition',
      {
        receiptId: 'leader-critical',
        characterId: 'leader',
        conditionDefinitionId: 'critical-bleed',
        causeId: 'fixture-wound',
        deadlineTick: '250',
      },
      'leader-critical',
      'DOMAIN_RECEIPT',
    );
    const woundFact: PhysicalEvidence = {
      ...physicalScope(initial, 'leader-critical'),
      sourceEventId: wound.sourceEventId,
      kind: 'CONDITION_SOURCE',
      characterId: 'leader',
      definitionId: 'critical-bleed',
      causeId: 'fixture-wound',
      onsetTick: tick(0),
      deadlineTick: tick(250),
    };
    const resting = prepared(
      prepareCompanyEconomy(initial, wound, context(initial, wound, [], [], [woundFact])),
    ).next;
    const camp = command(resting, 'BeginFieldCamp', {
      partyId: 'party',
      siteEligibilityId: 'site',
    });
    const begun = prepared(
      prepareCompanyEconomy(
        resting,
        camp,
        context(resting, camp, [
          {
            ...scope(resting, 'site'),
            kind: 'CAMP_SITE',
            partyId: 'party',
            location: place,
            stationary: true,
            conflict: false,
          },
        ]),
      ),
    ).next;
    const atDeparture = advance(begun, 250).next;
    const detach = command(atDeparture, 'SetAssignment', {
      characterId: 'worker-1',
      assignment: 'GARRISON',
      locationId: 'village',
      dutyEvidenceId: 'detached-worker',
      fundingPoolId: 'local',
    });
    const detached = prepared(
      prepareCompanyEconomy(
        atDeparture,
        detach,
        context(
          atDeparture,
          detach,
          [],
          [
            {
              ...scope(atDeparture, 'detached-worker'),
              kind: 'DUTY',
              characterId: 'worker-1',
              assignment: 'GARRISON',
              location: place,
              fundingPoolId: 'local',
              handoverToId: 'provider',
              partyId: null,
            },
          ],
        ),
      ),
    ).next;
    const shared = advance(detached, 500).next;
    const alive = advance(shared, 1000).next;
    const hidden = advance(death(shared, 'worker-0').result.next, 1000).next;
    expect(view(hidden)).toEqual(view(alive));
    expect(
      hidden.finance.food.find((f) => f.membershipId === 'service-leader')?.intervals.at(-1),
    ).toMatchObject({ fromTick: '500', toTick: '1000', agreementId: null });
    expect(hidden.finance.maintenance[0]?.endedAt).toBe('500');
    expect(view(hidden)?.finance.maintenance[0]?.endedAt).toBeNull();
    const learned = observation(hidden, 'worker-0').result.next;
    expect(view(learned)?.finance.maintenance[0]?.endedAt).toBe('500');
  });
});
