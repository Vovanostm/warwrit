import type { CompanyFinance, EconomyRequirement } from './economy-types.js';
import type { LifecycleState } from './lifecycle-types.js';
import type { CompanyPhysicalState } from './physical-types.js';

export type MaterializedCompanyState = {
  readonly lifecycle: LifecycleState;
  readonly finance: CompanyFinance;
  readonly physical: CompanyPhysicalState;
};

export type PhysicalChange = {
  readonly lifecycle: LifecycleState;
  readonly finance: CompanyFinance;
  readonly physical: CompanyPhysicalState;
  readonly requirements: readonly EconomyRequirement[];
};
