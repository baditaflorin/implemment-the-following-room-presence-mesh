# 0002 — Architecture overview & module boundaries

- Status: accepted
- Date: 2026-05-11

## Layout

```
src/
  main.tsx                 # entry, mounts <App/>, registers SW
  styles.css               # Tailwind base + components
  ui/                      # Preact components — view layer only
    App.tsx
    BottomNav.tsx
    views/                 # one file per top-level screen
  lib/                     # pure logic, framework-agnostic
    storage/db.ts          # IndexedDB wrapper (idb)
    affinity/engine.ts     # affinity & overlap math
    duckdb/loader.ts       # dynamic DuckDB-WASM bridge
    scanner/detector.ts    # QR + AprilTag detector slots
    mesh/peer.ts           # WebRTC offer/answer, channel wiring
    llm/suggest.ts         # template + lazy LLM backends
    seed.ts                # idempotent demo data
```

## Boundaries

- `ui/` imports from `lib/`. `lib/` never imports `ui/`.
- `lib/` modules are independently testable; each owns its own types.
- Dynamic imports (`duckdb/loader`, scanner WASM, LLM) are pulled at the
  first user action that needs them, never at app start.

## Data flow

1. User scans a tag (or types one) → `db.recordVisit` writes IndexedDB.
2. Home/Rooms/Suggestions call `affinity/engine.computeMyAffinity` which
   reads the visits store and produces `RoomAffinity[]`.
3. Mesh view drives `mesh/peer` to handshake with one other device;
   exchanges the user's `AffinityVector` (normalised, no timestamps); writes
   the peer to IndexedDB; computes overlap; renders.
4. Suggestions view turns overlap into a `Suggestion` via the chosen
   `llm/suggest` backend.

No module pulls cross-device data without an explicit handshake initiated
by the user.
