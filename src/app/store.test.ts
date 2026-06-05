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

  const drawRectAt = (x: number, y: number) => {
    const s = useEditor.getState();
    s.setTool("rect");
    s.pointerDown({ x, y }, null, false);
    s.pointerDrag({ x: x + 20, y: y + 20 });
    s.pointerUp();
    return useEditor.getState().selection[0];
  };

  it("scales a selected shape via a handle drag (matrix transform)", () => {
    drawRect(); // rect at (10,10) size 40x30, se corner (50,40)
    const s = useEditor.getState();
    s.setTool("select");
    s.beginScale("se", { x: 50, y: 40 });
    s.pointerDrag({ x: 90, y: 70 });
    s.pointerUp();
    expect(useEditor.getState().exportSvg()).toContain("matrix(2 0 0 2");
    useEditor.getState().undo();
    expect(useEditor.getState().exportSvg()).not.toContain("matrix(");
  });

  it("groups two shapes then ungroups them", () => {
    const a = drawRectAt(10, 10);
    const b = drawRectAt(80, 80);
    const s = useEditor.getState();
    s.setSelection([a, b]);
    s.group();
    expect(useEditor.getState().doc.children).toHaveLength(1);
    expect(useEditor.getState().doc.children[0].type).toBe("g");
    expect(useEditor.getState().selection).toHaveLength(1);
    useEditor.getState().ungroup();
    expect(useEditor.getState().doc.children.filter((c) => c.type === "rect")).toHaveLength(2);
  });

  it("changes z-order to send a shape to front", () => {
    const a = drawRectAt(10, 10);
    drawRectAt(80, 80);
    const s = useEditor.getState();
    s.setSelection([a]);
    s.zOrder("front");
    const ids = useEditor.getState().doc.children.map((c) => c.id);
    expect(ids[ids.length - 1]).toBe(a);
  });

  it("duplicates and pastes shapes", () => {
    drawRect();
    useEditor.getState().duplicate();
    expect(useEditor.getState().doc.children).toHaveLength(2);
    useEditor.getState().copy();
    useEditor.getState().paste();
    expect(useEditor.getState().doc.children).toHaveLength(3);
  });

  it("converts a rectangle to a path", () => {
    drawRect();
    const id = useEditor.getState().selection[0];
    useEditor.getState().setSelection([id]);
    useEditor.getState().convertToPath();
    const node = useEditor.getState().doc.children.find((c) => c.id === id)!;
    expect(node.type).toBe("path");
    expect(node.attrs.d).toContain("M");
    useEditor.getState().undo();
    expect(useEditor.getState().doc.children[0].type).toBe("rect");
  });

  it("draws a path with the pen tool and edits a node", () => {
    const s = useEditor.getState();
    s.setTool("pen");
    s.penDown({ x: 0, y: 0 });
    s.penUp();
    s.penDown({ x: 50, y: 0 });
    s.penUp();
    s.penDown({ x: 50, y: 50 });
    s.penUp();
    s.finishPen(true);
    const pathId = useEditor.getState().selection[0];
    const path = useEditor.getState().doc.children.find((c) => c.id === pathId)!;
    expect(path.type).toBe("path");

    // node-edit: drag the first anchor
    const ns = useEditor.getState();
    ns.setTool("node");
    ns.setSelection([pathId]);
    ns.nodeDown({ si: 0, ai: 0 }, "point", { x: 0, y: 0 });
    ns.nodeMove({ x: 10, y: 10 });
    ns.nodeUp(true);
    expect(useEditor.getState().doc.children.find((c) => c.id === pathId)!.attrs.d).toContain("M 10 10");

    // delete the dragged node
    const ds = useEditor.getState();
    ds.nodeDown({ si: 0, ai: 0 }, "point", { x: 10, y: 10 });
    ds.nodeUp(true); // selects without moving
    ds.deleteNode();
    expect(useEditor.getState().doc.children.find((c) => c.id === pathId)!.attrs.d).not.toContain("M 10 10");
  });

  it("applies solid style and a gradient fill", () => {
    drawRect();
    const id = useEditor.getState().selection[0];
    const s = useEditor.getState();
    s.setStyle({ fill: "#ff0000", stroke: "#0000ff", "stroke-width": "4" });
    let node = useEditor.getState().doc.children.find((c) => c.id === id)!;
    expect(node.attrs.fill).toBe("#ff0000");
    expect(node.attrs["stroke-width"]).toBe("4");

    useEditor.getState().applyGradient("linear");
    node = useEditor.getState().doc.children.find((c) => c.id === id)!;
    expect(node.attrs.fill).toMatch(/^url\(#/);
    expect(useEditor.getState().doc.children.some((c) => c.type === "defs")).toBe(true);

    // recolour the first stop
    useEditor.getState().setGradientStop(0, { "stop-color": "#123456" });
    const defs = useEditor.getState().doc.children.find((c) => c.type === "defs")!;
    expect(defs.children[0].children[0].attrs["stop-color"]).toBe("#123456");
  });

  it("nudges and aligns the selection", () => {
    const a = drawRectAt(10, 10);
    const b = drawRectAt(80, 80);
    const s = useEditor.getState();
    s.setSelection([a]);
    s.nudge(5, 0);
    expect(useEditor.getState().exportSvg()).toContain("translate(5 0)");
    s.setSelection([a, b]);
    s.align("left");
    expect(useEditor.getState().canUndo).toBe(true);
  });
});
