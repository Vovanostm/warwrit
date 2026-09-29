import type { WORLD_REGION_VERSION } from '../world/region.js';

export type ContractTemplate = 'HUNT' | 'INVESTIGATE' | 'RESCUE';

export type ContractProofKind =
  | 'ACCESSIBLE_OBSERVATION_SET'
  | 'LIVING_PERSON_DELIVERY'
  | 'SOURCE_BOUND_HUNT_PROOF'
  | 'UNIQUE_PHYSICAL_TROPHY';

export type ContractSourceKind =
  | 'OBSERVATION'
  | 'REPORT'
  | 'ACCEPTANCE'
  | 'LIVING_PERSON'
  | 'ENCOUNTER'
  | 'STOCK_RECORD'
  | 'DISCOVERY'
  | 'TERMINAL_RESULT'
  | 'PHYSICAL_PICKUP';

export type ContractOutcomeKind = 'SUCCESS' | 'FAILURE' | 'PENDING';
export type ContractSceneOutcomeKind = ContractOutcomeKind | 'CONTINUE' | 'UNLOCK';
export type ContractGateKind =
  'ALL_PRESENT' | 'ANY_PRESENT' | 'ANY_GROUP_PRESENT' | 'ALL_ABSENT' | 'ANY_ABSENT' | 'ALWAYS';
export type ContractSourceLabel = 'ACCEPTED_POLICY' | 'PROVISIONAL_LORE' | 'AUTHORED_DERIVATIVE';

export interface ContractLocationReference {
  readonly siteId: string;
  readonly areaId: string;
}

export interface ContractSourceSlot {
  readonly slotId: string;
  readonly definitionId: string;
  readonly kind: ContractSourceKind;
}

export interface ContractDefinition {
  readonly definitionId: string;
  readonly template: ContractTemplate;
  readonly issuerRoleId: string;
  readonly issuerLocation: ContractLocationReference;
  readonly sourceSlotIds: readonly string[];
  readonly proofKind: ContractProofKind;
  readonly sourceLabels: readonly ContractSourceLabel[];
  readonly prerequisiteDefinitionIds: readonly string[];
  readonly sceneIds: readonly string[];
}

export interface ContractInstanceBinding {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly definitionEdition: string;
  readonly terms: { readonly status: 'UNBOUND' };
}

export interface ContractSceneGate {
  readonly kind: ContractGateKind;
  readonly sourceSlotGroups: readonly (readonly string[])[];
}

export interface ContractSceneOutcome {
  readonly kind: ContractSceneOutcomeKind;
  readonly gate: ContractSceneGate;
  readonly nextSceneId?: string;
  readonly unlocksDefinitionId?: string;
}

export interface ContractScene {
  readonly sceneId: string;
  readonly definitionId: string;
  readonly venue: ContractLocationReference;
  readonly referencedSourceSlotIds: readonly string[];
  readonly outcomes: readonly ContractSceneOutcome[];
}

export interface ContractEdition {
  readonly editionId: string;
  readonly definitions: readonly ContractDefinition[];
  readonly initialInstances: readonly ContractInstanceBinding[];
  readonly scenes: readonly ContractScene[];
  readonly sourceSlots: readonly ContractSourceSlot[];
}

export interface ContractCatalogue {
  readonly schemaVersion: 1;
  readonly worldRegionVersion: typeof WORLD_REGION_VERSION;
  readonly editions: readonly ContractEdition[];
}

export interface ContractCatalogueValidation {
  readonly valid: boolean;
  readonly issues: readonly string[];
}

export interface BoundContractInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly definitionEdition: string;
  readonly definition: ContractDefinition;
}
