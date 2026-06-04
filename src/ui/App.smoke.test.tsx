import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "../app/store";
import { App } from "./App";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const BLANK =
  '<svg id="root" xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
  '<rect id="r1" x="10" y="10" width="40" height="30" fill="#4f8cff" /></svg>';

let container: HTMLDivElement;
let root: Root;

describe("App smoke", () => {
  beforeEach(() => {
    useEditor.getState().loadSvg(BLANK);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders the editor shell and the document's shapes", () => {
    act(() => root.render(<App />));
    expect(container.textContent).toContain("CraftScape");
    expect(container.querySelector('[data-id="r1"]')).not.toBeNull();
  });

  it("shows transform handles once a shape is selected", () => {
    act(() => root.render(<App />));
    act(() => useEditor.getState().setSelection(["r1"]));
    expect(container.querySelector('[data-handle="rotate"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-handle]").length).toBe(9);
  });
});
