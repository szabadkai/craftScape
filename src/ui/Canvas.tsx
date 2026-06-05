import { useRef, useState } from "react";
import { applyNodeDrag, type NodeDrag } from "../app/pathActions";
import { useEditor } from "../app/store";
import { findNode, type SceneNode, type SvgDocument } from "../core/model/document";
import { createViewport, type Point, type ViewportState } from "../core/viewport/Viewport";
import { normalizeRect, transformBounds, type Bounds } from "../geometry/bbox";
import { IDENTITY, toTransform, type Matrix } from "../geometry/matrix";
import { parsePath, type SubPath } from "../geometry/path";
import {
  gestureMatrix,
  selectionBounds,
  transformingIds,
  type Gesture,
  type Modifiers,
} from "../tools/gestures";
import { Overlay } from "./Overlay";
import { NodeOverlay, PenOverlay } from "./PathOverlay";
import { SceneView } from "./SceneView";
import { TransformHandles } from "./TransformHandles";
import { usePointerInput } from "./usePointerInput";

const ARTBOARD = { width: 800, height: 600 };
const INITIAL: ViewportState = { ...createViewport(), panX: 60, panY: 48 };

const isTransforming = (g: Gesture): boolean =>
  g.kind === "move" || g.kind === "scale" || g.kind === "rotate";

function baseBounds(g: Gesture, doc: SvgDocument): Bounds | null {
  if (g.kind === "scale" || g.kind === "rotate") return g.bounds;
  if (g.kind === "move") return selectionBounds(doc, g.ids);
  return null;
}

function editSubsFor(
  doc: SvgDocument,
  tool: string,
  id: string | undefined,
  drag: NodeDrag | null,
): { subs: SubPath[]; transform?: string } | null {
  if (tool !== "node" || !id) return null;
  const node = findNode(doc, id);
  if (!node || node.type !== "path") return null;
  const subs = drag ? applyNodeDrag(drag, true) : parsePath(node.attrs.d ?? "");
  return { subs, transform: node.attrs.transform };
}

interface Render {
  stationary: readonly SceneNode[];
  dragging: SceneNode[];
  live: Matrix;
  transforming: boolean;
  selBox: Bounds | null;
  previewBox: Bounds | null;
  edit: { subs: SubPath[]; transform?: string } | null;
}

interface EditorSlice {
  doc: SvgDocument;
  selection: string[];
  gesture: Gesture;
  tool: string;
  mods: Modifiers;
  nodeDrag: NodeDrag | null;
}

/** Compute everything the canvas needs to draw, keeping the component lean. */
function derive(s: EditorSlice): Render {
  const transforming = isTransforming(s.gesture);
  const ids = new Set(transformingIds(s.gesture));
  const live = transforming ? gestureMatrix(s.gesture, s.mods) : IDENTITY;
  const base = transforming ? baseBounds(s.gesture, s.doc) : selectionBounds(s.doc, s.selection);
  const previewBox =
    s.gesture.kind === "create" || s.gesture.kind === "marquee"
      ? normalizeRect(s.gesture.start, s.gesture.current)
      : null;
  return {
    stationary: transforming ? s.doc.children.filter((c) => !ids.has(c.id)) : s.doc.children,
    dragging: transforming ? s.doc.children.filter((c) => ids.has(c.id)) : [],
    live,
    transforming,
    selBox: transforming && base ? transformBounds(live, base) : base,
    previewBox,
    edit: editSubsFor(s.doc, s.tool, s.selection[0], s.nodeDrag),
  };
}

const GUIDE_SPAN = 100000;

export function Canvas() {
  const { doc, selection, gesture, tool, mods, pen, nodeDrag, nodeSel, snapGuides, snapEnabled, setSnap } = useEditor();
  const [vp, setVp] = useState<ViewportState>(INITIAL);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const surfaceRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const handlers = usePointerInput({ surfaceRef, vpRef, setVp, onCursor: setCursor });

  const r = derive({ doc, selection, gesture, tool, mods, nodeDrag });

  return (
    <div className="canvas-wrap">
      <svg ref={surfaceRef} className="canvas-surface" {...handlers}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#e3e6ea" strokeWidth="1" />
          </pattern>
        </defs>
        <g transform={`translate(${vp.panX} ${vp.panY}) scale(${vp.scale})`}>
          <rect width={ARTBOARD.width} height={ARTBOARD.height} fill="#fff" stroke="#b8bec7" strokeWidth={1 / vp.scale} />
          <rect width={ARTBOARD.width} height={ARTBOARD.height} fill="url(#grid)" pointerEvents="none" />
          <SceneView nodes={r.stationary} />
          <g transform={toTransform(r.live)}>
            <SceneView nodes={r.dragging} />
          </g>
          {r.selBox && tool === "select" && !r.transforming && (
            <TransformHandles bounds={r.selBox} scale={vp.scale} />
          )}
          {r.selBox && r.transforming && (
            <rect
              x={r.selBox.x}
              y={r.selBox.y}
              width={r.selBox.width}
              height={r.selBox.height}
              fill="none"
              stroke="#3b6cf6"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
          {snapGuides.map((g, i) =>
            g.axis === "x" ? (
              <line key={i} x1={g.pos} y1={-GUIDE_SPAN} x2={g.pos} y2={GUIDE_SPAN} stroke="#ff3b9a" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />
            ) : (
              <line key={i} x1={-GUIDE_SPAN} y1={g.pos} x2={GUIDE_SPAN} y2={g.pos} stroke="#ff3b9a" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />
            ),
          )}
          <Overlay gesture={gesture} tool={tool} box={r.previewBox} />
          {tool === "pen" && pen && <PenOverlay draft={pen} scale={vp.scale} />}
          {r.edit && (
            <g transform={r.edit.transform}>
              <NodeOverlay subs={r.edit.subs} scale={vp.scale} selected={nodeSel} />
            </g>
          )}
        </g>
      </svg>
      <div className="statusbar">
        <span>x {cursor.x.toFixed(0)}</span>
        <span>y {cursor.y.toFixed(0)}</span>
        {r.selBox && (
          <span>
            {r.selBox.width.toFixed(0)} × {r.selBox.height.toFixed(0)}
          </span>
        )}
        <span>{(vp.scale * 100).toFixed(0)}%</span>
        <label className="snap-toggle">
          <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnap(e.target.checked)} /> Snap
        </label>
        <button type="button" onClick={() => setVp(INITIAL)}>
          Reset view
        </button>
      </div>
    </div>
  );
}
