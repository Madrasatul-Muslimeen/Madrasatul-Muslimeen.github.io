// Link preview cards (Note pane Part C, item 43; Owner decisions 72 and 81).
//
// A preview is SHOWN when a Note is read and is never stored in the Note: no revision, no bodyHtml change, no
// Firestore write. It is OFF by default, per device, kept in localStorage. When it is on, each https link's address is
// sent to Microlink (microlink.io) to fetch the title, description and picture -- a static page cannot fetch other
// websites itself. The answer is UNTRUSTED: this module cleans it to plain text and an https picture address, and the
// caller sets it with textContent. The site name is taken from the link's own host, never from the answer.
// Pure apart from the storage and fetch handed in. I2: imports only the Note sanitiser's link test.

import { isSafeNoteHref } from "./note-sanitize.js";

export const MICROLINK = "https://api.microlink.io/";
export const SETTING_KEY = "mmsa.linkPreviews.v1";
export const CACHE_KEY = "mmsa.linkPreviewCache.v1";
export const LIMITS = { perNote: 5, title: 120, description: 240, imageUrl: 2000, cacheDays: 7, cacheLinks: 200 };
const DAY = 24 * 60 * 60 * 1000;

/** Plain text, whitespace collapsed, control characters dropped, capped. Markup is NOT interpreted: "<b>" stays the characters "<b>". */
export function cleanPlain(v, max) {
  if (typeof v !== "string") return "";
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, " ").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** An https address only, with nothing that could break out of an attribute; else "". */
export function cleanImageUrl(v) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (s.length > LIMITS.imageUrl || !/^https:\/\/[^\s<>"'`\\]+$/i.test(s)) return "";
  try { return new URL(s).protocol === "https:" ? s : ""; } catch { return ""; }
}

/** The link's own host, for the site name ("" when it is not an https address). */
export function hostOf(href) {
  try { const u = new URL(String(href)); return u.protocol === "https:" ? u.hostname.replace(/^www\./i, "") : ""; } catch { return ""; }
}

const shape = (d) => {
  const title = cleanPlain(d?.title, LIMITS.title), description = cleanPlain(d?.description, LIMITS.description);
  return title || description ? { title, description, image: cleanImageUrl(d?.image) } : null;
};

/** Microlink's answer -> { title, description, image } or null when it holds nothing worth a card. Never throws. */
export function cleanPreview(raw) {
  const d = raw && typeof raw === "object" && raw.status === "success" && raw.data && typeof raw.data === "object" ? raw.data : null;
  if (!d) return null;
  return shape({ title: d.title, description: d.description, image: d.image && typeof d.image === "object" ? d.image.url : "" });
}

/** The addresses to preview: https links passing the Note's own link test, in order, once each, at most 5. */
export function pickLinks(hrefs) {
  const out = [];
  for (const h of hrefs) {
    const s = String(h ?? "").trim();
    if (!/^https:\/\//i.test(s) || !isSafeNoteHref(s) || !hostOf(s) || out.includes(s)) continue;
    out.push(s);
    if (out.length >= LIMITS.perNote) break;
  }
  return out;
}

export const isOn = (storage) => { try { return storage.getItem(SETTING_KEY) === "1"; } catch { return false; } };
export function setOn(storage, on) { try { if (on) storage.setItem(SETTING_KEY, "1"); else storage.removeItem(SETTING_KEY); } catch { /* private mode */ } }

function readCache(storage) {
  try { const c = JSON.parse(storage.getItem(CACHE_KEY) || "{}"); return c && typeof c === "object" && !Array.isArray(c) ? c : {}; } catch { return {}; }
}
/** A cached answer younger than 7 days (cleaned again on the way out), or undefined. */
export function cacheGet(storage, url, now = Date.now()) {
  const e = readCache(storage)[url];
  if (!e || typeof e.at !== "number" || now - e.at > LIMITS.cacheDays * DAY) return undefined;
  return shape(e.data) ?? undefined;
}
/** Remember a CLEANED answer; drops the expired, then the oldest beyond 200 links. */
export function cachePut(storage, url, data, now = Date.now()) {
  const c = readCache(storage);
  c[url] = { at: now, data };
  for (const k of Object.keys(c)) if (typeof c[k]?.at !== "number" || now - c[k].at > LIMITS.cacheDays * DAY) delete c[k];
  const keys = Object.keys(c).sort((a, b) => c[a].at - c[b].at);
  for (const k of keys.slice(0, Math.max(0, keys.length - LIMITS.cacheLinks))) delete c[k];
  try { storage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* full or private mode: the card still shows */ }
}

/**
 * Cache first, then Microlink. Resolves { preview } | { empty: true } | { error: "refused" | "network" }.
 * Only an answer is cached, never a failure, so a refusal is retried on the next open.
 */
export async function loadPreview(url, { storage, fetchFn = (...a) => fetch(...a), now = Date.now } = {}) {
  const hit = cacheGet(storage, url, now());
  if (hit) return { preview: hit };
  let res;
  try { res = await fetchFn(`${MICROLINK}?url=${encodeURIComponent(url)}`, { referrerPolicy: "no-referrer" }); } catch { return { error: "network" }; }
  if (!res || !res.ok) return { error: "refused" };
  let json;
  try { json = await res.json(); } catch { return { error: "refused" }; }
  const preview = cleanPreview(json);
  if (!preview) return { empty: true };
  cachePut(storage, url, preview, now());
  return { preview };
}
