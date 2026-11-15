import { describe, expect, it } from 'vitest';

import {
  CACHE_DISCLOSURE_STORY,
  projectStory,
  prepareStoryCommand,
  readStoryCompanyState,
  readStoryWorldState,
  storyCompanyGenesis,
  storyWorldGenesis,
  validateStoryDefinition,
  type StoryCommand,
  type StoryCompanyState,
  type StoryWorldState,
} from './index.js';

function worldGenesis(): StoryWorldState {
  return storyWorldGenesis({
    contractId: 'ci.m1.mill-worker.01',
    companyId: 'rescuer',
    sourceEventId: 'delivery-1',
    deliveredAtTick: '10',
    availableAtTick: '20',
    availabilityBasis: 'EXACT_SIMULATION_TIME',
  });
}

function act(
  world: StoryWorldState,
  company: StoryCompanyState,
  command: StoryCommand,
  sourceEventId = `event-${company.revision}`,
) {
  const result = prepareStoryCommand(CACHE_DISCLOSURE_STORY, world, company, command, {
    companyId: company.companyId,
    standingPlaceId: 'severny-dvor-yard',
    atTick: '20',
    expectedWorldRevision: world.revision,
    expectedCompanyRevision: company.revision,
    sourceEventId,
  });
  if (result.kind !== 'PREPARED') throw new Error(`expected PREPARED, got ${result.code}`);
  return { world: result.world, company: result.company, payout: result.payoutEligibility };
}

function proveDisclosure(world: StoryWorldState, company: StoryCompanyState) {
  let state = act(world, company, { type: 'ACCEPT' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-senka' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-guard' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-ulita' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-son' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-kondrat' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-sacks' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-ulita' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'inspect-sack' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-sack-origin' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-senka-sack' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-senka-sack' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-ulita' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'open-confrontation' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'confront-ulita' });
  expect(state.company.facts.some((fact) => fact.factId === 'F11')).toBe(false);
  expect(
    projectStory(CACHE_DISCLOSURE_STORY, state.world, state.company, '20').visibleLineIds,
  ).not.toContain('03');
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-where-grain' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'open-accusation' });
  state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'accuse-ulita' });
  return state;
}

describe('B4 company story journal and reducer', () => {
  it("shows the audible groan before the company learns who is behind Ulita's door", () => {
    const world = worldGenesis();
    let state = act(world, storyCompanyGenesis('company-a', world), { type: 'ACCEPT' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-ulita' });
    const view = projectStory(CACHE_DISCLOSURE_STORY, state.world, state.company, '20');
    expect(view.visibleLineIds).toContain('02-sound');
    expect(view.visibleLineIds).not.toContain('02-son');
    expect(view.journal.some((fact) => fact.factId === 'F06')).toBe(false);
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-son' });
    expect(
      projectStory(CACHE_DISCLOSURE_STORY, state.world, state.company, '20').visibleLineIds,
    ).toEqual(expect.arrayContaining(['who', '02-son', 'son', '03']));
  });

  it('retains reads of seeded world states written before availability provenance was added', () => {
    const world = JSON.parse(JSON.stringify(worldGenesis())) as Record<string, unknown>;
    const source = { ...(world['eligibilitySource'] as Record<string, unknown>) };
    delete source['availabilityBasis'];
    const restored = readStoryWorldState({ ...world, eligibilitySource: source });
    expect(restored.eligibilitySource.availableAtTick).toBe('20');
    expect(restored.eligibilitySource.availabilityBasis).toBeUndefined();
  });

  it('keeps findings company private, first-attributed, and projection observer-scoped', () => {
    const world = worldGenesis();
    let companyA = storyCompanyGenesis('company-a', world);
    const companyB = storyCompanyGenesis('company-b', world);
    expect(projectStory(CACHE_DISCLOSURE_STORY, world, companyA, '19').availability).toBe(
      'NOT_YET_AVAILABLE',
    );
    expect(projectStory(CACHE_DISCLOSURE_STORY, world, companyA, '20').availableChoices).toEqual([
      'accept',
      'defer',
    ]);
    companyA = act(world, companyA, { type: 'ACCEPT' }).company;
    const accepted = act(
      world,
      companyA,
      { type: 'CHOOSE', choiceId: 'ask-sacks' },
      'interview-kondrat',
    ).company;
    const repeated = act(
      world,
      accepted,
      { type: 'CHOOSE', choiceId: 'ask-sacks' },
      'repeat-interview',
    ).company;
    expect(repeated.facts).toHaveLength(1);
    expect(repeated.facts[0]?.sourceEventId).toBe('interview-kondrat');
    expect(repeated.facts[0]?.learnedAtTick).toBe('20');
    expect(projectStory(CACHE_DISCLOSURE_STORY, world, companyB, '20').journal).toEqual([]);
    expect(
      projectStory(CACHE_DISCLOSURE_STORY, world, companyB, '20').visibleLineIds,
    ).not.toContain('02-son');
    const accusation = act(world, companyA, {
      type: 'CHOOSE',
      choiceId: 'open-accusation',
    }).company;
    const options = projectStory(CACHE_DISCLOSURE_STORY, world, accusation, '20').availableChoices;
    expect(options).toContain('accuse-kondrat');
    expect(options).not.toContain('accuse-senka');
    expect(options).not.toContain('accuse-ulita');
  });

  it('requires all seven proof findings and returns only trusted E01 payment eligibility', () => {
    const world = worldGenesis();
    const proof = proveDisclosure(world, storyCompanyGenesis('company-a', world));
    const before = prepareStoryCommand(
      CACHE_DISCLOSURE_STORY,
      proof.world,
      proof.company,
      { type: 'CONFIRM' },
      {
        companyId: proof.company.companyId,
        standingPlaceId: 'severny-dvor-yard',
        atTick: '20',
        expectedWorldRevision: proof.world.revision,
        expectedCompanyRevision: proof.company.revision,
        sourceEventId: 'final-confirmation',
      },
    );
    expect(before.kind).toBe('PREPARED');
    if (before.kind !== 'PREPARED') throw new Error('expected a proven ending');
    expect(before.world.outcome).toMatchObject({
      endingId: 'E01',
      accusedActor: 'ULITA',
      proven: true,
    });
    expect(before.payoutEligibility).toEqual({
      companyId: 'company-a',
      rewardQ: '40000000',
      policy: 'TRUSTED_ISSUER_DEBIT_AND_COMPANY_CREDIT_IN_ONE_TRANSACTION',
    });
    expect(before.world.outcome).not.toHaveProperty('facts');
    expect(readStoryWorldState(JSON.parse(JSON.stringify(before.world)))).toEqual(before.world);
    expect(readStoryCompanyState(JSON.parse(JSON.stringify(before.company)))).toEqual(
      before.company,
    );
  });

  it('reveals Ulita’s cache explanation only after the company acknowledges that question', () => {
    const world = worldGenesis();
    let state = act(world, storyCompanyGenesis('company-a', world), { type: 'ACCEPT' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-ulita' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-son' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-kondrat' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-sacks' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'to-ulita' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'inspect-sack' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-sack-origin' });
    expect(
      projectStory(CACHE_DISCLOSURE_STORY, state.world, state.company, '20').visibleLineIds,
    ).not.toContain('06');
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'ask-why-cache' });
    expect(
      projectStory(CACHE_DISCLOSURE_STORY, state.world, state.company, '20').visibleLineIds,
    ).toContain('06');
    expect(readStoryCompanyState(JSON.parse(JSON.stringify(state.company)))).toEqual(state.company);
  });

  it('allows a false accusation after hearing the confession, pays nothing and keeps the journal private', () => {
    const world = worldGenesis();
    let state = proveDisclosure(world, storyCompanyGenesis('finisher', world));
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'back' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'accuse-senka' });
    state = act(state.world, state.company, { type: 'CONFIRM' });
    expect(state.world.outcome).toMatchObject({
      endingId: 'E02',
      accusedActor: 'SENKA',
      proven: false,
    });
    expect(state.payout).toBeNull();
    expect(state.company.facts.map((fact) => fact.factId)).toContain('F11');
    expect(state.company.facts.map((fact) => fact.factId)).toContain('F05');
    const late = projectStory(
      CACHE_DISCLOSURE_STORY,
      state.world,
      storyCompanyGenesis('late-company', state.world),
      '20',
    );
    expect(late.sceneId).toBe('LATE');
    expect(late.journal).toEqual([]);
    expect(late.visibleLineIds).toContain('L-E02');
    expect(late.availableChoices).toEqual([]);
    expect(readStoryWorldState(JSON.parse(JSON.stringify(state.world)))).toEqual(state.world);
    expect(readStoryCompanyState(JSON.parse(JSON.stringify(state.company)))).toEqual(state.company);
  });

  it('keeps an incomplete Ulita accusation open and rejects terminal confirmation', () => {
    const world = worldGenesis();
    let company = act(world, storyCompanyGenesis('company-a', world), { type: 'ACCEPT' }).company;
    company = act(world, company, { type: 'CHOOSE', choiceId: 'to-ulita' }).company;
    company = act(world, company, { type: 'CHOOSE', choiceId: 'to-kondrat' }).company;
    company = act(world, company, { type: 'CHOOSE', choiceId: 'open-accusation' }).company;
    company = act(world, company, { type: 'CHOOSE', choiceId: 'accuse-ulita' }).company;
    expect(company.currentSceneId).toBe('S08');
    expect(company.pendingAccusation).toBeNull();
    const result = prepareStoryCommand(
      CACHE_DISCLOSURE_STORY,
      world,
      company,
      { type: 'CONFIRM' },
      {
        companyId: company.companyId,
        standingPlaceId: 'severny-dvor-yard',
        atTick: '20',
        expectedWorldRevision: world.revision,
        expectedCompanyRevision: company.revision,
        sourceEventId: 'invalid-confirm',
      },
    );
    expect(result).toEqual({ kind: 'REJECTED', code: 'NO_PENDING_ACCUSATION' });
    expect(world.outcome).toBeNull();
  });

  it('closes a Kondrat accusation as E03 without payout or invented numeric reputation', () => {
    const world = worldGenesis();
    let state = act(world, storyCompanyGenesis('company-a', world), { type: 'ACCEPT' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'open-accusation' });
    state = act(state.world, state.company, { type: 'CHOOSE', choiceId: 'accuse-kondrat' });
    state = act(state.world, state.company, { type: 'CONFIRM' });
    expect(state.world.outcome).toMatchObject({
      endingId: 'E03',
      accusedActor: 'KONDRAT',
      proven: false,
      publicConsequences: {
        senka: 'LEAVES_VOLUNTARILY',
        kondratTrust: 'LOSES_TRUST_IN_FINISHING_COMPANY',
        ulitaGrainWork: 'UNCHANGED',
      },
    });
    expect(state.payout).toBeNull();
  });

  it('rejects a remote command without changing either serializable state', () => {
    const world = worldGenesis();
    const company = storyCompanyGenesis('company-a', world);
    const result = prepareStoryCommand(
      CACHE_DISCLOSURE_STORY,
      world,
      company,
      { type: 'ACCEPT' },
      {
        companyId: 'company-a',
        standingPlaceId: null,
        atTick: '20',
        expectedWorldRevision: world.revision,
        expectedCompanyRevision: company.revision,
        sourceEventId: 'remote',
      },
    );
    expect(result).toEqual({ kind: 'REJECTED', code: 'WRONG_PLACE' });
    expect(world.revision).toBe('0');
    expect(company.status).toBe('OFFERED');
  });

  it('rejects unknown persisted world fields that could expose company knowledge', () => {
    const world = worldGenesis();
    expect(() =>
      readStoryWorldState({ ...world, journal: [{ factId: 'F11', companyId: 'private-company' }] }),
    ).toThrow('Story world state is invalid');
  });

  it('validates scene and ending reachability through reducer guards and effects', () => {
    const result = validateStoryDefinition();
    expect(result.valid).toBe(true);
    expect(result.reachableScenes).toContain('S08');
    expect(result.reachableEndings).toEqual(['E01', 'E02', 'E03']);
  });
});
