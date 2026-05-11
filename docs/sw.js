/* room-presence-mesh service worker — minimal app-shell cache.
 * mp1hnu4p is replaced at build time by the rpm-replace-sw-hash
 * Vite plugin (see vite.config.ts). In dev (vite serve) the literal
 * "mp1hnu4p" survives, which is fine — dev does not register SW. */
const CACHE = "rpm-shell-mp1hnu4p";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(["./", "./index.html", "./favicon.svg", "./manifest.webmanifest"]),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Cache-first for same-origin static assets; network fallback for the rest.
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html"));
    }),
  );
});
