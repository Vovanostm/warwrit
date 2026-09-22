import { describe, expect, it } from 'vitest';
import { COMPANY_COMMAND_SCHEMA_VERSION, COMPANY_RULESET_ID } from './model.js';
import { createCompanyEconomyState } from './economy-state.js';
import { exactFraction } from './exact-fraction.js';
import { admitLearningTask } from './learning-admission.js';
import { calculateLearningCost } from './learning-cost.js';
import type { LearningQuoteContext } from './learning-quote.js';
import { createLearningTaskState } from './learning-task.js';
import type { CommandOf, LifecycleCharacter, LifecycleState } from './lifecycle-types.js';
import { createCompanyPhysicalState } from './physical-state.js';
import { PHYSICAL_POLICY_VERSION } from './physical-types.js';
import { initialSkillProgress } from './skill-progress.js';
import { createStudyAccessState } from './study-access.js';
import {
  birthTick,
  campaignTick,
  canonicalRevision,
  entityId,
  moneyQ,
  publicRevision,
} from './values.js';

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const location = { kind: 'AT' as const, siteId: 'village', areaId: 'square' };
function setup(book = false, tariff = '1000', balance = '100', budget = '1000') {
  const characters: LifecycleCharacter[] = ['learner', 'provider'].map((id) => ({
    identity: {
      characterId: entityId(id),
      birthName: id,
      sex: 'male',
      birthCultureId: entityId('north'),
      birthplaceId: entityId('village'),
      originId: entityId('broken-company'),
      speciesId: entityId('human'),
      bornAt: birthTick('-10000000'),
    },
    presence: {
      characterId: entityId(id),
      location,
      assignment: 'NONE',
      availability: 'AVAILABLE',
      fieldPartyId: null,
      encounterBindingId: null,
    },
    skills: { scholarship: 60, medicine: initialSkillProgress(0, 'initial') },
    aptitudeBySkill: { medicine: 10000 },
    perks: ['scholarship-60-b'],
    conditionIds: [],
  }));
  const lifecycle: LifecycleState = {
    schemaVersion: 1,
    worldId: entityId('world'),
    companyId: entityId('company'),
    campaignTick: campaignTick('10'),
    revision: canonicalRevision('0'),
    company: {
      companyId: entityId('company'),
      worldId: entityId('world'),
      homeLocationId: entityId('village'),
      currentLeaderId: entityId('learner'),
      actingLeaderId: null,
      designatedHeirId: null,
      founderId: entityId('learner'),
      name: 'Company',
      bannerId: 'banner',
      householdIds: [],
      regencyHeirId: null,
      runStatus: 'ACTIVE',
      chronicleIds: [],
    },
    characters,
    memberships: [
      {
        membershipId: entityId('service'),
        companyId: entityId('company'),
        characterId: entityId('learner'),
        basis: 'FOUNDER',
        startedAt: campaignTick('0'),
        endedAt: null,
        wageScheduleId: null,
      },
    ],
    parties: [],
    kinship: [],
    bypasses: [],
    applied: [],
    knowledge: {
      revision: publicRevision('0'),
      leaderId: entityId('learner'),
      designatedHeirId: null,
      runStatus: 'ACTIVE',
      characters: reload(characters),
      candidateIds: [],
      eventIds: [],
    },
  };
  const owner = { kind: 'COMPANY' as const, id: lifecycle.companyId };
  const containers = [
    {
      containerId: 'supply',
      kind: 'STATIC' as const,
      location,
      custodian: owner,
      carrier: null,
      capacityG: 10000,
      access: 'COMPANY' as const,
      closed: null,
    },
  ];
  const items = [
    {
      itemId: 'book',
      definitionId: 'study-book-medicine',
      owner,
      containerId: 'supply',
      quantity: 1,
      currentCondition: 100,
      maximumCondition: 100,
      contentRevision: '1',
      provenance: { sourceId: 'stock', parentItemId: null, ordinal: 0 },
      equipped: null,
      tombstone: null,
    },
  ];
  const root = {
    ...createCompanyEconomyState(
      lifecycle,
      [
        { walletId: 'purse', owner, location, cashQ: moneyQ(balance) },
        {
          walletId: 'payee',
          owner: { kind: 'CHARACTER', id: 'provider' },
          location,
          cashQ: moneyQ('0'),
        },
      ],
      [{ poolId: 'local', walletId: 'purse' }],
    ),
    physical: createCompanyPhysicalState(lifecycle, {
      containers,
      items,
      knownContainers: containers,
      knownItems: items,
    }),
  };
  const command: CommandOf<'StartLearning'> = {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: 'start',
    type: 'StartLearning',
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    actorRef: { kind: 'PLAYER', id: 'principal' },
    expectedRevision: publicRevision('0'),
    campaignTick: lifecycle.campaignTick,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId: 'start-source',
    payload: {
      characterId: 'learner',
      methodId: book ? 'book-study' : 'funded-practice',
      goal: book
        ? { workId: 'wound-care-basics', maxTicks: '1000' }
        : { skillId: 'medicine', maxTicks: '1000' },
      resourceIds: ['book'],
      budgetPoolId: 'local',
      maxBudgetQ: book ? '0' : budget,
    },
  };
  const scope = {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    revision: lifecycle.revision,
    atTick: lifecycle.campaignTick,
    sourceEventId: 'access-source',
  };
  const context: LearningQuoteContext = {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal: command.actorRef,
    publicRevision: publicRevision('0'),
    canonicalRevision: lifecycle.revision,
    atTick: lifecycle.campaignTick,
    completeGraph: true,
    contactIds: ['learner', 'provider'],
    facts: [],
    financeFacts: [
      {
        ...scope,
        id: 'money',
        kind: 'LOCAL_MONEY_ACCESS',
        operatorId: 'learner',
        location,
        poolIds: ['local'],
        recipientWalletIds: ['payee'],
      },
    ],
    physicalFacts: [
      {
        ...scope,
        id: 'book-access',
        kind: 'ITEM_ACCESS',
        ordinal: 0,
        version: PHYSICAL_POLICY_VERSION,
        operatorId: 'learner',
        location,
        containerIds: ['supply'],
        itemIds: ['book'],
        purpose: 'STUDY',
      },
    ],
    learningFacts: [
      {
        ...scope,
        id: 'course',
        sourceVersion: 'v1',
        expiresAt: '5000',
        learnerId: 'learner',
        location,
        resourceIds: ['book'],
        ...(book
          ? {
              kind: 'SELF_STUDY',
              methodId: 'book-study',
              workId: 'wound-care-basics',
              sectionId: 'wound-care-basics-1',
            }
          : {
              kind: 'COURSE',
              methodId: 'funded-practice',
              skillId: 'medicine',
              challengeLevel: 0,
              providerId: 'provider',
              mentorId: 'provider',
              poolId: 'local',
              providerWalletId: 'payee',
              moneyAccessEvidenceId: 'money',
              costQPerDay: moneyQ(tariff),
              maxTicks: '1000',
            }),
      },
    ],
  };
  const request = {
    taskId: 'task',
    command,
    ...(book
      ? { study: { intervalId: 'study', itemId: 'book', accessEvidenceId: 'book-access' } }
      : {}),
  };
  const admitted = admitLearningTask(
    createLearningTaskState(),
    createStudyAccessState(),
    root,
    context,
    request,
  );
  return { root, context, request, admitted };
}

describe('C05-FIN exact obligation arithmetic, not financial settlement', () => {
  it('retains real admission provenance and one cost discount, without a duration price factor', () => {
    const f = setup();
    const before = reload(f);
    const result = calculateLearningCost(f.admitted.task, '3');
    expect(result.accumulatedQ).toEqual(exactFraction(12n, 5n));
    expect(result.integerPartQ).toBe('2');
    expect(result.remainderQ).toEqual(exactFraction(2n, 5n));
    expect(result.start).toEqual(f.admitted.task.start);
    expect(result.start.quote.funding).toMatchObject({
      walletId: 'purse',
      providerWalletId: 'payee',
      authorizedBudgetQ: '100',
    });
    expect(f).toEqual(before);
    expect(result.start).not.toBe(f.admitted.task.start);
    expect(Object.isFrozen(result.start.quote.funding)).toBe(true);
  });

  it('conserves fractional obligation across every partition and JSON, not per-request integer parts', () => {
    const task = setup(false, '1001').admitted.task;
    for (let total = 0n; total <= 12n; total++) {
      const whole = calculateLearningCost(task, String(total));
      for (let first = 0n; first <= total; first++) {
        const a = calculateLearningCost(reload(task), String(first)).accumulatedQ;
        const b = calculateLearningCost(reload(task), String(total - first)).accumulatedQ;
        expect(
          exactFraction(
            BigInt(a.numerator) * BigInt(b.denominator) +
              BigInt(b.numerator) * BigInt(a.denominator),
            BigInt(a.denominator) * BigInt(b.denominator),
          ),
        ).toEqual(whole.accumulatedQ);
      }
      expect(
        exactFraction(
          BigInt(whole.integerPartQ) * BigInt(whole.remainderQ.denominator) +
            BigInt(whole.remainderQ.numerator),
          BigInt(whole.remainderQ.denominator),
        ),
      ).toEqual(whole.accumulatedQ);
    }
  });

  it('preserves the saved authorization before, at and after its boundary despite added money', () => {
    const f = reload(setup(false, '1000', '100', '2'));
    expect(calculateLearningCost(f.admitted.task, '1').accumulatedQ).toEqual(exactFraction(4n, 5n));
    expect(calculateLearningCost(f.admitted.task, '2').accumulatedQ).toEqual(exactFraction(8n, 5n));
    Object.assign(f.root.finance.wallets[0]!, { cashQ: moneyQ('99999') });
    expect(() => calculateLearningCost(f.admitted.task, '3')).toThrow('INVALID_TIME');
    const invalid = reload(f.admitted.task);
    Object.assign(invalid.start.quote, { maxTicks: '3' });
    expect(() => calculateLearningCost(invalid, '3')).toThrow('UNPAID_OBLIGATIONS');
  });

  it('keeps genuine free book study at zero, without money or a ticks-per-day division', () => {
    const f = setup(true, '1000', '0');
    const before = reload(f);
    expect(
      calculateLearningCost(f.admitted.task, f.admitted.task.start.quote.maxTicks),
    ).toMatchObject({
      accumulatedQ: exactFraction(0n, 1n),
      integerPartQ: '0',
      remainderQ: exactFraction(0n, 1n),
    });
    expect(f).toEqual(before);
  });

  it('uses retained inputs and exact start replay after ambient changes', () => {
    const f = setup();
    const before = calculateLearningCost(f.admitted.task, '1');
    Object.assign(f.context, { learningFacts: [], financeFacts: [], atTick: '9000' });
    Object.assign(f.root.lifecycle.characters[0]!, { perks: [] });
    const replay = admitLearningTask(
      f.admitted.state,
      f.admitted.studyAccess,
      f.root,
      f.context,
      f.request,
    );
    expect(replay.replayed).toBe(true);
    expect(calculateLearningCost(replay.task, '1')).toEqual(before);
    expect(f.root.finance.movements).toEqual([]);
  });

  it('rejects malformed quantities, missing history and inconsistent original bindings unchanged', () => {
    const task = setup().admitted.task;
    for (const ticks of ['-1', '0.5', '01', 'NaN'])
      expect(() => calculateLearningCost(task, ticks)).toThrow();
    for (const mutate of [
      (copy: typeof task) => Reflect.deleteProperty(copy.start, 'inputs'),
      (copy: typeof task) => Object.assign(copy.start.quote, { sourceId: '' }),
      (copy: typeof task) =>
        Object.assign(copy.start.quote.funding!.costQPerDay, { denominator: '0' }),
      (copy: typeof task) => Object.assign(copy.start.inputs!, { ticksPerDay: '0' }),
      (copy: typeof task) => Object.assign(copy.start.inputs!, { skillId: 'leadership' }),
    ]) {
      const invalid = reload(task);
      mutate(invalid);
      const before = reload(invalid);
      expect(() => calculateLearningCost(invalid, '1')).toThrow();
      expect(invalid).toEqual(before);
    }
  });
});
