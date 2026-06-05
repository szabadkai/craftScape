# CraftScape

A browser-based vector graphics editor — an open-source, web-native clone of
[Inkscape](https://inkscape.org). CraftScape edits SVG directly in the browser:
no install, no plugins, **no backend** — everything runs client-side and is
deployed as a fully static site to GitHub Pages.

> **Status:** Phases 0–3 complete (model, SVG round-trip, shapes, undo/redo,
> mobile, transforms, groups, z-order, clipboard, align, Bézier paths & node
> editing). See the [roadmap](docs/ROADMAP.md), the [task list](docs/TASKS.md),
> and the [architecture plan](docs/PLAN.md).

## Goals

- **SVG-native.** The document *is* an SVG. What you edit is what you export.
- **Familiar.** Tooling, shortcuts, and workflows modeled on Inkscape.
- **100% client-side.** No server, no accounts. Static files on GitHub Pages.
- **Offline-first.** All state lives in the browser (IndexedDB).
- **Hackable.** Clean, typed, modular core that's easy to extend.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # production build -> dist/
npm run preview    # preview the production build
npm test           # unit tests (vitest)
```

## Deploy

Every push to the default branch builds the static site and publishes it to
GitHub Pages automatically via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
No manual steps, no backend.

## Non-goals (initially)

- Pixel/raster editing (this is a vector tool, not a Photoshop clone).
- 1:1 feature parity with Inkscape on day one — see the phased roadmap.
- Print color management (CMYK, ICC) in early phases.

## License

MIT © 2026 Levente Szabadkai
