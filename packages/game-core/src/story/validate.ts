import { CACHE_DISCLOSURE_STORY, type StoryDefinition } from './definition.js';
import { prepareStoryCommand, storyCompanyGenesis, storyWorldGenesis } from './reducer.js';
import { projectStory } from './projection.js';
import type {
  StoryActorId,
  StoryChoiceId,
  StoryCommand,
  StoryCompanyState,
  StoryFactId,
  StoryWorldState,
} from './model.js';

export interface StoryValidationResult {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly reachableScenes: readonly string[];
  readonly reachableEndings: readonly string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isTick = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9][0-9]*)$/u.test(value);
const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));
function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length && left.every((entry, index) => sameValue(entry, right[index]))
    );
  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index] && sameValue(left[key], right[key]))
    );
  }
  return false;
}
const isActor = (value: unknown): value is StoryActorId =>
  value === 'KONDRAT' || value === 'SENKA' || value === 'ULITA';
const isScene = (value: unknown): value is StoryCompanyState['currentSceneId'] =>
  ['S00', 'S01', 'S02', 'S03', 'S04', 'S06', 'S07', 'S08', 'LATE'].includes(value as string);

function cloneFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) cloneFreeze(child);
  }
  return value;
}

/** Strict persisted-world reader; rejects outcomes whose proof/payout semantics conflict. */
export function readStoryWorldState(value: unknown): StoryWorldState {
  const fail = (): never => {
    throw new TypeError('Story world state is invalid');
  };
  if (
    !isObject(value) ||
    !hasOnlyKeys(value, [
      'version',
      'missionId',
      'definitionVersion',
      'revision',
      'eligibilitySource',
      'outcome',
    ]) ||
    value['version'] !== 1 ||
    value['missionId'] !== CACHE_DISCLOSURE_STORY.id ||
    value['definitionVersion'] !== 1 ||
    !isTick(value['revision'])
  )
    return fail();
  const source = value['eligibilitySource'];
  const outcome = value['outcome'];
  if (
    !isObject(source) ||
    !hasOnlyKeys(source, [
      'contractId',
      'companyId',
      'sourceEventId',
      'deliveredAtTick',
      'availableAtTick',
    ]) ||
    source['contractId'] !== 'ci.m1.mill-worker.01' ||
    !isText(source['companyId']) ||
    !isText(source['sourceEventId']) ||
    !isTick(source['deliveredAtTick']) ||
    !isTick(source['availableAtTick'])
  )
    return fail();
  if (BigInt(source['availableAtTick']) < BigInt(source['deliveredAtTick'])) return fail();
  if (outcome !== null) {
    if (
      !isObject(outcome) ||
      !hasOnlyKeys(outcome, [
        'endingId',
        'accusedActor',
        'proven',
        'finishingCompanyId',
        'sourceEventId',
        'atTick',
        'publicConsequences',
      ]) ||
      !['E01', 'E02', 'E03'].includes(outcome['endingId'] as string) ||
      !isActor(outcome['accusedActor']) ||
      typeof outcome['proven'] !== 'boolean' ||
      !isText(outcome['finishingCompanyId']) ||
      !isText(outcome['sourceEventId']) ||
      !isTick(outcome['atTick']) ||
      !isObject(outcome['publicConsequences'])
    )
      return fail();
    const isProof =
      outcome['endingId'] === 'E01' &&
      outcome['accusedActor'] === 'ULITA' &&
      outcome['proven'] === true;
    const isFalse =
      ((outcome['endingId'] === 'E02' && outcome['accusedActor'] === 'SENKA') ||
        (outcome['endingId'] === 'E03' && outcome['accusedActor'] === 'KONDRAT')) &&
      outcome['proven'] === false;
    if (!isProof && !isFalse) return fail();
    const expectedConsequences =
      outcome['endingId'] === 'E01'
        ? { senka: 'STAYS_AT_BARN', kondratTrust: 'UNCHANGED', ulitaGrainWork: 'ENDS' }
        : outcome['endingId'] === 'E02'
          ? {
              senka: 'DISMISSED',
              kondratTrust: 'LOSES_TRUST_IN_SENKA',
              ulitaGrainWork: 'UNCHANGED',
            }
          : {
              senka: 'LEAVES_VOLUNTARILY',
              kondratTrust: 'LOSES_TRUST_IN_FINISHING_COMPANY',
              ulitaGrainWork: 'UNCHANGED',
            };
    if (
      !hasOnlyKeys(outcome['publicConsequences'], ['senka', 'kondratTrust', 'ulitaGrainWork']) ||
      !sameValue(outcome['publicConsequences'], expectedConsequences)
    )
      return fail();
    if (BigInt(outcome['atTick']) < BigInt(source['availableAtTick'])) return fail();
  }
  return cloneFreeze(JSON.parse(JSON.stringify(value)) as StoryWorldState);
}

/** Strict per-company reader; journal facts are finite and retain source attribution. */
export function readStoryCompanyState(value: unknown): StoryCompanyState {
  const fail = (): never => {
    throw new TypeError('Story company state is invalid');
  };
  if (
    !isObject(value) ||
    !hasOnlyKeys(value, [
      'version',
      'missionId',
      'definitionVersion',
      'companyId',
      'revision',
      'status',
      'currentSceneId',
      'pendingAccusation',
      'receiptsInspected',
      'cacheReasonAsked',
      'metActors',
      'facts',
    ]) ||
    value['version'] !== 1 ||
    value['missionId'] !== CACHE_DISCLOSURE_STORY.id ||
    value['definitionVersion'] !== 1 ||
    !isText(value['companyId']) ||
    !isTick(value['revision']) ||
    !['OFFERED', 'ACCEPTED', 'COMPLETED'].includes(value['status'] as string) ||
    !isScene(value['currentSceneId'])
  )
    return fail();
  const met = value['metActors'];
  const facts = value['facts'];
  const pending = value['pendingAccusation'];
  if (
    typeof value['receiptsInspected'] !== 'boolean' ||
    typeof value['cacheReasonAsked'] !== 'boolean' ||
    !Array.isArray(met) ||
    !met.every(isActor) ||
    new Set(met).size !== met.length ||
    !Array.isArray(facts) ||
    (pending !== null &&
      (!isObject(pending) ||
        !hasOnlyKeys(pending, ['actorId', 'proven']) ||
        !isActor(pending['actorId']) ||
        typeof pending['proven'] !== 'boolean'))
  )
    return fail();
  const known = new Set<string>();
  for (const fact of facts) {
    if (
      !isObject(fact) ||
      !hasOnlyKeys(fact, [
        'factId',
        'source',
        'sceneId',
        'choiceId',
        'sourceEventId',
        'learnedAtTick',
        'historicalTiming',
      ]) ||
      !['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11'].includes(
        fact['factId'] as string,
      ) ||
      !isText(fact['sourceEventId']) ||
      !isTick(fact['learnedAtTick']) ||
      !isScene(fact['sceneId']) ||
      !isText(fact['choiceId'])
    )
      return fail();
    const factId = fact['factId'] as StoryFactId;
    if (known.has(factId)) return fail();
    const def = CACHE_DISCLOSURE_STORY.findings.find((entry) => entry.factId === factId)!;
    const endingSenkaAdmission =
      factId === 'F05' &&
      fact['sceneId'] === 'S07' &&
      fact['choiceId'] === 'confirm-e02' &&
      fact['historicalTiming'] === undefined &&
      sameValue(fact['source'], { kind: 'ACTOR', actorId: 'SENKA' });
    if (!endingSenkaAdmission && !def.requires.every((required) => known.has(required)))
      return fail();
    known.add(factId);
    if (
      !endingSenkaAdmission &&
      (!sameValue(fact['source'], def.source) ||
        fact['sceneId'] !== def.producedBy.sceneId ||
        fact['choiceId'] !== def.producedBy.choiceId ||
        fact['historicalTiming'] !== def.historicalTiming)
    )
      return fail();
    if (def.source.kind === 'ACTOR' && !met.includes(def.source.actorId)) return fail();
  }
  if (value['status'] !== 'OFFERED' && !met.includes('KONDRAT')) return fail();
  if (value['status'] === 'OFFERED' && value['currentSceneId'] !== 'S00') return fail();
  if (
    pending !== null &&
    (value['currentSceneId'] !== 'S07' ||
      pending['proven'] !== (pending['actorId'] === 'ULITA') ||
      (pending['proven'] &&
        !['F01', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11'].every((id) => known.has(id))))
  )
    return fail();
  if (
    (value['receiptsInspected'] && (!known.has('F02') || !met.includes('KONDRAT'))) ||
    (value['cacheReasonAsked'] && (!known.has('F08') || !met.includes('ULITA'))) ||
    (known.has('F03') && !value['receiptsInspected'])
  )
    return fail();
  if (
    value['status'] === 'OFFERED' &&
    (facts.length > 0 ||
      met.length > 0 ||
      pending !== null ||
      value['receiptsInspected'] ||
      value['cacheReasonAsked'])
  )
    return fail();
  if (pending !== null && value['status'] !== 'ACCEPTED') return fail();
  if (value['status'] === 'ACCEPTED' && ['S00', 'LATE'].includes(value['currentSceneId'] as string))
    return fail();
  if (value['status'] === 'COMPLETED' && value['currentSceneId'] !== 'S07') return fail();
  return cloneFreeze(JSON.parse(JSON.stringify(value)) as StoryCompanyState);
}

const CHOICES: readonly StoryChoiceId[] = [
  'accept',
  'defer',
  'to-kondrat',
  'to-senka',
  'to-ulita',
  'ask-sacks',
  'ask-tax',
  'inspect-receipts',
  'compare-receipts',
  'ask-guard',
  'ask-bread',
  'ask-son',
  'inspect-sack',
  'ask-sack-origin',
  'ask-where-grain',
  'ask-why-cache',
  'ask-senka-sack',
  'confront-ulita',
  'open-confrontation',
  'open-accusation',
  'accuse-ulita',
  'accuse-senka',
  'accuse-kondrat',
  'wait',
  'back',
];

function semanticKey(world: StoryWorldState, company: StoryCompanyState): string {
  return JSON.stringify({
    outcome: world.outcome?.endingId ?? null,
    status: company.status,
    scene: company.currentSceneId,
    pending: company.pendingAccusation,
    receiptsInspected: company.receiptsInspected,
    cacheReasonAsked: company.cacheReasonAsked,
    met: [...company.metActors].sort(),
    facts: company.facts.map((fact) => fact.factId).sort(),
  });
}

/** Strict finite-catalogue checks plus reachability through the actual reducer guards/effects. */
export function validateStoryDefinition(
  definition: StoryDefinition = CACHE_DISCLOSURE_STORY,
): StoryValidationResult {
  const issues: string[] = [];
  const sceneIds = new Set(definition.scenes.map((scene) => scene.sceneId));
  const factIds = new Set(definition.findings.map((fact) => fact.factId));
  const endingIds = new Set(definition.outcomes.map((outcome) => outcome.endingId));
  const expectedSceneIds = ['S00', 'S01', 'S02', 'S03', 'S04', 'S06', 'S07', 'S08', 'LATE'];
  for (const id of expectedSceneIds)
    if (!sceneIds.has(id as never)) issues.push(`Missing required scene ${id}`);
  if (definition.id !== 'sm.m1.cache-disclosure.01' || definition.version !== 1)
    issues.push('Unsupported mission identity/version');
  if (sceneIds.has('S05' as never)) issues.push('S05 must remain absent');
  if (sceneIds.size !== definition.scenes.length) issues.push('Duplicate scene ID');
  if (factIds.size !== definition.findings.length) issues.push('Duplicate finding ID');
  if (endingIds.size !== definition.outcomes.length) issues.push('Duplicate ending ID');
  for (const endingId of ['E01', 'E02', 'E03'] as const) {
    const outcome = definition.outcomes.find((entry) => entry.endingId === endingId);
    const canonical = CACHE_DISCLOSURE_STORY.outcomes.find((entry) => entry.endingId === endingId);
    if (!outcome) issues.push(`Missing outcome ${endingId}`);
    else if (
      !canonical ||
      outcome.accusedActor !== canonical.accusedActor ||
      outcome.proven !== canonical.proven ||
      !sameValue(outcome.publicConsequences, canonical.publicConsequences) ||
      !sameValue(outcome.payout, canonical.payout)
    ) {
      issues.push(`Outcome ${endingId} conflicts with the approved outcome table`);
    }
  }
  for (const scene of definition.scenes) {
    if (scene.placeId !== 'severny-dvor-yard') issues.push(`Illegal place for ${scene.sceneId}`);
    const canonical = CACHE_DISCLOSURE_STORY.scenes.find(
      (entry) => entry.sceneId === scene.sceneId,
    );
    if (
      !canonical ||
      scene.speakerId !== canonical.speakerId ||
      JSON.stringify(scene.lineIds) !== JSON.stringify(canonical.lineIds) ||
      JSON.stringify(scene.choiceIds) !== JSON.stringify(canonical.choiceIds) ||
      JSON.stringify(scene.requiredFacts) !== JSON.stringify(canonical.requiredFacts)
    )
      issues.push(`Scene ${scene.sceneId} conflicts with the approved manuscript mechanics`);
    for (const factId of scene.requiredFacts)
      if (!factIds.has(factId)) issues.push(`Unknown required fact ${factId} in ${scene.sceneId}`);
    for (const choiceId of scene.choiceIds) {
      if (!CHOICES.includes(choiceId as StoryChoiceId))
        issues.push(`Unknown choice ${choiceId} in ${scene.sceneId}`);
    }
    if (new Set(scene.lineIds).size !== scene.lineIds.length)
      issues.push(`Duplicate line ID in ${scene.sceneId}`);
    if (new Set(scene.choiceIds).size !== scene.choiceIds.length)
      issues.push(`Duplicate choice ID in ${scene.sceneId}`);
  }
  const producerScenes = new Map(
    definition.scenes.map((scene) => [scene.sceneId, new Set(scene.choiceIds)]),
  );
  for (const fact of definition.findings) {
    if (!producerScenes.get(fact.producedBy.sceneId)?.has(fact.producedBy.choiceId))
      issues.push(`Invalid producer for ${fact.factId}`);
    for (const required of fact.requires)
      if (!factIds.has(required))
        issues.push(`Unknown prerequisite ${required} for ${fact.factId}`);
    const canonical = CACHE_DISCLOSURE_STORY.findings.find((entry) => entry.factId === fact.factId);
    if (
      !canonical ||
      fact.kind !== canonical.kind ||
      !sameValue(fact.source, canonical.source) ||
      !sameValue(fact.producedBy, canonical.producedBy) ||
      !sameValue(fact.requires, canonical.requires) ||
      fact.historicalTiming !== canonical.historicalTiming
    )
      issues.push(`Finding ${fact.factId} conflicts with the approved finding table`);
    if ((fact.kind === 'OBSERVATION') !== (fact.source.kind === 'OBSERVED'))
      issues.push(`Finding source kind is inconsistent for ${fact.factId}`);
  }
  if (
    definition.truth.discloser !== 'ULITA' ||
    definition.truth.beneficiary !== 'OBUKH' ||
    !definition.truth.grainTaken ||
    !definition.truth.petrusRetained ||
    !definition.truth.sackLeftAsMockPayment ||
    !definition.truth.petrusEscapedWounded ||
    !definition.truth.kondratTaxClaimFalse ||
    !definition.truth.senkaBreadTripLie
  )
    issues.push('Canonical truth is inconsistent with the approved story');
  for (const id of ['F01', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11'])
    if (!factIds.has(id as never)) issues.push(`Required proof finding ${id} is missing`);

  const eligibilitySource = {
    contractId: 'ci.m1.mill-worker.01' as const,
    companyId: 'rescuer',
    sourceEventId: 'delivery',
    deliveredAtTick: '1',
    availableAtTick: '0',
  };
  const startWorld = storyWorldGenesis(eligibilitySource);
  const startCompany = storyCompanyGenesis('validator-company', startWorld);
  const queue: { world: StoryWorldState; company: StoryCompanyState }[] = [
    { world: startWorld, company: startCompany },
  ];
  const seen = new Set<string>();
  const reachedScenes = new Set<string>();
  const reachedEndings = new Set<string>();
  const terminalWorlds = new Map<string, StoryWorldState>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = semanticKey(current.world, current.company);
    if (seen.has(key)) continue;
    seen.add(key);
    reachedScenes.add(current.company.currentSceneId);
    if (current.world.outcome) {
      reachedEndings.add(current.world.outcome.endingId);
      terminalWorlds.set(current.world.outcome.endingId, current.world);
      continue;
    }
    const commands: StoryCommand[] = [
      { type: 'ACCEPT' },
      { type: 'DEFER' },
      { type: 'CONFIRM' },
      { type: 'RETURN' },
      ...CHOICES.map((choiceId) => ({ type: 'CHOOSE' as const, choiceId })),
    ];
    for (const command of commands) {
      const result = prepareStoryCommand(definition, current.world, current.company, command, {
        companyId: current.company.companyId,
        standingPlaceId: 'severny-dvor-yard',
        atTick: '100',
        expectedWorldRevision: current.world.revision,
        expectedCompanyRevision: current.company.revision,
        sourceEventId: `validator-${current.company.revision}-${command.type}-${'choiceId' in command ? command.choiceId : ''}`,
      });
      if (result.kind === 'PREPARED') queue.push({ world: result.world, company: result.company });
    }
  }
  for (const scene of definition.scenes) {
    if (scene.sceneId !== 'LATE' && !reachedScenes.has(scene.sceneId))
      issues.push(`Unreachable scene ${scene.sceneId}`);
  }
  for (const ending of ['E01', 'E02', 'E03'])
    if (!reachedEndings.has(ending)) issues.push(`Unreachable ending ${ending}`);
  if (!reachedEndings.has('E01'))
    issues.push('No confirmation path proves Ulita with F01 and F06–F11');

  // Late entry is seeded from each reachable terminal public state; the journal remains company scoped.
  for (const ending of reachedEndings) {
    if (!['E01', 'E02', 'E03'].includes(ending)) issues.push(`Invalid terminal outcome ${ending}`);
    const world = terminalWorlds.get(ending);
    if (world) {
      const late = projectStory(
        definition,
        world,
        storyCompanyGenesis('late-company', world),
        '100',
      );
      if (
        late.sceneId !== 'LATE' ||
        late.journal.length !== 0 ||
        late.availableChoices.length !== 0 ||
        !late.visibleLineIds.some((id) => id === `L-${ending}`)
      ) {
        issues.push(`Late-entry projection leaks private state or is missing for ${ending}`);
      }
    }
  }
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...new Set(issues)]),
    reachableScenes: Object.freeze([...reachedScenes].sort()),
    reachableEndings: Object.freeze([...reachedEndings].sort()),
  });
}
