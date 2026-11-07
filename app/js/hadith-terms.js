/**
 * The Hadith Study translation-terms fold (the Owner's rule of 8 Nov 2026, docs/governance/hadith-translation-terms-rule.md):
 *   Rabb stays Rabb (never "Lord"); Allah stays Allah (never "God", only ilah may be "God");
 *   our Prophet is written Rasulullah Sallallahu A'laihi Wa Sallam.
 * A DISPLAY-TIME fold over a sourced English text: the data is never edited and the reader can switch the fold off ("as sourced").
 * Each change is made only where the hadith's own ARABIC says what the rule needs, so a word is never changed by guess:
 *   Lord   -> Rabb     when the Arabic has رب (ربه, ربي, ربك, ربنا, رب العالمين…)
 *   God    -> Allah    unless it stands for an ilah ("no god", "any other god"): that "God" is kept
 *   the Prophet / Prophet / (the) Messenger of Allah / Allah's Messenger, with or without a "(may Allah's peace and
 *   blessings be upon him)" after it -> Rasulullah Sallallahu A'laihi Wa Sallam, when the Arabic has النبي / نبي / رسول الله
 *   ("O Messenger of Allah", a call to him, becomes "O Rasulullah")
 *   and the word is not "a prophet", "the Prophets" or a named other prophet ("the Prophet Musa").
 * Pure: no DOM, no network.
 */
import { normaliseArabic } from "./hadith-words.js";

export const RASULULLAH = "Rasulullah Sallallahu A'laihi Wa Sallam";

const PEACE = "(?:\\s*\\((?=[^)]{0,100}peace)[^)]{0,100}\\)|,\\s*may Allah['’]s peace and blessings? be upon him)?"; // any short parenthetical about peace: the source spells it many ways (typos, hidden marks)
// "the Prophet", "Prophet", "the Messenger of Allah", "Messenger of Allah", "Allah's Messenger": never "a Prophet", "Prophets",
// "O Prophet" (a Qur'an address inside a quoted āyah, left as the translation has it), "Prophet Musa" (another prophet by name). Prophet Muhammad is left as written (a name, not the bare title).
const PROPHET_RE = new RegExp(`(?<![Aa] )(?<!\\bO )\\b(?:[Tt]he )?(?:Prophet|Messenger of Allah|Allah['’]s Messenger)(?![a-z])(?!\\s+(?:[A-Z][a-z]+))${PEACE}`, "g");

/** What the hadith's Arabic permits. */
export function arabicFacts(arabic) {
  const a = normaliseArabic(arabic ?? "");
  return { rabb: /رب/.test(a), prophet: /النبي|نبي|رسول الله|رسول/.test(a) };
}

/**
 * Folds one English text. `arabic` is the same hadith's Arabic. Returns the folded text and what it changed and left,
 * so a check can count every "Lord" and "God" that is left on a card against the Arabic.
 */
export function foldTerms(english, arabic) {
  const src = String(english ?? "");
  const f = arabicFacts(arabic);
  const did = { rabb: 0, allah: 0, rasulullah: 0 }, left = { lord: 0, god: 0 };
  let out = src.replace(/\bLord\b/g, (m) => { if (f.rabb) { did.rabb++; return "Rabb"; } left.lord++; return m; });
  out = out.replace(/\bGod\b(?!s)/g, (m, off, whole) => {
    const before = whole.slice(Math.max(0, off - 14), off);
    if (/\b(no|any|another|other|false|a)\s+$/i.test(before)) { left.god++; return m; } // an ilah ("there is no God but You"): "God" is allowed
    did.allah++; return "Allah";
  });
  // Addressing him ("O Messenger of Allah", the Companions' call) is written "O Rasulullah", as a Muslim says it; the full
  // formula is for naming him. (Flagged to the Owner: say if the full formula is wanted here too.)
  out = out.replace(/\bO (?:Messenger of Allah|Prophet of Allah)\b/g, (m) => { if (f.prophet) { did.rasulullah++; return "O Rasulullah"; } return m; });
  out = out.replace(PROPHET_RE, (m) => { if (f.prophet) { did.rasulullah++; return RASULULLAH; } return m; });
  return { text: out, did, left };
}

/** Just the folded text. */
export const foldedText = (english, arabic) => foldTerms(english, arabic).text;
