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
  // BASE_URL comment for why. Everything the Mushaf itself needs (its page
  // layout JSON, the surah-header font) is fetched from
  // raw.githubusercontent.com, which the origin check below already
  // excludes -- "off-site" per issue #332, and this worker never touches it.
  // The per-page glyph fonts -- plain and, since issue #332, Tajweed -- are
  // fetched from verses.quran.foundation instead, and issue #335 gives THAT
  // host its own separate handling below (a dedicated cache, opened pages
  // only, weekly-refreshed) rather than joining this same-origin list.
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

// ---------------------------------------------------------------------------
// Quran Foundation Mushaf page fonts, offline (issue #335, a follow-up to
// #332 -- see docs/reports/2026-09-27-tajweed-font-permission.md's own
// "Update, 27 Sep 2026": the Owner holds a Quran Foundation Developer
// Console account, so keeping these files on the phone is now permitted, on
// two conditions the code below exists to satisfy -- never offered
// separately, and refreshed at least weekly.
//
// A DIFFERENT cache from CACHE_NAME, deliberately: that cache is versioned by
// APP_VERSION and its old generation is deleted every time the app updates
// (the "activate" handler below), which is correct for app files but would
// throw away a multi-megabyte font over a version bump that touched nothing
// about the Mushaf at all. This cache's own name is versioned separately, so
// it is untouched by an app update and only cleared if THIS format changes.
//
// Nothing here is pre-downloaded (I9) -- a page number's font is fetched (and
// so cached) only the first time a reader actually opens that page with that
// style (plain or Tajweed) on screen; hifz-renderer.js is what decides when
// to ask for one, this worker only ever answers a request that was made.
const QF_FONT_CACHE_NAME = "mm-qf-fonts-v1";
const QF_FONT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const QF_FONT_ORIGIN = "https://verses.quran.foundation";
// Exactly the two paths hifz-renderer.js's own MUSHAF_FONT_BASE/
// TAJWEED_FONT_BASE constants fetch from -- kept as a literal list rather
// than importing those constants, because this worker must not depend on the
// app's own JS graph (I2's "modules never call each other" applies to this
// file too: a worker is its own thing, not a third module of the page it
// serves). Nothing else on this host is ever matched, so nothing else is
// ever stored, whatever else this host happens to serve.
const QF_FONT_PATH_PREFIXES = [
  "/fonts/quran/hafs/v2/woff2/",
  "/fonts/quran/hafs/v4/colrv1/woff2/",
];
const QF_CACHED_AT_HEADER = "x-mm-cached-at";

function isQuranFoundationFont(request) {
  if (request.method !== "GET") return false;
  let url;
  try { url = new URL(request.url); } catch { return false; }
  if (url.origin !== QF_FONT_ORIGIN) return false;
  return QF_FONT_PATH_PREFIXES.some((p) => url.pathname.startsWith(p));
}

function cachedAtMs(response) {
  const raw = response.headers.get(QF_CACHED_AT_HEADER);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

// The Cache API stores a Response as given -- it carries no "when was this
// put here" of its own, so the storage time is stamped as a response header
// instead (readable back by cachedAtMs() above). A 206 (partial content) is
// still `.ok`, and Chrome refuses to store one via cache.put() at all -- so
// only a genuine whole-file 200 is ever kept, exactly the shape every font
// request here actually returns.
async function stampAndStore(cache, request, response) {
  if (!response || response.status !== 200) return;
  const headers = new Headers(response.headers);
  headers.set(QF_CACHED_AT_HEADER, String(Date.now()));
  const body = await response.arrayBuffer();
  await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
}

// Cache-first, refresh-if-stale: a kept copy answers immediately, whatever
// its age, because "when the network fails, serve the kept copy" (the
// issue's own rule) has to hold even for a copy that is overdue for a
// refresh. Staleness only decides whether a background re-fetch also
// happens, via event.waitUntil() so it can finish after respondWith()
// settles -- the same shape the app-file handler below already uses.
async function handleQuranFoundationFont(event) {
  const { request } = event;
  const cache = await caches.open(QF_FONT_CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    if (Date.now() - cachedAtMs(cached) > QF_FONT_MAX_AGE_MS) {
      event.waitUntil(
        fetch(request).then((response) => stampAndStore(cache, request, response)).catch(() => null)
      );
    }
    return cached;
  }

  // Never opened before: nothing to serve from the cache, so this one genuine
  // network fetch decides both the response AND whether anything is kept.
  // AWAITED rather than fired via waitUntil -- respondWith()'s own promise
  // (this function) already keeps the worker alive until it settles, and
  // awaiting means a request for the SAME font a moment later reliably sees
  // it already in the cache, rather than racing this write.
  try {
    const response = await fetch(request);
    if (response && response.ok) await stampAndStore(cache, request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
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
        names
          .filter((n) =>
            (n.startsWith("mm-app-") && n !== CACHE_NAME) ||
            // The font cache is versioned separately from CACHE_NAME
            // precisely so an ordinary app update does NOT reach this
            // filter (see the cache's own comment above) -- this only
            // fires if the font-cache format itself is ever bumped to a
            // new "mm-qf-fonts-vN" name, the one case it should still be
            // cleaned up rather than left to grow forever.
            (n.startsWith("mm-qf-fonts-") && n !== QF_FONT_CACHE_NAME)
          )
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (isQuranFoundationFont(request)) {
    event.respondWith(handleQuranFoundationFont(event));
    return;
  }

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
