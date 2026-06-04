import type { Gesture, ToolId } from "../app/store";
import type { Bounds } from "../geometry/bbox";

/**
 * Transient drawing chrome: the marquee rectangle and the live shape preview.
 * The persistent selection frame/handles are drawn separately by the Canvas.
 * Strokes use non-scaling-stroke so they stay crisp at any zoom.
 */
export function Overlay({ gesture, tool, box }: { gesture: Gesture; tool: ToolId; box: Bounds | null }) {
  if (!box) return null;
  if (gesture.kind === "marquee") {
    return (
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
        pointerEvents="none"
      />
    );
  }
  if (gesture.kind !== "create") return null;
  if (tool === "ellipse") {
    return (
      <ellipse
        cx={box.x + box.width / 2}
        cy={box.y + box.height / 2}
        rx={box.width / 2}
        ry={box.height / 2}
        fill="rgba(255,122,89,0.25)"
        stroke="#ff7a59"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    );
  }
  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      fill="rgba(79,140,255,0.25)"
      stroke="#4f8cff"
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}
