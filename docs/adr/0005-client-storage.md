# 0005 — Client-side storage

- Status: accepted

IndexedDB (via `idb`) for everything durable. Database name: `rpm`. Object
stores:

- `rooms`     keyed by `tag`
- `visits`    auto-increment id, indexes on `tag` and `ts`
- `peers`     keyed by `id`
- `matches`   auto-increment id, index on `peerId`
- `meta`      key/value for settings (peer label, suggestion backend, etc.)

Not used: `localStorage` (sync API, 5–10MB cap, no indexes), OPFS (overkill
for the sub-MB datasets we expect; revisit if we add bulk import).
