import { useEffect, useState } from "preact/hooks";
import { db } from "@/lib/storage/db";

export function SettingsView() {
  const [counts, setCounts] = useState({ visits: 0, rooms: 0, peers: 0, matches: 0 });
  const [confirming, setConfirming] = useState(false);
  const [stunEnabled, setStunEnabled] = useState(false);

  useEffect(() => {
    refresh();
    (async () => {
      const v = await db.getMeta<boolean>("stun-enabled");
      if (typeof v === "boolean") setStunEnabled(v);
    })();
  }, []);

  async function refresh() {
    const [visits, rooms, peers, matches] = await Promise.all([
      db.listVisits(10_000),
      db.listRooms(),
      db.listPeers(),
      db.listMatches(),
    ]);
    setCounts({
      visits: visits.length,
      rooms: rooms.length,
      peers: peers.length,
      matches: matches.length,
    });
  }

  async function wipe() {
    await db.wipe();
    setConfirming(false);
    await refresh();
  }

  async function toggleStun(v: boolean) {
    setStunEnabled(v);
    await db.setMeta("stun-enabled", v);
  }

  return (
    <div class="flex flex-col gap-4 pt-1">
      <h2 class="text-lg font-semibold">Settings</h2>

      <section class="card">
        <h3 class="text-sm uppercase tracking-wider text-ink-400">Local data</h3>
        <ul class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <li class="flex justify-between">
            <span>Visits</span>
            <span class="font-mono">{counts.visits}</span>
          </li>
          <li class="flex justify-between">
            <span>Rooms</span>
            <span class="font-mono">{counts.rooms}</span>
          </li>
          <li class="flex justify-between">
            <span>Peers</span>
            <span class="font-mono">{counts.peers}</span>
          </li>
          <li class="flex justify-between">
            <span>Matches</span>
            <span class="font-mono">{counts.matches}</span>
          </li>
        </ul>
        <p class="mt-3 text-xs text-ink-400">
          Stored in IndexedDB (database <span class="font-mono">rpm</span>) on this device only.
          Wiping it removes all visits, rooms, peers and suggestions — there is no remote backup to
          restore from.
        </p>
        {!confirming ? (
          <button class="btn-ghost mt-3" onClick={() => setConfirming(true)}>
            Wipe all local data
          </button>
        ) : (
          <div class="mt-3 flex gap-2">
            <button class="btn bg-rose-500 hover:bg-rose-400" onClick={wipe}>
              Confirm wipe
            </button>
            <button class="btn-ghost" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </div>
        )}
      </section>

      <section class="card">
        <h3 class="text-sm uppercase tracking-wider text-ink-400">Mesh</h3>
        <label class="mt-3 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={stunEnabled}
            onChange={(e) => toggleStun((e.target as HTMLInputElement).checked)}
          />
          <span>
            Use Google's public STUN server for cross-NAT handshake
            <span class="block text-xs text-ink-400">
              Off by default. When on, your IP/port may be observed by stun.l.google.com during
              connection setup. No auth, no data.
            </span>
          </span>
        </label>
      </section>

      <section class="card">
        <h3 class="text-sm uppercase tracking-wider text-ink-400">About</h3>
        <p class="text-sm mt-2">
          room-presence-mesh — Mode A (pure GitHub Pages). No backend, no analytics, no accounts.
        </p>
        <p class="text-xs text-ink-400 mt-2">
          Source: github.com/baditaflorin/implemment-the-following-room-presence-mesh
        </p>
      </section>
    </div>
  );
}
