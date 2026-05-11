# 0006 — WASM modules

- Status: accepted

Three slots, all dynamic-import behind a user action:

1. **DuckDB-WASM** (`@duckdb/duckdb-wasm`) — analytical queries against
   visits. ~5MB. Loaded the first time a user opens an analytics panel
   that needs SQL. The in-memory affinity engine handles the common cases
   without it. The module is imported via `new Function('return import(s)')`
   so Rollup cannot statically resolve it; v1 ships without the package
   installed and the loader throws a clear "not installed" error.
2. **AprilTag-WASM** — printed-marker detection. The integration point is
   `src/lib/scanner/detector.ts#detectAprilTag`. **Not bundled in v1** —
   the function throws `NotImplementedError` and the scanner UI falls
   back to QR via the native `BarcodeDetector` (Chromium, Safari iOS 17+).
3. **Local LLM** (`@xenova/transformers` candidate) — slot in
   `src/lib/llm/suggest.ts`. v1 ships a template generator; the LLM
   integration is a dynamic import the user opts into in Settings.

All three modules must be lazy-loaded. The initial JS budget (<200KB
gzipped) is non-negotiable.
