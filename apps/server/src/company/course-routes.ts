import { randomUUID } from 'node:crypto';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  canonicalJson,
  campaignTick,
  canPerform,
  companySourceKey,
  parseCompanyCommand,
  readSkillProgress,
  skillLevel,
  isEntityId,
} from '@warwrit/game-core';
import type { CompanyCourseResponseDto } from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Transaction } from 'kysely';
import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  updateCompanyAggregateWithReceipt,
} from './repository.js';
import type { CompanyRoutesOptions } from './routes.js';
import { prepareStationaryFoodFacts } from './travel-food.js';
import {
  KAMENNY_BROD_GUARD_COURSE,
  prepareCourseAdvance,
  courseResourceIds,
} from './courses.js';
import { localCompanyContacts } from './recruitment.js';

export function registerCompanyCourseRoutes(
  app: FastifyInstance,
  { database, worldId }: CompanyRoutesOptions,
): void {
  app.get<{ Params: { siteId: string } }>(
    '/company/courses/:siteId',
    async (request, reply): Promise<CompanyCourseResponseDto | unknown> => {
      const accountId = await resolveSessionAccount(request, database);
      if (!accountId) return reply.code(401).send({ error: 'authentication required' });
      const result = await database.transaction().execute(async (transaction) => {
        if (!(await lockIdentityAccount(transaction, accountId)))
          return reply.code(401).send({ error: 'authentication required' });
        const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
        if (!companyId) return null;
        const expectedCompanyId = readExpectedCompanyId(request.raw.rawHeaders);
        if (expectedCompanyId !== companyId)
          return reply.code(409).send({ error: 'company scope changed' });
        let state = await lockCompanyAggregate(transaction, worldId, companyId);
        if (!state) throw new Error('Owned company snapshot is unavailable');
        const clock = await readWorldClock(transaction, worldId, new Date(), true);
        const party =
          state.economy.lifecycle.parties.length === 1
            ? state.economy.lifecycle.parties[0]
            : undefined;
        const local =
          party?.location.kind === 'AT' &&
          party.location.siteId === request.params.siteId &&
          request.params.siteId === KAMENNY_BROD_GUARD_COURSE.location.siteId &&
          party.location.areaId === KAMENNY_BROD_GUARD_COURSE.location.areaId &&
          localCompanyContacts(state, companyId, KAMENNY_BROD_GUARD_COURSE.location).length > 0;
        if (local && BigInt(clock.tick) > BigInt(state.economy.lifecycle.campaignTick)) {
          const advanced = await advanceCourseToClock(transaction, state, clock.tick);
          if (advanced) state = advanced;
        }
        return courseView(state, companyId, local);
      });
      return result === null ? reply.code(403).send({ error: 'company required' }) : result;
    },
  );
}

function readExpectedCompanyId(rawHeaders: readonly string[]): string | undefined {
  let expectedCompanyId: string | undefined;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() !== WORLD_EXPECTED_COMPANY_ID_HEADER) continue;
    if (expectedCompanyId !== undefined || !isEntityId(rawHeaders[index + 1])) return undefined;
    expectedCompanyId = rawHeaders[index + 1];
  }
  return expectedCompanyId;
}

async function advanceCourseToClock(
  transaction: Transaction<DatabaseSchema>,
  state: NonNullable<Awaited<ReturnType<typeof lockCompanyAggregate>>>,
  toTick: string,
) {
  const active = state.learning.tasks.tasks.filter((task) => !task.stop && !task.terminal);
  if (active.length !== 1 || active[0]?.start.inputs?.kind !== 'COURSE') return undefined;
  const commandId = randomUUID();
  const sourceEventId = randomUUID();
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    rulesetId: COMPANY_RULESET_ID,
    commandId,
    sourceEventId,
    worldId: state.economy.lifecycle.worldId,
    companyId: state.economy.lifecycle.companyId,
    actorRef: { kind: 'SYSTEM', id: 'company-course-observation' },
    expectedRevision: state.economy.lifecycle.revision,
    campaignTick: campaignTick(toTick),
    type: 'AdvanceCampaign',
    payload: { toTick, authoritativeInputs: [] },
  });
  if (!parsed.ok || parsed.command.type !== 'AdvanceCampaign') return undefined;
  const food = prepareStationaryFoodFacts(state, toTick, commandId);
  if (food.kind !== 'PREPARED') return undefined;
  const prepared = prepareCourseAdvance({ state, command: parsed.command, physicalFacts: food.facts });
  if (prepared.kind !== 'PREPARED') return undefined;
  const next = prepared.next;
  const response = {
    commandId,
    ok: true as const,
    publicRevision: next.economy.lifecycle.knowledge.revision,
  };
  const sourceKey = companySourceKey(parsed.command);
  if (sourceKey === null) return undefined;
  await updateCompanyAggregateWithReceipt(
    transaction,
    state.economy.lifecycle.revision,
    next.economy.lifecycle.revision,
    next,
    {
      command: parsed.command,
      receipt: {
        receiptId: randomUUID(),
        commandId,
        sourceKey,
        requestKey: canonicalJson({ kind: 'COURSE_OBSERVATION', commandId, toTick }),
        response,
        resultingRevision: next.economy.lifecycle.revision,
      },
      auditEvents: prepared.events.map((event) => ({
        eventId: (event as { readonly id?: string }).id ?? randomUUID(),
        revision: next.economy.lifecycle.revision,
        event,
      })),
    },
  );
  return next;
}

function courseView(
  state: NonNullable<Awaited<ReturnType<typeof lockCompanyAggregate>>>,
  companyId: string,
  local: boolean,
): CompanyCourseResponseDto {
  const courseTasks = state.learning.tasks.tasks.filter(
    (task) =>
      task.start.quote.sourceVersion === KAMENNY_BROD_GUARD_COURSE.sourceVersion &&
      task.start.inputs?.kind === 'COURSE',
  );
  const active = courseTasks.find((task) => !task.stop && !task.terminal);
  const otherLearning = state.learning.tasks.tasks.some(
    (task) => !task.stop && !task.terminal && task !== active,
  );
  const completed = courseTasks.find(
    (task) =>
      task.terminal?.kind === 'GOAL_REACHED' ||
      (task.terminal?.kind === 'QUOTE_LIMIT' &&
        task.completedTicks === KAMENNY_BROD_GUARD_COURSE.durationTicks),
  );
  const stopped = [...courseTasks].reverse().find((task) => task.stop !== undefined);
  const interrupted = [...courseTasks]
    .reverse()
    .find((task) => task.terminal !== undefined && task !== completed);
  const visibleTask = active ?? completed ?? stopped ?? interrupted;
  const resources = courseResourceIds(state);
  const learners =
    !local || active || otherLearning || completed || resources.length === 0
      ? []
      : state.economy.lifecycle.characters.flatMap((character) => {
          const characterId = character.identity.characterId;
          const membership = state.economy.lifecycle.memberships.find(
            (entry) =>
              entry.characterId === characterId &&
              entry.companyId === companyId &&
              entry.endedAt === null,
          );
          const skill = character.skills[KAMENNY_BROD_GUARD_COURSE.skillId];
          if (
            !membership ||
            character.presence.fieldPartyId !== state.economy.lifecycle.parties[0]?.partyId ||
            character.presence.location.kind !== 'AT' ||
            character.presence.location.siteId !== KAMENNY_BROD_GUARD_COURSE.location.siteId ||
            character.presence.location.areaId !== KAMENNY_BROD_GUARD_COURSE.location.areaId ||
            !canPerform(character, 'study')
          )
            return [];
          const currentProgress = skill === undefined ? 0 : readSkillProgress(skill);
          const currentLevel =
            typeof currentProgress === 'number' ? currentProgress : skillLevel(currentProgress);
          return [{ characterId, currentLevel, resourceIds: resources }];
        });
  return {
    course: {
      courseId: KAMENNY_BROD_GUARD_COURSE.id,
      providerId: KAMENNY_BROD_GUARD_COURSE.providerId,
      skillId: KAMENNY_BROD_GUARD_COURSE.skillId,
      durationTicks: KAMENNY_BROD_GUARD_COURSE.durationTicks,
      costQPerDay: KAMENNY_BROD_GUARD_COURSE.costQPerDay,
      status: active
        ? 'IN_PROGRESS'
        : completed
          ? 'COMPLETE'
        : local && learners.length
            ? 'AVAILABLE'
            : 'UNAVAILABLE',
      ...(!local
        ? { unavailableReason: 'NOT_LOCAL' as const }
        : resources.length === 0
          ? { unavailableReason: 'NO_RESOURCE' as const }
          : learners.length === 0 && !active && !completed
            ? {
                unavailableReason:
                  otherLearning
                    ? ('OTHER_LEARNING' as const)
                    : ('NO_ELIGIBLE_LEARNER' as const),
              }
            : {}),
      learners,
      ...(visibleTask
        ? {
            progress: {
              taskId: visibleTask.start.taskId,
              learnerId: visibleTask.start.command.payload.characterId,
              acceptedTicks: visibleTask.completedTicks,
              remainingTicks: (
                BigInt(KAMENNY_BROD_GUARD_COURSE.durationTicks) -
                BigInt(visibleTask.completedTicks)
              ).toString(),
              chargedQ: (state.economy.finance.learningEffects ?? [])
                .filter((effect) => effect.taskId === visibleTask.start.taskId)
                .reduce((sum, effect) => sum + BigInt(effect.transferQ), 0n)
                .toString(),
            },
          }
        : {}),
    },
  };
}
