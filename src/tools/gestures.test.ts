import { describe, expect, it } from "vitest";
import {
  createDocument,
  findNode,
  insertChild,
  rectNode,
} from "../core/model/document";
import { commitCreate, commitMove, marqueeSelection } from "./gestures";

const docWith = (id: string) =>
  insertChild(
    createDocument(200, 200),
    "root",
    rectNode({ x: 10, y: 10, width: 20, height: 20, id }),
  );

describe("commitCreate", () => {
  it("builds a rectangle command sized to the drag", () => {
    const doc = createDocument(200, 200);
    const res = commitCreate(doc, "rect", { x: 10, y: 10 }, { x: 40, y: 30 });
    expect(res).not.toBeNull();
    const applied = res!.command.apply(doc);
    const node = findNode(applied, res!.id)!;
    expect(node.type).toBe("rect");
    expect(node.attrs.width).toBe("30");
    expect(node.attrs.height).toBe("20");
  });

  it("builds an ellipse centred in the drag rect", () => {
    const doc = createDocument(200, 200);
    const res = commitCreate(doc, "ellipse", { x: 0, y: 0 }, { x: 40, y: 20 })!;
    const node = findNode(res.command.apply(doc), res.id)!;
    expect(node.type).toBe("ellipse");
    expect(node.attrs.cx).toBe("20");
    expect(node.attrs.rx).toBe("20");
  });

  it("ignores a click-sized drag", () => {
    const doc = createDocument(200, 200);
    expect(commitCreate(doc, "rect", { x: 5, y: 5 }, { x: 5.2, y: 5.1 })).toBeNull();
  });
});

describe("commitMove", () => {
  it("translates selected nodes as one undoable command", () => {
    const doc = docWith("r1");
    const cmd = commitMove(doc, ["r1"], 15, -5)!;
    const moved = cmd.apply(doc);
    expect(findNode(moved, "r1")?.attrs.transform).toBe("translate(15 -5)");
    expect(cmd.invert(moved)).toEqual(doc);
  });

  it("is a no-op for zero movement or empty selection", () => {
    const doc = docWith("r1");
    expect(commitMove(doc, ["r1"], 0, 0)).toBeNull();
    expect(commitMove(doc, [], 5, 5)).toBeNull();
  });
});

describe("marqueeSelection", () => {
  it("returns ids whose bounds intersect the marquee", () => {
    let doc = docWith("inside");
    doc = insertChild(doc, "root", rectNode({ x: 150, y: 150, width: 10, height: 10, id: "outside" }));
    expect(marqueeSelection(doc, { x: 0, y: 0, width: 50, height: 50 })).toEqual(["inside"]);
  });
});
