export type ZMode = "front" | "back" | "raise" | "lower";

/**
 * Compute a new child ordering for a z-order operation. Pure array math so it
 * can be unit-tested independently of the document; the selected ids keep their
 * relative order. `order` is bottom-to-top (SVG document order).
 */
export function reorderIds(order: string[], selected: string[], mode: ZMode): string[] {
  const sel = new Set(selected);
  if (mode === "front") {
    return [...order.filter((id) => !sel.has(id)), ...order.filter((id) => sel.has(id))];
  }
  if (mode === "back") {
    return [...order.filter((id) => sel.has(id)), ...order.filter((id) => !sel.has(id))];
  }
  const a = [...order];
  if (mode === "raise") {
    for (let i = a.length - 2; i >= 0; i--) {
      if (sel.has(a[i]) && !sel.has(a[i + 1])) [a[i], a[i + 1]] = [a[i + 1], a[i]];
    }
  } else {
    for (let i = 1; i < a.length; i++) {
      if (sel.has(a[i]) && !sel.has(a[i - 1])) [a[i], a[i - 1]] = [a[i - 1], a[i]];
    }
  }
  return a;
}
