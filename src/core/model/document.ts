import type { SceneNode } from "./types";

/**
 * A document *is* its root `<svg>` node. All editing is expressed as pure,
 * immutable transformations of this tree (structural sharing where possible),
 * which is what lets the command/history layer trivially undo any change.
 */
export type SvgDocument = SceneNode;

export type { SceneNode };

let counter = 0;

/** Generate a fresh, unique node id. */
export function freshId(prefix = "n"): string {
  counter += 1;
  return `${prefix}${counter}`;
}

function num(attrs: Record<string, number | string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) out[k] = String(v);
  return out;
}

export function createDocument(width: number, height: number): SvgDocument {
  return {
    id: "root",
    type: "svg",
    attrs: {
      xmlns: "http://www.w3.org/2000/svg",
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
    },
    children: [],
  };
}

export interface RectInit {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  id?: string;
}

export function rectNode(o: RectInit): SceneNode {
  return {
    id: o.id ?? freshId("rect"),
    type: "rect",
    attrs: num({ x: o.x, y: o.y, width: o.width, height: o.height, fill: o.fill ?? "#4f8cff" }),
    children: [],
  };
}

export interface EllipseInit {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill?: string;
  id?: string;
}

export function ellipseNode(o: EllipseInit): SceneNode {
  return {
    id: o.id ?? freshId("ellipse"),
    type: "ellipse",
    attrs: num({ cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry, fill: o.fill ?? "#ff7a59" }),
    children: [],
  };
}

// --- Tree queries ----------------------------------------------------------

export function findNode(node: SceneNode, id: string): SceneNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

export function findParent(node: SceneNode, id: string): SceneNode | undefined {
  for (const child of node.children) {
    if (child.id === id) return node;
    const found = findParent(child, id);
    if (found) return found;
  }
  return undefined;
}

export function childIndex(parent: SceneNode, id: string): number {
  return parent.children.findIndex((c) => c.id === id);
}

// --- Immutable tree edits --------------------------------------------------

function updateNode(
  node: SceneNode,
  id: string,
  updater: (n: SceneNode) => SceneNode,
): SceneNode {
  if (node.id === id) return updater(node);
  let changed = false;
  const children = node.children.map((c) => {
    const next = updateNode(c, id, updater);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? { ...node, children } : node;
}

export function insertChild(
  root: SvgDocument,
  parentId: string,
  child: SceneNode,
  index?: number,
): SvgDocument {
  return updateNode(root, parentId, (p) => {
    const children = [...p.children];
    children.splice(index ?? children.length, 0, child);
    return { ...p, children };
  });
}

export function removeNode(root: SvgDocument, id: string): SvgDocument {
  if (root.id === id) return root; // the root document is not removable
  const prune = (node: SceneNode): SceneNode => ({
    ...node,
    children: node.children.filter((c) => c.id !== id).map(prune),
  });
  return prune(root);
}

/** Merge attribute changes. A `null` value deletes the attribute. */
export function setAttrs(
  root: SvgDocument,
  id: string,
  patch: Record<string, string | null>,
): SvgDocument {
  return updateNode(root, id, (n) => {
    const attrs: Record<string, string> = { ...n.attrs };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete attrs[k];
      else attrs[k] = v;
    }
    return { ...n, attrs };
  });
}
