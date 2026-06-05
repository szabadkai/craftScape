import { describe, expect, it } from "vitest";
import { alignOffsets, distributeOffsets, type AlignItem } from "./align";

const items: AlignItem[] = [
  { id: "a", bounds: { x: 0, y: 0, width: 10, height: 10 } },
  { id: "b", bounds: { x: 30, y: 50, width: 20, height: 20 } },
];

describe("align", () => {
  it("aligns left edges to the selection box", () => {
    expect(alignOffsets(items, "left")).toEqual([
      { id: "a", dx: 0, dy: 0 },
      { id: "b", dx: -30, dy: 0 },
    ]);
  });

  it("aligns bottom edges", () => {
    const off = alignOffsets(items, "bottom");
    // union bottom is 70; a's bottom is 10 -> +60; b already at 70 -> 0
    expect(off).toEqual([
      { id: "a", dx: 0, dy: 60 },
      { id: "b", dx: 0, dy: 0 },
    ]);
  });

  it("returns nothing for fewer than two items", () => {
    expect(alignOffsets(items.slice(0, 1), "left")).toEqual([]);
  });

  it("distributes three items evenly by centre", () => {
    const three: AlignItem[] = [
      { id: "a", bounds: { x: 0, y: 0, width: 10, height: 10 } }, // center 5
      { id: "b", bounds: { x: 12, y: 0, width: 10, height: 10 } }, // center 17
      { id: "c", bounds: { x: 100, y: 0, width: 10, height: 10 } }, // center 105
    ];
    const off = distributeOffsets(three, "h");
    const byId = Object.fromEntries(off.map((o) => [o.id, o.dx]));
    // even spacing puts b's center at 55 -> dx = 55 - 17 = 38; ends unchanged
    expect(byId.a).toBe(0);
    expect(byId.b).toBe(38);
    expect(byId.c).toBe(0);
  });

  it("needs at least three items to distribute", () => {
    expect(distributeOffsets(items, "h")).toEqual([]);
  });
});
