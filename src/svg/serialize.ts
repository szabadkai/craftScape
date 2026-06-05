import type { SceneNode, SvgDocument } from "../core/model/document";

/**
 * Serialize the document tree to an SVG string. The node `id` is emitted as the
 * `id` attribute so identity survives a round-trip through {@link parse}.
 * Formatting (indentation, attribute order) is cosmetic: equality is defined on
 * the parsed tree, not the text.
 */
export function serialize(doc: SvgDocument): string {
  return nodeToString(doc, 0);
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attrString(node: SceneNode): string {
  const entries: Array<[string, string]> = [["id", node.id], ...Object.entries(node.attrs)];
  return entries.map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join("");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function nodeToString(node: SceneNode, depth: number): string {
  const pad = "  ".repeat(depth);
  const attrs = attrString(node);
  if (node.children.length === 0 && node.text !== undefined) {
    return `${pad}<${node.type}${attrs}>${escapeText(node.text)}</${node.type}>`;
  }
  if (node.children.length === 0) {
    return `${pad}<${node.type}${attrs} />`;
  }
  const inner = node.children.map((c) => nodeToString(c, depth + 1)).join("\n");
  return `${pad}<${node.type}${attrs}>\n${inner}\n${pad}</${node.type}>`;
}
