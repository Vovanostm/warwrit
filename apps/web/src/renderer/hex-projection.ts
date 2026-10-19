/** Pointy-top axial grid; adjacent centres are one world unit apart. */
export const HEX_RADIUS = 1 / Math.sqrt(3);
/** Visible terrain rise per canonical height level; shared by tops, figures, grid and picking. */
export const BATTLE_HEIGHT_STEP = 0.28;

export function hexToWorld(
  q: number,
  r: number,
  spacing = 1,
): { readonly x: number; readonly z: number } {
  return { x: (q + r / 2) * spacing, z: (r * Math.sqrt(3) * spacing) / 2 };
}

/** Inverse of the battle grid's x=q+r/2, z=r*sqrt(3)/2, with cube rounding. */
export function worldToHex(
  x: number,
  z: number,
  spacing = 1,
): { readonly q: number; readonly r: number } {
  x /= spacing;
  z /= spacing;
  const r = (2 * z) / Math.sqrt(3);
  const q = x - r * 0.5;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 };
}
