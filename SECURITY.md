# Security Policy

If you find a security issue, please email **baditaflorin@gmail.com** rather
than opening a public issue. Include reproduction steps and the affected version.

## Scope

This is a static, client-side application. The relevant attack surfaces are:

- **Data exfiltration via XSS** — all user data lives in IndexedDB.
- **WebRTC handshake spoofing** — the QR-mediated SDP exchange must resist
  tampering by a third party.
- **Supply chain** — npm dependencies are pinned and audited.

There is no backend, no auth, no shared database. If you find a way to
exfiltrate one user's data to another without their explicit handshake, that is
the highest-severity class of bug for this project.
