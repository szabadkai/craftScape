/**
 * Minimal transform helpers for Phase 1, which only needs translation. Shapes
 * created by CraftScape carry at most a `translate(...)`; richer transform
 * support (matrix composition, rotate/scale) arrives with the transform tool.
 */
const TRANSLATE_XY = /translate\(\s*([-\d.eE]+)[\s,]+([-\d.eE]+)\s*\)/;
const TRANSLATE_X = /translate\(\s*([-\d.eE]+)\s*\)/;

export function parseTranslate(transform?: string): { tx: number; ty: number } {
  if (!transform) return { tx: 0, ty: 0 };
  const xy = TRANSLATE_XY.exec(transform);
  if (xy) return { tx: Number(xy[1]), ty: Number(xy[2]) };
  const x = TRANSLATE_X.exec(transform);
  if (x) return { tx: Number(x[1]), ty: 0 };
  return { tx: 0, ty: 0 };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Add a translation delta to an existing transform's translate component. */
export function composeTranslate(base: string | undefined, dx: number, dy: number): string {
  const { tx, ty } = parseTranslate(base);
  return `translate(${round(tx + dx)} ${round(ty + dy)})`;
}
