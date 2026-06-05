import type { Point } from "../core/viewport/Viewport";

/** A cubic Bézier as its four control points [start, c1, c2, end]. */
export type Cubic = readonly [Point, Point, Point, Point];

/** Point on a cubic Bézier at parameter `t` in [0, 1]. */
export function cubicPoint([p0, p1, p2, p3]: Cubic, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** Sample a cubic into `steps` line points (excluding the start, including the end). */
export function flattenCubic(cubic: Cubic, steps = 16): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) points.push(cubicPoint(cubic, i / steps));
  return points;
}

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Squared distance from `q` to the nearest point on the cubic, found by coarse
 * sampling then a local refinement — accurate enough for hit-testing.
 */
export function cubicNearestDist2(cubic: Cubic, q: Point, steps = 24): number {
  let best = Infinity;
  let bestT = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const d = dist2(cubicPoint(cubic, t), q);
    if (d < best) {
      best = d;
      bestT = t;
    }
  }
  const span = 1 / steps;
  for (let i = -4; i <= 4; i++) {
    const t = Math.min(1, Math.max(0, bestT + (i / 4) * span));
    best = Math.min(best, dist2(cubicPoint(cubic, t), q));
  }
  return best;
}
