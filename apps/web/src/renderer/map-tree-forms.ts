/** Finite authored assemblies of the approved measured trunk/foliage atlas parts.
 * Indices0–3 preserve the previously accepted bodies. New forms change branch
 * groupings and near/far crown masses, never the painted projection or lighting.
 */
export type TreeSpecies = 'deciduous' | 'conifer';

export interface CanopyMass {
  /** The atlas fragment's twig-base pivot is placed at this painted trunk attachment. */
  readonly attachment: number;
  /** An opaque lower-crown pixel used to cover the painted fork cap. */
  readonly overlapPivot?: { readonly x: number; readonly y: number };
  readonly width: number;
  readonly height: number;
  readonly frame: number;
  /** Small yaw offset from the current camera-facing crown plane. */
  readonly facing: number;
  readonly curve: number;
  readonly recessed?: boolean;
}

export interface TreeForm {
  readonly id: string;
  readonly species: TreeSpecies;
  readonly age: 'young' | 'mature' | 'old';
  readonly trunkFrame: number;
  readonly canopyScale: number;
  readonly canopy: readonly CanopyMass[];
}

export const TREE_FORMS: readonly TreeForm[] = [
  {
    id: 'deciduous-broad',
    species: 'deciduous',
    age: 'mature',
    trunkFrame: 0,
    canopyScale: 1.7,
    canopy: [
      leaf(0, 0, 0.66, 0.51, -0.18, false, 0.1),
      leaf(1, 1, 0.59, 0.5, 0.17, false, 0.09),
      leaf(2, 0, 0.5, 0.43, -0.04, false, 0.07),
      leaf(1, 1, 0.46, 0.38, 0.25, true, 0.065),
      leaf(0, 1, 0.68, 0.57, 0.12, true, 0.08),
      leaf(1, 0, 0.72, 0.6, -0.08, false, 0.08),
      leaf(2, 1, 0.66, 0.56, -0.12, true, 0.075),
    ],
  },
  {
    id: 'deciduous-asymmetric',
    species: 'deciduous',
    age: 'mature',
    trunkFrame: 1,
    canopyScale: 1.7,
    canopy: [
      leaf(0, 0, 0.63, 0.49, -0.2, false, 0.1),
      leaf(1, 1, 0.56, 0.46, 0.18, false, 0.09),
      leaf(2, 0, 0.48, 0.42, -0.05, false, 0.07),
      leaf(1, 1, 0.44, 0.37, 0.24, true, 0.065),
      leaf(0, 1, 0.66, 0.56, 0.12, true, 0.08),
      leaf(1, 0, 0.7, 0.58, -0.08, false, 0.08),
      leaf(2, 1, 0.64, 0.54, -0.12, true, 0.075),
    ],
  },
  {
    id: 'deciduous-compact',
    species: 'deciduous',
    age: 'mature',
    trunkFrame: 2,
    canopyScale: 1.7,
    canopy: [
      leaf(0, 0, 0.6, 0.47, -0.18, false, 0.095),
      leaf(1, 1, 0.57, 0.46, 0.16, false, 0.09),
      leaf(2, 0, 0.47, 0.4, -0.04, false, 0.07),
      leaf(1, 1, 0.43, 0.36, 0.22, true, 0.06),
      leaf(0, 1, 0.64, 0.54, 0.12, true, 0.08),
      leaf(1, 0, 0.68, 0.56, -0.08, false, 0.08),
      leaf(2, 1, 0.62, 0.52, -0.12, true, 0.075),
    ],
  },
  {
    id: 'conifer-broad',
    species: 'conifer',
    age: 'mature',
    trunkFrame: 3,
    canopyScale: 1,
    canopy: [
      bough(1, 0.3, 0.2),
      bough(2, 0.3, 0.2, true),
      bough(3, 0.4, 0.24),
      bough(4, 0.4, 0.24, true),
      bough(5, 0.46, 0.22),
      bough(6, 0.46, 0.22, true),
      tip(2, 0.2, 0.19),
      tip(3, 0.18, 0.18),
      // Foreground boughs cross the bole; the other six recede outwards.
      { attachment: 2, width: 0.34, height: 0.28, frame: 2, facing: -0.04, curve: 0.06 },
      { attachment: 3, width: 0.3, height: 0.24, frame: 3, facing: 0.08, curve: 0.055 },
    ],
  },
  {
    id: 'deciduous-split',
    species: 'deciduous',
    age: 'mature',
    trunkFrame: 0,
    canopyScale: 1.55,
    canopy: [
      leaf(0, 0, 0.51, 0.47, -0.12),
      leaf(1, 1, 0.7, 0.55, 0.08),
      leaf(2, 0, 0.59, 0.48, -0.03),
      leaf(1, 0, 0.38, 0.32, -0.04, true),
    ],
  },
  {
    id: 'deciduous-young-slender',
    species: 'deciduous',
    age: 'young',
    trunkFrame: 2,
    canopyScale: 1.65,
    canopy: [
      leaf(0, 1, 0.37, 0.5, -0.04),
      leaf(1, 0, 0.33, 0.35, -0.09, true),
      leaf(2, 1, 0.29, 0.37, 0.04),
    ],
  },
  {
    id: 'deciduous-young-dense',
    species: 'deciduous',
    age: 'young',
    trunkFrame: 2,
    canopyScale: 2.05,
    canopy: [
      leaf(0, 0, 0.49, 0.42, -0.07),
      leaf(1, 1, 0.48, 0.4, 0.08),
      leaf(2, 0, 0.43, 0.39, -0.03),
      leaf(0, 1, 0.51, 0.47, 0.05, true),
      leaf(2, 1, 0.47, 0.44, -0.08, true),
    ],
  },
  {
    id: 'deciduous-old-living',
    species: 'deciduous',
    age: 'old',
    trunkFrame: 1,
    canopyScale: 1.8,
    canopy: [
      leaf(0, 0, 0.78, 0.5, -0.14),
      leaf(1, 1, 0.55, 0.42, 0.05),
      leaf(2, 0, 0.59, 0.49, -0.03),
      leaf(0, 1, 0.63, 0.51, 0.08, true),
      leaf(2, 1, 0.37, 0.35, -0.08, true),
    ],
  },
  {
    id: 'conifer-compact',
    species: 'conifer',
    age: 'mature',
    trunkFrame: 3,
    canopyScale: 1.1,
    canopy: [
      tip(2, 0.23, 0.23),
      tip(3, 0.19, 0.2),
      bough(1, 0.29, 0.24),
      bough(2, 0.28, 0.24, true),
      bough(3, 0.34, 0.28),
      bough(4, 0.32, 0.28, true),
      bough(5, 0.38, 0.3),
      bough(6, 0.36, 0.3, true),
    ],
  },
  {
    id: 'conifer-asymmetric',
    species: 'conifer',
    age: 'mature',
    trunkFrame: 3,
    canopyScale: 1,
    canopy: [
      tip(2, 0.22, 0.2),
      tip(3, 0.19, 0.18),
      bough(1, 0.32, 0.22),
      bough(2, 0.24, 0.19, true),
      bough(3, 0.52, 0.3),
      bough(4, 0.3, 0.23, true),
      bough(5, 0.59, 0.31),
      bough(6, 0.38, 0.25, true),
      bough(4, 0.24, 0.24),
    ],
  },
  {
    id: 'conifer-split',
    species: 'conifer',
    age: 'mature',
    trunkFrame: 3,
    canopyScale: 1.15,
    canopy: [
      tip(2, 0.16, 0.17),
      tip(3, 0.15, 0.17),
      bough(1, 0.42, 0.32),
      bough(2, 0.4, 0.33, true),
      bough(3, 0.25, 0.18),
      bough(4, 0.24, 0.18, true),
      bough(5, 0.47, 0.27),
      bough(6, 0.46, 0.26, true),
    ],
  },
  {
    id: 'conifer-young-slender',
    species: 'conifer',
    age: 'young',
    trunkFrame: 3,
    canopyScale: 1.05,
    canopy: [
      tip(2, 0.15, 0.17),
      tip(3, 0.13, 0.15),
      bough(1, 0.2, 0.18),
      bough(2, 0.18, 0.17, true),
      bough(3, 0.27, 0.2),
      bough(4, 0.25, 0.2, true),
    ],
  },
  {
    id: 'conifer-young-dense',
    species: 'conifer',
    age: 'young',
    trunkFrame: 3,
    canopyScale: 1.4,
    canopy: [
      tip(2, 0.2, 0.21),
      tip(3, 0.18, 0.2),
      bough(1, 0.26, 0.22),
      bough(2, 0.25, 0.23, true),
      bough(3, 0.32, 0.26),
      bough(4, 0.3, 0.26, true),
      bough(5, 0.35, 0.28),
      bough(6, 0.34, 0.29, true),
      bough(2, 0.24, 0.28),
    ],
  },
  {
    id: 'conifer-old-living',
    species: 'conifer',
    age: 'old',
    trunkFrame: 3,
    canopyScale: 1.1,
    canopy: [
      tip(2, 0.19, 0.21),
      tip(3, 0.17, 0.19),
      bough(1, 0.31, 0.23),
      bough(2, 0.29, 0.24, true),
      bough(3, 0.5, 0.31),
      bough(4, 0.45, 0.27, true),
      bough(5, 0.58, 0.32),
    ],
  },
];

// Painted lower-crown overlaps cover the measured fork caps; no synthetic pivots.
function leaf(
  attachment: number,
  frame: number,
  width: number,
  height: number,
  facing: number,
  recessed = false,
  curve = 0.075,
): CanopyMass {
  return {
    attachment,
    frame,
    width,
    height,
    facing,
    recessed,
    curve,
    overlapPivot: frame === 0 ? { x: 0.678766, y: 0.710583 } : { x: 0.556931, y: 0.748826 },
  };
}

function bough(attachment: number, width: number, height: number, recessed = false): CanopyMass {
  const extendsLeft = attachment % 2 === 1;
  return {
    attachment,
    width,
    height,
    recessed,
    frame: extendsLeft ? 2 : 3,
    facing: extendsLeft ? -0.08 : 0.06,
    curve: 0.055,
  };
}

function tip(frame: number, width: number, height: number): CanopyMass {
  return {
    attachment: 0,
    frame,
    width,
    height,
    recessed: frame === 3,
    facing: frame === 2 ? -0.05 : 0.06,
    curve: 0.04,
    overlapPivot: frame === 2 ? { x: 0.801181, y: 0.232609 } : { x: 0.118162, y: 0.192641 },
  };
}
