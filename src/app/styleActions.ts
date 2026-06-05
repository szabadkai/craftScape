import type { StoreApi } from "zustand";
import {
  compositeCommand,
  setAttrsCommand,
  setFillGradientCommand,
  type Command,
} from "../core/commands/commands";
import { findNode, freshId } from "../core/model/document";
import { DEFAULT_STOPS, gradientNode, gradientRefId, type GradientKind } from "../style/gradient";
import type { EditorState } from "./store";

interface Ctx {
  get: () => EditorState;
  set: StoreApi<EditorState>["setState"];
  run: (command: Command) => void;
}

export type StylePatch = Record<string, string>;

/** Fill/stroke styling actions, applied across the whole selection. */
export function createStyleActions({ get, run }: Ctx) {
  return {
    setStyle: (patch: StylePatch) => {
      const { doc, selection } = get();
      if (selection.length === 0) return;
      run(compositeCommand("Style", selection.map((id) => setAttrsCommand(doc, id, patch))));
    },
    applyGradient: (kind: GradientKind) => {
      const { doc, selection } = get();
      const cmds = selection.map((id) =>
        setFillGradientCommand(doc, id, gradientNode(kind, freshId("grad"), DEFAULT_STOPS)),
      );
      if (cmds.length > 0) run(compositeCommand("Apply gradient", cmds));
    },
    setGradientStop: (index: number, patch: StylePatch) => {
      const { doc, selection } = get();
      const gradId = gradientRefId(findNode(doc, selection[0])?.attrs.fill);
      const stopId = gradId ? `${gradId}-s${index}` : null;
      if (stopId && findNode(doc, stopId)) run(setAttrsCommand(doc, stopId, patch));
    },
  };
}
