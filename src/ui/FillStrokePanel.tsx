import { useEditor } from "../app/store";
import type { GradientKind } from "../style/gradient";
import { readStyle, type StyleState } from "../style/style";
import { ColorInput, NumberInput, Row, Segmented, Slider, Swatches } from "./StyleControls";

const SWATCHES = ["#000000", "#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#3b6cf6", "#a855f7", "none"];
const DASHES = [
  { value: "", label: "──" },
  { value: "8 6", label: "– –" },
  { value: "1 5", label: "···" },
];
const CAPS = [
  { value: "butt", label: "Butt" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
];
const JOINS = [
  { value: "miter", label: "Miter" },
  { value: "round", label: "Round" },
  { value: "bevel", label: "Bevel" },
];

type Setter = (patch: Record<string, string>) => void;

function FillSection({ s }: { s: StyleState }) {
  const { setStyle, applyGradient, setGradientStop } = useEditor();
  const pickType = (t: string) => {
    if (t === "none") setStyle({ fill: "none" });
    else if (t === "solid") setStyle({ fill: s.fill === "#000000" ? "#4f8cff" : s.fill });
    else applyGradient(t as GradientKind);
  };
  return (
    <>
      <Segmented
        options={[
          { value: "none", label: "None" },
          { value: "solid", label: "Solid" },
          { value: "linear", label: "Linear" },
          { value: "radial", label: "Radial" },
        ]}
        active={s.fillType === "gradient" ? (s.gradientKind ?? "linear") : s.fillType}
        onSelect={pickType}
      />
      {s.fillType === "solid" && (
        <>
          <Row label="Color">
            <ColorInput value={s.fill} onChange={(hex) => setStyle({ fill: hex })} />
          </Row>
          <Swatches colors={SWATCHES} onPick={(c) => setStyle({ fill: c })} />
          <Row label="Alpha">
            <Slider value={s.fillOpacity} onChange={(v) => setStyle({ "fill-opacity": String(v) })} />
          </Row>
        </>
      )}
      {s.fillType === "gradient" &&
        s.stops.map((stop, i) => (
          <Row key={i} label={`Stop ${i + 1}`}>
            <ColorInput value={stop.color} onChange={(hex) => setGradientStop(i, { "stop-color": hex })} />
          </Row>
        ))}
    </>
  );
}

function StrokeSection({ s, setStyle }: { s: StyleState; setStyle: Setter }) {
  return (
    <>
      <Segmented
        options={[
          { value: "none", label: "None" },
          { value: "solid", label: "Solid" },
        ]}
        active={s.strokeType === "solid" ? "solid" : "none"}
        onSelect={(t) => setStyle({ stroke: t === "none" ? "none" : s.stroke })}
      />
      {s.strokeType === "solid" && (
        <>
          <Row label="Color">
            <ColorInput value={s.stroke} onChange={(hex) => setStyle({ stroke: hex })} />
          </Row>
          <Row label="Width">
            <NumberInput value={s.strokeWidth} min={0} step={0.5} onChange={(v) => setStyle({ "stroke-width": String(v) })} />
          </Row>
          <Row label="Dashes">
            <Segmented options={DASHES} active={s.dash} onSelect={(v) => setStyle({ "stroke-dasharray": v })} />
          </Row>
          <Row label="Cap">
            <Segmented options={CAPS} active={s.linecap} onSelect={(v) => setStyle({ "stroke-linecap": v })} />
          </Row>
          <Row label="Join">
            <Segmented options={JOINS} active={s.linejoin} onSelect={(v) => setStyle({ "stroke-linejoin": v })} />
          </Row>
          <Row label="Alpha">
            <Slider value={s.strokeOpacity} onChange={(v) => setStyle({ "stroke-opacity": String(v) })} />
          </Row>
        </>
      )}
    </>
  );
}

export function FillStrokePanel() {
  const { doc, selection, setStyle } = useEditor();
  if (selection.length === 0) {
    return (
      <section className="panel">
        <h2>Fill &amp; Stroke</h2>
        <p className="muted">Select an object to style it.</p>
      </section>
    );
  }
  const s = readStyle(doc, selection);
  return (
    <section className="panel">
      <h2>Fill</h2>
      <FillSection s={s} />
      <h2 className="panel-subhead">Stroke</h2>
      <StrokeSection s={s} setStyle={setStyle} />
      <Row label="Opacity">
        <Slider value={s.opacity} onChange={(v) => setStyle({ opacity: String(v) })} />
      </Row>
    </section>
  );
}
