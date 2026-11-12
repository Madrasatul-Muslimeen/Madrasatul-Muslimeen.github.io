// Printed Mushaf pages kept in the app (the Owner, 11 Nov 2026, "1A": the reader chooses what to keep; nothing is saved
// unless the reader presses Save; never precached). Stage 3 of docs/reports/2026-11-11-printed-mushaf-plan.md.
//
// Where the pictures go: the worker's own cache mm-printed-v1, NEVER versioned by the app release (a release does not
// empty it; sw.js's activate cleanup only touches another mm-printed- name, i.e. a future format bump). The worker answers
// a request for a printed-page picture from it when that page is kept (sw.js handlePrintedPage); a page that is not kept
// goes to the network exactly as before, and the worker still refuses to keep any picture on its own (PRINTED-EXCLUDED).
//
// How a page is stored: fetched with CORS (GitHub Pages answers access-control-allow-origin: *, measured 11 Nov 2026
// against the real MSA address, which is what matters for QR, where the pictures are cross-origin), read to a Blob and
// put as a plain 200 Response. An opaque (no-CORS) answer is REFUSED: it cannot be sized or checked, so it would be
// claimed as saved without being known to be a picture. A failure is said in words (I15), and nothing is claimed.
//
// What is "kept": a page is kept when it is IN the cache. A scope (a sūrah, a juz', the whole Mushaf) is "all kept" only
// when every one of its pages is. A save that stops part-way keeps the pages it got (a retry skips them) and says how
// many. The sizes are remembered in localStorage (page -> bytes) and reconciled with the cache itself every time, so a
// browser that cleared the cache never leaves a page listed that is not there.
import { printedPageUrl } from "./mushaf-printed.js";
import { t, num } from "./i18n.js";

export const PRINTED_CACHE = "mm-printed-v1";
export const SIZES_KEY = "mmsa.printedKept.v1";
export const TOTAL_PAGES = 604;
const CONCURRENCY = 4;
// 51 MB for the 604 pictures (measured 11 Nov 2026), so about 88 KB a page: what the reader is shown BEFORE anything is downloaded.
const PAGE_BYTES_ESTIMATE = 88500;

/** The address a page picture is asked for under, which is also its key in the cache. */
export const pageKey = (p) => new URL(printedPageUrl(p), typeof location !== "undefined" ? location.href : "http://localhost/").href;

/** The pages from `first` to `last`, both included. */
export function pageRange(first, last) {
  const out = [];
  for (let p = Math.max(1, first); p <= Math.min(TOTAL_PAGES, last); p++) out.push(p);
  return out;
}
export const estimateBytes = (pageCount) => pageCount * PAGE_BYTES_ESTIMATE;
export function mbText(bytes) { return t("{n} MB", { n: num((bytes / 1048576).toFixed(1)) }); }

function readSizes() {
  try { const v = JSON.parse(localStorage.getItem(SIZES_KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function writeSizes(v) { try { localStorage.setItem(SIZES_KEY, JSON.stringify(v)); } catch { /* private window: sizes are just not remembered */ } }

function failure(detail) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const e = new Error(offline ? t("Keeping pages needs the internet.") : t("Could not keep these pages: {detail}.", { detail }));
  e.reported = true;
  return e;
}

const pageOfKey = (url) => { const m = /\/(\d{3})\.png$/.exec(url); return m ? Number(m[1]) : null; };

/** { [page]: bytes } for every page that is really in the cache (the cache is the truth; sizes are filled in if missing). */
export async function keptPages({ cacheStorage = typeof caches !== "undefined" ? caches : null } = {}) {
  if (!cacheStorage) return {};
  const cache = await cacheStorage.open(PRINTED_CACHE);
  const reqs = await cache.keys();
  const sizes = readSizes();
  const out = {};
  let changed = false;
  for (const r of reqs) {
    const p = pageOfKey(r.url);
    if (p === null) continue;
    if (!(sizes[p] > 0)) { const hit = await cache.match(r); sizes[p] = hit ? (await hit.blob()).size : 0; changed = true; }
    out[p] = sizes[p];
  }
  for (const p of Object.keys(sizes)) if (!(p in out)) { delete sizes[p]; changed = true; }
  if (changed) writeSizes(sizes);
  return out;
}

/** How much of `pages` is kept: { have, total, bytes }. */
export function scopeStatus(pages, kept) {
  let have = 0, bytes = 0;
  for (const p of pages) if (p in kept) { have++; bytes += kept[p]; }
  return { have, total: pages.length, bytes };
}

/** The worker serves only pages it knows are kept: tell it the set changed. Best effort. */
function tellWorker() {
  try { navigator.serviceWorker?.controller?.postMessage({ type: "printed-saved-changed" }); } catch { /* no worker: nothing to tell */ }
}

/** Keep `pages`. onProgress(done, total) after each page. Resolves with { bytes, pages } now held for them. */
export async function savePrintedPages({ pages, onProgress = () => {}, fetchFn = (...a) => fetch(...a), cacheStorage = typeof caches !== "undefined" ? caches : null }) {
  if (!cacheStorage) throw failure(t("this browser cannot keep files for offline"));
  const cache = await cacheStorage.open(PRINTED_CACHE);
  const sizes = readSizes();
  let done = 0, next = 0, firstError = null;
  onProgress(0, pages.length);
  async function one(p) {
    const url = pageKey(p);
    const had = await cache.match(url);
    if (had) { if (!(sizes[p] > 0)) sizes[p] = (await had.clone().blob()).size; return; }
    let res;
    try { res = await fetchFn(url, { mode: "cors", credentials: "omit" }); } catch (e) { throw failure(t("the picture server did not answer or does not allow keeping pages")); }
    if (!res || res.type === "opaque" || !res.ok) throw failure(res && res.ok === false ? t("the picture server answered {status}", { status: num(res.status) }) : t("the picture server does not allow keeping pages"));
    const blob = await res.blob();
    if (!blob.size) throw failure(t("a page came back empty"));
    await cache.put(url, new Response(blob, { status: 200, headers: { "content-type": res.headers.get("content-type") || "image/png", "content-length": String(blob.size) } }));
    sizes[p] = blob.size;
  }
  async function worker() {
    while (!firstError && next < pages.length) {
      const p = pages[next++];
      try { await one(p); done++; onProgress(done, pages.length); } catch (e) { firstError = firstError || e; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker));
  writeSizes(sizes); // what was got is remembered even when a later page failed (a retry skips it)
  tellWorker();
  if (firstError) throw firstError;
  return { pages: pages.length, bytes: pages.reduce((n, p) => n + (sizes[p] || 0), 0) };
}

/** Take `pages` out again. */
export async function removePrintedPages({ pages, cacheStorage = typeof caches !== "undefined" ? caches : null }) {
  const sizes = readSizes();
  for (const p of pages) delete sizes[p];
  writeSizes(sizes);
  if (cacheStorage) {
    const cache = await cacheStorage.open(PRINTED_CACHE);
    await Promise.all(pages.map((p) => cache.delete(pageKey(p))));
  }
  tellWorker();
}
