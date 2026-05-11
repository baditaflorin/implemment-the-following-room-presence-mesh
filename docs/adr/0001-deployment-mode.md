# 0001 — Deployment mode

- Status: accepted
- Date: 2026-05-11

## Context

The brief gives three modes:

- **A** — pure GitHub Pages, no backend at runtime
- **B** — Pages frontend + pre-built static data artifacts
- **C** — Pages frontend + a Docker backend

This project's core promise is *privacy-respecting serendipity*. Visits,
rooms, and peer affinities are inherently sensitive: knowing which rooms a
person frequents is a behavioural fingerprint. A central server holding that
data is a liability we want to avoid by design, not just by policy.

The brief's non-goals reinforce this: "no central user accounts, profiles, or
hosted social database", "no fully automatic stranger discovery that requires
a runtime signaling server".

## Decision

**Mode A — pure GitHub Pages.**

- AprilTag detection runs in-browser via WASM (lazy-loaded behind a user
  action).
- DuckDB-WASM handles analytical queries against IndexedDB-backed visits
  (lazy-loaded).
- Recommendations are computed on-device.
- The local LLM backend is a lazy-loaded slot — v1 ships with a template
  generator and the integration point for a small transformer model.
- WebRTC peer exchange uses **QR-mediated SDP signaling** — the two devices
  show each other QR codes (or paste base64). No signaling server.
- Persistence uses IndexedDB. Cross-device sync is out of scope for v1.

## Consequences

- The live URL works on day one — no server to deploy, no DNS, no TLS.
- Cost: $0 to host indefinitely.
- The frontend is the entire product surface. Every feature must be
  expressible client-side.
- Initial JS budget is tight (<200KB gzipped). Heavy modules (AprilTag-WASM,
  DuckDB-WASM, WebRTC peer, optional LLM) are dynamic imports.
- Automatic ambient stranger discovery is **explicitly not supported in v1**
  — that would require a signaling channel. The user trades that off for not
  needing accounts.

## Alternatives considered

- **Mode B** — a pre-built directory of "popular rooms" doesn't fit; the
  whole product is *your* room habits, not a public dataset.
- **Mode C** — a signaling server would enable automatic mesh discovery but
  immediately reintroduces the privacy/operations cost we set out to avoid.
  Revisit only if v2 needs ambient discovery across strangers, and even then
  only with a minimal SDP-relay design that never sees affinity data.
