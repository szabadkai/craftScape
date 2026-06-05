import type { StoreApi } from "zustand";
import {
  addNodeCommand,
  compositeCommand,
  convertToPathCommand,
  setAttrsCommand,
  type Command,
} from "../core/commands/commands";
import { findNode, freshId, type SceneNode } from "../core/model/document";
import type { Point } from "../core/viewport/Viewport";
import { parsePath, serializePath, type Anchor, type SubPath } from "../geometry/path";
import { nodeToPathD } from "../geometry/shapeToPath";
import { deleteAnchor, setHandle, translateAnchor, type HandleKind, type NodeRef } from "../tools/pathEdit";
import type { EditorState } from "./store";

/** A path being drawn with the pen tool, before it is committed to the document. */
export interface PenDraft {
  anchors: Anchor[];
  hover: Point;
  dragging: boolean;
}

/** A node-editing drag in progress (anchor point or one of its handles). */
export interface NodeDrag {
  ref: NodeRef;
  which: HandleKind;
  baseSubs: SubPath[];
  start: Point;
  current: Point;
}

interface Ctx {
  get: () => EditorState;
  set: StoreApi<EditorState>["setState"];
  run: (command: Command) => void;
}

const PATH_STYLE = { fill: "none", stroke: "#1f2430", "stroke-width": "2" };

/** The sub-paths a node drag produces, applied live for preview and on commit. */
export function applyNodeDrag(nd: NodeDrag, mirror: boolean): SubPath[] {
  if (nd.which === "point") {
    return translateAnchor(nd.baseSubs, nd.ref, { x: nd.current.x - nd.start.x, y: nd.current.y - nd.start.y });
  }
  return setHandle(nd.baseSubs, nd.ref, nd.current, { which: nd.which, mirror });
}

function editedPath(get: () => EditorState): { id: string; node: SceneNode } | null {
  const id = get().selection[0];
  const node = id ? findNode(get().doc, id) : undefined;
  return node && node.type === "path" ? { id, node } : null;
}

/** Pen-tool drawing and node-tool editing actions. */
export function createPathActions({ get, set, run }: Ctx) {
  const penDown = (pt: Point) => {
    const pen = get().pen;
    const anchors = pen ? [...pen.anchors, { point: pt }] : [{ point: pt }];
    set({ pen: { anchors, hover: pt, dragging: true } });
  };

  const finishPen = (closed: boolean) => {
    const pen = get().pen;
    if (pen && pen.anchors.length >= 2) {
      const d = serializePath([{ closed, anchors: pen.anchors }]);
      const node: SceneNode = { id: freshId("path"), type: "path", attrs: { ...PATH_STYLE, d }, children: [] };
      run(addNodeCommand(get().doc.id, node));
      set({ pen: null, selection: [node.id] });
    } else {
      set({ pen: null });
    }
  };

  return {
    penDown,
    penMove: (pt: Point) => {
      const pen = get().pen;
      if (!pen) return;
      if (!pen.dragging) return set({ pen: { ...pen, hover: pt } });
      const anchors = [...pen.anchors];
      const last = anchors[anchors.length - 1];
      anchors[anchors.length - 1] = {
        point: last.point,
        out: { ...pt },
        in: { x: 2 * last.point.x - pt.x, y: 2 * last.point.y - pt.y },
      };
      set({ pen: { anchors, hover: pt, dragging: true } });
    },
    penUp: () => {
      const pen = get().pen;
      if (pen) set({ pen: { ...pen, dragging: false } });
    },
    penClose: () => finishPen(true),
    finishPen,
    penCancel: () => set({ pen: null }),
    nodeDown: (ref: NodeRef, which: HandleKind, pt: Point) => {
      const target = editedPath(get);
      if (!target) return;
      set({
        nodeDrag: { ref, which, baseSubs: parsePath(target.node.attrs.d ?? ""), start: pt, current: pt },
        nodeSel: ref,
      });
    },
    nodeMove: (pt: Point) => {
      const nd = get().nodeDrag;
      if (nd) set({ nodeDrag: { ...nd, current: pt } });
    },
    nodeUp: (mirror: boolean) => {
      const nd = get().nodeDrag;
      const target = editedPath(get);
      if (nd && target && (nd.start.x !== nd.current.x || nd.start.y !== nd.current.y)) {
        run(setAttrsCommand(get().doc, target.id, { d: serializePath(applyNodeDrag(nd, mirror)) }));
      }
      set({ nodeDrag: null });
    },
    deleteNode: () => {
      const sel = get().nodeSel;
      const target = editedPath(get);
      if (!sel || !target) return;
      const edited = deleteAnchor(parsePath(target.node.attrs.d ?? ""), sel);
      run(setAttrsCommand(get().doc, target.id, { d: serializePath(edited) }));
      set({ nodeSel: null });
    },
    convertToPath: () => {
      const { doc, selection } = get();
      const cmds = selection
        .map((id) => findNode(doc, id))
        .filter((n): n is SceneNode => !!n && nodeToPathD(n) !== null)
        .map((n) => convertToPathCommand(doc, n.id));
      if (cmds.length > 0) run(compositeCommand("Object to Path", cmds));
    },
  };
}
