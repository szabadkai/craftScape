import { useRef, useState } from "react";
import { useEditor, type Gesture } from "../app/store";
import { findNode, type SceneNode } from "../core/model/document";
import { createViewport, type Point, type ViewportState } from "../core/viewport/Viewport";
import { nodeBounds, normalizeRect, type Bounds } from "../geometry/bbox";
import { Overlay } from "./Overlay";
import { SceneView } from "./SceneView";
import { usePointerInput } from "./usePointerInput";

const ARTBOARD = { width: 800, height: 600 };
const INITIAL: ViewportState = { ...createViewport(), panX: 60, panY: 48 };

/** Live translation of nodes mid-drag, before the move is committed to history. */
function moveOffset(gesture: Gesture): { ids: Set<string>; dx: number; dy: number } {
  if (gesture.kind !== "move") return { ids: new Set(), dx: 0, dy: 0 };
  return {
    ids: new Set(gesture.ids),
    dx: gesture.current.x - gesture.start.x,
    dy: gesture.current.y - gesture.start.y,
  };
}

function selectionRects(
  doc: SceneNode,
  selection: string[],
  off: { ids: Set<string>; dx: number; dy: number },
): Bounds[] {
  const rects: Bounds[] = [];
  for (const id of selection) {
    const node = findNode(doc, id);
    const b = node && nodeBounds(node);
    if (!b) continue;
    const shift = off.ids.has(id);
    rects.push({ ...b, x: b.x + (shift ? off.dx : 0), y: b.y + (shift ? off.dy : 0) });
  }
  return rects;
}

export function Canvas() {
  const { doc, selection, gesture, tool } = useEditor();
  const [vp, setVp] = useState<ViewportState>(INITIAL);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const surfaceRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });

  const handlers = usePointerInput({ surfaceRef, vpRef, setVp, onCursor: setCursor });

  const off = moveOffset(gesture);
  const dragging = doc.children.filter((c) => off.ids.has(c.id));
  const stationary = doc.children.filter((c) => !off.ids.has(c.id));
  const rects = selectionRects(doc, selection, off);
  const previewBox =
    gesture.kind === "create" || gesture.kind === "marquee"
      ? normalizeRect(gesture.start, gesture.current)
      : null;

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
          <SceneView nodes={stationary} />
          <g transform={`translate(${off.dx} ${off.dy})`}>
            <SceneView nodes={dragging} />
          </g>
          <Overlay rects={rects} gesture={gesture} tool={tool} box={previewBox} />
        </g>
      </svg>
      <div className="statusbar">
        <span>x {cursor.x.toFixed(0)}</span>
        <span>y {cursor.y.toFixed(0)}</span>
        <span>{(vp.scale * 100).toFixed(0)}%</span>
        <button type="button" onClick={() => setVp(INITIAL)}>
          Reset view
        </button>
      </div>
    </div>
  );
}
