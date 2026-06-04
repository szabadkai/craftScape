import { useEffect } from "react";
import { useEditor } from "../app/store";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

const TOOL_KEYS: Record<string, "select" | "rect" | "ellipse"> = {
  v: "select",
  r: "rect",
  e: "ellipse",
};

/** Inkscape-flavoured shortcuts: undo/redo, delete, tool switching, escape. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const store = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.key === "Z")) {
        e.preventDefault();
        store.redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        store.deleteSelection();
      } else if (e.key === "Escape") {
        store.cancelGesture();
        store.setSelection([]);
      } else if (!mod && TOOL_KEYS[e.key]) {
        store.setTool(TOOL_KEYS[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
