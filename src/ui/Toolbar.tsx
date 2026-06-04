import { useRef } from "react";
import { useEditor, type ToolId } from "../app/store";

const TOOLS: Array<{ id: ToolId; label: string; glyph: string; key: string }> = [
  { id: "select", label: "Select", glyph: "▭", key: "V" },
  { id: "rect", label: "Rectangle", glyph: "□", key: "R" },
  { id: "ellipse", label: "Ellipse", glyph: "◯", key: "E" },
];

function downloadSvg(svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "craftscape.svg";
  a.click();
  URL.revokeObjectURL(url);
}

export function Toolbar() {
  const { tool, setTool, undo, redo, canUndo, canRedo, deleteSelection, selection, exportSvg, loadSvg } =
    useEditor();
  const fileRef = useRef<HTMLInputElement>(null);

  const onOpen = (file: File | undefined) => {
    if (!file) return;
    file.text().then(loadSvg).catch((err) => alert(`Could not open SVG: ${err.message}`));
  };

  return (
    <nav className="toolbar" aria-label="Tools">
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tool ${tool === t.id ? "tool--active" : ""}`}
            title={`${t.label} (${t.key})`}
            aria-pressed={tool === t.id}
            onClick={() => setTool(t.id)}
          >
            <span aria-hidden>{t.glyph}</span>
          </button>
        ))}
      </div>
      <div className="tool-group">
        <button type="button" className="tool" title="Undo (Ctrl/⌘+Z)" disabled={!canUndo} onClick={undo}>
          ↶
        </button>
        <button type="button" className="tool" title="Redo (Ctrl/⌘+Shift+Z)" disabled={!canRedo} onClick={redo}>
          ↷
        </button>
        <button
          type="button"
          className="tool"
          title="Delete (Del)"
          disabled={selection.length === 0}
          onClick={deleteSelection}
        >
          🗑
        </button>
      </div>
      <div className="tool-group">
        <button type="button" className="tool" title="Open SVG" onClick={() => fileRef.current?.click()}>
          📂
        </button>
        <button type="button" className="tool" title="Save SVG" onClick={() => downloadSvg(exportSvg())}>
          💾
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml"
          hidden
          onChange={(e) => onOpen(e.target.files?.[0] ?? undefined)}
        />
      </div>
    </nav>
  );
}
