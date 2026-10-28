import type { MissionArtId } from './art.js';

/** Facts belong only to the current rehearsal path. */
export interface StoryCondition {
  readonly all?: readonly string[];
  readonly any?: readonly string[];
  readonly none?: readonly string[];
}

/** Local manuscript rehearsal only. No campaign state, money or authoritative knowledge. */
export interface StoryLine {
  /** Stable local line ID; translation key: mission ID / scene ID / line ID. */
  readonly id: string;
  readonly speaker?: string;
  readonly text: string;
  readonly when?: StoryCondition;
}

export interface StoryChoice {
  readonly id: string;
  readonly text: string;
  readonly to: string;
  readonly requires?: readonly string[];
  readonly when?: StoryCondition;
  readonly grants?: readonly string[];
  /** A completed inspection cannot be selected again on the current path. */
  readonly once?: boolean;
  readonly unavailable?: string;
}

export interface StoryScene {
  readonly title: string;
  /** Omitted for manuscripts whose own illustrations have not been made. */
  readonly art?: MissionArtId;
  readonly lines: readonly StoryLine[];
  readonly finding?: string;
  readonly choices: readonly StoryChoice[];
  /** Presence marks a terminal scene; an empty string adds no prose. */
  readonly ending?: string;
}

export interface Mission {
  readonly presentation?: 'text' | 'partial';
  readonly id: string;
  readonly title: string;
  readonly place: string;
  readonly genre: string;
  readonly brief: string;
  readonly motif: string;
  readonly scenes: Readonly<Record<string, StoryScene>>;
}

export interface StoryStep {
  readonly scene: string;
  readonly facts: readonly string[];
}

export const initialStory: readonly StoryStep[] = [{ scene: 'start', facts: [] }];

export function matches(condition: StoryCondition | undefined, facts: readonly string[]): boolean {
  return (
    (condition?.all ?? []).every((fact) => facts.includes(fact)) &&
    (!condition?.any || condition.any.some((fact) => facts.includes(fact))) &&
    (condition?.none ?? []).every((fact) => !facts.includes(fact))
  );
}

export function sceneAt(mission: Mission, path: readonly string[]): StoryScene {
  const scene = mission.scenes[path.at(-1) ?? 'start'];
  if (!scene) throw new Error('Unknown manuscript scene');
  return scene;
}

export function canChoose(
  choice: StoryChoice,
  path: readonly string[],
  facts: readonly string[] = [],
): boolean {
  return (
    matches(choice.when, facts) &&
    (choice.requires ?? []).every((scene) => path.includes(scene)) &&
    (!choice.once || !path.includes(choice.to))
  );
}

export function choose(
  mission: Mission,
  path: readonly string[],
  choiceId: string,
  facts: readonly string[] = [],
): readonly string[] {
  const choice = sceneAt(mission, path).choices.find((item) => item.id === choiceId);
  if (!choice || !canChoose(choice, path, facts) || !mission.scenes[choice.to]) return path;
  return [...path, choice.to];
}

export function advance(
  mission: Mission,
  history: readonly StoryStep[],
  choiceId: string,
): readonly StoryStep[] {
  const path = history.map((step) => step.scene);
  const facts = history.at(-1)?.facts ?? [];
  const next = choose(mission, path, choiceId, facts);
  if (next === path) return history;
  const choice = sceneAt(mission, path).choices.find((item) => item.id === choiceId)!;
  return [
    ...history,
    { scene: choice.to, facts: [...new Set([...facts, ...(choice.grants ?? [])])] },
  ];
}
