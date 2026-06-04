import {
  childIndex,
  findNode,
  findParent,
  insertChild,
  removeNode,
  setAttrs,
  type SceneNode,
  type SvgDocument,
} from "../model/document";

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
