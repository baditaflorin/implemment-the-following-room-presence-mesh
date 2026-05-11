# 0011 — Logging & service-worker cache

- Status: accepted

Production builds emit nothing to `console.log`. `console.warn` /
`console.error` are reserved for genuine programmer-relevant failures
(DB upgrade error, WebRTC handshake failure). No telemetry channel
exists, so the browser console is the only place messages land.

The service worker cache name is `rpm-shell-<build-hash>`, where
`<build-hash>` is `Date.now().toString(36)` baked into `docs/sw.js`
at build time by the `rpm-replace-sw-hash` Vite plugin. Each build
produces a byte-distinct SW, which triggers the browser's update
flow; the `activate` listener purges every cache that doesn't match
the current name, so stale shells don't linger after a deploy.
