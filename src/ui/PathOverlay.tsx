import type { PenDraft } from "../app/pathActions";
import type { Point } from "../core/viewport/Viewport";
import { serializePath, type SubPath } from "../geometry/path";
import type { NodeRef } from "../tools/pathEdit";

const OUTLINE = { fill: "none", stroke: "#3b6cf6", strokeWidth: 1, vectorEffect: "non-scaling-stroke" } as const;

/** Live preview of the path being drawn with the pen tool. */
export function PenOverlay({ draft, scale }: { draft: PenDraft; scale: number }) {
  const size = 8 / scale;
  const last = draft.anchors[draft.anchors.length - 1];
  return (
    <g>
      <path d={serializePath([{ closed: false, anchors: draft.anchors }])} {...OUTLINE} pointerEvents="none" />
      {last && (
        <line
          x1={last.point.x}
          y1={last.point.y}
          x2={draft.hover.x}
          y2={draft.hover.y}
          {...OUTLINE}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
      {draft.anchors.map((a, i) => (
        <rect
          key={i}
          data-pen={i === 0 ? "close" : undefined}
          x={a.point.x - size / 2}
          y={a.point.y - size / 2}
          width={size}
          height={size}
          fill={i === 0 ? "#3b6cf6" : "#fff"}
          stroke="#3b6cf6"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          pointerEvents={i === 0 ? "auto" : "none"}
          style={{ cursor: i === 0 ? "pointer" : "default" }}
        />
      ))}
    </g>
  );
}

function HandleLine({ from, to }: { from: Point; to: Point }) {
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#3b6cf6" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />;
}

/** Editable anchors and Bézier handles for the path under the node tool. */
export function NodeOverlay({ subs, scale, selected }: { subs: SubPath[]; scale: number; selected: NodeRef | null }) {
  const size = 8 / scale;
  const radius = 4 / scale;
  return (
    <g>
      <path d={serializePath(subs)} {...OUTLINE} pointerEvents="none" />
      {subs.map((sub, si) =>
        sub.anchors.map((a, ai) => {
          const isSel = selected?.si === si && selected?.ai === ai;
          return (
            <g key={`${si}:${ai}`}>
              {a.in && <HandleLine from={a.point} to={a.in} />}
              {a.out && <HandleLine from={a.point} to={a.out} />}
              {a.in && <circle data-node={`${si}:${ai}:in`} cx={a.in.x} cy={a.in.y} r={radius} fill="#fff" stroke="#3b6cf6" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
              {a.out && <circle data-node={`${si}:${ai}:out`} cx={a.out.x} cy={a.out.y} r={radius} fill="#fff" stroke="#3b6cf6" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
              <rect
                data-node={`${si}:${ai}:point`}
                x={a.point.x - size / 2}
                y={a.point.y - size / 2}
                width={size}
                height={size}
                fill={isSel ? "#3b6cf6" : "#fff"}
                stroke="#3b6cf6"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "move" }}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}
