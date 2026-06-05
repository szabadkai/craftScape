import { describe, expect, it } from "vitest";
import { cubicNearestDist2, cubicPoint, flattenCubic, type Cubic } from "./bezier";

const straight: Cubic = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 0 },
];

describe("bezier", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(cubicPoint(straight, 0)).toEqual({ x: 0, y: 0 });
    expect(cubicPoint(straight, 1)).toEqual({ x: 10, y: 0 });
  });

  it("evaluates the midpoint of a straight cubic", () => {
    expect(cubicPoint(straight, 0.5)).toEqual({ x: 5, y: 0 });
  });

  it("flattens into the requested number of points", () => {
    const pts = flattenCubic(straight, 8);
    expect(pts).toHaveLength(8);
    expect(pts[7]).toEqual({ x: 10, y: 0 });
  });

  it("measures near-zero distance for a point on the curve", () => {
    expect(cubicNearestDist2(straight, { x: 5, y: 0 })).toBeCloseTo(0, 4);
    expect(cubicNearestDist2(straight, { x: 5, y: 3 })).toBeGreaterThan(0);
  });
});
