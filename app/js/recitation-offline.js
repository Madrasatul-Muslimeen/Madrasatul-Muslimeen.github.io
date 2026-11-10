// PCF MSA J120 O6 (the Owner's answer G, 10 Nov 2026): recitation audio can be saved for offline ONE SŪRAH AT A TIME; the
// reader chooses which sūrahs, for one reciter (about 1 MB per minute of recitation).
//
// Where the audio goes: the worker's own cache mm-audio-v1, NEVER versioned by the app release (so a release does not
// empty it; sw.js's activate cleanup only touches another mm-audio- name, i.e. a future format bump). The worker answers
// archive.org recitation requests from it when they are saved (sw.js handleRecitationAudio), including the Range requests
// an <audio> element makes to seek.
//
// How a file is stored: fetched with CORS, read to a Blob, and put as a plain 200 Response with its own content-type and
// length. An opaque (no-CORS) response is REFUSED: it cannot be read, sized or sliced for a Range request, so it would not
// play or seek offline. If the audio host does not answer CORS the reader is told in words (I15), and nothing is claimed
// as saved.
//
// What is "saved": a sūrah is listed as saved only when EVERY one of its files is in the cache (per-āyah reciters: one
// file per āyah; whole-sūrah reciters: one file). A save that stops part-way keeps the files it got (a retry skips them)
// but does not list the sūrah.
import { RECITERS } from "./audio-player.js";
import { t, num } from "./i18n.js";

export const RECITATION_CACHE = "mm-audio-v1";
export const SAVED_KEY = "mmsa.recitationSaved.v1";
const HOST_PREFIX = "https://archive.org/download/";
const CONCURRENCY = 3;
const MB_PER_MINUTE = 1; // the Owner's figure, for the "about" text before anything is downloaded

/** The files one sūrah needs for one reciter, or null when this reciter's audio cannot be saved here. */
export function recitationUrls(reciterId, surah, ayahCount) {
  const r = RECITERS[reciterId];
  if (!r) return null;
  let urls = [];
  if (typeof r.perAyahUrl === "function") {
    for (let a = 1; a <= ayahCount; a++) urls.push(r.perAyahUrl(surah, a));
  } else if (typeof r.surahUrl === "function") {
    const u = r.surahUrl(surah);
    if (u) urls.push(u);
  }
  urls = urls.filter(Boolean);
  if (!urls.length || !urls.every((u) => u.startsWith(HOST_PREFIX))) return null;
  return urls;
}

function readSaved() {
  try { const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function writeSaved(v) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(v)); } catch { /* private window: it is just not remembered */ } }

/** { [surahNumber]: { bytes, at } } for one reciter. */
export function savedFor(reciterId) { return readSaved()[reciterId] ?? {}; }
export function isSaved(reciterId, surah) { return !!savedFor(reciterId)[surah]; }

/** "about 7 MB" before downloading: the Owner's "about 1 MB per minute", from the sūrah's length in āyāt (~ 20 s each). */
export function estimateBytes(ayahCount) { return Math.round(ayahCount * (20 / 60) * MB_PER_MINUTE * 1048576); }
export function mbText(bytes) { return t("{n} MB", { n: num((bytes / 1048576).toFixed(1)) }); }

function failure(detail) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const e = new Error(offline ? t("Saving recitation needs the internet.") : t("Could not save this recitation: {detail}.", { detail }));
  e.reported = true;
  return e;
}

/** Save one sūrah. onProgress(done, total) after each file. Resolves with the bytes now held for it. */
export async function saveRecitation({ reciterId, surah, ayahCount, onProgress = () => {}, fetchFn = (...a) => fetch(...a), cacheStorage = typeof caches !== "undefined" ? caches : null }) {
  const urls = recitationUrls(reciterId, surah, ayahCount);
  if (!urls) throw failure(t("this reciter's audio cannot be saved"));
  if (!cacheStorage) throw failure(t("this browser cannot keep files for offline"));
  const cache = await cacheStorage.open(RECITATION_CACHE);
  let done = 0, bytes = 0, next = 0, firstError = null;
  onProgress(0, urls.length);
  async function one(url) {
    const had = await cache.match(url);
    if (had) { bytes += Number(had.headers.get("content-length")) || (await had.clone().blob()).size; return; }
    let res;
    try { res = await fetchFn(url, { mode: "cors", credentials: "omit" }); } catch (e) { throw failure(t("the audio server did not answer or does not allow saving")); }
    if (!res || res.type === "opaque" || !res.ok) throw failure(res && res.ok === false ? t("the audio server answered {status}", { status: num(res.status) }) : t("the audio server does not allow saving"));
    const blob = await res.blob();
    await cache.put(url, new Response(blob, { status: 200, headers: { "content-type": res.headers.get("content-type") || "audio/mpeg", "content-length": String(blob.size) } }));
    bytes += blob.size;
  }
  async function worker() {
    while (!firstError && next < urls.length) {
      const url = urls[next++];
      try { await one(url); done++; onProgress(done, urls.length); } catch (e) { firstError = firstError || e; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  if (firstError) throw firstError;
  const all = readSaved();
  all[reciterId] = { ...(all[reciterId] ?? {}), [surah]: { bytes, at: Date.now() } };
  writeSaved(all);
  tellWorker();
  return bytes;
}

/** The worker serves only files it knows are saved (app/sw.js savedAudio): tell it the set changed. Best effort. */
function tellWorker() {
  try { navigator.serviceWorker?.controller?.postMessage({ type: "audio-saved-changed" }); } catch { /* no worker: nothing to tell */ }
}

/** Take one sūrah's files out again. */
export async function removeRecitation({ reciterId, surah, ayahCount, cacheStorage = typeof caches !== "undefined" ? caches : null }) {
  const urls = recitationUrls(reciterId, surah, ayahCount) ?? [];
  const all = readSaved();
  if (all[reciterId]) { delete all[reciterId][surah]; writeSaved(all); }
  if (!cacheStorage) return;
  const cache = await cacheStorage.open(RECITATION_CACHE);
  await Promise.all(urls.map((u) => cache.delete(u)));
  tellWorker();
}
