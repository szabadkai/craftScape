import type { SvgDocument } from "../core/model/document";
import type { Point } from "../core/viewport/Viewport";
import { nodeBounds } from "../geometry/bbox";
import { snapBounds, type SnapResult } from "../geometry/snap";
import { selectionBounds } from "./gestures";

const GRID = 20;
const TOLERANCE = 6; // document units

/**
 * Snap a move: given the raw drag delta, return an adjusted delta (and guides)
 * that aligns the selection's bounding box to the grid or to other objects'
 * edges and centres.
 */
export function snapMove(doc: SvgDocument, ids: string[], delta: Point, tol = TOLERANCE): SnapResult {
  const base = selectionBounds(doc, ids);
  if (!base) return { dx: 0, dy: 0, guides: [] };
  const moving = { x: base.x + delta.x, y: base.y + delta.y, width: base.width, height: base.height };
  const sel = new Set(ids);
  const x: number[] = [];
  const y: number[] = [];
  for (const child of doc.children) {
    if (sel.has(child.id)) continue;
    const b = nodeBounds(child);
    if (!b) continue;
    x.push(b.x, b.x + b.width / 2, b.x + b.width);
    y.push(b.y, b.y + b.height / 2, b.y + b.height);
  }
  return snapBounds(moving, { x, y }, GRID, tol);
}
