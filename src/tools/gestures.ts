import {
  addNodeCommand,
  compositeCommand,
  setAttrsCommand,
  type Command,
} from "../core/commands/commands";
import {
  ellipseNode,
  findNode,
  rectNode,
  type SvgDocument,
} from "../core/model/document";
import type { Point } from "../core/viewport/Viewport";
import {
  boundsIntersect,
  nodeBounds,
  normalizeRect,
  type Bounds,
} from "../geometry/bbox";
import { composeTranslate } from "../geometry/transform";

export type CreateTool = "rect" | "ellipse";

/** Build the command (and id) for a shape dragged from `start` to `current`. */
export function commitCreate(
  doc: SvgDocument,
  tool: CreateTool,
  start: Point,
  current: Point,
): { command: Command; id: string } | null {
  const b = normalizeRect(start, current);
  if (b.width < 1 && b.height < 1) return null; // ignore stray clicks
  const node =
    tool === "ellipse"
      ? ellipseNode({
          cx: b.x + b.width / 2,
          cy: b.y + b.height / 2,
          rx: b.width / 2,
          ry: b.height / 2,
        })
      : rectNode({ x: b.x, y: b.y, width: b.width, height: b.height });
  return { command: addNodeCommand(doc.id, node), id: node.id };
}

/** Build one undoable command that translates every selected node by (dx, dy). */
export function commitMove(
  doc: SvgDocument,
  ids: string[],
  dx: number,
  dy: number,
): Command | null {
  if (ids.length === 0 || (dx === 0 && dy === 0)) return null;
  const commands = ids.map((id) => {
    const base = findNode(doc, id)?.attrs.transform;
    return setAttrsCommand(doc, id, { transform: composeTranslate(base, dx, dy) });
  });
  return compositeCommand("Move", commands);
}

/** Top-level node ids whose bounds intersect the marquee rect. */
export function marqueeSelection(doc: SvgDocument, marquee: Bounds): string[] {
  const ids: string[] = [];
  for (const child of doc.children) {
    const b = nodeBounds(child);
    if (b && boundsIntersect(b, marquee)) ids.push(child.id);
  }
  return ids;
}
