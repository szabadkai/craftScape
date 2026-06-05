import { describe, expect, it } from "vitest";
import { gradientNode, gradientRefId, readStops } from "./gradient";

describe("gradient", () => {
  it("builds a linear gradient node with stop children", () => {
    const g = gradientNode("linear", "g1", [
      { offset: 0, color: "#fff" },
      { offset: 1, color: "#000", opacity: 0.5 },
    ]);
    expect(g.type).toBe("linearGradient");
    expect(g.children).toHaveLength(2);
    expect(g.children[0].id).toBe("g1-s0");
    expect(g.children[1].attrs["stop-opacity"]).toBe("0.5");
  });

  it("uses radialGradient for radial kind", () => {
    expect(gradientNode("radial", "g2", []).type).toBe("radialGradient");
  });

  it("reads stops back out", () => {
    const g = gradientNode("linear", "g3", [{ offset: 0.25, color: "#abcdef" }]);
    expect(readStops(g)).toEqual([{ offset: 0.25, color: "#abcdef", opacity: undefined }]);
  });

  it("extracts the gradient id from a fill reference", () => {
    expect(gradientRefId("url(#g1)")).toBe("g1");
    expect(gradientRefId("#ff0000")).toBeNull();
    expect(gradientRefId(undefined)).toBeNull();
  });
});
