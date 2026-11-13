// MSA · QR J136 (PCF MSA J136, the Owner's "Approved with recommended", 10 Nov 2026) -- "Mark the Word": how hard a word was.
//
// ONE set of five marks on the Word card, in this order (the Owner's demo "Mark the Word"):
//   Already Known   a RESULT    effort "known"
//   Difficult       an assessment, the existing saved key `hard`   (counts as "Hard" until a result is chosen)
//   Learn           act on, the existing saved key `practice`
//   Learned Easy    a RESULT    the existing saved key `done`, and effort "easy"
//   Very Hard       a RESULT    effort "very", and the key `hard` is switched on with it
// A result REPLACES another result. Four degrees are counted: Already Known · Learned Easy · Hard · Very Hard.
//
// WHAT IS STORED. Difficult, Learn and Learned Easy are the marks already saved in `ayahKeyMarks.entries` (their ids are
// permanent, I5; marks saved before this round keep their meaning: an old "Learned" counts as Learned Easy, an old
// "Difficult" as Hard). Only "Already Known" and "Very Hard" need the new optional `effort` map, which the published
// Rules do not allow yet (docs/proposals/word-effort.candidate.rules is the CANDIDATE; the Owner publishes it).
// THE OWNER PUBLISHED THE RULES (11 Nov 2026, in the QR Lead 46L's chat: "Rules Published"), so `WORD_EFFORT_RULES_PUBLISHED` is
// now true and firestore.rules is the published text (docs/proposals/word-effort.DEPLOYMENT-candidate.rules). Had it stayed
// false, those two buttons would be shown, tap, and SAY IN WORDS that they cannot be saved yet -- nothing written, nothing
// failing silently (I15); that refusal path stays in the data layer for the day the flag is ever false again.
//
// PURE: no imports, no reads, no writes. Everything that needs the page (saving, painting) takes these functions' output.

/** TRUE since the Owner published docs/proposals/word-effort.DEPLOYMENT-candidate.rules in Firebase (an Owner Control Gate, passed 11 Nov 2026). */
export const WORD_EFFORT_RULES_PUBLISHED = true;

/** The three effort words a document may hold (the Rules cannot check them: the client does, here). "hard" is never stored: it is the key `hard`. */
export const EFFORT_STORED = Object.freeze(["known", "easy", "little", "very"]);

/** The four degrees that are counted, in the order a table lists them. Names are language-keyed (I11). */
export const EFFORT_DEGREES = Object.freeze([
  { id: "known", names: { en: "Already Known", bn: "আগে থেকেই জানা" }, colour: "known" },
  { id: "easy", names: { en: "Learned Easy", bn: "সহজে শেখা" }, colour: "easy" },
  { id: "little", names: { en: "Little Difficult", bn: "একটু কঠিন" }, colour: "little" },
  { id: "hard", names: { en: "Hard", bn: "কঠিন" }, colour: "hard" },
  { id: "very", names: { en: "Very Hard", bn: "খুব কঠিন" }, colour: "very" },
]);

/** The five buttons of the Word card, in order. `kind` tells the tap what it means. */
export const WORD_MARKS = Object.freeze([
  // The Owner, 13 Nov 2026 (a phone screenshot, "Mark chips order"): Already Known, Learned Easy, Little Difficult, Difficult, Very Hard, Learn. Three to a line on a phone,
  // so the first line is the three easy-to-hard results and the second is Difficult, Very Hard and Learn.
  { id: "known", kind: "result", names: { en: "Already Known", bn: "আগে থেকেই জানা" }, sub: { en: "result", bn: "ফলাফল" } },
  { id: "easy", kind: "result", names: { en: "Learned Easy", bn: "সহজে শেখা" }, sub: { en: "result", bn: "ফলাফল" } },
  // The Owner, 12 Nov 2026 ("Place another level before Difficult, 'Little Difficult'"): a RESULT between Learned Easy and Hard, effort "little".
  { id: "little", kind: "result", names: { en: "Little Difficult", bn: "একটু কঠিন" }, sub: { en: "result", bn: "ফলাফল" } },
  { id: "difficult", kind: "assessment", names: { en: "Difficult", bn: "কঠিন" }, sub: { en: "counts as Hard", bn: "কঠিন হিসেবে গণ্য" } },
  { id: "very", kind: "result", names: { en: "Very Hard", bn: "খুব কঠিন" }, sub: { en: "result", bn: "ফলাফল" } },
  { id: "learn", kind: "act", names: { en: "Learn", bn: "শিখুন" }, sub: { en: "act on", bn: "শেখার জন্য" } },
]);

const SAVED_KEY = Object.freeze({ difficult: "hard", learn: "practice", easy: "done" });

export const isEffortWord = (w) => EFFORT_STORED.includes(w);
export const degreeName = (id, lang = "en") => { const d = EFFORT_DEGREES.find((x) => x.id === id); return d ? (d.names[lang] || d.names.en) : null; };

const listOf = (keys) => (Array.isArray(keys) ? keys : []);

/**
 * The degree a word counts as, from its saved keys and its effort word (or null: not counted yet).
 * A stored result wins; otherwise Learned Easy (`done`) is "easy" and Difficult (`hard`) is "hard".
 * An effort word with no matching key still counts (the document is the Owner's record, not a guess).
 */
export function degreeOf(keys, effort) {
  const k = listOf(keys);
  if (effort === "known" || effort === "very" || effort === "easy" || effort === "little") return effort;
  if (k.includes("done")) return "easy";
  if (k.includes("hard")) return "hard";
  return null;
}

/** Which of the five buttons are pressed: { known, difficult, learn, easy, very } as booleans. */
export function pressedMarks(keys, effort) {
  const k = listOf(keys);
  const deg = degreeOf(k, effort);
  return {
    known: deg === "known",
    difficult: k.includes("hard") && deg !== "very",
    learn: k.includes("practice"),
    easy: deg === "easy",
    little: deg === "little",
    very: deg === "very",
  };
}

/**
 * What a tap on `markId` does to a word whose saved keys are `keys` and effort word `effort`.
 * Returns { keys, effort } -- the whole next state (`effort` null = none) -- and `needsRules` = true when the new state
 * needs the effort field that the published Rules do not allow yet.
 *   known / easy / very: choosing the pressed result again clears it; a different result replaces it.
 *   known and easy switch Difficult off; very switches it on (Very Hard is hard).
 *   difficult / learn: switch their own key, nothing else.
 */
export function tapMark(keys, effort, markId) {
  let k = listOf(keys).filter((x) => typeof x === "string");
  let e = isEffortWord(effort) ? effort : null;
  const add = (id) => { if (!k.includes(id)) k = [...k, id]; };
  const drop = (id) => { k = k.filter((x) => x !== id); };
  if (markId === "difficult" || markId === "learn") {
    const id = SAVED_KEY[markId];
    if (k.includes(id)) drop(id); else add(id);
    // a stored "very" is Hard-by-key plus the effort word; switching Difficult off ends it
    if (markId === "difficult" && e === "very" && !k.includes("hard")) e = null;
    return { keys: k, effort: e, needsRules: false };
  }
  if (!["known", "easy", "little", "very"].includes(markId)) throw new Error(`word-effort: unknown mark ${markId}`);
  const already = degreeOf(k, e) === markId;
  // clearing / replacing a result removes what the previous result put in place
  drop("done");
  if (e === "very" || markId === "very") drop("hard");
  if (already) { e = null; return { keys: k, effort: e, needsRules: false }; }
  if (markId === "known") { drop("hard"); e = "known"; }
  if (markId === "little") { drop("hard"); e = "little"; }
  if (markId === "easy") { drop("hard"); add("done"); e = "easy"; }
  if (markId === "very") { add("hard"); e = "very"; }
  // "easy" is carried by the saved key `done` alone until the Rules are published, so it never needs them
  return { keys: k, effort: e, needsRules: e === "known" || e === "little" || e === "very" };
}

/** Tally the four degrees over `unitKeys`: { known, easy, hard, very, total } from `entries` (key -> ids) and `effort` (key -> word). */
export function tallyDegrees(unitKeys, entries, effort) {
  const out = { known: 0, easy: 0, little: 0, hard: 0, very: 0, total: unitKeys.length };
  for (const u of unitKeys) {
    const d = degreeOf(entries?.[u], effort?.[u]);
    if (d) out[d]++;
  }
  return out;
}

/** Percent of `total` with two decimals ("0.00" for an empty total), never NaN. */
export function percentOf(count, total) {
  return total > 0 ? ((count / total) * 100).toFixed(2) : "0.00";
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The five-button row of the Word card. `heading` labels the group; `busy`/`disabled` lock it while a save runs or for a viewer; `note` is a plain-words line shown under the buttons (for example why a mark cannot be saved yet); `detailsHtml` is the table block. */
export function wordMarksRowHtml({ unitKey, keys = [], effort = null, lang = "en", heading = "", busy = false, disabled = false, note = "", detailsHtml = "" } = {}) {
  const on = pressedMarks(keys, effort);
  const buttons = WORD_MARKS.map((m) =>
    `<button type="button" class="we-btn we-${m.id}" data-word-mark="${m.id}" aria-pressed="${on[m.id]}"${disabled || busy ? " disabled" : ""}>`
    + `<span class="we-name">${esc(m.names[lang] || m.names.en)}</span><small class="we-sub">${esc(m.sub[lang] || m.sub.en)}</small></button>`).join("");
  const deg = degreeOf(keys, effort);
  const counted = deg ? `<p class="we-counts" data-word-effort-counts>${esc(degreeName(deg, lang))}</p>` : "";
  const noteHtml = note ? `<p class="we-note" role="status" data-word-effort-note>${esc(note)}</p>` : "";
  return `<div class="we-row" data-word-marks-row data-marks-unit="${esc(unitKey)}" role="group" aria-label="${esc(heading || "Mark the word")}">`
    + `${heading ? `<span class="we-label">${esc(heading)}</span>` : ""}<div class="we-buttons">${buttons}</div>${counted}${noteHtml}${detailsHtml}</div>`;
}

/** Delegated wiring: `onTap(unitKey, markId)` on a tap of an enabled button of a rendered row. */
export function wireWordMarksRow(root, onTap) {
  root?.querySelectorAll?.("[data-word-marks-row]").forEach((row) => {
    row.addEventListener("click", (e) => {
      const b = e.target.closest?.("[data-word-mark]");
      if (!b || b.disabled) return;
      e.stopPropagation();
      onTap?.(row.dataset.marksUnit, b.dataset.wordMark);
    });
  });
}

/** The "How hard was it" table for a set of words: header, four degree rows with count and %, and the "of N words" line. */
export function effortTableHtml(tally, { lang = "en", scopeLabel = "", countLabel = "Count", degreeLabel = "Degree", ofWords = "of {n} words" } = {}) {
  const rows = EFFORT_DEGREES.map((d) => {
    const c = tally[d.id] ?? 0;
    const p = percentOf(c, tally.total);
    return `<tr data-effort-row="${d.id}"><td><i class="we-swatch we-swatch-${d.colour}"></i>${esc(d.names[lang] || d.names.en)}</td><td class="n">${c.toLocaleString("en")}</td><td class="n">${p}%</td></tr>`;
  }).join("");
  return `<table class="we-table" data-word-effort-table>${scopeLabel ? `<caption>${esc(scopeLabel)}</caption>` : ""}`
    + `<thead><tr><th>${esc(degreeLabel)}</th><th class="n">${esc(countLabel)}</th><th class="n">%</th></tr></thead><tbody>${rows}`
    + `<tr><td colspan="3" class="we-of">${esc(String(ofWords).replace("{n}", tally.total.toLocaleString("en")))}</td></tr></tbody></table>`;
}

/**
 * CSS for the row and the table. The colours are the demo's (hard red, learn amber, known blue, easy green, very purple), one
 * palette per card look: light tones on the Night card, deep tones on the Light card (a palette belongs to a SURFACE).
 */
export const WORD_EFFORT_CSS = `
.we-row { --we-known:#6aa8e8; --we-little:#d6d36a; --we-hard:#f89480; --we-learn:#e5b04a; --we-easy:#58c08c; --we-very:#b48be6; --we-on:#0e1630; margin:.4rem 0; }
[data-card-look="light"] .we-row { --we-known:#1f5f9f; --we-little:#6b6a10; --we-hard:#b3321d; --we-learn:#7a5410; --we-easy:#1b6f45; --we-very:#5a2c94; --we-on:#ffffff; }
.we-label { display:block; font-size:.82rem; margin-bottom:.25rem; opacity:.85; }
.we-buttons { display:grid; grid-template-columns:repeat(auto-fit,minmax(104px,1fr)); gap:.4rem; }
.we-row .we-btn { min-height:44px; min-width:0; border-radius:9px; border:1.5px solid currentColor; background:transparent; font:inherit; font-size:.85rem; font-weight:600; cursor:pointer; padding:.25rem .4rem; line-height:1.2; overflow-wrap:anywhere; color:var(--we-c); }
.we-row .we-btn:disabled { opacity:.55; cursor:default; }
.we-sub { display:block; font-weight:500; font-size:.68rem; opacity:.9; }
.we-row .we-known { --we-c:var(--we-known); } .we-row .we-difficult { --we-c:var(--we-hard); } .we-row .we-learn { --we-c:var(--we-learn); }
.we-row .we-easy { --we-c:var(--we-easy); } .we-row .we-little { --we-c:var(--we-little); } .we-row .we-very { --we-c:var(--we-very); }
.we-row .we-btn[aria-pressed="true"] { background:var(--we-c); color:var(--we-on); border-color:var(--we-c); }
.we-counts { margin:.3rem 0 0; font-size:.78rem; }
.we-note { margin:.35rem 0 0; font-size:.82rem; color:var(--we-learn); font-weight:600; }
.we-details summary { cursor:pointer; list-style:none; font-size:.9rem; font-weight:600; padding:.3rem 0; }
.we-details summary::-webkit-details-marker { display:none; }
.we-details summary::before { content:"\\25B8\\00A0"; } .we-details[open] summary::before { content:"\\25BE\\00A0"; }
.we-table { width:100%; border-collapse:collapse; font-size:.88rem; font-variant-numeric:tabular-nums; margin:.4rem 0; }
.we-table caption { text-align:start; font-weight:700; padding-bottom:.25rem; }
.we-table th, .we-table td { text-align:start; padding:.3rem .4rem; border-bottom:1px solid rgba(143,160,194,.35); }
.we-table .n { text-align:end; } .we-of { opacity:.85; }
.we-swatch { display:inline-block; width:.7rem; height:.7rem; border-radius:3px; margin-inline-end:.4rem; vertical-align:-1px; }
.we-swatch-known { background:var(--we-known,#6aa8e8); } .we-swatch-easy { background:var(--we-easy,#58c08c); } .we-swatch-little { background:var(--we-little,#d6d36a); } .we-swatch-hard { background:var(--we-hard,#f89480); } .we-swatch-very { background:var(--we-very,#b48be6); }
@media (max-width:520px) { .we-buttons { grid-template-columns:repeat(3,minmax(0,1fr)); } .we-row .we-btn { font-size:.8rem; padding:.25rem .25rem; } }
`;
