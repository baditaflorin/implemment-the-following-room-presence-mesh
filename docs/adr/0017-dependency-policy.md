# 0017 — Dependency policy

- Status: accepted

Production dependencies, kept deliberately small:

- `preact` — view layer.
- `idb` — IndexedDB convenience wrapper.
- `qrcode` — render QR for SDP exchange.

Lazy dependencies (loaded behind a user action, not in initial bundle):

- `@duckdb/duckdb-wasm` — optional, opt-in.
- AprilTag-WASM — slot only in v1.
- `@xenova/transformers` — slot only in v1.

No analytics SDKs, no auth SDKs, no UI kits. New runtime dependencies
need an ADR.

Audits: `npm audit` must show no high/critical findings before release.
