import { describe, expect, it } from "vitest";
import { ellipseNode, rectNode } from "../core/model/document";
import { nodeBounds } from "./bbox";
import { nodeToPathD } from "./shapeToPath";

describe("shapeToPath", () => {
  it("converts a rect to a closed four-point path", () => {
    const d = nodeToPathD(rectNode({ x: 10, y: 20, width: 30, height: 40, id: "r" }))!;
    expect(d).toBe("M 10 20 L 40 20 L 40 60 L 10 60 Z");
  });

  it("converts an ellipse to four cubic arcs that preserve its bounds", () => {
    const ell = ellipseNode({ cx: 50, cy: 50, rx: 20, ry: 10, id: "e" });
    const d = nodeToPathD(ell)!;
    expect(d.startsWith("M 70 50")).toBe(true);
    const pathNode = { id: "e", type: "path", attrs: { d }, children: [] };
    const b = nodeBounds(pathNode)!;
    expect(b.x).toBeCloseTo(30, 3);
    expect(b.width).toBeCloseTo(40, 3);
    expect(b.height).toBeCloseTo(20, 3);
  });

  it("returns null for nodes that are not rect/ellipse", () => {
    expect(nodeToPathD({ id: "g", type: "g", attrs: {}, children: [] })).toBeNull();
  });
});
