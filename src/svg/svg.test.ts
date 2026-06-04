import { describe, expect, it } from "vitest";
import {
  createDocument,
  ellipseNode,
  insertChild,
  rectNode,
} from "../core/model/document";
import { parse } from "./parse";
import { serialize } from "./serialize";

function sample() {
  let doc = createDocument(800, 600);
  doc = insertChild(doc, doc.id, rectNode({ x: 10, y: 20, width: 30, height: 40, id: "r1" }));
  doc = insertChild(doc, doc.id, ellipseNode({ cx: 100, cy: 80, rx: 25, ry: 15, id: "e1" }));
  return doc;
}

describe("svg round-trip", () => {
  it("parse(serialize(doc)) reproduces the document tree", () => {
    const doc = sample();
    expect(parse(serialize(doc))).toEqual(doc);
  });

  it("preserves unknown elements and attributes", () => {
    const svg =
      '<svg id="root" xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
      '<path id="p1" d="M0 0 L5 5" data-custom="keep" /></svg>';
    const doc = parse(svg);
    const path = doc.children[0];
    expect(path.type).toBe("path");
    expect(path.attrs.d).toBe("M0 0 L5 5");
    expect(path.attrs["data-custom"]).toBe("keep");
    // and it survives a re-serialize
    expect(parse(serialize(doc))).toEqual(doc);
  });

  it("escapes attribute values that contain markup characters", () => {
    let doc = createDocument(10, 10);
    doc = insertChild(doc, doc.id, rectNode({ x: 0, y: 0, width: 1, height: 1, id: "r1", fill: '"&<>' }));
    const svg = serialize(doc);
    expect(svg).toContain("&quot;&amp;&lt;&gt;");
    expect(parse(svg)).toEqual(doc);
  });

  it("throws on malformed SVG", () => {
    expect(() => parse("<svg><rect></svg>")).toThrow();
  });
});
