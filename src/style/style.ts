import { findNode, type SvgDocument } from "../core/model/document";
import type { SceneNode } from "../core/model/types";
import { gradientRefId, readStops, type GradientKind, type Stop } from "./gradient";

export type FillType = "none" | "solid" | "gradient" | "mixed";
export type StrokeType = "none" | "solid" | "mixed";

export interface StyleState {
  fillType: FillType;
  fill: string;
  fillOpacity: number;
  gradientKind?: GradientKind;
  stops: Stop[];
  strokeType: StrokeType;
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
  dash: string;
  linecap: string;
  linejoin: string;
  opacity: number;
}

export const DEFAULT_STYLE: StyleState = {
  fillType: "none",
  fill: "#000000",
  fillOpacity: 1,
  stops: [],
  strokeType: "none",
  stroke: "#000000",
  strokeWidth: 1,
  strokeOpacity: 1,
  dash: "",
  linecap: "butt",
  linejoin: "miter",
  opacity: 1,
};

const MIXED = Symbol("mixed");
type Shared = string | undefined | typeof MIXED;

/** A shared value: the string (or `undefined` if all absent), else MIXED. */
function shared(nodes: SceneNode[], key: string): Shared {
  const first = nodes[0].attrs[key];
  return nodes.every((n) => n.attrs[key] === first) ? first : MIXED;
}

function numAttr(value: Shared, fallback: number): number {
  return typeof value === "string" ? Number(value) : fallback;
}

function strAttr(value: Shared, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function resolveFill(doc: SvgDocument, fill: Shared): Pick<StyleState, "fillType" | "fill" | "gradientKind" | "stops"> {
  if (fill === MIXED) return { fillType: "mixed", fill: "#000000", stops: [] };
  if (fill === "none") return { fillType: "none", fill: "#000000", stops: [] };
  if (fill === undefined) return { fillType: "solid", fill: "#000000", stops: [] };
  const refId = gradientRefId(fill);
  if (refId) {
    const node = findNode(doc, refId);
    const kind: GradientKind = node?.type === "radialGradient" ? "radial" : "linear";
    return { fillType: "gradient", fill: "#000000", gradientKind: kind, stops: node ? readStops(node) : [] };
  }
  return { fillType: "solid", fill, stops: [] };
}

function resolveStroke(stroke: Shared): Pick<StyleState, "strokeType" | "stroke"> {
  if (stroke === MIXED) return { strokeType: "mixed", stroke: "#000000" };
  if (stroke === undefined || stroke === "none") return { strokeType: "none", stroke: "#000000" };
  return { strokeType: "solid", stroke };
}

/** Derive the Fill & Stroke panel state from the current selection. */
export function readStyle(doc: SvgDocument, ids: string[]): StyleState {
  const nodes = ids.map((id) => findNode(doc, id)).filter((n): n is SceneNode => !!n);
  if (nodes.length === 0) return DEFAULT_STYLE;
  return {
    ...resolveFill(doc, shared(nodes, "fill")),
    ...resolveStroke(shared(nodes, "stroke")),
    fillOpacity: numAttr(shared(nodes, "fill-opacity"), 1),
    strokeWidth: numAttr(shared(nodes, "stroke-width"), 1),
    strokeOpacity: numAttr(shared(nodes, "stroke-opacity"), 1),
    dash: strAttr(shared(nodes, "stroke-dasharray"), ""),
    linecap: strAttr(shared(nodes, "stroke-linecap"), "butt"),
    linejoin: strAttr(shared(nodes, "stroke-linejoin"), "miter"),
    opacity: numAttr(shared(nodes, "opacity"), 1),
  };
}
