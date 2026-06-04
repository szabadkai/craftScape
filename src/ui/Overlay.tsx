import type { Gesture, ToolId } from "../app/store";
import type { Bounds } from "../geometry/bbox";

/**
 * Non-document chrome drawn inside the viewport: selection outlines, the
 * marquee, and the shape preview while drawing. Strokes use
 * `vector-effect: non-scaling-stroke` so they stay crisp at any zoom.
 */
export function Overlay({
  rects,
  gesture,
  tool,
  box,
}: {
  rects: Bounds[];
  gesture: Gesture;
  tool: ToolId;
  box: Bounds | null;
}) {
  return (
    <g pointerEvents="none">
      {rects.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
          fill="none"
          stroke="#3b6cf6"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {box && gesture.kind === "marquee" && (
        <rect
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          fill="rgba(59,108,246,0.12)"
          stroke="#3b6cf6"
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {box && gesture.kind === "create" && tool === "ellipse" && (
        <ellipse
          cx={box.x + box.width / 2}
          cy={box.y + box.height / 2}
          rx={box.width / 2}
          ry={box.height / 2}
          fill="rgba(255,122,89,0.25)"
          stroke="#ff7a59"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {box && gesture.kind === "create" && tool !== "ellipse" && (
        <rect
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          fill="rgba(79,140,255,0.25)"
          stroke="#4f8cff"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}
