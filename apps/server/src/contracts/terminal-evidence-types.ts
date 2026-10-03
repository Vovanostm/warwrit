import type {
  CompanyCombatAggregateState,
  ConsumeCombatAggregateInput,
  FinalizeCombatAggregateInput,
} from '@warwrit/game-core';
import type { Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';

/**
 * Shapes shared by the FIRST HUNT terminal transaction and the encounter evidence producer.
 * Kept apart from both executors so neither imports the other.
 */
export type FirstHuntTerminalEvidenceResidual =
  | 'ENCOUNTER_REPLAY_INVALID'
  | 'COMPANY_BINDING_MISMATCH'
  | 'COMPANY_ROOT_NOT_ACTIVE'
  | 'RECEIPT_TIME_EVIDENCE_MISSING'
  | 'PHYSICAL_CONSEQUENCE_EVIDENCE_MISSING'
  | 'DEATH_FINANCE_EVIDENCE_MISSING'
  | 'TERMINAL_DISPOSITION_EVIDENCE_MISSING'
  | 'LEARNING_EVIDENCE_MISSING'
  | 'PRACTICE_PROFILE_INVALID'
  | 'PRACTICE_CREDIT_EVIDENCE_MISSING'
  | 'LEADERSHIP_SUCCESSION_EVIDENCE_MISSING'
  | 'LEADERSHIP_CHOICE_REQUIRED'
  | 'LEADERSHIP_CHOICE_REJECTED'
  | 'PROFILE_INVALID';

/** Terminal consequences wait for the owner to name a successor; not a failure. */
export class TerminalAwaitingLeadershipChoice extends Error {
  constructor(readonly companyId: string) {
    super(`FIRST HUNT terminal waits for the leadership choice of ${companyId}`);
  }
}

export type FirstHuntTerminalEvidence =
  | {
      readonly status: 'READY';
      readonly consume: ConsumeCombatAggregateInput;
      readonly finalize: FinalizeCombatAggregateInput;
      readonly bindingId: string;
      readonly terminalRevision: number;
      readonly finalState: CompanyCombatAggregateState;
      readonly finalStateDigest: string;
      readonly outcomeDigest: string;
      readonly practiceProfile: {
        readonly version: string;
        readonly profileId: string;
        readonly challengeLevel: number;
        readonly digest: string;
      };
      readonly contractProfileId: string;
      readonly contractTermsDigest: string;
    }
  | {
      readonly status: 'NOT_READY';
      readonly residuals: readonly FirstHuntTerminalEvidenceResidual[];
    };

export type PrepareFirstHuntTerminalEvidence = (
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly worldId: string;
    readonly encounterId: string;
    readonly terminalRevision: number;
    readonly companyId: string;
    readonly previous: CompanyCombatAggregateState;
    readonly contractProfileId: string;
    readonly contractTermsDigest: string;
  },
) => Promise<FirstHuntTerminalEvidence>;
