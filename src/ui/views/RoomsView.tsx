import { useEffect, useState } from "preact/hooks";
import { computeMyAffinity, type RoomAffinity } from "@/lib/affinity/engine";
import { db, type Visit } from "@/lib/storage/db";

export function RoomsView() {
  const [rows, setRows] = useState<RoomAffinity[]>([]);
  const [recent, setRecent] = useState<Visit[]>([]);

  useEffect(() => {
    (async () => {
      setRows(await computeMyAffinity());
      setRecent(await db.listVisits(20));
    })();
  }, []);

  return (
    <div class="flex flex-col gap-4 pt-1">
      <h2 class="text-lg font-semibold">Rooms</h2>

      <section>
        <h3 class="text-sm uppercase tracking-wider text-ink-400 mb-2">By affinity</h3>
        {rows.length === 0 ? (
          <div class="card text-ink-400 text-sm">Nothing yet.</div>
        ) : (
          <ul class="space-y-2">
            {rows.map((r) => (
              <li key={r.tag} class="card">
                <div class="flex items-center justify-between">
                  <div class="font-medium">{r.name}</div>
                  <div class="text-accent-400 font-mono text-sm">{r.score.toFixed(1)}</div>
                </div>
                <div class="text-xs text-ink-400 mt-1 font-mono break-all">{r.tag}</div>
                <div class="text-xs text-ink-400 mt-1">
                  {r.visits} visits · last {Math.round(r.recencyDays)}d ago
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 class="text-sm uppercase tracking-wider text-ink-400 mb-2">Recent visits</h3>
        {recent.length === 0 ? (
          <div class="card text-ink-400 text-sm">No visits yet.</div>
        ) : (
          <ul class="space-y-1.5">
            {recent.map((v) => (
              <li
                key={v.id}
                class="flex items-center justify-between text-sm font-mono px-3 py-2 rounded-lg bg-white/5 ring-1 ring-white/5"
              >
                <span class="truncate">{v.tag}</span>
                <span class="text-ink-400 ml-2 shrink-0">{new Date(v.ts).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
