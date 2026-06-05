import {
  childIndex,
  findNode,
  findParent,
  freshId,
  insertChild,
  orderChildren,
  removeNode,
  reorderChild,
  replaceNode,
  setAttrs,
  setText,
  type SceneNode,
  type SvgDocument,
} from "../model/document";
import { multiply, parseMatrix, toTransform } from "../../geometry/matrix";
import { nodeToPathD } from "../../geometry/shapeToPath";

const GEOMETRY_ATTRS = ["x", "y", "width", "height", "cx", "cy", "rx", "ry"];

/**
 * Every mutation to the document is a `Command`. `apply` and `invert` are pure
 * functions over the document, so undo/redo is just running the opposite one.
 * Commands capture whatever prior state their inverse needs at *construction*
 * time, which is why several factories take the current `doc`.
 *
 * Invariant (property-tested): `invert(apply(doc)) deep-equals doc`.
 */
export interface Command {
  readonly label: string;
  apply(doc: SvgDocument): SvgDocument;
  invert(doc: SvgDocument): SvgDocument;
}

export function addNodeCommand(
  parentId: string,
  node: SceneNode,
  index?: number,
): Command {
  return {
    label: `Add ${node.type}`,
    apply: (doc) => insertChild(doc, parentId, node, index),
    invert: (doc) => removeNode(doc, node.id),
  };
}

export function removeNodeCommand(doc: SvgDocument, nodeId: string): Command {
  const node = findNode(doc, nodeId);
  const parent = findParent(doc, nodeId);
  if (!node || !parent) throw new Error(`Cannot remove unknown node ${nodeId}`);
  const parentId = parent.id;
  const index = childIndex(parent, nodeId);
  return {
    label: `Delete ${node.type}`,
    apply: (d) => removeNode(d, nodeId),
    invert: (d) => insertChild(d, parentId, node, index),
  };
}

export function setAttrsCommand(
  doc: SvgDocument,
  nodeId: string,
  patch: Record<string, string>,
): Command {
  const node = findNode(doc, nodeId);
  if (!node) throw new Error(`Cannot edit unknown node ${nodeId}`);
  // Capture previous values so invert restores them; absent keys become null
  // (deleted) on undo, so we never leave attributes the user didn't have.
  const prev: Record<string, string | null> = {};
  for (const key of Object.keys(patch)) {
    prev[key] = key in node.attrs ? node.attrs[key] : null;
  }
  return {
    label: `Edit ${node.type}`,
    apply: (d) => setAttrs(d, nodeId, patch),
    invert: (d) => setAttrs(d, nodeId, prev),
  };
}

/** Group commands into one undoable unit, applied in order, inverted in reverse. */
export function compositeCommand(label: string, commands: Command[]): Command {
  return {
    label,
    apply: (doc) => commands.reduce((acc, c) => c.apply(acc), doc),
    invert: (doc) => [...commands].reverse().reduce((acc, c) => c.invert(acc), doc),
  };
}

/** Move a node to a new z-index within its parent. */
export function reorderCommand(doc: SvgDocument, nodeId: string, toIndex: number): Command {
  const parent = findParent(doc, nodeId);
  if (!parent) throw new Error(`Cannot reorder unknown node ${nodeId}`);
  const from = childIndex(parent, nodeId);
  return {
    label: "Reorder",
    apply: (d) => reorderChild(d, nodeId, toIndex),
    invert: (d) => reorderChild(d, nodeId, from),
  };
}

/** Replace a parent's child ordering with `newOrder` (z-order changes). */
export function orderChildrenCommand(doc: SvgDocument, parentId: string, newOrder: string[]): Command {
  const parent = findNode(doc, parentId);
  if (!parent) throw new Error(`Cannot reorder unknown parent ${parentId}`);
  const old = parent.children.map((c) => c.id);
  return {
    label: "Reorder",
    apply: (d) => orderChildren(d, parentId, newOrder),
    invert: (d) => orderChildren(d, parentId, old),
  };
}

/** Wrap the selected sibling nodes in a new `<g>` at their topmost position. */
export function groupCommand(doc: SvgDocument, ids: string[]): Command {
  const parent = ids.length > 0 ? findParent(doc, ids[0]) : undefined;
  if (!parent || !ids.every((id) => findParent(doc, id)?.id === parent.id)) {
    throw new Error("Can only group nodes that share a parent");
  }
  const ordered = parent.children.filter((c) => ids.includes(c.id));
  const indices = ordered.map((n) => childIndex(parent, n.id));
  const insertAt = parent.children.slice(0, Math.min(...indices)).filter((c) => !ids.includes(c.id)).length;
  const group: SceneNode = { id: freshId("g"), type: "g", attrs: {}, children: ordered };
  return {
    label: "Group",
    apply: (d) => insertChild(ordered.reduce((acc, n) => removeNode(acc, n.id), d), parent.id, group, insertAt),
    invert: (d) =>
      ordered.reduce((acc, n, i) => insertChild(acc, parent.id, n, indices[i]), removeNode(d, group.id)),
  };
}

function bakeGroupTransform(group: SceneNode): SceneNode[] {
  const gm = group.attrs.transform;
  if (!gm) return [...group.children];
  return group.children.map((child) => ({
    ...child,
    attrs: { ...child.attrs, transform: toTransform(multiply(parseMatrix(gm), parseMatrix(child.attrs.transform))) },
  }));
}

/** Convert a rect/ellipse into an equivalent `<path>`, preserving id and style. */
export function convertToPathCommand(doc: SvgDocument, nodeId: string): Command {
  const node = findNode(doc, nodeId);
  const d = node && nodeToPathD(node);
  if (!node || !d) throw new Error(`Cannot convert node ${nodeId} to a path`);
  const attrs: Record<string, string> = { ...node.attrs, d };
  for (const key of GEOMETRY_ATTRS) delete attrs[key];
  const path: SceneNode = { id: node.id, type: "path", attrs, children: [] };
  return {
    label: "Object to Path",
    apply: (dd) => replaceNode(dd, nodeId, path),
    invert: (dd) => replaceNode(dd, nodeId, node),
  };
}

/** Set the text content of a `<text>` node. */
export function setTextCommand(doc: SvgDocument, nodeId: string, text: string): Command {
  const node = findNode(doc, nodeId);
  if (!node) throw new Error(`Cannot set text on unknown node ${nodeId}`);
  const previous = node.text ?? "";
  return {
    label: "Edit text",
    apply: (d) => setText(d, nodeId, text),
    invert: (d) => setText(d, nodeId, previous),
  };
}

/** Point a node's fill at a gradient, inserting it into `<defs>` (created if needed). */
export function setFillGradientCommand(doc: SvgDocument, nodeId: string, gradient: SceneNode): Command {
  const node = findNode(doc, nodeId);
  if (!node) throw new Error(`Cannot style unknown node ${nodeId}`);
  const oldFill = node.attrs.fill ?? null;
  const existingDefs = doc.children.find((c) => c.type === "defs");
  const defsId = existingDefs?.id ?? freshId("defs");
  const createdDefs = !existingDefs;
  return {
    label: "Apply gradient",
    apply: (d) => {
      const withDefs = createdDefs
        ? insertChild(d, d.id, { id: defsId, type: "defs", attrs: {}, children: [] }, 0)
        : d;
      return setAttrs(insertChild(withDefs, defsId, gradient), nodeId, { fill: `url(#${gradient.id})` });
    },
    invert: (d) => {
      const restored = setAttrs(d, nodeId, { fill: oldFill });
      const withoutGradient = removeNode(restored, gradient.id);
      return createdDefs ? removeNode(withoutGradient, defsId) : withoutGradient;
    },
  };
}

/** Dissolve a `<g>`, lifting its children into the parent and baking the group transform. */
export function ungroupCommand(doc: SvgDocument, groupId: string): Command {
  const group = findNode(doc, groupId);
  const parent = findParent(doc, groupId);
  if (!group || !parent) throw new Error(`Cannot ungroup unknown node ${groupId}`);
  const at = childIndex(parent, groupId);
  const children = bakeGroupTransform(group);
  return {
    label: "Ungroup",
    apply: (d) => children.reduce((acc, c, i) => insertChild(acc, parent.id, c, at + i), removeNode(d, groupId)),
    invert: (d) => insertChild(children.reduce((acc, c) => removeNode(acc, c.id), d), parent.id, group, at),
  };
}
