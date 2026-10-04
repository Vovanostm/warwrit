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
};

export interface ContractVisit {
  readonly siteId: string;
  readonly building: BuildingType;
}

export interface ContractVisitProps {
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
  if (action === 'ASK' || action === 'REPORT' || action === 'DELIVER')
    return issuerBuilding(instanceId);
  return undefined;
}
