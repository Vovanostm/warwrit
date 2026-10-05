import {
  Color3,
  Material,
  Matrix,
  Mesh,
  MeshBuilder,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  VertexData,
  type Scene,
} from '@babylonjs/core';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { insidePolygon, nearPolygon, distanceToPolygonEdge } from './map-geography.js';
import { type ComponentTreePlacement, coordinateHash } from './map-trees.js';
import { createBirdSilhouette, createFrogSilhouette } from './map-wildlife-shapes.js';

const hareAtlas = new URL('../../../../assets/art/m1/wildlife-v1/hares-v2.png', import.meta.url)
  .href;
const habitatRadiusFp = 260;

type AnimalKind = Animal['kind'];
type Animal = {
  mesh: Mesh;
  x: number;
  z: number;
  phase: number;
  period: number;
  kind: 'hare' | 'butterfly' | 'bird' | 'frog';
  startledAt: number;
  retreat: number;
  fleeFrom: number;
  wasNear: boolean;
  cover: { x: number; z: number } | null;
  fleeFromZ: number;
};

/** The entire motion envelope must be dry and clear, including the animal's footprint. */
function clearHabitat(
  region: WorldContinuousMapDto,
  x: number,
  z: number,
  wetHabitat = false,
  flyingHabitat = false,
) {
  return (
    insidePolygon(x, z, region.boundary) &&
    distanceToPolygonEdge(x, z, region.boundary) > habitatRadiusFp &&
    ![...region.blockingShapes, ...region.overlayShapes].some((shape) =>
      nearPolygon(x, z, shape.polygon, habitatRadiusFp),
    ) &&
    !region.terrainShapes.some(
      (shape) =>
        ![
          'grassland',
          'forest',
          'hills',
          ...(wetHabitat ? ['marsh', 'riverbank'] : []),
          ...(flyingHabitat ? ['rock', 'cliff'] : []),
        ].includes(shape.terrainId) && nearPolygon(x, z, shape.polygon, habitatRadiusFp),
    ) &&
    !region.sites.some(
      (site) =>
        Math.hypot(site.anchorFp.xFp - x, site.anchorFp.zFp - z) <
        habitatRadiusFp + (site.siteId === 'kamenny-brod' ? 430 : 300),
    )
  );
}

function hareMaterials(scene: Scene, url: string) {
  return [0, 1].map((frame) => {
    const texture = new Texture(url, scene);
    texture.hasAlpha = true;
    texture.uScale = 0.5;
    texture.uOffset = frame * 0.5;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const material = new StandardMaterial(`hare-pose:${frame}`, scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = 0.08;
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    return material;
  });
}

function butterflyGeometry(scene: Scene) {
  const data = new VertexData();
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  // Dark irregular outlines surround two dusty ochre wing lobes; a narrow soot body.
  function wingSide(side: number) {
    for (const inset of [1, 0.68]) {
      const start = positions.length / 3;
      const color = inset === 1 ? [0.16, 0.13, 0.09, 1] : [0.69, 0.53, 0.3, 1];
      for (const [x, z] of [
        [0, -0.012],
        [0.041, -0.043],
        [0.061, -0.031],
        [0.043, 0.011],
        [0.048, 0.027],
        [0.023, 0.041],
        [0, 0.017],
      ]) {
        positions.push(x! * side * inset, inset === 1 ? 0 : 0.001, z! * inset);
        colors.push(...color);
      }
      for (let i = 1; i < 6; i++) indices.push(start, start + i, start + i + 1);
    }
  }
  for (const side of [-1, 1]) wingSide(side);
  const start = positions.length / 3;
  positions.push(
    -0.003,
    0.003,
    -0.027,
    0.003,
    0.003,
    -0.027,
    0.002,
    0.003,
    0.032,
    -0.002,
    0.003,
    0.032,
  );
  for (let i = 0; i < 4; i++) colors.push(0.1, 0.08, 0.06, 1);
  indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  data.positions = positions;
  data.colors = colors;
  data.indices = indices;
  const mesh = new Mesh('butterfly-template', scene);
  data.applyToMesh(mesh);
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return mesh;
}

function sampleHabitats(region: WorldContinuousMapDto) {
  const habitats: { x: number; z: number; seed: number }[] = [];
  for (let row = 6; row < region.rows; row += 12) {
    for (let column = 6; column < region.columns; column += 12) {
      const seed = coordinateHash(column, row, 0x713aba);
      const x = region.origin.xFp + (column + (seed % 5) - 2) * region.cellSizeFp;
      const z = region.origin.zFp + (row + ((seed >>> 8) % 5) - 2) * region.cellSizeFp;
      if (!clearHabitat(region, x, z, true, true)) continue;
      habitats.push({ x, z, seed });
    }
  }
  return habitats;
}

type Vegetation = {
  flowers: readonly { xFp: number; zFp: number }[];
  trees: readonly ComponentTreePlacement[];
};
function describeHabitat(
  region: WorldContinuousMapDto,
  vegetation: Vegetation,
  orderedTerrain: WorldContinuousMapDto['terrainShapes'],
  x: number,
  z: number,
  scale: number,
) {
  const terrain = orderedTerrain.find((shape) => insidePolygon(x, z, shape.polygon));
  const land = terrain?.terrainId ?? 'grassland';
  const nearbyTrees = vegetation.trees
    .filter((tree) => Math.hypot(tree.root.xFp - x, tree.root.zFp - z) < 260)
    .sort(
      (a, b) =>
        Math.hypot(a.root.xFp - x, a.root.zFp - z) - Math.hypot(b.root.xFp - x, b.root.zFp - z),
    );
  const crowns = nearbyTrees.length;
  const tree = nearbyTrees[0];
  const cover = tree
    ? {
        x: (tree.root.xFp + (x - tree.root.xFp) * 0.25) * scale,
        z: (tree.root.zFp + (z - tree.root.zFp) * 0.25) * scale,
      }
    : null;
  const pine = terrain?.shapeId === 'eastern-pinewood';
  const edge = land === 'forest' && !!terrain && distanceToPolygonEdge(x, z, terrain.polygon) < 450;
  const wetEdge =
    land === 'marsh' ||
    (land === 'riverbank' &&
      region.terrainShapes.some(
        (shape) => shape.terrainId === 'deep_water' && nearPolygon(x, z, shape.polygon, 600),
      ));
  const flower = vegetation.flowers.find((point) => Math.hypot(point.xFp - x, point.zFp - z) < 130);
  return { terrain, land, crowns, cover, pine, edge, wetEdge, flower };
}

type Habitat = ReturnType<typeof describeHabitat>;
function forestSpecies(habitat: Habitat, roll: number): AnimalKind | null {
  if (roll < 12) return 'bird';
  if (!habitat.pine && (habitat.edge || habitat.crowns === 0) && roll < 30) return 'hare';
  return null;
}
function openSpecies(habitat: Habitat, roll: number): AnimalKind | null {
  if (habitat.flower && habitat.crowns === 0 && roll < 65) return 'butterfly';
  if (roll < (habitat.land === 'hills' ? 14 : 35)) return 'hare';
  return roll > 84 ? 'bird' : null;
}
function habitatSpecies(habitat: Habitat, roll: number): AnimalKind | null {
  if (habitat.wetEdge) return roll < 60 ? 'frog' : null;
  if (habitat.land === 'forest') return forestSpecies(habitat, roll);
  if (habitat.land === 'grassland' || habitat.land === 'hills') return openSpecies(habitat, roll);
  if ((habitat.land === 'rock' || habitat.land === 'cliff') && roll < 10) return 'bird';
  return null;
}

function speciesClearance(
  region: WorldContinuousMapDto,
  kind: AnimalKind,
  { land, terrain }: Habitat,
  x: number,
  z: number,
) {
  if (
    kind === 'hare' &&
    region.terrainShapes.some(
      (shape) =>
        shape.shapeId === 'eastern-pinewood' && nearPolygon(x, z, shape.polygon, habitatRadiusFp),
    )
  )
    return false;
  if (
    kind === 'butterfly' &&
    region.terrainShapes.some(
      (shape) => shape.terrainId === 'forest' && nearPolygon(x, z, shape.polygon, habitatRadiusFp),
    )
  )
    return false;
  if (
    kind === 'frog' &&
    land === 'marsh' &&
    terrain &&
    distanceToPolygonEdge(x, z, terrain.polygon) < 150
  )
    return false;
  return true;
}

function birdHabitatBudget(land: string) {
  if (land === 'forest') return { name: 'forest', limit: 6 };
  if (land === 'grassland') return { name: 'meadow', limit: 4 };
  return { name: 'uplands', limit: 2 };
}

/** Finite client-only fauna. Public geography supplies habitat, never NPC state or targets. */
export function createMapWildlife(
  scene: Scene,
  region: WorldContinuousMapDto,
  heightAt: (x: number, z: number) => number,
  atlasUrl = hareAtlas,
  vegetation: {
    flowers: readonly { xFp: number; zFp: number }[];
    trees: readonly ComponentTreePlacement[];
  } = { flowers: [], trees: [] },
) {
  const scale = (region.worldScale ?? 1) / 1024;
  const harePaint = hareMaterials(scene, atlasUrl);
  // Measured alpha-foot pivots in hares-v2.json; source frames are already projected.
  const hareCards = [
    { x: 0.5851183765501691, y: 0.8624577226606539 },
    { x: 0.4695603156708005, y: 0.8376550169109357 },
  ].map((pivot, index) => {
    const card = MeshBuilder.CreatePlane(`hare-template:${index}`, { size: 0.22 }, scene);
    card.bakeTransformIntoVertices(
      Matrix.Translation(0.22 * (0.5 - pivot.x), 0.22 * (pivot.y - 0.5), 0),
    );
    card.material = harePaint[index]!;
    card.isPickable = false;
    card.setEnabled(false);
    return card;
  });
  const flyingPaint = (name: string, frequency: number, spread: number, lift: number) => {
    const paint = new ShaderMaterial(
      name,
      scene,
      {
        vertexSource: `precision highp float;
      attribute vec3 position; attribute vec4 color;
      uniform mat4 worldViewProjection; uniform mat4 world; uniform float time;
      uniform float frequency; uniform float spread; uniform float lift;
      varying vec3 ink;
      void main(){
        vec3 p=position;
        float flap=sin(time*frequency+world[3].x*4.7+world[3].z*3.3);
        p.x*=spread+(1.0-spread)*abs(flap); p.y+=abs(position.x)*flap*lift;
        ink=color.rgb*(0.86+0.14*abs(flap));
        gl_Position=worldViewProjection*vec4(p,1.0);
      }`,
        fragmentSource: `precision highp float; varying vec3 ink; uniform vec3 lighting;
      void main(){gl_FragColor=vec4(ink*lighting,1.0);}`,
      },
      {
        attributes: ['position', 'color'],
        uniforms: [
          'worldViewProjection',
          'world',
          'time',
          'lighting',
          'frequency',
          'spread',
          'lift',
        ],
      },
    );
    paint.backFaceCulling = false;
    paint.setColor3('lighting', Color3.White());
    paint.setFloat('frequency', frequency);
    paint.setFloat('spread', spread);
    paint.setFloat('lift', lift);
    return paint;
  };
  const wingPaint = flyingPaint('butterfly-ink', 25, 0.45, 1);
  const birdPaint = flyingPaint('bird-ink', 7, 0.8, 0.7);
  const bird = createBirdSilhouette(scene);
  bird.material = birdPaint;
  const frogPaint = new StandardMaterial('frog-ink', scene);
  frogPaint.disableLighting = true;
  frogPaint.emissiveColor = Color3.White();
  frogPaint.specularColor = Color3.Black();
  frogPaint.backFaceCulling = false;
  const frog = createFrogSilhouette(scene);
  frog.material = frogPaint;
  const wing = butterflyGeometry(scene);
  wing.material = wingPaint;
  const animals: Animal[] = [];
  let hareCount = 0,
    butterflyCount = 0,
    birdCount = 0,
    frogCount = 0;
  const birdHabitats = new Map<string, number>();
  const habitats = sampleHabitats(region);
  const orderedTerrain = [...region.terrainShapes].sort(
    (a, b) => b.paintPriority - a.paintPriority,
  );
  function createAnimalMesh(kind: AnimalKind, seed: number) {
    let mesh: Mesh;
    if (kind === 'hare') {
      mesh = hareCards[0]!.clone(`map-hare:${hareCount++}`)!;
      mesh.setEnabled(true);
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.material = harePaint[0]!;
    } else if (kind === 'butterfly') {
      mesh = wing.clone(`map-butterfly:${butterflyCount++}`)!;
      mesh.setEnabled(true);
      mesh.scaling.setAll(1.5 + (seed % 11) / 20);
    } else if (kind === 'bird') {
      mesh = bird.clone(`map-bird:${birdCount++}`)!;
      mesh.setEnabled(true);
      mesh.scaling.setAll(0.45 + (seed % 4) / 30);
    } else {
      mesh = frog.clone(`map-frog:${frogCount++}`)!;
      mesh.setEnabled(true);
      mesh.scaling.setAll(0.7);
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    }
    return mesh;
  }
  function atCapacity(kind: AnimalKind, crowns: number) {
    return (
      (kind === 'hare' && (hareCount >= 64 || crowns > 2)) ||
      (kind === 'frog' && frogCount >= 12) ||
      (kind === 'butterfly' && butterflyCount >= 24) ||
      (kind === 'bird' && birdCount >= 12)
    );
  }
  function addBirdCompanion(
    kind: AnimalKind,
    birdHabitat: string,
    birdBudget: number,
    mesh: Mesh,
    x: number,
    z: number,
    seed: number,
    cover: Animal['cover'],
  ) {
    if (kind === 'bird' && birdCount < 12 && (birdHabitats.get(birdHabitat) ?? 0) < birdBudget) {
      birdHabitats.set(birdHabitat, (birdHabitats.get(birdHabitat) ?? 0) + 1);
      const companion = mesh.clone(`map-bird:${birdCount++}`)!;
      companion.isPickable = false;
      animals.push({
        mesh: companion,
        x: (x + 30) * scale,
        z: (z + 30) * scale,
        phase: (seed % 1000) / 37,
        period: 18 + (seed % 13),
        kind,
        startledAt: -Infinity,
        retreat: 0,
        fleeFrom: x * scale,
        wasNear: false,
        cover,
        fleeFromZ: z * scale,
      });
    }
  }
  // Choose by seeded rank, so the finite cap does not empty the southern map.
  for (const habitat of habitats.sort((a, b) => a.seed - b.seed)) addHabitat(habitat);
  function addHabitat({ x, z, seed }: { x: number; z: number; seed: number }) {
    const habitat = describeHabitat(region, vegetation, orderedTerrain, x, z, scale);
    const { land, crowns, cover } = habitat;
    const roll = seed % 100;
    const kind = habitatSpecies(habitat, roll);
    if (!kind || (kind !== 'frog' && !clearHabitat(region, x, z, false, kind === 'bird'))) return;
    if (atCapacity(kind, crowns)) return;
    if (!speciesClearance(region, kind, habitat, x, z)) return;
    const { name: birdHabitat, limit: birdBudget } = birdHabitatBudget(land);
    if (kind === 'bird' && (birdHabitats.get(birdHabitat) ?? 0) >= birdBudget) return;
    const mesh = createAnimalMesh(kind, seed);
    mesh.isPickable = false;
    // Fauna retain terrain/grass/forest occlusion, unlike painted settlement foregrounds.
    mesh.renderingGroupId = 0;
    animals.push({
      mesh,
      x: x * scale,
      z: z * scale,
      phase: (seed % 1000) / 37,
      period: 18 + (seed % 13),
      kind,
      startledAt: -Infinity,
      retreat: 0,
      fleeFrom: x * scale,
      wasNear: false,
      cover,
      fleeFromZ: z * scale,
    });
    if (kind === 'bird') birdHabitats.set(birdHabitat, (birdHabitats.get(birdHabitat) ?? 0) + 1);
    addBirdCompanion(kind, birdHabitat, birdBudget, mesh, x, z, seed, cover);
  }
  function reactToCompany(animal: Animal, time: number, company: { x: number; z: number } | null) {
    const { mesh, x, z, kind } = animal;
    const nearCompany = company && Math.hypot(company.x - x, company.z - z) < 370 * scale;
    if (nearCompany && !animal.wasNear && time - animal.startledAt > 20) {
      animal.startledAt = time;
      animal.retreat = company.x > mesh.position.x ? -1 : 1;
      animal.fleeFrom = mesh.position.x || x;
      animal.fleeFromZ = mesh.position.z || z;
    }
    animal.wasNear = !!nearCompany;
    const startled = time - animal.startledAt;
    const hidden =
      kind === 'hare' && animal.cover && startled > 1.8 && (startled < 7 || !!nearCompany);
    mesh.setEnabled(!hidden && !(night && (kind === 'bird' || kind === 'butterfly')));
    return { startled };
  }
  function animateHare(animal: Animal, local: number, startled: number) {
    const { mesh, x, z, period } = animal;
    // Three bounds out, rest, three bounds back, rest. Each animal has its own clock.
    const returning = local >= period / 2;
    const legTime = local % (period / 2);
    const progress = Math.min(1, legTime / 2.4);
    const along = returning ? 1 - progress : progress;
    const fleeing = startled < 1.8;
    const fleeProgress = Math.max(0, Math.min(1, (startled - 0.45) / 1.35));
    const endpoint = animal.cover?.x ?? x + animal.retreat * 180 * scale;
    const endpointZ = animal.cover?.z ?? z;
    const normal = x + (along - 0.5) * 300 * scale;
    const settle = Math.max(0, Math.min(1, startled - 7));
    const px = fleeing
      ? animal.fleeFrom + (endpoint - animal.fleeFrom) * fleeProgress
      : startled < 8
        ? endpoint + (normal - endpoint) * settle
        : normal;
    const pz = fleeing
      ? animal.fleeFromZ + (endpointZ - animal.fleeFromZ) * fleeProgress
      : startled < 8
        ? endpointZ + (z - endpointZ) * settle
        : z;
    const hop = fleeing
      ? Math.abs(Math.sin(fleeProgress * Math.PI * 3)) * 0.055
      : progress < 1
        ? Math.abs(Math.sin(progress * Math.PI * 3)) * 0.055
        : 0;
    mesh.position.set(px, heightAt(px, pz) + 0.008 + hop, pz);
    const pose = (fleeing ? animal.retreat < 0 : returning) ? 1 : 0;
    if (mesh.material !== harePaint[pose]) {
      hareCards[pose]!.geometry!.applyToMesh(mesh);
      mesh.material = harePaint[pose]!;
    }
  }
  function animateFrog(animal: Animal, local: number) {
    const { mesh, x, z, period } = animal;
    const returning = local >= period / 2;
    const progress = Math.min(1, (local % (period / 2)) / 1.4);
    const along = returning ? 1 - progress : progress;
    const px = x + (along - 0.5) * 100 * scale;
    const hop = progress < 1 ? Math.abs(Math.sin(progress * Math.PI * 2)) * 0.11 : 0;
    mesh.position.set(px, heightAt(px, z) + 0.01 + hop, z);
    // Procedural side profile has no baked directional lighting.
    mesh.scaling.x = returning ? 0.7 : -0.7;
  }
  function animateFlight(animal: Animal, time: number, startled: number) {
    const { mesh, x, z, phase, kind } = animal;
    const t = time * (0.65 + (phase % 0.3)) + phase;
    const px = x + (Math.sin(t) * 90 + Math.sin(t * 2.3) * 20) * scale;
    const pz = z + (Math.cos(t * 0.83) * 90 + Math.cos(t * 1.7) * 20) * scale;
    mesh.position.set(
      px,
      heightAt(px, pz) +
        (kind === 'bird'
          ? 0.45 + (startled < 4 ? Math.sin(Math.min(1, startled / 4) * Math.PI) * 0.35 : 0)
          : 0.16) +
        Math.sin(t * 2.7) * 0.05,
      pz,
    );
    // Broad forewings, head and beak face local -Z. Follow the actual path tangent.
    const dx = Math.cos(t) * 90 + Math.cos(t * 2.3) * 46;
    const dz = -Math.sin(t * 0.83) * 74.7 - Math.sin(t * 1.7) * 34;
    mesh.rotation.y = Math.atan2(-dx, -dz);
  }
  let night = false;
  return {
    update(time: number, company: { x: number; z: number } | null = null) {
      wingPaint.setFloat('time', time);
      birdPaint.setFloat('time', time);
      for (const animal of animals) {
        const { phase, period, kind } = animal;
        const { startled } = reactToCompany(animal, time, company);
        const local = (time + phase) % period;
        if (kind === 'hare') animateHare(animal, local, startled);
        else if (kind === 'frog') animateFrog(animal, local);
        else animateFlight(animal, time, startled);
      }
    },
    setNight(value: boolean) {
      night = value;
      const lighting = night ? new Color3(0.45, 0.51, 0.61) : new Color3(1, 1, 0.94);
      for (const paint of harePaint) paint.emissiveColor.copyFrom(lighting);
      frogPaint.emissiveColor.copyFrom(lighting);
      birdPaint.setColor3('lighting', lighting);
      for (const animal of animals)
        if (animal.kind === 'butterfly' || animal.kind === 'bird') animal.mesh.setEnabled(!night);
    },
  };
}
