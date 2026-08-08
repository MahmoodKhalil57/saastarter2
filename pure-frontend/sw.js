/* Minimal MPA service worker: network-first everything, cache fallback —
   no precache list to maintain because there are no hashed assets. */
const CACHE = "pure-v1";
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.ok && new URL(event.request.url).origin === location.origin) {
          (await caches.open(CACHE)).put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) ?? Response.error()),
  );
});
