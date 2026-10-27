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

const partyIcons: Readonly<Record<WorldLabGroupKind, MapIconName>> = {
  PLAYER: 'company',
  PATROL: 'patrol',
  BANDITS: 'bandits',
  WILDLIFE: 'wildlife',
  CREATURE: 'creature',
};
// Presentation only: established atlas identities, never inferred from translated labels.
const siteIcons: Readonly<Record<string, MapIconName>> = {
  bereznyak: 'village',
  'severny-dvor': 'barn',
  'kamenny-brod': 'town',
  'tikhaya-gat': 'village',
  'staraya-melnitsa': 'mill',
  'porechye-atlas-site-06': 'bridge',
  'porechye-atlas-site-07': 'ruins',
  'porechye-atlas-site-08': 'patrol',
  'porechye-atlas-site-09': 'burial',
  'porechye-atlas-site-10': 'water',
  'porechye-atlas-site-11': 'camp',
  'porechye-atlas-site-12': 'camp',
  'porechye-atlas-site-13': 'watchtower',
  'porechye-atlas-site-14': 'barn',
  'porechye-atlas-site-15': 'house',
  'porechye-atlas-site-16': 'livestock',
  'porechye-atlas-site-17': 'marsh',
  'porechye-atlas-site-18': 'bridge',
  'porechye-atlas-site-19': 'wood',
  'porechye-atlas-site-20': 'quarry',
  'porechye-atlas-site-21': 'boat',
  'porechye-atlas-site-22': 'marsh',
  'porechye-atlas-site-23': 'house',
  'porechye-atlas-site-24': 'wood',
  'porechye-atlas-site-25': 'pottery',
  'porechye-atlas-site-26': 'wood',
  'porechye-atlas-site-27': 'wildlife',
  'porechye-atlas-site-28': 'quarry',
  'porechye-atlas-site-29': 'house',
  'porechye-atlas-site-30': 'livestock',
  'porechye-atlas-site-31': 'wagon',
  'porechye-atlas-site-32': 'watchtower',
  'porechye-atlas-site-33': 'water',
  'porechye-atlas-site-34': 'forge',
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const sprite = new URL('../../assets/art/world/map-icons-v1/icons.svg', import.meta.url).href;

export function partyIconName(kind: WorldLabGroupKind): MapIconName {
  return partyIcons[kind];
}

export function siteIconName(siteId: string): MapIconName {
  const name = siteIcons[siteId];
  if (!name) throw new RangeError(`Missing atlas icon: ${siteId}`);
  return name;
}

/** The surrounding marker owns hit testing, identity and input. */
export function createMapIcon(name: MapIconName, size: number): SVGUseElement {
  const icon = document.createElementNS(SVG_NS, 'use');
  icon.classList.add('map-icon');
  icon.dataset['icon'] = name;
  icon.setAttribute('href', `${sprite}#${name}`);
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
