#!/usr/bin/env bash
# Build + serve docs/ + verify the homepage loads and contains key markers.
set -euo pipefail

PORT=4317
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT/docs/index.html" ]; then
  echo "✗ docs/index.html missing — run 'make build' first"
  exit 1
fi

echo "[smoke] starting static server on :$PORT"
npx --yes serve "$ROOT/docs" -l "$PORT" >/tmp/rpm-smoke.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT

# Wait for the server to come up (max 10s).
for i in $(seq 1 50); do
  if curl -fsS "http://localhost:$PORT/" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

echo "[smoke] GET /"
body="$(curl -fsS "http://localhost:$PORT/")"
echo "$body" | grep -q "room-presence-mesh" || { echo "✗ marker missing"; exit 1; }
echo "$body" | grep -q "id=\"app\"" || { echo "✗ #app root missing"; exit 1; }

echo "[smoke] GET /manifest.webmanifest"
curl -fsS "http://localhost:$PORT/manifest.webmanifest" >/dev/null

echo "[smoke] OK"
