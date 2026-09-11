import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  initialSkillProgress,
  prepareCompanyEconomy,
  projectCompanyEconomy,
} from '@warwrit/game-core';
import type { CompanyEconomyState, QualificationNoticeEvidence } from '@warwrit/game-core';
import {
  advance,
  command,
  context,
  economy,
  observation,
  prepared,
  scope,
} from './company-economy-fixture.js';

function withHiddenQualification(level: 0 | 25): CompanyEconomyState {
  const state = economy([3n], 100000n, 0);
  const actual = state.lifecycle.characters.find(
    (entry) => entry.identity.characterId === 'worker-0',
  )!;
  const known = state.lifecycle.knowledge.characters.find(
    (entry) => entry.identity.characterId === 'worker-0',
  )!;
  Object.assign(actual, {
    skills: {
      leadership: 0,
      archery: initialSkillProgress(level, 'fixture:worker-0:archery'),
    },
  });
  Object.assign(known, { skills: { leadership: 0, archery: 0 } });
  return state;
}

function qualificationFact(
  state: CompanyEconomyState,
  lifetimeLevel: number,
  membershipId = 'service-worker-0',
): QualificationNoticeEvidence {
  const observationId = `see-worker-0-${state.lifecycle.knowledge.revision}`;
  return {
    ...scope(state, `qualification-${observationId}`),
    sourceEventId: `source-${observationId}`,
    kind: 'QUALIFICATION_NOTICE',
    membershipId,
    lifetimeLevel,
    noticeVersion: observationId,
  };
}

function service(state: CompanyEconomyState) {
  return projectCompanyEconomy(state, state.lifecycle.companyId)?.finance.services.find(
    (entry) => entry.membershipId === 'service-worker-0',
  );
}

describe('A04 — lawful progression disclosure and prospective wage qualification', () => {
  it('keeps private mastery invisible, then discloses only levels and changes pay at the next day', () => {
    const control = advance(withHiddenQualification(0), 500).next;
    const privateQualified = advance(withHiddenQualification(25), 500).next;
    expect(projectCompanyEconomy(privateQualified, privateQualified.lifecycle.companyId)).toEqual(
      projectCompanyEconomy(control, control.lifecycle.companyId),
    );
    expect(privateQualified.lifecycle.knowledge.revision).toBe(
      control.lifecycle.knowledge.revision,
    );
    expect(privateQualified.finance.accounts).toEqual(control.finance.accounts);

    const beforeClaims = canonicalJson(privateQualified.finance.claims);
    const fact = qualificationFact(privateQualified, 25);
    const observed = observation(privateQualified, 'worker-0', [fact]);
    const notified = observed.result.next;
    expect(canonicalJson(notified.finance.claims)).toBe(beforeClaims);

    const view = projectCompanyEconomy(notified, notified.lifecycle.companyId)!;
    const worker = view.characters.find((entry) => entry.characterId === 'worker-0')!;
    expect(worker.skills).toEqual({ leadership: 0, archery: 25 });
    expect(canonicalJson(worker)).not.toContain('milliXp');
    expect(canonicalJson(worker)).not.toContain('carry');
    expect(service(notified)).toMatchObject({
      currentAgreedRateMilli: '3',
      notices: [
        {
          version: fact.noticeVersion,
          notifiedAt: '500',
          effectiveAt: '1000',
          dailyWageMilli: '6',
        },
      ],
    });

    const beforeBoundary = advance(notified, 999).next;
    expect(service(beforeBoundary)?.currentAgreedRateMilli).toBe('3');
    const atBoundary = advance(beforeBoundary, 1000).next;
    expect(service(atBoundary)?.currentAgreedRateMilli).toBe('6');
    expect(
      atBoundary.finance.claims.reduce((sum, claim) => sum + BigInt(claim.reportedQ), 0n),
    ).toBe(3000n);
    const later = advance(atBoundary, 1500).next;
    expect(later.finance.claims.reduce((sum, claim) => sum + BigInt(claim.reportedQ), 0n)).toBe(
      6000n,
    );

    const sameQualification = observation(later, 'worker-0').result.next;
    expect(
      sameQualification.finance.accounts[1]?.schedule?.notices.map((notice) => notice.version),
    ).toEqual([fact.noticeVersion]);
  });

  it('binds trusted qualification to observed knowledge and preserves root replay atomicity', () => {
    const hidden = advance(withHiddenQualification(25), 500).next;
    const injected = qualificationFact(hidden, 25);
    const advanceCommand = command(
      hidden,
      'AdvanceCampaign',
      { toTick: '500', authoritativeInputs: [injected.id] },
      'private-payroll-oracle',
      'SYSTEM',
    );
    const before = canonicalJson(hidden);
    expect(
      prepareCompanyEconomy(hidden, advanceCommand, context(hidden, advanceCommand, [injected])),
    ).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(canonicalJson(hidden)).toBe(before);

    const bad = qualificationFact(hidden, 50);
    expect(() => observation(hidden, 'worker-0', [bad])).toThrow('INVALID_SOURCE');
    expect(canonicalJson(hidden)).toBe(before);

    const fact = qualificationFact(hidden, 25);
    const first = observation(hidden, 'worker-0', [fact]);
    const notified = first.result.next;
    const reloaded = JSON.parse(JSON.stringify(notified)) as CompanyEconomyState;
    const replay = prepared(
      prepareCompanyEconomy(reloaded, first.cmd, context(reloaded, first.cmd)),
    );
    expect(replay.replayed).toBe(true);
    expect(canonicalJson(replay.next)).toBe(canonicalJson(reloaded));
    expect(replay.next.finance.accounts[1]?.schedule?.notices).toHaveLength(1);

    const changed = {
      ...first.cmd,
      payload: {
        ...(first.cmd.payload as Record<string, unknown>),
        factId: 'different-observation-body',
      },
    };
    expect(prepareCompanyEconomy(reloaded, changed, context(reloaded, changed))).toMatchObject({
      kind: 'REJECTED',
      state: reloaded,
      error: 'IDEMPOTENCY_CONFLICT',
    });
  });
});
