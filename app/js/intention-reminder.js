// The intention reminder (the Owner, 4 Nov 2026: "Intention Demo: Reminder text for all MSA, Build it"; PCF MSA J05, demo
// https://claude.ai/artifact/G7k9K3vfpFdWWPU5z5L3tZ tab 1). QR Lead build.
//
// One line above the āyāt: one of FOUR intentions, a different one each day, closed with one tap on "Bismillah". It is never a
// slice of the wheel, a status or a count. Each person chooses how often: every time / once a day (the default) / off.
//
// SHARED ON PURPOSE, "for all MSA": the "closed today" mark is ONE key for the whole app, not one per module, so closing the
// line in Quran Study the same day means Hadith or Dua study does not show it again. Any module places it by calling
// intentionCardHtml() + wireIntention() above its own content (the Hadith and Dua Leads and the MSA Architect decide where).
//
// PURE except for localStorage, wrapped in try/catch (it can throw in a private window): the setting and the closed day live on THIS
// device only. Nothing is written to Firestore, so no Rules are involved; nothing runs at start-up (I9). Every text is language-keyed (I11).
// After "Rasulullah" the blessing is always written in full (the Owner's saw128).

export const INTENTION_MODES = Object.freeze(["every", "daily", "off"]);
export const DEFAULT_INTENTION_MODE = "daily";

const SAW_EN = "Sallallahu A'laihi Wa Sallam";
export const INTENTIONS = Object.freeze([
  { en: "This Qur'an was revealed to me, for me. What is its instruction for me today?",
    bn: "এই কুরআন আমার জন্যই নাযিল হয়েছে, আমার জন্য। আজ এতে আমার জন্য কী নির্দেশ আছে?" },
  { en: `Imagine being present in the time of Rasulullah ${SAW_EN}, hearing it as it came down. What would I do with it?`,
    bn: "কল্পনা করি, রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়া সাল্লামের যুগে আমি উপস্থিত, নাযিল হওয়ার সময়ই শুনছি। আমি এটি নিয়ে কী করতাম?" },
  { en: "Find the instruction for me in what I read, and carry it out today.",
    bn: "যা পড়ি তাতে আমার জন্য নির্দেশ খুঁজে নিই, এবং আজই তা পালন করি।" },
  { en: "Ya Allah, guide me to what saves me from the grave, Qiyāmah and Jahannam, and make my way to Jannah easy.",
    bn: "ইয়া আল্লাহ, আমাকে সেই পথ দেখান যা আমাকে কবর, কিয়ামত ও জাহান্নাম থেকে বাঁচায়, এবং জান্নাতের পথ আমার জন্য সহজ করে দিন।" },
]);
export const INTENTION_LABELS = Object.freeze({
  title: { en: "Your intention today", bn: "আজকের আপনার নিয়ত" },
  bismillah: { en: "Bismillah", bn: "বিসমিল্লাহ" },
  setting: { en: "Intention reminder", bn: "নিয়তের স্মরণ" },
  every: { en: "Every time", bn: "প্রতিবার" },
  daily: { en: "Once a day", bn: "দিনে একবার" },
  off: { en: "Off", bn: "বন্ধ" },
});
const L = (k, lang) => INTENTION_LABELS[k][lang === "bn" ? "bn" : "en"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The reader's local calendar day as "YYYY-MM-DD". */
export function localDay(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
/** Which of the four intentions a local day carries: 0..3, one after another, a different one each day. */
export function intentionIndexFor(day) {
  const [y, m, d] = String(day).split("-").map(Number);
  const days = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return ((days % INTENTIONS.length) + INTENTIONS.length) % INTENTIONS.length;
}
export function intentionText(index, lang = "en") {
  const i = INTENTIONS[index];
  return i ? (lang === "bn" ? i.bn : i.en) : "";
}
export const isIntentionMode = (m) => INTENTION_MODES.includes(m);

/**
 * Whether the line shows now. `mode` every: until closed in THIS opening; daily: until closed today (`closedDay` === `today`);
 * off: never. `closedThisOpening` is the in-page flag for "every".
 */
export function shouldShowIntention({ mode, closedDay = null, today, closedThisOpening = false } = {}) {
  if (mode === "off") return false;
  if (mode === "every") return !closedThisOpening;
  return closedDay !== today; // daily, and any unknown mode falls back to the default
}

const KEY_MODE = (person) => `mmsa-intention-mode:${person || "-"}`;
const KEY_CLOSED = (person) => `mmsa-intention-closed:${person || "-"}`; // ONE key for every module: closed once, closed for all MSA today
export function getIntentionMode(person) {
  try { const m = localStorage.getItem(KEY_MODE(person)); return isIntentionMode(m) ? m : DEFAULT_INTENTION_MODE; } catch { return DEFAULT_INTENTION_MODE; }
}
export function setIntentionMode(person, mode) {
  if (!isIntentionMode(mode)) return false;
  try { localStorage.setItem(KEY_MODE(person), mode); return true; } catch { return false; }
}
export function getClosedDay(person) { try { return localStorage.getItem(KEY_CLOSED(person)); } catch { return null; } }
export function markClosedToday(person, day = localDay()) { try { localStorage.setItem(KEY_CLOSED(person), day); return true; } catch { return false; } }

/** The card: the day's intention, in `lang`, and one Bismillah button. */
export function intentionCardHtml({ lang = "en", day = localDay() } = {}) {
  return `<div class="intention-card" data-intention-card data-intention-index="${intentionIndexFor(day)}" role="region" aria-label="${esc(L("title", lang))}">`
    + `<div class="intention-lab">${esc(L("title", lang))}</div>`
    + `<p class="intention-text">${esc(intentionText(intentionIndexFor(day), lang))}</p>`
    + `<button type="button" class="intention-bismillah" data-intention-bismillah>${esc(L("bismillah", lang))}</button></div>`;
}
/** Wire the Bismillah button inside `root`: `onClose()` once it is tapped. */
export function wireIntention(root, onClose) {
  root?.querySelector?.("[data-intention-bismillah]")?.addEventListener("click", () => onClose?.());
}
/** The setting: three buttons, the chosen one pressed. */
export function intentionSettingHtml({ mode = DEFAULT_INTENTION_MODE, lang = "en" } = {}) {
  return `<div class="intention-setting" data-intention-setting role="group" aria-label="${esc(L("setting", lang))}">`
    + `<span class="intention-setting-label">${esc(L("setting", lang))}</span>`
    + INTENTION_MODES.map((m) => `<button type="button" class="intention-mode-btn" data-intention-mode="${m}" aria-pressed="${m === mode}">${esc(L(m, lang))}</button>`).join("")
    + `</div>`;
}
export const INTENTION_CSS = `
.intention-card { margin:.6rem 0; padding:.7rem .85rem; border:1px solid #e3bc6a; border-radius:10px; background:#1c2440; color:#ece9df; }
.intention-lab { font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; color:#e3bc6a; font-weight:600; }
.intention-text { margin:.35rem 0 .6rem; font-size:1rem; line-height:1.5; overflow-wrap:anywhere; }
.intention-bismillah { min-height:44px; padding:0 1.1rem; border:0; border-radius:8px; background:#e3bc6a; color:#1d1a10; font:inherit; font-weight:600; cursor:pointer; }
.intention-setting { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; margin:.5rem 0; }
.intention-setting-label { font-size:.85rem; margin-inline-end:.3rem; }
.intention-mode-btn { min-height:40px; padding:0 .8rem; border-radius:999px; border:1.5px solid currentColor; background:transparent; color:inherit; font:inherit; font-size:.88rem; cursor:pointer; }
.intention-mode-btn[aria-pressed="true"] { background:#0e5a5a; color:#fff; border-color:#0e5a5a; }
`;
