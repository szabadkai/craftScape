/**
 * The document is a tree of `SceneNode`s that maps 1:1 to SVG. Each node knows
 * its identity, its SVG element type, an attribute bag, and ordered children.
 *
 * Keeping the model a faithful mirror of SVG (a generic attribute bag rather
 * than a per-shape class hierarchy) is what makes load → edit → save lossless:
 * attributes we don't understand are preserved untouched on round-trip.
 */
export interface SceneNode {
  /** Stable identity. Serialized as the SVG `id` attribute. */
  readonly id: string;
  /** SVG element/tag name, e.g. "rect", "ellipse", "g", "svg". */
  readonly type: string;
  /** SVG attributes as raw strings (the `id` lives in `id`, not here). */
  readonly attrs: Readonly<Record<string, string>>;
  /** Child elements, in document (z) order. */
  readonly children: readonly SceneNode[];
}
