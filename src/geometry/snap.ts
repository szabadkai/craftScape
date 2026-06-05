import type { Bounds } from "./bbox";

/** A snap line: a vertical guide (`axis: "x"`) or horizontal guide (`axis: "y"`). */
export interface SnapGuide {
  axis: "x" | "y";
  pos: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

interface Best {
  delta: number;
  pos: number;
}

/** Smallest adjustment that snaps one of `keys` to a candidate or grid line. */
function bestSnap(keys: number[], candidates: number[], grid: number | null, tol: number): Best | null {
  let best: Best | null = null;
  const consider = (pos: number, key: number) => {
    const delta = pos - key;
    if (Math.abs(delta) <= tol && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, pos };
  };
  for (const key of keys) {
    for (const c of candidates) consider(c, key);
    if (grid) consider(Math.round(key / grid) * grid, key);
  }
  return best;
}

/**
 * Snap a moving rect to candidate edges/centres and an optional grid. Each axis
 * snaps independently using the box's left/centre/right (and top/middle/bottom)
 * as keys, picking the smallest in-tolerance adjustment.
 */
export interface SnapCandidates {
  x: number[];
  y: number[];
}

export function snapBounds(moving: Bounds, candidates: SnapCandidates, grid: number | null, tol: number): SnapResult {
  const keysX = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const keysY = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];
  const sx = bestSnap(keysX, candidates.x, grid, tol);
  const sy = bestSnap(keysY, candidates.y, grid, tol);
  const guides: SnapGuide[] = [];
  if (sx) guides.push({ axis: "x", pos: sx.pos });
  if (sy) guides.push({ axis: "y", pos: sy.pos });
  return { dx: sx ? sx.delta : 0, dy: sy ? sy.delta : 0, guides };
}
