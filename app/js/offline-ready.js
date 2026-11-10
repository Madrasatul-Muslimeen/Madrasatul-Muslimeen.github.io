// PCF MSA J120 O2: "Get ready for offline", in My account.
//
// One button. One tap asks the browser to keep this app's storage (navigator.storage.persist(), asked HERE and
// never at startup: the load-speed contract keeps the startup path unchanged, I9), then downloads into the
// service worker's OWN caches everything the app needs with no internet:
//   - the app's pages, scripts, styles, fonts and pictures   -> mm-app-<version> (app/sw.js CACHE_NAME)
//   - the Qur'an data (/tools/quran-data-pull/output/)        -> mm-quran-v1      (sw.js handleQuranData: named with no
//                                                                                 version, so a release never empties it)
//   - the Firebase scripts every page imports                 -> mm-ext-v1        (sw.js handleFirebaseSdk)
//   - EVERY Hadith and Dua book                               -> mm-hadith-v1     (sw.js handleHadithData)
//     (the Owner, J120 n120b, 10 Nov 2026: "2.D", all of them, about 220 MB; no per-book choice. Until then the
//     reader ticked books, answer E; the old saved choice, mm_offline_books, is no longer read.)
// Qur'an and Hadith files are stamped x-mm-cached-at exactly as the worker stamps them, so its own age checks read them.
// The list of files and their sizes is app/offline-files.json (tools/offline/build-offline-files.mjs), read when
// My account first opens, never at startup.
//
// WHY THE PAGE DOWNLOADS, NOT THE WORKER: the page can show progress file by file, retry one file, and say in words
// which file failed (I15), with no new message protocol between page and worker; the worker's existing "warm"
// message is fire-and-forget and answers nothing. The caches and their names are the worker's own, so the worker
// serves these files offline exactly as if it had kept them itself. The Mushaf page fonts (mm-qf-fonts-v1) are NOT
// downloaded here: their permission requires a weekly refresh and never offering them as a separate download, so
// they stay fetched page by page, as before. No recitation audio (the Owner's answer on J120).
import { t, num } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { APP_VERSION } from "./version.js";

const LIST_URL = "./offline-files.json";
const READY_KEY = "mm_offline_ready";
const CACHES = { app: `mm-app-${APP_VERSION}`, quran: "mm-quran-v1", hadith: "mm-hadith-v1", ext: "mm-ext-v1" };
const HADITH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // sw.js HADITH_MAX_AGE_MS: an older copy is "stale" and fetched again
const STAMP = "x-mm-cached-at"; // sw.js QF_CACHED_AT_HEADER
const CONCURRENCY = 6;
const STYLE_ID = "offlineReadyStyle";
const CSS = `
.offline-ready { border-top: 1px solid var(--card-line, #ddd); margin: 0.2rem 0 0.9rem; padding-top: 0.7rem; }
.offline-ready h3 { margin: 0 0 0.3rem; font-size: 0.98rem; color: var(--card-heading, #1f3a6e); }
.offline-ready p { margin: 0.3rem 0; font-size: 0.85rem; overflow-wrap: anywhere; }
.offline-ready .offline-muted { color: var(--card-text-muted, #555); }
.offline-ready fieldset { border: 1px solid var(--card-line, #ccc); border-radius: 0.5rem; margin: 0.5rem 0; padding: 0.3rem 0.6rem 0.4rem; min-width: 0; }
.offline-ready legend { font-size: 0.85rem; padding: 0 0.3rem; color: var(--card-text, #222); }
.offline-ready .offline-books { max-height: 15rem; overflow-y: auto; }
.offline-ready ul.offline-books { list-style: none; margin: 0; padding: 0; }
.offline-ready li.offline-book { display: flex; align-items: center; gap: 0.5rem; min-height: 40px; font-size: 0.85rem; color: var(--card-text, #222); }
.offline-ready .offline-book-name { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.offline-ready .offline-book-ar { display: block; text-align: start; font-size: 0.95em; color: var(--card-text-muted, #555); }
.offline-ready .offline-book-size { flex: 0 0 auto; color: var(--card-text-muted, #555); white-space: nowrap; font-variant-numeric: tabular-nums; }
.offline-ready .offline-ready-btn { display: block; width: 100%; min-height: 44px; box-sizing: border-box; margin: 0.5rem 0 0.3rem; padding: 0.5rem 0.8rem;
  font: inherit; font-weight: 600; font-size: 0.95rem; border-radius: 0.5rem; cursor: pointer;
  background: var(--card-button-bg, #1F3A6E); color: var(--card-button-text, #fff); border: 1px solid var(--card-button-border, #1F3A6E); }
.offline-ready .offline-ready-btn:disabled { opacity: 0.6; cursor: default; }
.offline-ready .offline-ready-btn:focus-visible { outline: 2px solid var(--card-link, #1f3a6e); outline-offset: 2px; }
.offline-ready .offline-progress { display: flex; flex-direction: column; gap: 0.25rem; margin: 0.3rem 0; }
.offline-ready .offline-progress[hidden] { display: none; }
.offline-ready progress { width: 100%; height: 12px; accent-color: var(--card-link, #1f3a6e); }
.offline-ready .offline-progress-text { font-size: 0.8rem; color: var(--card-text, #222); font-variant-numeric: tabular-nums; }
.offline-ready .offline-ready-state { font-weight: 600; color: var(--card-text, #222); }
.offline-ready .offline-failed { color: #b3261e; }
[data-card-look="night"] .offline-ready .offline-failed { color: #ffb4ab; }
`;

function el(tag, attrs, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private window: it just isn't remembered */ } },
};
/** "12.3 MB" in the reader's digits. */
export function mbText(bytes) {
  return t("{n} MB", { n: num((bytes / 1048576).toFixed(1)) });
}
/** "9 Nov 2026, 07:30" -- the bookmark menu's and Note pane's format (Bangla digits and a 24-hour clock in Bangla). */
export function whenText(ms) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return getAppLang() === "bn"
    ? new Intl.DateTimeFormat("bn-BD-u-nu-beng", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d)
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}
const filesOf = (dirs, cache) => dirs.flatMap((d) => d.files.map(([name, bytes]) => ({ url: new URL(d.base + name, location.origin).href, bytes, cache })));
const bytesOf = (items) => items.reduce((s, f) => s + f.bytes, 0);

/** The whole download list for these book ids: { items: [{url, bytes, cache}], bytes }. Each URL once.
 *  The section asks for every book (allBookIds); a narrower list is still accepted, for a caller that needs one. */
export function planFor(list, bookIds) {
  const items = [
    ...filesOf(list.parts.app.dirs, list.parts.app.cache),
    ...filesOf(list.parts.quran.dirs, list.parts.quran.cache),
    ...list.parts.sdk.urls.map((url) => ({ url, bytes: 0, cache: list.parts.sdk.cache })),
  ];
  const chosen = list.books.filter((b) => bookIds.includes(b.id));
  if (chosen.length) items.push(...filesOf(list.parts.hadithCommon.dirs, list.parts.hadithCommon.cache));
  for (const b of chosen) items.push(...filesOf(b.dirs, "hadith"));
  const seen = new Set();
  const unique = items.filter((f) => !seen.has(f.url) && seen.add(f.url));
  return { items: unique, bytes: bytesOf(unique) };
}

/** Is this file already kept (and, for Hadith data, kept within the worker's week)? A kept Qur'an file counts as kept
 *  whatever its age: the worker refreshes each one in the background, at most daily, when a reader opens it, so a
 *  second tap never downloads the whole Qur'an again. */
async function isKept(cache, item) {
  const hit = await cache.match(item.url);
  if (!hit) return false;
  if (item.cache !== "hadith") return true;
  const at = Number(hit.headers.get(STAMP));
  return Number.isFinite(at) && Date.now() - at <= HADITH_MAX_AGE_MS;
}

async function fetchAndKeep(cache, item) {
  const crossOrigin = !item.url.startsWith(location.origin);
  const res = await fetch(item.url, crossOrigin ? { mode: "cors", credentials: "omit", cache: "no-cache" } : { cache: "no-cache" });
  if (!res || !res.ok) throw new Error(`HTTP ${res ? res.status : "?"}`);
  if (item.cache === "hadith" || item.cache === "quran") {
    const headers = new Headers(res.headers);
    headers.set(STAMP, String(Date.now()));
    const body = await res.arrayBuffer();
    await cache.put(item.url, new Response(body, { status: res.status, statusText: res.statusText, headers }));
    return body.byteLength;
  }
  const copy = res.clone();
  await cache.put(item.url, res);
  return item.bytes || (await copy.arrayBuffer()).byteLength;
}

/**
 * Downloads what is missing or stale. onProgress({ done, total, bytesDone, bytesTotal }) after each file.
 * Returns { failed: [{url, why}], fetched, kept }. A file that fails is tried once more before it is reported.
 */
export async function getReady(plan, onProgress = () => {}) {
  const opened = {};
  for (const [k, name] of Object.entries(CACHES)) opened[k] = await caches.open(name);
  const total = plan.items.length;
  let done = 0, bytesDone = 0, fetched = 0, kept = 0;
  const failed = [];
  const queue = [...plan.items];
  const tick = () => onProgress({ done, total, bytesDone, bytesTotal: plan.bytes });
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      const cache = opened[item.cache];
      try {
        if (await isKept(cache, item)) { kept++; done++; bytesDone += item.bytes; tick(); continue; }
      } catch { /* treat as missing */ }
      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try { await fetchAndKeep(cache, item); lastErr = null; fetched++; break; } catch (err) { lastErr = err; }
      }
      if (lastErr) failed.push({ url: item.url, why: String(lastErr && lastErr.message || lastErr) });
      done++; bytesDone += item.bytes; tick();
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { failed, fetched, kept };
}

/** Every book the list carries (J120 2 D: all of them). */
export const allBookIds = (list) => list.books.map((b) => b.id);

let listPromise = null;
function loadList() {
  if (!listPromise) {
    listPromise = fetch(LIST_URL).then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .catch((err) => { listPromise = null; throw err; });
  }
  return listPromise;
}

function bookName(b) {
  if (b.id === "dua" || b.id === "hadeethenc") return getAppLang() === "bn" ? b.title.bn : b.title.en;
  return b.title.en;
}

/** Mounts the section into `host` (the My account card). Only on a page carrying MSA's install line: another app
 *  built from this source (QR) has its own worker and file list, so the section stays empty there. */
export function mountOfflineSection(host) {
  if (!host || host.dataset.offlineMounted) return;
  if (!document.querySelector('link[rel="manifest"][href="./manifest.webmanifest"]')) return;
  host.dataset.offlineMounted = "1";
  if (!document.getElementById(STYLE_ID)) {
    const s = el("style", { id: STYLE_ID });
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const box = el("section", { class: "offline-ready", id: "offlineReady", "aria-labelledby": "offlineReadyTitle" });
  box.appendChild(el("h3", { id: "offlineReadyTitle" }, t("Use the app without internet")));
  box.appendChild(el("p", { class: "offline-muted" }, t("Keeps the app, the Qur'an and every Hadith and Dua book on this device, so they open with no internet.")));
  const fs = el("fieldset", { id: "offlineBooks" });
  fs.appendChild(el("legend", {}, t("Hadith and Dua books kept offline (all of them)")));
  const books = el("ul", { class: "offline-books" });
  books.appendChild(el("li", { class: "offline-muted" }, t("Loading the list…")));
  fs.appendChild(books);
  const need = el("p", { id: "offlineNeed" });
  const btn = el("button", { type: "button", class: "offline-ready-btn", id: "offlineReadyBtn", disabled: "" }, t("Get ready for offline"));
  const prog = el("div", { class: "offline-progress", id: "offlineProgress" });
  prog.hidden = true;
  const bar = el("progress", { id: "offlineProgressBar", max: "1", value: "0" });
  const progText = el("span", { class: "offline-progress-text", id: "offlineProgressText", "aria-live": "off" });
  prog.append(bar, progText);
  const state = el("p", { class: "offline-ready-state", id: "offlineReadyState", role: "status", "aria-live": "polite" });
  const space = el("p", { class: "offline-muted", id: "offlineSpace" });
  const failedBox = el("p", { class: "offline-failed", id: "offlineFailed", role: "alert" });
  failedBox.hidden = true;
  box.append(fs, need, btn, prog, state, space, failedBox);
  host.appendChild(box);

  if (!("caches" in window) || !("serviceWorker" in navigator)) {
    books.textContent = "";
    state.textContent = t("This browser cannot keep the app for use without internet.");
    return;
  }
  const ready = store.get(READY_KEY);
  if (ready && ready.at) state.textContent = t("Ready ✓ (updated {when})", { when: whenText(ready.at) });

  let list = null;
  const showNeed = () => { if (list) need.textContent = t("Space it will use: {size}", { size: mbText(planFor(list, allBookIds(list)).bytes) }); };

  loadList().then((data) => {
    list = data;
    books.textContent = "";
    for (const b of list.books) {
      const row = el("li", { class: "offline-book", "data-offline-book": b.id });
      const name = el("span", { class: "offline-book-name" }, bookName(b));
      if (b.title.ar && b.id !== "dua") {
        // The Arabic title on its own line: inline beside the English, the right-to-left run swallowed the separator.
        name.appendChild(el("span", { class: "offline-book-ar", lang: "ar", dir: "rtl" }, b.title.ar));
      }
      row.append(name, el("span", { class: "offline-book-size" }, mbText(bytesOf(filesOf(b.dirs, "hadith")))));
      books.appendChild(row);
    }
    showNeed();
    btn.disabled = false;
  }).catch((err) => {
    // I15: the reader sees why, in words.
    books.textContent = "";
    failedBox.hidden = false;
    failedBox.textContent = t("The list of files to keep could not be loaded ({why}). Check the internet and open My account again.", { why: String(err && err.message || err) });
  });

  btn.addEventListener("click", async () => {
    if (!list) return;
    btn.disabled = true;
    failedBox.hidden = true;
    failedBox.textContent = "";
    space.textContent = "";
    // Asked here, on the reader's tap, never at startup (I9). A browser may say no; the files are still kept,
    // the browser may just clear them first when the device runs short of space.
    let persisted = false;
    try { persisted = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch { persisted = false; }
    const plan = planFor(list, allBookIds(list));
    state.textContent = t("Getting ready…");
    prog.hidden = false;
    bar.max = Math.max(1, plan.bytes);
    let frame = 0, last = null;
    const paint = () => {
      frame = 0;
      if (!last) return;
      bar.value = last.bytesDone;
      progText.textContent = t("{done} of {total} files · {mbDone} of {mbTotal}", { done: num(last.done), total: num(last.total), mbDone: mbText(last.bytesDone), mbTotal: mbText(last.bytesTotal) });
    };
    let result;
    try {
      result = await getReady(plan, (p) => { last = p; if (!frame) frame = requestAnimationFrame(paint); });
    } catch (err) {
      result = { failed: [{ url: "", why: String(err && err.message || err) }], fetched: 0, kept: 0 };
    }
    if (frame) cancelAnimationFrame(frame);
    paint();
    try {
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
      if (est && Number.isFinite(est.usage)) {
        space.textContent = t("This device now keeps {used} for the app ({free} free).", { used: mbText(est.usage), free: mbText(Math.max(0, (est.quota || 0) - est.usage)) })
          + (persisted ? "" : " " + t("The browser may clear it if the device runs short of space."));
      }
    } catch { /* the estimate is a nicety */ }
    if (result.failed.length) {
      const names = result.failed.slice(0, 3).map((f) => decodeURIComponent(f.url.replace(location.origin, "")) + (f.why ? ` (${f.why})` : "")).join("; ");
      state.textContent = t("Not ready yet.");
      failedBox.hidden = false;
      failedBox.textContent = t("{n} file(s) could not be downloaded: {names}. Tap the button again to try them.", { n: num(result.failed.length), names })
        + (result.failed.length > 3 ? " " + t("and {n} more", { n: num(result.failed.length - 3) }) : "");
    } else {
      const at = Date.now();
      store.set(READY_KEY, { at, version: APP_VERSION, books: allBookIds(list) });
      state.textContent = t("Ready ✓ (updated {when})", { when: whenText(at) });
    }
    btn.disabled = false;
  });
}
