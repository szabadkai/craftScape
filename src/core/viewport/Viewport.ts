/**
 * Owns the mapping between screen (pixel) space and document (SVG user) space.
 *
 * Every tool and the snapping engine works in *document* coordinates; the
 * Viewport is the single place that knows about pan/zoom. Keeping this logic in
 * one well-tested unit is a core architectural decision (see docs/PLAN.md §3).
 *
 * The transform applied to a document point p is:  screen = (p * scale) + pan
 */
export interface Point {
  x: number;
  y: number;
}

export interface ViewportState {
  /** Pixels per document unit. */
  scale: number;
  /** Screen-space translation of the document origin, in pixels. */
  panX: number;
  panY: number;
}

export const MIN_SCALE = 0.02;
export const MAX_SCALE = 256;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function createViewport(): ViewportState {
  return { scale: 1, panX: 0, panY: 0 };
}

/** Document space -> screen space. */
export function toScreen(vp: ViewportState, p: Point): Point {
  return { x: p.x * vp.scale + vp.panX, y: p.y * vp.scale + vp.panY };
}

/** Screen space -> document space. */
export function toDocument(vp: ViewportState, p: Point): Point {
  return { x: (p.x - vp.panX) / vp.scale, y: (p.y - vp.panY) / vp.scale };
}

/** Pan by a screen-space delta (e.g. a drag). */
export function pan(vp: ViewportState, dx: number, dy: number): ViewportState {
  return { ...vp, panX: vp.panX + dx, panY: vp.panY + dy };
}

/**
 * Zoom by `factor`, keeping the document point currently under `pivot`
 * (a screen-space point, typically the cursor) fixed on screen.
 */
export function zoomAt(
  vp: ViewportState,
  factor: number,
  pivot: Point,
): ViewportState {
  const nextScale = clampScale(vp.scale * factor);
  // Document point under the pivot must remain under the pivot after zoom.
  const docPoint = toDocument(vp, pivot);
  return {
    scale: nextScale,
    panX: pivot.x - docPoint.x * nextScale,
    panY: pivot.y - docPoint.y * nextScale,
  };
}
