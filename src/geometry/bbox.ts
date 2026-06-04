import type { SceneNode } from "../core/model/types";
import type { Point } from "../core/viewport/Viewport";
import { parseTranslate } from "./transform";

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

/**
 * Axis-aligned document-space bounds of a node, accounting for a `translate`
 * transform. Returns `null` for node types whose bounds we don't yet compute
 * (anything beyond rect/ellipse arrives in later phases).
 */
export function nodeBounds(node: SceneNode): Bounds | null {
  const { tx, ty } = parseTranslate(node.attrs.transform);
  const n = (key: string): number => Number(node.attrs[key] ?? 0);
  if (node.type === "rect") {
    return { x: n("x") + tx, y: n("y") + ty, width: n("width"), height: n("height") };
  }
  if (node.type === "ellipse") {
    return {
      x: n("cx") - n("rx") + tx,
      y: n("cy") - n("ry") + ty,
      width: 2 * n("rx"),
      height: 2 * n("ry"),
    };
  }
  return null;
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
