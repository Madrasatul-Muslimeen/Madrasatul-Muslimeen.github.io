// J108 (v13.01, the Owner: "Q2:A. Q3. Build it.") -- an Āyah or a Hadith INSIDE a Note's body.
//
// STORAGE (the Architect's decision, 31 Oct 2026): a block is `div[data-mmsa-ref]` in the Note's existing `bodyHtml`,
// exactly the spreadsheet pattern (`div[data-sheet]`, note-sheet-engine.js). No new Firestore field, no Rules change:
// the Note's text already carries it, so the ordinary autosave stores it and every reader of the Note shows it.
//
// The state is the ONLY thing kept. note-sanitize.js lets `data-mmsa-ref` past DOMPurify, then strips the element's
// attributes and REBUILDS it whole from cleanRefState(): so no markup somebody put inside a block can ever survive,
// and a state that is not exactly one of these shapes removes the block.
//
//   { kind: "ayah" | "hadith", id: <permanent unit key>, label, text: { ar, en, bn }, flags: { on, ar, en, bn } }
//
// `flags.on` is the show/hide switch; `flags.ar|en|bn` each language's own button. Pure: no DOM, no i18n, no
// Firebase -- testable in plain Node (tools/i18n-verify/note-ref-block.mjs).

export const REF_KINDS = Object.freeze(["ayah", "hadith"]);
/** The permanent unit key a block may name: an āyah (study-note-binding.js's own shape), or a hadith. */
export const REF_ID_SHAPES = Object.freeze({
  ayah: /^ayah:\d{1,3}:\d{1,3}$/,
  hadith: /^hadith:[A-Za-z0-9_-]{1,40}:\d{1,6}$/,
});
export const REF_LANGS = Object.freeze(["ar", "en", "bn"]);
export const REF_LABEL_MAX = 160, REF_TEXT_MAX = 6000;

/** Plain text: no markup characters, no control characters, no script-ish scheme, whitespace folded, length-capped. */
export function refPlainText(s, max) {
  return String(s ?? "")
    .replace(/[<>\u0000-\u001f\u007f]/g, " ")
    .replace(/(?:javascript|vbscript|data)\s*:/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** The strict schema every stored state passes through. Takes a JSON string or an object; returns a clean state or null. */
export function cleanRefState(raw) {
  let s = raw;
  if (typeof s === "string") {
    if (s.length > 4 * (REF_TEXT_MAX * 3 + REF_LABEL_MAX) + 2000) return null;
    try { s = JSON.parse(s); } catch { return null; }
  }
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const kind = s.kind;
  if (!REF_KINDS.includes(kind)) return null;
  const id = typeof s.id === "string" ? s.id : "";
  if (!REF_ID_SHAPES[kind].test(id)) return null;
  const label = refPlainText(s.label, REF_LABEL_MAX);
  if (!label) return null;
  const textIn = s.text && typeof s.text === "object" && !Array.isArray(s.text) ? s.text : {};
  const text = {};
  for (const k of REF_LANGS) text[k] = refPlainText(textIn[k], REF_TEXT_MAX);
  if (!REF_LANGS.some((k) => text[k])) return null; // a block with no text at all is nothing
  const f = s.flags && typeof s.flags === "object" && !Array.isArray(s.flags) ? s.flags : {};
  // Anything but an explicit `false` is shown: a block arrives open, with every language it has.
  const flags = { on: f.on !== false };
  for (const k of REF_LANGS) flags[k] = f[k] !== false;
  return { kind, id, label, text, flags };
}

/** The attribute value: the cleaned state as JSON, with `<` and `>` escaped (as serializeSheetState). */
export function serializeRefState(state) {
  const s = cleanRefState(state);
  return s ? JSON.stringify(s).replace(/</g, "\\u003c").replace(/>/g, "\\u003e") : "";
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const REF_LANG_TAGS = Object.freeze({ ar: "عربي", en: "EN", bn: "বাং" });

/** What a block shows when nobody has mounted its controls (every reader of the Note; the saved form). Escaped text only. */
export function refStaticHtml(state) {
  const s = cleanRefState(state);
  if (!s) return "";
  const icon = s.kind === "ayah" ? "📖" : "📜";
  let html = `<div class="mm-ref-head"><span class="mm-ref-icon" aria-hidden="true">${icon}</span> <b class="mm-ref-label">${esc(s.label)}</b>${s.flags.on ? "" : ` <span class="mm-ref-closed">▸</span>`}</div>`;
  if (!s.flags.on) return html;
  if (s.flags.ar && s.text.ar) html += `<p class="mm-ref-ar" lang="ar" dir="rtl">${esc(s.text.ar)}</p>`;
  for (const k of ["en", "bn"]) if (s.flags[k] && s.text[k]) html += `<p class="mm-ref-tr" lang="${k}"><span class="mm-ref-tag">${REF_LANG_TAGS[k]}</span> ${esc(s.text[k])}</p>`;
  return html;
}

/** The whole block, as the editor inserts it (the sanitiser would rebuild it to exactly this). */
export function refBlockHtml(state) {
  const s = cleanRefState(state);
  if (!s) return "";
  return `<div class="mm-ref" contenteditable="false" data-mmsa-ref="${esc(serializeRefState(s))}">${refStaticHtml(s)}</div>`;
}

/** A new state with one flag changed ("on", "ar", "en" or "bn"); showing a language also opens a closed block. */
export function toggleRefFlag(state, flag) {
  const s = cleanRefState(state);
  if (!s || !["on", ...REF_LANGS].includes(flag)) return s;
  const flags = { ...s.flags, [flag]: !s.flags[flag] };
  if (flag !== "on" && flags[flag]) flags.on = true;
  return cleanRefState({ ...s, flags });
}
