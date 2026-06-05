import { describe, expect, it } from "vitest";
import { ellipseNode, rectNode, type SceneNode } from "../core/model/document";
import {
  boundsIntersect,
  localBounds,
  nodeBounds,
  normalizeRect,
  transformBounds,
  unionBounds,
} from "./bbox";
import { rotation, translation } from "./matrix";

const rect = (id: string) => rectNode({ x: 10, y: 10, width: 20, height: 30, id });

describe("bbox", () => {
  it("normalizes a rect from two corners in any order", () => {
    expect(normalizeRect({ x: 30, y: 40 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20, width: 20, height: 20 });
  });

  it("reads local bounds for rect and ellipse", () => {
    expect(localBounds(rect("r"))).toEqual({ x: 10, y: 10, width: 20, height: 30 });
    expect(localBounds(ellipseNode({ cx: 50, cy: 50, rx: 10, ry: 5, id: "e" }))).toEqual({
      x: 40,
      y: 45,
      width: 20,
      height: 10,
    });
  });

  it("applies a node transform to its bounds", () => {
    const moved = { ...rect("r"), attrs: { ...rect("r").attrs, transform: "translate(5 5)" } };
    expect(nodeBounds(moved)).toEqual({ x: 15, y: 15, width: 20, height: 30 });
  });

  it("approximates text bounds from font-size and length", () => {
    const t: SceneNode = { id: "t", type: "text", attrs: { x: "10", y: "20", "font-size": "10" }, text: "abcd", children: [] };
    const b = nodeBounds(t)!;
    expect(b.x).toBe(10);
    expect(b.y).toBe(10); // y - font-size (baseline)
    expect(b.width).toBeGreaterThan(0);
  });

  it("measures container (group) bounds from children", () => {
    const group: SceneNode = {
      id: "g",
      type: "g",
      attrs: { transform: "translate(100 0)" },
      children: [rect("a")],
    };
    expect(nodeBounds(group)).toEqual({ x: 110, y: 10, width: 20, height: 30 });
  });

  it("transformBounds returns the AABB of a rotated rect", () => {
    const b = transformBounds(rotation(Math.PI / 2), { x: 0, y: 0, width: 10, height: 20 });
    expect(b.width).toBeCloseTo(20, 6);
    expect(b.height).toBeCloseTo(10, 6);
  });

  it("unions bounds and detects overlap", () => {
    expect(unionBounds([{ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 5, width: 10, height: 10 }])).toEqual({
      x: 0,
      y: 0,
      width: 30,
      height: 15,
    });
    expect(unionBounds([])).toBeNull();
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(boundsIntersect(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(boundsIntersect(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
  });

  it("translation matrix preserves a rect exactly", () => {
    expect(transformBounds(translation(3, 4), { x: 1, y: 1, width: 2, height: 2 })).toEqual({
      x: 4,
      y: 5,
      width: 2,
      height: 2,
    });
  });
});
