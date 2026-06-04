import { describe, expect, it } from "vitest";
import {
  clampScale,
  createViewport,
  MAX_SCALE,
  MIN_SCALE,
  pan,
  toDocument,
  toScreen,
  zoomAt,
} from "./Viewport";

describe("Viewport", () => {
  it("round-trips a point through screen<->document space", () => {
    const vp = { scale: 2, panX: 30, panY: -10 };
    const doc = { x: 12.5, y: 7 };
    const screen = toScreen(vp, doc);
    expect(toDocument(vp, screen)).toEqual(doc);
  });

  it("identity viewport leaves coordinates unchanged", () => {
    const vp = createViewport();
    expect(toScreen(vp, { x: 5, y: 9 })).toEqual({ x: 5, y: 9 });
  });

  it("pan shifts the screen position by the screen delta", () => {
    const vp = createViewport();
    const moved = pan(vp, 15, -4);
    expect(toScreen(moved, { x: 0, y: 0 })).toEqual({ x: 15, y: -4 });
  });

  it("zoomAt keeps the pivot's document point fixed under the cursor", () => {
    const vp = createViewport();
    const pivot = { x: 100, y: 80 };
    const before = toDocument(vp, pivot);
    const zoomed = zoomAt(vp, 3, pivot);
    const after = toDocument(zoomed, pivot);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
    expect(zoomed.scale).toBe(3);
  });

  it("clamps scale to the supported range", () => {
    expect(clampScale(1e9)).toBe(MAX_SCALE);
    expect(clampScale(1e-9)).toBe(MIN_SCALE);
    expect(clampScale(1)).toBe(1);
  });
});
