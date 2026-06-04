import { Canvas } from "./Canvas";

const TOOLS = [
  { id: "select", label: "Select", glyph: "▭" },
  { id: "node", label: "Edit nodes", glyph: "✎" },
  { id: "rect", label: "Rectangle", glyph: "□" },
  { id: "ellipse", label: "Ellipse", glyph: "◯" },
  { id: "pen", label: "Pen", glyph: "✐" },
  { id: "text", label: "Text", glyph: "T" },
] as const;

/**
 * Phase 0 application shell. Tools and panels are placeholders; the working
 * piece is the pan/zoomable artboard. Subsequent phases fill these in.
 */
export function App() {
  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">CraftScape</strong>
        <span className="tagline">browser-based vector editor</span>
      </header>
      <div className="workspace">
        <nav className="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tool"
              title={`${t.label} (coming soon)`}
              disabled
            >
              <span aria-hidden>{t.glyph}</span>
            </button>
          ))}
        </nav>
        <main className="canvas-area">
          <Canvas />
        </main>
        <aside className="panels" aria-label="Panels">
          <section className="panel">
            <h2>Fill &amp; Stroke</h2>
            <p className="muted">Styling lands in Phase 4.</p>
          </section>
          <section className="panel">
            <h2>Objects</h2>
            <p className="muted">Layer &amp; object tree lands in Phase 2.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
