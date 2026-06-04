import { createElement, useLayoutEffect, useRef } from "react";
import type { SceneNode } from "../core/model/types";

/**
 * Renders a SceneNode (and its subtree) to a real SVG element, applying every
 * attribute verbatim via `setAttribute`. Going through the DOM API — rather
 * than JSX props — guarantees fidelity for arbitrary SVG attribute names
 * (e.g. `stroke-width`, `data-*`) that React's prop layer would mangle, and
 * lets us mirror the model exactly, including removing attributes the model
 * dropped (so undo restores the DOM precisely).
 */
function RawSvgNode({ node }: { node: SceneNode }) {
  const ref = useRef<SVGElement | null>(null);
  const appliedKeys = useRef<string[]>([]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (const key of appliedKeys.current) {
      if (!(key in node.attrs)) el.removeAttribute(key);
    }
    for (const [key, value] of Object.entries(node.attrs)) el.setAttribute(key, value);
    el.setAttribute("data-id", node.id);
    appliedKeys.current = Object.keys(node.attrs);
  });

  return createElement(
    node.type,
    { ref },
    node.children.map((child) => <RawSvgNode key={child.id} node={child} />),
  );
}

export function SceneView({ nodes }: { nodes: readonly SceneNode[] }) {
  return (
    <>
      {nodes.map((node) => (
        <RawSvgNode key={node.id} node={node} />
      ))}
    </>
  );
}
