import { CACHE_DISCLOSURE_STORY, type StoryDefinition } from './definition.js';
import { hasProofFindings, hasStoryFact, storyChoiceBlocker } from './guards.js';
import { STORY_PLACE_ID } from './model.js';
import type {
  StoryCommand,
  StoryCommandContext,
  StoryCompanyState,
  StoryEndingId,
  StoryFactId,
  StoryPreparation,
  StoryWorldState,
} from './model.js';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

const rejected = (
  code: Extract<StoryPreparation, { kind: 'REJECTED' }>['code'],
): StoryPreparation => ({ kind: 'REJECTED', code });
const tickValid = (value: string) => /^(0|[1-9][0-9]*)$/u.test(value);
const tickAtLeast = (now: string, required: string) =>
  tickValid(now) && tickValid(required) && BigInt(now) >= BigInt(required);

export function storyWorldGenesis(
  eligibilitySource: StoryWorldState['eligibilitySource'],
): StoryWorldState {
  return freeze({
    version: 1,
    missionId: CACHE_DISCLOSURE_STORY.id,
    definitionVersion: 1,
    revision: '0',
    eligibilitySource,
    outcome: null,
  });
}

export function storyCompanyGenesis(companyId: string, world: StoryWorldState): StoryCompanyState {
  return freeze({
    version: 1,
    missionId: world.missionId,
    definitionVersion: world.definitionVersion,
    companyId,
    revision: '0',
    status: 'OFFERED',
    currentSceneId: 'S00',
    pendingAccusation: null,
    receiptsInspected: false,
    cacheReasonAsked: false,
    metActors: [],
    facts: [],
  });
}

function nextCompany(
  company: StoryCompanyState,
  patch: Partial<StoryCompanyState>,
): StoryCompanyState {
  return freeze({ ...company, ...patch, revision: (BigInt(company.revision) + 1n).toString() });
}

function addMet(company: StoryCompanyState, actor: 'KONDRAT' | 'SENKA' | 'ULITA') {
  return company.metActors.includes(actor) ? company.metActors : [...company.metActors, actor];
}

function withFact(
  definition: StoryDefinition,
  company: StoryCompanyState,
  factId: StoryFactId,
  context: StoryCommandContext,
): StoryCompanyState {
  if (hasStoryFact(company, factId)) return company;
  const def = definition.findings.find((entry) => entry.factId === factId)!;
  return freeze({
    ...company,
    facts: [
      ...company.facts,
      {
        factId,
        source: def.source,
        sceneId: def.producedBy.sceneId,
        choiceId: def.producedBy.choiceId,
        sourceEventId: context.sourceEventId,
        learnedAtTick: context.atTick,
        ...(def.historicalTiming ? { historicalTiming: def.historicalTiming } : {}),
      },
    ],
  });
}

function publish(
  definition: StoryDefinition,
  world: StoryWorldState,
  company: StoryCompanyState,
  context: StoryCommandContext,
  endingId: StoryEndingId,
  actor: 'KONDRAT' | 'SENKA' | 'ULITA',
  proven: boolean,
): StoryPreparation {
  const ending = definition.outcomes.find((entry) => entry.endingId === endingId);
  if (!ending || ending.accusedActor !== actor || ending.proven !== proven)
    return rejected('NOT_AVAILABLE');
  const nextWorld = freeze({
    ...world,
    revision: (BigInt(world.revision) + 1n).toString(),
    outcome: {
      endingId,
      accusedActor: actor,
      proven,
      finishingCompanyId: company.companyId,
      sourceEventId: context.sourceEventId,
      atTick: context.atTick,
      publicConsequences: ending.publicConsequences,
    },
  });
  const facts =
    endingId === 'E02' && !hasStoryFact(company, 'F05')
      ? [
          ...company.facts,
          {
            factId: 'F05' as const,
            source: { kind: 'ACTOR' as const, actorId: 'SENKA' as const },
            sceneId: 'S07' as const,
            choiceId: 'confirm-e02',
            sourceEventId: context.sourceEventId,
            learnedAtTick: context.atTick,
          },
        ]
      : company.facts;
  const next = nextCompany(company, { status: 'COMPLETED', pendingAccusation: null, facts });
  return {
    kind: 'PREPARED',
    world: nextWorld,
    company: next,
    payoutEligibility: ending.payout ? { companyId: company.companyId, ...ending.payout } : null,
  };
}

/** Deterministic, fail-closed transition. Funding and payment remain server transaction policy. */
export function prepareStoryCommand(
  definition: StoryDefinition,
  world: StoryWorldState,
  company: StoryCompanyState,
  command: StoryCommand,
  context: StoryCommandContext,
): StoryPreparation {
  if (
    world.missionId !== definition.id ||
    company.missionId !== world.missionId ||
    company.companyId !== context.companyId
  )
    return rejected('NOT_AVAILABLE');
  if (
    context.expectedWorldRevision !== world.revision ||
    context.expectedCompanyRevision !== company.revision
  )
    return rejected('STALE_REVISION');
  if (!tickValid(context.atTick) || !tickValid(world.eligibilitySource.availableAtTick))
    return rejected('NOT_AVAILABLE');
  if (world.outcome) return rejected('ALREADY_COMPLETED');
  if (context.standingPlaceId !== STORY_PLACE_ID) return rejected('WRONG_PLACE');
  if (!tickAtLeast(context.atTick, world.eligibilitySource.availableAtTick))
    return rejected('NOT_ELIGIBLE');
  if (!context.sourceEventId) return rejected('NOT_AVAILABLE');

  if (command.type === 'ACCEPT') {
    if (company.status !== 'OFFERED') return rejected('NOT_AVAILABLE');
    const next = nextCompany(company, {
      status: 'ACCEPTED',
      currentSceneId: 'S01',
      metActors: addMet(company, 'KONDRAT'),
    });
    return { kind: 'PREPARED', world, company: next, payoutEligibility: null };
  }
  if (command.type === 'DEFER') {
    if (company.status !== 'OFFERED') return rejected('NOT_AVAILABLE');
    return {
      kind: 'PREPARED',
      world,
      company: nextCompany(company, { currentSceneId: 'S00' }),
      payoutEligibility: null,
    };
  }
  if (company.status !== 'ACCEPTED') return rejected('NOT_ACCEPTED');

  if (command.type === 'CONFIRM') {
    if (!company.pendingAccusation) return rejected('NO_PENDING_ACCUSATION');
    const { actor, proven } = {
      actor: company.pendingAccusation.actorId,
      proven: company.pendingAccusation.proven,
    };
    if (actor === 'ULITA' && (!proven || !hasProofFindings(company)))
      return rejected('MISSING_FACT');
    if (actor === 'ULITA') return publish(definition, world, company, context, 'E01', actor, true);
    if (actor === 'SENKA') return publish(definition, world, company, context, 'E02', actor, false);
    return publish(definition, world, company, context, 'E03', actor, false);
  }
  if (command.type === 'RETURN') {
    return {
      kind: 'PREPARED',
      world,
      company: nextCompany(company, { pendingAccusation: null, currentSceneId: 'S01' }),
      payoutEligibility: null,
    };
  }
  if (command.type !== 'CHOOSE') return rejected('NOT_AVAILABLE');

  const choiceId = command.choiceId;
  const blocker = storyChoiceBlocker(definition, world, company, choiceId);
  if (blocker) return rejected(blocker);
  let next = company;
  switch (choiceId) {
    case 'to-kondrat':
      next = nextCompany(company, { currentSceneId: 'S01' });
      break;
    case 'to-senka':
      next = nextCompany(company, { currentSceneId: 'S02', metActors: addMet(company, 'SENKA') });
      break;
    case 'to-ulita':
      next = nextCompany(company, { currentSceneId: 'S03', metActors: addMet(company, 'ULITA') });
      break;
    case 'ask-senka-sack':
      if (company.currentSceneId === 'S02' || company.currentSceneId === 'S03')
        next = nextCompany(company, { currentSceneId: 'S04', metActors: addMet(company, 'SENKA') });
      else
        next = withFact(
          definition,
          nextCompany(company, { currentSceneId: 'S04' }),
          'F09',
          context,
        );
      break;
    case 'open-accusation':
      next = nextCompany(company, { currentSceneId: 'S07', metActors: addMet(company, 'KONDRAT') });
      break;
    case 'ask-sacks':
      next = withFact(definition, nextCompany(company, {}), 'F01', context);
      break;
    case 'ask-tax':
      next = withFact(definition, nextCompany(company, {}), 'F02', context);
      break;
    case 'inspect-receipts':
      next = nextCompany(company, { receiptsInspected: true });
      break;
    case 'compare-receipts':
      next = withFact(definition, nextCompany(company, {}), 'F03', context);
      break;
    case 'ask-guard':
      next = withFact(definition, nextCompany(company, {}), 'F04', context);
      break;
    case 'ask-bread':
      next = withFact(definition, nextCompany(company, {}), 'F05', context);
      break;
    case 'ask-son':
      next = withFact(definition, nextCompany(company, {}), 'F06', context);
      break;
    case 'inspect-sack':
      next = withFact(definition, nextCompany(company, {}), 'F07', context);
      break;
    case 'ask-sack-origin':
      next = withFact(definition, nextCompany(company, {}), 'F08', context);
      break;
    case 'ask-why-cache':
      next = nextCompany(company, { cacheReasonAsked: true });
      break;
    case 'open-confrontation':
      next = nextCompany(company, { currentSceneId: 'S06', metActors: addMet(company, 'ULITA') });
      break;
    case 'confront-ulita':
      next = withFact(definition, nextCompany(company, {}), 'F10', context);
      break;
    case 'ask-where-grain':
      next = withFact(definition, nextCompany(company, {}), 'F11', context);
      break;
    case 'accuse-ulita':
      if (!hasProofFindings(company))
        next = nextCompany(company, { currentSceneId: 'S08', pendingAccusation: null });
      else next = nextCompany(company, { pendingAccusation: { actorId: 'ULITA', proven: true } });
      break;
    case 'accuse-senka':
      next = nextCompany(company, { pendingAccusation: { actorId: 'SENKA', proven: false } });
      break;
    case 'accuse-kondrat':
      next = nextCompany(company, { pendingAccusation: { actorId: 'KONDRAT', proven: false } });
      break;
    case 'wait':
      next = nextCompany(company, { pendingAccusation: null });
      break;
    case 'back':
      next = nextCompany(company, { pendingAccusation: null, currentSceneId: 'S07' });
      break;
    case 'accept':
    case 'defer':
    case 'confirm':
      return rejected('NOT_AVAILABLE');
  }
  // Entering any interview scene records a personal meeting, not merely knowledge of a name.
  return { kind: 'PREPARED', world, company: freeze(next), payoutEligibility: null };
}
