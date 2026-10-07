import darkCity from '../../../../assets/art/m1/map-dark/city-v4.png';
import darkVillage from '../../../../assets/art/m1/map-dark/village-v1.png';
import darkRiverVillage from '../../../../assets/art/m1/map-dark/river-village-v1.png';
import darkFarmstead from '../../../../assets/art/m1/map-dark/farmstead-v4.png';
import darkMill from '../../../../assets/art/m1/map-dark/mill-v1.png';
import inkMeadow from '../../../../assets/art/m1/terrain-ink-v1/meadow.png';
import inkMarsh from '../../../../assets/art/m1/terrain-ink-v1/marsh.png';
import darkMeadow from '../../../../assets/art/m1/map-dark/meadow-grim-v2.png';
import darkWoodland from '../../../../assets/art/m1/map-dark/woodland-grim-v2.png';
import darkShore from '../../../../assets/art/m1/map-dark/shore-grim-v2.png';
import darkRock from '../../../../assets/art/m1/map-dark/rock-grim-v2.png';
import darkWater from '../../../../assets/art/m1/map-dark/water-grim-v2.png';
import treeCanopy from '../../../../assets/art/m1/map-dark/foliage-atlas-v3.png';
import treeTrunk from '../../../../assets/art/m1/map-dark/trunk-atlas-v1.png';
/**
 * Battle and map art in the approved ink style (ADR-0006, 2026-10-02). Licence records live in
 * `assets/manifest.json`; every image here is Codex-generated original work.
 */
import roadTrail from '../../../../assets/art/m1/terrain-ink-v1/trail.png';
import roadDirt from '../../../../assets/art/m1/terrain-ink-v1/dirt.png';
import roadPaved from '../../../../assets/art/m1/terrain-ink-v1/paved.png';
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
import partyGroup from '../../../../assets/art/m1/map/party-banner-v2.png';
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
    grass: inkMeadow,
    woodland: darkWoodland,
    hills: darkMeadow,
    marsh: inkMarsh,
    riverbank: darkShore,
    rock: darkRock,
    water: darkWater,
  },
  roads: { trail: roadTrail, dirt_road: roadDirt, paved_road: roadPaved },
  forest: forestClump,
  party: partyBanner,
  partyGroup: {
    url: partyGroup,
    /** Combined foot contacts in the authored square party image. */
    groundPivot: { x: 0.49, y: 0.8 },
    visibleHeight: 0.53,
  },
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

export const CITY_SPRITE_SIZE = 2;

/** Source-image coordinates for cutouts already authored in the map's projection. */
export interface MapSpriteArt {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly bounds: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
}

const FULL_SPRITE_BOUNDS = { left: 0, top: 0, right: 1, bottom: 1 } as const;

/** Shared neutral painted materials: two leaf fragments, then two conifer boughs. */
export const MAP_TREE_PARTS = {
  trunk: {
    url: treeTrunk,
    width: 1254,
    height: 1254,
    frames: [
      {
        left: 0.12679425837320574,
        top: 0.019138755980861243,
        right: 0.45374800637958534,
        bottom: 0.49681020733652315,
        pivot: {
          x: 0.43902439024390244,
          y: 0.9649415692821369,
        },
        attachments: [
          {
            x: 0.8121951219512196,
            y: 0.005008347245409015,
          },
          {
            x: 0.23414634146341465,
            y: 0.15025041736227046,
          },
          {
            x: 0.9292682926829269,
            y: 0.16026711185308848,
          },
        ],
      },
      {
        left: 0.5757575757575758,
        top: 0.044657097288676235,
        right: 0.9250398724082934,
        bottom: 0.49521531100478466,
        pivot: {
          x: 0.3424657534246575,
          y: 0.9663716814159292,
        },
        attachments: [
          {
            x: 0.0547945205479452,
            y: 0.22300884955752212,
          },
          {
            x: 0.3858447488584475,
            y: 0.16283185840707964,
          },
          {
            x: 0.7442922374429224,
            y: 0.0017699115044247787,
          },
        ],
      },
      {
        left: 0.17384370015948963,
        top: 0.5901116427432217,
        right: 0.41228070175438597,
        bottom: 0.9696969696969697,
        pivot: {
          x: 0.4882943143812709,
          y: 0.9453781512605042,
        },
        attachments: [
          {
            x: 0.6220735785953178,
            y: 0.0021008403361344537,
          },
          {
            x: 0.08695652173913043,
            y: 0.029411764705882353,
          },
          {
            x: 0.9364548494983278,
            y: 0.09873949579831932,
          },
        ],
      },
      {
        left: 0.6355661881977671,
        top: 0.5207336523125997,
        right: 0.8660287081339713,
        bottom: 0.9800637958532695,
        pivot: {
          x: 0.36678200692041524,
          y: 0.9635416666666666,
        },
        attachments: [
          {
            x: 0.4013840830449827,
            y: 0.003472222222222222,
          },
          {
            x: 0.25259515570934254,
            y: 0.1111111111111111,
          },
          {
            x: 0.7162629757785467,
            y: 0.2361111111111111,
          },
          {
            x: 0.17301038062283736,
            y: 0.3368055555555556,
          },
          {
            x: 0.7647058823529411,
            y: 0.4131944444444444,
          },
          {
            x: 0.20761245674740483,
            y: 0.5399305555555556,
          },
          {
            x: 0.6885813148788927,
            y: 0.6666666666666666,
          },
        ],
      },
    ],
  },
  canopy: {
    url: treeCanopy,
    width: 1254,
    height: 1254,
    frames: [
      {
        left: 0.05263157894736842,
        top: 0.10446570972886762,
        right: 0.4920255183413078,
        bottom: 0.47368421052631576,
        pivot: { x: 0.016333938294010888, y: 0.5053995680345572 },
      },
      {
        left: 0.6180223285486444,
        top: 0.13636363636363635,
        right: 0.9401913875598086,
        bottom: 0.47607655502392343,
        pivot: { x: 0.024752475247524754, y: 0.9694835680751174 },
      },
      {
        left: 0.050239234449760764,
        top: 0.5606060606060606,
        right: 0.45534290271132377,
        bottom: 0.9274322169059012,
        pivot: { x: 0.9429133858267716, y: 0.013043478260869565 },
      },
      {
        left: 0.594896331738437,
        top: 0.5669856459330144,
        right: 0.9593301435406698,
        bottom: 0.9354066985645934,
        pivot: { x: 0.02188183807439825, y: 0.021645021645021644 },
      },
    ],
  },
} as const;

const MAP_SITE_SPRITES: Readonly<Record<string, MapSpriteArt>> = {
  'kamenny-brod': {
    url: darkCity,
    width: 1536,
    height: 1024,
    pivot: { x: 0.302734375, y: 0.865234375 },
    bounds: {
      left: 0.23763020833333334,
      top: 0.0830078125,
      right: 0.9388020833333334,
      bottom: 0.9072265625,
    },
  },
  bereznyak: {
    url: darkVillage,
    width: 1536,
    height: 1024,
    pivot: { x: 0.562, y: 0.863 },
    bounds: {
      left: 0.036458333333333336,
      top: 0.10546875,
      right: 0.9817708333333334,
      bottom: 0.900390625,
    },
  },
  'tikhaya-gat': {
    url: darkRiverVillage,
    width: 1536,
    height: 1024,
    pivot: { x: 0.276, y: 0.847 },
    bounds: {
      left: 0.044270833333333336,
      top: 0.1181640625,
      right: 0.9609375,
      bottom: 0.8818359375,
    },
  },
  'severny-dvor': {
    url: darkFarmstead,
    width: 1536,
    height: 1024,
    pivot: { x: 0.7356770833333334, y: 0.8525390625 },
    bounds: {
      left: 0.0032552083333333335,
      top: 0.154296875,
      right: 0.7649739583333334,
      bottom: 0.919921875,
    },
  },
  'staraya-melnitsa': {
    url: darkMill,
    width: 1536,
    height: 1024,
    pivot: { x: 0.41, y: 0.764 },
    bounds: { left: 0.095703125, top: 0.08203125, right: 0.9147135416666666, bottom: 0.8671875 },
  },
};

/** Map cutouts keep their entrance at the site's ground anchor; legacy art stays available. */
export function mapSiteSprite(siteId: string, kind: 'CITY' | 'VILLAGE' | 'LANDMARK'): MapSpriteArt {
  return (
    MAP_SITE_SPRITES[siteId] ?? {
      url: siteSprite(siteId, kind),
      width: 512,
      height: 512,
      pivot: { x: 0.5, y: 0.875 },
      bounds: FULL_SPRITE_BOUNDS,
    }
  );
}
