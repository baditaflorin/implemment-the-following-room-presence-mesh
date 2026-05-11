/**
 * DuckDB-WASM lazy loader.
 *
 * DuckDB is heavy (~5MB WASM). We import it dynamically and only when the
 * user opens the analytics panel. For the v1 happy path (record + suggest)
 * the affinity engine in plain TS is fast enough on the data sizes a single
 * user produces (thousands of rows, not millions).
 *
 * This module exposes a thin interface so consumers don't see the duckdb
 * surface and we keep a stable contract while the underlying engine evolves.
 */

import type { Visit } from "@/lib/storage/db";

export interface DuckBridge {
  ready: true;
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>;
  close(): Promise<void>;
}

let cached: DuckBridge | null = null;

export async function getDuck(visits: Visit[]): Promise<DuckBridge> {
  if (cached) return cached;

  // Dynamic import via Function() so the bundler cannot statically resolve
  // the optional module. The package is not installed in v1; this throws a
  // clear runtime error if the user opts into advanced queries. To enable,
  // `npm install @duckdb/duckdb-wasm` and rebuild.
  const importer = new Function("s", "return import(s);") as (s: string) => Promise<unknown>;
  const duckdb = await importer("@duckdb/duckdb-wasm").catch(() => null);
  if (!duckdb) {
    throw new Error(
      "duckdb-wasm not installed — install @duckdb/duckdb-wasm to enable advanced queries",
    );
  }

  const bundles = (duckdb as { getJsDelivrBundles: () => unknown }).getJsDelivrBundles();
  const bundle = await (duckdb as { selectBundle: (b: unknown) => Promise<unknown> }).selectBundle(
    bundles,
  );
  const cast = bundle as { mainWorker: string; mainModule: string };
  const worker = new Worker(cast.mainWorker, { type: "module" });
  const logger = new (duckdb as { ConsoleLogger: new () => unknown }).ConsoleLogger();
  const dbCtor = duckdb as {
    AsyncDuckDB: new (
      logger: unknown,
      worker: Worker,
    ) => {
      instantiate: (mainModule: string) => Promise<void>;
      connect: () => Promise<{
        query: (sql: string) => Promise<{ toArray: () => unknown[] }>;
        close: () => Promise<void>;
      }>;
      terminate: () => Promise<void>;
    };
  };
  const inst = new dbCtor.AsyncDuckDB(logger, worker);
  await inst.instantiate(cast.mainModule);
  const conn = await inst.connect();

  // Materialise the visits table once. For a v1 dataset this is fine.
  await conn.query("CREATE TABLE visits(tag VARCHAR, ts BIGINT, dwell INTEGER)");
  if (visits.length > 0) {
    const rows = visits
      .map((v) => `('${v.tag.replace(/'/g, "''")}', ${v.ts}, ${v.dwellSec ?? 0})`)
      .join(",");
    await conn.query(`INSERT INTO visits VALUES ${rows}`);
  }

  cached = {
    ready: true,
    async query<T>(sql: string) {
      const res = await conn.query(sql);
      return res.toArray() as T[];
    },
    async close() {
      await conn.close();
      await inst.terminate();
      cached = null;
    },
  };
  return cached;
}
