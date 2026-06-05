import { describe, expect, it } from "vitest";
import { reorderIds } from "./zorder";

const order = ["a", "b", "c", "d"];

describe("reorderIds", () => {
  it("sends selection to front, preserving relative order", () => {
    expect(reorderIds(order, ["a", "c"], "front")).toEqual(["b", "d", "a", "c"]);
  });

  it("sends selection to back", () => {
    expect(reorderIds(order, ["c"], "back")).toEqual(["c", "a", "b", "d"]);
  });

  it("raises selection by one step", () => {
    expect(reorderIds(order, ["b"], "raise")).toEqual(["a", "c", "b", "d"]);
  });

  it("lowers selection by one step", () => {
    expect(reorderIds(order, ["c"], "lower")).toEqual(["a", "c", "b", "d"]);
  });

  it("does not move past the top or bottom", () => {
    expect(reorderIds(order, ["d"], "raise")).toEqual(order);
    expect(reorderIds(order, ["a"], "lower")).toEqual(order);
  });
});
