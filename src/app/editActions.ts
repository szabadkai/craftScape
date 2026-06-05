import type { StoreApi } from "zustand";
import {
  addNodeCommand,
  compositeCommand,
  groupCommand,
  orderChildrenCommand,
  removeNodeCommand,
  ungroupCommand,
  type Command,
} from "../core/commands/commands";
import {
  cloneWithNewIds,
  findNode,
  findParent,
  type SceneNode,
  type SvgDocument,
} from "../core/model/document";
import { nodeBounds } from "../geometry/bbox";
import { alignOffsets, distributeOffsets, type AlignMode } from "../geometry/align";
import { multiply, parseMatrix, toTransform, translation } from "../geometry/matrix";
import { commitOffsets, commitTransform } from "../tools/gestures";
import { reorderIds, type ZMode } from "../tools/zorder";
import type { EditorState } from "./store";

export type AlignKind = AlignMode | "distribute-h" | "distribute-v";

interface Ctx {
  get: () => EditorState;
  set: StoreApi<EditorState>["setState"];
  run: (command: Command) => void;
}

const PASTE_OFFSET = 12;

function offsetNode(node: SceneNode, d: number): SceneNode {
  return {
    ...node,
    attrs: { ...node.attrs, transform: toTransform(multiply(translation(d, d), parseMatrix(node.attrs.transform))) },
  };
}

function commonParentId(doc: SvgDocument, ids: string[]): string | null {
  const first = ids[0] && findParent(doc, ids[0]);
  if (!first) return null;
  return ids.every((id) => findParent(doc, id)?.id === first.id) ? first.id : null;
}

function selectedNodes(doc: SvgDocument, ids: string[]): SceneNode[] {
  return ids.map((id) => findNode(doc, id)).filter((n): n is SceneNode => !!n);
}

function selectionItems(doc: SvgDocument, ids: string[]) {
  return selectedNodes(doc, ids)
    .map((node) => ({ id: node.id, bounds: nodeBounds(node) }))
    .filter((it): it is { id: string; bounds: NonNullable<typeof it.bounds> } => !!it.bounds);
}

/** Every id in a subtree (used to detect a freshly created group node). */
function allIds(node: SceneNode): string[] {
  return [node.id, ...node.children.flatMap(allIds)];
}

/** Structural editing actions (z-order, grouping, clipboard, align, nudge). */
export function createEditActions({ get, set, run }: Ctx) {
  const pasteNodes = (nodes: SceneNode[]) => {
    if (nodes.length === 0) return;
    const { doc } = get();
    const clones = nodes.map((n) => offsetNode(cloneWithNewIds(n), PASTE_OFFSET));
    run(compositeCommand("Paste", clones.map((c) => addNodeCommand(doc.id, c))));
    set({ selection: clones.map((c) => c.id) });
  };

  return {
    deleteSelection: () => {
      const { doc, selection } = get();
      if (selection.length === 0) return;
      run(compositeCommand("Delete", selection.map((id) => removeNodeCommand(doc, id))));
      set({ selection: [] });
    },
    nudge: (dx: number, dy: number) => {
      const { doc, selection } = get();
      const cmd = commitTransform(doc, selection, translation(dx, dy));
      if (cmd) run(cmd);
    },
    group: () => {
      const { doc, selection } = get();
      if (selection.length < 2 || !commonParentId(doc, selection)) return;
      const cmd = groupCommand(doc, selection);
      const before = new Set(allIds(doc));
      const newId = allIds(cmd.apply(doc)).find((id) => !before.has(id));
      run(cmd);
      set({ selection: newId ? [newId] : [] });
    },
    ungroup: () => {
      const { doc, selection } = get();
      const groups = selection.filter((id) => findNode(doc, id)?.type === "g");
      if (groups.length === 0) return;
      run(compositeCommand("Ungroup", groups.map((id) => ungroupCommand(doc, id))));
      set({ selection: [] });
    },
    zOrder: (mode: ZMode) => {
      const { doc, selection } = get();
      const parentId = commonParentId(doc, selection);
      if (!parentId) return;
      const order = findNode(doc, parentId)!.children.map((c) => c.id);
      run(orderChildrenCommand(doc, parentId, reorderIds(order, selection, mode)));
    },
    copy: () => set({ clipboard: selectedNodes(get().doc, get().selection) }),
    cut: () => {
      get().copy();
      get().deleteSelection();
    },
    paste: () => pasteNodes(get().clipboard),
    duplicate: () => pasteNodes(selectedNodes(get().doc, get().selection)),
    align: (kind: AlignKind) => {
      const { doc, selection } = get();
      const items = selectionItems(doc, selection);
      const offsets =
        kind === "distribute-h"
          ? distributeOffsets(items, "h")
          : kind === "distribute-v"
            ? distributeOffsets(items, "v")
            : alignOffsets(items, kind);
      const cmd = commitOffsets(doc, offsets);
      if (cmd) run(cmd);
    },
  };
}
