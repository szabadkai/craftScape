import { useEditor } from "../app/store";
import { ActionBar } from "./ActionBar";
import { Canvas } from "./Canvas";
import { FillStrokePanel } from "./FillStrokePanel";
import { TextPanel } from "./TextPanel";
import { Toolbar } from "./Toolbar";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

/** Objects/layers tree (read-only in Phase 1; editing arrives in Phase 2). */
function ObjectsPanel() {
  const { doc, selection, setSelection } = useEditor();
  return (
    <section className="panel">
      <h2>Objects</h2>
      {doc.children.length === 0 && <p className="muted">Draw a shape to begin.</p>}
      <ul className="object-list">
        {[...doc.children].reverse().map((node) => (
          <li key={node.id}>
            <button
              type="button"
              className={selection.includes(node.id) ? "object--selected" : ""}
              onClick={() => setSelection([node.id])}
            >
              {node.type} <span className="muted">#{node.id}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function App() {
  useKeyboardShortcuts();
  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">CraftScape</strong>
        <span className="tagline">browser-based vector editor</span>
      </header>
      <div className="workspace">
        <Toolbar />
        <main className="canvas-area">
          <ActionBar />
          <div className="canvas-host">
            <Canvas />
          </div>
        </main>
        <aside className="panels" aria-label="Panels">
          <ObjectsPanel />
          <TextPanel />
          <FillStrokePanel />
        </aside>
      </div>
    </div>
  );
}
