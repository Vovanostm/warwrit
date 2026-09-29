import { describe, expect, it } from 'vitest';
import {
  bindContractInstance,
  CONTRACT_M1_CATALOGUE,
  definitionFor,
  validateContractCatalogue,
  type ContractCatalogue,
  type ContractDefinition,
} from '@warwrit/game-core';

interface MutableDefinition {
  definitionId: string;
  template: string;
  issuerLocation: { siteId: string; areaId: string };
  prerequisiteDefinitionIds: string[];
  sceneIds: string[];
  sourceSlotIds: string[];
  sourceLabels: string[];
  issuerRoleId: string;
  proofKind: string;
}

interface MutableScene {
  sceneId: string;
  venue: { siteId: string; areaId: string };
  referencedSourceSlotIds: string[];
  outcomes: Array<{
    kind: string;
    gate: { kind: string; sourceSlotGroups: string[][] };
    nextSceneId?: string;
    unlocksDefinitionId?: string;
  }>;
}

interface MutableEdition {
  editionId: string;
  definitions: MutableDefinition[];
  initialInstances: Array<{
    instanceId: string;
    definitionId: string;
    definitionEdition: string;
    terms: { status: string };
  }>;
  scenes: MutableScene[];
  sourceSlots: Array<{ slotId: string; definitionId: string; kind: unknown }>;
}

interface MutableCatalogue {
  schemaVersion: number;
  worldRegionVersion: string;
  editions: MutableEdition[];
}

function mutableCatalogue(): MutableCatalogue {
  return structuredClone(CONTRACT_M1_CATALOGUE) as unknown as MutableCatalogue;
}

describe('M1 contract catalogue', () => {
  it('validates its authored edition and pins each initial instance to an immutable definition edition', () => {
    expect(validateContractCatalogue(CONTRACT_M1_CATALOGUE)).toEqual({ valid: true, issues: [] });

    const original = bindContractInstance('ct-m1-authored-v1', 'ci.m1.mill-worker.01');
    expect(original?.definitionId).toBe('ct.m1.mill-worker.v1');
    expect(original?.definitionEdition).toBe('ct-m1-authored-v1');
    expect(Object.isFrozen(original?.definition)).toBe(true);
    expect(Object.isFrozen(original?.definition.issuerLocation)).toBe(true);

    const future = mutableCatalogue();
    const nextEdition: MutableEdition = structuredClone(future.editions[0]!);
    nextEdition.editionId = 'ct-m1-authored-v2';
    nextEdition.initialInstances = [];
    for (const instance of future.editions[0]!.initialInstances) {
      const newer = structuredClone(instance);
      newer.definitionEdition = nextEdition.editionId;
      nextEdition.initialInstances.push(newer);
    }
    nextEdition.definitions[0]!.issuerRoleId = 'later-edition-role';
    future.editions.push(nextEdition);

    const catalogue = future as unknown as ContractCatalogue;
    expect(
      definitionFor('ct-m1-authored-v2', 'ct.m1.mill-worker.v1', catalogue)?.issuerRoleId,
    ).toBe('later-edition-role');
    expect(bindContractInstance('ct-m1-authored-v1', 'ci.m1.mill-worker.01', catalogue)).toEqual(
      original,
    );
    expect((original?.definition as ContractDefinition).issuerRoleId).toBe('local-village-steward');
  });

  it('rejects malformed references, duplicated identities, prerequisite cycles and unreachable outcomes', () => {
    const cases: Array<[string, (catalogue: MutableCatalogue) => void, string]> = [
      [
        'duplicate definition',
        (catalogue) => {
          catalogue.editions[0]!.definitions[1]!.definitionId =
            catalogue.editions[0]!.definitions[0]!.definitionId;
        },
        'DUPLICATE_DEFINITION_ID',
      ],
      [
        'non-string enum value',
        (catalogue) => {
          catalogue.editions[0]!.sourceSlots[0]!.kind = ['OBSERVATION'];
        },
        'INVALID_CATALOGUE_SHAPE_OR_VERSION',
      ],
      [
        'duplicate initial definition coverage',
        (catalogue) => {
          catalogue.editions[0]!.initialInstances[1]!.definitionId =
            catalogue.editions[0]!.initialInstances[0]!.definitionId;
        },
        'INVALID_INSTANCE_DEFINITION_COVERAGE',
      ],
      [
        'wrong site and area pair',
        (catalogue) => {
          catalogue.editions[0]!.scenes[0]!.venue = {
            siteId: 'bereznyak',
            areaId: 'kamenny-brod-market',
          };
        },
        'UNKNOWN_SCENE_LOCATION:MILL-01',
      ],
      [
        'unknown scene reference',
        (catalogue) => {
          catalogue.editions[0]!.definitions[0]!.sceneIds[0] = 'MILL-MISSING';
        },
        'UNKNOWN_SCENE:ct.m1.mill-worker.v1:MILL-MISSING',
      ],
      [
        'unknown source gate',
        (catalogue) => {
          catalogue.editions[0]!.scenes[0]!.referencedSourceSlotIds.push('invented-witness');
        },
        'UNKNOWN_SCENE_SOURCE:MILL-01:invented-witness',
      ],
      [
        'cyclic prerequisites',
        (catalogue) => {
          const definition = catalogue.editions[0]!.definitions[0]!;
          definition.prerequisiteDefinitionIds.push(definition.definitionId);
        },
        'CYCLIC_PREREQUISITE',
      ],
      [
        'unreachable success branch',
        (catalogue) => {
          const hunt = catalogue.editions[0]!.scenes.find((scene) => scene.sceneId === 'HUNT-02')!;
          hunt.outcomes.find((outcome) => outcome.kind === 'SUCCESS')!.kind = 'PENDING';
        },
        'UNREACHABLE_OUTCOME_PATH:ct.m1.wolf-trail.v1',
      ],
    ];

    for (const [name, corrupt, issue] of cases) {
      const catalogue = mutableCatalogue();
      corrupt(catalogue);
      const result = validateContractCatalogue(catalogue);
      expect(result.valid, name).toBe(false);
      expect(result.issues, name).toContain(issue);
    }

    const unsupported = mutableCatalogue();
    unsupported.editions[0]!.definitions[0]!.template = 'ESCORT';
    expect(validateContractCatalogue(unsupported).issues).toContain(
      'INVALID_CATALOGUE_SHAPE_OR_VERSION',
    );
  });

  it('keeps incomplete proof pending and requires actual negative observation evidence', () => {
    const edition = CONTRACT_M1_CATALOGUE.editions[0]!;
    for (const sceneId of ['HUNT-01', 'HUNT-02', 'HUNT-03', 'INVEST-02']) {
      const scene = edition.scenes.find((entry) => entry.sceneId === sceneId)!;
      expect(
        scene.outcomes.some((entry) => entry.kind === 'FAILURE'),
        sceneId,
      ).toBe(false);
      expect(scene.outcomes.find((entry) => entry.kind === 'PENDING')?.gate.kind, sceneId).toBe(
        'ANY_ABSENT',
      );
    }

    const tracks = edition.scenes.find((entry) => entry.sceneId === 'INVEST-01')!;
    const failure = tracks.outcomes.find((entry) => entry.kind === 'FAILURE');
    expect(tracks.outcomes.find((entry) => entry.kind === 'PENDING')?.gate.kind).toBe('ALWAYS');
    expect(failure?.gate.kind).toBe('ALL_PRESENT');
    expect(failure?.gate.sourceSlotGroups.flat()).toContain('road-tracks-disproving-observation');
    expect(failure?.gate.kind).not.toBe('ALL_ABSENT');
  });
});
