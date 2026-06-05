import { describe, expect, it } from "vitest";
import { snapBounds } from "./snap";

const box = { x: 12, y: 50, width: 20, height: 20 };

describe("snapBounds", () => {
  it("snaps the left edge to a candidate within tolerance", () => {
    const r = snapBounds(box, { x: [10], y: [] }, null, 6);
    expect(r.dx).toBe(-2); // 12 -> 10
    expect(r.guides).toEqual([{ axis: "x", pos: 10 }]);
  });

  it("snaps to the grid when no candidate is closer", () => {
    const r = snapBounds(box, { x: [], y: [] }, 20, 6);
    expect(r.dx).toBe(-2); // centre 22 -> grid line 20
  });

  it("ignores candidates outside the tolerance", () => {
    const r = snapBounds(box, { x: [40], y: [200] }, null, 6);
    expect(r).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it("snaps both axes independently", () => {
    const r = snapBounds(box, { x: [32], y: [48] }, null, 6);
    // right edge 32 already a candidate -> dx 0; top 50 -> 48 -> dy -2
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(-2);
  });
});
