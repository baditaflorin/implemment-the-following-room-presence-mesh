# 0016 — Local git hooks

- Status: accepted

`.githooks/` is wired via `core.hooksPath`. `make install-hooks` is
idempotent. CI is intentionally absent — checks live next to the
developer.

- `pre-commit` — prettier --check, tsc --noEmit, gitleaks (if installed).
- `commit-msg` — Conventional Commits regex.
- `pre-push` — vitest run, `make build`, sanity-check `docs/index.html`,
  then `make smoke`.

Each hook is also runnable manually as `make hooks-<name>` so a contributor
can debug a single stage without committing.
