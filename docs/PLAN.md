# CraftScape — Implementation Plan

A browser-based vector graphics editor in the spirit of Inkscape. This document
is the architectural and delivery plan: what we're building, how it's
structured, and the order we build it in.

---

## 1. Product scope

CraftScape is a single-page web app for creating and editing **SVG** documents.
The in-memory document model maps directly to SVG, so export is lossless and
"view source" of the canvas is the file you ship.

**Deployment model: 100% static, no backend.** The app is a bundle of static
files served from GitHub Pages. There is no server, no database, no accounts.
All persistence is in the browser (IndexedDB + file download/upload). Every push
to the default branch is built and published to Pages automatically by GitHub
Actions. This constraint shapes the whole design: no feature may require a
server round-trip.

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
- Any backend, accounts, cloud storage, or server-side rendering.
- Real-time multi-user collaboration (would require infra we're not building).

---

## 2. Technology choices

| Concern | Choice | Rationale |
| --- | --- | --- |
| Language | **TypeScript** (strict) | Type safety across a large model/tool surface |
| Build | **Vite** | Fast dev server, simple SPA builds |
| UI framework | **React** + **Zustand** | Component panels + a lightweight, un-opinionated store for editor state |
| Canvas rendering | **Native SVG DOM** (phase 1) → optional **Canvas2D/WebGL** overlay for hot paths | The document is SVG; rendering it as SVG keeps a single source of truth. Escalate to canvas only if profiling demands it |
| Geometry | **`@thi.ng/geom`** / custom + **`paper.js`** or **`bezier-js`** for path math | Boolean ops, offsetting, hit-testing need robust curve math |
| Persistence | **IndexedDB** + File System Access API / download | Fully client-side; no server. Documents live in the browser and on disk |
| Testing | **Vitest** (unit) + **Playwright** (e2e/visual) | Geometry needs unit tests; tools need interaction tests |
| Linting | ESLint + Prettier + `tsc --noEmit` | Consistency and a green-able CI |
| Hosting | **GitHub Pages** via GitHub Actions | Static site, auto-deployed on push to default branch |

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
│  Persistence: IndexedDB store + import/export (no backend) │
└───────────────────────────────────────────────────────────┘
```

> **Static-hosting constraint.** Because the app is served from GitHub Pages
> under a project sub-path (`/craftScape/`), the Vite `base` is set accordingly
> and all asset references must be relative. Client-side routing (if any) uses
> hash routing so deep links work without server rewrites.

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
6. **One unified pointer model.** Mouse, trackpad, and touch all flow through a
   single input layer (`usePointerInput`): one pointer drives the active tool,
   two pointers pinch-zoom and pan. Mobile is a first-class target, not an
   afterthought — the layout is responsive and touch targets are sized for
   fingers.

---

## 4. Delivery roadmap (phased)

Each phase is independently demoable and shippable. Estimates assume one focused
developer; treat them as relative sizing, not commitments.

### Phase 0 — Project scaffold + auto-deploy ✅ DONE
- Vite + React + TS strict, ESLint/Prettier, Vitest, Playwright.
- `vite.config.ts` `base: '/craftScape/'` for GitHub Pages project hosting.
- GitHub Actions workflow: build on push to default branch → publish `dist/` to
  GitHub Pages (`actions/deploy-pages`). CI (lint + typecheck + unit) gates it.
- App shell: blank canvas, empty toolbar/panels, viewport pan/zoom.
- **Demo:** the live URL (`https://szabadkai.github.io/craftScape/`) shows a
  pan/zoomable empty artboard, updated automatically on every push.

### Phase 1 — Model, render, basic shapes ✅ DONE
- Document model + SVG serialize/deserialize (lossless round-trip). ✅
- SVG-DOM renderer subscribing to the model (`SceneView`/`RawSvgNode`). ✅
- Rectangle + Ellipse tools; Select tool (click, marquee, move). ✅
- Command/History with undo/redo (property-tested `invert∘apply == id`). ✅
- Open/Save `.svg`; Inkscape-style keyboard shortcuts. ✅
- Touch/mobile: unified pointer input with two-finger pinch-zoom & pan,
  responsive layout. ✅
- **Demo:** draw rectangles/ellipses, move them, undo, save & reopen the SVG —
  on desktop or a phone.

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
- File System Access API (where supported) + download/upload fallback.
- Full keymap (Inkscape-like defaults), preferences, recent files.
- PWA / service worker for offline use and installability.
- Performance pass; large-document profiling; accessibility & a11y review.
- **Demo:** real-world editing session start to finish, fully offline.

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

- TypeScript `strict`; `no-explicit-any` enforced by lint.
- Unit tests for all geometry and command invert logic.
- Playwright smoke test per tool (draw → assert SVG output).
- CI must pass lint + typecheck + unit + e2e before merge.
- Architecture Decision Records (ADRs) in `docs/adr/` for irreversible choices.

---

## 7. Code structure rules (enforced)

These are not style preferences — they are checked in CI (`eslint.config.js`,
`vite.config.ts`) and a build fails if violated.

### Deep modules, not spread out

We follow Ousterhout's "deep modules" principle: a module should hide
substantial functionality behind a **narrow interface**. Prefer a few
substantial files over many trivial ones.

- A "component" or module owns a real responsibility end-to-end (e.g. the whole
  `Viewport` coordinate system lives in one file with a handful of exported
  functions). We do **not** scatter that logic across a dozen one-liner files.
- New files must earn their existence with a genuine seam (a different
  responsibility, a different layer), not by splitting a cohesive unit to dodge
  a line limit.
- Interfaces stay small even when the implementation behind them is large; the
  cost is paid once, inside the module, not by every caller.

### Size limits (lint-enforced)

| Rule | Limit | Why |
| --- | --- | --- |
| `max-lines` (per file) | **250** (excl. blanks/comments) | Caps sprawl; forces a real split, not padding |
| `max-lines-per-function` | **120** | One unit graspable in a screen-ful |
| `complexity` | **15** | Bounds branching per function |
| `max-depth` | **4** | No deeply nested control flow |
| `max-params` | **4** | Pass an options object instead |
| `max-nested-callbacks` | **3** | Keep async/handler nesting flat |

> The ceiling caps sprawl; the deep-modules rule sets the floor. Together they
> push toward the right shape: cohesive, well-tested modules of moderate size.

### Testing (coverage-enforced)

- Logic-bearing layers (`core/`, `geometry/`, `svg/`) carry unit tests with a
  **coverage gate** (lines/functions/statements ≥ 80%, branches ≥ 75%) checked
  in CI via `npm run test:coverage`.
- UI shell and bootstrap are covered by Playwright e2e (added with the first
  real tools in Phase 1), not by unit coverage.
- The `apply ∘ invert == identity` property of commands gets property-based
  tests once the command layer lands (Phase 1).

---

## 8. Immediate next steps

1. Approve this plan (and the rendering & library choices in §2).
2. Land **Phase 0**: scaffold + CI + GitHub Pages auto-deploy.
3. Land **Phase 1**: model + SVG round-trip + rect/ellipse + select + undo.

> Open questions to confirm before Phase 1: (a) SVG-DOM-first rendering OK?
> (b) React + Zustand for the shell?
>
> **Deployment is settled:** browser-only, no backend, static GitHub Pages
> deploy via Actions on every push to the default branch.
