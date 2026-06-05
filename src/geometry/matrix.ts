import type { Point } from "../core/viewport/Viewport";

/**
 * 2D affine transform, SVG's `matrix(a b c d e f)` convention:
 *   x' = a·x + c·y + e
 *   y' = b·x + d·y + f
 *
 * This is the single representation for all node transforms from Phase 2 on
 * (translate/scale/rotate/skew all collapse to one matrix), which keeps
 * composition — and therefore multi-node transforms and undo — uniform.
 */
export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Combined transform `m · n` (n is applied to a point first, then m). */
export function multiply(m: Matrix, n: Matrix): Matrix {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

export function translation(tx: number, ty: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

export function scaling(sx: number, sy: number): Matrix {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function rotation(radians: number): Matrix {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function applyToPoint(m: Matrix, p: Point): Point {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

/** Scale by (sx, sy) about a fixed point. */
export function scaleAbout(anchor: Point, sx: number, sy: number): Matrix {
  return multiply(
    translation(anchor.x, anchor.y),
    multiply(scaling(sx, sy), translation(-anchor.x, -anchor.y)),
  );
}

/** Rotate by `radians` about a fixed point. */
export function rotateAbout(center: Point, radians: number): Matrix {
  return multiply(
    translation(center.x, center.y),
    multiply(rotation(radians), translation(-center.x, -center.y)),
  );
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Serialize to the most readable equivalent SVG transform string. */
export function toTransform(m: Matrix): string {
  if (m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1) {
    return `translate(${round(m.e)} ${round(m.f)})`;
  }
  return `matrix(${round(m.a)} ${round(m.b)} ${round(m.c)} ${round(m.d)} ${round(m.e)} ${round(m.f)})`;
}

const FUNC = /(\w+)\s*\(([^)]*)\)/g;

function nums(args: string): number[] {
  return args
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number);
}

function functionMatrix(name: string, a: number[]): Matrix {
  switch (name) {
    case "matrix":
      return { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] };
    case "translate":
      return translation(a[0] ?? 0, a[1] ?? 0);
    case "scale":
      return scaling(a[0] ?? 1, a[1] ?? a[0] ?? 1);
    case "rotate":
      return a.length >= 3
        ? rotateAbout({ x: a[1], y: a[2] }, (a[0] * Math.PI) / 180)
        : rotation(((a[0] ?? 0) * Math.PI) / 180);
    default:
      return IDENTITY;
  }
}

/** Parse an SVG transform attribute (a list of functions) into one matrix. */
export function parseMatrix(transform?: string): Matrix {
  if (!transform) return IDENTITY;
  let result = IDENTITY;
  for (const match of transform.matchAll(FUNC)) {
    result = multiply(result, functionMatrix(match[1], nums(match[2])));
  }
  return result;
}
