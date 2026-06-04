import { beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "./store";

const BLANK =
  '<svg id="root" xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"></svg>';

/** Drives the store the way the Canvas does — pointer gestures end to end. */
describe("editor store integration", () => {
  beforeEach(() => useEditor.getState().loadSvg(BLANK));

  const drawRect = () => {
    const s = useEditor.getState();
    s.setTool("rect");
    s.pointerDown({ x: 10, y: 10 }, null, false);
    s.pointerDrag({ x: 50, y: 40 });
    s.pointerUp();
  };

  it("draws a rectangle from a drag gesture and selects it", () => {
    drawRect();
    const state = useEditor.getState();
    expect(state.exportSvg()).toContain("<rect");
    expect(state.selection).toHaveLength(1);
    expect(state.canUndo).toBe(true);
  });

  it("undo removes the rectangle, redo restores it", () => {
    drawRect();
    useEditor.getState().undo();
    expect(useEditor.getState().exportSvg()).not.toContain("<rect");
    expect(useEditor.getState().canUndo).toBe(false);
    useEditor.getState().redo();
    expect(useEditor.getState().exportSvg()).toContain("<rect");
  });

  it("moves a selected shape by dragging it", () => {
    drawRect();
    const id = useEditor.getState().selection[0];
    const s = useEditor.getState();
    s.setTool("select");
    s.pointerDown({ x: 20, y: 20 }, id, false);
    s.pointerDrag({ x: 30, y: 30 });
    s.pointerUp();
    expect(useEditor.getState().exportSvg()).toContain("translate(10 10)");
  });

  it("deletes the selection", () => {
    drawRect();
    useEditor.getState().deleteSelection();
    const state = useEditor.getState();
    expect(state.exportSvg()).not.toContain("<rect");
    expect(state.selection).toHaveLength(0);
  });
});
