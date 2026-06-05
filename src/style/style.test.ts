import { describe, expect, it } from "vitest";
import { createDocument, insertChild, rectNode } from "../core/model/document";
import { gradientNode } from "./gradient";
import { DEFAULT_STYLE, readStyle } from "./style";

function docWith(...rects: Array<Parameters<typeof rectNode>[0]>) {
  let doc = createDocument(100, 100);
  for (const r of rects) doc = insertChild(doc, doc.id, rectNode(r));
  return doc;
}

describe("readStyle", () => {
  it("returns defaults for an empty selection", () => {
    expect(readStyle(createDocument(10, 10), [])).toEqual(DEFAULT_STYLE);
  });

  it("reads a solid fill and stroke", () => {
    const doc = docWith({ x: 0, y: 0, width: 10, height: 10, id: "r", fill: "#ff0000" });
    const styled = {
      ...doc,
      children: doc.children.map((c) =>
        c.id === "r" ? { ...c, attrs: { ...c.attrs, stroke: "#00ff00", "stroke-width": "3" } } : c,
      ),
    };
    const s = readStyle(styled, ["r"]);
    expect(s.fillType).toBe("solid");
    expect(s.fill).toBe("#ff0000");
    expect(s.strokeType).toBe("solid");
    expect(s.stroke).toBe("#00ff00");
    expect(s.strokeWidth).toBe(3);
  });

  it("reports mixed fills across a multi-selection", () => {
    const doc = docWith(
      { x: 0, y: 0, width: 1, height: 1, id: "a", fill: "#111111" },
      { x: 0, y: 0, width: 1, height: 1, id: "b", fill: "#222222" },
    );
    expect(readStyle(doc, ["a", "b"]).fillType).toBe("mixed");
  });

  it("detects 'none' fill", () => {
    const doc = docWith({ x: 0, y: 0, width: 1, height: 1, id: "a", fill: "none" });
    expect(readStyle(doc, ["a"]).fillType).toBe("none");
  });

  it("resolves a gradient fill and its stops", () => {
    let doc = docWith({ x: 0, y: 0, width: 1, height: 1, id: "a" });
    const grad = gradientNode("linear", "g1", [
      { offset: 0, color: "#aaaaaa" },
      { offset: 1, color: "#bbbbbb" },
    ]);
    doc = insertChild(doc, doc.id, { id: "defs", type: "defs", attrs: {}, children: [grad] }, 0);
    doc = { ...doc, children: doc.children.map((c) => (c.id === "a" ? { ...c, attrs: { ...c.attrs, fill: "url(#g1)" } } : c)) };
    const s = readStyle(doc, ["a"]);
    expect(s.fillType).toBe("gradient");
    expect(s.gradientKind).toBe("linear");
    expect(s.stops.map((st) => st.color)).toEqual(["#aaaaaa", "#bbbbbb"]);
  });
});
