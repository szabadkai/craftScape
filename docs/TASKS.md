# CraftScape Task List

Granular, checkbox-level breakdown of the [roadmap](ROADMAP.md). Check items off
as they land. Each phase ends with its checks green (lint + typecheck +
coverage + build) and an updated demo.

---

## Phase 0 — Scaffold + auto-deploy ✅

- [x] Vite + React + TypeScript (strict) project
- [x] ESLint with enforced LOC/complexity limits + Prettier
- [x] Vitest configured with a coverage gate on logic layers
- [x] `vite.config.ts` `base: '/craftScape/'` for Pages project hosting
- [x] GitHub Actions: CI (lint/typecheck/test/build) on branches & PRs
- [x] GitHub Actions: build + deploy to GitHub Pages on push to `main`
- [x] App shell with pan/zoomable empty artboard
- [ ] Enable Pages (Settings → Pages → Source = "GitHub Actions") — _manual, repo owner_
- [ ] Add Playwright e2e harness + first smoke test

## Phase 1 — Model, render, shapes, undo/redo, mobile ✅

- [x] Immutable `SceneNode` document model (1:1 with SVG)
- [x] Tree ops: insert/remove/find/setAttrs with structural sharing
- [x] SVG serialize + parse (lossless round-trip, preserves unknown attrs)
- [x] `Command` interface + `addNode`/`removeNode`/`setAttrs`/`composite`
- [x] `History` with undo/redo; property-tested `invert ∘ apply == id`
- [x] Geometry: bounds, marquee intersection, translate transforms
- [x] Rectangle tool (drag-create)
- [x] Ellipse tool (drag-create)
- [x] Select tool: click, shift multi-select, marquee, drag-move
- [x] Zustand editor store wiring model + commands + gestures
- [x] SVG-DOM renderer (`SceneView`/`RawSvgNode`) with faithful attrs
- [x] Open `.svg` / Save `.svg`
- [x] Keyboard shortcuts (undo/redo, delete, tool switch, escape)
- [x] Read-only objects panel
- [x] Unified pointer input: mouse, trackpad, two-finger pinch/pan
- [x] Responsive layout + finger-sized touch targets
- [x] Unit + integration tests (~99% coverage on core/geometry/svg)

## Phase 2 — Transforms & structure ✅

- [x] Affine-matrix transform foundation (`geometry/matrix.ts`)
- [x] Transform handles overlay (8 handles + rotation handle)
- [x] Scale (corner/edge), with aspect-lock modifier (Shift)
- [x] Rotate about the selection centre, with 15° snap (Shift)
- [x] Accurate multi-select & group bounding box (recursive union)
- [x] Transform commands recorded as matrix updates (invertible)
- [x] Groups: group/ungroup selection (`<g>`, bakes transform on ungroup)
- [x] Z-order: raise/lower/to-front/to-back
- [x] Copy / cut / paste / duplicate (with paste offset)
- [x] Keyboard nudge of selection (arrows, Shift = ×10)
- [x] Align & distribute (left/center/right/top/middle/bottom + distribute)
- [x] Action bar UI + keyboard shortcuts (Ctrl+G/C/X/V/D, Home/End/PgUp/PgDn)
- [x] Tests for transform math + structural commands (+ UI smoke test)
- [ ] Skew handles
- [ ] Layers: create/rename/reorder/show-hide/lock
- [ ] Object tree panel: drag-reorder, visibility toggle
- [ ] Playwright: transform + group smoke tests (needs e2e harness, Phase 0)

## Phase 3 — Paths & nodes ✅

- [x] Path data model (M/L/H/V/C/S/Q/T/Z, abs+rel) + parser/serializer
- [x] Pen tool: place anchor points, drag out Bézier handles, close path
- [x] Node tool: select/move nodes, move control handles (with mirror)
- [x] Delete nodes
- [x] Bézier math (point-at-t, flatten, nearest-distance hit-testing)
- [x] Convert shape (rect/ellipse) → path, preserving id & style (undoable)
- [x] Path bounds (flattened) so paths select/transform/align like any node
- [x] Tests for Bézier math, parse/serialize, node edits, conversion (+ smoke)
- [ ] Add a node by clicking a segment (split at t)
- [ ] Toggle node type (smooth/corner/symmetric)
- [ ] Path simplify (curve fitting)

## Phase 4 — Style & fills ✅

- [x] Fill/Stroke panel
- [x] Solid color (native picker + hex + alpha) and swatches
- [x] Linear gradient (editable stops, managed in `<defs>`)
- [x] Radial gradient
- [x] Stroke: width, dash array, caps, joins, alpha
- [x] Per-object opacity
- [x] Reads/derives shared style across multi-selection (mixed detection)
- [x] Tests for style derivation, gradient (de)serialization, defs command
- [ ] On-canvas gradient handles
- [ ] Markers (arrowheads, etc.)
- [ ] Blend modes
- [ ] Eyedropper

## Phase 5 — Text & advanced paths 🚧

- [x] Text tool (place & edit content)
- [x] Font family/size/weight controls
- [x] Text bounds so text selects/transforms/styles like any node
- [x] Snapping engine (grid + object edges/centres) with live guides + toggle
- [x] Measurement readout (selection W×H in the status bar)
- [x] Tests for snapping + text model/round-trip
- [ ] Multiline text / letter-spacing / web-font selection
- [ ] Text on path
- [ ] Boolean ops: union, difference, intersection, exclusion
- [ ] Offset / inset path
- [ ] Snap to nodes & guide lines; measurement tool (dedicated)

## Phase 6 — Polish, persistence, export ⬜

- [ ] IndexedDB autosave + document manager (list/rename/delete)
- [ ] File System Access API (where supported) + download fallback
- [ ] PNG export (rasterize current artboard)
- [ ] Raster import (embed as data URI)
- [ ] Full preferences + customizable keymap
- [ ] PWA: service worker, manifest, installable, offline
- [ ] Performance pass (large docs): profiling, dirty-rect updates
- [ ] Accessibility pass (focus, ARIA, contrast)
- [ ] Cross-browser + mobile device testing
