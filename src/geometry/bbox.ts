import type { SceneNode } from "../core/model/types";
import type { Point } from "../core/viewport/Viewport";
import { applyToPoint, parseMatrix, type Matrix } from "./matrix";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Axis-aligned rect from two corner points (in any order). */
export function normalizeRect(a: Point, b: Point): Bounds {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** Untransformed bounds of a node, from its geometry attributes alone. */
export function localBounds(node: SceneNode): Bounds | null {
  const n = (key: string): number => Number(node.attrs[key] ?? 0);
  if (node.type === "rect") {
    return { x: n("x"), y: n("y"), width: n("width"), height: n("height") };
  }
  if (node.type === "ellipse") {
    return { x: n("cx") - n("rx"), y: n("cy") - n("ry"), width: 2 * n("rx"), height: 2 * n("ry") };
  }
  return null;
}

/** Axis-aligned bounding box of `b` after applying matrix `m`. */
export function transformBounds(m: Matrix, b: Bounds): Bounds {
  const corners = [
    applyToPoint(m, { x: b.x, y: b.y }),
    applyToPoint(m, { x: b.x + b.width, y: b.y }),
    applyToPoint(m, { x: b.x + b.width, y: b.y + b.height }),
    applyToPoint(m, { x: b.x, y: b.y + b.height }),
  ];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/**
 * World-space axis-aligned bounds of a node, accounting for its full transform.
 * Containers (`g`, `svg`) fall back to the union of their children's bounds.
 * Returns `null` for nodes whose geometry we don't yet measure.
 */
export function nodeBounds(node: SceneNode): Bounds | null {
  const m = parseMatrix(node.attrs.transform);
  const local = localBounds(node);
  if (local) return transformBounds(m, local);
  const childBounds = node.children
    .map(nodeBounds)
    .filter((b): b is Bounds => b !== null);
  const union = unionBounds(childBounds);
  return union ? transformBounds(m, union) : null;
}

export function unionBounds(list: Bounds[]): Bounds | null {
  if (list.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of list) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Do two axis-aligned rects overlap (touching edges do not count)? */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
