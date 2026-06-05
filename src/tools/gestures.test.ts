import { describe, expect, it } from "vitest";
import { createDocument, findNode, insertChild, rectNode } from "../core/model/document";
import { scaling, translation } from "../geometry/matrix";
import {
  commitCreate,
  commitOffsets,
  commitTransform,
  gestureMatrix,
  marqueeSelection,
  selectionBounds,
} from "./gestures";

const docWith = (id: string) =>
  insertChild(createDocument(200, 200), "root", rectNode({ x: 10, y: 10, width: 20, height: 20, id }));

describe("commitCreate", () => {
  it("builds a rectangle command sized to the drag", () => {
    const doc = createDocument(200, 200);
    const res = commitCreate(doc, "rect", { x: 10, y: 10 }, { x: 40, y: 30 })!;
    const node = findNode(res.command.apply(doc), res.id)!;
    expect(node.type).toBe("rect");
    expect(node.attrs.width).toBe("30");
  });

  it("ignores a click-sized drag", () => {
    const doc = createDocument(200, 200);
    expect(commitCreate(doc, "rect", { x: 5, y: 5 }, { x: 5.2, y: 5.1 })).toBeNull();
  });
});

describe("commitTransform", () => {
  it("translates selected nodes as one undoable command", () => {
    const doc = docWith("r1");
    const cmd = commitTransform(doc, ["r1"], translation(15, -5))!;
    const moved = cmd.apply(doc);
    expect(findNode(moved, "r1")?.attrs.transform).toBe("translate(15 -5)");
    expect(cmd.invert(moved)).toEqual(doc);
  });

  it("applies a scale as a matrix and is invertible", () => {
    const doc = docWith("r1");
    const cmd = commitTransform(doc, ["r1"], scaling(2, 2))!;
    const scaled = cmd.apply(doc);
    expect(findNode(scaled, "r1")?.attrs.transform).toBe("matrix(2 0 0 2 0 0)");
    expect(cmd.invert(scaled)).toEqual(doc);
  });

  it("is a no-op for an identity transform or empty selection", () => {
    const doc = docWith("r1");
    expect(commitTransform(doc, ["r1"], translation(0, 0))).toBeNull();
    expect(commitTransform(doc, [], scaling(2, 2))).toBeNull();
  });
});

describe("commitOffsets", () => {
  it("moves each node by its own delta", () => {
    const doc = docWith("r1");
    const cmd = commitOffsets(doc, [{ id: "r1", dx: 5, dy: 0 }])!;
    expect(findNode(cmd.apply(doc), "r1")?.attrs.transform).toBe("translate(5 0)");
  });

  it("is a no-op when every delta is zero", () => {
    expect(commitOffsets(docWith("r1"), [{ id: "r1", dx: 0, dy: 0 }])).toBeNull();
  });
});

describe("selectionBounds & marquee", () => {
  it("unions the bounds of selected nodes", () => {
    let doc = docWith("r1");
    doc = insertChild(doc, "root", rectNode({ x: 50, y: 50, width: 10, height: 10, id: "r2" }));
    expect(selectionBounds(doc, ["r1", "r2"])).toEqual({ x: 10, y: 10, width: 50, height: 50 });
    expect(selectionBounds(doc, [])).toBeNull();
  });

  it("selects nodes intersecting the marquee", () => {
    let doc = docWith("inside");
    doc = insertChild(doc, "root", rectNode({ x: 150, y: 150, width: 10, height: 10, id: "outside" }));
    expect(marqueeSelection(doc, { x: 0, y: 0, width: 50, height: 50 })).toEqual(["inside"]);
  });
});

describe("gestureMatrix", () => {
  it("derives a translation from a move gesture", () => {
    const m = gestureMatrix(
      { kind: "move", start: { x: 0, y: 0 }, current: { x: 4, y: 6 }, ids: ["r1"] },
      { aspect: false, snap: false },
    );
    expect(m).toEqual(translation(4, 6));
  });
});
