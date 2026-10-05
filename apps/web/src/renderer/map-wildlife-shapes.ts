import { Mesh, VertexData, type Scene } from '@babylonjs/core';

type InkPatch = { points: readonly (readonly [number, number])[]; color: readonly number[] };

function inkSilhouette(scene: Scene, name: string, patches: InkPatch[], upright = false) {
  const data = new VertexData();
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  for (const [layer, patch] of patches.entries()) {
    const start = positions.length / 3;
    for (const [x, z] of patch.points) {
      positions.push(x, upright ? z : layer * 0.001, upright ? -layer * 0.001 : z);
      colors.push(...patch.color, 1);
    }
    for (let i = 1; i < patch.points.length - 1; i++) indices.push(start, start + i, start + i + 1);
  }
  data.positions = positions;
  data.colors = colors;
  data.indices = indices;
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return mesh;
}

/** Narrow head/beak faces local -Z; swept wings and forked tail retain a bird silhouette. */
export function createBirdSilhouette(scene: Scene) {
  const patches: InkPatch[] = [];
  for (const side of [-1, 1]) {
    patches.push({
      points: [
        [0, -0.028],
        [side * 0.07, -0.048],
        [side * 0.135, -0.005],
        [side * 0.1, 0.008],
        [side * 0.068, 0.028],
        [0, 0.016],
      ],
      color: [0.2, 0.19, 0.16],
    });
    patches.push({
      points: [
        [0, -0.017],
        [side * 0.064, -0.032],
        [side * 0.109, -0.003],
        [side * 0.059, 0.013],
        [0, 0.009],
      ],
      color: [0.34, 0.32, 0.27],
    });
  }
  patches.push({
    points: [
      [0, -0.1],
      [0.012, -0.068],
      [0.012, 0.027],
      [0.021, 0.073],
      [0, 0.057],
      [-0.021, 0.073],
      [-0.012, 0.027],
      [-0.012, -0.068],
    ],
    color: [0.19, 0.18, 0.15],
  });
  return inkSilhouette(scene, 'bird-template', patches);
}

/** Side-on ink frog: raised eye, low head, folded hind thigh and planted feet. */
export function createFrogSilhouette(scene: Scene) {
  return inkSilhouette(
    scene,
    'frog-template',
    [
      {
        points: [
          [-0.057, 0.031],
          [-0.055, 0.045],
          [-0.04, 0.051],
          [-0.036, 0.066],
          [-0.023, 0.07],
          [-0.016, 0.057],
          [0.009, 0.059],
          [0.034, 0.05],
          [0.044, 0.029],
          [0.036, 0.011],
          [0.056, 0.007],
          [0.06, 0],
          [0.022, 0],
          [0.01, 0.014],
          [-0.009, 0.018],
          [-0.024, 0.009],
          [-0.019, 0.003],
          [-0.043, 0],
          [-0.045, 0.007],
          [-0.034, 0.016],
          [-0.029, 0.03],
        ],
        color: [0.1, 0.12, 0.075],
      },
      {
        points: [
          [-0.05, 0.04],
          [-0.032, 0.05],
          [-0.028, 0.062],
          [-0.02, 0.049],
          [0.009, 0.053],
          [0.027, 0.045],
          [0.013, 0.023],
          [-0.014, 0.025],
          [-0.026, 0.036],
        ],
        color: [0.45, 0.45, 0.27],
      },
      {
        points: [
          [0.012, 0.023],
          [0.007, 0.039],
          [0.021, 0.052],
          [0.035, 0.043],
          [0.04, 0.029],
          [0.029, 0.013],
          [0.039, 0.009],
          [0.024, 0.007],
        ],
        color: [0.32, 0.34, 0.19],
      },
      {
        points: [
          [-0.035, 0.057],
          [-0.029, 0.065],
          [-0.023, 0.059],
          [-0.027, 0.053],
        ],
        color: [0.67, 0.57, 0.32],
      },
      {
        points: [
          [-0.033, 0.058],
          [-0.028, 0.062],
          [-0.025, 0.058],
          [-0.029, 0.055],
        ],
        color: [0.07, 0.075, 0.05],
      },
    ],
    true,
  );
}
