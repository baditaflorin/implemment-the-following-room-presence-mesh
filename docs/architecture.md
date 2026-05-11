# Architecture

```mermaid
flowchart LR
  subgraph Device["User device · browser"]
    UI[Preact UI]
    Affinity[affinity engine]
    Store[(IndexedDB · rpm)]
    Duck[DuckDB-WASM · lazy]
    Scanner[Scanner · QR + AprilTag slot]
    LLM[Suggest · template / lazy LLM]
    Mesh[WebRTC peer]
  end
  Pages[GitHub Pages · static assets]
  Peer((Other device))

  Pages -- fetch app shell, hashed assets --> UI
  UI <--> Affinity
  UI <--> Scanner
  UI <--> Mesh
  Affinity <--> Store
  Affinity --> Duck
  Affinity --> LLM
  Mesh <-. DataChannel, QR-mediated SDP .-> Peer
```

## Boundaries

- Pages serves the **app shell** (HTML, hashed JS/CSS, manifest, SW).
  No runtime API. No third-party origin hit during normal use.
- All user data lives in **IndexedDB** on the device. The seed data set
  is hard-coded in the bundle for first-run demos.
- Peer exchange is **explicit and ephemeral**. Two devices set up a
  WebRTC DataChannel, exchange one `AffinityVector` each, and close the
  channel. The exchange is not retried automatically.

See ADRs in `docs/adr/`.
