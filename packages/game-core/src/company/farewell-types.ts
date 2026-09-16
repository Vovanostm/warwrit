import { array, bool, choice, id, object, unsigned, type ValueOf } from './input.js';

export const FAREWELL_POLICY = Object.freeze({ version: 's02-farewell-1', respectDelta: -5 });
export const farewellOutcomeInput = object({
  policy: choice(FAREWELL_POLICY.version),
  factId: id,
  worldId: id,
  companyId: id,
  membershipId: id,
  personId: id,
  leaderId: id,
  sourceEventId: id,
  atTick: unsigned,
  eligible: bool,
  recognitionQ: unsigned,
  givenQ: unsigned,
  observerIds: array(id, 0, 1000, true),
});
export type FarewellOutcome = ValueOf<typeof farewellOutcomeInput>;
