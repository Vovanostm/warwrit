import type { StoryDefinition } from './definition.js';
import type {
  StoryChoiceId,
  StoryCompanyState,
  StoryFactId,
  StoryRejection,
  StoryWorldState,
} from './model.js';

export const hasStoryFact = (state: StoryCompanyState, factId: StoryFactId): boolean =>
  state.facts.some((fact) => fact.factId === factId);

export const hasProofFindings = (state: StoryCompanyState): boolean =>
  (['F01', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11'] as const).every((id) =>
    hasStoryFact(state, id),
  );

export function storyChoiceBlocker(
  definition: StoryDefinition,
  world: StoryWorldState,
  company: StoryCompanyState,
  choiceId: StoryChoiceId,
): StoryRejection | null {
  const scene = definition.scenes.find((entry) => entry.sceneId === company.currentSceneId);
  if (!scene?.choiceIds.includes(choiceId)) return 'NOT_AVAILABLE';
  if (world.outcome) return 'ALREADY_COMPLETED';
  if (company.status !== 'ACCEPTED') return 'NOT_ACCEPTED';
  if (company.pendingAccusation && choiceId !== 'back') return 'NOT_AVAILABLE';
  const met = (actor: 'KONDRAT' | 'SENKA' | 'ULITA') => company.metActors.includes(actor);
  switch (choiceId) {
    case 'ask-sacks':
      return company.currentSceneId === 'S01' ? null : 'NOT_AVAILABLE';
    case 'ask-tax':
      return company.currentSceneId === 'S01' ? null : 'NOT_AVAILABLE';
    case 'inspect-receipts':
      return company.currentSceneId === 'S01' && hasStoryFact(company, 'F02')
        ? null
        : 'MISSING_FACT';
    case 'compare-receipts':
      return company.currentSceneId === 'S01' &&
        hasStoryFact(company, 'F02') &&
        company.receiptsInspected
        ? null
        : 'MISSING_FACT';
    case 'ask-guard':
      return company.currentSceneId === 'S02' ? null : 'NOT_AVAILABLE';
    case 'ask-bread':
      return company.currentSceneId === 'S02' && hasStoryFact(company, 'F04')
        ? null
        : 'MISSING_FACT';
    case 'ask-son':
      return company.currentSceneId === 'S03' ? null : 'NOT_AVAILABLE';
    case 'inspect-sack':
      return company.currentSceneId === 'S03' && hasStoryFact(company, 'F01')
        ? null
        : 'MISSING_FACT';
    case 'ask-sack-origin':
      return company.currentSceneId === 'S03' && hasStoryFact(company, 'F07')
        ? null
        : 'MISSING_FACT';
    case 'ask-why-cache':
      return company.currentSceneId === 'S03' && hasStoryFact(company, 'F08')
        ? null
        : 'MISSING_FACT';
    case 'ask-senka-sack':
      if (company.currentSceneId === 'S02' && !hasStoryFact(company, 'F08')) return 'MISSING_FACT';
      if (company.currentSceneId === 'S03' && !hasStoryFact(company, 'F08')) return 'MISSING_FACT';
      return ['S02', 'S03', 'S04'].includes(company.currentSceneId) ? null : 'NOT_AVAILABLE';
    case 'confront-ulita':
      return company.currentSceneId === 'S06' &&
        hasFactSet(company, ['F01', 'F06', 'F07', 'F08', 'F09'])
        ? null
        : 'MISSING_FACT';
    case 'ask-where-grain':
      return company.currentSceneId === 'S06' && hasStoryFact(company, 'F10')
        ? null
        : 'MISSING_FACT';
    case 'open-confrontation':
      return hasFactSet(company, ['F01', 'F06', 'F07', 'F08', 'F09']) ? null : 'MISSING_FACT';
    case 'open-accusation':
      return met('KONDRAT') ? null : 'NOT_MET';
    case 'accuse-ulita':
      return company.currentSceneId === 'S07' && met('ULITA') ? null : 'NOT_MET';
    case 'accuse-senka':
      return company.currentSceneId === 'S07' && met('SENKA') ? null : 'NOT_MET';
    case 'accuse-kondrat':
      return company.currentSceneId === 'S07' && met('KONDRAT') ? null : 'NOT_MET';
    case 'wait':
      return company.currentSceneId === 'S07' ? null : 'NOT_AVAILABLE';
    case 'back':
      return company.pendingAccusation ? null : 'NO_PENDING_ACCUSATION';
    case 'to-kondrat':
      return met('KONDRAT') ? null : 'NOT_MET';
    case 'to-senka':
      return company.status === 'ACCEPTED' ? null : 'NOT_ACCEPTED';
    case 'to-ulita':
      return company.status === 'ACCEPTED' ? null : 'NOT_ACCEPTED';
    case 'accept':
    case 'defer':
    case 'confirm':
      return 'NOT_AVAILABLE';
  }
}

function hasFactSet(state: StoryCompanyState, facts: readonly StoryFactId[]): boolean {
  return facts.every((id) => hasStoryFact(state, id));
}

/** Choice availability for a company; never includes immutable truth or other companies' state. */
export function availableStoryChoices(
  definition: StoryDefinition,
  company: StoryCompanyState,
): readonly StoryChoiceId[] {
  const scene = definition.scenes.find((entry) => entry.sceneId === company.currentSceneId);
  if (!scene) return [];
  return scene.choiceIds as readonly StoryChoiceId[];
}
