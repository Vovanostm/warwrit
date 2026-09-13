import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  bindLegacySkillProgress,
  fieldPartyStatus,
  initialSkillProgress,
  isSkillProgress,
  prepareCompanyEconomy,
  prepareCompanyLifecycle,
  progressionLevel,
  projectCompanyEconomy,
  readSkillProgress,
  skillLevel,
  skillLevels,
} from '@warwrit/game-core';
import type { CompanyEconomyState, OpeningEvidence } from '@warwrit/game-core';
import {
  advance,
  claims,
  command,
  context,
  economy,
  observation,
  pay,
  person,
  place,
  prepared,
  scope,
} from './company-economy-fixture.js';
import { condition } from './company-physical-fixture.js';

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function rename(state: CompanyEconomyState) {
  return command(state, 'RenameCompany', {
    companyId: state.lifecycle.companyId,
    name: 'Renamed',
    bannerId: 'banner',
  });
}

describe('A02 — single skill progress owner and level-only compatibility', () => {
  it('requires matching explicit totals for legacy bindings and owns the supplied data', () => {
    expect(readSkillProgress(1)).toBe(1);
    const amount = { milliXp: '12345', carry: '678901234567' };
    const exact = bindLegacySkillProgress(1, amount, 'verified-import');
    amount.carry = '0';
    expect(reload(exact).amount).toEqual({ milliXp: '12345', carry: '678901234567' });
    expect(skillLevel(exact)).toBe(1);
    expect(exact).not.toHaveProperty('level');
    expect(() => bindLegacySkillProgress(2, exact.amount, 'wrong-level')).toThrow(RangeError);
    const rebind = () => bindLegacySkillProgress(exact as unknown as number, exact.amount, 'again');
    expect(rebind).toThrow(RangeError);
    expect(initialSkillProgress(1, 'opening').amount).toEqual({ milliXp: '10000', carry: '0' });
    expect(skillLevels({ leadership: exact, medicine: 0 })).toEqual({ leadership: 1, medicine: 0 });
  });

  it('retains exact totals and carry across JSON reload beyond safe Number', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 30n }),
        fc.bigInt({ min: 0n, max: 999999999999n }),
        (xp, fraction) => {
          const amount = { milliXp: xp.toString(), carry: fraction.toString() };
          const exact = bindLegacySkillProgress(progressionLevel(amount.milliXp), amount, 'import');
          expect(readSkillProgress(reload(exact))).toEqual(exact);
          expect(exact.amount).toEqual(amount);
        },
      ),
    );
    const huge = bindLegacySkillProgress(100, { milliXp: '9007199254740993', carry: '1' }, 'cap');
    expect(skillLevel(huge)).toBe(100);
  });

  it('retains progress across root branches and retries without leaking private totals', () => {
    const legacy = claims(economy([1n]), [2n]);
    const legacyCommand = rename(legacy);
    const legacyResult = prepareCompanyEconomy(
      legacy,
      legacyCommand,
      context(legacy, legacyCommand),
    );
    expect(prepared(legacyResult).next.lifecycle.characters).toEqual(legacy.lifecycle.characters);
    let state: CompanyEconomyState = {
      ...legacy,
      lifecycle: {
        ...legacy.lifecycle,
        characters: legacy.lifecycle.characters.map((character) => ({
          ...character,
          skills: {
            ...character.skills,
            leadership: bindLegacySkillProgress(
              25,
              { milliXp: '3250123', carry: '812345678901' },
              'verified-import',
            ),
          },
        })),
      },
    };
    const original = reload(state);
    expect(fieldPartyStatus(state.lifecycle, 'party')).toEqual(
      fieldPartyStatus(legacy.lifecycle, 'party'),
    );
    expect(projectCompanyEconomy(state, state.lifecycle.companyId)).toEqual(
      projectCompanyEconomy(legacy, legacy.lifecycle.companyId),
    );
    const cmd = rename(state);
    state = prepared(prepareCompanyEconomy(state, cmd, context(state, cmd))).next;
    const retried = prepared(prepareCompanyEconomy(reload(state), cmd, context(state, cmd)));
    expect(retried.replayed).toBe(true);
    expect(retried.next).toEqual(state);
    state = pay(state, 1n).next;
    state = condition(state, 'worker-0', 'minor-field-wound', 'wound').next;
    state = advance(state, 1001).next;
    state = observation(reload(state), 'leader').result.next;
    const retained = (root: CompanyEconomyState) =>
      root.lifecycle.characters.map((p) => [p.identity, p.skills, p.aptitudeBySkill, p.perks]);
    expect(retained(state)).toEqual(retained(original));
    const known = state.lifecycle.knowledge.characters.find(
      (p) => p.identity.characterId === 'leader',
    );
    expect(known?.skills).toEqual({ leadership: 25 });
    expect(legacy.lifecycle.characters.every((p) => p.skills['leadership'] === 25)).toBe(true);
  });

  it('rejects malformed or dual-authority entries atomically', () => {
    const exact = initialSkillProgress(1, 'opening');
    for (const value of [
      -1,
      -0,
      0.5,
      101,
      null,
      { ...exact, level: 1 },
      { ...exact, schemaVersion: 2 },
      { ...exact, rulesVersion: 'unknown' },
      { ...exact, amount: { milliXp: '10000', carry: '1000000000000' } },
      { ...exact, amount: { milliXp: '10000' } },
    ]) {
      expect(isSkillProgress(value)).toBe(false);
      expect(() => readSkillProgress(value)).toThrow(RangeError);
      const state = economy([1n]);
      const invalid = reload(state);
      Object.assign(invalid.lifecycle.characters[0]!.skills, { leadership: value });
      const cmd = rename(invalid);
      const before = JSON.stringify(invalid);
      expect(prepareCompanyEconomy(invalid, cmd, context(invalid, cmd))).toMatchObject({
        kind: 'REJECTED',
        state: invalid,
        error: 'INVALID_STATE',
      });
      expect(JSON.stringify(invalid)).toBe(before);
    }
  });

  it('credits only new people from the opening source, never a replay', () => {
    const old = economy([]);
    const state = {
      ...old,
      lifecycle: {
        ...old.lifecycle,
        company: null,
        memberships: [],
        parties: [],
        characters: [person('contact', false), person('provider', false)],
        knowledge: { ...old.lifecycle.knowledge, leaderId: null, characters: [], candidateIds: [] },
      },
    };
    const fact: OpeningEvidence = {
      ...scope(state, 'opening'),
      kind: 'OPENING',
      profileId: 'm1-company-start',
      originId: 'broken-company',
      familyStoryId: 'adult-sibling-home',
      cultureId: 'north',
      location: place,
      birthplaceIds: ['village'],
      leaderId: 'new-leader',
      partyId: 'party',
      seed: 23,
      candidates: ['front', 'reach', 'support'].map((id) => ({
        characterId: id,
        templateId: id,
        name: id,
        sex: 'male',
      })),
      relatives: [{ characterId: 'sibling', name: 'Sibling', sex: 'female' }],
      contactId: 'contact',
      providerId: 'provider',
    };
    const { characterId: _id, ...leaderInput } = person('new-leader').identity;
    const cmd = command(state, 'CreateCompany', {
      companyId: state.lifecycle.companyId,
      worldId: state.lifecycle.worldId,
      originId: fact.originId,
      cultureId: fact.cultureId,
      homelandId: place.siteId,
      familyStoryId: fact.familyStoryId,
      leaderInput,
      candidateSetId: fact.id,
      selectedCandidateIds: ['front'],
      name: 'Company',
      bannerId: 'banner',
    });
    const result = prepareCompanyLifecycle(state.lifecycle, cmd, context(state, cmd, [], [fact]));
    if (result.kind !== 'PREPARED') throw new Error(result.error);
    for (const character of result.next.characters) {
      const previous = state.lifecycle.characters.find(
        (p) => p.identity.characterId === character.identity.characterId,
      );
      if (previous) expect(character).toEqual(previous);
      else
        for (const progress of Object.values(character.skills)) {
          expect(progress).toMatchObject({
            binding: { kind: 'INITIAL_CREDIT', sourceId: fact.id },
          });
          expect(isSkillProgress(progress)).toBe(true);
        }
    }
    const next = { ...state, lifecycle: reload(result.next) };
    const replay = prepareCompanyLifecycle(next.lifecycle, cmd, context(next, cmd));
    expect(replay).toMatchObject({ kind: 'PREPARED', replayed: true, next: next.lifecycle });
  });
});
