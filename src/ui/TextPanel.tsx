import { useEditor } from "../app/store";
import { findNode } from "../core/model/document";
import { NumberInput, Row, Segmented } from "./StyleControls";

const FONTS = ["sans-serif", "serif", "monospace"];
const WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
];

/** Shown only when a single `<text>` node is selected. */
export function TextPanel() {
  const { doc, selection, setText, setStyle } = useEditor();
  const node = selection.length === 1 ? findNode(doc, selection[0]) : undefined;
  if (!node || node.type !== "text") return null;

  return (
    <section className="panel">
      <h2>Text</h2>
      <Row label="Content">
        <input
          type="text"
          className="text-content"
          value={node.text ?? ""}
          onChange={(e) => setText(e.target.value)}
        />
      </Row>
      <Row label="Size">
        <NumberInput
          value={Number(node.attrs["font-size"] ?? 24)}
          min={1}
          onChange={(v) => setStyle({ "font-size": String(v) })}
        />
      </Row>
      <Row label="Font">
        <select value={node.attrs["font-family"] ?? "sans-serif"} onChange={(e) => setStyle({ "font-family": e.target.value })}>
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Weight">
        <Segmented
          options={WEIGHTS}
          active={node.attrs["font-weight"] === "bold" ? "bold" : "normal"}
          onSelect={(v) => setStyle({ "font-weight": v })}
        />
      </Row>
    </section>
  );
}
