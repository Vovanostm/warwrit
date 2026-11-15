import type {
  ContractCatalogue,
  ContractDefinition,
  ContractEdition,
  ContractInstanceBinding,
  ContractLocationReference,
  ContractScene,
  ContractSceneGate,
  ContractSceneOutcome,
  ContractSourceKind,
  ContractSourceSlot,
} from './types.js';

export const CONTRACT_M1_EDITION = 'ct-m1-authored-v1' as const;
const CONTRACT_M1_SOURCE_WORLD_REGION_VERSION = 'w01-authored-fixture-2026-09-28-v1' as const;

const location = (siteId: string, areaId: string): ContractLocationReference => ({
  siteId,
  areaId,
});
const source = (
  slotId: string,
  definitionId: string,
  kind: ContractSourceKind,
): ContractSourceSlot => ({
  slotId,
  definitionId,
  kind,
});
const definition = (
  definitionId: string,
  template: ContractDefinition['template'],
  issuerRoleId: string,
  issuerLocation: ContractLocationReference,
  sourceSlotIds: string[],
  proofKind: ContractDefinition['proofKind'],
  sceneIds: string[],
  sourceLabels: ContractDefinition['sourceLabels'] = ['AUTHORED_DERIVATIVE'],
  prerequisiteDefinitionIds: string[] = [],
): ContractDefinition => ({
  definitionId,
  template,
  issuerRoleId,
  issuerLocation,
  sourceSlotIds,
  proofKind,
  sourceLabels,
  prerequisiteDefinitionIds,
  sceneIds,
});
const binding = (
  instanceId: string,
  definitionId: string,
  alternateDefinitionIds?: readonly string[],
): ContractInstanceBinding => ({
  instanceId,
  definitionId,
  ...(alternateDefinitionIds ? { alternateDefinitionIds } : {}),
  definitionEdition: CONTRACT_M1_EDITION,
  terms: { status: 'UNBOUND' },
});
const gate = (
  kind: ContractSceneGate['kind'],
  ...sourceSlotGroups: string[][]
): ContractSceneGate => ({
  kind,
  sourceSlotGroups,
});
const outcome = (
  kind: ContractSceneOutcome['kind'],
  outcomeGate: ContractSceneGate,
  nextSceneId?: string,
  unlocksDefinitionId?: string,
): ContractSceneOutcome => ({
  kind,
  gate: outcomeGate,
  ...(nextSceneId ? { nextSceneId } : {}),
  ...(unlocksDefinitionId ? { unlocksDefinitionId } : {}),
});
const scene = (
  sceneId: string,
  definitionId: string,
  venue: ContractLocationReference,
  referencedSourceSlotIds: string[],
  outcomes: ContractSceneOutcome[],
): ContractScene => ({ sceneId, definitionId, venue, referencedSourceSlotIds, outcomes });

const millWorkerId = 'ct.m1.mill-worker.v1';
const millBeastId = 'ct.m1.mill-beast.v1';
const roadTracksId = 'ct.m1.road-tracks.v1';
const missingHerbsId = 'ct.m1.missing-herbs.v1';
const cellarRescueId = 'ct.m1.cellar-rescue.v1';
const lostScoutId = 'ct.m1.lost-scout.v1';
const wolfTrailId = 'ct.m1.wolf-trail.v1';
const notOnePackId = 'ct.m1.not-one-pack.v1';
const raiderStandardId = 'ct.m1.raider-standard.v1';
const lightSackMeasureId = 'ct.m1.light-sack.measure-error.v1';
const lightSackDampRyeId = 'ct.m1.light-sack.damp-rye.v1';
const twoReceiptsId = 'ct.m1.two-receipts.v1';
const emptyWatchRecordId = 'ct.m1.empty-watch-record.v1';
const tracksOverTracksKosarsId = 'ct.m1.tracks-over-tracks.kosars.v1';
const tracksOverTracksBanditsId = 'ct.m1.tracks-over-tracks.bandits.v1';
const foulWellId = 'ct.m1.foul-well.v1';

const definitions: readonly ContractDefinition[] = [
  definition(
    millWorkerId,
    'RESCUE',
    'local-village-steward',
    location('severny-dvor', 'severny-dvor-yard'),
    [
      'mill-worker-contract-acceptance',
      'mill-worker-grain-cart-observation',
      'mill-worker-human-report',
      'mill-worker-person-source',
      'mill-worker-living-release',
      'mill-worker-delivery',
      'mill-worker-death-report',
      'mill-worker-known-guilt',
      'mill-worker-lawful-night-threat-observation',
    ],
    'LIVING_PERSON_DELIVERY',
    ['MILL-01', 'MILL-02', 'MILL-03', 'MILL-04'],
    ['ACCEPTED_POLICY', 'PROVISIONAL_LORE', 'AUTHORED_DERIVATIVE'],
  ),
  definition(
    millBeastId,
    'HUNT',
    'local-warning-keeper',
    location('tikhaya-gat', 'tikhaya-gat-bank'),
    ['mill-beast-terminal-source', 'mill-beast-claw-pickup', 'mill-beast-presenter-custody'],
    'UNIQUE_PHYSICAL_TROPHY',
    ['HUNT-01'],
    ['ACCEPTED_POLICY', 'PROVISIONAL_LORE', 'AUTHORED_DERIVATIVE'],
  ),
  definition(
    roadTracksId,
    'INVESTIGATE',
    'city-notice-clerk',
    location('kamenny-brod', 'kamenny-brod-market'),
    ['road-tracks-observation', 'road-tracks-report', 'road-tracks-disproving-observation'],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-01'],
  ),
  definition(
    missingHerbsId,
    'INVESTIGATE',
    'village-provisioner',
    location('bereznyak', 'bereznyak-green'),
    ['missing-herbs-stock-record', 'missing-herbs-trail-observation', 'missing-herbs-report'],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-02'],
  ),
  definition(
    lightSackMeasureId,
    'INVESTIGATE',
    'city-granary-clerk',
    location('kamenny-brod', 'kamenny-brod-market'),
    ['light-sack-measure-clue', 'light-sack-measure-report'],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-03-MEASURE'],
  ),
  definition(
    lightSackDampRyeId,
    'INVESTIGATE',
    'city-granary-clerk',
    location('kamenny-brod', 'kamenny-brod-market'),
    ['light-sack-dry-grain-clue', 'light-sack-wet-sacks-clue', 'light-sack-damp-rye-report'],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-03-DAMP-RYE'],
  ),
  definition(
    twoReceiptsId,
    'INVESTIGATE',
    'woodland-village-caller',
    location('bereznyak', 'bereznyak-green'),
    [
      'two-receipts-smudged-seal',
      'two-receipts-empty-ledger',
      'two-receipts-stolen-badge',
      'two-receipts-reported-to-tikhon',
      'two-receipts-reported-to-both',
    ],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-04-TWO-RECEIPTS'],
  ),
  definition(
    emptyWatchRecordId,
    'INVESTIGATE',
    'city-notice-clerk',
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'empty-watch-log',
      'empty-watch-bridge-witness',
      'empty-watch-refugee-camp',
      'empty-watch-city-marked-sack',
      'empty-watch-prokop-confession',
      'empty-watch-sack-handed-over',
      'empty-watch-proof-destroyed',
      'empty-watch-old-ford-revealed',
    ],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-05-EMPTY-WATCH-RECORD'],
  ),
  definition(
    foulWellId,
    'INVESTIGATE',
    'father-nikon',
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'foul-well-observation',
      'foul-well-aghafya-testimony',
      'foul-well-graves',
      'foul-well-frol-testimony',
      'foul-well-truth-reported',
      'foul-well-aghafya-accused',
    ],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-06-FOUL-WELL'],
  ),
  definition(
    cellarRescueId,
    'RESCUE',
    'river-village-caller',
    location('tikhaya-gat', 'tikhaya-gat-bank'),
    [
      'cellar-captive-source',
      'cellar-captive-living-release',
      'cellar-captive-delivery',
      'cellar-captive-death-report',
    ],
    'LIVING_PERSON_DELIVERY',
    ['RESCUE-01'],
  ),
  definition(
    lostScoutId,
    'RESCUE',
    'city-watch-contact',
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'lost-scout-source',
      'lost-scout-lawful-discovery',
      'lost-scout-living-recovery',
      'lost-scout-delivery',
      'lost-scout-death-report',
    ],
    'LIVING_PERSON_DELIVERY',
    ['RESCUE-02'],
  ),
  definition(
    wolfTrailId,
    'HUNT',
    'woodland-village-caller',
    location('bereznyak', 'bereznyak-green'),
    ['wolf-threat-source', 'wolf-terminal-result', 'wolf-proof-pickup'],
    'SOURCE_BOUND_HUNT_PROOF',
    ['HUNT-02'],
  ),
  definition(
    raiderStandardId,
    'HUNT',
    'city-watch-contact',
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'raider-standard-source',
      'raider-standard-terminal-result',
      'raider-standard-pickup',
      'raider-standard-presenter-custody',
    ],
    'UNIQUE_PHYSICAL_TROPHY',
    ['HUNT-03'],
  ),
  definition(
    notOnePackId,
    'HUNT',
    'woodland-village-caller',
    location('bereznyak', 'bereznyak-green'),
    ['not-one-pack-terminal-result', 'not-one-pack-proof-pickup', 'not-one-pack-presenter-custody'],
    'UNIQUE_PHYSICAL_TROPHY',
    ['HUNT-04'],
    ['ACCEPTED_POLICY', 'PROVISIONAL_LORE', 'AUTHORED_DERIVATIVE'],
  ),
  definition(
    tracksOverTracksKosarsId,
    'INVESTIGATE',
    'city-watch-contact',
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'tracks-over-tracks-kosars-fresh-traces',
      'tracks-over-tracks-kosars-old-stand',
      'tracks-over-tracks-kosars-report',
      'tracks-over-tracks-kosars-no-findings',
    ],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-06-KOSARS'],
    ['ACCEPTED_POLICY', 'PROVISIONAL_LORE', 'AUTHORED_DERIVATIVE'],
  ),
  definition(
    tracksOverTracksBanditsId,
    'INVESTIGATE',
    'city-watch-contact',
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'tracks-over-tracks-bandits-fresh-traces',
      'tracks-over-tracks-bandits-old-stand',
      'tracks-over-tracks-bandits-report',
      'tracks-over-tracks-bandits-no-findings',
    ],
    'ACCESSIBLE_OBSERVATION_SET',
    ['INVEST-06-BANDITS'],
    ['ACCEPTED_POLICY', 'PROVISIONAL_LORE', 'AUTHORED_DERIVATIVE'],
  ),
];

const slots: ContractSourceSlot[] = [
  source('mill-worker-contract-acceptance', millWorkerId, 'ACCEPTANCE'),
  source('mill-worker-grain-cart-observation', millWorkerId, 'OBSERVATION'),
  source('mill-worker-human-report', millWorkerId, 'REPORT'),
  source('mill-worker-person-source', millWorkerId, 'LIVING_PERSON'),
  source('mill-worker-living-release', millWorkerId, 'LIVING_PERSON'),
  source('mill-worker-delivery', millWorkerId, 'LIVING_PERSON'),
  source('mill-worker-death-report', millWorkerId, 'REPORT'),
  source('mill-worker-known-guilt', millWorkerId, 'OBSERVATION'),
  source('mill-worker-lawful-night-threat-observation', millWorkerId, 'OBSERVATION'),
  source('mill-beast-terminal-source', millBeastId, 'TERMINAL_RESULT'),
  source('mill-beast-claw-pickup', millBeastId, 'PHYSICAL_PICKUP'),
  source('mill-beast-presenter-custody', millBeastId, 'PHYSICAL_PICKUP'),
  source('road-tracks-observation', roadTracksId, 'OBSERVATION'),
  source('road-tracks-report', roadTracksId, 'REPORT'),
  source('road-tracks-disproving-observation', roadTracksId, 'OBSERVATION'),
  source('missing-herbs-stock-record', missingHerbsId, 'STOCK_RECORD'),
  source('missing-herbs-trail-observation', missingHerbsId, 'OBSERVATION'),
  source('missing-herbs-report', missingHerbsId, 'REPORT'),
  source('light-sack-measure-clue', lightSackMeasureId, 'OBSERVATION'),
  source('light-sack-dry-grain-clue', lightSackDampRyeId, 'OBSERVATION'),
  source('light-sack-wet-sacks-clue', lightSackDampRyeId, 'OBSERVATION'),
  source('light-sack-measure-report', lightSackMeasureId, 'REPORT'),
  source('light-sack-damp-rye-report', lightSackDampRyeId, 'REPORT'),
  source('two-receipts-smudged-seal', twoReceiptsId, 'OBSERVATION'),
  source('two-receipts-empty-ledger', twoReceiptsId, 'OBSERVATION'),
  source('two-receipts-stolen-badge', twoReceiptsId, 'OBSERVATION'),
  source('two-receipts-reported-to-tikhon', twoReceiptsId, 'REPORT'),
  source('two-receipts-reported-to-both', twoReceiptsId, 'REPORT'),
  source('empty-watch-log', emptyWatchRecordId, 'OBSERVATION'),
  source('empty-watch-bridge-witness', emptyWatchRecordId, 'OBSERVATION'),
  source('empty-watch-refugee-camp', emptyWatchRecordId, 'OBSERVATION'),
  source('empty-watch-city-marked-sack', emptyWatchRecordId, 'OBSERVATION'),
  source('empty-watch-prokop-confession', emptyWatchRecordId, 'OBSERVATION'),
  source('empty-watch-sack-handed-over', emptyWatchRecordId, 'REPORT'),
  source('empty-watch-proof-destroyed', emptyWatchRecordId, 'REPORT'),
  source('empty-watch-old-ford-revealed', emptyWatchRecordId, 'OBSERVATION'),
  source('not-one-pack-terminal-result', notOnePackId, 'TERMINAL_RESULT'),
  source('not-one-pack-proof-pickup', notOnePackId, 'PHYSICAL_PICKUP'),
  source('not-one-pack-presenter-custody', notOnePackId, 'PHYSICAL_PICKUP'),
  source('tracks-over-tracks-kosars-fresh-traces', tracksOverTracksKosarsId, 'OBSERVATION'),
  source('tracks-over-tracks-kosars-old-stand', tracksOverTracksKosarsId, 'OBSERVATION'),
  source('tracks-over-tracks-kosars-report', tracksOverTracksKosarsId, 'REPORT'),
  source('tracks-over-tracks-kosars-no-findings', tracksOverTracksKosarsId, 'REPORT'),
  source('tracks-over-tracks-bandits-fresh-traces', tracksOverTracksBanditsId, 'OBSERVATION'),
  source('tracks-over-tracks-bandits-old-stand', tracksOverTracksBanditsId, 'OBSERVATION'),
  source('tracks-over-tracks-bandits-report', tracksOverTracksBanditsId, 'REPORT'),
  source('tracks-over-tracks-bandits-no-findings', tracksOverTracksBanditsId, 'REPORT'),
  source('foul-well-observation', foulWellId, 'OBSERVATION'),
  source('foul-well-aghafya-testimony', foulWellId, 'OBSERVATION'),
  source('foul-well-graves', foulWellId, 'OBSERVATION'),
  source('foul-well-frol-testimony', foulWellId, 'OBSERVATION'),
  source('foul-well-truth-reported', foulWellId, 'REPORT'),
  source('foul-well-aghafya-accused', foulWellId, 'REPORT'),
  source('cellar-captive-source', cellarRescueId, 'LIVING_PERSON'),
  source('cellar-captive-living-release', cellarRescueId, 'LIVING_PERSON'),
  source('cellar-captive-delivery', cellarRescueId, 'LIVING_PERSON'),
  source('cellar-captive-death-report', cellarRescueId, 'REPORT'),
  source('lost-scout-source', lostScoutId, 'LIVING_PERSON'),
  source('lost-scout-lawful-discovery', lostScoutId, 'DISCOVERY'),
  source('lost-scout-living-recovery', lostScoutId, 'LIVING_PERSON'),
  source('lost-scout-delivery', lostScoutId, 'LIVING_PERSON'),
  source('lost-scout-death-report', lostScoutId, 'REPORT'),
  source('wolf-threat-source', wolfTrailId, 'ENCOUNTER'),
  source('wolf-terminal-result', wolfTrailId, 'TERMINAL_RESULT'),
  source('wolf-proof-pickup', wolfTrailId, 'PHYSICAL_PICKUP'),
  source('raider-standard-source', raiderStandardId, 'ENCOUNTER'),
  source('raider-standard-terminal-result', raiderStandardId, 'TERMINAL_RESULT'),
  source('raider-standard-pickup', raiderStandardId, 'PHYSICAL_PICKUP'),
  source('raider-standard-presenter-custody', raiderStandardId, 'PHYSICAL_PICKUP'),
];

const millWorkerScenes: ContractScene[] = [
  scene(
    'MILL-01',
    millWorkerId,
    location('severny-dvor', 'severny-dvor-yard'),
    ['mill-worker-contract-acceptance'],
    [
      outcome('CONTINUE', gate('ALL_PRESENT', ['mill-worker-contract-acceptance']), 'MILL-02'),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'MILL-02',
    millWorkerId,
    location('staraya-melnitsa', 'staraya-melnitsa-yard'),
    [
      'mill-worker-grain-cart-observation',
      'mill-worker-human-report',
      'mill-worker-lawful-night-threat-observation',
    ],
    [
      outcome(
        'CONTINUE',
        gate('ALL_PRESENT', ['mill-worker-grain-cart-observation', 'mill-worker-human-report']),
        'MILL-03',
      ),
      outcome(
        'UNLOCK',
        gate(
          'ANY_GROUP_PRESENT',
          ['mill-worker-grain-cart-observation', 'mill-worker-human-report'],
          ['mill-worker-lawful-night-threat-observation'],
        ),
        undefined,
        millBeastId,
      ),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'MILL-03',
    millWorkerId,
    location('staraya-melnitsa', 'staraya-melnitsa-yard'),
    ['mill-worker-person-source', 'mill-worker-living-release', 'mill-worker-death-report'],
    [
      outcome('CONTINUE', gate('ALL_PRESENT', ['mill-worker-living-release']), 'MILL-04'),
      outcome('CONTINUE', gate('ALL_PRESENT', ['mill-worker-death-report']), 'MILL-04'),
      outcome(
        'PENDING',
        gate('ALL_ABSENT', ['mill-worker-living-release', 'mill-worker-death-report']),
      ),
    ],
  ),
  scene(
    'MILL-04',
    millWorkerId,
    location('severny-dvor', 'severny-dvor-yard'),
    [
      'mill-worker-grain-cart-observation',
      'mill-worker-human-report',
      'mill-worker-living-release',
      'mill-worker-delivery',
      'mill-worker-death-report',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'mill-worker-grain-cart-observation',
          'mill-worker-human-report',
          'mill-worker-living-release',
          'mill-worker-delivery',
        ]),
      ),
      outcome('FAILURE', gate('ALL_PRESENT', ['mill-worker-death-report'])),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
];

const standaloneScenes: ContractScene[] = [
  scene(
    'HUNT-01',
    millBeastId,
    location('staraya-melnitsa', 'staraya-melnitsa-yard'),
    ['mill-beast-terminal-source', 'mill-beast-claw-pickup', 'mill-beast-presenter-custody'],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'mill-beast-terminal-source',
          'mill-beast-claw-pickup',
          'mill-beast-presenter-custody',
        ]),
      ),
      outcome(
        'PENDING',
        gate('ANY_ABSENT', [
          'mill-beast-terminal-source',
          'mill-beast-claw-pickup',
          'mill-beast-presenter-custody',
        ]),
      ),
    ],
  ),
  scene(
    'INVEST-01',
    roadTracksId,
    location('tikhaya-gat', 'tikhaya-gat-bank'),
    ['road-tracks-observation', 'road-tracks-report', 'road-tracks-disproving-observation'],
    [
      outcome('SUCCESS', gate('ALL_PRESENT', ['road-tracks-observation', 'road-tracks-report'])),
      outcome('FAILURE', gate('ALL_PRESENT', ['road-tracks-disproving-observation'])),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'INVEST-02',
    missingHerbsId,
    location('bereznyak', 'bereznyak-green'),
    ['missing-herbs-stock-record', 'missing-herbs-trail-observation', 'missing-herbs-report'],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'missing-herbs-stock-record',
          'missing-herbs-trail-observation',
          'missing-herbs-report',
        ]),
      ),
      outcome(
        'PENDING',
        gate('ANY_ABSENT', [
          'missing-herbs-stock-record',
          'missing-herbs-trail-observation',
          'missing-herbs-report',
        ]),
      ),
    ],
  ),
  scene(
    'INVEST-03-MEASURE',
    lightSackMeasureId,
    location('severny-dvor', 'severny-dvor-yard'),
    ['light-sack-measure-clue', 'light-sack-measure-report'],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', ['light-sack-measure-clue', 'light-sack-measure-report']),
      ),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'INVEST-03-DAMP-RYE',
    lightSackDampRyeId,
    location('severny-dvor', 'severny-dvor-yard'),
    ['light-sack-dry-grain-clue', 'light-sack-wet-sacks-clue', 'light-sack-damp-rye-report'],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'light-sack-dry-grain-clue',
          'light-sack-wet-sacks-clue',
          'light-sack-damp-rye-report',
        ]),
      ),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'INVEST-04-TWO-RECEIPTS',
    twoReceiptsId,
    location('bereznyak', 'bereznyak-green'),
    [
      'two-receipts-smudged-seal',
      'two-receipts-empty-ledger',
      'two-receipts-stolen-badge',
      'two-receipts-reported-to-tikhon',
      'two-receipts-reported-to-both',
    ],
    [
      outcome('SUCCESS', {
        kind: 'ANY_PRESENT',
        sourceSlotGroups: [['two-receipts-reported-to-tikhon', 'two-receipts-reported-to-both']],
      }),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'INVEST-05-EMPTY-WATCH-RECORD',
    emptyWatchRecordId,
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'empty-watch-log',
      'empty-watch-bridge-witness',
      'empty-watch-refugee-camp',
      'empty-watch-city-marked-sack',
      'empty-watch-prokop-confession',
      'empty-watch-sack-handed-over',
      'empty-watch-proof-destroyed',
      'empty-watch-old-ford-revealed',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ANY_PRESENT', ['empty-watch-sack-handed-over', 'empty-watch-proof-destroyed']),
      ),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'INVEST-06-FOUL-WELL',
    foulWellId,
    location('bereznyak', 'bereznyak-green'),
    [
      'foul-well-observation',
      'foul-well-aghafya-testimony',
      'foul-well-graves',
      'foul-well-frol-testimony',
      'foul-well-truth-reported',
      'foul-well-aghafya-accused',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ANY_PRESENT', ['foul-well-truth-reported', 'foul-well-aghafya-accused']),
      ),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'RESCUE-01',
    cellarRescueId,
    location('staraya-melnitsa', 'staraya-melnitsa-yard'),
    [
      'cellar-captive-source',
      'cellar-captive-living-release',
      'cellar-captive-delivery',
      'cellar-captive-death-report',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'cellar-captive-source',
          'cellar-captive-living-release',
          'cellar-captive-delivery',
        ]),
      ),
      outcome('FAILURE', gate('ALL_PRESENT', ['cellar-captive-death-report'])),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'RESCUE-02',
    lostScoutId,
    location('tikhaya-gat', 'tikhaya-gat-bank'),
    [
      'lost-scout-source',
      'lost-scout-lawful-discovery',
      'lost-scout-living-recovery',
      'lost-scout-delivery',
      'lost-scout-death-report',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'lost-scout-source',
          'lost-scout-lawful-discovery',
          'lost-scout-living-recovery',
          'lost-scout-delivery',
        ]),
      ),
      outcome('FAILURE', gate('ALL_PRESENT', ['lost-scout-death-report'])),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'HUNT-02',
    wolfTrailId,
    location('bereznyak', 'bereznyak-green'),
    ['wolf-threat-source', 'wolf-terminal-result', 'wolf-proof-pickup'],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', ['wolf-threat-source', 'wolf-terminal-result', 'wolf-proof-pickup']),
      ),
      outcome(
        'PENDING',
        gate('ANY_ABSENT', ['wolf-threat-source', 'wolf-terminal-result', 'wolf-proof-pickup']),
      ),
    ],
  ),
  scene(
    'HUNT-03',
    raiderStandardId,
    location('staraya-melnitsa', 'staraya-melnitsa-yard'),
    [
      'raider-standard-source',
      'raider-standard-terminal-result',
      'raider-standard-pickup',
      'raider-standard-presenter-custody',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'raider-standard-source',
          'raider-standard-terminal-result',
          'raider-standard-pickup',
          'raider-standard-presenter-custody',
        ]),
      ),
      outcome(
        'PENDING',
        gate('ANY_ABSENT', [
          'raider-standard-source',
          'raider-standard-terminal-result',
          'raider-standard-pickup',
          'raider-standard-presenter-custody',
        ]),
      ),
    ],
  ),
  scene(
    'HUNT-04',
    notOnePackId,
    location('tikhaya-gat', 'tikhaya-gat-bank'),
    ['not-one-pack-terminal-result', 'not-one-pack-proof-pickup', 'not-one-pack-presenter-custody'],
    [
      outcome(
        'SUCCESS',
        gate('ALL_PRESENT', [
          'not-one-pack-terminal-result',
          'not-one-pack-proof-pickup',
          'not-one-pack-presenter-custody',
        ]),
      ),
      outcome(
        'PENDING',
        gate('ANY_ABSENT', [
          'not-one-pack-terminal-result',
          'not-one-pack-proof-pickup',
          'not-one-pack-presenter-custody',
        ]),
      ),
    ],
  ),
  scene(
    'INVEST-06-KOSARS',
    tracksOverTracksKosarsId,
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'tracks-over-tracks-kosars-fresh-traces',
      'tracks-over-tracks-kosars-old-stand',
      'tracks-over-tracks-kosars-report',
      'tracks-over-tracks-kosars-no-findings',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ANY_PRESENT', [
          'tracks-over-tracks-kosars-report',
          'tracks-over-tracks-kosars-no-findings',
        ]),
      ),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
  scene(
    'INVEST-06-BANDITS',
    tracksOverTracksBanditsId,
    location('kamenny-brod', 'kamenny-brod-market'),
    [
      'tracks-over-tracks-bandits-fresh-traces',
      'tracks-over-tracks-bandits-old-stand',
      'tracks-over-tracks-bandits-report',
      'tracks-over-tracks-bandits-no-findings',
    ],
    [
      outcome(
        'SUCCESS',
        gate('ANY_PRESENT', [
          'tracks-over-tracks-bandits-report',
          'tracks-over-tracks-bandits-no-findings',
        ]),
      ),
      outcome('PENDING', gate('ALWAYS')),
    ],
  ),
];

const editionDraft: ContractEdition = {
  editionId: CONTRACT_M1_EDITION,
  definitions,
  initialInstances: [
    binding('ci.m1.mill-worker.01', millWorkerId),
    binding('ci.m1.mill-beast.01', millBeastId),
    binding('ci.m1.road-tracks.01', roadTracksId),
    binding('ci.m1.missing-herbs.01', missingHerbsId),
    binding('ci.m1.light-sack.01', lightSackMeasureId, [lightSackDampRyeId]),
    binding('ci.m1.two-receipts.01', twoReceiptsId),
    binding('ci.m1.empty-watch-record.01', emptyWatchRecordId),
    binding('ci.m1.foul-well.01', foulWellId),
    binding('ci.m1.cellar-rescue.01', cellarRescueId),
    binding('ci.m1.lost-scout.01', lostScoutId),
    binding('ci.m1.wolf-trail.01', wolfTrailId),
    binding('ci.m1.raider-standard.01', raiderStandardId),
    binding('ci.m1.not-one-pack.01', notOnePackId),
    binding('ci.m1.tracks-over-tracks.01', tracksOverTracksKosarsId, [tracksOverTracksBanditsId]),
  ],
  scenes: [...millWorkerScenes, ...standaloneScenes],
  sourceSlots: slots,
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const CONTRACT_M1_CATALOGUE: ContractCatalogue = deepFreeze({
  schemaVersion: 1,
  worldRegionVersion: CONTRACT_M1_SOURCE_WORLD_REGION_VERSION,
  editions: [editionDraft],
});
