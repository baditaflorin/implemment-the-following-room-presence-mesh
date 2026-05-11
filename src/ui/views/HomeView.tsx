import { useEffect, useState } from "preact/hooks";
import { computeMyAffinity, type RoomAffinity } from "@/lib/affinity/engine";
import { db } from "@/lib/storage/db";
import { seedIfEmpty } from "@/lib/seed";
import type { Route } from "@/ui/BottomNav";

interface Props {
  onNavigate: (r: Route) => void;
}

export function HomeView({ onNavigate }: Props) {
  const [top, setTop] = useState<RoomAffinity[]>([]);
  const [recentCount, setRecentCount] = useState(0);
  const [seedNote, setSeedNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const seed = await seedIfEmpty();
      if (seed.seeded) {
        setSeedNote("Loaded a small demo dataset so you have something to look at.");
      }
      const rows = await computeMyAffinity();
      setTop(rows.slice(0, 4));
      const visits = await db.listVisits(10_000);
      const sevenDaysAgo = Date.now() - 7 * 86_400_000;
      setRecentCount(visits.filter((v) => v.ts >= sevenDaysAgo).length);
    })();
  }, []);

  return (
    <div class="flex flex-col gap-4 pt-1">
      {seedNote && (
        <div class="card text-sm text-ink-400">
          <span class="text-accent-400">Demo:</span> {seedNote} Wipe it any time from
          <button class="underline ml-1" onClick={() => onNavigate("settings")}>
            Settings
          </button>
          .
        </div>
      )}

      <div class="card">
        <div class="text-xs uppercase tracking-wider text-ink-400">This week</div>
        <div class="mt-1 text-3xl font-semibold">
          {recentCount} <span class="text-base text-ink-400 font-normal">visits</span>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="btn" onClick={() => onNavigate("scan")}>
            Record a visit
          </button>
          <button class="btn-ghost" onClick={() => onNavigate("suggest")}>
            See suggestions
          </button>
        </div>
      </div>

      <section>
        <h2 class="text-sm uppercase tracking-wider text-ink-400 mb-2">Top rooms</h2>
        {top.length === 0 ? (
          <div class="card text-ink-400 text-sm">
            No visits yet. Scan a room tag to get started.
          </div>
        ) : (
          <ul class="space-y-2">
            {top.map((r) => (
              <li key={r.tag} class="card flex items-center justify-between">
                <div>
                  <div class="font-medium">{r.name}</div>
                  <div class="text-xs text-ink-400">
                    {r.visits} visits · last {Math.round(r.recencyDays)}d ago
                  </div>
                </div>
                <div class="text-accent-400 font-mono text-sm">{r.score.toFixed(1)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 class="text-sm uppercase tracking-wider text-ink-400 mb-2">Mesh</h2>
        <button class="card w-full text-left" onClick={() => onNavigate("mesh")}>
          <div class="font-medium">Compare with a friend</div>
          <div class="text-xs text-ink-400 mt-1">
            Scan their QR or paste their handshake. Nothing leaves your device unless you accept.
          </div>
        </button>
      </section>
    </div>
  );
}
