import { describe, expect, it } from "vitest";
import {
  applyToPoint,
  IDENTITY,
  multiply,
  parseMatrix,
  rotateAbout,
  rotation,
  scaleAbout,
  scaling,
  toTransform,
  translation,
} from "./matrix";

describe("matrix", () => {
  it("applies translate/scale/rotate to points", () => {
    expect(applyToPoint(translation(5, -3), { x: 1, y: 1 })).toEqual({ x: 6, y: -2 });
    expect(applyToPoint(scaling(2, 3), { x: 4, y: 5 })).toEqual({ x: 8, y: 15 });
    const r = applyToPoint(rotation(Math.PI / 2), { x: 1, y: 0 });
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.y).toBeCloseTo(1, 6);
  });

  it("multiplies so the right operand applies first", () => {
    const m = multiply(translation(10, 0), scaling(2, 2));
    expect(applyToPoint(m, { x: 1, y: 0 })).toEqual({ x: 12, y: 0 });
  });

  it("scaleAbout keeps the anchor point fixed", () => {
    const anchor = { x: 5, y: 5 };
    expect(applyToPoint(scaleAbout(anchor, 3, 3), anchor)).toEqual(anchor);
  });

  it("rotateAbout keeps the centre fixed", () => {
    const c = { x: 2, y: 7 };
    const p = applyToPoint(rotateAbout(c, 1.2), c);
    expect(p.x).toBeCloseTo(c.x, 6);
    expect(p.y).toBeCloseTo(c.y, 6);
  });

  it("serializes identity/translate nicely and matrices fully", () => {
    expect(toTransform(IDENTITY)).toBe("translate(0 0)");
    expect(toTransform(translation(3, 4))).toBe("translate(3 4)");
    expect(toTransform(scaling(2, 2))).toBe("matrix(2 0 0 2 0 0)");
  });

  it("parses a transform list into one matrix", () => {
    expect(parseMatrix(undefined)).toEqual(IDENTITY);
    expect(parseMatrix("translate(5 5)")).toEqual(translation(5, 5));
    const combined = parseMatrix("translate(10 0) scale(2 2)");
    expect(applyToPoint(combined, { x: 1, y: 1 })).toEqual({ x: 12, y: 2 });
    const rot = parseMatrix("rotate(90)");
    expect(applyToPoint(rot, { x: 1, y: 0 }).y).toBeCloseTo(1, 6);
  });

  it("round-trips a matrix through toTransform/parseMatrix", () => {
    const m = scaleAbout({ x: 3, y: 4 }, 1.5, 2);
    const back = parseMatrix(toTransform(m));
    expect(back.a).toBeCloseTo(m.a, 6);
    expect(back.e).toBeCloseTo(m.e, 6);
  });
});
