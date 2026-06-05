import type { SceneNode } from "../core/model/types";

/** Bézier circle constant: control-handle length as a fraction of the radius. */
const KAPPA = 0.5522847498307936;

function r(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function num(node: SceneNode, key: string): number {
  return Number(node.attrs[key] ?? 0);
}

function rectPath(node: SceneNode): string {
  const x = num(node, "x");
  const y = num(node, "y");
  const w = num(node, "width");
  const h = num(node, "height");
  return `M ${r(x)} ${r(y)} L ${r(x + w)} ${r(y)} L ${r(x + w)} ${r(y + h)} L ${r(x)} ${r(y + h)} Z`;
}

function ellipsePath(node: SceneNode): string {
  const cx = num(node, "cx");
  const cy = num(node, "cy");
  const rx = num(node, "rx");
  const ry = num(node, "ry");
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  const c = (n: number[]) => `C ${n.map(r).join(" ")}`;
  return [
    `M ${r(cx + rx)} ${r(cy)}`,
    c([cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry]),
    c([cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy]),
    c([cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry]),
    c([cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy]),
    "Z",
  ].join(" ");
}

/** SVG path `d` equivalent of a rect or ellipse, or null for other node types. */
export function nodeToPathD(node: SceneNode): string | null {
  if (node.type === "rect") return rectPath(node);
  if (node.type === "ellipse") return ellipsePath(node);
  return null;
}
