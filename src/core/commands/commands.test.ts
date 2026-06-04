import { describe, expect, it } from "vitest";
import {
  createDocument,
  findNode,
  insertChild,
  rectNode,
} from "../model/document";
import {
  addNodeCommand,
  compositeCommand,
  groupCommand,
  orderChildrenCommand,
  removeNodeCommand,
  reorderCommand,
  setAttrsCommand,
  ungroupCommand,
} from "./commands";
import { History } from "./history";

const base = () => {
  const doc = createDocument(100, 100);
  const rect = rectNode({ x: 0, y: 0, width: 10, height: 10, id: "r1" });
  return insertChild(doc, doc.id, rect);
};

describe("commands", () => {
  it("addNode: invert(apply(doc)) is the original document", () => {
    const doc = createDocument(100, 100);
    const cmd = addNodeCommand(doc.id, rectNode({ x: 1, y: 2, width: 3, height: 4, id: "r1" }));
    const applied = cmd.apply(doc);
    expect(applied.children).toHaveLength(1);
    expect(cmd.invert(applied)).toEqual(doc);
  });

  it("removeNode restores the node at its original index on undo", () => {
    const doc = base();
    const cmd = removeNodeCommand(doc, "r1");
    const applied = cmd.apply(doc);
    expect(applied.children).toHaveLength(0);
    expect(cmd.invert(applied)).toEqual(doc);
  });

  it("setAttrs restores prior values, deleting keys that were absent", () => {
    const doc = base();
    const cmd = setAttrsCommand(doc, "r1", { transform: "translate(5 0)" });
    const applied = cmd.apply(doc);
    expect(findNode(applied, "r1")?.attrs.transform).toBe("translate(5 0)");
    const reverted = cmd.invert(applied);
    expect(findNode(reverted, "r1")?.attrs.transform).toBeUndefined();
    expect(reverted).toEqual(doc);
  });

  it("composite applies in order and inverts in reverse", () => {
    const doc = createDocument(100, 100);
    const cmd = compositeCommand("two", [
      addNodeCommand(doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "a" })),
      addNodeCommand(doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "b" })),
    ]);
    const applied = cmd.apply(doc);
    expect(applied.children.map((c) => c.id)).toEqual(["a", "b"]);
    expect(cmd.invert(applied)).toEqual(doc);
  });

  it("throws when targeting an unknown node", () => {
    const doc = createDocument(10, 10);
    expect(() => removeNodeCommand(doc, "nope")).toThrow();
    expect(() => setAttrsCommand(doc, "nope", { x: "1" })).toThrow();
  });
});

describe("structural commands", () => {
  const three = () => {
    let doc = createDocument(100, 100);
    for (const id of ["a", "b", "c"]) {
      doc = insertChild(doc, doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id }));
    }
    return doc;
  };

  it("reorderCommand moves a node and undoes cleanly", () => {
    const doc = three();
    const cmd = reorderCommand(doc, "a", 2);
    const applied = cmd.apply(doc);
    expect(applied.children.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(cmd.invert(applied)).toEqual(doc);
  });

  it("orderChildrenCommand sets and restores ordering", () => {
    const doc = three();
    const cmd = orderChildrenCommand(doc, doc.id, ["c", "b", "a"]);
    expect(cmd.apply(doc).children.map((c) => c.id)).toEqual(["c", "b", "a"]);
    expect(cmd.invert(cmd.apply(doc))).toEqual(doc);
  });

  it("groupCommand wraps selection in a <g> and undoes", () => {
    const doc = three();
    const cmd = groupCommand(doc, ["a", "c"]);
    const applied = cmd.apply(doc);
    const group = applied.children.find((c) => c.type === "g")!;
    expect(group.children.map((c) => c.id)).toEqual(["a", "c"]);
    expect(applied.children.map((c) => c.type)).toEqual(["g", "rect"]);
    expect(cmd.invert(applied)).toEqual(doc);
  });

  it("groupCommand rejects nodes with different parents", () => {
    let doc = three();
    doc = groupCommand(doc, ["a", "b"]).apply(doc); // nest a,b in a group
    const groupId = doc.children.find((c) => c.type === "g")!.children[0].id;
    expect(() => groupCommand(doc, ["c", groupId])).toThrow();
  });

  it("ungroupCommand bakes the group transform onto children and undoes", () => {
    let doc = createDocument(100, 100);
    doc = insertChild(doc, doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "a" }));
    doc = groupCommand(doc, ["a"]).apply(doc); // produces a <g> wrapping a — but needs >=1
    const gid = doc.children.find((c) => c.type === "g")!.id;
    doc = setAttrsCommand(doc, gid, { transform: "translate(10 0)" }).apply(doc);
    const cmd = ungroupCommand(doc, gid);
    const applied = cmd.apply(doc);
    const a = applied.children.find((c) => c.id === "a")!;
    expect(a.attrs.transform).toBe("translate(10 0)");
    expect(cmd.invert(applied)).toEqual(doc);
  });
});

describe("History", () => {
  const noop = { label: "x", apply: (d: number) => d, invert: (d: number) => d };

  it("tracks undo/redo availability and clears redo on push", () => {
    const h = new History();
    expect(h.canUndo()).toBe(false);
    // @ts-expect-error simple numeric stand-in for a Command in this unit test
    h.push(noop);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
    h.popUndo();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);
    h.popRedo();
    expect(h.canUndo()).toBe(true);
    // pushing a new command discards the redo branch
    h.popUndo();
    // @ts-expect-error numeric stand-in
    h.push(noop);
    expect(h.canRedo()).toBe(false);
    h.clear();
    expect(h.canUndo()).toBe(false);
  });
});
