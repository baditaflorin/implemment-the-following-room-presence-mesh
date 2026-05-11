# 0015 — Deployment topology

- Status: accepted

Single artifact: the `docs/` directory in the repo, served by GitHub
Pages at `https://baditaflorin.github.io/implemment-the-following-room-presence-mesh/`.

No backend, no Docker, no nginx, no compose. The deploy procedure is
`git push`. Rolling back is `git revert` of the offending commit.
