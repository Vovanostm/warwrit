/**
 * Battle and map art in the approved ink style (ADR-0006, 2026-10-02). Licence records live in
 * `assets/manifest.json`; every image here is Codex-generated original work.
 */
import groundGrass from '../../../../assets/art/m1/battle/ground-grass.png';
import groundMud from '../../../../assets/art/m1/battle/ground-mud.png';
import rubble from '../../../../assets/art/m1/battle/obstacle-rubble.png';
import mercSpear from '../../../../assets/art/m1/battle/unit-merc-spear.png';
import mercSword from '../../../../assets/art/m1/battle/unit-merc-sword.png';
import raiderAxe from '../../../../assets/art/m1/battle/unit-raider-axe.png';
import raiderBow from '../../../../assets/art/m1/battle/unit-raider-bow.png';
import raiderGreatsword from '../../../../assets/art/m1/battle/unit-raider-greatsword.png';
import raiderSpear from '../../../../assets/art/m1/battle/unit-raider-spear.png';
import millBeast from '../../../../assets/art/m1/battle/unit-mill-beast.png';
import wolf from '../../../../assets/art/m1/battle/unit-wolf.png';
import forestClump from '../../../../assets/art/m1/map/forest-clump.png';
import groundLand from '../../../../assets/art/m1/map/ground-land.png';
import partyBanner from '../../../../assets/art/m1/map/party-banner.png';
import siteCity from '../../../../assets/art/m1/map/site-city.png';
import siteFarmstead from '../../../../assets/art/m1/map/site-farmstead.png';
import siteMill from '../../../../assets/art/m1/map/site-mill.png';
import siteRiverVillage from '../../../../assets/art/m1/map/site-river-village.png';
import siteVillage from '../../../../assets/art/m1/map/site-village.png';
import placeBereznyak from '../../../../assets/art/m1/places/bereznyak.png';
import placeCamp from '../../../../assets/art/m1/places/camp.png';
import placeKamennyBrod from '../../../../assets/art/m1/places/kamenny-brod.png';
import placeSevernyDvor from '../../../../assets/art/m1/places/severny-dvor.png';
import placeStarayaMelnitsa from '../../../../assets/art/m1/places/staraya-melnitsa.png';
import placeTikhayaGat from '../../../../assets/art/m1/places/tikhaya-gat.png';

export type UnitRole = 'ours' | 'ally' | 'hostile';

interface Sprite {
  readonly url: string;
  /** The way the figure faces in the source image. */
  readonly facing: 'LEFT' | 'RIGHT';
}

export const BATTLE_ART = {
  groundField: groundMud,
  groundOuter: groundGrass,
  rubble,
} as const;

const MERCENARIES: readonly Sprite[] = [
  { url: mercSword, facing: 'RIGHT' },
  { url: mercSpear, facing: 'RIGHT' },
];

const AXE_RAIDER: Sprite = { url: raiderAxe, facing: 'LEFT' };

/** Authored hostiles by public unit id; unknown hostiles share the axe raider. */
const HOSTILES: Readonly<Record<string, Sprite>> = {
  'world.raider.old-mill.front.01': AXE_RAIDER,
  'world.raider.old-mill.bow.01': { url: raiderBow, facing: 'LEFT' },
  'world.raider.old-mill.heavy.01': { url: raiderGreatsword, facing: 'LEFT' },
};

/** Hostile kinds recognised by id prefix (wolves, the mill beast, spare raiders). */
function hostileByKind(unitId: string): Sprite | undefined {
  if (unitId.startsWith('world.wolf.')) return { url: wolf, facing: 'LEFT' };
  if (unitId.startsWith('world.beast.')) return { url: millBeast, facing: 'LEFT' };
  if (unitId.startsWith('world.raider.') && unitId.includes('spear'))
    return { url: raiderSpear, facing: 'LEFT' };
  return undefined;
}

function stableIndex(id: string, modulo: number): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % modulo;
}

export function unitSprite(unitId: string, role: UnitRole): Sprite {
  if (role === 'hostile') return HOSTILES[unitId] ?? hostileByKind(unitId) ?? AXE_RAIDER;
  return MERCENARIES[stableIndex(unitId, MERCENARIES.length)]!;
}

export const MAP_ART = {
  ground: groundLand,
  forest: forestClump,
  party: partyBanner,
} as const;

/** Authored W01 settlements by site id; unknown sites fall back to their public kind. */
const SITES: Readonly<Record<string, string>> = {
  'kamenny-brod': siteCity,
  bereznyak: siteVillage,
  'tikhaya-gat': siteRiverVillage,
  'severny-dvor': siteFarmstead,
  'staraya-melnitsa': siteMill,
};

export function siteSprite(siteId: string, kind: 'CITY' | 'VILLAGE' | 'LANDMARK'): string {
  return (
    SITES[siteId] ?? (kind === 'CITY' ? siteCity : kind === 'LANDMARK' ? siteMill : siteVillage)
  );
}

const PLACES: Readonly<Record<string, string>> = {
  'kamenny-brod': placeKamennyBrod,
  bereznyak: placeBereznyak,
  'tikhaya-gat': placeTikhayaGat,
  'severny-dvor': placeSevernyDvor,
  'staraya-melnitsa': placeStarayaMelnitsa,
};

/** Header illustration for a settlement, or the field camp. */
export function placeIllustration(siteId: string | 'camp'): string | undefined {
  return siteId === 'camp' ? placeCamp : PLACES[siteId];
}
