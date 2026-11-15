import { SEROE_PORECHYE, WORLD_REGION_VERSION } from '../world/region.js';
import { CONTRACT_M1_CATALOGUE } from './manifest.js';
import type {
  ContractCatalogue,
  ContractCatalogueValidation,
  ContractDefinition,
  ContractEdition,
  ContractLocationReference,
  ContractScene,
} from './types.js';

const templates = new Set(['HUNT', 'INVESTIGATE', 'RESCUE']);
const proofKinds = new Set([
  'ACCESSIBLE_OBSERVATION_SET',
  'LIVING_PERSON_DELIVERY',
  'SOURCE_BOUND_HUNT_PROOF',
  'UNIQUE_PHYSICAL_TROPHY',
]);
const sourceKinds = new Set([
  'OBSERVATION',
  'REPORT',
  'ACCEPTANCE',
  'LIVING_PERSON',
  'ENCOUNTER',
  'STOCK_RECORD',
  'DISCOVERY',
  'TERMINAL_RESULT',
  'PHYSICAL_PICKUP',
]);
const sourceLabels = new Set(['ACCEPTED_POLICY', 'PROVISIONAL_LORE', 'AUTHORED_DERIVATIVE']);
const outcomeKinds = new Set(['CONTINUE', 'UNLOCK', 'SUCCESS', 'FAILURE', 'PENDING']);
const gateKinds = new Set([
  'ALL_PRESENT',
  'ANY_PRESENT',
  'ANY_GROUP_PRESENT',
  'ALL_ABSENT',
  'ANY_ABSENT',
  'ALWAYS',
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString);
}

function enumString(value: unknown, values: ReadonlySet<string>): value is string {
  return typeof value === 'string' && values.has(value);
}

function locationShape(value: unknown): value is ContractLocationReference {
  return (
    isRecord(value) &&
    exactKeys(value, ['siteId', 'areaId']) &&
    nonEmptyString(value['siteId']) &&
    nonEmptyString(value['areaId'])
  );
}

function definitionShape(value: unknown): value is ContractDefinition {
  return (
    isRecord(value) &&
    exactKeys(value, [
      'definitionId',
      'template',
      'issuerRoleId',
      'issuerLocation',
      'sourceSlotIds',
      'proofKind',
      'sourceLabels',
      'prerequisiteDefinitionIds',
      'sceneIds',
    ]) &&
    nonEmptyString(value['definitionId']) &&
    enumString(value['template'], templates) &&
    nonEmptyString(value['issuerRoleId']) &&
    locationShape(value['issuerLocation']) &&
    stringArray(value['sourceSlotIds']) &&
    enumString(value['proofKind'], proofKinds) &&
    Array.isArray(value['sourceLabels']) &&
    value['sourceLabels'].every((label) => enumString(label, sourceLabels)) &&
    stringArray(value['prerequisiteDefinitionIds']) &&
    stringArray(value['sceneIds'])
  );
}

function editionShape(value: unknown): value is ContractEdition {
  if (
    !isRecord(value) ||
    !exactKeys(value, ['editionId', 'definitions', 'initialInstances', 'scenes', 'sourceSlots']) ||
    !nonEmptyString(value['editionId']) ||
    !Array.isArray(value['definitions']) ||
    !value['definitions'].every(definitionShape) ||
    !Array.isArray(value['initialInstances']) ||
    !Array.isArray(value['scenes']) ||
    !Array.isArray(value['sourceSlots'])
  )
    return false;

  const instancesValid = value['initialInstances'].every((instance) => {
    if (
      !isRecord(instance) ||
      !(
        exactKeys(instance, ['instanceId', 'definitionId', 'definitionEdition', 'terms']) ||
        exactKeys(instance, [
          'instanceId',
          'definitionId',
          'alternateDefinitionIds',
          'definitionEdition',
          'terms',
        ])
      ) ||
      !nonEmptyString(instance['instanceId']) ||
      !nonEmptyString(instance['definitionId']) ||
      instance['definitionEdition'] !== value['editionId'] ||
      (instance['alternateDefinitionIds'] !== undefined &&
        !stringArray(instance['alternateDefinitionIds'])) ||
      !isRecord(instance['terms']) ||
      !exactKeys(instance['terms'], ['status']) ||
      instance['terms']['status'] !== 'UNBOUND'
    )
      return false;
    const alternatives =
      (instance['alternateDefinitionIds'] as readonly string[] | undefined) ?? [];
    return !alternatives.includes(instance['definitionId']) && !hasDuplicates(alternatives);
  });
  const scenesValid = value['scenes'].every((scene) => {
    if (
      !isRecord(scene) ||
      !exactKeys(scene, [
        'sceneId',
        'definitionId',
        'venue',
        'referencedSourceSlotIds',
        'outcomes',
      ]) ||
      !nonEmptyString(scene['sceneId']) ||
      !nonEmptyString(scene['definitionId']) ||
      !locationShape(scene['venue']) ||
      !stringArray(scene['referencedSourceSlotIds']) ||
      !Array.isArray(scene['outcomes'])
    )
      return false;
    return scene['outcomes'].every((outcome) => {
      if (
        !isRecord(outcome) ||
        !['kind', 'gate'].every((key) => key in outcome) ||
        Object.keys(outcome).some(
          (key) => !['kind', 'gate', 'nextSceneId', 'unlocksDefinitionId'].includes(key),
        ) ||
        !enumString(outcome['kind'], outcomeKinds) ||
        !isRecord(outcome['gate']) ||
        !exactKeys(outcome['gate'], ['kind', 'sourceSlotGroups']) ||
        !enumString(outcome['gate']['kind'], gateKinds) ||
        !Array.isArray(outcome['gate']['sourceSlotGroups']) ||
        !outcome['gate']['sourceSlotGroups'].every(stringArray)
      )
        return false;
      return (
        (outcome['nextSceneId'] === undefined || nonEmptyString(outcome['nextSceneId'])) &&
        (outcome['unlocksDefinitionId'] === undefined ||
          nonEmptyString(outcome['unlocksDefinitionId']))
      );
    });
  });
  const slotsValid = value['sourceSlots'].every(
    (slot) =>
      isRecord(slot) &&
      exactKeys(slot, ['slotId', 'definitionId', 'kind']) &&
      nonEmptyString(slot['slotId']) &&
      nonEmptyString(slot['definitionId']) &&
      enumString(slot['kind'], sourceKinds),
  );
  return instancesValid && scenesValid && slotsValid;
}

function locationExists(location: ContractLocationReference): boolean {
  return SEROE_PORECHYE.sites.some(
    (site) =>
      site.siteId === location.siteId && site.areas.some((area) => area.areaId === location.areaId),
  );
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function addUniqueIssues(issues: string[], label: string, values: readonly string[]): void {
  if (hasDuplicates(values)) issues.push(`DUPLICATE_${label}_ID`);
}

function validateEdition(edition: ContractEdition, issues: string[]): void {
  const definitionIds = edition.definitions.map((definition) => definition.definitionId);
  const instanceIds = edition.initialInstances.map((instance) => instance.instanceId);
  const sceneIds = edition.scenes.map((scene) => scene.sceneId);
  const slotIds = edition.sourceSlots.map((slot) => slot.slotId);
  addUniqueIssues(issues, 'DEFINITION', definitionIds);
  addUniqueIssues(issues, 'INSTANCE', instanceIds);
  addUniqueIssues(issues, 'SCENE', sceneIds);
  addUniqueIssues(issues, 'SOURCE_SLOT', slotIds);

  const originalDefinitionIds = [
    'ct.m1.mill-worker.v1',
    'ct.m1.mill-beast.v1',
    'ct.m1.road-tracks.v1',
    'ct.m1.missing-herbs.v1',
    'ct.m1.cellar-rescue.v1',
    'ct.m1.lost-scout.v1',
    'ct.m1.wolf-trail.v1',
    'ct.m1.raider-standard.v1',
    'ct.m1.not-one-pack.v1',
    'ct.m1.tracks-over-tracks.kosars.v1',
    'ct.m1.tracks-over-tracks.bandits.v1',
    'ct.m1.voice-under-boards.v1',
  ];
  const originalInstanceIds = [
    'ci.m1.mill-worker.01',
    'ci.m1.mill-beast.01',
    'ci.m1.road-tracks.01',
    'ci.m1.missing-herbs.01',
    'ci.m1.cellar-rescue.01',
    'ci.m1.lost-scout.01',
    'ci.m1.wolf-trail.01',
    'ci.m1.raider-standard.01',
    'ci.m1.not-one-pack.01',
    'ci.m1.tracks-over-tracks.01',
    'ci.m1.voice-under-boards.01',
  ];
  const originalSceneIds = [
    'MILL-01',
    'MILL-02',
    'MILL-03',
    'MILL-04',
    'HUNT-01',
    'HUNT-02',
    'HUNT-03',
    'HUNT-04',
    'INVEST-06-KOSARS',
    'INVEST-06-BANDITS',
    'INVEST-01',
    'INVEST-02',
    'RESCUE-01',
    'RESCUE-02',
    'RESCUE-03-VOICE-UNDER-BOARDS',
  ];
  if (
    originalDefinitionIds.some((id) => !definitionIds.includes(id)) ||
    originalInstanceIds.some((id) => !instanceIds.includes(id)) ||
    originalSceneIds.some((id) => !sceneIds.includes(id))
  ) {
    issues.push('MISSING_ORIGINAL_CONTRACT_COVERAGE');
  }

  if (new Set(edition.definitions.map((definition) => definition.template)).size !== 3) {
    issues.push('INVALID_TEMPLATE_COVERAGE');
  }

  const definitionsById = new Map(
    edition.definitions.map((definition) => [definition.definitionId, definition]),
  );
  const scenesById = new Map(edition.scenes.map((scene) => [scene.sceneId, scene]));
  const slotsById = new Map(edition.sourceSlots.map((slot) => [slot.slotId, slot]));

  for (const definition of edition.definitions) {
    if (!locationExists(definition.issuerLocation))
      issues.push(`UNKNOWN_ISSUER_LOCATION:${definition.definitionId}`);
    if (hasDuplicates(definition.sourceSlotIds))
      issues.push(`DUPLICATE_DEFINITION_SOURCE_SLOT:${definition.definitionId}`);
    if (hasDuplicates(definition.sceneIds))
      issues.push(`DUPLICATE_DEFINITION_SCENE:${definition.definitionId}`);
    if (hasDuplicates(definition.prerequisiteDefinitionIds))
      issues.push(`DUPLICATE_PREREQUISITE:${definition.definitionId}`);
    if (definition.prerequisiteDefinitionIds.some((id) => !definitionsById.has(id))) {
      issues.push(`UNKNOWN_PREREQUISITE:${definition.definitionId}`);
    }
    for (const slotId of definition.sourceSlotIds) {
      const slot = slotsById.get(slotId);
      if (!slot || slot.definitionId !== definition.definitionId)
        issues.push(`UNKNOWN_SOURCE_SLOT:${definition.definitionId}:${slotId}`);
    }
    for (const sceneId of definition.sceneIds) {
      const scene = scenesById.get(sceneId);
      if (!scene || scene.definitionId !== definition.definitionId)
        issues.push(`UNKNOWN_SCENE:${definition.definitionId}:${sceneId}`);
    }
  }

  for (const slot of edition.sourceSlots) {
    const owner = definitionsById.get(slot.definitionId);
    if (!owner || !owner.sourceSlotIds.includes(slot.slotId))
      issues.push(`ORPHAN_SOURCE_SLOT:${slot.slotId}`);
  }

  for (const instance of edition.initialInstances) {
    if (!definitionsById.has(instance.definitionId))
      issues.push(`UNKNOWN_INSTANCE_DEFINITION:${instance.instanceId}`);
    for (const alternateDefinitionId of instance.alternateDefinitionIds ?? []) {
      const primary = definitionsById.get(instance.definitionId);
      const alternate = definitionsById.get(alternateDefinitionId);
      if (!alternate) {
        issues.push(`UNKNOWN_ALTERNATE_DEFINITION:${instance.instanceId}:${alternateDefinitionId}`);
      } else if (
        primary &&
        (alternate.template !== primary.template ||
          alternate.issuerRoleId !== primary.issuerRoleId ||
          JSON.stringify(alternate.issuerLocation) !== JSON.stringify(primary.issuerLocation))
      ) {
        issues.push(
          `INCOMPATIBLE_ALTERNATE_DEFINITION:${instance.instanceId}:${alternateDefinitionId}`,
        );
      }
    }
  }
  const instanceCounts = new Map<string, number>();
  for (const instance of edition.initialInstances) {
    for (const definitionId of [instance.definitionId, ...(instance.alternateDefinitionIds ?? [])])
      instanceCounts.set(definitionId, (instanceCounts.get(definitionId) ?? 0) + 1);
  }
  if (
    definitionsById.size !== edition.definitions.length ||
    edition.definitions.some((definition) => instanceCounts.get(definition.definitionId) !== 1) ||
    edition.initialInstances.some((instance) => !definitionsById.has(instance.definitionId))
  ) {
    issues.push('INVALID_INSTANCE_DEFINITION_COVERAGE');
  }

  for (const scene of edition.scenes) {
    const definition = definitionsById.get(scene.definitionId);
    if (!definition || !definition.sceneIds.includes(scene.sceneId))
      issues.push(`UNBOUND_SCENE:${scene.sceneId}`);
    if (!locationExists(scene.venue)) issues.push(`UNKNOWN_SCENE_LOCATION:${scene.sceneId}`);
    const ownedSlots = new Set(definition?.sourceSlotIds ?? []);
    const referencedSlots = new Set(scene.referencedSourceSlotIds);
    for (const slotId of scene.referencedSourceSlotIds) {
      if (!ownedSlots.has(slotId)) issues.push(`UNKNOWN_SCENE_SOURCE:${scene.sceneId}:${slotId}`);
    }
    for (const sceneOutcome of scene.outcomes) {
      const { kind, sourceSlotGroups } = sceneOutcome.gate;
      if (
        (kind === 'ALWAYS' && sourceSlotGroups.length !== 0) ||
        (kind !== 'ALWAYS' &&
          (sourceSlotGroups.length === 0 || sourceSlotGroups.some((group) => group.length === 0)))
      ) {
        issues.push(`INVALID_SCENE_GATE:${scene.sceneId}`);
      }
      if (
        ['ALL_PRESENT', 'ANY_PRESENT', 'ALL_ABSENT', 'ANY_ABSENT'].includes(kind) &&
        sourceSlotGroups.length !== 1
      ) {
        issues.push(`INVALID_SCENE_GATE_GROUPS:${scene.sceneId}`);
      }
      for (const group of sourceSlotGroups) {
        for (const slotId of group) {
          if (!ownedSlots.has(slotId))
            issues.push(`UNKNOWN_GATE_SOURCE:${scene.sceneId}:${slotId}`);
          if (!referencedSlots.has(slotId))
            issues.push(`UNDECLARED_GATE_SOURCE:${scene.sceneId}:${slotId}`);
        }
      }
      if (sceneOutcome.kind === 'CONTINUE') {
        const next = sceneOutcome.nextSceneId
          ? scenesById.get(sceneOutcome.nextSceneId)
          : undefined;
        if (
          !next ||
          next.definitionId !== scene.definitionId ||
          sceneOutcome.unlocksDefinitionId !== undefined
        ) {
          issues.push(`UNKNOWN_NEXT_SCENE:${scene.sceneId}`);
        }
      } else if (sceneOutcome.kind === 'UNLOCK') {
        const unlocked = sceneOutcome.unlocksDefinitionId
          ? definitionsById.get(sceneOutcome.unlocksDefinitionId)
          : undefined;
        if (!unlocked || unlocked.sceneIds.length === 0 || sceneOutcome.nextSceneId !== undefined) {
          issues.push(`UNKNOWN_UNLOCKED_DEFINITION:${scene.sceneId}`);
        }
      } else if (
        sceneOutcome.nextSceneId !== undefined ||
        sceneOutcome.unlocksDefinitionId !== undefined
      ) {
        issues.push(`TERMINAL_SCENE_HAS_NEXT:${scene.sceneId}`);
      }
    }
  }

  const completed = new Set<string>();
  const active = new Set<string>();
  const visitPrerequisites = (definitionId: string): void => {
    if (active.has(definitionId)) {
      issues.push('CYCLIC_PREREQUISITE');
      return;
    }
    if (completed.has(definitionId)) return;
    active.add(definitionId);
    for (const prerequisite of definitionsById.get(definitionId)?.prerequisiteDefinitionIds ?? []) {
      if (definitionsById.has(prerequisite)) visitPrerequisites(prerequisite);
    }
    active.delete(definitionId);
    completed.add(definitionId);
  };
  for (const definitionId of definitionIds) visitPrerequisites(definitionId);

  for (const definition of edition.definitions) {
    const definitionScenes = definition.sceneIds
      .map((sceneId) => scenesById.get(sceneId))
      .filter(
        (scene): scene is ContractScene =>
          scene !== undefined && scene.definitionId === definition.definitionId,
      );
    const incoming = new Set(
      definitionScenes.flatMap((scene) =>
        scene.outcomes
          .filter((outcome) => outcome.kind === 'CONTINUE' && outcome.nextSceneId)
          .map((outcome) => outcome.nextSceneId!),
      ),
    );
    const reachable = new Set<string>();
    const pending = definitionScenes
      .filter((scene) => !incoming.has(scene.sceneId))
      .map((scene) => scene.sceneId);
    const terminalKinds = new Set<string>();
    while (pending.length > 0) {
      const sceneId = pending.pop();
      if (!sceneId || reachable.has(sceneId)) continue;
      reachable.add(sceneId);
      const current = scenesById.get(sceneId);
      for (const sceneOutcome of current?.outcomes ?? []) {
        if (sceneOutcome.kind === 'CONTINUE' && sceneOutcome.nextSceneId)
          pending.push(sceneOutcome.nextSceneId);
        else if (
          sceneOutcome.kind === 'SUCCESS' ||
          sceneOutcome.kind === 'FAILURE' ||
          sceneOutcome.kind === 'PENDING'
        ) {
          terminalKinds.add(sceneOutcome.kind);
        }
      }
    }
    if (
      reachable.size !== definition.sceneIds.length ||
      !terminalKinds.has('SUCCESS') ||
      !(terminalKinds.has('FAILURE') || terminalKinds.has('PENDING'))
    ) {
      issues.push(`UNREACHABLE_OUTCOME_PATH:${definition.definitionId}`);
    }
  }
}

export function validateContractCatalogue(input: unknown): ContractCatalogueValidation {
  if (
    !isRecord(input) ||
    !exactKeys(input, ['schemaVersion', 'worldRegionVersion', 'editions']) ||
    input['schemaVersion'] !== 1 ||
    input['worldRegionVersion'] !== CONTRACT_M1_CATALOGUE.worldRegionVersion ||
    WORLD_REGION_VERSION !== 'w01-authored-fixture-2026-10-01-v3' ||
    !Array.isArray(input['editions']) ||
    !input['editions'].every(editionShape)
  ) {
    return { valid: false, issues: ['INVALID_CATALOGUE_SHAPE_OR_VERSION'] };
  }

  const catalogue = input as unknown as ContractCatalogue;
  const issues: string[] = [];
  addUniqueIssues(
    issues,
    'EDITION',
    catalogue.editions.map((edition) => edition.editionId),
  );
  if (catalogue.editions.length === 0) issues.push('EMPTY_CATALOGUE');
  for (const edition of catalogue.editions) validateEdition(edition, issues);
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}
