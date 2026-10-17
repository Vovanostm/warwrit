import { Mesh, VertexData, type Scene } from '@babylonjs/core';

const SIDE_COUNT = 6;
const EDGE_SEGMENTS = 6;
const MAX_BANK_OUTSET = 0.22;

interface BankGeometry {
  readonly positions: number[];
  readonly indices: number[];
  readonly uvs: number[];
}

interface BankSideOptions {
  readonly side: number;
  readonly radius: number;
  readonly top: number;
  readonly bottom: number;
  readonly lowerLeft: number;
  readonly lowerRight: number;
  readonly leftOutset: number;
  readonly rightOutset: number;
  readonly middleCornerOutset: (corner: number) => number;
  readonly geometry: BankGeometry;
}

/**
 * Builds the visible earth beneath a raised combat hex. The top rim stays on
 * the canonical hex footprint; only the lower bank slopes into its neighbour.
 */
export function createBattleTerrainBanks(
  name: string,
  radius: number,
  top: number,
  bottoms: readonly number[],
  scene: Scene,
): Mesh {
  const geometry: BankGeometry = { positions: [], indices: [], uvs: [] };

  const sideBottom = (side: number) => bottoms[side] ?? 0;
  const cornerBottom = (corner: number) =>
    Math.min(sideBottom(corner), sideBottom((corner + SIDE_COUNT - 1) % SIDE_COUNT));
  const cornerOutset = (corner: number) =>
    radius * Math.min(MAX_BANK_OUTSET, 0.08 + deterministicNoise(corner, 19) * 0.09);
  const middleCornerOutset = (corner: number) =>
    radius * Math.min(MAX_BANK_OUTSET, 0.09 + deterministicNoise(corner, 71) * 0.06);

  for (let side = 0; side < SIDE_COUNT; side++) {
    const bottom = sideBottom(side);
    if (bottom < top) {
      const lowerLeft = cornerBottom(side);
      const lowerRight = cornerBottom((side + 1) % SIDE_COUNT);
      const base = appendBankVertices({
        side,
        radius,
        top,
        bottom,
        lowerLeft,
        lowerRight,
        leftOutset: cornerOutset(side),
        rightOutset: cornerOutset((side + 1) % SIDE_COUNT),
        middleCornerOutset,
        geometry,
      });
      appendBankIndices(geometry, base);
      appendBankLip(geometry, side, radius, top);
    }
  }

  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = geometry.positions;
  data.indices = geometry.indices;
  data.uvs = geometry.uvs;
  data.normals = [];
  VertexData.ComputeNormals(geometry.positions, geometry.indices, data.normals);
  data.applyToMesh(mesh);
  return mesh;
}

function appendBankVertices(options: BankSideOptions): number {
  const { side, radius, top, geometry } = options;
  const firstAngle = (side * Math.PI) / 3 + Math.PI / 6;
  const secondAngle = firstAngle + Math.PI / 3;
  const outwardAngle = firstAngle + Math.PI / 6;
  const outwardX = Math.cos(outwardAngle);
  const outwardZ = Math.sin(outwardAngle);
  const base = geometry.positions.length / 3;

  for (let row = 0; row < 3; row++) {
    for (let segment = 0; segment <= EDGE_SEGMENTS; segment++) {
      const t = segment / EDGE_SEGMENTS;
      const point = bankPoint(options, row, segment, t, {
        firstAngle,
        secondAngle,
        outwardX,
        outwardZ,
      });
      geometry.positions.push(point.x, point.y, point.z);
      geometry.uvs.push((segment * radius) / (EDGE_SEGMENTS * 2), (top - point.y) / 2);
    }
  }
  return base;
}

function bankPoint(
  options: BankSideOptions,
  row: number,
  segment: number,
  t: number,
  angles: { firstAngle: number; secondAngle: number; outwardX: number; outwardZ: number },
): { x: number; y: number; z: number } {
  const {
    side,
    radius,
    top,
    bottom,
    lowerLeft,
    lowerRight,
    leftOutset,
    rightOutset,
    middleCornerOutset,
  } = options;
  const { firstAngle, secondAngle, outwardX, outwardZ } = angles;
  const topX = lerp(Math.cos(firstAngle) * radius, Math.cos(secondAngle) * radius, t);
  const topZ = lerp(Math.sin(firstAngle) * radius, Math.sin(secondAngle) * radius, t);
  const outward = bankOutset(
    row,
    segment,
    side,
    t,
    radius,
    leftOutset,
    rightOutset,
    middleCornerOutset,
  );
  const direction = bankDirectionAtCorner(segment, firstAngle, secondAngle, outwardX, outwardZ);
  const lowerY = lowerLipHeight(t, lowerLeft, bottom, lowerRight);
  const y = row === 0 ? top : lerp(top, lowerY, row === 1 ? 0.62 : 1);
  return { x: topX + direction.x * outward, y, z: topZ + direction.z * outward };
}

function bankDirectionAtCorner(
  segment: number,
  firstAngle: number,
  secondAngle: number,
  outwardX: number,
  outwardZ: number,
): { x: number; z: number } {
  if (segment === 0) return { x: Math.cos(firstAngle), z: Math.sin(firstAngle) };
  if (segment === EDGE_SEGMENTS) return { x: Math.cos(secondAngle), z: Math.sin(secondAngle) };
  return { x: outwardX, z: outwardZ };
}

function bankOutset(
  row: number,
  segment: number,
  side: number,
  t: number,
  radius: number,
  leftOutset: number,
  rightOutset: number,
  middleCornerOutset: (corner: number) => number,
): number {
  if (row === 0) return 0;
  if (row === 1) {
    if (segment === 0) return middleCornerOutset(side);
    if (segment === EDGE_SEGMENTS) return middleCornerOutset((side + 1) % SIDE_COUNT);
    return radius * (0.09 + deterministicNoise(side * EDGE_SEGMENTS + segment, 71) * 0.06);
  }
  const noise =
    segment === 0 || segment === EDGE_SEGMENTS
      ? 0
      : (deterministicNoise(side * EDGE_SEGMENTS + segment, 43) - 0.5) * 0.035;
  return Math.min(MAX_BANK_OUTSET * radius, lerp(leftOutset, rightOutset, t) + radius * noise);
}

function appendBankIndices(geometry: BankGeometry, base: number): void {
  const rowSize = EDGE_SEGMENTS + 1;
  for (let row = 0; row < 2; row++) {
    for (let segment = 0; segment < EDGE_SEGMENTS; segment++) {
      const upperLeft = base + row * rowSize + segment;
      const upperRight = upperLeft + 1;
      const lowerLeft = upperLeft + rowSize;
      const lowerRight = lowerLeft + 1;
      geometry.indices.push(upperLeft, upperRight, lowerRight, upperLeft, lowerRight, lowerLeft);
    }
  }
}

function appendBankLip(geometry: BankGeometry, side: number, radius: number, top: number): void {
  const base = geometry.positions.length / 3;

  for (let row = 0; row < 2; row++) {
    for (let segment = 0; segment <= EDGE_SEGMENTS; segment++) {
      const point = bankLipPoint(side, segment, row, radius, top);
      geometry.positions.push(point.x, point.y, point.z);
      geometry.uvs.push((segment * radius) / (EDGE_SEGMENTS * 2), point.inset / 2);
    }
  }

  appendBankLipIndices(geometry, base);
}

function bankLipPoint(
  side: number,
  segment: number,
  row: number,
  radius: number,
  top: number,
): { x: number; y: number; z: number; inset: number } {
  const firstAngle = (side * Math.PI) / 3 + Math.PI / 6;
  const secondAngle = firstAngle + Math.PI / 3;
  const t = segment / EDGE_SEGMENTS;
  const inset = bankLipInset(side, segment, row, radius);
  const direction = bankDirectionAtCorner(
    segment,
    firstAngle,
    secondAngle,
    Math.cos(firstAngle + Math.PI / 6),
    Math.sin(firstAngle + Math.PI / 6),
  );
  return {
    x: lerp(Math.cos(firstAngle) * radius, Math.cos(secondAngle) * radius, t) - direction.x * inset,
    y: top + 0.002,
    z: lerp(Math.sin(firstAngle) * radius, Math.sin(secondAngle) * radius, t) - direction.z * inset,
    inset,
  };
}

function bankLipInset(side: number, segment: number, row: number, radius: number): number {
  if (row === 0) return 0;
  const seed =
    segment === 0
      ? side
      : segment === EDGE_SEGMENTS
        ? (side + 1) % SIDE_COUNT
        : side * EDGE_SEGMENTS + segment;
  return radius * (0.02 + deterministicNoise(seed, 101) * 0.04);
}

function appendBankLipIndices(geometry: BankGeometry, base: number): void {
  const rowSize = EDGE_SEGMENTS + 1;
  for (let segment = 0; segment < EDGE_SEGMENTS; segment++) {
    const outerLeft = base + segment;
    const innerLeft = outerLeft + rowSize;
    const innerRight = innerLeft + 1;
    const outerRight = outerLeft + 1;
    geometry.indices.push(outerLeft, innerLeft, innerRight, outerLeft, innerRight, outerRight);
  }
}

function lowerLipHeight(t: number, left: number, middle: number, right: number): number {
  return t < 0.5 ? lerp(left, middle, t * 2) : lerp(middle, right, (t - 0.5) * 2);
}

function deterministicNoise(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
