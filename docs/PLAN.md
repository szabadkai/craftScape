# CraftScape — Implementation Plan

A browser-based vector graphics editor in the spirit of Inkscape. This document
is the architectural and delivery plan: what we're building, how it's
structured, and the order we build it in.

---

## 1. Product scope

CraftScape is a single-page web app for creating and editing **SVG** documents.
The in-memory document model maps directly to SVG, so export is lossless and
"view source" of the canvas is the file you ship.

### Target feature set (Inkscape-inspired)

| Area | Features |
| --- | --- |
| Canvas | Infinite pan/zoom, rulers, guides, grid, snapping, multiple pages/artboards |
| Shapes | Rectangle, ellipse/arc, star/polygon, line, spiral |
| Paths | Bézier pen tool, node editing, boolean ops, simplify, offset/inset |
| Text | Text + multi-line, text-on-path, font selection, basic typography |
| Selection | Marquee + click, transform handles (move/scale/rotate/skew), align & distribute |
| Style | Fill (solid/linear/radial gradient/pattern), stroke (width/dash/markers/joins), opacity, blend modes |
| Structure | Layers, groups, z-order, object tree (XML/objects panel) |
| Productivity | Undo/redo, copy/paste/duplicate, clones, snapping, measurement tool |
| I/O | Open/save `.svg`, import raster (embedded), export PNG/SVG, autosave |

### Explicit non-goals (early)

- Raster editing, filters beyond standard SVG filter primitives.
- CMYK / print color management.
- Real-time multi-user collaboration (designed-for, but not phase 1).

---

## 2. Technology choices

| Concern | Choice | Rationale |
| --- | --- | --- |
| Language | **TypeScript** (strict) | Type safety across a large model/tool surface |
| Build | **Vite** | Fast dev server, simple SPA builds |
| UI framework | **React** + **Zustand** | Component panels + a lightweight, un-opinionated store for editor state |
| Canvas rendering | **Native SVG DOM** (phase 1) → optional **Canvas2D/WebGL** overlay for hot paths | The document is SVG; rendering it as SVG keeps a single source of truth. Escalate to canvas only if profiling demands it |
| Geometry | **`@thi.ng/geom`** / custom + **`paper.js`** or **`bezier-js`** for path math | Boolean ops, offsetting, hit-testing need robust curve math |
| Persistence | IndexedDB (local, offline-first) + optional Supabase (cloud sync) | Works offline; cloud is opt-in |
| Testing | **Vitest** (unit) + **Playwright** (e2e/visual) | Geometry needs unit tests; tools need interaction tests |
| Linting | ESLint + Prettier + `tsc --noEmit` | Consistency and a green-able CI |

> Rendering decision is deliberately reversible: we start with the SVG DOM as the
> renderer (simplest correct path) and keep a `Renderer` interface so a
> canvas/WebGL backend can be swapped in for large documents without touching
> tools or the model.

---

## 3. Architecture

A layered, framework-agnostic **core** with a thin React shell on top. The core
knows nothing about React; the UI subscribes to it.

```
┌───────────────────────────────────────────────────────────┐
│  UI shell (React): toolbar, panels, dialogs, menus         │
│  - renders from editor state, dispatches commands          │
├───────────────────────────────────────────────────────────┤
│  Tools layer: Select, Node, Pen, Rect, Ellipse, Text, ...  │
│  - translate pointer/keyboard input into Commands          │
├───────────────────────────────────────────────────────────┤
│  Editor core                                               │
│   • Document model (scene graph of nodes ≈ SVG elements)   │
│   • Command/History (undo/redo, transactional edits)       │
│   • Selection & transforms                                 │
│   • Viewport (pan/zoom, screen↔document coords)            │
│   • Snapping engine                                        │
├───────────────────────────────────────────────────────────┤
│  Geometry & SVG: path math, boolean ops, bbox, hit-test,   │
│  SVG (de)serialization                                     │
├───────────────────────────────────────────────────────────┤
│  Renderer interface  →  SVG-DOM backend (+ future canvas)  │
├───────────────────────────────────────────────────────────┤
│  Persistence: IndexedDB store + import/export + cloud sync │
└───────────────────────────────────────────────────────────┘
```

### Suggested repository layout

```
craftScape/
├─ docs/                  # plans, ADRs, design notes
├─ src/
│  ├─ core/
│  │  ├─ model/           # Document, Node types, attributes
│  │  ├─ commands/        # Command objects + History (undo/redo)
│  │  ├─ selection/
│  │  ├─ viewport/        # coordinate transforms, zoom/pan
│  │  └─ snapping/
│  ├─ geometry/           # bbox, path ops, boolean, hit-testing
│  ├─ svg/                # parse/serialize, node<->SVG mapping
│  ├─ renderer/           # Renderer interface + svg-dom backend
│  ├─ tools/              # one module per tool
│  ├─ ui/                 # React components, panels, dialogs
│  ├─ persistence/        # indexeddb, file io, (cloud sync)
│  └─ app/                # bootstrap, wiring, keymap
├─ tests/                 # vitest unit + playwright e2e
└─ index.html
```

### Key design decisions

1. **Document = scene graph that round-trips to SVG.** Each node has an id,
   type, attributes, transform, and children. Serialization is a pure mapping to
   SVG; we never lose unknown attributes (preserve on load → save).
2. **All mutations go through Commands.** A `Command` has `apply()`/`invert()`.
   The `History` stack gives undo/redo for free and keeps the model immutable
   from the UI's perspective. Tools never mutate the model directly.
3. **Tools are state machines.** Each tool handles pointer/keyboard events and
   emits commands. Exactly one active tool at a time; switching is cheap.
4. **Coordinate discipline.** A single `Viewport` owns screen↔document
   transforms. Tools and snapping always work in document space.
5. **Renderer behind an interface.** Start with SVG DOM (`<svg>` mirrors the
   model); keep the door open for a canvas/WebGL backend.

---

## 4. Delivery roadmap (phased)

Each phase is independently demoable and shippable. Estimates assume one focused
developer; treat them as relative sizing, not commitments.

### Phase 0 — Project scaffold (~few days)
- Vite + React + TS strict, ESLint/Prettier, Vitest, Playwright.
- CI (lint + typecheck + unit + e2e) green on the branch.
- App shell: blank canvas, empty toolbar/panels, viewport pan/zoom.
- **Demo:** pan/zoom an empty artboard.

### Phase 1 — Model, render, basic shapes (~1–2 weeks)
- Document model + SVG serialize/deserialize (round-trip an existing `.svg`).
- SVG-DOM renderer subscribing to the model.
- Rectangle + Ellipse tools; Select tool (click, marquee, move).
- Command/History with undo/redo.
- **Demo:** draw rectangles/ellipses, move them, undo, save & reopen the SVG.

### Phase 2 — Transforms, selection, structure (~2 weeks)
- Transform handles: scale, rotate, skew; multi-select; bounding boxes.
- Layers + groups + z-order; objects/XML tree panel.
- Copy/paste/duplicate, delete, align & distribute.
- **Demo:** compose a multi-object, multi-layer scene with transforms.

### Phase 3 — Paths & nodes (~2–3 weeks)
- Pen (Bézier) tool; Node editing tool (add/remove/move nodes & handles).
- Path data model + robust hit-testing.
- Convert shape → path; simplify path.
- **Demo:** draw and edit arbitrary curves.

### Phase 4 — Style & fills (~2 weeks)
- Fill/stroke UI: solid, linear & radial gradients, gradient editor on-canvas.
- Stroke: width, dashes, caps/joins, markers; opacity; blend modes.
- Color picker, swatches, eyedropper.
- **Demo:** fully styled illustration.

### Phase 5 — Text & advanced paths (~2 weeks)
- Text tool, multiline, font picker (web/local fonts), text-on-path.
- Boolean ops (union/difference/intersection/exclusion), offset/inset.
- Snapping engine (to grid/guides/nodes/bbox) + measurement tool.
- **Demo:** logo-style artwork combining text + boolean shapes.

### Phase 6 — Polish, persistence, export (~1–2 weeks)
- IndexedDB autosave + document manager; PNG export; import raster.
- Full keymap (Inkscape-like defaults), preferences, recent files.
- Performance pass; large-document profiling; accessibility & a11y review.
- **Demo:** real-world editing session start to finish.

### Phase 7 (optional/stretch) — Cloud & collaboration
- Supabase auth + per-user document storage and sync.
- Foundations for real-time collaboration (CRDT/OT) if pursued.

---

## 5. Hard problems & how we de-risk them

| Risk | Mitigation |
| --- | --- |
| Path boolean ops / offsetting are mathematically hairy | Use a vetted library (paper.js / clipper) behind our own interface; heavy unit tests with known fixtures |
| Performance with thousands of nodes | Renderer interface lets us move to canvas/WebGL; virtualize panels; dirty-rect updates |
| Undo/redo correctness across complex edits | Single mutation path via Commands; property-based tests on apply∘invert == identity |
| SVG fidelity / not losing attributes | Preserve-unknown-on-roundtrip; golden-file round-trip tests |
| Coordinate/transform bugs | One Viewport owns all transforms; unit tests for screen↔doc mapping |
| Scope creep | Phased roadmap; each phase independently demoable |

---

## 6. Quality bar

- TypeScript `strict`; no `any` in core/geometry.
- Unit tests for all geometry and command invert logic.
- Playwright smoke test per tool (draw → assert SVG output).
- CI must pass lint + typecheck + unit + e2e before merge.
- Architecture Decision Records (ADRs) in `docs/adr/` for irreversible choices.

---

## 7. Immediate next steps

1. Approve this plan (and the rendering & library choices in §2).
2. Land **Phase 0**: scaffold + CI green on `claude/inkscape-clone-browser-plan-gnrfy`.
3. Land **Phase 1**: model + SVG round-trip + rect/ellipse + select + undo.

> Open questions to confirm before Phase 1: (a) SVG-DOM-first rendering OK?
> (b) React + Zustand for the shell? (c) Is offline-only acceptable for v1 with
> Supabase deferred to Phase 7?
