# vendored: arenaxr/apriltag-js-standalone

These files are vendored verbatim from
https://github.com/arenaxr/apriltag-js-standalone (BSD-2-Clause, see
`LICENSE`). Refreshing them is a manual step:

```sh
cd public/vendor/apriltag
for f in apriltag.js apriltag_wasm.js apriltag_wasm.wasm base64.js; do
  curl -sO "https://raw.githubusercontent.com/arenaxr/apriltag-js-standalone/master/html/$f"
done
curl -s -o LICENSE \
  "https://raw.githubusercontent.com/arenaxr/apriltag-js-standalone/master/LICENSE"
```

`apriltag-worker.js` is **not** vendored — we write it ourselves to bypass
upstream's Comlink-from-unpkg dependency. It exposes a minimal
init / detect message API on top of `apriltag_wasm.js`.

Main-thread integration lives at `src/lib/scanner/detector.ts`.
