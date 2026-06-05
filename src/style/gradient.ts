import type { SceneNode } from "../core/model/types";

export type GradientKind = "linear" | "radial";

export interface Stop {
  offset: number; // 0..1
  color: string;
  opacity?: number; // 0..1
}

export const DEFAULT_STOPS: Stop[] = [
  { offset: 0, color: "#4f8cff" },
  { offset: 1, color: "#ffffff" },
];

function stopAttrs(stop: Stop): Record<string, string> {
  const attrs: Record<string, string> = { offset: String(stop.offset), "stop-color": stop.color };
  if (stop.opacity !== undefined) attrs["stop-opacity"] = String(stop.opacity);
  return attrs;
}

/**
 * Build a `<linearGradient>`/`<radialGradient>` node with stop children. Stop
 * ids are derived from the gradient id so the UI can address a stop directly
 * (e.g. to recolour it) without re-walking the tree.
 */
export function gradientNode(kind: GradientKind, id: string, stops: Stop[]): SceneNode {
  return {
    id,
    type: kind === "radial" ? "radialGradient" : "linearGradient",
    attrs: {},
    children: stops.map((stop, i) => ({
      id: `${id}-s${i}`,
      type: "stop",
      attrs: stopAttrs(stop),
      children: [],
    })),
  };
}

export function readStops(node: SceneNode): Stop[] {
  return node.children
    .filter((c) => c.type === "stop")
    .map((c) => ({
      offset: Number(c.attrs.offset ?? 0),
      color: c.attrs["stop-color"] ?? "#000000",
      opacity: c.attrs["stop-opacity"] === undefined ? undefined : Number(c.attrs["stop-opacity"]),
    }));
}

/** Extract the gradient id from a `fill="url(#id)"` reference, or null. */
export function gradientRefId(fill: string | undefined): string | null {
  const m = fill ? /url\(#([^)]+)\)/.exec(fill) : null;
  return m ? m[1] : null;
}
