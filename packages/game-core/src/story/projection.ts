import type { StoryDefinition } from './definition.js';
import { availableStoryChoices, hasStoryFact, storyChoiceBlocker } from './guards.js';
import type {
  StoryChoiceId,
  StoryCompanyState,
  StoryPublicConsequences,
  StoryWorldState,
} from './model.js';

export interface StoryProjection {
  readonly missionId: string;
  readonly definitionVersion: 1;
  readonly availability: 'OFFERED' | 'CLOSED' | 'NOT_YET_AVAILABLE';
  readonly sceneId: string;
  readonly visibleLineIds: readonly string[];
  readonly availableChoices: readonly StoryChoiceId[];
  readonly journal: StoryCompanyState['facts'];
  readonly metActors: StoryCompanyState['metActors'];
  readonly publicOutcome: null | {
    readonly endingId: string;
    readonly accusedActor: string;
    readonly consequences: StoryPublicConsequences;
    readonly isFinishingCompany: boolean;
  };
}

function visibleLines(world: StoryWorldState, company: StoryCompanyState): readonly string[] {
  switch (company.currentSceneId) {
    case 'S00':
      return [
        'title',
        'brief',
        '01',
        world.eligibilitySource.companyId === company.companyId ? '02-rescuers' : '02-others',
        '03',
        '04',
        '05',
        '06',
        '07',
        'accept',
        'later',
        'reward',
      ];
    case 'S01':
      return [
        'sacks',
        ...(hasStoryFact(company, 'F01') ? ['01', '02'] : []),
        'tax',
        ...(hasStoryFact(company, 'F02') ? ['03'] : []),
        ...(company.receiptsInspected ? ['04'] : []),
        ...(hasStoryFact(company, 'F03') ? ['05'] : []),
      ];
    case 'S02':
      return [
        'guard',
        ...(hasStoryFact(company, 'F04') ? ['01', 'food'] : []),
        ...(hasStoryFact(company, 'F05') ? ['02', '03'] : []),
        ...(hasStoryFact(company, 'F08') ? ['ask-senka-sack'] : []),
        'work',
        '04',
        'next',
      ];
    case 'S03':
      return [
        '01',
        'enter',
        '02',
        ...(hasStoryFact(company, 'F06') ? ['02-sound', 'who', '02-son', 'son', '03'] : []),
        ...(hasStoryFact(company, 'F07') ? ['inspect', '04'] : []),
        ...(hasStoryFact(company, 'F08')
          ? ['sack', '05', 'grain', ...(company.cacheReasonAsked ? ['06'] : [])]
          : []),
      ];
    case 'S04':
      return hasStoryFact(company, 'F09') ? ['ask', '01', '02', '03', 'next'] : ['ask'];
    case 'S06':
      return hasStoryFact(company, 'F11')
        ? ['compare', '01', '02', 'ask', '03', '04', '05', 'next']
        : hasStoryFact(company, 'F10')
          ? ['compare', '01', '02', 'ask', '03']
          : ['compare'];
    case 'S07':
      if (company.pendingAccusation) {
        return company.pendingAccusation.proven
          ? ['warn-proof', 'commit-proof', 'back']
          : company.pendingAccusation.actorId === 'SENKA'
            ? ['warn-senka', 'commit', 'back']
            : ['warn-kondrat', 'commit', 'back'];
      }
      return [
        '01',
        ...(company.metActors.includes('ULITA')
          ? [hasStoryFact(company, 'F11') ? 'proof' : 'ulita']
          : []),
        ...(company.metActors.includes('SENKA') ? ['senka'] : []),
        ...(company.metActors.includes('KONDRAT') ? ['kondrat'] : []),
        'wait',
      ];
    case 'S08':
      if (!hasStoryFact(company, 'F07')) return ['01', '02', '03-no-sack', '04-no-sack', 'next'];
      if (!hasStoryFact(company, 'F09')) return ['01', '02', '03-sack', '04-clue', 'next'];
      if (!hasStoryFact(company, 'F10')) return ['01', '02', '03-before-son', '04-clue', 'next'];
      return ['01', '02', '03-obukh', '04-clue', 'next'];
    case 'LATE':
      return company.currentSceneId === 'LATE' ? ['moved'] : [];
    default:
      return [];
  }
}

/** Private projection. It deliberately returns line IDs rather than the definition/truth. */
export function projectStory(
  definition: StoryDefinition,
  world: StoryWorldState,
  company: StoryCompanyState,
  atTick: string,
): StoryProjection {
  const isFinishingCompany = world.outcome?.finishingCompanyId === company.companyId;
  const validTick = /^(0|[1-9][0-9]*)$/u.test(atTick);
  const available = validTick && BigInt(atTick) >= BigInt(world.eligibilitySource.availableAtTick);
  const closed = world.outcome !== null;
  const sceneId = closed
    ? isFinishingCompany
      ? world.outcome!.endingId
      : 'LATE'
    : company.currentSceneId;
  const choices = closed
    ? []
    : company.status === 'OFFERED'
      ? available
        ? (['accept', 'defer'] as const)
        : []
      : company.pendingAccusation
        ? (['confirm', 'back'] as const)
        : availableStoryChoices(definition, company).filter(
            (id) => storyChoiceBlocker(definition, world, company, id) === null,
          );
  return {
    missionId: world.missionId,
    definitionVersion: world.definitionVersion,
    availability: closed ? 'CLOSED' : available ? 'OFFERED' : 'NOT_YET_AVAILABLE',
    sceneId,
    visibleLineIds:
      !available && !closed
        ? []
        : closed
          ? isFinishingCompany
            ? world.outcome?.endingId === 'E01'
              ? ['01', 'ask', '02', '03', '04', '05', '06', '07']
              : world.outcome?.endingId === 'E02'
                ? [
                    '01',
                    '02',
                    '03',
                    '04',
                    hasStoryFact(company, 'F11')
                      ? 'journal-E02-with-F11'
                      : 'journal-E02-without-F11',
                  ]
                : ['01', '02', '03', '04', '05', 'journal-E03']
            : [
                world.outcome?.endingId === 'E01'
                  ? 'L-E01'
                  : world.outcome?.endingId === 'E02'
                    ? 'L-E02'
                    : 'L-E03',
                world.outcome?.endingId === 'E01'
                  ? 'journal-E01'
                  : world.outcome?.endingId === 'E02'
                    ? 'journal-E02'
                    : 'journal-E03',
              ]
          : visibleLines(world, company),
    availableChoices: choices,
    journal: company.facts,
    metActors: company.metActors,
    publicOutcome: world.outcome
      ? {
          endingId: world.outcome.endingId,
          accusedActor: world.outcome.accusedActor,
          consequences: world.outcome.publicConsequences,
          isFinishingCompany,
        }
      : null,
  };
}
