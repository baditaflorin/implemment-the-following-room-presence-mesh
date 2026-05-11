/// <reference types="vite/client" />

declare module "@duckdb/duckdb-wasm" {
  // Intentionally untyped — duckdb-wasm is a lazy optional module narrowed
  // at the call site in src/lib/duckdb/loader.ts. Not installed in v1;
  // type definitions arrive only if it is added.
  const anyExport: unknown;
  export = anyExport;
}
