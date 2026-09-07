import { describe, expect, it } from 'vitest';

import { COMPANY_COMMAND_TYPES, requiredActor } from './index.js';
import type { ActorKind, CompanyCommand, CompanyCommandType } from './index.js';

// Independent source oracle: never derive expected permissions from requiredActor.
const expected = {
  CreateCompany: ['PLAYER'],
  Recruit: ['PLAYER'],
  JoinFieldParty: ['PLAYER'],
  SetAssignment: ['PLAYER'],
  Arrive: ['WORLD_RECEIPT'],
  RequestDeparture: ['PLAYER'],
  ExecuteDeparture: ['SYSTEM'],
  PayClaims: ['PLAYER'],
  GrantFarewell: ['PLAYER'],
  TransferFunds: ['PLAYER'],
  AdvanceCampaign: ['SYSTEM'],
  BeginFieldCamp: ['PLAYER'],
  EndMaintenance: ['PLAYER'],
  AcceptSafeService: ['PLAYER'],
  AmendSafeService: ['PLAYER'],
  StartLearning: ['PLAYER'],
  StopLearning: ['PLAYER'],
  CreditPractice: ['DOMAIN_RECEIPT'],
  ChoosePerk: ['PLAYER'],
  StartRetraining: ['PLAYER'],
  ApplyCare: ['PLAYER'],
  ApplyCondition: ['DOMAIN_RECEIPT'],
  Observe: ['DOMAIN_RECEIPT'],
  Capture: ['OUTCOME_RECEIPT'],
  ReleaseCaptive: ['OUTCOME_RECEIPT'],
  TransferCaptive: ['OUTCOME_RECEIPT'],
  ResolveMissing: ['WORLD_RECEIPT'],
  RecordDeath: ['OUTCOME_RECEIPT'],
  ReturnToService: ['PLAYER'],
  DesignateHeir: ['PLAYER'],
  ResolveLeadership: ['PLAYER'],
  ProposeNickname: ['DOMAIN_RECEIPT'],
  ResolveNickname: ['PLAYER'],
  ChangePresentation: ['PLAYER'],
  RenameCompany: ['PLAYER'],
  TransferItem: ['PLAYER'],
  EquipItem: ['PLAYER'],
  RepairItem: ['PLAYER'],
  ClaimLoot: ['PLAYER'],
  ApplyContainerLifecycle: ['WORLD_RECEIPT'],
  BeginEncounterBinding: ['SYSTEM'],
  ConsumeCombatReceipt: ['COMBAT_RECEIPT'],
  FinalizeEncounter: ['COMBAT_RECEIPT'],
} satisfies Record<CompanyCommandType, readonly ActorKind[]>;

// Selector-only unit fixtures, not valid envelopes. Never pass them to execution.
// Complete parsed/authenticated envelope fixtures live in fixtures.test.ts.
function selection(type: CompanyCommandType, payload: Record<string, string>): CompanyCommand {
  return { type, payload } as unknown as CompanyCommand;
}

const initialSelectors: Partial<Record<CompanyCommandType, Record<string, string>>> = {
  RequestDeparture: { reason: 'DISMISSED' },
  EndMaintenance: { reason: 'LEAVE' },
  StopLearning: { reason: 'PLAYER' },
  ResolveLeadership: { mode: 'PERMANENT' },
};

describe('WP-02.1 independent actor policy', () => {
  it('matches every source command rather than trusting the fixture actor generator', () => {
    expect(Object.keys(expected).sort()).toEqual([...COMPANY_COMMAND_TYPES].sort());
    for (const type of COMPANY_COMMAND_TYPES) {
      expect(requiredActor(selection(type, initialSelectors[type] ?? {}))).toEqual(expected[type]);
    }
  });

  it('covers every reason-dependent authority and preserves permanent player choices', () => {
    for (const reason of ['WAGE_BREACH', 'CANONICAL_EVENT']) {
      expect(requiredActor(selection('RequestDeparture', { reason }))).toEqual(['SYSTEM']);
    }
    for (const reason of ['MOVE', 'ENCOUNTER', 'INCOMPATIBLE_DUTY']) {
      expect(requiredActor(selection('EndMaintenance', { reason }))).toEqual(['SYSTEM']);
    }
    for (const reason of ['GOAL', 'FUNDS', 'PREREQUISITES']) {
      expect(requiredActor(selection('StopLearning', { reason }))).toEqual(['SYSTEM']);
    }
    for (const mode of ['ACTING', 'REGENCY']) {
      expect(requiredActor(selection('ResolveLeadership', { mode }))).toEqual(['PLAYER', 'SYSTEM']);
    }
    for (const mode of ['PERMANENT', 'CONFIRM_ACTING', 'RESTORE_HEIR']) {
      expect(requiredActor(selection('ResolveLeadership', { mode }))).toEqual(['PLAYER']);
    }
  });
});
