# Postmortem — v0.1.0

Date: 2026-05-11.

## What got built

- A Mode A (pure GitHub Pages) Preact app that scaffolds the full
  room-presence-mesh loop: record visits, view top rooms by affinity,
  exchange affinity vectors with one peer over WebRTC (QR / paste SDP),
  and surface a coffee-style suggestion from the shared rooms.
- IndexedDB persistence via `idb` for visits, rooms, peers, matches,
  meta.
- DuckDB-WASM, AprilTag-WASM, and local-LLM as **lazy slots** — wired,
  documented, but not bundled in v1. v1 ships:
  - QR detection via the native `BarcodeDetector` for the scanner,
  - the in-TS affinity engine instead of DuckDB,
  - a deterministic template generator for the suggestion text.
- PWA shell — `manifest.webmanifest`, `sw.js` with cache-first offline,
  `404.html` SPA fallback.
- ADRs 0001–0017 (skipping 0007/0008 — Mode A has no data pipeline or Go
  backend).
- Local git hooks (`.githooks/`), Conventional Commits enforcement,
  a build-and-serve smoke script.
- Vitest tests for the affinity normaliser and the suggestion templates.

## Was Mode A the right call?

Yes. The product story is *privacy-respecting serendipity*. Every concrete
feature can be expressed client-side:

- AprilTag/QR detection: WebRTC `BarcodeDetector` + WASM.
- Storage: IndexedDB.
- Recommendation math: linear-time over a few thousand visits.
- Peer exchange: WebRTC mesh, no server.

Mode B would require a public "popular rooms" dataset which the brief
explicitly didn't want. Mode C would re-introduce the server we're trying
to avoid. The one place Mode A genuinely hurts is *ambient* peer
discovery — that's gated behind an explicit handshake in v1, which the
brief calls "a feature, not a bug".

## What worked

- **Preact + Tailwind on Vite** produced a 25KB gzipped initial JS bundle
  with the entire app — well under the 200KB budget — even with WebRTC
  glue, QR rendering, IndexedDB, six views, the affinity engine, the
  template suggester, and the mock seeder all loaded eagerly.
- **Lazy slots that throw clear errors** (DuckDB, AprilTag, LLM) beat
  shipping half-finished integrations. Each has a real call site, a
  documented contract, and a fallback the user actually gets to use.
- **`emptyOutDir: false` + targeted clean** in the Makefile let ADRs and
  prose docs live in the same `docs/` directory the build publishes
  without being wiped on each build.
- **QR-mediated SDP** is a clean way to do peer exchange without a
  signaling server. Base64-encoded payloads are too long for a small QR
  in some Wi-Fi configurations; the UI falls back to copy-paste with
  one click, which works every time.

## What didn't

- **Initial Vite build failed** on the lazy DuckDB import — Rollup
  statically resolves dynamic `import("@duckdb/duckdb-wasm")` and chokes
  when the package is absent. Fixed by importing via
  `new Function("s", "return import(s)")` so the specifier is opaque to
  the bundler. Documented in ADR 0006.
- **First build wiped the source ADRs** because Vite's default
  `emptyOutDir: true` cleans the whole `docs/` directory. Caught
  immediately; reconfigured to `emptyOutDir: false` + targeted clean in
  the Makefile. Adds a small risk of stale files in `docs/assets/`
  between builds with different hashes — mitigated by the explicit
  `rm -rf docs/assets` at the top of `make build`.

## Surprises

- The brief's `manualChunks` pattern (`{ duckdb: ["@/lib/duckdb/loader"] }`)
  is actually counter-productive when the underlying module isn't
  installed — Rollup tries to resolve the chunk eagerly and fails. The
  fix was to drop `manualChunks` and let Vite's default code-splitting
  handle dynamic imports.
- `BarcodeDetector` is good enough for QR scanning that we may never
  need to bundle a separate JS QR library. AprilTag is a different
  story: there's no native equivalent, so the WASM slot is the only
  path.

## Accepted tech debt

1. **AprilTag-WASM isn't wired in v1.** QR is the bundled fallback.
   The `detectAprilTag` call site is in place; replacing the throw with
   a real implementation is a contained change.
2. **No Playwright e2e.** The mesh handshake needs two browser contexts
   and is awkward to script without one. Smoke covers the static
   surface; the handshake is exercised manually for now.
3. **STUN is off by default.** Same-Wi-Fi handshake works without it;
   cross-NAT requires the user to flip a toggle. Acceptable for a
   privacy-first v1.
4. **No e2e test of IndexedDB schema migrations.** Schema version is 1.
   When it changes, the upgrade path will need a test.

## Top three next improvements

1. **Bundle AprilTag-WASM**. The product card explicitly says "AprilTag";
   shipping just QR is a partial fulfilment of the promise. The slot is
   ready, the UI knows how to fall through, the budget has room.
2. **First-class peer history**. The `peers` store keeps every handshake
   but the UI only surfaces them in Suggestions. A dedicated Peers view
   would let users name, delete, or re-handshake friends. ~half a day.
3. **Real local-LLM backend** (`@xenova/transformers`, a 30–80MB
   instruction-tuned model). Adds polish to the "want a coffee" nudges
   without changing the privacy posture. ~one day end-to-end, including
   the consent dialog and a quality bar for outputs vs. the template.

## Time vs. estimate

Estimated: one focused day. Actual: roughly two hours of build time
(scaffolding + features + ADRs + verification). The brief is dense but
Mode A removes all of the deploy/infrastructure surface, which is where
greenfield projects usually leak hours.
