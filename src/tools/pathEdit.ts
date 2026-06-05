import type { Point } from "../core/viewport/Viewport";
import { clonePath, type SubPath } from "../geometry/path";

/** Identifies one anchor within a parsed path. */
export interface NodeRef {
  si: number;
  ai: number;
}

export type HandleKind = "point" | "in" | "out";

function anchorAt(subs: SubPath[], ref: NodeRef) {
  return subs[ref.si]?.anchors[ref.ai];
}

/** Move an anchor (and its handles) by a delta. Returns new sub-paths. */
export function translateAnchor(subs: SubPath[], ref: NodeRef, delta: Point): SubPath[] {
  const next = clonePath(subs);
  const a = anchorAt(next, ref);
  if (!a) return subs;
  for (const p of [a.point, a.in, a.out]) {
    if (p) {
      p.x += delta.x;
      p.y += delta.y;
    }
  }
  return next;
}

/** Set one control handle of an anchor, optionally mirroring the opposite one. */
export function setHandle(
  subs: SubPath[],
  ref: NodeRef,
  to: Point,
  opts: { which: "in" | "out"; mirror: boolean },
): SubPath[] {
  const next = clonePath(subs);
  const a = anchorAt(next, ref);
  if (!a) return subs;
  a[opts.which] = { x: to.x, y: to.y };
  if (opts.mirror) {
    const other = opts.which === "in" ? "out" : "in";
    a[other] = { x: 2 * a.point.x - to.x, y: 2 * a.point.y - to.y };
  }
  return next;
}

/** Remove an anchor; empty sub-paths are dropped. */
export function deleteAnchor(subs: SubPath[], ref: NodeRef): SubPath[] {
  const next = clonePath(subs);
  if (!next[ref.si]) return subs;
  next[ref.si].anchors.splice(ref.ai, 1);
  return next.filter((s) => s.anchors.length > 0);
}

/** Nearest anchor point or handle within `tol` of `q`, or null. */
export function hitTest(subs: SubPath[], q: Point, tol: number): { ref: NodeRef; which: HandleKind } | null {
  let best: { ref: NodeRef; which: HandleKind } | null = null;
  let bestD = tol * tol;
  const consider = (ref: NodeRef, which: HandleKind, p: Point | undefined) => {
    if (!p) return;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = { ref, which };
    }
  };
  subs.forEach((sub, si) =>
    sub.anchors.forEach((a, ai) => {
      consider({ si, ai }, "in", a.in);
      consider({ si, ai }, "out", a.out);
      consider({ si, ai }, "point", a.point);
    }),
  );
  return best;
}
