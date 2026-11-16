import type { WorldLabGroupKind } from '@warwrit/protocol';

export type MapIconName =
  | 'company'
  | 'patrol'
  | 'bandits'
  | 'wildlife'
  | 'creature'
  | 'village'
  | 'house'
  | 'town'
  | 'bridge'
  | 'mill'
  | 'ruins'
  | 'watchtower'
  | 'burial'
  | 'camp'
  | 'barn'
  | 'wagon'
  | 'marsh'
  | 'wood'
  | 'quarry'
  | 'boat'
  | 'pottery'
  | 'livestock'
  | 'forge'
  | 'water';

const mapIconNames: ReadonlySet<string> = new Set([
  'company',
  'patrol',
  'bandits',
  'wildlife',
  'creature',
  'village',
  'house',
  'town',
  'bridge',
  'mill',
  'ruins',
  'watchtower',
  'burial',
  'camp',
  'barn',
  'wagon',
  'marsh',
  'wood',
  'quarry',
  'boat',
  'pottery',
  'livestock',
  'forge',
  'water',
]);

const partyIcons: Readonly<Record<WorldLabGroupKind, MapIconName>> = {
  PLAYER: 'company',
  PATROL: 'patrol',
  BANDITS: 'bandits',
  WILDLIFE: 'wildlife',
  CREATURE: 'creature',
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const sprite = new URL('../../assets/art/world/map-icons-v1/icons.svg', import.meta.url).href;

export function mapIconHref(name: MapIconName): string {
  return `${sprite}#${name}`;
}

export function isMapIconName(value: string): value is MapIconName {
  return mapIconNames.has(value);
}

export function partyIconName(kind: WorldLabGroupKind): MapIconName {
  return partyIcons[kind];
}

/** The surrounding marker owns hit testing, identity and input. */
export function createMapIcon(name: MapIconName, size: number): SVGUseElement {
  const icon = document.createElementNS(SVG_NS, 'use');
  icon.classList.add('map-icon');
  icon.dataset['icon'] = name;
  icon.setAttribute('href', mapIconHref(name));
  icon.setAttribute('x', String(-size / 2));
  icon.setAttribute('y', String(-size / 2));
  icon.setAttribute('width', String(size));
  icon.setAttribute('height', String(size));
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

export function createPartyKey(kind: WorldLabGroupKind): SVGSVGElement {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.classList.add('group-key');
  icon.dataset['kind'] = kind;
  icon.setAttribute('viewBox', '-16 -16 32 32');
  icon.setAttribute('aria-hidden', 'true');
  icon.append(createMapIcon(partyIconName(kind), 28));
  return icon;
}
