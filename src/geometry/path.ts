import type { Point } from "../core/viewport/Viewport";
import { flattenCubic } from "./bezier";
import { parsePath } from "./pathParse";

/**
 * A path is modelled as a list of sub-paths, each a sequence of anchors with
 * optional absolute Bézier handles (`in` toward the anchor, `out` away from it).
 * This is the paper.js-style representation: it round-trips SVG path data and is
 * the natural unit for node editing. See {@link parsePath} for the inverse.
 */
export interface Anchor {
  point: Point;
  in?: Point;
  out?: Point;
}

export interface SubPath {
  closed: boolean;
  anchors: Anchor[];
}

export { parsePath };

function r(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pt(p: Point): string {
  return `${r(p.x)} ${r(p.y)}`;
}

function segment(a: Anchor, b: Anchor): string {
  if (a.out || b.in) {
    return `C ${pt(a.out ?? a.point)} ${pt(b.in ?? b.point)} ${pt(b.point)}`;
  }
  return `L ${pt(b.point)}`;
}

/** Serialize sub-paths to an SVG path `d` string (absolute M/L/C/Z). */
export function serializePath(subs: SubPath[]): string {
  const parts: string[] = [];
  for (const sub of subs) {
    if (sub.anchors.length === 0) continue;
    parts.push(`M ${pt(sub.anchors[0].point)}`);
    for (let i = 1; i < sub.anchors.length; i++) parts.push(segment(sub.anchors[i - 1], sub.anchors[i]));
    if (sub.closed && sub.anchors.length > 1) {
      // Only emit the closing segment explicitly when it is a curve; a straight
      // close is implied by Z (emitting `L start` would duplicate on reparse).
      const closing = segment(sub.anchors[sub.anchors.length - 1], sub.anchors[0]);
      if (closing.startsWith("C")) parts.push(closing);
      parts.push("Z");
    }
  }
  return parts.join(" ");
}

/** Flatten a path to polyline points (for bounds and hit-testing). */
export function pathPolyline(subs: SubPath[], steps = 16): Point[] {
  const points: Point[] = [];
  const addSegment = (a: Anchor, b: Anchor) => {
    if (a.out || b.in) points.push(...flattenCubic([a.point, a.out ?? a.point, b.in ?? b.point, b.point], steps));
    else points.push(b.point);
  };
  for (const sub of subs) {
    if (sub.anchors.length === 0) continue;
    points.push(sub.anchors[0].point);
    for (let i = 1; i < sub.anchors.length; i++) addSegment(sub.anchors[i - 1], sub.anchors[i]);
    if (sub.closed && sub.anchors.length > 1) addSegment(sub.anchors[sub.anchors.length - 1], sub.anchors[0]);
  }
  return points;
}

/** Deep clone of sub-paths (for immutable edits in the node tool). */
export function clonePath(subs: SubPath[]): SubPath[] {
  return subs.map((s) => ({
    closed: s.closed,
    anchors: s.anchors.map((a) => ({ point: { ...a.point }, in: a.in && { ...a.in }, out: a.out && { ...a.out } })),
  }));
}
