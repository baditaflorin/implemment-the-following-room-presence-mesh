# 0014 — Error handling

- Status: accepted

- `lib/` functions throw on programmer errors and return typed nulls or
  empty arrays for "no result yet" conditions.
- `ui/` views catch at the boundary and either render a non-alarming
  fallback ("nothing yet") or surface a one-line error pill.
- `NotImplementedError` (in `scanner/detector.ts`) is a deliberate
  sentinel for slots that exist but are not wired in v1. Callers handle
  it by falling through to the next available detection source.
