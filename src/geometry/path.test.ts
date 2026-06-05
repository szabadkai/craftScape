import { describe, expect, it } from "vitest";
import { parsePath, pathPolyline, serializePath, type SubPath } from "./path";

describe("path parse/serialize", () => {
  it("parses a closed polygon", () => {
    const subs = parsePath("M0 0 L10 0 L10 10 Z");
    expect(subs).toHaveLength(1);
    expect(subs[0].closed).toBe(true);
    expect(subs[0].anchors.map((a) => a.point)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
  });

  it("parses cubic handles onto adjacent anchors", () => {
    const subs = parsePath("M0 0 C0 5 5 10 10 10");
    expect(subs[0].anchors[0].out).toEqual({ x: 0, y: 5 });
    expect(subs[0].anchors[1].in).toEqual({ x: 5, y: 10 });
    expect(subs[0].anchors[1].point).toEqual({ x: 10, y: 10 });
  });

  it("handles relative commands", () => {
    const subs = parsePath("m5 5 l10 0 l0 10");
    expect(subs[0].anchors.map((a) => a.point)).toEqual([
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
    ]);
  });

  it("promotes quadratics to cubics", () => {
    const subs = parsePath("M0 0 Q0 10 10 10");
    expect(subs[0].anchors[0].out).toBeDefined();
    expect(subs[0].anchors[1].in).toBeDefined();
  });

  it("round-trips serialize → parse → serialize", () => {
    const d = "M 0 0 L 10 0 C 10 5 5 10 0 10 Z";
    expect(serializePath(parsePath(serializePath(parsePath(d))))).toBe(serializePath(parsePath(d)));
  });

  it("handles H/V and resets to the sub-path start on Z", () => {
    const subs = parsePath("M0 0 H10 V10 Z M20 20 L30 20");
    expect(subs).toHaveLength(2);
    expect(subs[0].anchors.map((a) => a.point)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(subs[0].closed).toBe(true);
    expect(subs[1].anchors[0].point).toEqual({ x: 20, y: 20 });
  });

  it("reflects the previous control point for S and T", () => {
    const s = parsePath("M0 0 C0 5 5 10 10 10 S15 15 20 10");
    expect(s[0].anchors[1].out).toEqual({ x: 15, y: 10 }); // reflection of (5,10) about (10,10)
    const t = parsePath("M0 0 Q0 10 10 10 T20 10");
    expect(t[0].anchors[2].point).toEqual({ x: 20, y: 10 });
  });

  it("falls back to a line for unsupported arc commands", () => {
    const subs = parsePath("M0 0 A5 5 0 0 1 10 0");
    expect(subs[0].anchors[1].point).toEqual({ x: 10, y: 0 });
  });

  it("flattens a path into polyline points", () => {
    const subs: SubPath[] = [
      { closed: false, anchors: [{ point: { x: 0, y: 0 } }, { point: { x: 10, y: 0 } }] },
    ];
    expect(pathPolyline(subs)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });
});
