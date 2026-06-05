import { useEffect } from "react";
import { useEditor, type EditorState, type ToolId } from "../app/store";
import type { ZMode } from "../tools/zorder";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

const TOOL_KEYS: Record<string, ToolId> = { v: "select", r: "rect", e: "ellipse", p: "pen", n: "node", t: "text" };
const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
const ORDER: Record<string, ZMode> = { Home: "front", End: "back", PageUp: "raise", PageDown: "lower" };

/** Ctrl/⌘ chords: history, clipboard, duplicate, grouping. */
function modShortcut(e: KeyboardEvent, store: EditorState): boolean {
  const map: Record<string, () => void> = {
    z: () => (e.shiftKey ? store.redo() : store.undo()),
    y: () => store.redo(),
    c: () => (e.shiftKey ? store.convertToPath() : store.copy()),
    x: () => store.cut(),
    v: () => store.paste(),
    d: () => store.duplicate(),
    g: () => (e.shiftKey ? store.ungroup() : store.group()),
  };
  const fn = map[e.key.toLowerCase()];
  if (!fn) return false;
  e.preventDefault();
  fn();
  return true;
}

/** Unmodified keys: nudge, z-order, delete, escape, tool switching. */
function plainShortcut(e: KeyboardEvent, store: EditorState): boolean {
  const nudge = NUDGE[e.key];
  if (nudge) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    store.nudge(nudge[0] * step, nudge[1] * step);
  } else if (ORDER[e.key]) {
    store.zOrder(ORDER[e.key]);
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    if (store.tool === "node") store.deleteNode();
    else store.deleteSelection();
  } else if (e.key === "Enter") {
    store.finishPen(false);
  } else if (e.key === "Escape") {
    store.penCancel();
    store.cancelGesture();
    store.setSelection([]);
  } else if (TOOL_KEYS[e.key]) {
    store.setTool(TOOL_KEYS[e.key]);
  } else {
    return false;
  }
  return true;
}

/** Inkscape-flavoured keyboard shortcuts wired to the editor store. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const store = useEditor.getState();
      if (e.metaKey || e.ctrlKey) modShortcut(e, store);
      else plainShortcut(e, store);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
