import type { StoreApi } from "zustand";
import { addNodeCommand, setTextCommand, type Command } from "../core/commands/commands";
import { findNode, textNode } from "../core/model/document";
import type { Point } from "../core/viewport/Viewport";
import type { EditorState } from "./store";

interface Ctx {
  get: () => EditorState;
  set: StoreApi<EditorState>["setState"];
  run: (command: Command) => void;
}

/** Text-tool actions: place a `<text>` node and edit its content. */
export function createTextActions({ get, set, run }: Ctx) {
  return {
    addText: (pt: Point) => {
      const node = textNode({ x: pt.x, y: pt.y, text: "Text" });
      run(addNodeCommand(get().doc.id, node));
      set({ selection: [node.id], tool: "select" });
    },
    setText: (text: string) => {
      const id = get().selection[0];
      if (id && findNode(get().doc, id)?.type === "text") run(setTextCommand(get().doc, id, text));
    },
  };
}
