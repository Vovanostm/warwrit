import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_RULES,
  birthTick,
  campaignTick,
  canonicalRevision,
  publicRevision,
  entityId,
  moneyQ,
  canonicalJson,
  prepareCompanyLifecycle,
  projectCompanyLifecycle,
  projectLifecycleRejection,
  fieldPartyStatus,
  executeCompanyCommand,
  validateCompanyCatalogue,
} from '@warwrit/game-core';
import type {
  ActorKind,
  CompanyCommandType,
  LifecycleState,
  LifecycleCharacter,
  LifecycleContext,
  LifecycleEvidence,
  LifecycleResult,
  OpeningEvidence,
  CrisisEvidence,
  AtLocation,
} from '@warwrit/game-core';

const home: AtLocation = { kind: 'AT', siteId: 'home', areaId: 'square' };
const tick = campaignTick('1000');
function character(id: string, location: AtLocation = home): LifecycleCharacter {
  return {
    identity: {
      characterId: entityId(id),
      birthName: id,
      sex: 'male',
      birthCultureId: entityId('north'),
      birthplaceId: entityId('home'),
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
    skills: { leadership: 0 },
    aptitudeBySkill: { leadership: 10000 },
    perks: [],
    conditionIds: [],
  };
}
function empty(): LifecycleState {
  return {
    schemaVersion: 1,
    companyId: entityId('company'),
    worldId: entityId('main'),
    revision: canonicalRevision('0'),
    campaignTick: tick,
    company: null,
    characters: [character('contact'), character('provider')],
    memberships: [],
    kinship: [],
    parties: [],
    bypasses: [],
    applied: [],
    knowledge: {
      revision: publicRevision('0'),
      leaderId: null,
      designatedHeirId: null,
      runStatus: 'UNKNOWN',
      characters: [],
      candidateIds: [],
      eventIds: [],
    },
  };
}
function source(state: LifecycleState, id: string) {
  return {
    id,
    companyId: state.companyId,
    worldId: state.worldId,
    revision: state.revision,
    sourceEventId: `source-${id}`,
    atTick: state.campaignTick,
  };
}
function input(
  state: LifecycleState,
  type: CompanyCommandType,
  payload: unknown,
  actor: ActorKind = 'PLAYER',
  id = `command-${type}`,
) {
  return {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: id,
    type,
    payload,
    companyId: state.companyId,
    worldId: state.worldId,
    actorRef: { kind: actor, id: 'principal' },
    campaignTick: state.campaignTick,
    rulesetId: COMPANY_RULESET_ID,
    expectedRevision: actor === 'PLAYER' ? state.knowledge.revision : state.revision,
    sourceEventId: `source-${id}`,
  };
}
function context(
  state: LifecycleState,
  cmd: ReturnType<typeof input>,
  facts: readonly LifecycleEvidence[] = [],
): LifecycleContext {
  return {
    worldId: state.worldId,
    companyId: state.companyId,
    principal: cmd.actorRef,
    publicRevision: state.knowledge.revision,
    canonicalRevision: state.revision,
    atTick: state.campaignTick,
    completeGraph: true,
    contactIds: state.characters.map((p) => p.identity.characterId),
    facts,
    internalGrant: {
      commandId: cmd.commandId,
      sourceEventId: cmd.sourceEventId,
      canonicalRequest: canonicalJson(cmd),
    },
  };
}
function prepared(result: LifecycleResult) {
  expect(result.kind, result.kind === 'REJECTED' ? result.error : '').toBe('PREPARED');
  if (result.kind !== 'PREPARED') throw new Error(result.error);
  return result;
}
function opening() {
  const state = empty();
  const fact: OpeningEvidence = {
    ...source(state, 'opening'),
    kind: 'OPENING',
    profileId: 'm1-company-start',
    originId: 'broken-company',
    familyStoryId: 'adult-sibling-home',
    cultureId: 'north',
    location: home,
    birthplaceIds: ['home'],
    leaderId: 'leader',
    partyId: 'party',
    seed: 42,
    candidates: [
      { characterId: 'front', templateId: 'front', name: 'Front', sex: 'male' },
      { characterId: 'reach', templateId: 'reach', name: 'Reach', sex: 'female' },
      { characterId: 'support', templateId: 'support', name: 'Support', sex: 'male' },
    ],
    relatives: [{ characterId: 'sibling', name: 'Sibling', sex: 'female' }],
    contactId: 'contact',
    providerId: 'provider',
  };
  const { characterId: _id, ...identity } = character('leader').identity;
  const cmd = input(state, 'CreateCompany', {
    companyId: state.companyId,
    worldId: state.worldId,
    originId: fact.originId,
    cultureId: fact.cultureId,
    homelandId: home.siteId,
    familyStoryId: fact.familyStoryId,
    leaderInput: identity,
    candidateSetId: fact.id,
    selectedCandidateIds: ['front'],
    name: 'First company',
    bannerId: 'standard',
  });
  const ctx = context(state, cmd, [fact]);
  return { state, fact, cmd, ctx, result: prepared(prepareCompanyLifecycle(state, cmd, ctx)) };
}
function changePerson(
  state: LifecycleState,
  id: string,
  patch: Partial<LifecycleCharacter>,
): LifecycleState {
  return {
    ...state,
    characters: state.characters.map((p) =>
      p.identity.characterId === id ? { ...p, ...patch } : p,
    ),
  };
}
function personIn(state: LifecycleState, id: string) {
  const p = state.characters.find((p) => p.identity.characterId === id);
  if (!p) throw new Error(`Missing fixture ${id}`);
  return p;
}
function unavailable(
  state: LifecycleState,
  id: string,
  status: 'DEAD' | 'CAPTIVE',
): LifecycleState {
  return changePerson(state, id, {
    presence: {
      ...personIn(state, id).presence,
      availability: status,
      fieldPartyId: null,
      assignment: 'NONE',
    },
  });
}
function resolve(
  state: LifecycleState,
  mode: string,
  candidateId?: string,
  reason: CrisisEvidence['reason'] = 'LEADER_DIED',
  crisisId = 'crisis',
) {
  const fact: CrisisEvidence = {
    ...source(state, crisisId),
    kind: 'CRISIS',
    leaderId: state.company!.currentLeaderId,
    reason,
  };
  const cmd = input(
    state,
    'ResolveLeadership',
    { companyId: state.companyId, crisisId, mode, ...(candidateId ? { candidateId } : {}) },
    'PLAYER',
    crisisId,
  );
  const ctx = context(state, cmd, [fact]);
  return { cmd, ctx, result: prepareCompanyLifecycle(state, cmd, ctx) };
}

describe('WP-02.2 lifecycle postulates', () => {
  it('prepares deterministic people and assets once, without granting a partial opening', () => {
    const { state, fact, cmd, ctx, result } = opening();
    expect(validateCompanyCatalogue(COMPANY_CATALOGUE)).toEqual([]);
    expect(state.company).toBeNull();
    expect(result.state).toBe(state);
    const allocation = result.receipt.requirements[0]!;
    expect(allocation.kind).toBe('OPENING_ASSETS');
    if (allocation.kind !== 'OPENING_ASSETS') throw new Error('Expected opening allocation');
    expect(allocation.assets.items.every((item) => item.ownerCompanyId === state.companyId)).toBe(
      true,
    );
    expect(result.next.memberships.map((m) => m.characterId).sort()).toEqual(['front', 'leader']);
    expect(result.next.kinship).toContainEqual({ from: 'leader', to: 'sibling', kind: 'SIBLING' });
    const reordered = prepared(
      prepareCompanyLifecycle(state, cmd, {
        ...ctx,
        facts: [{ ...fact, candidates: [...fact.candidates].reverse() }],
      }),
    );
    expect(reordered.next).toEqual(result.next);
    expect(executeCompanyCommand(state, cmd, ctx)).toMatchObject({
      ok: false,
      state,
      error: 'UNSUPPORTED_ACTION',
    });
    const retry = prepared(prepareCompanyLifecycle(result.next, cmd, context(result.next, cmd)));
    expect(retry.replayed).toBe(true);
    expect(retry.next).toBe(result.next);
    const changed = {
      ...cmd,
      payload: { ...(cmd.payload as object), selectedCandidateIds: ['reach'] },
    };
    expect(
      prepareCompanyLifecycle(result.next, changed, context(result.next, changed)),
    ).toMatchObject({ kind: 'REJECTED', state: result.next, error: 'IDEMPOTENCY_CONFLICT' });
  });

  it('keeps a service history distinct from location and rejects a second active service', () => {
    const state = opening().result.next;
    const fact: LifecycleEvidence = {
      ...source(state, 'offer'),
      kind: 'RECRUIT',
      characterId: 'reach',
      basis: 'PAID',
      offerRevision: '1',
      expiresAt: campaignTick('2000'),
      signingQ: moneyQ('500'),
      dailyWageMilli: '10',
      itemIds: [],
    };
    const cmd = input(state, 'Recruit', {
      offerId: fact.id,
      characterId: fact.characterId,
      companyId: state.companyId,
      basis: fact.basis,
      offerRevision: fact.offerRevision,
      poolId: 'cash',
    });
    const result = prepared(prepareCompanyLifecycle(state, cmd, context(state, cmd, [fact])));
    expect(personIn(result.next, 'reach')).toEqual(personIn(state, 'reach'));
    expect(result.receipt.requirements[0]?.kind).toBe('RECRUIT_SETTLEMENT');
    const again = { ...cmd, commandId: 'another-recruit' };
    expect(
      prepareCompanyLifecycle(
        result.next,
        again,
        context(result.next, again, [{ ...fact, revision: result.next.revision }]),
      ).kind,
    ).toBe('REJECTED');
    const family = { ...cmd, payload: { ...(cmd.payload as object), basis: 'FAMILY' } };
    expect(
      prepareCompanyLifecycle(
        state,
        family,
        context(state, family, [{ ...fact, basis: 'FAMILY', dailyWageMilli: '0' }]),
      ).kind,
    ).toBe('REJECTED');
    const relative = {
      ...family,
      payload: { ...(family.payload as object), characterId: 'sibling' },
    };
    const familyOffer = { ...fact, basis: 'FAMILY' as const, characterId: 'sibling' };
    expect(
      prepareCompanyLifecycle(state, relative, context(state, relative, [familyOffer])).kind,
    ).toBe('REJECTED');
    const acceptedFamily = prepared(
      prepareCompanyLifecycle(
        state,
        relative,
        context(state, relative, [{ ...familyOffer, dailyWageMilli: '0' }]),
      ),
    );
    expect(acceptedFamily.next.memberships.find((m) => m.characterId === 'sibling')?.basis).toBe(
      'FAMILY',
    );
    expect(acceptedFamily.next.kinship).toEqual(state.kinship);
  });

  it('requires real co-location and retains recovery members when capacity falls', () => {
    let state = opening().result.next;
    const front = personIn(state, 'front');
    state = changePerson(state, 'front', {
      presence: { ...front.presence, assignment: 'RECOVERY' },
    });
    const extra = ['reach', 'support', 'sibling'].map((id) => ({
      membershipId: entityId<'Membership'>(`service-${id}`),
      characterId: entityId<'Character'>(id),
      companyId: state.companyId,
      basis: 'PAID' as const,
      startedAt: tick,
      endedAt: null,
      wageScheduleId: null,
    }));
    state = { ...state, memberships: [...state.memberships, ...extra] };
    const join = (s: LifecycleState, id: string) => {
      const fact: LifecycleEvidence = {
        ...source(s, `meet-${id}`),
        kind: 'MEETING',
        characterId: id,
        partyId: 'party',
        location: home,
      };
      const cmd = input(
        s,
        'JoinFieldParty',
        { characterId: id, partyId: 'party', coLocationEvidenceId: fact.id },
        'PLAYER',
        `join-${id}`,
      );
      return prepareCompanyLifecycle(s, cmd, context(s, cmd, [fact]));
    };
    const remote = changePerson(state, 'reach', {
      presence: {
        ...personIn(state, 'reach').presence,
        location: { ...home, areaId: 'locked-room' },
      },
    });
    expect(join(remote, 'reach')).toMatchObject({ kind: 'REJECTED', state: remote });
    state = changePerson(state, 'leader', {
      skills: { leadership: COMPANY_RULES.leadershipBands.at(-1)!.level },
    });
    for (const id of ['reach', 'support']) state = prepared(join(state, id)).next;
    state = changePerson(state, 'leader', { skills: { leadership: 0 } });
    const before = canonicalJson(state);
    const status = fieldPartyStatus(state, 'party');
    expect(status.memberIds).toContain('front');
    expect(status.overCapacity).toBe(true);
    expect(status.moraleModifier).toBeLessThan(0);
    expect(fieldPartyStatus(state, 'party')).toEqual(status);
    expect(join(state, 'sibling')).toMatchObject({ kind: 'REJECTED', state, error: 'CAPACITY' });
    expect(canonicalJson(state)).toBe(before);
  });

  it('arrival follows the actual segment and never joins or resurrects a person', () => {
    let state = opening().result.next;
    const reach = personIn(state, 'reach');
    const transit = {
      kind: 'TRANSIT' as const,
      segmentId: 'road',
      from: 'inn',
      to: 'home',
      startedAt: campaignTick('0'),
      arrivalNotBefore: tick,
    };
    state = changePerson(state, 'reach', { presence: { ...reach.presence, location: transit } });
    const cmd = input(
      state,
      'Arrive',
      { characterId: 'reach', segmentId: 'road', arrivalEvidenceId: 'arrival' },
      'WORLD_RECEIPT',
    );
    const fact: LifecycleEvidence = {
      ...source(state, 'arrival'),
      sourceEventId: cmd.sourceEventId,
      kind: 'ARRIVAL',
      characterId: 'reach',
      segmentId: 'road',
      from: 'inn',
      location: home,
    };
    const arrived = prepared(prepareCompanyLifecycle(state, cmd, context(state, cmd, [fact])));
    expect(personIn(arrived.next, 'reach').presence).toMatchObject({
      location: home,
      assignment: 'NONE',
      fieldPartyId: null,
    });
    expect(
      prepareCompanyLifecycle(state, cmd, context(state, cmd, [{ ...fact, from: 'elsewhere' }])),
    ).toMatchObject({ kind: 'REJECTED', state });
    const dead = unavailable(state, 'reach', 'DEAD');
    expect(prepareCompanyLifecycle(dead, cmd, context(dead, cmd, [fact]))).toMatchObject({
      kind: 'REJECTED',
      state: dead,
    });
  });

  it('uses the complete persistent graph rather than the lost field party or a roster cap', () => {
    let state = opening().result.next;
    state = unavailable(unavailable(state, 'leader', 'DEAD'), 'front', 'DEAD');
    const sibling = personIn(state, 'sibling');
    state = changePerson(state, 'sibling', {
      presence: { ...sibling.presence, location: { ...home, siteId: 'far-away' } },
      skills: { leadership: 25 },
      perks: ['leadership-25-a'],
    });
    state = {
      ...state,
      characters: [
        ...state.characters,
        ...Array.from({ length: 14 }, (_, i) => character(`bystander-${i}`)),
      ],
    };
    const { cmd, ctx, result } = resolve(state, 'PERMANENT', 'sibling');
    const next = prepared(result).next;
    expect(next.company?.companyId).toBe(state.companyId);
    expect(next.company?.currentLeaderId).toBe('sibling');
    expect(next.characters).toEqual(state.characters);
    expect(next.company?.runStatus).toBe('ACTIVE');
    expect(prepareCompanyLifecycle(state, cmd, { ...ctx, completeGraph: false })).toMatchObject({
      kind: 'REJECTED',
      state,
      error: 'INCOMPLETE_GRAPH',
    });
    const missing = {
      ...state,
      characters: state.characters.filter((p) => p.identity.characterId !== 'sibling'),
    };
    expect(prepareCompanyLifecycle(missing, cmd, ctx)).toMatchObject({
      kind: 'REJECTED',
      state: missing,
      error: 'INCOMPLETE_GRAPH',
    });
    const noSuccessor = unavailable(state, 'sibling', 'CAPTIVE');
    expect(prepared(resolve(noSuccessor, 'PERMANENT').result).next.company?.runStatus).toBe(
      'GAME_OVER',
    );
  });

  it('requires an existing adult regent and restores the actual heir at majority', () => {
    let state = opening().result.next;
    const sibling = personIn(state, 'sibling');
    state = changePerson(state, 'sibling', {
      identity: { ...sibling.identity, bornAt: birthTick('0') },
    });
    state = {
      ...state,
      company: { ...state.company!, designatedHeirId: sibling.identity.characterId },
    };
    state = unavailable(state, 'leader', 'DEAD');
    const regency = prepared(resolve(state, 'REGENCY', 'front').result).next;
    expect(regency.company).toMatchObject({
      currentLeaderId: 'sibling',
      actingLeaderId: 'front',
      regencyHeirId: 'sibling',
    });
    const adultTick = campaignTick(
      (
        BigInt(COMPANY_CATALOGUE.species.find((s) => s.id === 'human')!.adultAtDays) *
        BigInt(COMPANY_RULES.ticksPerDay)
      ).toString(),
    );
    const majority = { ...regency, campaignTick: adultTick };
    const restored = prepared(
      resolve(majority, 'RESTORE_HEIR', 'sibling', 'HEIR_MAJORITY', 'majority').result,
    ).next;
    expect(restored.company).toMatchObject({
      currentLeaderId: 'sibling',
      actingLeaderId: null,
      regencyHeirId: null,
    });
    expect(restored.characters).toEqual(majority.characters);
    const alone = unavailable(state, 'front', 'CAPTIVE');
    expect(prepared(resolve(alone, 'REGENCY').result).next.company?.runStatus).toBe('GAME_OVER');
  });

  it('records one informed heir response without physically dismissing the member', () => {
    let state = opening().result.next;
    state = { ...state, company: { ...state.company!, designatedHeirId: entityId('front') } };
    state = unavailable(state, 'leader', 'DEAD');
    const resolved = prepared(resolve(state, 'PERMANENT', 'sibling').result);
    state = resolved.next;
    const bypass = state.bypasses[0]!;
    expect(bypass.notification).toBeNull();
    const notify = (s: LifecycleState, channel: string) => {
      const cmd = input(
        s,
        'Observe',
        {
          observationId: channel,
          observerRef: { kind: 'CHARACTER', id: 'front' },
          subjectRef: { kind: 'CHARACTER', id: 'sibling' },
          factId: bypass.eventId,
          sourceId: `source-${channel}`,
        },
        'DOMAIN_RECEIPT',
        channel,
      );
      const fact: LifecycleEvidence = {
        ...source(s, channel),
        kind: 'HEIR_NOTIFICATION',
        crisisId: bypass.crisisId,
        heirId: 'front',
        leaderId: 'sibling',
        relation: { respect: 0, rivalry: 100 },
      };
      return prepared(prepareCompanyLifecycle(s, cmd, context(s, cmd, [fact])));
    };
    const first = notify(state, 'witness');
    expect(first.next.bypasses[0]?.notification?.departureIntent?.reason).toBe('CANONICAL_EVENT');
    expect(personIn(first.next, 'front')).toEqual(personIn(state, 'front'));
    const second = notify(first.next, 'report');
    expect(second.next.bypasses).toEqual(first.next.bypasses);
    expect(second.receipt.events).toEqual([]);
  });

  it('does not expose hidden fate through observation views or state-dependent errors', () => {
    let known = opening().result.next;
    known = {
      ...known,
      knowledge: {
        ...known.knowledge,
        leaderId: entityId('leader'),
        runStatus: 'ACTIVE',
        characters: known.characters,
        candidateIds: [entityId('sibling')],
      },
    };
    const secret = { ...unavailable(known, 'sibling', 'DEAD'), revision: canonicalRevision('99') };
    expect(projectCompanyLifecycle(secret, 'company')).toEqual(
      projectCompanyLifecycle(known, 'company'),
    );
    expect(projectLifecycleRejection(secret, 'INCOMPLETE_GRAPH', 'company')).toEqual(
      projectLifecycleRejection(known, 'INCOMPATIBLE_ACTIVITY', 'company'),
    );
    expect(projectCompanyLifecycle(secret, 'other-company')).toBeNull();
    const cmd = input(
      secret,
      'Observe',
      {
        observationId: 'news',
        observerRef: { kind: 'COMPANY', id: 'company' },
        subjectRef: { kind: 'CHARACTER', id: 'sibling' },
        factId: 'news',
        sourceId: 'source-news',
      },
      'DOMAIN_RECEIPT',
      'news',
    );
    const fact: LifecycleEvidence = {
      ...source(secret, 'news'),
      kind: 'COMPANY_OBSERVATION',
      subject: { kind: 'CHARACTER', id: 'sibling' },
    };
    const observed = prepared(
      prepareCompanyLifecycle(secret, cmd, context(secret, cmd, [fact])),
    ).next;
    expect(projectCompanyLifecycle(observed, 'company')?.candidateIds).not.toContain('sibling');
    expect(
      projectCompanyLifecycle(observed, 'company')?.characters.find(
        (p) => p.characterId === 'sibling',
      )?.knownStatus,
    ).toBe('DEAD');
  });

  it('refuses forged sources and treats battle participation as neither death nor incapacity', () => {
    const original = opening().result.next;
    const leader = personIn(original, 'leader');
    const state = changePerson(original, 'leader', {
      presence: {
        ...leader.presence,
        availability: 'IN_ENCOUNTER',
        encounterBindingId: entityId('battle'),
      },
    });
    const attempt = resolve(state, 'ACTING', 'front', 'LEADER_UNAVAILABLE');
    expect(attempt.result).toMatchObject({ kind: 'REJECTED', state });
    const dead = unavailable(original, 'leader', 'DEAD');
    const { cmd, ctx } = resolve(dead, 'PERMANENT', 'front');
    expect(
      prepareCompanyLifecycle(dead, cmd, {
        ...ctx,
        facts: ctx.facts.map((f) => ({ ...f, worldId: 'other' })),
      }),
    ).toMatchObject({ kind: 'REJECTED', state: dead, error: 'INVALID_SOURCE' });
  });
  it('replaces a lost regent without discarding the existing minor heir', () => {
    let state = opening().result.next;
    const sibling = personIn(state, 'sibling');
    state = changePerson(state, 'sibling', {
      identity: { ...sibling.identity, bornAt: birthTick('0') },
    });
    state = {
      ...state,
      company: { ...state.company!, designatedHeirId: sibling.identity.characterId },
      memberships: [
        ...state.memberships,
        {
          membershipId: entityId('second-regent'),
          companyId: state.companyId,
          characterId: entityId('reach'),
          basis: 'PAID',
          startedAt: tick,
          endedAt: null,
          wageScheduleId: null,
        },
      ],
    };
    state = unavailable(state, 'leader', 'DEAD');
    state = prepared(resolve(state, 'REGENCY', 'front').result).next;
    state = unavailable(state, 'front', 'DEAD');
    const cmd = input(
      state,
      'ResolveLeadership',
      {
        companyId: state.companyId,
        crisisId: 'regent-lost',
        mode: 'REGENCY',
        candidateId: 'reach',
      },
      'PLAYER',
      'regent-lost',
    );
    const fact: CrisisEvidence = {
      ...source(state, 'regent-lost'),
      kind: 'CRISIS',
      reason: 'LEADER_DIED',
      leaderId: 'front',
    };
    const next = prepared(prepareCompanyLifecycle(state, cmd, context(state, cmd, [fact]))).next;
    expect(next.company).toMatchObject({
      currentLeaderId: 'sibling',
      regencyHeirId: 'sibling',
      actingLeaderId: 'reach',
      runStatus: 'ACTIVE',
    });
    expect(next.characters).toEqual(state.characters);
  });

  it('does not convert malformed or contradictory history into a terminal campaign', () => {
    let state = unavailable(opening().result.next, 'leader', 'DEAD');
    state = unavailable(state, 'front', 'DEAD');
    const sibling = personIn(state, 'sibling');
    // Simulate an invalid loaded enum, not a new supported character status.
    const malformed = changePerson(state, 'sibling', {
      presence: {
        ...sibling.presence,
        availability: 'UNKNOWN_RUNTIME_VALUE' as LifecycleCharacter['presence']['availability'],
      },
    });
    expect(resolve(malformed, 'PERMANENT').result).toMatchObject({
      kind: 'REJECTED',
      state: malformed,
      error: 'INVALID_STATE',
    });
    const futureExit = {
      ...state,
      memberships: state.memberships.map((m) =>
        m.characterId === 'front' ? { ...m, endedAt: campaignTick('2000') } : m,
      ),
    };
    expect(resolve(futureExit, 'PERMANENT', 'sibling').result).toMatchObject({
      kind: 'REJECTED',
      state: futureExit,
      error: 'INVALID_STATE',
    });
  });

  it('releases a recovery slot only after actual care handover and requires a real return', () => {
    let state = opening().result.next;
    const front = personIn(state, 'front');
    const cmd = input(state, 'SetAssignment', {
      characterId: 'front',
      assignment: 'RECOVERY',
      locationId: home.siteId,
      dutyEvidenceId: 'care',
      fundingPoolId: 'cash',
    });
    const fact: LifecycleEvidence = {
      ...source(state, 'care'),
      kind: 'DUTY',
      characterId: 'front',
      assignment: 'RECOVERY',
      location: home,
      fundingPoolId: 'cash',
      handoverToId: null,
      partyId: 'party',
    };
    const held = prepared(prepareCompanyLifecycle(state, cmd, context(state, cmd, [fact]))).next;
    expect(personIn(held, 'front').presence.fieldPartyId).toBe(front.presence.fieldPartyId);
    const away = changePerson(state, 'provider', {
      presence: {
        ...personIn(state, 'provider').presence,
        location: { ...home, areaId: 'elsewhere' },
      },
    });
    expect(
      prepareCompanyLifecycle(
        away,
        cmd,
        context(away, cmd, [{ ...fact, handoverToId: 'provider' }]),
      ),
    ).toMatchObject({ kind: 'REJECTED', state: away });
    const handed = prepared(
      prepareCompanyLifecycle(
        state,
        cmd,
        context(state, cmd, [{ ...fact, handoverToId: 'provider' }]),
      ),
    );
    expect(personIn(handed.next, 'front').presence).toMatchObject({
      fieldPartyId: null,
      assignment: 'RECOVERY',
      location: home,
    });
    expect(handed.receipt.requirements[0]?.kind).toBe('DUTY_SETTLEMENT');
    state = changePerson(handed.next, 'front', {
      presence: {
        ...personIn(handed.next, 'front').presence,
        availability: 'OUT_OF_CONTACT',
        assignment: 'NONE',
      },
    });
    const returning = input(state, 'ReturnToService', {
      characterId: 'front',
      arrivalEvidenceId: 'returned',
      assignment: 'HOME_RESERVE',
    });
    const arrival: LifecycleEvidence = {
      ...source(state, 'returned'),
      kind: 'ARRIVAL',
      characterId: 'front',
      segmentId: 'real-route',
      from: 'inn',
      location: home,
    };
    const resumed = prepared(
      prepareCompanyLifecycle(state, returning, context(state, returning, [arrival])),
    ).next;
    expect(personIn(resumed, 'front').presence).toMatchObject({
      availability: 'AVAILABLE',
      assignment: 'HOME_RESERVE',
      fieldPartyId: null,
    });
    const captive = unavailable(state, 'front', 'CAPTIVE');
    expect(
      prepareCompanyLifecycle(captive, returning, context(captive, returning, [arrival])),
    ).toMatchObject({ kind: 'REJECTED', state: captive });
  });
});

describe('lifecycle continuity and source scope', () => {
  it('replaces a deceased acting leader without usurping the unavailable nominal leader', () => {
    let state = unavailable(opening().result.next, 'leader', 'CAPTIVE');
    state = prepared(resolve(state, 'ACTING', 'front', 'LEADER_UNAVAILABLE').result).next;
    state = unavailable(state, 'front', 'DEAD');
    const cmd = input(state, 'ResolveLeadership', {
      companyId: state.companyId,
      crisisId: 'acting-lost',
      mode: 'ACTING',
      candidateId: 'sibling',
    });
    const fact: CrisisEvidence = {
      ...source(state, 'acting-lost'),
      kind: 'CRISIS',
      reason: 'LEADER_DIED',
      leaderId: 'front',
    };
    const result = prepared(prepareCompanyLifecycle(state, cmd, context(state, cmd, [fact])));
    expect(result.next.company).toMatchObject({
      currentLeaderId: 'leader',
      actingLeaderId: 'sibling',
      runStatus: 'ACTIVE',
    });
    expect(result.next.characters).toEqual(state.characters);
  });

  it('delivers one world event to distinct subjects without duplicating any one observation', () => {
    let state = opening().result.next;
    const observe = (s: LifecycleState, subjectId: string, commandId: string) => {
      const observationId = `seen-${subjectId}`;
      const cmd = {
        ...input(
          s,
          'Observe',
          {
            observationId,
            observerRef: { kind: 'COMPANY', id: s.companyId },
            subjectRef: { kind: 'CHARACTER', id: subjectId },
            factId: observationId,
            sourceId: 'shared-report',
          },
          'DOMAIN_RECEIPT',
          commandId,
        ),
        sourceEventId: 'shared-report',
      };
      const fact: LifecycleEvidence = {
        ...source(s, observationId),
        sourceEventId: 'shared-report',
        kind: 'COMPANY_OBSERVATION',
        subject: { kind: 'CHARACTER', id: subjectId },
      };
      return prepareCompanyLifecycle(s, cmd, context(s, cmd, [fact]));
    };
    state = prepared(observe(state, 'front', 'report-front')).next;
    state = prepared(observe(state, 'sibling', 'report-sibling')).next;
    expect(projectCompanyLifecycle(state, 'company')?.characters.map((p) => p.characterId)).toEqual(
      ['front', 'sibling'],
    );
    expect(observe(state, 'front', 'report-sibling')).toMatchObject({
      kind: 'REJECTED',
      state,
      error: 'IDEMPOTENCY_CONFLICT',
    });
    const again = prepared(observe(state, 'front', 'same-report-new-command'));
    expect(again.replayed).toBe(true);
    expect(again.next).toBe(state);
  });

  it('allows a legitimate final observation without reopening a terminal campaign', () => {
    let state = opening().result.next;
    state = { ...state, knowledge: { ...state.knowledge, runStatus: 'ACTIVE' } };
    for (const id of ['leader', 'front', 'sibling']) state = unavailable(state, id, 'DEAD');
    state = prepared(resolve(state, 'PERMANENT').result).next;
    expect(projectCompanyLifecycle(state, 'company')?.runStatus).toBe('ACTIVE');
    const cmd = input(
      state,
      'Observe',
      {
        observationId: 'final-news',
        observerRef: { kind: 'COMPANY', id: 'company' },
        subjectRef: { kind: 'COMPANY', id: 'company' },
        factId: 'final-news',
        sourceId: 'source-final-news',
      },
      'DOMAIN_RECEIPT',
      'final-news',
    );
    const fact: LifecycleEvidence = {
      ...source(state, 'final-news'),
      kind: 'COMPANY_OBSERVATION',
      subject: { kind: 'COMPANY', id: 'company' },
    };
    const observed = prepared(
      prepareCompanyLifecycle(state, cmd, context(state, cmd, [fact])),
    ).next;
    expect(projectCompanyLifecycle(observed, 'company')?.runStatus).toBe('GAME_OVER');
    const rename = input(observed, 'RenameCompany', {
      companyId: 'company',
      name: 'Resurrected',
      bannerId: 'banner',
    });
    expect(prepareCompanyLifecycle(observed, rename, context(observed, rename))).toMatchObject({
      kind: 'REJECTED',
      state: observed,
      error: 'TERMINAL',
    });
  });

  it('does not let a public projection mutate stored observation snapshots', () => {
    const base = opening().result.next;
    const state = { ...base, knowledge: { ...base.knowledge, characters: base.characters } };
    const before = canonicalJson(state);
    const view = projectCompanyLifecycle(state, 'company')!;
    const location = view.characters[0]!.location as { siteId: string };
    location.siteId = 'elsewhere';
    expect(canonicalJson(state)).toBe(before);
  });
});
