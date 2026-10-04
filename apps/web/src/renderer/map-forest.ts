import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { coordinateHash, type ComponentTreePlacement } from './map-trees.js';
import { distanceToPolygonEdge, insidePolygon, nearPolygon } from './map-geography.js';

interface TreeForm {
  readonly species: 'deciduous' | 'conifer';
  readonly age: 'mature' | 'young' | 'old';
}
interface ForestTree extends ComponentTreePlacement {
  readonly radiusFp: number;
}
type Terrain = WorldContinuousMapDto['terrainShapes'][number];
type Random = () => number;
type Root = ComponentTreePlacement['root'];

function seededRandom(seed: number): Random {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let v = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    v ^= v + Math.imul(v ^ (v >>> 7), 61 | v);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
function densityNoise(x: number, z: number, seed: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const smooth = (v: number) => v * v * (3 - 2 * v);
  const tx = smooth(x - ix),
    tz = smooth(z - iz);
  const unitHash = (dx: number, dz: number) => coordinateHash(ix + dx, iz + dz, seed) / 0x100000000;
  const a = unitHash(0, 0),
    b = unitHash(1, 0),
    c = unitHash(0, 1),
    d = unitHash(1, 1);
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}
function appearance(shape: Terrain, edge: number, random: Random): TreeForm {
  const species =
    shape.terrainId === 'forest' && (shape.shapeId === 'eastern-pinewood' || random() < 0.12)
      ? 'conifer'
      : 'deciduous';
  const roll = random();
  const age = roll < 0.08 ? 'old' : roll < 0.2 + (1 - edge) * 0.5 ? 'young' : 'mature';
  return { species, age };
}
function candidate(shapes: readonly Terrain[], root: Root, seed: number, random: Random) {
  const { xFp: x, zFp: z } = root;
  const shape = shapes.find((entry) => insidePolygon(x, z, entry.polygon));
  if (!shape || (shape.terrainId !== 'forest' && shape.terrainId !== 'grassland')) return null;
  const wooded = shape.terrainId === 'forest';
  const pocket = densityNoise(x / 850, z / 850, seed);
  const edge = wooded ? Math.min(1, distanceToPolygonEdge(x, z, shape.polygon) / 380) : 0;
  const density = wooded ? Math.max(0, (pocket - 0.28) * 1.35) * (0.15 + 0.85 * edge) : 0.008;
  return random() > density ? null : appearance(shape, edge, random);
}
function obstructed(region: WorldContinuousMapDto, root: Root, radius: number) {
  const { xFp: x, zFp: z } = root;
  return (
    region.sites.some(
      (site) =>
        Math.hypot(site.anchorFp.xFp - x, site.anchorFp.zFp - z) <
        (site.siteId === 'kamenny-brod' ? 400 : 260) + radius,
    ) ||
    region.blockingShapes.some((entry) => nearPolygon(x, z, entry.polygon, radius)) ||
    region.overlayShapes.some((entry) => nearPolygon(x, z, entry.polygon, 110 + radius))
  );
}
function neighbours(buckets: ReadonlyMap<string, ForestTree[]>, root: Root) {
  const bx = Math.floor(root.xFp / 256),
    bz = Math.floor(root.zFp / 256);
  const nearby: ForestTree[] = [];
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++) nearby.push(...(buckets.get(`${bx + dx}:${bz + dz}`) ?? []));
  return nearby;
}
const rootDistance = (a: Root, b: Root) => Math.hypot(a.xFp - b.xFp, a.zFp - b.zFp);
function acceptRoot(
  region: WorldContinuousMapDto,
  forms: readonly TreeForm[],
  form: TreeForm,
  root: Root,
  nearby: readonly ForestTree[],
  random: Random,
): ForestTree | null {
  const eligible = forms
    .map((entry, template) => ({ entry, template }))
    .filter(({ entry }) => entry.species === form.species && entry.age === form.age);
  if (!eligible.length) return null;
  const size =
    (form.age === 'young' ? 0.34 : form.age === 'old' ? 0.73 : 0.6) * (0.9 + random() * 0.2);
  const radiusFp = (80 * size) / 0.6;
  if (obstructed(region, root, radiusFp)) return null;
  if (nearby.some((tree) => rootDistance(root, tree.root) < radiusFp + tree.radiusFp)) return null;
  const distinct = eligible.filter(
    ({ template }) =>
      !nearby.some((tree) => tree.template === template && rootDistance(root, tree.root) < 440),
  );
  if (!distinct.length) return null;
  const template = distinct[Math.floor(random() * distinct.length)]!.template;
  return {
    id: coordinateHash(Math.round(root.xFp), Math.round(root.zFp), 0x369dea0f),
    species: form.species,
    template,
    size,
    root,
    radiusFp,
  };
}

/** Finite seeded decoration; public geography still owns collision and travel. */
export function generateForest(
  region: WorldContinuousMapDto,
  forms: readonly TreeForm[],
): ForestTree[] {
  if (!forms.length) return [];
  let seed = 2166136261;
  for (const char of region.mapEdition) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  const random = seededRandom(seed);
  const terrain = [...region.terrainShapes].sort((a, b) => b.paintPriority - a.paintPriority);
  const width = region.columns * region.cellSizeFp,
    depth = region.rows * region.cellSizeFp;
  const attempts = Math.min(20000, Math.ceil((width * depth) / 14000));
  const buckets = new Map<string, ForestTree[]>(),
    trees: ForestTree[] = [];
  for (let attempt = 0; attempt < attempts && trees.length < 1600; attempt++) {
    const root = {
      xFp: region.origin.xFp + random() * width,
      zFp: region.origin.zFp + random() * depth,
    };
    if (!insidePolygon(root.xFp, root.zFp, region.boundary)) continue;
    const form = candidate(terrain, root, seed, random);
    if (!form) continue;
    const tree = acceptRoot(region, forms, form, root, neighbours(buckets, root), random);
    if (!tree) continue;
    trees.push(tree);
    const key = `${Math.floor(root.xFp / 256)}:${Math.floor(root.zFp / 256)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(tree);
    buckets.set(key, bucket);
  }
  return trees;
}
