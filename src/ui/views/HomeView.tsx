import { useEffect, useState } from "preact/hooks";
import { computeMyAffinity, type RoomAffinity } from "@/lib/affinity/engine";
import { db, type Checkin, type Room } from "@/lib/storage/db";
import { seedIfEmpty } from "@/lib/seed";
import type { Route } from "@/ui/BottomNav";

interface Props {
  onNavigate: (r: Route) => void;
}

interface ActiveCheckin {
  checkin: Checkin;
  room: Room | undefined;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function HomeView({ onNavigate }: Props) {
  const [top, setTop] = useState<RoomAffinity[]>([]);
  const [recentCount, setRecentCount] = useState(0);
  const [seedNote, setSeedNote] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveCheckin | null>(null);
  const [now, setNow] = useState(Date.now());

  async function refresh() {
    const rows = await computeMyAffinity();
    setTop(rows.slice(0, 4));
    const visits = await db.listVisits(10_000);
    const sevenDaysAgo = Date.now() - 7 * 86_400_000;
    setRecentCount(visits.filter((v) => v.ts >= sevenDaysAgo).length);
    const c = await db.getCurrentCheckin();
    if (c) {
      const room = await db.getRoom(c.tag);
      setActive({ checkin: c, room });
    } else {
      setActive(null);
    }
  }

  useEffect(() => {
    (async () => {
      const seed = await seedIfEmpty();
      if (seed.seeded) {
        setSeedNote("Loaded a small demo dataset so you have something to look at.");
      }
      await refresh();
    })();
  }, []);

  // Tick the elapsed time only while a check-in is active. One interval per
  // mount; cleared on unmount or check-out.
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  async function checkOut() {
    await db.endCheckin();
    await refresh();
  }

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

      {active && (
        <div class="card border border-accent-500/30">
          <div class="text-xs uppercase tracking-wider text-accent-400">Checked in</div>
          <div class="mt-1 text-xl font-semibold">{active.room?.name ?? active.checkin.tag}</div>
          <div class="mt-1 text-ink-400 font-mono text-sm">
            {formatElapsed(now - active.checkin.since)}
          </div>
          <div class="mt-3 flex gap-2">
            <button class="btn" onClick={checkOut}>
              Check out
            </button>
            <button class="btn-ghost" onClick={() => onNavigate("scan")}>
              Move to another room
            </button>
          </div>
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
