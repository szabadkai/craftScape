# CraftScape Roadmap

A browser-only, no-backend vector editor (Inkscape clone) deployed as a static
site to GitHub Pages. This roadmap is the high-level delivery plan; the granular,
checkbox-level breakdown lives in [`TASKS.md`](TASKS.md), and the architecture
rationale in [`PLAN.md`](PLAN.md).

**Legend:** ✅ done · 🚧 in progress · ⬜ not started

| Phase | Theme | Status |
| --- | --- | --- |
| 0 | Scaffold + auto-deploy to GitHub Pages | ✅ |
| 1 | Document model, SVG round-trip, basic shapes, undo/redo, mobile | ✅ |
| 2 | Transforms, multi-select, groups, z-order, clipboard, align/distribute | ✅ |
| 3 | Paths & node editing (Bézier pen, node tool) | ✅ |
| 4 | Style & fills (solid/gradient fill, stroke, color, opacity) | ✅ |
| 5 | Text, snapping, measurement (boolean ops deferred) | 🚧 |
| 6 | Polish, persistence, export, PWA/offline | ⬜ |
| 7 | (Stretch) anything beyond core — explicitly out of scope for v1 | ⬜ |

## Guiding constraints

- **100% client-side.** No server, no accounts, no database. Static files only.
- **Auto-deploy.** Every push to `main` builds and publishes to GitHub Pages.
- **Mobile is first-class.** Unified pointer input (mouse/trackpad/touch),
  responsive layout, pinch-zoom & pan.
- **Quality is enforced, not aspirational.** Lint LOC limits, strict TS, and a
  coverage gate on logic layers all gate CI. Deep modules over shallow sprawl.

## Phase summaries

### Phase 0 — Scaffold + auto-deploy ✅
Vite + React + TS (strict), ESLint with LOC/complexity limits, Vitest with a
coverage gate, GitHub Actions for CI and Pages deploy. App shell with a
pan/zoomable artboard.

### Phase 1 — Model, render, shapes, undo/redo, mobile ✅
Immutable `SceneNode` model mirroring SVG 1:1; lossless serialize/parse;
Command/History with property-tested `invert ∘ apply == identity`; Rectangle,
Ellipse, and Select (click/marquee/move) tools; Open/Save `.svg`; Inkscape-style
shortcuts; unified pointer input with two-finger pinch/pan; responsive layout.

### Phase 2 — Transforms & structure ✅
On-canvas transform handles (scale + rotate), a uniform affine-matrix transform
model, accurate multi-select/group bounds, group/ungroup, z-order
(front/back/raise/lower), copy/cut/paste/duplicate, keyboard nudge, and
align/distribute. (Skew, layer locking, and tree drag-reorder are deferred to a
later pass — see `TASKS.md`.)

### Phase 3 — Paths & nodes ✅
Path data model (parse/serialize SVG `d`), Bézier math, a pen tool for drawing
paths, a node tool to move anchors and Bézier handles and delete nodes, path
hit-testing, and shape→path conversion. Paths integrate with select/transform/
align via flattened bounds. (Add-node-on-segment, node-type toggling, and
path simplify are deferred — see `TASKS.md`.)

### Phase 4 — Style & fills ✅
Fill & Stroke panel: solid fill with colour picker, hex, alpha, and swatches;
linear & radial gradient fills with editable stops (managed in `<defs>`);
stroke colour/width/dashes/caps/joins/alpha; per-object opacity. (On-canvas
gradient handles, markers, blend modes, and the eyedropper are deferred — see
`TASKS.md`.)

### Phase 5 — Text & advanced paths 🚧
**Done:** text tool (place & edit content, font family/size/weight, approx
bounds so text selects/transforms/styles like any node); a snapping engine
(snap moves to the grid and to other objects' edges/centres, with live guides
and a toggle); a measurement readout (selection W×H in the status bar).
**Remaining:** boolean ops (union/difference/intersection/exclusion),
offset/inset, text-on-path, multiline text — see `TASKS.md`.

### Phase 6 — Polish, persistence, export ⬜
IndexedDB autosave + document manager, File System Access API with download
fallback, PNG export, raster import, full keymap & preferences, PWA/offline,
performance and accessibility passes.
