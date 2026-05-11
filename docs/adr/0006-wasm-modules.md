# 0006 — WASM modules

- Status: accepted (revised v2)

Three lazy slots, each gated behind a user action:

1. **DuckDB-WASM** (`@duckdb/duckdb-wasm`) — analytical queries against
   visits. ~5MB. Loaded the first time a user opens an analytics panel
   that needs SQL. The in-memory affinity engine covers v1 needs. The
   import goes through `new Function("s","return import(s)")` so Rollup
   cannot statically resolve it; v1 ships without the package installed
   and the loader throws a clear "not installed" error.

2. **AprilTag-WASM** (vendored from `arenaxr/apriltag-js-standalone`,
   BSD-2). The bundle (`apriltag_wasm.js` + `apriltag_wasm.wasm` +
   `apriltag.js` + `base64.js` + `LICENSE`) lives in
   `public/vendor/apriltag/`. We do **not** use upstream's `apriltag.js`
   directly because it imports Comlink from a third-party CDN at runtime
   — incompatible with the "no third-party at runtime" stance from ADR
   0001. Instead `public/vendor/apriltag/apriltag-worker.js` (our own
   ~80 line shim) drives the Emscripten module via cwrap and exposes a
   tiny init / detect message API. `src/lib/scanner/detector.ts` lazily
   spawns this worker on first `detectAprilTag()` call, downsamples
   video frames to 320×N grayscale, transfers them via
   `postMessage([buffer])`, and resolves to `rpm:apriltag:<id>` or null.
   `aprilTagBundlePresent()` does a cheap HEAD check so the UI can
   gracefully degrade to QR when the vendor files are absent (e.g.,
   served from a stripped clone).

3. **Local LLM** (`@xenova/transformers` candidate) — slot in
   `src/lib/llm/suggest.ts`. v1 ships a template generator; the LLM
   integration is a dynamic import the user opts into in Settings.

All three modules must be lazy-loaded. The initial JS budget (<200KB
gzipped) is non-negotiable. The AprilTag bundle adds ~200KB on the wire
when first used, none of which is in the initial chunk.

## Refreshing the vendored AprilTag bundle

See `public/vendor/apriltag/README.md` for the exact `curl` commands.
Bump the SHAs in the commit message under a `data:` or `chore:` prefix.
