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
| 3 | Paths & node editing (Bézier pen, node tool) | ⬜ |
| 4 | Style & fills (gradients, stroke, color, blend modes) | ⬜ |
| 5 | Text & advanced paths (boolean ops, snapping, measure) | ⬜ |
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

### Phase 3 — Paths & nodes ⬜
Bézier pen tool, node-editing tool (add/remove/move nodes & handles), path data
model, robust hit-testing, shape→path conversion, simplify.

### Phase 4 — Style & fills ⬜
Fill/stroke UI: solid, linear & radial gradients with an on-canvas editor;
stroke width/dashes/caps/joins/markers; opacity; blend modes; color picker,
swatches, eyedropper.

### Phase 5 — Text & advanced paths ⬜
Text tool (multiline, fonts, text-on-path), boolean ops
(union/difference/intersection/exclusion), offset/inset, snapping engine, and a
measurement tool.

### Phase 6 — Polish, persistence, export ⬜
IndexedDB autosave + document manager, File System Access API with download
fallback, PNG export, raster import, full keymap & preferences, PWA/offline,
performance and accessibility passes.
