import { useCallback, useRef, useState } from "react";
import {
  createViewport,
  pan,
  toDocument,
  zoomAt,
  type Point,
  type ViewportState,
} from "../core/viewport/Viewport";

const ARTBOARD = { width: 800, height: 600 };

/**
 * Phase 0 canvas: a pan/zoomable empty artboard rendered as native SVG.
 *
 * Rendering the document as SVG (rather than to a <canvas>) keeps a single
 * source of truth — the document *is* the SVG. The <g> transform is driven
 * directly by the Viewport. See docs/PLAN.md §2–§3.
 */
export function Canvas() {
  const [vp, setVp] = useState<ViewportState>(() => ({
    ...createViewport(),
    panX: 80,
    panY: 60,
  }));
  const surfaceRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [cursorDoc, setCursorDoc] = useState<Point>({ x: 0, y: 0 });

  const localPoint = useCallback((e: { clientX: number; clientY: number }): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setVp((cur) => zoomAt(cur, factor, localPoint(e)));
    },
    [localPoint],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Middle-button or space-less drag pans the canvas in Phase 0.
      if (e.button === 1 || e.button === 0) {
        dragRef.current = { x: e.clientX, y: e.clientY };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      setCursorDoc(toDocument(vp, localPoint(e)));
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      setVp((cur) => pan(cur, dx, dy));
    },
    [vp, localPoint],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const resetView = useCallback(
    () => setVp({ ...createViewport(), panX: 80, panY: 60 }),
    [],
  );

  const transform = `translate(${vp.panX} ${vp.panY}) scale(${vp.scale})`;

  return (
    <div className="canvas-wrap">
      <svg
        ref={surfaceRef}
        className="canvas-surface"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#e3e6ea" strokeWidth="1" />
          </pattern>
        </defs>
        <g transform={transform}>
          {/* The artboard: this rect is the document's page bounds. */}
          <rect
            x={0}
            y={0}
            width={ARTBOARD.width}
            height={ARTBOARD.height}
            fill="#ffffff"
            stroke="#b8bec7"
            strokeWidth={1 / vp.scale}
          />
          <rect
            x={0}
            y={0}
            width={ARTBOARD.width}
            height={ARTBOARD.height}
            fill="url(#grid)"
            pointerEvents="none"
          />
        </g>
      </svg>
      <div className="statusbar">
        <span>x: {cursorDoc.x.toFixed(1)}</span>
        <span>y: {cursorDoc.y.toFixed(1)}</span>
        <span>zoom: {(vp.scale * 100).toFixed(0)}%</span>
        <button type="button" onClick={resetView}>
          Reset view
        </button>
      </div>
    </div>
  );
}
