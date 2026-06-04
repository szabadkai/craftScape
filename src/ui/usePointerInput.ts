import { useCallback, useRef, type RefObject } from "react";
import { useEditor } from "../app/store";
import {
  pan,
  toDocument,
  zoomAt,
  type Point,
  type ViewportState,
} from "../core/viewport/Viewport";

interface Options {
  surfaceRef: RefObject<SVGSVGElement>;
  vpRef: RefObject<ViewportState>;
  setVp: (updater: (v: ViewportState) => ViewportState) => void;
  onCursor: (docPoint: Point) => void;
}

/**
 * Unifies all pointer input over one model: single pointer drives the active
 * tool (or pans with the middle button), two pointers pinch-zoom and pan. The
 * same code path therefore serves mouse, trackpad, and touch — which is what
 * makes the editor usable on mobile. Wheel follows the Inkscape convention:
 * scroll pans, Ctrl/⌘+scroll zooms.
 */
export function usePointerInput({ surfaceRef, vpRef, setVp, onCursor }: Options) {
  const pointers = useRef(new Map<number, Point>());
  const panning = useRef(false);
  const pinching = useRef(false);
  const lastPan = useRef<Point>({ x: 0, y: 0 });
  const pinchDist = useRef(0);
  const pinchMid = useRef<Point>({ x: 0, y: 0 });

  const local = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const r = surfaceRef.current?.getBoundingClientRect();
      return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
    },
    [surfaceRef],
  );

  const twoPointerMetrics = () => {
    const [a, b] = [...pointers.current.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      surfaceRef.current?.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        pinching.current = true;
        useEditor.getState().cancelGesture();
        const m = twoPointerMetrics();
        pinchDist.current = m.dist;
        pinchMid.current = m.mid;
        return;
      }
      if (pointers.current.size > 2) return;
      if (e.button === 1) {
        panning.current = true;
        lastPan.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const id = (e.target as Element).closest?.("[data-id]")?.getAttribute("data-id");
      const targetId = id && id !== "root" ? id : null;
      useEditor.getState().pointerDown(toDocument(vpRef.current!, local(e)), targetId, e.shiftKey);
    },
    [local, surfaceRef, vpRef],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (pointers.current.has(e.pointerId)) {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (pinching.current && pointers.current.size >= 2) {
        const m = twoPointerMetrics();
        const factor = pinchDist.current > 0 ? m.dist / pinchDist.current : 1;
        const dx = m.mid.x - pinchMid.current.x;
        const dy = m.mid.y - pinchMid.current.y;
        const r = surfaceRef.current!.getBoundingClientRect();
        const pivot = { x: m.mid.x - r.left, y: m.mid.y - r.top };
        setVp((v) => pan(zoomAt(v, factor, pivot), dx, dy));
        pinchDist.current = m.dist;
        pinchMid.current = m.mid;
        return;
      }
      if (panning.current) {
        setVp((v) => pan(v, e.clientX - lastPan.current.x, e.clientY - lastPan.current.y));
        lastPan.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const docPoint = toDocument(vpRef.current!, local(e));
      onCursor(docPoint);
      if (useEditor.getState().gesture.kind !== "none") {
        useEditor.getState().pointerDrag(docPoint);
      }
    },
    [local, onCursor, setVp, surfaceRef, vpRef],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    surfaceRef.current?.releasePointerCapture?.(e.pointerId);
    if (pointers.current.size === 0) {
      if (!panning.current && !pinching.current) useEditor.getState().pointerUp();
      panning.current = false;
      pinching.current = false;
    }
  }, [surfaceRef]);

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (e.ctrlKey || e.metaKey) {
        setVp((v) => zoomAt(v, Math.exp(-e.deltaY * 0.01), local(e)));
      } else {
        setVp((v) => pan(v, -e.deltaX, -e.deltaY));
      }
    },
    [local, setVp],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onWheel };
}
