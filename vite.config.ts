import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// GitHub Pages serves the repo from /<repo-name>/.
// The base path must match for hashed asset URLs to resolve.
const REPO_BASE = "/implemment-the-following-room-presence-mesh/";

// A fresh hash per build is sufficient to bust the service-worker cache.
// Deterministic per-content hashing would help reviews of docs/ diffs, but
// the cost (one extra build pass) outweighs the gain for a single-author
// project; the SW byte-changes anyway because the cache name changes.
const BUILD_HASH = Date.now().toString(36);

// After Vite copies public/sw.js to docs/sw.js, replace the placeholder so
// the new SW's byte content differs from the previous build's — that is
// what makes browsers fetch and activate the new worker.
function replaceSwHash(): Plugin {
  return {
    name: "rpm-replace-sw-hash",
    apply: "build",
    closeBundle() {
      const swPath = resolve(__dirname, "docs/sw.js");
      if (!existsSync(swPath)) return;
      const txt = readFileSync(swPath, "utf-8");
      writeFileSync(swPath, txt.replace(/__BUILD_HASH__/g, BUILD_HASH));
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? REPO_BASE : "/",
  plugins: [preact(), replaceSwHash()],
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
