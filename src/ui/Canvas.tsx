import { useRef, useState } from "react";
import { useEditor } from "../app/store";
import type { SvgDocument } from "../core/model/document";
import { createViewport, type Point, type ViewportState } from "../core/viewport/Viewport";
import { normalizeRect, transformBounds, type Bounds } from "../geometry/bbox";
import { IDENTITY, toTransform } from "../geometry/matrix";
import { gestureMatrix, selectionBounds, transformingIds, type Gesture } from "../tools/gestures";
import { Overlay } from "./Overlay";
import { SceneView } from "./SceneView";
import { TransformHandles } from "./TransformHandles";
import { usePointerInput } from "./usePointerInput";

const ARTBOARD = { width: 800, height: 600 };
const INITIAL: ViewportState = { ...createViewport(), panX: 60, panY: 48 };

const isTransforming = (g: Gesture): boolean =>
  g.kind === "move" || g.kind === "scale" || g.kind === "rotate";

/** The bounds a transform gesture started from, before the live matrix is applied. */
function baseBounds(g: Gesture, doc: SvgDocument): Bounds | null {
  if (g.kind === "scale" || g.kind === "rotate") return g.bounds;
  if (g.kind === "move") return selectionBounds(doc, g.ids);
  return null;
}

export function Canvas() {
  const { doc, selection, gesture, tool, mods } = useEditor();
  const [vp, setVp] = useState<ViewportState>(INITIAL);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const surfaceRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const handlers = usePointerInput({ surfaceRef, vpRef, setVp, onCursor: setCursor });

  const transforming = isTransforming(gesture);
  const ids = new Set(transformingIds(gesture));
  const live = transforming ? gestureMatrix(gesture, mods) : IDENTITY;
  const dragging = transforming ? doc.children.filter((c) => ids.has(c.id)) : [];
  const stationary = transforming ? doc.children.filter((c) => !ids.has(c.id)) : doc.children;
  const base = transforming ? baseBounds(gesture, doc) : selectionBounds(doc, selection);
  const selBox = transforming && base ? transformBounds(live, base) : base;
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
          <g transform={toTransform(live)}>
            <SceneView nodes={dragging} />
          </g>
          {selBox && tool === "select" && !transforming && (
            <TransformHandles bounds={selBox} scale={vp.scale} />
          )}
          {selBox && transforming && (
            <rect
              x={selBox.x}
              y={selBox.y}
              width={selBox.width}
              height={selBox.height}
              fill="none"
              stroke="#3b6cf6"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
          <Overlay gesture={gesture} tool={tool} box={previewBox} />
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
