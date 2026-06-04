import { freshId, type SceneNode, type SvgDocument } from "../core/model/document";

/**
 * Parse an SVG string into the document model using the platform DOM parser
 * (available in the browser and, in tests, via jsdom). Unknown elements and
 * attributes are preserved verbatim — fidelity is the whole point.
 */
export function parse(svg: string): SvgDocument {
  const dom = new DOMParser().parseFromString(svg, "image/svg+xml");
  const error = dom.querySelector("parsererror");
  if (error) throw new Error(`Invalid SVG: ${error.textContent ?? "parse error"}`);
  return elementToNode(dom.documentElement);
}

function elementToNode(el: Element): SceneNode {
  const attrs: Record<string, string> = {};
  let id = "";
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === "id") id = attr.value;
    else attrs[attr.name] = attr.value;
  }
  const children = Array.from(el.children).map(elementToNode);
  return {
    id: id || freshId(el.tagName),
    type: el.tagName,
    attrs,
    children,
  };
}
