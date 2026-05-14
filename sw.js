// MBE QBank Service Worker — version-bumped cache for offline use
// Bump CACHE_VERSION whenever you update any file to force a refresh.
const CACHE_VERSION = "mbe-qbank-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./data/questions.json",
  "./data/glossary.json",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./icon-152.png"
];

// Install: precache the shell + data
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for our own files, network-first for external (translate / AI APIs)
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === location.origin;
  
  // External requests (Google Translate, AI APIs, Google Fonts): network-first, no caching
  if (!sameOrigin) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: "offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    ));
    return;
  }
  
  // Same-origin: cache-first, fallback to network, then put in cache
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        // Only cache successful GETs
        if (resp.ok && event.request.method === "GET") {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
        }
        return resp;
      });
    })
  );
});
