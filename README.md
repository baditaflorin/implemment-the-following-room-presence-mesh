# room-presence-mesh

[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-38bdf8)](https://baditaflorin.github.io/implemment-the-following-room-presence-mesh/)
[![Mode A](https://img.shields.io/badge/mode-A%20·%20Pure%20Pages-0284c7)](docs/adr/0001-deployment-mode.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Private, local room-presence notes that suggest opt-in coffee matches from shared place habits.**

Your phone notices which rooms you spend time in — privately, on-device. Occasionally
it surfaces: *"three other people also gravitate to the library — want a coffee tomorrow?"*

This is a privacy-respecting serendipity engine. No accounts. No central server. No tracking.
Everything lives in your browser. Peer discovery is **opt-in**, **explicit**, and
**QR-mediated** — not ambient.

## Quickstart

```bash
git clone https://github.com/baditaflorin/implemment-the-following-room-presence-mesh
cd implemment-the-following-room-presence-mesh
npm install
npm run dev
```

Open the dev URL Vite prints. The app installs locally; no network round-trips for
data, recommendations, or matching.

## How it works

- **Scan a tag in a room** (AprilTag or a printable QR fallback). The visit is
  recorded in IndexedDB. No GPS, no Bluetooth scanning, no background polling.
- **Affinity** is computed locally by DuckDB-WASM over your visit history. You see
  *your* top rooms.
- **Mesh discovery** is opt-in: you and a friend each show a QR with a WebRTC
  offer/answer payload. Once connected, devices exchange anonymous affinity
  vectors and surface overlapping rooms. No signaling server.
- **Suggestion text** ("want a coffee tomorrow?") is generated locally — by a
  small lazy-loaded model or, on weaker devices, a template-based generator.

## Architecture

See [docs/architecture.md](docs/architecture.md) and the ADRs in
[docs/adr/](docs/adr/).

- Frontend: Preact + Vite + Tailwind, built into `docs/` for GitHub Pages.
- Storage: IndexedDB (durable) + DuckDB-WASM (queries, lazy-loaded).
- Mesh: WebRTC DataChannel + QR-mediated SDP exchange (no signaling server).
- Scanner: AprilTag-WASM, lazy-loaded behind the *Scan* button.

## Privacy guarantees

- All visits, rooms, and matches stay in IndexedDB on your device.
- No analytics, no telemetry, no third-party requests at runtime.
- Mesh exchange happens directly between two devices over WebRTC. The SDP
  handshake is shown as a QR for you to scan or paste manually.
- See [docs/privacy.md](docs/privacy.md).

## Live site

https://baditaflorin.github.io/implemment-the-following-room-presence-mesh/

## Make targets

```bash
make help              # list targets
make install-hooks     # wire git hooks
make dev               # vite dev server
make build             # build into docs/
make pages-preview     # serve docs/ as Pages would
make test              # vitest
make smoke             # build + serve + headless smoke
make lint
make fmt
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).
