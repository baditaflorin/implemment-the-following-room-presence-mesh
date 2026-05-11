# 0010 — GitHub Pages publishing strategy

- Status: accepted
- Date: 2026-05-11

## Context

We need a deterministic path from `git push` to a working public URL.

## Decision

- Pages publishes from the `main` branch, `/docs` folder.
- Vite is configured with `base: "/implemment-the-following-room-presence-mesh/"`
  in production builds and `outDir: "docs"`.
- The repo's `.gitignore` excludes `dist/`, `node_modules/`, etc., but
  **deliberately does not exclude `docs/`** — the built site must be
  committed for Pages to serve it.
- `emptyOutDir` is **false** in `vite.config.ts`. ADRs and prose docs
  live in `docs/adr/` and `docs/*.md` alongside the built site; a blanket
  wipe would erase them. The `make build` target does a **targeted clean**
  of the build-output files only (`docs/assets/`, `docs/index.html`,
  `docs/404.html`, `docs/favicon.svg`, `docs/manifest.webmanifest`,
  `docs/sw.js`) before invoking Vite.
- Assets are hashed by Vite (`docs/assets/*.[hash].js`) so cache busting is
  automatic.
- A `404.html` at the build root is the SPA fallback (Pages serves it on
  any unknown path; we hand it off to the same Preact router state).
- No custom domain in v1 — the project lives at the default
  `<user>.github.io/<repo>/` URL.
- The git pre-push hook runs `make build` and verifies `docs/index.html`
  exists, so a push that produces a broken Pages site is rejected locally.

## Consequences

- The `docs/` directory churns on every release. Reviewers should treat the
  diff inside `docs/assets/` as build output, not source — Conventional
  Commits type `data:` is used when only built output changed.
- A bad commit cannot be hot-fixed at Pages — it requires a revert. The
  4-second median Pages deploy makes that acceptable.

## Alternatives considered

- A `gh-pages` branch: more separation between source and built output, at
  the cost of an extra branch and a manual or scripted push step. Not worth
  the friction for a solo project.
- Building into `dist/` and copying selected files into `docs/` — more
  steps for the same outcome. Rejected.
