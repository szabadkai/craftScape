import { unionBounds, type Bounds } from "./bbox";

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

export interface AlignItem {
  id: string;
  bounds: Bounds;
}

export interface Offset {
  id: string;
  dx: number;
  dy: number;
}

/** Per-item translation that aligns every item to the selection's bounding box. */
export function alignOffsets(items: AlignItem[], mode: AlignMode): Offset[] {
  if (items.length < 2) return [];
  const u = unionBounds(items.map((i) => i.bounds));
  if (!u) return [];
  return items.map(({ id, bounds: b }) => {
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = u.x - b.x;
    else if (mode === "right") dx = u.x + u.width - (b.x + b.width);
    else if (mode === "hcenter") dx = u.x + u.width / 2 - (b.x + b.width / 2);
    else if (mode === "top") dy = u.y - b.y;
    else if (mode === "bottom") dy = u.y + u.height - (b.y + b.height);
    else dy = u.y + u.height / 2 - (b.y + b.height / 2);
    return { id, dx, dy };
  });
}

/**
 * Per-item translation that spaces item centres evenly along an axis between
 * the two outermost items (which stay put). Needs at least three items.
 */
export function distributeOffsets(items: AlignItem[], axis: "h" | "v"): Offset[] {
  if (items.length < 3) return [];
  const center = (b: Bounds): number =>
    axis === "h" ? b.x + b.width / 2 : b.y + b.height / 2;
  const sorted = [...items].sort((p, q) => center(p.bounds) - center(q.bounds));
  const first = center(sorted[0].bounds);
  const last = center(sorted[sorted.length - 1].bounds);
  const step = (last - first) / (sorted.length - 1);
  return sorted.map((item, i) => {
    const delta = first + step * i - center(item.bounds);
    return { id: item.id, dx: axis === "h" ? delta : 0, dy: axis === "v" ? delta : 0 };
  });
}
