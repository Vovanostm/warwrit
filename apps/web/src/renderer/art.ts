/**
 * Battle and map art in the approved ink style (ADR-0006, 2026-10-02). Licence records live in
 * `assets/manifest.json`; every image here is Codex-generated original work.
 */
import worldGrass from '../../../../assets/art/m1/world-v2/grass-meadow.png';
import worldWoodland from '../../../../assets/art/m1/world-v2/woodland.png';
import worldHills from '../../../../assets/art/m1/world-v2/hills.png';
import worldMarsh from '../../../../assets/art/m1/world-v2/marsh.png';
import worldRiverbank from '../../../../assets/art/m1/world-v2/riverbank.png';
import worldRock from '../../../../assets/art/m1/world-v2/rock.png';
import roadTrail from '../../../../assets/art/m1/roads-v1/trail.png';
import roadDirt from '../../../../assets/art/m1/roads-v1/dirt.png';
import roadPaved from '../../../../assets/art/m1/roads-v1/paved.png';
import worldWater from '../../../../assets/art/m1/world-v2/water.png';
import worldDeciduous from '../../../../assets/art/m1/trees-v1/deciduous.png';
import worldConifer from '../../../../assets/art/m1/trees-v1/conifer.png';
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
  terrainLayers: {
    grass: worldGrass,
    woodland: worldWoodland,
    hills: worldHills,
    marsh: worldMarsh,
    riverbank: worldRiverbank,
    rock: worldRock,
    water: worldWater,
  },
  roads: { trail: roadTrail, dirt_road: roadDirt, paved_road: roadPaved },
  // Measured source aspect/root pixels; provenance records the read-only alpha measurement.
  trees: {
    deciduous: { url: worldDeciduous, aspect: 1, rootX: 0.484645, foot: 0.869617 },
    conifer: { url: worldConifer, aspect: 1, rootX: 0.555735, foot: 0.877592 },
  },
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
