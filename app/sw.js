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
// widen it), so it only ever controls pages under /app/ -- /legacy/,
// /legacy-v07/ and /legacy-v08/ are structurally outside its reach. But once a page it
// controls fetches something, the fetch handler below sees EVERY request
// that page makes, wherever the URL points -- scope limits which pages are
// controlled, not which of their requests can be seen. So the path check
// here is a second, explicit line of defence, in case this file is ever
// moved or the archives ever move under /app/.
const CACHEABLE_PATH_PREFIXES = [
  "/app/",
  // The Qur'an data this app reads at study time (surah text, indexes, word
  // data) is same-origin but lives outside /app/ -- see quran-data.js's own
  // BASE_URL comment for why. The Mushaf's own two off-site files (its page
  // layout JSON and the surah-header font, both raw.githubusercontent.com)
  // are refused by the origin check below, same as ever, but ARE now kept:
  // issue #339 gives them their own separate handling further down (a
  // dedicated cache, kept on first use, refreshed at most daily) -- the same
  // shape issue #335 already gave the per-page glyph fonts (plain and,
  // since issue #332, Tajweed) on verses.quran.foundation. Issue #339 also
  // gives the Firebase SDK itself (www.gstatic.com) its own handling the
  // same way. None of the three join this same-origin list, because none of
  // them are same-origin.
  "/tools/quran-data-pull/output/",
];

function isCacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/legacy/") || url.pathname.startsWith("/legacy-v07/") || url.pathname.startsWith("/legacy-v08/")) return false;
  if (!CACHEABLE_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) return false;
  // Firestore's OWN traffic -- every read, write and auth token exchange the
  // SDK makes once it's actually running, all *.googleapis.com -- never
  // reaches this worker's cache: different origin, refused above, exactly as
  // before. The one thing issue #339 changes is the SDK's own STATIC JS
  // FILES (www.gstatic.com/firebasejs/10.12.2/*.js) -- those are kept now,
  // by isFirebaseSdk()/handleFirebaseSdk() below, checked BEFORE this
  // function is ever asked, because without them the page cannot even boot
  // to make a Firestore call in the first place. Nothing else on
  // gstatic.com, and no live Firestore/Auth request of any kind, is ever
  // cached. This extension allow-list is the second guard the issue asks
  // for: static files only, HTML, JS, CSS, fonts and the Quran data's own
  // JSON, never a document a reader's own actions changed.
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
//
// Shared by the Quran Foundation Mushaf page fonts above and, since issue
// #339, the Mushaf's own layout JSON and banner font further down: same
// shape, different cache and a different max age, so it is parameterised
// rather than copied a second time.
async function cacheFirstWithBackgroundRefresh(event, cacheName, maxAgeMs) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    if (Date.now() - cachedAtMs(cached) > maxAgeMs) {
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
  // awaiting means a request for the SAME resource a moment later reliably
  // sees it already in the cache, rather than racing this write.
  try {
    const response = await fetch(request);
    if (response && response.ok) await stampAndStore(cache, request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

function handleQuranFoundationFont(event) {
  return cacheFirstWithBackgroundRefresh(event, QF_FONT_CACHE_NAME, QF_FONT_MAX_AGE_MS);
}

// ---------------------------------------------------------------------------
// The Firebase SDK itself (issue #339): www.gstatic.com/firebasejs/10.12.2/
// *.js, the exact files firebase-init.js and every page's own <script
// type="module"> import at boot. isCacheable() above refuses this origin
// like any other off-site host, and until now that was correct -- but with
// no network those three imports THROW, so the page never boots at all, even
// though every /app/ file it needs is already on the phone. Firebase Auth
// keeps the signed-in user on the device and Firestore's own offline
// persistence is on (D5), so once the SDK itself loads, the app opens and
// shows what it last read.
//
// A THIRD cache, separate from both CACHE_NAME and the QF font cache, for
// the same reason those two are separate from each other: an app update (a
// new CACHE_NAME) must not throw this away, and neither should a future
// change to the QF font cache's own format.
//
// The version is pinned in the URL path itself and this app only ever
// imports that one pinned version, so -- unlike the QF fonts or the Mushaf
// assets below -- there is nothing here to go stale: a kept file is correct
// forever, served straight from the cache with no background re-fetch at
// all. If this app's own pinned Firebase version is ever bumped, the new
// URLs are simply new cache keys; the old entries become harmless dead
// weight rather than needing a migration.
const EXT_SDK_CACHE_NAME = "mm-ext-v1";
const EXT_SDK_ORIGIN = "https://www.gstatic.com";
const EXT_SDK_PATH_PREFIX = "/firebasejs/10.12.2/";

function isFirebaseSdk(request) {
  if (request.method !== "GET") return false;
  let url;
  try { url = new URL(request.url); } catch { return false; }
  if (url.origin !== EXT_SDK_ORIGIN) return false;
  return url.pathname.startsWith(EXT_SDK_PATH_PREFIX);
}

// Cache-first, kept the first time it's actually fetched -- deliberately NOT
// precached at "install" below. This worker's own install pattern has never
// precached anything on a fixed schedule (the app's own files are warmed
// reactively, from what a page tells it AFTER loading -- see the "message"
// handler below); precaching a hardcoded URL list at install would be the
// one exception to that, not a continuation of it. The very first page a
// reader ever opens still needs the network for these three files, exactly
// like it does for every other file this worker keeps -- this worker is not
// even registered yet, let alone controlling that load. Every open after
// that is served from here with no network at all.
async function handleFirebaseSdk(request) {
  const cache = await caches.open(EXT_SDK_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

// ---------------------------------------------------------------------------
// The Mushaf's own layout JSON and banner font (issue #339), both fetched
// from raw.githubusercontent.com by hifz-renderer.js's own MUSHAF_JSON_URL
// and SURAH_HEADER_FONT_URL. Kept as literal URLs here rather than importing
// those constants -- the same reasoning the QF font path-prefix list above
// gives: this worker must not depend on the app's own JS graph (I2 applies
// to this file too, even though it is not itself an app module).
const MUSHAF_CACHE_NAME = "mm-mushaf-v1";
const MUSHAF_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day
const MUSHAF_URLS = new Set([
  "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json",
  "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2",
]);

function isMushafAsset(request) {
  return request.method === "GET" && MUSHAF_URLS.has(request.url);
}

function handleMushafAsset(event) {
  return cacheFirstWithBackgroundRefresh(event, MUSHAF_CACHE_NAME, MUSHAF_MAX_AGE_MS);
}

// The Owner, 6 Oct 2026: "opening of all files, modules takes ages". The
// cause, measured: every release made a new, EMPTY CACHE_NAME and deleted the
// old one on activate, so the first opens after each update (several a day at
// times) downloaded every app file, the Qur'an text, the word indexes (about
// 2 MB for the first Word Card) and the Hadith data again, at the moment the
// reader was waiting for them. Now the new version, while it waits, refreshes
// into its own cache every file the OLD cache held -- only those, never a
// fixed list. Each is a revalidating fetch (cache: "no-cache"), so an
// unchanged file costs a "not modified" answer, and a changed one its new
// copy: the new cache is all of the new version (no mixing), and it is full
// before the reader taps "Updated". Best effort: a file that fails is simply
// fetched when it is next asked for, as before.
const CARRY_CONCURRENCY = 6;
async function carryOverPreviousCache() {
  const names = (await caches.keys()).filter((n) => n.startsWith("mm-app-") && n !== CACHE_NAME);
  if (!names.length) return 0;
  const urls = new Set();
  for (const n of names) for (const req of await (await caches.open(n)).keys()) urls.add(req.url);
  const cache = await caches.open(CACHE_NAME);
  const queue = [...urls];
  let kept = 0;
  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      try {
        const request = new Request(u);
        if (!isCacheable(request) || await cache.match(request)) continue;
        const response = await fetch(request, { cache: "no-cache" });
        if (response && response.ok) { await cache.put(request, response); kept++; }
      } catch { /* best effort */ }
    }
  }
  await Promise.all(Array.from({ length: CARRY_CONCURRENCY }, worker));
  return kept;
}

self.addEventListener("install", (event) => {
  event.waitUntil(carryOverPreviousCache().catch(() => 0));
  // Architect review, 25 Sep 2026: NO skipWaiting() here. A new version waits
  // until the reader taps "Updated -- tap to reload" (sw-register.js sends
  // "skipWaiting") or closes every tab of the app. Taking over at once let an
  // already-open page of the OLD version fetch its not-yet-loaded modules
  // from the NEW version -- two versions' files mixed in one page.
  //
  // Issue #339: the Firebase SDK and the Mushaf's own layout JSON/banner
  // font are deliberately NOT precached here either. This handler only ever
  // decides whether the new worker takes over; every file this worker keeps
  // is kept the first time something actually asks for it -- the app's own
  // files via the page's "warm" message below, the QF fonts/SDK/Mushaf
  // assets straight from the fetch handler that first sees them -- never a
  // fixed list fetched up front on a schedule the reader had no part in.
  // (6 Oct 2026: the one thing install does is carryOverPreviousCache()
  // above -- a refresh of what the reader ALREADY had, not a fixed list.)
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
            (n.startsWith("mm-qf-fonts-") && n !== QF_FONT_CACHE_NAME) ||
            // Issue #339's two new caches, same reasoning as the QF font
            // cache immediately above: each is versioned by its own name,
            // not by CACHE_NAME, so this only fires on a future format bump
            // of one of THESE, never on an ordinary app update.
            (n.startsWith("mm-ext-") && n !== EXT_SDK_CACHE_NAME) ||
            (n.startsWith("mm-mushaf-") && n !== MUSHAF_CACHE_NAME)
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

  // Issue #339: two more off-origin exceptions, the same shape as the QF
  // fonts above -- without them the page cannot even boot offline (the
  // Firebase SDK) or draw the Mushaf offline (its own layout JSON and
  // banner font).
  if (isFirebaseSdk(request)) {
    event.respondWith(handleFirebaseSdk(request));
    return;
  }

  if (isMushafAsset(request)) {
    event.respondWith(handleMushafAsset(event));
    return;
  }

  if (!isCacheable(request)) return; // let the browser (and this app's own
  // Firestore/Auth network calls) proceed exactly as if no worker existed.

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
