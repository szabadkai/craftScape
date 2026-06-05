import { create, type StoreApi } from "zustand";
import type { Command } from "../core/commands/commands";
import { History } from "../core/commands/history";
import { createDocument, type SceneNode, type SvgDocument } from "../core/model/document";
import type { Point } from "../core/viewport/Viewport";
import { normalizeRect } from "../geometry/bbox";
import type { HandleId } from "../geometry/handles";
import { parse } from "../svg/parse";
import { serialize } from "../svg/serialize";
import {
  commitCreate,
  commitTransform,
  gestureMatrix,
  marqueeSelection,
  selectionBounds,
  transformingIds,
  type Gesture,
  type Modifiers,
} from "../tools/gestures";
import { snapMove } from "../tools/snap";
import type { SnapGuide } from "../geometry/snap";
import { createEditActions, type AlignKind } from "./editActions";
import { createPathActions, type NodeDrag, type PenDraft } from "./pathActions";
import { createStyleActions, type StylePatch } from "./styleActions";
import { createTextActions } from "./textActions";
import type { HandleKind, NodeRef } from "../tools/pathEdit";
import type { GradientKind } from "../style/gradient";

export type ToolId = "select" | "rect" | "ellipse" | "pen" | "node" | "text";
export type { Gesture, Modifiers, AlignKind };

export interface EditorState {
  doc: SvgDocument;
  selection: string[];
  tool: ToolId;
  gesture: Gesture;
  mods: Modifiers;
  clipboard: SceneNode[];
  pen: PenDraft | null;
  nodeDrag: NodeDrag | null;
  nodeSel: NodeRef | null;
  snapEnabled: boolean;
  snapGuides: SnapGuide[];
  canUndo: boolean;
  canRedo: boolean;
  setTool: (tool: ToolId) => void;
  setSelection: (ids: string[]) => void;
  pointerDown: (pt: Point, targetId: string | null, additive: boolean) => void;
  pointerDrag: (pt: Point, mods?: Modifiers) => void;
  pointerUp: () => void;
  cancelGesture: () => void;
  setSnap: (enabled: boolean) => void;
  beginScale: (handle: HandleId, pt: Point) => void;
  beginRotate: (pt: Point) => void;
  undo: () => void;
  redo: () => void;
  exportSvg: () => string;
  loadSvg: (svg: string) => void;
  // structural edits (see editActions.ts)
  deleteSelection: () => void;
  nudge: (dx: number, dy: number) => void;
  group: () => void;
  ungroup: () => void;
  zOrder: (mode: "front" | "back" | "raise" | "lower") => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  align: (kind: AlignKind) => void;
  // path / node editing (see pathActions.ts)
  penDown: (pt: Point) => void;
  penMove: (pt: Point) => void;
  penUp: () => void;
  penClose: () => void;
  finishPen: (closed: boolean) => void;
  penCancel: () => void;
  nodeDown: (ref: NodeRef, which: HandleKind, pt: Point) => void;
  nodeMove: (pt: Point) => void;
  nodeUp: (mirror: boolean) => void;
  deleteNode: () => void;
  convertToPath: () => void;
  // styling (see styleActions.ts)
  setStyle: (patch: StylePatch) => void;
  applyGradient: (kind: GradientKind) => void;
  setGradientStop: (index: number, patch: StylePatch) => void;
  addText: (pt: Point) => void;
  setText: (text: string) => void;
}

type Set = StoreApi<EditorState>["setState"];
type Get = () => EditorState;

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

function startPointer(io: { get: Get; set: Set }, pt: Point, targetId: string | null, additive: boolean) {
  const { get, set } = io;
  const { tool, selection } = get();
  if (tool === "pen" || tool === "node" || tool === "text") return; // handled by dedicated actions
  if (tool === "rect" || tool === "ellipse") {
    set({ gesture: { kind: "create", start: pt, current: pt } });
  } else if (targetId) {
    const ids = additive ? toggle(selection, targetId) : selection.includes(targetId) ? selection : [targetId];
    set({ selection: ids, gesture: { kind: "move", start: pt, current: pt, ids } });
  } else {
    set({ selection: additive ? selection : [], gesture: { kind: "marquee", start: pt, current: pt } });
  }
}

function endPointer(get: Get, set: Set, run: (c: Command) => void) {
  const { gesture, mods, doc, tool } = get();
  if (gesture.kind === "create") {
    const res = commitCreate(doc, tool === "ellipse" ? "ellipse" : "rect", gesture.start, gesture.current);
    if (res) {
      run(res.command);
      set({ selection: [res.id] });
    }
  } else if (gesture.kind === "marquee") {
    const box = normalizeRect(gesture.start, gesture.current);
    if (box.width > 1 || box.height > 1) set({ selection: marqueeSelection(doc, box) });
  } else {
    const cmd = commitTransform(doc, transformingIds(gesture), gestureMatrix(gesture, mods));
    if (cmd) run(cmd);
  }
  set({ gesture: { kind: "none" }, snapGuides: [] });
}

/** Update a drag, applying object/grid snapping when moving the selection. */
function applyDrag(s: EditorState, pt: Point, mods: Modifiers | undefined): Partial<EditorState> {
  if (s.gesture.kind === "none") return {};
  if (s.gesture.kind === "move" && s.snapEnabled) {
    const raw = { x: pt.x - s.gesture.start.x, y: pt.y - s.gesture.start.y };
    const snap = snapMove(s.doc, s.gesture.ids, raw);
    const current = { x: pt.x + snap.dx, y: pt.y + snap.dy };
    return { gesture: { ...s.gesture, current }, mods: mods ?? s.mods, snapGuides: snap.guides };
  }
  return { gesture: { ...s.gesture, current: pt }, mods: mods ?? s.mods, snapGuides: [] };
}

/**
 * The editor store wires the (pure, tested) model, command, geometry, and
 * gesture layers to React. It owns the document and one `History`; every
 * mutation routes through `run`, so undo/redo stays correct in a single place.
 */
export const useEditor = create<EditorState>((set, get) => {
  const history = new History();
  const run = (command: Command) => {
    set((s) => ({ doc: command.apply(s.doc) }));
    history.push(command);
    set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
  };
  const refresh = () => set({ canUndo: history.canUndo(), canRedo: history.canRedo() });

  return {
    doc: createDocument(800, 600),
    selection: [],
    tool: "select",
    gesture: { kind: "none" },
    mods: { aspect: false, snap: false },
    clipboard: [],
    pen: null,
    nodeDrag: null,
    nodeSel: null,
    snapEnabled: true,
    snapGuides: [],
    canUndo: false,
    canRedo: false,
    setTool: (tool) => set({ tool, gesture: { kind: "none" }, pen: null, nodeDrag: null, nodeSel: null }),
    setSelection: (ids) => set({ selection: ids }),
    pointerDown: (pt, targetId, additive) => startPointer({ get, set }, pt, targetId, additive),
    pointerDrag: (pt, mods) => set((s) => applyDrag(s, pt, mods)),
    pointerUp: () => endPointer(get, set, run),
    cancelGesture: () => set({ gesture: { kind: "none" }, snapGuides: [] }),
    setSnap: (enabled) => set({ snapEnabled: enabled, snapGuides: [] }),
    beginScale: (handle, pt) => {
      const b = selectionBounds(get().doc, get().selection);
      if (b) set({ gesture: { kind: "scale", handle, bounds: b, start: pt, current: pt, ids: get().selection } });
    },
    beginRotate: (pt) => {
      const b = selectionBounds(get().doc, get().selection);
      if (b) set({ gesture: { kind: "rotate", bounds: b, start: pt, current: pt, ids: get().selection } });
    },
    undo: () => {
      const cmd = history.popUndo();
      if (!cmd) return;
      set((s) => ({ doc: cmd.invert(s.doc), selection: [] }));
      refresh();
    },
    redo: () => {
      const cmd = history.popRedo();
      if (!cmd) return;
      set((s) => ({ doc: cmd.apply(s.doc) }));
      refresh();
    },
    exportSvg: () => serialize(get().doc),
    loadSvg: (svg) => {
      history.clear();
      set({
        doc: parse(svg),
        selection: [],
        gesture: { kind: "none" },
        pen: null,
        nodeDrag: null,
        nodeSel: null,
        snapGuides: [],
        canUndo: false,
        canRedo: false,
      });
    },
    ...createEditActions({ get, set, run }),
    ...createPathActions({ get, set, run }),
    ...createStyleActions({ get, set, run }),
    ...createTextActions({ get, set, run }),
  };
});
