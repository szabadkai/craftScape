import { describe, expect, it } from "vitest";
import { parsePath, serializePath } from "../geometry/path";
import { deleteAnchor, hitTest, setHandle, translateAnchor } from "./pathEdit";

const subs = () => parsePath("M0 0 C0 5 5 10 10 10 L20 10");

describe("pathEdit", () => {
  it("translates an anchor together with its handles", () => {
    const moved = translateAnchor(subs(), { si: 0, ai: 1 }, { x: 5, y: 0 });
    const a = moved[0].anchors[1];
    expect(a.point).toEqual({ x: 15, y: 10 });
    expect(a.in).toEqual({ x: 10, y: 10 }); // handle moved with the point
  });

  it("sets a handle and mirrors the opposite one when asked", () => {
    const edited = setHandle(subs(), { si: 0, ai: 1 }, { x: 5, y: 12 }, { which: "in", mirror: true });
    const a = edited[0].anchors[1];
    expect(a.in).toEqual({ x: 5, y: 12 });
    expect(a.out).toEqual({ x: 15, y: 8 }); // reflected through the point (10,10)
  });

  it("deletes an anchor", () => {
    const edited = deleteAnchor(subs(), { si: 0, ai: 2 });
    expect(edited[0].anchors).toHaveLength(2);
    expect(serializePath(edited)).not.toContain("20 10");
  });

  it("hit-tests the nearest anchor or handle within tolerance", () => {
    expect(hitTest(subs(), { x: 0.2, y: 0.1 }, 2)).toEqual({ ref: { si: 0, ai: 0 }, which: "point" });
    expect(hitTest(subs(), { x: 5, y: 10 }, 2)?.which).toBe("in");
    expect(hitTest(subs(), { x: 100, y: 100 }, 2)).toBeNull();
  });
});
