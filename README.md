# CraftScape

A browser-based vector graphics editor — an open-source, web-native clone of
[Inkscape](https://inkscape.org). CraftScape edits SVG directly in the browser:
no install, no plugins, everything runs client-side with optional cloud sync.

> **Status:** Planning. See [`docs/PLAN.md`](docs/PLAN.md) for the full
> architecture and implementation roadmap.

## Goals

- **SVG-native.** The document *is* an SVG. What you edit is what you export.
- **Familiar.** Tooling, shortcuts, and workflows modeled on Inkscape.
- **Offline-first.** Works fully client-side; cloud sync is optional.
- **Hackable.** Clean, typed, modular core that's easy to extend.

## Non-goals (initially)

- Pixel/raster editing (this is a vector tool, not a Photoshop clone).
- 1:1 feature parity with Inkscape on day one — see the phased roadmap.
- Print color management (CMYK, ICC) in early phases.

## License

MIT © 2026 Levente Szabadkai
