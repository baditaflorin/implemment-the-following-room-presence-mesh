import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";

// GitHub Pages serves the repo from /<repo-name>/.
// The base path must match for hashed asset URLs to resolve.
const REPO_BASE = "/implemment-the-following-room-presence-mesh/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? REPO_BASE : "/",
  plugins: [preact()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "docs",
    // Targeted cleanup is done by `make build` (rm of build-output files
    // only). emptyOutDir=true would wipe docs/adr/ and the prose docs that
    // live alongside the built site in this repo.
    emptyOutDir: false,
    sourcemap: false,
    target: "es2022",
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    // DuckDB-WASM is loaded dynamically; exclude from prebundling.
    exclude: ["@duckdb/duckdb-wasm"],
  },
}));
