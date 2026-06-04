import {
  addNodeCommand,
  compositeCommand,
  setAttrsCommand,
  type Command,
} from "../core/commands/commands";
import { ellipseNode, findNode, rectNode, type SvgDocument } from "../core/model/document";
import type { Point } from "../core/viewport/Viewport";
import {
  boundsIntersect,
  nodeBounds,
  normalizeRect,
  unionBounds,
  type Bounds,
} from "../geometry/bbox";
import { rotateMatrixFor, scaleMatrixFor, type HandleId } from "../geometry/handles";
import {
  IDENTITY,
  multiply,
  parseMatrix,
  toTransform,
  translation,
  type Matrix,
} from "../geometry/matrix";
import type { Offset } from "../geometry/align";

export type CreateTool = "rect" | "ellipse";

/** Keyboard modifiers that change a gesture's behaviour mid-drag. */
export interface Modifiers {
  aspect: boolean;
  snap: boolean;
}

/** Transient interaction state — never recorded in history until it commits. */
export type Gesture =
  | { kind: "none" }
  | { kind: "create"; start: Point; current: Point }
  | { kind: "marquee"; start: Point; current: Point }
  | { kind: "move"; start: Point; current: Point; ids: string[] }
  | { kind: "scale"; handle: HandleId; bounds: Bounds; start: Point; current: Point; ids: string[] }
  | { kind: "rotate"; bounds: Bounds; start: Point; current: Point; ids: string[] };

/** The live world-space matrix a transform gesture currently represents. */
export function gestureMatrix(g: Gesture, mods: Modifiers): Matrix {
  if (g.kind === "move") return translation(g.current.x - g.start.x, g.current.y - g.start.y);
  const drag = "start" in g ? { start: g.start, current: g.current } : null;
  if (g.kind === "scale" && drag) return scaleMatrixFor(g.handle, g.bounds, drag, mods.aspect);
  if (g.kind === "rotate" && drag) return rotateMatrixFor(g.bounds, drag, mods.snap);
  return IDENTITY;
}

export function transformingIds(g: Gesture): string[] {
  return "ids" in g ? g.ids : [];
}

function isIdentity(m: Matrix): boolean {
  return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0;
}

function transformNode(doc: SvgDocument, id: string, world: Matrix): Command {
  const base = parseMatrix(findNode(doc, id)?.attrs.transform);
  return setAttrsCommand(doc, id, { transform: toTransform(multiply(world, base)) });
}

/** Build the command (and id) for a shape dragged from `start` to `current`. */
export function commitCreate(
  doc: SvgDocument,
  tool: CreateTool,
  start: Point,
  current: Point,
): { command: Command; id: string } | null {
  const b = normalizeRect(start, current);
  if (b.width < 1 && b.height < 1) return null;
  const node =
    tool === "ellipse"
      ? ellipseNode({ cx: b.x + b.width / 2, cy: b.y + b.height / 2, rx: b.width / 2, ry: b.height / 2 })
      : rectNode({ x: b.x, y: b.y, width: b.width, height: b.height });
  return { command: addNodeCommand(doc.id, node), id: node.id };
}

/** One undoable command applying world-space matrix `m` to every node in `ids`. */
export function commitTransform(doc: SvgDocument, ids: string[], m: Matrix): Command | null {
  if (ids.length === 0 || isIdentity(m)) return null;
  return compositeCommand("Transform", ids.map((id) => transformNode(doc, id, m)));
}

/** One undoable command applying a per-node translation (used by align/distribute). */
export function commitOffsets(doc: SvgDocument, offsets: Offset[]): Command | null {
  const moving = offsets.filter((o) => o.dx !== 0 || o.dy !== 0);
  if (moving.length === 0) return null;
  return compositeCommand(
    "Align",
    moving.map((o) => transformNode(doc, o.id, translation(o.dx, o.dy))),
  );
}

/** Combined world-space bounds of a set of nodes, or null if none measurable. */
export function selectionBounds(doc: SvgDocument, ids: string[]): Bounds | null {
  const list: Bounds[] = [];
  for (const id of ids) {
    const node = findNode(doc, id);
    const b = node && nodeBounds(node);
    if (b) list.push(b);
  }
  return unionBounds(list);
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
