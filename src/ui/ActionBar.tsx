import { useEditor, type AlignKind } from "../app/store";
import { findNode } from "../core/model/document";

const ALIGN: Array<{ kind: AlignKind; title: string; glyph: string }> = [
  { kind: "left", title: "Align left", glyph: "⇤" },
  { kind: "hcenter", title: "Align horizontal centres", glyph: "↔" },
  { kind: "right", title: "Align right", glyph: "⇥" },
  { kind: "top", title: "Align top", glyph: "⤒" },
  { kind: "vcenter", title: "Align vertical centres", glyph: "↕" },
  { kind: "bottom", title: "Align bottom", glyph: "⤓" },
  { kind: "distribute-h", title: "Distribute horizontally", glyph: "⇎" },
  { kind: "distribute-v", title: "Distribute vertically", glyph: "⇕" },
];

const ORDER: Array<{ mode: "front" | "raise" | "lower" | "back"; title: string; glyph: string }> = [
  { mode: "front", title: "Bring to front (Home)", glyph: "⤒" },
  { mode: "raise", title: "Raise (PageUp)", glyph: "↑" },
  { mode: "lower", title: "Lower (PageDown)", glyph: "↓" },
  { mode: "back", title: "Send to back (End)", glyph: "⤓" },
];

/** Context actions for the current selection: order, group, align, duplicate. */
export function ActionBar() {
  const { doc, selection, group, ungroup, zOrder, align, duplicate } = useEditor();
  const has = selection.length > 0;
  const multi = selection.length > 1;
  const hasGroup = selection.some((id) => findNode(doc, id)?.type === "g");

  return (
    <div className="action-bar" aria-label="Selection actions">
      <div className="action-group">
        {ORDER.map((o) => (
          <button key={o.mode} type="button" title={o.title} disabled={!has} onClick={() => zOrder(o.mode)}>
            {o.glyph}
          </button>
        ))}
      </div>
      <div className="action-group">
        <button type="button" title="Group (Ctrl/⌘+G)" disabled={!multi} onClick={group}>
          ▣
        </button>
        <button type="button" title="Ungroup (Ctrl/⌘+Shift+G)" disabled={!hasGroup} onClick={ungroup}>
          ▢
        </button>
        <button type="button" title="Duplicate (Ctrl/⌘+D)" disabled={!has} onClick={duplicate}>
          ⧉
        </button>
      </div>
      <div className="action-group">
        {ALIGN.map((a) => (
          <button key={a.kind} type="button" title={a.title} disabled={!multi} onClick={() => align(a.kind)}>
            {a.glyph}
          </button>
        ))}
      </div>
    </div>
  );
}
