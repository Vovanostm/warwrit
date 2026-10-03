import {
  COMPANY_CATALOGUE,
  advanceStudySectionTime,
  admitLearningTask,
  createLearningTaskState,
  createSocialState,
  createStudyAccessState,
  initialSkillProgress,
  moneyQ,
  prepareConsumeCombatAggregate,
  recordDirectedRelation,
  recordLearnedFact,
  readCompanyCombatAggregateState,
  stopLearningTask,
} from '@warwrit/game-core';
import type { CommandOf, MaterializedCompanyState, StudySectionProgress } from '@warwrit/game-core';
import { command, context, place, scope } from './company-economy-fixture.js';
import { addItem, item, itemAccess, visibleCharacter } from './company-physical-fixture.js';
import { createCompanyCombatAggregateFixture } from './company-combat-aggregate-fixture.js';

const fraction = (numerator: bigint | number, denominator: bigint | number) => ({
  numerator: String(numerator),
  denominator: String(denominator),
});

/** A valid stored root with representative retained owners for the PostgreSQL roundtrip. */
export function createCompanyStorageFixture() {
  const aggregate = createCompanyCombatAggregateFixture();
  const consumed = prepareConsumeCombatAggregate(aggregate.begun.next, {
    journal: aggregate.journal,
    applications: aggregate.applications,
    practiceProfile: aggregate.practiceProfile,
  });
  if (consumed.kind !== 'PREPARED') throw new Error(consumed.error);
  const leaderId = aggregate.f.root.lifecycle.company!.currentLeaderId;
  const workerId = aggregate.f.root.lifecycle.characters.find((character) =>
    character.identity.characterId.endsWith('worker-0'),
  )?.identity.characterId;
  if (!workerId) throw new Error('Expected the consumed company worker');
  const packId = `${leaderId}-pack`;
  const studyBook = item(
    'copy',
    'study-book-medicine',
    { kind: 'CHARACTER', id: leaderId },
    packId,
  );
  const enableStudy = (character: MaterializedCompanyState['lifecycle']['characters'][number]) => ({
    ...character,
    skills: {
      ...character.skills,
      scholarship: 25,
      medicine: initialSkillProgress(0, 'storage-study-opening'),
    },
    aptitudeBySkill: { ...character.aptitudeBySkill, medicine: 10000 },
    perks: ['scholarship-25-a'],
  });
  const learningRoot = visibleCharacter(
    addItem(aggregate.f.root, studyBook),
    leaderId,
    enableStudy,
  ) as MaterializedCompanyState;

  const work = COMPANY_CATALOGUE.works.find((entry) => entry.id === 'wound-care-basics')!;
  const start = command(learningRoot, 'StartLearning', {
    characterId: leaderId,
    methodId: 'book-study',
    goal: { workId: work.id, sectionId: 'wound-care-basics-1', maxTicks: work.durationTicks },
    resourceIds: ['copy'],
    budgetPoolId: 'local',
    maxBudgetQ: '0',
  }) as ReturnType<typeof command> & CommandOf<'StartLearning'>;
  const access = {
    ...itemAccess(learningRoot, 'study-access', 'STUDY', [packId], ['copy']),
    operatorId: leaderId,
  };
  const studyContext = {
    ...context(learningRoot, start, [], [], [access]),
    learningFacts: [
      {
        ...scope(learningRoot, 'book-source'),
        expiresAt: '10000',
        learnerId: leaderId,
        location: place,
        resourceIds: ['copy'],
        sourceVersion: 'v1',
        kind: 'SELF_STUDY' as const,
        methodId: 'book-study' as const,
        workId: work.id,
        sectionId: 'wound-care-basics-1',
      },
    ],
  };
  const taskRequest = {
    taskId: 'storage-study-task',
    command: start,
    study: { intervalId: 'copy-interval', itemId: 'copy', accessEvidenceId: 'study-access' },
  };
  const admitted = admitLearningTask(
    createLearningTaskState(),
    createStudyAccessState(),
    learningRoot,
    studyContext,
    taskRequest,
  );
  const stop = command(
    learningRoot,
    'StopLearning',
    {
      taskId: admitted.task.start.taskId,
      reason: 'PLAYER',
    },
    'storage-study-stop',
    'PLAYER',
  ) as ReturnType<typeof command> & CommandOf<'StopLearning'>;
  const stopped = stopLearningTask(admitted.state, stop);
  // This advances the section owner directly; it is persistence data, not an applied campaign command.
  const progress: StudySectionProgress = advanceStudySectionTime(
    null,
    { characterId: leaderId, workId: work.id, sectionId: 'wound-care-basics-1' },
    '1',
    fraction(9000, 1),
  ).next;

  let social = recordDirectedRelation(createSocialState(), {
    sourceEventId: 'storage-social-contact',
    fromId: leaderId,
    toId: workerId,
    base: { friendship: 12, rivalry: 1, fear: 0, respect: 20 },
  }).state;
  social = recordLearnedFact(social, {
    memoryId: 'storage-social-memory',
    factId: 'storage-known-fact',
    sourceEventId: 'storage-social-report',
    personId: leaderId,
    otherId: workerId,
    happenedAt: '900',
    learnedAt: '1000',
    factType: 'ObservedHelpfulAct',
    channel: 'REPORT',
    emotionalDelta: { friendship: 2, rivalry: 0, fear: 0, respect: 1 },
    decayTicks: '30000',
    salience: 2,
  }).state;

  // Retain the book and its known snapshot with the consumed root. Learning was
  // admitted against the same company before encounter binding; this is not a
  // claim that a study command was applied alongside the combat receipt.
  const persistedEconomy = visibleCharacter(
    addItem(consumed.next.economy, studyBook),
    leaderId,
    enableStudy,
  ) as MaterializedCompanyState;
  const company = {
    ...consumed.next,
    economy: {
      ...persistedEconomy,
      finance: {
        ...persistedEconomy.finance,
        wallets: persistedEconomy.finance.wallets.map((wallet) =>
          wallet.walletId === 'purse'
            ? { ...wallet, cashQ: moneyQ('9007199254740993123456789') }
            : wallet,
        ),
      },
    },
    learning: {
      schemaVersion: 1 as const,
      tasks: stopped.state,
      studyAccess: admitted.studyAccess,
      studyProgress: [progress],
      ownerTransitions: [],
    },
    social,
  };
  // These exact money and actual/known values are arrange-only persistence evidence.
  const workerAccount = company.economy.finance.accounts.find(
    (account) => account.recipient.kind === 'CHARACTER' && account.recipient.id === workerId,
  );
  if (!workerAccount) throw new Error('Expected a retained worker finance account');
  const result = {
    ...company,
    economy: {
      ...company.economy,
      finance: {
        ...company.economy.finance,
        accounts: company.economy.finance.accounts.map((account) =>
          account === workerAccount
            ? { ...account, actualPaused: true, knownPaused: false }
            : account,
        ),
      },
    },
  };
  return readCompanyCombatAggregateState(result);
}
