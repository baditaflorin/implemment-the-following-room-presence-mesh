# 0003 — Frontend stack

- Status: accepted

Preact + TypeScript (strict) + Vite + Tailwind.

- **Preact, not React** — keeps the initial bundle small (the user-facing
  budget is <200KB gzipped, and we still need room for storage + mesh +
  scanner glue). The `react`/`react-dom` aliases point at `preact/compat`
  so the door to React-targeted libraries stays open.
- **Vite** — fast dev server, predictable build, first-class WASM and
  worker support.
- **Tailwind** — small built-in component layer (`.card`, `.btn`) keeps
  per-view markup terse without committing to a full UI library.

No router library — there are five top-level views, a single piece of
state in `App.tsx` is enough. Reconsider only if deep linking matters.
