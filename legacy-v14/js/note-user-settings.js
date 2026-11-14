// Note pane Part C3 (6 Oct 2026, decisions 72 and 80) -- the note settings that follow the PERSON across devices:
// tab groups (34), templates (36), quick phrases (37), heading styles (40) and folds (45).
//
// Kept in `userPrefs/{uid}`, one field of our own, `mmsaNotes`, always written with { merge: true }. The deployed Rules
// already allow it (`allow read, write: if signedIn() && myUid() == uid`), so there is NO Rules change, and the old app's
// `themeColors` in the same document is never touched. See docs/reports/2026-10-06-part-c3-storage-proposal.md.
//
// This module is PURE: it imports no Firebase and no DOM. Every value is cleaned to a closed form before it is written
// AND again when it is read back, because the document is only as trustworthy as the last device that wrote it. The
// Firestore half (note-user-settings-fs.js) is bound in through `readRemote` / `writeRemote`.
import { sanitizeNoteHtml } from "./note-sanitize.js";

export const SETTINGS_FIELD = "mmsaNotes";
export const LIMITS = Object.freeze({ tabs: 20, tabName: 24, templates: 50, templateTitle: 80, templateBody: 20 * 1024, phrases: 100, phrase: 200, folds: 300, foldSections: 200 });
export const HEADING_LEVELS = Object.freeze([1, 2, 3, 4]);

/** The editor's own fixed palettes (text colours then highlights), lowercase. A colour outside this list never survives. */
export const PALETTE = Object.freeze([
  ["#b3261e", "Red"], ["#1f3a6e", "Navy"], ["#1b6e3c", "Green"], ["#6a3fa0", "Purple"], ["#7a4b00", "Brown"], ["#006a6a", "Teal"],
  ["#fff59d", "Yellow"], ["#c8e6c9", "Light green"], ["#bbdefb", "Light blue"], ["#f8bbd0", "Pink"], ["#e1bee7", "Lavender"], ["#ffe0b2", "Orange"],
]);
const PALETTE_HEX = new Set(PALETTE.map((p) => p[0]));

const SAFE_ID = /^[A-Za-z0-9_-]{1,120}$/;
export const isSafeNoteId = (id) => typeof id === "string" && SAFE_ID.test(id);

/** Plain text only: no markup characters or control characters, collapsed spaces, length-capped. */
export function cleanText(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/\p{Cc}|\p{Zl}|\p{Zp}|[<>]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
export const cleanColour = (v) => { const c = typeof v === "string" ? v.trim().toLowerCase() : ""; return PALETTE_HEX.has(c) ? c : ""; };

export function cleanTabs(list) {
  const out = [], seen = new Set();
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x !== "object" || !isSafeNoteId(x.noteId) || seen.has(x.noteId)) continue;
    seen.add(x.noteId);
    out.push({ noteId: x.noteId, name: cleanText(x.name, LIMITS.tabName), colour: cleanColour(x.colour) });
    if (out.length >= LIMITS.tabs) break;
  }
  return out;
}

/** `sanitize` is injectable so Node can run this with no DOM; the browser passes nothing and gets the Note sanitiser. */
export function cleanTemplates(list, sanitize = sanitizeNoteHtml) {
  const out = [], seen = new Set();
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x !== "object" || !isSafeNoteId(x.id) || seen.has(x.id)) continue;
    let body = "";
    try { body = sanitize(typeof x.bodyHtml === "string" ? x.bodyHtml : ""); } catch { continue; } // an unsanitisable body is dropped, never stored raw
    if (body.length > LIMITS.templateBody) continue;
    seen.add(x.id);
    out.push({ id: x.id, title: cleanText(x.title, LIMITS.templateTitle), bodyHtml: body });
    if (out.length >= LIMITS.templates) break;
  }
  return out;
}

export function cleanPhrases(list) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const p = cleanText(x, LIMITS.phrase);
    if (p) out.push(p);
    if (out.length >= LIMITS.phrases) break;
  }
  return out;
}

export function cleanHeadingStyles(map) {
  const out = {};
  for (const n of HEADING_LEVELS) {
    const s = map && typeof map === "object" ? map[`h${n}`] : null;
    if (!s || typeof s !== "object") continue;
    const border = cleanColour(s.border), bg = cleanColour(s.bg);
    if (border || bg) out[`h${n}`] = { border, bg };
  }
  return out;
}

export function cleanFoldList(list) {
  if (!Array.isArray(list)) return [];
  const s = new Set();
  for (const i of list) if (Number.isInteger(i) && i >= 0 && i < LIMITS.foldSections) s.add(i);
  return [...s].sort((a, b) => a - b);
}
/** Insertion order is age: the oldest entries are the first keys, and the cap keeps the newest 300. */
export function cleanFolds(map) {
  const out = {};
  if (!map || typeof map !== "object") return out;
  for (const [id, list] of Object.entries(map)) {
    if (!isSafeNoteId(id)) continue;
    const l = cleanFoldList(list);
    if (l.length) out[id] = l;
  }
  const keys = Object.keys(out);
  if (keys.length > LIMITS.folds) for (const k of keys.slice(0, keys.length - LIMITS.folds)) delete out[k];
  return out;
}

export function cleanSettings(raw, sanitize = sanitizeNoteHtml) {
  const r = raw && typeof raw === "object" ? raw : {};
  return { tabs: cleanTabs(r.tabs), templates: cleanTemplates(r.templates, sanitize), phrases: cleanPhrases(r.phrases), headingStyles: cleanHeadingStyles(r.headingStyles), folds: cleanFolds(r.folds) };
}
export const emptySettings = () => cleanSettings({});

/** The CSS a person's heading styles make for the reader's own screen. Every value is a palette hex, so nothing else can get in. */
export function headingStyleCss(styles, scope = ".note-pane-body, .pane-edit-body") {
  const parts = [];
  for (const n of HEADING_LEVELS) {
    const s = styles?.[`h${n}`];
    if (!s) continue;
    const border = cleanColour(s.border), bg = cleanColour(s.bg);
    if (!border && !bg) continue;
    const sel = scope.split(",").map((x) => `${x.trim()} h${n}`).join(", ");
    parts.push(`${sel} { ${border ? `border: 2px solid ${border}; border-radius: 6px; ` : ""}${bg ? `background: ${bg}; color: #1c1b1f; ` : ""}padding-inline: 0.5rem; }`);
  }
  return parts.join("\n");
}

const PARTS = ["tabs", "templates", "phrases", "headingStyles"];
/**
 * The store. `readRemote()` -> the raw `mmsaNotes` value or null; `writeRemote(patch)` writes `{ mmsaNotes: patch }` with merge.
 * `deleteMark` is Firestore's deleteField() sentinel for a fold entry that is cleared or pruned.
 * `storage` is a localStorage-like object (the last known copy, so the pane opens offline).
 * The remote is read ONCE, the first time open() is called (when a Note pane first opens -- never at app startup, I9).
 */
export function createSettingsStore({ readRemote, writeRemote, storage = null, uid = "anon", deleteMark = null, sanitize = sanitizeNoteHtml, legacyFolds = () => ({}), onChange = () => {} }) {
  const CACHE = `mmsa.noteSettings.${uid}`, MIGRATED = `mmsa.noteSettingsMigrated.${uid}`;
  const lsGet = (k) => { try { return storage?.getItem(k) ?? null; } catch { return null; } };
  const lsSet = (k, v) => { try { storage?.setItem(k, v); } catch { /* private mode: the copy just isn't kept */ } };
  let state;
  try { state = cleanSettings(JSON.parse(lsGet(CACHE) || "null"), sanitize); } catch { state = emptySettings(); }
  let opened = null, lastError = "";
  const remember = () => lsSet(CACHE, JSON.stringify(state));
  const isEmpty = (k) => JSON.stringify(state[k]) === JSON.stringify(emptySettings()[k]);
  return {
    get: () => state,
    get error() { return lastError; },
    /** The Firestore read, once. Resolves with the settings (the cached copy if the read fails, with `error` set). */
    open() {
      if (opened) return opened;
      opened = (async () => {
        let remote = null;
        try { remote = await readRemote(); } catch (e) { lastError = e?.message || String(e); return state; }
        const r = cleanSettings(remote, sanitize);
        const have = (k) => !!remote && typeof remote === "object" && remote[k] !== undefined;
        // field by field: what the account has wins; a field it lacks keeps this device's copy (and goes up below).
        const merged = { ...r, folds: { ...state.folds, ...r.folds } };
        const up = {};
        for (const k of PARTS) if (!have(k)) { merged[k] = state[k]; if (!isEmpty(k)) up[k] = state[k]; }
        // Once: the folds this browser kept the old way are copied up for Notes the account has none for. The old values are never deleted.
        if (lsGet(MIGRATED) !== "1") {
          const add = {};
          for (const [id, l] of Object.entries(cleanFolds(legacyFolds()))) if (!(id in r.folds) && !(id in merged.folds)) { merged.folds[id] = l; add[id] = l; }
          if (Object.keys(add).length) up.folds = add;
          lsSet(MIGRATED, "1");
        }
        merged.folds = cleanFolds(merged.folds);
        state = merged; remember();
        if (Object.keys(up).length) { try { await writeRemote(up); } catch (e) { lastError = e?.message || String(e); } }
        onChange(state);
        return state;
      })();
      return opened;
    },
    /** Replace one part. Cleans it, keeps it locally at once, then writes ONLY that part. Rejects when the save fails (I15). */
    async set(part, value) {
      if (!PARTS.includes(part)) throw new Error(`Unknown note setting: ${part}`);
      const clean = cleanSettings({ ...state, [part]: value }, sanitize)[part];
      state = { ...state, [part]: clean }; remember(); onChange(state);
      await writeRemote({ [part]: clean });
      return clean;
    },
    /** Folds are per Note: only that Note's entry is written, and only to the account -- never into the Note. */
    async setFold(noteId, list) {
      if (!isSafeNoteId(noteId)) return [];
      const l = cleanFoldList(list);
      const before = Object.keys(state.folds);
      const folds = { ...state.folds }; delete folds[noteId]; // re-adding moves it to the newest end
      if (l.length) folds[noteId] = l;
      state = { ...state, folds: cleanFolds(folds) }; remember();
      const patch = {};
      if (l.length) patch[noteId] = l; else if (deleteMark !== null) patch[noteId] = deleteMark;
      if (deleteMark !== null) for (const id of before) if (id !== noteId && !(id in state.folds)) patch[id] = deleteMark; // pruned beyond 300
      if (Object.keys(patch).length) await writeRemote({ folds: patch });
      return l;
    },
    foldsFor: (noteId) => new Set(state.folds[noteId] ?? []),
  };
}
