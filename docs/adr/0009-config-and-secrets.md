# 0009 — Configuration & secrets

- Status: accepted

There are no runtime secrets. The frontend ships with one piece of build-
time config: the Pages `base` path in `vite.config.ts`. Runtime user
choices (peer label, suggestion backend, STUN opt-in) live in the `meta`
IndexedDB store on each device.

`.env*` files are in `.gitignore` as a guardrail even though no env vars
are used by the build. A gitleaks pre-commit hook backs this up.
