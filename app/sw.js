// The app's own on-device cache (load speed, issue #272, 25 Sep 2026).
//
// A second open of any /app/ page should load every static file from the
// phone, never the network. app/js/sw-register.js is the page-side half --
// whether to register this at all, and the "Updated -- tap to reload"
// notice; this file is the worker itself: what gets cached, and how an
// update to a new APP_VERSION replaces it without ever silently swapping
// code out from under a reader mid-session.
//
// Registered as a MODULE worker ({ type: "module" }, in sw-register.js) so
// this can import APP_VERSION directly -- one source of truth for the cache
// name, the same rule version.js's own header already states for every
// other place that shows the version.
import { APP_VERSION } from "./js/version.js";

const CACHE_NAME = `mm-app-${APP_VERSION}`;

// This worker's own registration scope is /app/ (registered from
// /app/sw.js, and GitHub Pages sends no Service-Worker-Allowed header to
// widen it), so it only ever controls pages under /app/ -- /legacy/ and
// /legacy-v07/ are structurally outside its reach. But once a page it
// controls fetches something, the fetch handler below sees EVERY request
// that page makes, wherever the URL points -- scope limits which pages are
// controlled, not which of their requests can be seen. So the path check
// here is a second, explicit line of defence, in case this file is ever
// moved or the archives ever move under /app/.
const CACHEABLE_PATH_PREFIXES = [
  "/app/",
  // The Qur'an data this app reads at study time (surah text, indexes, word
  // data) is same-origin but lives outside /app/ -- see quran-data.js's own
  // BASE_URL comment for why. Everything the Mushaf itself needs (its JSON,
  // its fonts) is fetched from raw.githubusercontent.com instead, which the
  // origin check below already excludes -- "off-site" per the issue, and
  // this worker never touches it.
  "/tools/quran-data-pull/output/",
];

function isCacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/legacy/") || url.pathname.startsWith("/legacy-v07/")) return false;
  if (!CACHEABLE_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) return false;
  // Firestore/Firebase traffic never reaches this worker at all (it goes to
  // www.gstatic.com / firestore.googleapis.com / *.googleapis.com, all a
  // different origin, already refused above) -- this extension allow-list
  // is the second guard the issue asks for: static files only, HTML, JS,
  // CSS, fonts and the Quran data's own JSON, never a document a reader's
  // own actions changed.
  return /\.(?:html|js|mjs|css|json|woff2?|ttf|otf|png|jpe?g|svg|webp)$/i.test(url.pathname);
}

self.addEventListener("install", () => {
  // Architect review, 25 Sep 2026: NO skipWaiting() here. A new version waits
  // until the reader taps "Updated -- tap to reload" (sw-register.js sends
  // "skipWaiting") or closes every tab of the app. Taking over at once let an
  // already-open page of the OLD version fetch its not-yet-loaded modules
  // from the NEW version -- two versions' files mixed in one page.
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "skipWaiting") {
    self.skipWaiting();
    return;
  }
  // Architect review: the first open of a page happens BEFORE this worker
  // controls it, so nothing that page loaded passed through the fetch handler
  // and the SECOND open still went to the network. The page sends the list of
  // files it has already loaded, and they are cached now, so the second open
  // really is served from the phone.
  if (data.type === "warm" && Array.isArray(data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(data.urls.map(async (u) => {
        try {
          const request = new Request(u);
          if (!isCacheable(request) || await cache.match(request)) return;
          const response = await fetch(request);
          if (response && response.ok) await cache.put(request, response);
        } catch { /* best effort: a file that fails to cache is fetched next time */ }
      }));
    })());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("mm-app-") && n !== CACHE_NAME).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheable(request)) return; // let the browser (and this app's own
  // Firebase/Firestore calls) proceed exactly as if no worker existed.

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      // Stale-while-revalidate: a cache hit answers immediately -- the
      // whole point of a second open costing no round trip -- and a fresh
      // copy is always fetched too, so the NEXT open already has whatever
      // changed. event.waitUntil() keeps this background fetch alive even
      // when `cached` lets respondWith() settle before it finishes.
      const revalidate = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);
      event.waitUntil(revalidate);

      if (cached) return cached;
      const fresh = await revalidate;
      return fresh || Response.error();
    })()
  );
});
