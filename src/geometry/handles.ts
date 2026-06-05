import type { Point } from "../core/viewport/Viewport";
import type { Bounds } from "./bbox";
import { rotateAbout, scaleAbout, type Matrix } from "./matrix";

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

export interface Handle {
  id: HandleId;
  x: number;
  y: number;
}

/** A drag in progress: where it began and where the pointer is now. */
export interface Drag {
  start: Point;
  current: Point;
}

/** How far above the box (in document units) the rotation handle sits. */
export const ROTATE_OFFSET = 26;

/** The eight scale handles plus the rotation handle, in document space. */
export function handlesFor(b: Bounds): Handle[] {
  const l = b.x;
  const r = b.x + b.width;
  const t = b.y;
  const bot = b.y + b.height;
  const mx = b.x + b.width / 2;
  const my = b.y + b.height / 2;
  return [
    { id: "nw", x: l, y: t },
    { id: "n", x: mx, y: t },
    { id: "ne", x: r, y: t },
    { id: "e", x: r, y: my },
    { id: "se", x: r, y: bot },
    { id: "s", x: mx, y: bot },
    { id: "sw", x: l, y: bot },
    { id: "w", x: l, y: my },
    { id: "rotate", x: mx, y: t - ROTATE_OFFSET },
  ];
}

export function boundsCenter(b: Bounds): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** The fixed (opposite) point a scale handle pivots around. */
function anchorFor(id: HandleId, b: Bounds): Point {
  const l = b.x;
  const r = b.x + b.width;
  const t = b.y;
  const bot = b.y + b.height;
  const mx = b.x + b.width / 2;
  const my = b.y + b.height / 2;
  const map: Record<string, Point> = {
    nw: { x: r, y: bot },
    ne: { x: l, y: bot },
    se: { x: l, y: t },
    sw: { x: r, y: t },
    n: { x: mx, y: bot },
    s: { x: mx, y: t },
    e: { x: l, y: my },
    w: { x: r, y: my },
  };
  return map[id];
}

function axes(id: HandleId): { x: boolean; y: boolean } {
  return {
    x: id === "e" || id === "w" || id.length === 2,
    y: id === "n" || id === "s" || id.length === 2,
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

/**
 * Matrix that scales the selection as a `handle` is dragged from `start` to
 * `current`, pinning the opposite edge/corner. With `aspect`, corner drags
 * scale uniformly.
 */
export function scaleMatrixFor(id: HandleId, b: Bounds, drag: Drag, aspect: boolean): Matrix {
  const anchor = anchorFor(id, b);
  const axis = axes(id);
  let sx = axis.x ? ratio(drag.current.x - anchor.x, drag.start.x - anchor.x) : 1;
  let sy = axis.y ? ratio(drag.current.y - anchor.y, drag.start.y - anchor.y) : 1;
  if (aspect && axis.x && axis.y) {
    const s = Math.max(Math.abs(sx), Math.abs(sy));
    sx = Math.sign(sx || 1) * s;
    sy = Math.sign(sy || 1) * s;
  }
  return scaleAbout(anchor, sx, sy);
}

/** Matrix that rotates the selection about its centre, optionally snapped to 15°. */
export function rotateMatrixFor(b: Bounds, drag: Drag, snap: boolean): Matrix {
  const c = boundsCenter(b);
  const a0 = Math.atan2(drag.start.y - c.y, drag.start.x - c.x);
  const a1 = Math.atan2(drag.current.y - c.y, drag.current.x - c.x);
  let angle = a1 - a0;
  if (snap) {
    const step = Math.PI / 12;
    angle = Math.round(angle / step) * step;
  }
  return rotateAbout(c, angle);
}
