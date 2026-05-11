# 0013 — Testing

- Status: accepted

- **Unit tests** — Vitest with happy-dom for browser-shaped APIs. Tests
  live next to source as `*.test.ts`. Targets: the affinity engine, the
  storage layer, the mesh signal encode/decode.
- **Smoke test** — `scripts/smoke.sh` builds the site, serves `docs/`
  with a tiny static server, and checks the homepage's status and a
  marker string in the HTML. Runs in the pre-push hook.
- **e2e** — Playwright planned but not in v1. The mesh handshake is hard
  to e2e without two browser contexts; reachable but not yet built.

Targets: ≥70% coverage on `src/lib/`. UI is exercised by the smoke test,
not unit tests.
