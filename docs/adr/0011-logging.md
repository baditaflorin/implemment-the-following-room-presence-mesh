# 0011 — Logging

- Status: accepted

Production builds emit nothing to `console.log`. `console.warn` /
`console.error` are reserved for genuine programmer-relevant failures
(DB upgrade error, WebRTC handshake failure). No telemetry channel
exists, so the browser console is the only place messages land.
