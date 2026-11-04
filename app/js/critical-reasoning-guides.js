// The Critical Reasoning guides' text and the Note's question card (the Owner, 4 Nov 2026, PCF MSA J05: "T15: A, Go with the question. I will edit
// later. Question Card: Keep it on/off option with toggle, will edit it Approach by approach later."). QR Lead build, tab 3 of the demo
// https://claude.ai/artifact/G7k9K3vfpFdWWPU5z5L3tZ.
//
// DATA + PURE. Everything the Owner will edit later is a plain table here, keyed by Approach number, one line per question, so editing
// "Approach by Approach" is editing one entry. Nothing is read or written at start-up (I9) and nothing goes to Firestore: the toggle is
// per person on this device (like the intention reminder's setting).
//
// T15 = A: the six gaps of docs/reports/2026-10-09-quran-critical-reasoning-ten-steps-and-qr-levels.html are in the text where that report
// says each fits: A (context) at 15 Primary; B (the Qur'an on the whole subject) and C (the Sunnah, before any scholar) at 21 Advanced; E (a
// check on one's own bias) at 21 and 27. D (a hadith's grade) is Hadith's step 0 and F (the tools of ruling) belongs to Approaches 24 to 26:
// neither is a Quran Study guide, so neither is here (named in the PR for the Architect and the Hadith Lead).
// After "Rasulullah" the blessing is written in full (saw128).

const SAW = "Sallallahu A'laihi Wa Sallam";

/** The proposed what / how / measure for the five Approaches (today's text is in catalogue-data.js; the Architect applies these there). */
export const GUIDE_TEXT = Object.freeze({
  14: { what: "Noticing what the āyah says before interpreting it: what kind of āyah it is, and what it is about.",
    how: `Read it slowly. Name its type: a command, a prohibition, a warning, a recommended or not-recommended thing, or a description; if it is a dua, a request or praise and thanks. Then name its subject (Allah, Rasulullah ${SAW}, the Qur'an, the Prophets, the angels, Qiyāmah, Jannah, Jahannam, the human being, shaiṭān, the kuffār, the believers) and what is said about it, and to whom.`,
    measure: "Whether I can name the āyah's type, its subject, what is said about it and to whom." },
  15: { what: "Asking what is in the āyah for me, after reading the āyah in its passage.",
    how: "First read the passage around the āyah and know why it came down (asbāb al-nuzūl): an āyah taken out of its passage can be bent to almost any meaning. Then ask. Direct: what I must obey or not do, a limit I keep within, a warning to be careful of, what I try my best to do. Indirect: the qualities of the people of Jannah I must gain (the mufliḥūn, the muḥsinūn) and of the people of Jahannam I must avoid. If there is nothing to do, what certain knowledge does it give me?",
    measure: "Whether I can say in one line what the āyah asks of me, or what it tells me for certain, in light of its passage." },
  20: { what: "Looking for the inner meaning, and for the rhetorical meaning that comes from the language.",
    how: "Sit with the āyah. Ask what lies behind the words, and what the language is doing: the word chosen, its order, a repetition, a question.",
    measure: "Whether a real reflection has been recorded, not a restatement." },
  21: { what: "Finding a pattern: reading what is not stated from what is, with everything the Qur'an and the Sunnah say on the subject.",
    how: "First gather every āyah on the same subject (Related āyāt and the QCR collections help): one āyah often explains, limits or completes another. Then the authentic Sunnah on it, before any scholar's opinion; if it is a hadith, check its grade first. Take a pattern you can already see and look for the unknown one it points to. Look for symmetry, or its absence, in number, order or wording. At the end ask: what would show that my understanding is wrong? Am I reading what it says, or what I want it to say? Separate what is certain from what is only probable, and end with “Allah knows best”.",
    measure: "Whether a pattern or a connection has been found, from all the āyāt on the subject and the authentic Sunnah, and whether I have tested my own reading." },
  27: { what: "Discussing my understanding with others, accommodating their opinions, and guarding against arrogance.",
    how: "Share what I understood and why. Listen to each person's view and weigh it. Say where I may be wrong, and what would show that I am: am I reading what it says, or what I want it to say?",
    measure: "Whether I took part, and whether anyone's view changed or confirmed mine." },
});

/** The question card's questions per Approach number. The Owner edits these Approach by Approach. */
export const QUESTIONS = Object.freeze({
  14: [
    { id: "q14-type", en: "Type of āyah?", bn: "আয়াতের ধরন কী?" },
    { id: "q14-subject", en: "Subject?", bn: "বিষয় কী?" },
    { id: "q14-said", en: "What is said about it?", bn: "এ সম্পর্কে কী বলা হয়েছে?" },
    { id: "q14-to", en: "To whom?", bn: "কাকে বলা হয়েছে?" },
  ],
  15: [
    { id: "q15-passage", en: "What is the passage around it, and why did it come down?", bn: "এর আশপাশের অংশ কী, এবং এটি কেন নাযিল হয়েছিল?" },
    { id: "q15-do", en: "What must I do or not do?", bn: "আমাকে কী করতে বা না করতে হবে?" },
    { id: "q15-limit", en: "A limit or a warning?", bn: "কোনো সীমা বা সতর্কতা আছে কি?" },
    { id: "q15-quality", en: "Whose quality should I gain or avoid?", bn: "কার গুণ আমি অর্জন বা বর্জন করব?" },
    { id: "q15-certain", en: "What certain knowledge is here?", bn: "এখানে নিশ্চিত জ্ঞান কী?" },
  ],
  20: [
    { id: "q20-inner", en: "The inner meaning?", bn: "ভেতরের অর্থ কী?" },
    { id: "q20-language", en: "What does the language do here?", bn: "এখানে ভাষা কী করছে?" },
  ],
  21: [
    { id: "q21-all", en: "What else does the Qur'an say on this subject?", bn: "এ বিষয়ে কুরআন আর কী বলে?" },
    { id: "q21-sunnah", en: "What does the authentic Sunnah say on it?", bn: "এ বিষয়ে সহীহ সুন্নাহ কী বলে?" },
    { id: "q21-known", en: "A known pattern?", bn: "পরিচিত কোনো নকশা?" },
    { id: "q21-unknown", en: "The unknown pattern it points to?", bn: "যে অজানা নকশার দিকে এটি ইঙ্গিত করে?" },
    { id: "q21-symmetry", en: "Symmetry or its absence?", bn: "সামঞ্জস্য বা তার অভাব?" },
    { id: "q21-wrong", en: "What would show that my understanding is wrong? Am I reading what it says, or what I want it to say?", bn: "কী দেখালে বোঝা যাবে আমার বোঝা ভুল? আমি কি যা বলা হয়েছে তা পড়ছি, নাকি যা শুনতে চাই তা?" },
  ],
  27: [
    { id: "q27-shared", en: "What did I share?", bn: "আমি কী শেয়ার করলাম?" },
    { id: "q27-accommodated", en: "Whose view did I accommodate?", bn: "কার মত আমি গ্রহণ করলাম?" },
    { id: "q27-wrong", en: "Where might I be wrong?", bn: "আমি কোথায় ভুল হতে পারি?" },
  ],
});

/** "approach_14" (or 14) -> 14; null when it is no Approach id. */
export function approachNumberOf(approach) {
  if (Number.isInteger(approach)) return approach;
  const m = /^approach_(\d{1,2})$/.exec(String(approach ?? ""));
  return m ? Number(m[1]) : null;
}
export const questionsFor = (approach) => QUESTIONS[approachNumberOf(approach)] ?? [];

export const QUESTION_CARD_DEFAULT = "on";
const KEY = (person) => `mmsa-question-card:${person || "-"}`;
/** The reader's toggle: "on" (the default) or "off". Per person, on this device; storage that throws gives the default. */
export function getQuestionCardMode(person) {
  try { const m = localStorage.getItem(KEY(person)); return m === "off" || m === "on" ? m : QUESTION_CARD_DEFAULT; } catch { return QUESTION_CARD_DEFAULT; }
}
export function setQuestionCardMode(person, mode) {
  if (mode !== "on" && mode !== "off") return false;
  try { localStorage.setItem(KEY(person), mode); return true; } catch { return false; }
}

const LABELS = { toggle: { en: "Question card on Notes", bn: "নোটে প্রশ্নের কার্ড" }, on: { en: "On", bn: "চালু" }, off: { en: "Off", bn: "বন্ধ" } };
const L = (k, lang) => LABELS[k][lang === "bn" ? "bn" : "en"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The card: that Approach's questions as buttons; "" when the toggle is off or the Approach has none. */
export function questionCardHtml({ approach, lang = "en", mode = QUESTION_CARD_DEFAULT } = {}) {
  const qs = mode === "off" ? [] : questionsFor(approach);
  if (!qs.length) return "";
  return `<div class="question-card" data-question-card role="group" aria-label="${esc(L("toggle", lang))}">`
    + qs.map((q) => `<button type="button" class="question-card-btn" data-question-id="${q.id}">${esc(lang === "bn" ? q.bn : q.en)}</button>`).join("") + `</div>`;
}
/** Tapping a question gives its text for the Note: `onPick(text, id)`. The Note adds it as a heading to answer under. */
export function wireQuestionCard(root, { approach, lang = "en", onPick } = {}) {
  root?.querySelectorAll?.("[data-question-id]").forEach((b) => b.addEventListener("click", () => {
    const q = questionsFor(approach).find((x) => x.id === b.dataset.questionId);
    if (q) onPick?.(lang === "bn" ? q.bn : q.en, q.id);
  }));
}
/** The toggle for Study options. */
export function questionCardSettingHtml({ mode = QUESTION_CARD_DEFAULT, lang = "en" } = {}) {
  return `<div class="intention-setting" data-question-card-setting role="group" aria-label="${esc(L("toggle", lang))}"><span class="intention-setting-label">${esc(L("toggle", lang))}</span>`
    + ["on", "off"].map((m) => `<button type="button" class="intention-mode-btn" data-question-card-mode="${m}" aria-pressed="${m === mode}">${esc(L(m, lang))}</button>`).join("") + `</div>`;
}
export const QUESTION_CARD_CSS = `
.question-card { display:flex; flex-wrap:wrap; gap:.35rem; margin:0 0 .6rem; }
.question-card-btn { min-height:40px; padding:.2rem .8rem; border-radius:999px; border:1px solid #e3bc6a; background:transparent; color:#e3bc6a; font:inherit; font-size:.85rem; font-weight:600; cursor:pointer; text-align:start; max-width:100%; }
`;
