import type { Bounds } from "../geometry/bbox";
import { handlesFor, ROTATE_OFFSET, type HandleId } from "../geometry/handles";

const CURSORS: Record<HandleId, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  rotate: "grab",
};

/**
 * The interactive selection frame: eight scale handles plus a rotate handle.
 * Sizes are divided by `scale` so handles stay a constant on-screen size at any
 * zoom. Each handle carries `data-handle`, which `usePointerInput` reads to
 * start the matching transform gesture.
 */
export function TransformHandles({ bounds, scale }: { bounds: Bounds; scale: number }) {
  const size = 9 / scale;
  const half = size / 2;
  const cx = bounds.x + bounds.width / 2;
  const rotateY = bounds.y - ROTATE_OFFSET / scale;
  const scaleHandles = handlesFor(bounds).filter((h) => h.id !== "rotate");

  return (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#3b6cf6"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <line
        x1={cx}
        y1={bounds.y}
        x2={cx}
        y2={rotateY}
        stroke="#3b6cf6"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <circle
        data-handle="rotate"
        cx={cx}
        cy={rotateY}
        r={half}
        fill="#fff"
        stroke="#3b6cf6"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={{ cursor: CURSORS.rotate }}
      />
      {scaleHandles.map((h) => (
        <rect
          key={h.id}
          data-handle={h.id}
          x={h.x - half}
          y={h.y - half}
          width={size}
          height={size}
          fill="#fff"
          stroke="#3b6cf6"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: CURSORS[h.id] }}
        />
      ))}
    </g>
  );
}
