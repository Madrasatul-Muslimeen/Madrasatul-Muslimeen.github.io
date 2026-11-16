/**
 * PCF MSA J106 (the Owner, 16 Nov 2026, n106j 2.A: "make it editable by me (admin)"): the Know Your Status Bangla words the
 * madrasah's owner or a prime may correct. The pure half: no Firebase, no DOM.
 *
 * The 40 English sources below are exactly the `// ? (Know Your Status)` lines of app/js/i18n/bn.js (a check binds the two
 * both ways). A correction lives in the same hadithNames/{tenantId} document as the book names, under its own key family
 * `kys__<slug of the English source>`, as { bn, en: "", status }; "Restore the built-in Bangla" RETIRES it (I4, nothing is
 * removed). The Rules need no change: `names` takes any key matching ^[A-Za-z0-9_-]{1,160}$ (hadith-names-model.js).
 */
export const KYS_WORDS = Object.freeze([
  "Know Your Status ›",
  "My status",
  "Memorised",
  "Revising",
  "Need to memorise",
  "Bookmarked only",
  "To memorise",
  "Study status of this hadith",
  "Sign in and choose who you're studying as to mark a hadith.",
  "You can view this, but only the person's own record can be marked.",
  "Saved on its bookmark as {name}.",
  "Status cleared. The bookmark stays.",
  "The status could not be saved. Check the connection and try again.",
  "Sign in and choose who you're studying as to see your status.",
  "Group the wheel by",
  "By Book",
  "By Topic",
  "All books",
  "All topics",
  "Book, then Chapters",
  "Topic, then Books",
  "Progress wheel",
  "{n} percent done",
  "{a} of {b}",
  "done",
  "Not marked",
  "not marked",
  "Counts as done",
  "{a} of {b} done ({p}%). {m} marked in some way.",
  "Tap a segment or a row. The centre shows the share done: {a} of {b} hadith ({m} are marked in some way).",
  "Open chapters ›",
  "Open books ›",
  "Chapter {n}",
  "No hadith are filed under a topic yet.",
  "Showing all {n} chapters.",
  "Showing the {a} of {b} chapters you have marked.",
  "Showing the first {a} of {b} chapters. Mark a hadith to see its chapter here.",
  "Show only marked chapters",
  "Show all chapters",
  "Back to Hadith {n}",
]);

const PH_RE = /\{[a-z]+\}/g;

/** The key a source string is stored under: kys__ + its words (case kept, "Not marked" and "not marked" are two), any other run of characters as one "_". */
export function kysKey(en) {
  const slug = String(en).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "x";
  return `kys__${slug}`;
}

/** The {placeholders} a string carries, sorted, each once (e.g. ["{a}", "{b}"]). */
export function placeholdersOf(text) {
  return [...new Set(String(text).match(PH_RE) ?? [])].sort();
}

/**
 * Is `bn` a safe replacement for the source `en`? A correction must keep every {placeholder} (the app fills them after it
 * translates) and must not invent one; otherwise a reader would see a raw "{n}" or a number would go missing.
 * Returns null when fine, else "empty" | "placeholders".
 */
export function checkKysBn(en, bn) {
  const text = String(bn ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "empty";
  return JSON.stringify(placeholdersOf(text)) === JSON.stringify(placeholdersOf(en)) ? null : "placeholders";
}

/** The madrasah's active correction for `en` in `lang`, or null (only Bangla is ever corrected; a retired one does not count). */
export function kysOverride(names, en, lang) {
  if (lang !== "bn") return null;
  const e = names?.[kysKey(en)];
  return e && e.status !== "retired" && e.bn ? e.bn : null;
}

/** t() with the madrasah's correction first: `baseT` is the app's own translate function. */
export function kysTranslate(names, lang, baseT, en, vars) {
  const own = kysOverride(names, en, lang);
  if (own === null || !KYS_SET.has(en)) return baseT(en, vars);
  let out = own;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
const KYS_SET = new Set(KYS_WORDS);
