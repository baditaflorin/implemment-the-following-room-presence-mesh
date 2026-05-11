# Contributing

Thanks for your interest. A few ground rules.

## Workflow

1. Branch off `main`.
2. `npm install` and `make install-hooks` once.
3. Write tests alongside the code.
4. `make fmt && make lint && make test && make smoke` before pushing.
5. Open a PR with a description of *why* the change, not just *what*.

## Conventional Commits

Use `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ops:` prefixes.
The commit-msg hook enforces this.

## ADRs

Significant architectural decisions get an ADR in `docs/adr/`. Write the ADR
*before* the code lands.

## Privacy is a constraint, not a feature

Any change that introduces network calls at runtime, telemetry, third-party
scripts, or central data storage needs an ADR and explicit discussion. The
default is no network at runtime except WebRTC and your own explicit fetches
of static assets from this repo.
