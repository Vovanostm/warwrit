import { createHash, randomUUID } from 'node:crypto';
import {
  birthTick,
  campaignTick,
  canPerform,
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  canonicalJson,
  entityId,
  moneyQ,
  parseCompanyCommand,
  prepareCompanyEconomyWithLearning,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  CommandOf,
  LocalMoneyAccess,
  LifecycleCharacter,
  LearningSourceEvidence,
  LearningTask,
  LearningTimeInterval,
  PhysicalEvidence,
  TrustedLearningCauseManifest,
  Wallet,
} from '@warwrit/game-core';
import { FIRST_HUNT_ISSUER_ID, FIRST_HUNT_ISSUER_LOCATION } from '@warwrit/game-core';
import { localCompanyContacts } from './recruitment.js';

export const KAMENNY_BROD_GUARD_COURSE = Object.freeze({
  id: 'course.kamenny-brod-guard.blades',
  providerId: FIRST_HUNT_ISSUER_ID,
  location: Object.freeze({
    kind: 'AT' as const,
    siteId: FIRST_HUNT_ISSUER_LOCATION.siteId,
    areaId: FIRST_HUNT_ISSUER_LOCATION.areaId,
  }),
  skillId: 'blades',
  challengeLevel: 1,
  durationTicks: '3000',
  costQPerDay: moneyQ('5000000'),
  sourceVersion: 'guard-blades-course-playtest-2026-11-15-v1',
});

function stableWalletId(worldId: string, companyId: string): string {
  const digest = createHash('sha256')
    .update(`warwrit-course-wallet-v1:${worldId}:${companyId}:${KAMENNY_BROD_GUARD_COURSE.id}`)
    .digest('hex');
  return `course-wallet-${digest.slice(0, 32)}`;
}

export function courseProviderWalletId(worldId: string, companyId: string): string {
  return stableWalletId(worldId, companyId);
}

export function courseResourceIds(state: CompanyCombatAggregateState): readonly string[] {
  const physical = state.economy.physical;
  if (!physical) return [];
  const containers = new Set(
    physical.containers
      .filter(
        (container) =>
          container.closed === null &&
          container.location.kind === 'AT' &&
          container.location.siteId === KAMENNY_BROD_GUARD_COURSE.location.siteId &&
          container.location.areaId === KAMENNY_BROD_GUARD_COURSE.location.areaId,
      )
      .map((container) => container.containerId),
  );
  return physical.items
    .filter(
      (item) =>
        item.tombstone === null &&
        item.containerId !== null &&
        containers.has(item.containerId) &&
        COMPANY_CATALOGUE.items.find((definition) => definition.id === item.definitionId)
          ?.skillId === KAMENNY_BROD_GUARD_COURSE.skillId,
    )
    .map((item) => item.itemId)
    .toSorted();
}

function worldContact(): LifecycleCharacter {
  const id = KAMENNY_BROD_GUARD_COURSE.providerId;
  return {
    identity: {
      characterId: entityId<'Character'>(id),
      birthName: 'Гордей Лапа',
      sex: 'male',
      birthCultureId: entityId('north'),
      birthplaceId: entityId(KAMENNY_BROD_GUARD_COURSE.location.siteId),
      originId: entityId('broken-company'),
      speciesId: entityId('human'),
      bornAt: birthTick('-10000000'),
    },
    presence: {
      characterId: entityId<'Character'>(id),
      location: KAMENNY_BROD_GUARD_COURSE.location,
      availability: 'AVAILABLE',
      assignment: 'NONE',
      fieldPartyId: null,
      encounterBindingId: null,
    },
    skills: {},
    aptitudeBySkill: {},
    perks: [],
    conditionIds: [],
  };
}

/** Materialize only the already-established guard contact and this company's empty tuition till. */
export function ensureCourseProvider(
  state: CompanyCombatAggregateState,
): CompanyCombatAggregateState {
  const lifecycle = state.economy.lifecycle;
  const providerId = KAMENNY_BROD_GUARD_COURSE.providerId;
  const existing = lifecycle.characters.find((entry) => entry.identity.characterId === providerId);
  if (existing) {
    if (
      existing.presence.location.kind !== 'AT' ||
      existing.presence.location.siteId !== KAMENNY_BROD_GUARD_COURSE.location.siteId ||
      existing.presence.location.areaId !== KAMENNY_BROD_GUARD_COURSE.location.areaId
    )
      throw new Error('Course provider identity conflicts with canonical guard contact');
  }
  const walletId = stableWalletId(lifecycle.worldId, lifecycle.companyId);
  const wallet: Wallet = {
    walletId,
    owner: { kind: 'CHARACTER', id: providerId },
    location: KAMENNY_BROD_GUARD_COURSE.location,
    cashQ: moneyQ('0'),
  };
  const existingWallet = state.economy.finance.wallets.find((entry) => entry.walletId === walletId);
  if (
    existingWallet &&
    (existingWallet.owner.kind !== 'CHARACTER' ||
      existingWallet.owner.id !== providerId ||
      existingWallet.location.kind !== 'AT' ||
      existingWallet.location.siteId !== KAMENNY_BROD_GUARD_COURSE.location.siteId ||
      existingWallet.location.areaId !== KAMENNY_BROD_GUARD_COURSE.location.areaId)
  )
    throw new Error('Course provider wallet conflicts with canonical company tuition till');
  return {
    ...state,
    economy: {
      ...state.economy,
      lifecycle: existing
        ? lifecycle
        : { ...lifecycle, characters: [...lifecycle.characters, worldContact()] },
      finance: existingWallet
        ? state.economy.finance
        : { ...state.economy.finance, wallets: [...state.economy.finance.wallets, wallet] },
    },
  };
}

export function learningSourceForCourseTask(task: LearningTask): LearningSourceEvidence {
  const command = task.start.command;
  const sourceId = task.start.quote.sourceId;
  const funding = task.start.quote.funding;
  if (
    command.type !== 'StartLearning' ||
    !funding ||
    task.start.inputs?.kind !== 'COURSE' ||
    command.payload.methodId !== 'funded-practice'
  )
    throw new Error('Expected a funded guard course task');
  return {
    id: sourceId,
    companyId: command.companyId,
    worldId: command.worldId,
    revision: command.expectedRevision,
    atTick: command.campaignTick,
    expiresAt: (
      BigInt(command.campaignTick) + BigInt(KAMENNY_BROD_GUARD_COURSE.durationTicks)
    ).toString(),
    learnerId: command.payload.characterId,
    location: KAMENNY_BROD_GUARD_COURSE.location,
    resourceIds: command.payload.resourceIds,
    sourceVersion: task.start.quote.sourceVersion,
    kind: 'COURSE',
    methodId: 'funded-practice',
    skillId: KAMENNY_BROD_GUARD_COURSE.skillId,
    challengeLevel: KAMENNY_BROD_GUARD_COURSE.challengeLevel,
    providerId: KAMENNY_BROD_GUARD_COURSE.providerId,
    mentorId: KAMENNY_BROD_GUARD_COURSE.providerId,
    poolId: funding.poolId,
    providerWalletId: funding.providerWalletId,
    moneyAccessEvidenceId: `course-access-${command.commandId}`,
    costQPerDay: KAMENNY_BROD_GUARD_COURSE.costQPerDay,
    maxTicks: KAMENNY_BROD_GUARD_COURSE.durationTicks,
  };
}

export function courseSourceForStart(input: {
  readonly command: CommandOf<'StartLearning'>;
  readonly revision: string;
  readonly providerWalletId: string;
  readonly accessEvidenceId: string;
}): LearningSourceEvidence {
  return {
    id: `course:${input.command.commandId}`,
    companyId: input.command.companyId,
    worldId: input.command.worldId,
    revision: input.revision,
    atTick: campaignTick(input.command.campaignTick),
    expiresAt: (
      BigInt(input.command.campaignTick) + BigInt(KAMENNY_BROD_GUARD_COURSE.durationTicks)
    ).toString(),
    learnerId: input.command.payload.characterId,
    location: KAMENNY_BROD_GUARD_COURSE.location,
    resourceIds: input.command.payload.resourceIds,
    sourceVersion: KAMENNY_BROD_GUARD_COURSE.sourceVersion,
    kind: 'COURSE',
    methodId: 'funded-practice',
    skillId: KAMENNY_BROD_GUARD_COURSE.skillId,
    challengeLevel: KAMENNY_BROD_GUARD_COURSE.challengeLevel,
    providerId: KAMENNY_BROD_GUARD_COURSE.providerId,
    mentorId: KAMENNY_BROD_GUARD_COURSE.providerId,
    poolId: 'local',
    providerWalletId: input.providerWalletId,
    moneyAccessEvidenceId: input.accessEvidenceId,
    costQPerDay: KAMENNY_BROD_GUARD_COURSE.costQPerDay,
    maxTicks: KAMENNY_BROD_GUARD_COURSE.durationTicks,
  };
}

export function courseMoneyAccess(input: {
  readonly state: CompanyCombatAggregateState;
  readonly worldId: string;
  readonly companyId: string;
  readonly atTick: string;
  readonly evidenceId: string;
  readonly recipientWalletIds: readonly string[];
}): LocalMoneyAccess | undefined {
  const { lifecycle, finance } = input.state.economy;
  const location = KAMENNY_BROD_GUARD_COURSE.location;
  const operatorId = localCompanyContacts(input.state, input.companyId, location)[0];
  const pool = finance.pools.find((entry) => entry.poolId === 'local');
  const wallet = finance.wallets.find((entry) => entry.walletId === pool?.walletId);
  if (
    !operatorId ||
    !wallet ||
    wallet.location.kind !== 'AT' ||
    wallet.location.siteId !== location.siteId ||
    wallet.location.areaId !== location.areaId
  )
    return undefined;
  return {
    id: input.evidenceId,
    sourceEventId: input.evidenceId,
    worldId: input.worldId,
    companyId: input.companyId,
    revision: lifecycle.revision,
    atTick: campaignTick(input.atTick),
    kind: 'LOCAL_MONEY_ACCESS',
    operatorId,
    location,
    poolIds: ['local'],
    recipientWalletIds: [...input.recipientWalletIds],
  };
}

/** One attendance interval derived from the pre-command canonical snapshot. */
export function courseTimeInterval(input: {
  readonly state: CompanyCombatAggregateState;
  readonly task: LearningTask;
  readonly commandId: string;
  readonly fromTick: string;
  readonly toTick: string;
  readonly kind: 'ELIGIBLE' | 'INELIGIBLE';
}): LearningTimeInterval {
  const source = learningSourceForCourseTask(input.task);
  const interval: LearningTimeInterval = {
    intervalId: `interval-${input.commandId}-${input.task.start.taskId}`,
    taskId: input.task.start.taskId,
    commandId: input.commandId,
    ownerIntervalId: source.id,
    companyId: source.companyId,
    worldId: source.worldId,
    characterId: source.learnerId,
    fromTick: input.fromTick,
    toTick: input.toTick,
    kind: input.kind,
  };
  if (input.kind === 'INELIGIBLE') return interval;
  const membership = input.state.economy.lifecycle.memberships.find(
    (entry) =>
      entry.companyId === source.companyId &&
      entry.characterId === source.learnerId &&
      entry.endedAt === null,
  );
  if (!membership) throw new Error('Course learner has no active company membership');
  const attendanceId = `attendance-${input.commandId}-${input.task.start.taskId}`;
  const observations = [source.learnerId, source.providerId!].map((characterId) => {
    const character = input.state.economy.lifecycle.characters.find(
      (entry) => entry.identity.characterId === characterId,
    );
    if (!character)
      throw new Error('Course attendance participant is absent from the company root');
    const location = character.presence.location;
    if (location.kind !== 'AT')
      throw new Error('Eligible course attendance requires an at-location');
    return {
      observationId: `observation-${attendanceId}-${characterId}`,
      characterId,
      fromTick: input.fromTick,
      toTick: input.toTick,
      location,
      assignment: character.presence.assignment,
      availability: character.presence.availability,
      encounterBindingId: character.presence.encounterBindingId,
      conditionIds: [...character.conditionIds],
    };
  });
  return {
    ...interval,
    courseAttendance: {
      attendanceId,
      sourceId: source.id,
      sourceVersion: source.sourceVersion,
      taskId: input.task.start.taskId,
      companyId: source.companyId,
      worldId: source.worldId,
      learnerId: source.learnerId,
      providerId: source.providerId!,
      mentorId: source.mentorId!,
      skillId: source.skillId!,
      resourceIds: source.resourceIds,
      location: source.location,
      fromTick: input.fromTick,
      toTick: input.toTick,
      membership: {
        membershipId: membership.membershipId,
        companyId: membership.companyId,
        characterId: membership.characterId,
        startedAt: membership.startedAt,
        endedAt: membership.endedAt,
      },
      observations,
    },
  };
}

export function courseCauseManifest(input: {
  readonly state: CompanyCombatAggregateState;
  readonly task: LearningTask;
  readonly commandId: string;
  readonly targetTick: string;
  readonly intervals: readonly LearningTimeInterval[];
  readonly extraEvidenceIds?: readonly string[];
}): TrustedLearningCauseManifest {
  const source = learningSourceForCourseTask(input.task);
  return {
    companyId: source.companyId,
    worldId: source.worldId,
    commandId: input.commandId,
    taskId: input.task.start.taskId,
    ownerIntervalId: source.id,
    targetTick: input.targetTick,
    evidenceIds: [
      source.id,
      ...input.intervals.flatMap((interval) => [
        interval.intervalId,
        ...(interval.courseAttendance
          ? [
              interval.courseAttendance.attendanceId,
              interval.courseAttendance.membership.membershipId,
              ...interval.courseAttendance.observations.map((entry) => entry.observationId),
            ]
          : []),
      ]),
      ...(input.extraEvidenceIds ?? []),
    ],
  };
}

export function newCourseEvidenceId(): string {
  return randomUUID();
}

/** Compose elapsed course time into an existing server-owned campaign advance. */
export function prepareCourseAdvance(input: {
  readonly state: CompanyCombatAggregateState;
  readonly command: CommandOf<'AdvanceCampaign'>;
  readonly physicalFacts: readonly PhysicalEvidence[];
}):
  | {
      readonly kind: 'PREPARED';
      readonly next: CompanyCombatAggregateState;
      readonly events: readonly Readonly<object>[];
    }
  | { readonly kind: 'UNAVAILABLE' } {
  const active = input.state.learning.tasks.tasks.filter((task) => !task.stop && !task.terminal);
  if (active.length !== 1 || active[0]?.start.inputs?.kind !== 'COURSE')
    return { kind: 'UNAVAILABLE' };
  const task = active[0];
  const source = learningSourceForCourseTask(task);
  const targetTick = input.command.payload.toTick;
  const access = courseMoneyAccess({
    state: input.state,
    worldId: source.worldId,
    companyId: source.companyId,
    atTick: targetTick,
    evidenceId: `course-advance-access-${input.command.commandId}`,
    recipientWalletIds: [source.providerWalletId!],
  });
  if (!access) return { kind: 'UNAVAILABLE' };
  const fromTick = task.processedThroughTick ?? task.start.command.campaignTick;
  const intervals =
    BigInt(fromTick) < BigInt(targetTick)
      ? [
          courseTimeInterval({
            state: input.state,
            task,
            commandId: input.command.commandId,
            fromTick,
            toTick: targetTick,
            kind: courseAttendanceAvailable(input.state, source) ? 'ELIGIBLE' : 'INELIGIBLE',
          }),
        ]
      : [];
  const manifest = courseCauseManifest({
    state: input.state,
    task,
    commandId: input.command.commandId,
    targetTick,
    intervals,
  });
  const context = {
    worldId: source.worldId,
    companyId: source.companyId,
    principal: input.command.actorRef,
    publicRevision: input.state.economy.lifecycle.knowledge.revision,
    canonicalRevision: input.state.economy.lifecycle.revision,
    atTick: campaignTick(targetTick),
    completeGraph: true,
    contactIds: [
      ...localCompanyContacts(input.state, source.companyId, source.location),
      source.providerId!,
      source.learnerId,
    ],
    internalGrant: {
      commandId: input.command.commandId,
      sourceEventId: input.command.sourceEventId!,
      canonicalRequest: canonicalJson(input.command),
    },
    facts: [],
    financeFacts: [access],
    physicalFacts: input.physicalFacts,
    practiceFacts: [],
    learningFacts: [source],
  };
  const prepared = prepareCompanyEconomyWithLearning(
    { economy: input.state.economy, learning: input.state.learning },
    input.command,
    context,
    {
      taskId: task.start.taskId,
      effectId: `course-advance-${input.command.commandId}`,
      intervals,
      manifest,
    },
  );
  if (prepared.kind !== 'PREPARED' || prepared.replayed || prepared.receipt.requirements.length > 0)
    return { kind: 'UNAVAILABLE' };
  return {
    kind: 'PREPARED',
    next: readCompanyCombatAggregateState({
      ...input.state,
      economy: prepared.next.economy,
      learning: prepared.next.learning,
    }),
    events: prepared.receipt.events,
  };
}

export function prepareCourseInterruption(input: {
  readonly state: CompanyCombatAggregateState;
  readonly commandId: string;
  readonly sourceEventId: string;
  readonly atTick: string;
  readonly reason: 'PLAYER' | 'PREREQUISITES';
  readonly physicalFacts: readonly PhysicalEvidence[];
}):
  | {
      readonly kind: 'PREPARED';
      readonly command: CommandOf<'StopLearning'>;
      readonly next: CompanyCombatAggregateState;
      readonly events: readonly Readonly<object>[];
    }
  | { readonly kind: 'UNAVAILABLE' } {
  const active = input.state.learning.tasks.tasks.filter((task) => !task.stop && !task.terminal);
  if (active.length !== 1 || active[0]?.start.inputs?.kind !== 'COURSE')
    return { kind: 'UNAVAILABLE' };
  const task = active[0];
  const source = learningSourceForCourseTask(task);
  const access = courseMoneyAccess({
    state: input.state,
    worldId: source.worldId,
    companyId: source.companyId,
    atTick: input.atTick,
    evidenceId: `course-stop-access-${input.commandId}`,
    recipientWalletIds: [source.providerWalletId!],
  });
  if (!access) return { kind: 'UNAVAILABLE' };
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    rulesetId: COMPANY_RULESET_ID,
    commandId: input.commandId,
    sourceEventId: input.sourceEventId,
    worldId: source.worldId,
    companyId: source.companyId,
    actorRef: { kind: 'SYSTEM', id: 'company-course-interruption' },
    expectedRevision: input.state.economy.lifecycle.revision,
    campaignTick: campaignTick(input.atTick),
    type: 'StopLearning',
    payload: { taskId: task.start.taskId, reason: input.reason },
  });
  if (!parsed.ok || parsed.command.type !== 'StopLearning') return { kind: 'UNAVAILABLE' };
  const fromTick = task.processedThroughTick ?? task.start.command.campaignTick;
  const intervalKind = courseAttendanceAvailable(input.state, source) ? 'ELIGIBLE' : 'INELIGIBLE';
  const intervals =
    BigInt(fromTick) < BigInt(input.atTick)
      ? [
          courseTimeInterval({
            state: input.state,
            task,
            commandId: input.commandId,
            fromTick,
            toTick: input.atTick,
            kind: intervalKind,
          }),
        ]
      : [];
  const manifest = courseCauseManifest({
    state: input.state,
    task,
    commandId: input.commandId,
    targetTick: input.atTick,
    intervals,
    extraEvidenceIds: [task.start.taskId],
  });
  const context = {
    worldId: source.worldId,
    companyId: source.companyId,
    principal: parsed.command.actorRef,
    publicRevision: input.state.economy.lifecycle.knowledge.revision,
    canonicalRevision: input.state.economy.lifecycle.revision,
    atTick: campaignTick(input.atTick),
    completeGraph: true,
    contactIds: [
      ...localCompanyContacts(input.state, source.companyId, source.location),
      source.providerId!,
      source.learnerId,
    ],
    internalGrant: {
      commandId: input.commandId,
      sourceEventId: input.sourceEventId,
      canonicalRequest: canonicalJson(parsed.command),
    },
    facts: [],
    financeFacts: [access],
    physicalFacts: input.physicalFacts,
    practiceFacts: [],
    learningFacts: [source],
  };
  const prepared = prepareCompanyEconomyWithLearning(
    { economy: input.state.economy, learning: input.state.learning },
    parsed.command,
    context,
    {
      taskId: task.start.taskId,
      effectId: `course-interruption-${input.commandId}`,
      intervals,
      manifest,
    },
  );
  if (prepared.kind !== 'PREPARED' || prepared.replayed || prepared.receipt.requirements.length > 0)
    return { kind: 'UNAVAILABLE' };
  return {
    kind: 'PREPARED',
    command: parsed.command,
    next: readCompanyCombatAggregateState({
      ...input.state,
      economy: prepared.next.economy,
      learning: prepared.next.learning,
    }),
    events: prepared.receipt.events,
  };
}

export function prepareCourseStop(input: {
  readonly state: CompanyCombatAggregateState;
  readonly command: CommandOf<'StopLearning'>;
  readonly physicalFacts: readonly PhysicalEvidence[];
}):
  | {
      readonly kind: 'PREPARED';
      readonly next: CompanyCombatAggregateState;
      readonly events: readonly Readonly<object>[];
    }
  | { readonly kind: 'UNAVAILABLE' } {
  const task = input.state.learning.tasks.tasks.find(
    (entry) =>
      entry.start.taskId === input.command.payload.taskId && !entry.stop && !entry.terminal,
  );
  if (!task || task.start.inputs?.kind !== 'COURSE') return { kind: 'UNAVAILABLE' };
  const source = learningSourceForCourseTask(task);
  const access = courseMoneyAccess({
    state: input.state,
    worldId: source.worldId,
    companyId: source.companyId,
    atTick: campaignTick(input.command.campaignTick),
    evidenceId: `course-stop-access-${input.command.commandId}`,
    recipientWalletIds: [source.providerWalletId!],
  });
  if (!access) return { kind: 'UNAVAILABLE' };
  const fromTick = task.processedThroughTick ?? task.start.command.campaignTick;
  const intervals =
    BigInt(fromTick) < BigInt(input.command.campaignTick)
      ? [
          courseTimeInterval({
            state: input.state,
            task,
            commandId: input.command.commandId,
            fromTick,
            toTick: input.command.campaignTick,
            kind: courseAttendanceAvailable(input.state, source) ? 'ELIGIBLE' : 'INELIGIBLE',
          }),
        ]
      : [];
  const manifest = courseCauseManifest({
    state: input.state,
    task,
    commandId: input.command.commandId,
    targetTick: input.command.campaignTick,
    intervals,
    extraEvidenceIds: [task.start.taskId],
  });
  const context = {
    worldId: source.worldId,
    companyId: source.companyId,
    principal: input.command.actorRef,
    publicRevision: input.state.economy.lifecycle.knowledge.revision,
    canonicalRevision: input.state.economy.lifecycle.revision,
    atTick: campaignTick(input.command.campaignTick),
    completeGraph: true,
    contactIds: [
      ...localCompanyContacts(input.state, source.companyId, source.location),
      source.providerId!,
      source.learnerId,
    ],
    internalGrant: {
      commandId: input.command.commandId,
      sourceEventId: input.command.sourceEventId ?? `course-event-${input.command.commandId}`,
      canonicalRequest: canonicalJson(input.command),
    },
    facts: [],
    financeFacts: [access],
    physicalFacts: input.physicalFacts,
    practiceFacts: [],
    learningFacts: [source],
  };
  const prepared = prepareCompanyEconomyWithLearning(
    { economy: input.state.economy, learning: input.state.learning },
    input.command,
    context,
    {
      taskId: task.start.taskId,
      effectId: `course-stop-${input.command.commandId}`,
      intervals,
      manifest,
    },
  );
  if (prepared.kind !== 'PREPARED' || prepared.replayed || prepared.receipt.requirements.length > 0)
    return { kind: 'UNAVAILABLE' };
  return {
    kind: 'PREPARED',
    next: readCompanyCombatAggregateState({
      ...input.state,
      economy: prepared.next.economy,
      learning: prepared.next.learning,
    }),
    events: prepared.receipt.events,
  };
}

function courseAttendanceAvailable(
  state: CompanyCombatAggregateState,
  source: LearningSourceEvidence,
): boolean {
  const characters = [source.learnerId, source.providerId].map((id) =>
    state.economy.lifecycle.characters.find((entry) => entry.identity.characterId === id),
  );
  const learner = characters[0];
  const provider = characters[1];
  return !!(
    learner &&
    provider &&
    learner.presence.location.kind === 'AT' &&
    learner.presence.location.siteId === source.location.siteId &&
    learner.presence.location.areaId === source.location.areaId &&
    provider.presence.location.kind === 'AT' &&
    provider.presence.location.siteId === source.location.siteId &&
    provider.presence.location.areaId === source.location.areaId &&
    canPerform(learner, 'study') &&
    canPerform(provider, 'basicWork') &&
    provider.presence.assignment !== 'REMOTE_TASK'
  );
}
