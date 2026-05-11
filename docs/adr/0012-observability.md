# 0012 — Observability

- Status: accepted

**None at runtime.** No analytics, no beacons, no Sentry. The product
promise depends on no third party ever seeing user data.

If usage measurement becomes important later, the path is:
1. Add a Settings toggle, off by default.
2. Send a single, anonymised, debounced event per session to a tiny
   first-party beacon.
3. Document exactly what is collected in `docs/privacy.md`.

Until that day, the only observability is the browser DevTools panel.
