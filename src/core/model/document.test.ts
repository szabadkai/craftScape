import { describe, expect, it } from "vitest";
import {
  childIndex,
  cloneWithNewIds,
  createDocument,
  ellipseNode,
  findNode,
  findParent,
  insertChild,
  orderChildren,
  rectNode,
  removeNode,
  reorderChild,
  setAttrs,
} from "./document";

function docWithRect() {
  const doc = createDocument(800, 600);
  const rect = rectNode({ x: 10, y: 20, width: 30, height: 40, id: "r1" });
  return { doc: insertChild(doc, doc.id, rect), rect };
}

describe("document model", () => {
  it("creates a document whose root carries the viewBox", () => {
    const doc = createDocument(800, 600);
    expect(doc.type).toBe("svg");
    expect(doc.attrs.viewBox).toBe("0 0 800 600");
    expect(doc.children).toHaveLength(0);
  });

  it("inserts children and finds them by id", () => {
    const { doc, rect } = docWithRect();
    expect(doc.children).toHaveLength(1);
    expect(findNode(doc, "r1")).toEqual(rect);
    expect(findParent(doc, "r1")?.id).toBe("root");
    expect(childIndex(doc, "r1")).toBe(0);
  });

  it("respects an explicit insert index", () => {
    let doc = createDocument(10, 10);
    doc = insertChild(doc, doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "a" }));
    doc = insertChild(doc, doc.id, ellipseNode({ cx: 0, cy: 0, rx: 1, ry: 1, id: "b" }), 0);
    expect(doc.children.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("merges and deletes attributes", () => {
    const { doc } = docWithRect();
    const moved = setAttrs(doc, "r1", { transform: "translate(5 5)", fill: null });
    const node = findNode(moved, "r1");
    expect(node?.attrs.transform).toBe("translate(5 5)");
    expect(node?.attrs.fill).toBeUndefined();
    // original tree is untouched (immutability)
    expect(findNode(doc, "r1")?.attrs.fill).toBe("#4f8cff");
  });

  it("removes nodes but never the root", () => {
    const { doc } = docWithRect();
    expect(removeNode(doc, "r1").children).toHaveLength(0);
    expect(removeNode(doc, "root")).toBe(doc);
  });

  it("reorders a child within its parent", () => {
    let doc = createDocument(10, 10);
    doc = insertChild(doc, doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "a" }));
    doc = insertChild(doc, doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "b" }));
    doc = insertChild(doc, doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "c" }));
    expect(reorderChild(doc, "a", 2).children.map((n) => n.id)).toEqual(["b", "c", "a"]);
    expect(orderChildren(doc, doc.id, ["c", "b", "a"]).children.map((n) => n.id)).toEqual(["c", "b", "a"]);
  });

  it("clones a subtree with fresh ids", () => {
    const node = rectNode({ x: 0, y: 0, width: 1, height: 1, id: "orig" });
    const group = { id: "g", type: "g", attrs: {}, children: [node] };
    const clone = cloneWithNewIds(group);
    expect(clone.id).not.toBe("g");
    expect(clone.children[0].id).not.toBe("orig");
    expect(clone.children[0].attrs).toEqual(node.attrs);
  });
});
