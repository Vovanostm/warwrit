import type { OrdinaryContractDto } from '@warwrit/protocol';
import { lookup } from '../i18n/index.js';
import { BUILDINGS, type BuildingType } from './place-buildings.js';

/** Authored meeting points inside the existing canonical issuer areas. */
const ISSUER_BUILDINGS: Readonly<Record<string, BuildingType>> = {
  'ci.m1.road-tracks.01': 'market',
  'ci.m1.missing-herbs.01': 'herbalist',
  'ci.m1.cellar-rescue.01': 'inn',
  'ci.m1.lost-scout.01': 'watch',
  'ci.m1.mill-worker.01': 'elder',
  'ci.m1.raider-standard.01': 'watch',
  'ci.m1.wolf-trail.01': 'elder',
  'ci.m1.mill-beast.01': 'inn',
  'ci.m1.light-sack.01': 'market',
};

export interface ContractVisit {
  readonly siteId: string;
  readonly building: BuildingType;
}

export interface ContractPlaceFact {
  readonly instanceId: string;
  readonly siteId: string;
  readonly text: string;
}

/** Authored completion line, if any: `contract.<id>.done`. */
const completedFact = (instanceId: string) => lookup(`contract.${instanceId}.done`);

/** Only established, company-known completion; never general prosperity or a new witness. */
export function contractPlaceFacts(contracts: readonly OrdinaryContractDto[]): ContractPlaceFact[] {
  return contracts.flatMap((contract) => {
    const facts: ContractPlaceFact[] = [];
    const completion = completedFact(contract.instanceId);
    if (
      contract.yourRole !== 'NONE' &&
      contract.state === 'COMPLETED' &&
      completion !== undefined
    ) {
      facts.push({
        instanceId: contract.instanceId,
        siteId: contract.issuerLocation.siteId,
        text: completion,
      });
    }
    if (contract.publicConsequences?.kind === 'EMPTY_WATCH_RECORD') {
      const { refugeeCamp, watchman } = contract.publicConsequences;
      const campKey =
        refugeeCamp === 'REMOVED'
          ? 'contract.ci.m1.empty-watch-record.01.world.camp-removed'
          : 'contract.ci.m1.empty-watch-record.01.world.camp-present';
      const watchmanKey =
        watchman === 'IN_CUSTODY'
          ? 'contract.ci.m1.empty-watch-record.01.world.watchman-in-custody'
          : 'contract.ci.m1.empty-watch-record.01.world.watchman-on-duty';
      const camp = lookup(campKey);
      const watchmanText = lookup(watchmanKey);
      if (camp !== undefined)
        facts.push({
          instanceId: `${contract.instanceId}:camp`,
          siteId: contract.issuerLocation.siteId,
          text: camp,
        });
      if (watchmanText !== undefined)
        facts.push({
          instanceId: `${contract.instanceId}:watchman`,
          siteId: contract.issuerLocation.siteId,
          text: watchmanText,
        });
    }
    return facts;
  });
}

export interface ContractVisitProps {
  readonly onPlaceFacts?: (facts: readonly ContractPlaceFact[]) => void;
  readonly visit: ContractVisit | null;
  readonly canVisit: boolean;
  readonly onVisitIssuer: (siteId: string, building: BuildingType) => void;
  readonly onJournal: () => void;
}

export function issuerBuilding(instanceId: string): BuildingType | undefined {
  return ISSUER_BUILDINGS[instanceId];
}

export function issuerVenue(instanceId: string): string {
  const building = issuerBuilding(instanceId);
  return building === 'market'
    ? 'Доска заказов на базаре'
    : building
      ? BUILDINGS[building].name
      : 'Заказчик';
}

export function visitingIssuer(visit: ContractVisit | null, instanceId: string, siteId: string) {
  return visit?.siteId === siteId && visit.building === issuerBuilding(instanceId);
}

export function oldMillVisit(visit: ContractVisit, objectiveSiteId: string) {
  if (objectiveSiteId !== 'staraya-melnitsa') return false;
  return visit.siteId === objectiveSiteId && visit.building === 'mill';
}

/** Conversations and hand-ins use a meeting point; field work stays at its real site. */
export function ordinaryStepVenue(instanceId: string, action: string, stepId: string) {
  if (stepId === 'ask-keeper') return 'inn';
  if (
    instanceId === 'ci.m1.empty-watch-record.01' &&
    [
      'ask-bridge-watchman',
      'find-camp',
      'inspect-sack',
      'ask-prokop',
      'throw-sack-in-river',
    ].includes(stepId)
  )
    return 'watch';
  if (instanceId === 'ci.m1.light-sack.01' && stepId === 'inspect-granary') return 'granary';
  if (instanceId === 'ci.m1.light-sack.01' && stepId === 'ask-gate') return 'watch';
  if (action === 'ASK' || action === 'REPORT' || action === 'DELIVER')
    return issuerBuilding(instanceId);
  return undefined;
}
