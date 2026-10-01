export * from './values.js';
export * from './model.js';
export * from './definitions.js';
export * from './commands.js';
export * from './guards.js';
export { canonicalJson, isJsonData } from './input.js';
export type * from './lifecycle-types.js';
export { canPerform } from './lifecycle-state.js';
export {
  prepareCompanyLifecycle,
  projectCompanyLifecycle,
  projectLifecycleRejection,
  observePartyMovement,
} from './lifecycle.js';
export { successionChoices } from './succession.js';
export type { SuccessionChoice, SuccessionChoiceMode } from './succession.js';
export { fieldPartyStatus } from './membership.js';
export type * from './economy-types.js';
export { ECONOMY_SCHEMA_VERSION, ECONOMY_POLICY_VERSION } from './economy-types.js';
export { createCompanyEconomyState } from './economy-state.js';
export { receiveExternalPayment } from './economy-payments.js';
export { accrueFinance } from './economy-accrual.js';
export {
  prepareCompanyEconomy,
  prepareCompanyEconomyWithLearning,
  prepareCompanyEconomyWithLearningAndSocial,
  prepareCompanyFinancialSocial,
} from './economy.js';
export type {
  CompanyEconomyWithLearningAndSocialResult,
  CompanyEconomyWithLearningAndSocialState,
  CompanyEconomyWithLearningState,
  CompanyEconomyWithLearningResult,
} from './economy.js';
export { projectCompanyEconomy, projectEconomyRejection } from './economy-view.js';
export { quoteCompanyFarewell } from './economy-departure.js';
export type * from './physical-types.js';
export type * from './physical-root-types.js';
export {
  PHYSICAL_SCHEMA_VERSION,
  PHYSICAL_POLICY_VERSION,
  PHYSICAL_RULES,
  TRAVEL_RULES,
  TRAVEL_PROFILES,
  travelProfile,
} from './physical-types.js';
export { createCompanyPhysicalState, validatePhysicalState } from './physical-state.js';
export { availableContainerG } from './physical-state.js';
export { assessPhysicalFoodStock } from './physical-food.js';
export { materializeCompanyPhysicalState } from './physical-load.js';
export { projectCompanyPhysical } from './physical.js';
export * from './combat-projection.js';
export * from './combat-morale.js';
export * from './encounter-binding.js';
export * from './combat-receipts.js';
export * from './combat-physical.js';
export * from './combat-consequences.js';
export {
  COMBAT_PRACTICE_PROFILE_VERSION,
  FIRST_HUNT_PRACTICE_PROFILE_ID,
  deriveCombatPracticeProfile,
  isOpposingEncounterSide,
  prepareCombatPracticeCredits,
  prepareCombatPracticeEffects,
} from './combat-practice.js';
export type {
  CombatPracticeProfile,
  CombatPracticeProfileProduction,
  CombatPracticeProfileResidual,
  TrustedCombatPracticeCredit,
  PreparedCombatPracticeEffects,
  CombatPracticeStartSnapshot,
} from './combat-practice.js';
export * from './combat-aggregate.js';
export { readCompanyCombatAggregateState } from './aggregate-state.js';
export * from './progression.js';
export * from './skill-progress.js';
export * from './study-section.js';
export * from './study-access.js';
export * from './learning-state.js';
export * from './learning-source.js';
export * from './learning-quote.js';
export type { LearningInputs } from './learning-inputs.js';
export * from './learning-task.js';
export * from './learning-admission.js';
export * from './learning-backing.js';
export * from './learning-time.js';
export * from './learning-composition.js';
export * from './course-progress.js';
export { admitPractice } from './practice-admission.js';
export type { PracticeContext, PracticeEvidence } from './practice-admission.js';
export * from './perk-effects.js';
export * from './social.js';
export * from './social-bindings.js';
export * from './social-finance.js';

export { readFarewellOutcome } from './farewell-outcome.js';
