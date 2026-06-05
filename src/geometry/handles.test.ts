import { describe, expect, it } from "vitest";
import { applyToPoint } from "./matrix";
import { boundsCenter, handlesFor, rotateMatrixFor, scaleMatrixFor } from "./handles";

const box = { x: 0, y: 0, width: 100, height: 100 };

describe("handles", () => {
  it("places eight handles plus a rotation handle above the box", () => {
    const ids = handlesFor(box).map((h) => h.id);
    expect(ids).toEqual(["nw", "n", "ne", "e", "se", "s", "sw", "w", "rotate"]);
    const rotate = handlesFor(box).find((h) => h.id === "rotate")!;
    expect(rotate.y).toBeLessThan(box.y);
    expect(rotate.x).toBe(50);
  });

  it("scaling the SE handle pins the NW corner", () => {
    const m = scaleMatrixFor("se", box, { start: { x: 100, y: 100 }, current: { x: 200, y: 150 } }, false);
    expect(applyToPoint(m, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(applyToPoint(m, { x: 100, y: 100 })).toEqual({ x: 200, y: 150 });
  });

  it("edge handles scale only one axis", () => {
    const m = scaleMatrixFor("e", box, { start: { x: 100, y: 50 }, current: { x: 150, y: 999 } }, false);
    expect(applyToPoint(m, { x: 100, y: 0 }).x).toBe(150);
    expect(applyToPoint(m, { x: 0, y: 100 }).y).toBe(100); // y unchanged
  });

  it("aspect lock makes a corner drag uniform", () => {
    const m = scaleMatrixFor("se", box, { start: { x: 100, y: 100 }, current: { x: 300, y: 150 } }, true);
    expect(m.a).toBe(m.d);
  });

  it("rotateMatrixFor rotates about the centre and can snap", () => {
    const c = boundsCenter(box);
    const m = rotateMatrixFor(box, { start: { x: c.x + 10, y: c.y }, current: { x: c.x, y: c.y + 10 } }, false);
    const p = applyToPoint(m, { x: c.x + 10, y: c.y });
    expect(p.x).toBeCloseTo(c.x, 6);
    expect(p.y).toBeCloseTo(c.y + 10, 6);
    const snapped = rotateMatrixFor(box, { start: { x: c.x + 10, y: c.y }, current: { x: c.x + 10, y: c.y + 1 } }, true);
    expect(snapped).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }); // < 7.5° snaps to 0
  });
});
