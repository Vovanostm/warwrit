import type { BirthTick, CampaignTick, CanonicalRevision, CharacterId, CompanyId, EntityId, PublicRevision, WorldId } from './values.js';

export const COMPANY_SCHEMA_VERSION = 1 as const;
// A new reconstruction edition: not a byte-identical copy of either unavailable ZIP.
export const COMPANY_CATALOGUE_VERSION = 's02-foundation-catalogue-1' as const;
export const COMPANY_RULESET_ID = 's02-domain-provisional-0.2' as const;
export const COMPANY_COMMAND_SCHEMA_VERSION = 1 as const;
export const ASSIGNMENTS = ['FIELD', 'HOME_RESERVE', 'RECOVERY', 'GARRISON', 'REMOTE_TASK', 'NONE'] as const;
export type Assignment = typeof ASSIGNMENTS[number];
export type Availability = 'AVAILABLE' | 'IN_ENCOUNTER' | 'OUT_OF_CONTACT' | 'CAPTIVE' | 'DEAD';
export interface CharacterIdentity {
  readonly characterId: CharacterId;
  readonly birthName: string;
  readonly sex: string;
  readonly birthCultureId: EntityId<'Culture'>;
  readonly birthplaceId: EntityId<'Location'>;
  readonly originId: EntityId<'Origin'>;
  readonly speciesId: EntityId<'Species'>;
  readonly bornAt: BirthTick;
}
export type LocationRef =
  | { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string }
  | { readonly kind: 'TRANSIT'; readonly segmentId: string; readonly from: string; readonly to: string; readonly startedAt: CampaignTick; readonly arrivalNotBefore: CampaignTick };
export type OwnerRef = { readonly kind: 'CHARACTER' | 'COMPANY' | 'ESTATE' | 'WORLD'; readonly id: string };
export interface Membership {
  readonly membershipId: EntityId<'Membership'>;
  readonly companyId: CompanyId;
  readonly characterId: CharacterId;
  readonly basis: 'PAID' | 'FAMILY' | 'FOUNDER';
  readonly startedAt: CampaignTick;
  readonly endedAt: CampaignTick | null;
  readonly wageScheduleId: EntityId<'WageSchedule'> | null;
}
export interface CharacterPresence {
  readonly characterId: CharacterId;
  readonly assignment: Assignment;
  readonly availability: Availability;
  readonly location: LocationRef;
  readonly fieldPartyId: EntityId<'FieldParty'> | null;
  readonly encounterBindingId: EntityId<'EncounterBinding'> | null;
}
export interface ObservedCharacterStatus {
  readonly characterId: CharacterId;
  readonly observerCompanyId: CompanyId;
  readonly knownStatus: Availability | 'UNKNOWN' | 'PRESUMED_DEAD';
  readonly observationId: EntityId<'Observation'>;
  readonly learnedAt: CampaignTick;
}
export interface CompanyIdentity {
  readonly companyId: CompanyId;
  readonly worldId: WorldId;
  readonly homeLocationId: EntityId<'Location'>;
  readonly currentLeaderId: CharacterId;
  readonly actingLeaderId: CharacterId | null;
  readonly designatedHeirId: CharacterId | null;
}
/** Deliberately different types: a public counter is never a canonical CAS token. */
export interface CompanyRevisionState {
  readonly publicRevision: PublicRevision;
  readonly canonicalRevision: CanonicalRevision;
}
