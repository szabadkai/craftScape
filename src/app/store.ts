import { create } from "zustand";
import type { Command } from "../core/commands/commands";
import { compositeCommand, removeNodeCommand } from "../core/commands/commands";
import { History } from "../core/commands/history";
import { createDocument, type SvgDocument } from "../core/model/document";
import type { Point } from "../core/viewport/Viewport";
import { normalizeRect } from "../geometry/bbox";
import { parse } from "../svg/parse";
import { serialize } from "../svg/serialize";
import { commitCreate, commitMove, marqueeSelection } from "../tools/gestures";

export type ToolId = "select" | "rect" | "ellipse";

/** Transient interaction state — never recorded in history until it commits. */
export type Gesture =
  | { kind: "none" }
  | { kind: "create"; start: Point; current: Point }
  | { kind: "move"; start: Point; current: Point; ids: string[] }
  | { kind: "marquee"; start: Point; current: Point };

interface EditorState {
  doc: SvgDocument;
  selection: string[];
  tool: ToolId;
  gesture: Gesture;
  canUndo: boolean;
  canRedo: boolean;
  setTool: (tool: ToolId) => void;
  setSelection: (ids: string[]) => void;
  pointerDown: (pt: Point, targetId: string | null, additive: boolean) => void;
  pointerDrag: (pt: Point) => void;
  pointerUp: () => void;
  cancelGesture: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  exportSvg: () => string;
  loadSvg: (svg: string) => void;
}

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/**
 * The editor store wires together the (pure, tested) model, command, and
 * gesture layers and exposes them to React. It owns the document and a single
 * `History`; tools mutate the document only by routing commands through
 * `run()`, which keeps undo/redo correct in one place.
 */
export const useEditor = create<EditorState>((set, get) => {
  const history = new History();

  const run = (command: Command) => {
    set((s) => ({ doc: command.apply(s.doc) }));
    history.push(command);
    set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
  };

  const startPointer = (pt: Point, targetId: string | null, additive: boolean) => {
    const { tool, selection } = get();
    if (tool === "rect" || tool === "ellipse") {
      set({ gesture: { kind: "create", start: pt, current: pt } });
      return;
    }
    if (targetId) {
      const ids = additive
        ? toggle(selection, targetId)
        : selection.includes(targetId)
          ? selection
          : [targetId];
      set({ selection: ids, gesture: { kind: "move", start: pt, current: pt, ids } });
    } else {
      set({
        selection: additive ? selection : [],
        gesture: { kind: "marquee", start: pt, current: pt },
      });
    }
  };

  const endPointer = () => {
    const { gesture, doc, tool } = get();
    if (gesture.kind === "create") {
      const res = commitCreate(doc, tool === "ellipse" ? "ellipse" : "rect", gesture.start, gesture.current);
      if (res) {
        run(res.command);
        set({ selection: [res.id] });
      }
    } else if (gesture.kind === "move") {
      const cmd = commitMove(doc, gesture.ids, gesture.current.x - gesture.start.x, gesture.current.y - gesture.start.y);
      if (cmd) run(cmd);
    } else if (gesture.kind === "marquee") {
      const box = normalizeRect(gesture.start, gesture.current);
      if (box.width > 1 || box.height > 1) set({ selection: marqueeSelection(doc, box) });
    }
    set({ gesture: { kind: "none" } });
  };

  return {
    doc: createDocument(800, 600),
    selection: [],
    tool: "select",
    gesture: { kind: "none" },
    canUndo: false,
    canRedo: false,
    setTool: (tool) => set({ tool, gesture: { kind: "none" } }),
    setSelection: (ids) => set({ selection: ids }),
    pointerDown: startPointer,
    pointerDrag: (pt) =>
      set((s) => (s.gesture.kind === "none" ? s : { gesture: { ...s.gesture, current: pt } })),
    pointerUp: endPointer,
    cancelGesture: () => set({ gesture: { kind: "none" } }),
    undo: () => {
      const cmd = history.popUndo();
      if (!cmd) return;
      set((s) => ({ doc: cmd.invert(s.doc), selection: [] }));
      set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
    },
    redo: () => {
      const cmd = history.popRedo();
      if (!cmd) return;
      set((s) => ({ doc: cmd.apply(s.doc) }));
      set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
    },
    deleteSelection: () => {
      const { doc, selection } = get();
      if (selection.length === 0) return;
      run(compositeCommand("Delete", selection.map((id) => removeNodeCommand(doc, id))));
      set({ selection: [] });
    },
    exportSvg: () => serialize(get().doc),
    loadSvg: (svg) => {
      history.clear();
      set({ doc: parse(svg), selection: [], gesture: { kind: "none" }, canUndo: false, canRedo: false });
    },
  };
});
