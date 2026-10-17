/** Fixed optical centre for a painted perspective scene; navigation crops this reference view. */
export interface PerspectiveReference {
  readonly targetX: number;
  readonly targetZ: number;
  readonly distance: number;
}

/** Project a world point onto the camera's reference image plane, in ground-equivalent units. */
export function projectCameraPoint(
  point: { readonly x: number; readonly y: number; readonly z: number },
  reference: PerspectiveReference,
  elevation: number,
  azimuth = 0,
): { readonly x: number; readonly z: number } {
  const dx = point.x - reference.targetX;
  const dz = point.z - reference.targetZ;
  const right = dx * Math.cos(azimuth) + dz * Math.sin(azimuth);
  const forward = -dx * Math.sin(azimuth) + dz * Math.cos(azimuth);
  const depth = reference.distance + forward * Math.cos(elevation) - point.y * Math.sin(elevation);
  const scale = reference.distance / depth;
  const up = (forward * Math.sin(elevation) + point.y * Math.cos(elevation)) * scale;
  return {
    x:
      reference.targetX +
      right * scale * Math.cos(azimuth) -
      (up / Math.sin(elevation)) * Math.sin(azimuth),
    z:
      reference.targetZ +
      right * scale * Math.sin(azimuth) +
      (up / Math.sin(elevation)) * Math.cos(azimuth),
  };
}
