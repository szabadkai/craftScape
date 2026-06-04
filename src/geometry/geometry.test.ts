import { describe, expect, it } from "vitest";
import { rectNode, ellipseNode } from "../core/model/document";
import { boundsIntersect, nodeBounds, normalizeRect } from "./bbox";
import { composeTranslate, parseTranslate } from "./transform";

describe("transform", () => {
  it("parses translate with two or one argument", () => {
    expect(parseTranslate("translate(5 -3)")).toEqual({ tx: 5, ty: -3 });
    expect(parseTranslate("translate(4, 6)")).toEqual({ tx: 4, ty: 6 });
    expect(parseTranslate("translate(7)")).toEqual({ tx: 7, ty: 0 });
    expect(parseTranslate(undefined)).toEqual({ tx: 0, ty: 0 });
    expect(parseTranslate("rotate(10)")).toEqual({ tx: 0, ty: 0 });
  });

  it("accumulates translation deltas", () => {
    expect(composeTranslate(undefined, 5, 5)).toBe("translate(5 5)");
    expect(composeTranslate("translate(10 10)", -3, 2)).toBe("translate(7 12)");
  });
});

describe("bbox", () => {
  it("normalizes a rect from two corners in any order", () => {
    expect(normalizeRect({ x: 30, y: 40 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 20,
    });
  });

  it("computes node bounds for rect and ellipse, including translation", () => {
    const rect = rectNode({ x: 10, y: 10, width: 20, height: 30, id: "r" });
    expect(nodeBounds(rect)).toEqual({ x: 10, y: 10, width: 20, height: 30 });

    const moved = { ...rect, attrs: { ...rect.attrs, transform: "translate(5 5)" } };
    expect(nodeBounds(moved)).toEqual({ x: 15, y: 15, width: 20, height: 30 });

    const ell = ellipseNode({ cx: 50, cy: 50, rx: 10, ry: 5, id: "e" });
    expect(nodeBounds(ell)).toEqual({ x: 40, y: 45, width: 20, height: 10 });
  });

  it("returns null for unsupported node types", () => {
    expect(nodeBounds({ id: "g", type: "g", attrs: {}, children: [] })).toBeNull();
  });

  it("detects overlap but not mere edge-touching", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(boundsIntersect(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(boundsIntersect(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
  });
});
