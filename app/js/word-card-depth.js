// Word card rebuild, round 4 (decision 59, #511) -- the Arabic in Depth tab:
// a legend and five light accordions, every line carrying where it comes from
// (the data / a grammar rule / a source still needed). Pure: the page fetches,
// this prints. Nothing here is generated: a line is either read off the packaged
// data, derived by a fixed written rule, or says plainly that it needs a source.
//
// Round 5 adds the Verb Conjugation section between Morphology and Naḥw.

import { partName, FORM_NAMES, PERSONS, PGN_ALIASES, personFor, TENSE_NAMES, MOOD_NAMES, VOICE_NAMES, DERIV_NAMES, SOURCE_TAGS, orderDerivedForms, PART_NAMES, RELATION_BN, PHRASE_BN } from "./word-grammar-tables.js";

import { quranWordOccurrenceId } from "./quran-word-identity.js";
import { conjugate, toArabic } from "./verb-conjugation.js";

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Every string this tab prints that is not Arabic (I11). */
const S = {
  secRoot: { en: "Root & Word Family", bn: "মূল ও শব্দ-পরিবার" },
  secSarf: { en: "Morphology (Ṣarf)", bn: "রূপতত্ত্ব (সার্ফ)" },
  secConj: { en: "Verb Conjugation", bn: "ক্রিয়া-রূপান্তর" },
  secNahw: { en: "Grammar in This Āyah (Naḥw)", bn: "এই আয়াতের ব্যাকরণ (নাহু)" },
  secChoice: { en: "Word Choice & Distinctions", bn: "শব্দচয়ন ও পার্থক্য" },
  secClassical: { en: "Classical Arabic Usage", bn: "ধ্রুপদী আরবি ব্যবহার" },
  conjRule: { en: "Form {n} of {root} for every person.", bn: "{root}-এর ফর্ম {n}, সব পুরুষের জন্য।" },
  conjHelp: { en: "Endings in colour; the gold row is the one in this āyah; ✦ = found in the Qur'an.", bn: "শেষাংশ রঙিন; সোনালি সারিটি এই আয়াতের; ✦ = কুরআনে পাওয়া যায়।" },
  conjPast: { en: "Past", bn: "অতীত" },
  conjPresent: { en: "Present", bn: "বর্তমান" },
  conjCommand: { en: "Command", bn: "আদেশ" },
  conjTimes: { en: "✦ in the Qur'an: {n} times", bn: "✦ কুরআনে: {n} বার" },
  conjHere: { en: "In this āyah: {ar} ({mood})", bn: "এই আয়াতে: {ar} ({mood})" },
  conjPassive: { en: "This word is passive; the tables are active.", bn: "এই শব্দটি কর্মবাচ্য; ছকগুলো কর্তৃবাচ্য।" },
  conjUnknownVowel: { en: "The Qur'an does not show this verb's vowel, so this table is not guessed.", bn: "কুরআনে এই ক্রিয়ার স্বরচিহ্ন দেখা যায় না, তাই এই ছকটি অনুমান করা হয়নি।" },
  conjLoading: { en: "Loading the verb's forms…", bn: "ক্রিয়ার রূপগুলো লোড হচ্ছে…" },
  conjFailed: { en: "The verb forms could not be loaded, so no table is shown.", bn: "ক্রিয়ার রূপগুলো লোড করা যায়নি, তাই কোনো ছক দেখানো হচ্ছে না।" },
  conjNotListed: { en: "This verb is not in the packaged verb-forms list, so no table is shown. A form is never guessed.", bn: "এই ক্রিয়াটি প্যাকেজ করা ক্রিয়া-রূপের তালিকায় নেই, তাই কোনো ছক দেখানো হচ্ছে না। কোনো রূপ অনুমান করা হয় না।" },
  conjWeak: { en: "This root has a weak letter (و or ي) or a hamza, so its table needs a source and comes in a later round. A form is never guessed.", bn: "এই মূলে দুর্বল অক্ষর (و বা ي) বা হামযা আছে, তাই এর ছকের জন্য উৎস লাগবে এবং এটি পরের ধাপে আসবে। কোনো রূপ অনুমান করা হয় না।" },
  conjDoubled: { en: "This root's last two letters are the same (a doubled root), so its table needs a source and comes in a later round. A form is never guessed.", bn: "এই মূলের শেষ দুটি অক্ষর একই (দ্বিত্ব মূল), তাই এর ছকের জন্য উৎস লাগবে এবং এটি পরের ধাপে আসবে। কোনো রূপ অনুমান করা হয় না।" },
  conjNotTri: { en: "This root is not three letters, so its table needs a source and comes in a later round. A form is never guessed.", bn: "এই মূল তিন অক্ষরের নয়, তাই এর ছকের জন্য উৎস লাগবে এবং এটি পরের ধাপে আসবে। কোনো রূপ অনুমান করা হয় না।" },
  rootMeans: { en: "The root means {m}", bn: "মূলটির অর্থ {m}" },
  rootCredit: { en: "(Wiktionary, CC BY-SA 4.0, adapted)", bn: "(উইকশনারি, CC BY-SA 4.0, অভিযোজিত)" },
  usedTimes: { en: "It is used {n} times in the Qur'an, in {f} forms.", bn: "কুরআনে এটি {f}টি রূপে {n} বার ব্যবহৃত হয়েছে।" },
  usedTimesNoMeaning: { en: "The root is used {n} times in the Qur'an, in {f} forms.", bn: "মূলটি কুরআনে {f}টি রূপে {n} বার ব্যবহৃত হয়েছে।" },
  inAyah: { en: "In this āyah, {k} words come from this root. Tap one to open it:", bn: "এই আয়াতে {k}টি শব্দ এই মূল থেকে এসেছে। একটিতে ট্যাপ করলে সেটি খুলবে:" },
  openWord: { en: "Open word {ref}", bn: "শব্দ {ref} খুলুন" },
  word: { en: "word", bn: "শব্দ" },
  rPieces: { en: "Pieces", bn: "অংশ" },
  rForm: { en: "Form", bn: "রূপ" },
  rTense: { en: "Tense", bn: "কাল" },
  rWho: { en: "Who", bn: "কে" },
  rVoice: { en: "Voice", bn: "বাচ্য" },
  rMood: { en: "Mood", bn: "ভাব" },
  rFamily: { en: "Its family in Form {n}", bn: "ফর্ম {n}-এ এর পরিবার" },
  famPast: { en: "past", bn: "অতীত" },
  famPresent: { en: "present", bn: "বর্তমান" },
  famMasdar: { en: "verbal noun", bn: "ক্রিয়াবাচক বিশেষ্য" },
  weakNote: { en: "This root has a weak letter or a doubled one, so its family comes with the conjugation round.", bn: "এই মূলে দুর্বল বা দ্বিত্ব অক্ষর আছে, তাই এর পরিবার ক্রিয়া-রূপান্তরের ধাপে আসবে।" },
  moodRuleNote: { en: "(no other mood is marked)", bn: "(অন্য কোনো ভাব চিহ্নিত নেই)" },
  person: { en: ["1st", "2nd", "3rd"], bn: ["উত্তম", "মধ্যম", "নাম"] },
  personWord: { en: "person", bn: "পুরুষ" },
  gender: { en: { M: "masculine", F: "feminine" }, bn: { M: "পুংলিঙ্গ", F: "স্ত্রীলিঙ্গ" } },
  number: { en: { S: "singular", D: "dual", P: "plural" }, bn: { S: "একবচন", D: "দ্বিবচন", P: "বহুবচন" } },
  nParticle: { en: "{piece} {name}", bn: "{piece} {name}" },
  moodWord: { en: { IND: "indicative", SUBJ: "subjunctive", JUS: "jussive" }, bn: { IND: "মারফূ", SUBJ: "মানসূব", JUS: "মাজযূম" } },
  verbIs: { en: "Present-tense verb, {mood}", bn: "বর্তমান কালের ক্রিয়া, {mood}" },
  signIs: { en: "the sign: {sign}", bn: "চিহ্ন: {sign}" },
  signs: {
    IND: { en: "a ḍamma on the last letter", bn: "শেষ অক্ষরে পেশ" },
    SUBJ: { en: "a fatḥa on the last letter", bn: "শেষ অক্ষরে যবর" },
    JUS: { en: "a sukūn on the last letter", bn: "শেষ অক্ষরে সাকিন" },
  },
  signNun: {
    IND: { en: "the ن stays, because the verb ends in a doer ending", bn: "ন থেকে যায়, কারণ ক্রিয়াটি কর্তার শেষাংশে শেষ হয়" },
    SUBJ: { en: "the ن is dropped, because the verb ends in a doer ending", bn: "ন বাদ পড়ে, কারণ ক্রিয়াটি কর্তার শেষাংশে শেষ হয়" },
    JUS: { en: "the ن is dropped, because the verb ends in a doer ending", bn: "ন বাদ পড়ে, কারণ ক্রিয়াটি কর্তার শেষাংশে শেষ হয়" },
  },
  doerEnding: { en: "the doer ending: the ones doing it ({person})", bn: "কর্তার শেষাংশ: যারা কাজটি করছে ({person})" },
  // Architect review of #513: three built (mabnī) cases and two pronoun roles
  // the first build named as if every present verb were declined and every
  // ending a doer.
  builtSukun: { en: "Present-tense verb, built on sukūn: it ends in the feminine-plural nūn", bn: "বর্তমান কালের ক্রিয়া, সাকিনের উপর গঠিত: এটি স্ত্রীবাচক বহুবচনের নূনে শেষ হয়" },
  builtFath: { en: "Present-tense verb, built on fatḥa: it carries the emphatic nūn", bn: "বর্তমান কালের ক্রিয়া, যবরের উপর গঠিত: এতে জোরদানকারী নূন আছে" },
  deputyDoer: { en: "Deputy-subject pronoun", bn: "নায়েবে ফায়েল সর্বনাম" },
  deputyEnding: { en: "the verb is passive, so the ending stands in for the doer ({person})", bn: "ক্রিয়াটি কর্মবাচ্য, তাই শেষাংশটি কর্তার স্থান নেয় ({person})" },
  kanaDoer: { en: "Pronoun: the subject of kāna (or one of its sisters)", bn: "সর্বনাম: কানা (বা তার সমগোত্রীয়)-র ইসম" },
  kanaEnding: { en: "kāna and its sisters take a subject and a predicate, not a doer ({person})", bn: "কানা ও তার সমগোত্রীয় ক্রিয়ার কর্তা নয়, ইসম ও খবর থাকে ({person})" },
  compare: { en: "Compare, in the same āyah:", bn: "একই আয়াতে তুলনা করুন:" },
  compareLine: { en: "{ar} (word {n}): {mood}", bn: "{ar} (শব্দ {n}): {mood}" },
  iArab: { en: "What this word does in the whole sentence needs a source: the Corpus's sentence analysis covers surahs 1–8, part of 9, and 59–114 so far.", bn: "পুরো বাক্যে এই শব্দের ভূমিকা জানতে উৎস লাগবে: কর্পাসের বাক্য-বিশ্লেষণ এখন পর্যন্ত সূরা ১–৮, ৯-এর একাংশ এবং ৫৯–১১৪ জুড়ে আছে।" },
  needLoading: { en: "Loading …", bn: "লোড হচ্ছে …" },
  needFailed: { en: "This could not be loaded, so nothing is shown here. Reload the page to try again.", bn: "এটি লোড করা যায়নি, তাই এখানে কিছু দেখানো হচ্ছে না। আবার চেষ্টা করতে পাতাটি রিলোড করুন।" },
  gramDep: { en: "{p} is the {rel} ({ar}) of {head}", bn: "{p} হলো {head}-এর {rel} ({ar})" },
  gramLink: { en: "{p} is the {rel} ({ar}): attached to {head}", bn: "{p} হলো {rel} ({ar}): {head}-এর সাথে সংযুক্ত" },
  gramTakes: { en: "In this sentence it takes:", bn: "এই বাক্যে এটি নেয়:" },
  gramTake: { en: "its {rel} ({ar}): {dep}", bn: "এর {rel} ({ar}): {dep}" },
  gramWord: { en: "{ar} (word {n})", bn: "{ar} (শব্দ {n})" },
  gramWordAyah: { en: "{ar} (āyah {a}, word {n})", bn: "{ar} (আয়াত {a}, শব্দ {n})" },
  gramHiddenV: { en: "a hidden verb", bn: "একটি লুপ্ত ক্রিয়া" },
  gramHiddenN: { en: "a hidden noun", bn: "একটি লুপ্ত বিশেষ্য" },
  gramHiddenPron: { en: "the hidden pronoun {ar}", bn: "লুপ্ত সর্বনাম {ar}" },
  gramHidden: { en: "a hidden word", bn: "একটি লুপ্ত শব্দ" },
  gramPhrase: { en: "the {name} ({ar})", bn: "{name} ({ar})" },
  gramUnshown: { en: "a word the Corpus counts that this text does not show", bn: "কর্পাসের গণনায় থাকা একটি শব্দ, যা এই পাঠে দেখানো হয় না" },
  gramCredit: { en: "Sentence grammar: {link} (GPL v3)", bn: "বাক্যের ব্যাকরণ: {link} (GPL v3)" },
  gramCreditName: { en: "Quranic Arabic Corpus", bn: "Quranic Arabic Corpus" },
  trioHead: { en: "This āyah uses {n} forms of the root side by side:", bn: "এই আয়াত মূলটির {n}টি রূপ পাশাপাশি ব্যবহার করেছে:" },
  formN: { en: "Form {n}", bn: "ফর্ম {n}" },
  synonyms: { en: "al-Furūq has no entry for this word.", bn: "আল-ফুরূকে এই শব্দের কোনো এন্ট্রি নেই।" },
  furuqRef: { en: "al-ʿAskarī, {work}, ed. Salīm, p. {p}", bn: "আল-আসকারি, {work}, সম্পাদনা: সালীম, পৃ. {p}" },
  furuqWork: { en: "al-Furūq al-Lughawiyya", bn: "আল-ফুরূক আল-লুগাবিয়্যা" },
  mufRef: { en: "al-Rāghib al-Iṣfahānī, {work}, ed. al-Dāwūdī, p. {p}", bn: "আর-রাগিব আল-ইসফাহানি, {work}, সম্পাদনা: আদ-দাউদি, পৃ. {p}" },
  mufWork: { en: "al-Mufradāt", bn: "আল-মুফরাদাত" },
  showAll: { en: "Show all", bn: "সব দেখুন" },
  showLess: { en: "Show less", bn: "কম দেখুন" },
  bookCredit: { en: "Text: {oi}, doi:10.5281/zenodo.3082463, {lic}", bn: "পাঠ: {oi}, doi:10.5281/zenodo.3082463, {lic}" },
  bookCreditName: { en: "OpenITI (Romanov & Seydi)", bn: "OpenITI (Romanov & Seydi)" },
  noTranslation: { en: "Arabic as in the book; no translation yet.", bn: "আরবি হুবহু বইয়ের মতো; এখনো অনুবাদ নেই।" },
  classicalIntro: { en: "Attested dictionary expressions, early prose or poetry will be shown with the Arabic quotation, translation, work, author and exact page/reference.", bn: "প্রমাণিত অভিধানের বাক্যাংশ, প্রাচীন গদ্য বা কবিতা দেখানো হবে আরবি উদ্ধৃতি, অনুবাদ, গ্রন্থ, লেখক এবং সঠিক পৃষ্ঠা/সূত্রসহ।" },
  chipQuran: { en: "Qur'anic usage: {n} times, {f} forms ✓", bn: "কুরআনে ব্যবহার: {n} বার, {f}টি রূপ ✓" },
  chipLane: { en: "Classical lexicon: Lane's Lexicon link ✓", bn: "ধ্রুপদী অভিধান: লেনের অভিধানের লিংক ✓" },
  chipMufradat: { en: "al-Mufradāt: p. {p} ✓", bn: "আল-মুফরাদাত: পৃ. {p} ✓" },
  chipMufradatNo: { en: "al-Mufradāt: no entry for this root", bn: "আল-মুফরাদাত: এই মূলের কোনো এন্ট্রি নেই" },
  chipMufradatLoading: { en: "al-Mufradāt: loading …", bn: "আল-মুফরাদাত: লোড হচ্ছে …" },
  chipMufradatFailed: { en: "al-Mufradāt: could not be loaded", bn: "আল-মুফরাদাত: লোড করা যায়নি" },
  laneLink: { en: "Lane's Lexicon ↗", bn: "লেনের অভিধান ↗" },
  noUnattributed: { en: "No unattributed example or generated quotation will be shown.", bn: "উৎসহীন কোনো উদাহরণ বা তৈরি করা উদ্ধৃতি দেখানো হবে না।" },
};

const pick = (key, lang) => S[key][lang] ?? S[key].en;
const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
const AR = (value, extra = "") => `<span class="word-card-ar" dir="rtl" lang="ar"${extra}>${esc(value)}</span>`;

/** The source tag; `kind` is "data" | "rule" | "needs". */
export function sourceTagHtml(kind, lang) {
  const t = SOURCE_TAGS[kind];
  return `<span class="word-card-src word-card-src-${kind}" data-word-card-src="${kind}">${esc(t[lang] ?? t.en)}</span>`;
}

export function depthLegendHtml(lang) {
  return `<div class="word-card-legend" data-word-card-legend>${["data", "rule", "needs", "book"].map((k) => sourceTagHtml(k, lang)).join("")}</div>`;
}

/** One line of a section: its text and the tag saying where it comes from. */
function line(kind, lang, body, cls = "") {
  return `<div class="word-card-dline${cls ? ` ${cls}` : ""}" data-word-card-dline="${kind}">${sourceTagHtml(kind, lang)} ${body}</div>`;
}

const SECTIONS = ["root", "sarf", "conj", "nahw", "choice", "classical"];
const ICONS = { root: "ر", sarf: "ص", conj: "ت", nahw: "ن", choice: "≠", classical: "ل" };
// The demo names the conjugation section in Arabic too (#conjAcc).
const TITLES_AR = { conj: "تَصْرِيفُ الْفِعْل" };
const TITLES = { root: "secRoot", sarf: "secSarf", conj: "secConj", nahw: "secNahw", choice: "secChoice", classical: "secClassical" };

function accordion(key, lang, open, body) {
  return `<details class="word-card-acc" data-word-card-sec="${key}"${open ? " open" : ""}>` +
    `<summary><span class="word-card-acc-ico" aria-hidden="true">${ICONS[key]}</span><span class="word-card-acc-t">${esc(pick(TITLES[key], lang))}</span>${TITLES_AR[key] ? `<span class="word-card-acc-ar" data-word-card-acc-ar><span class="word-card-acc-dot" aria-hidden="true">· </span><span dir="rtl" lang="ar">${TITLES_AR[key]}</span></span>` : ""}</summary>` +
    `<div class="word-card-acc-body">${body}</div></details>`;
}

const rootLetters = (root) => [...String(root ?? "")].filter((c) => !/\s/.test(c));

/** Three letters, none weak or hamza, last two not the same: the only roots
 *  whose Form patterns can be filled by simply putting the letters in. */
export function isSoundRoot(root) {
  const l = rootLetters(root);
  return l.length === 3 && !l.some((c) => "وي" .includes(c) || "ءأإؤئآٱ".includes(c)) && l[1] !== l[2];
}

export function fillPattern(pattern, root) {
  const [r1, r2, r3] = rootLetters(root);
  const map = { "ف": r1, "ع": r2, "ل": r3 };
  return [...pattern].map((c) => map[c] ?? c).join("");
}

function personWords(pgn, lang) {
  const m = /^([123])([MF])?([SDP])$/.exec(String(pgn ?? ""));
  if (!m) return null;
  const parts = [`${pick("person", lang)[Number(m[1]) - 1]} ${pick("personWord", lang)}`];
  if (m[2]) parts.push(S.gender[lang][m[2]]);
  parts.push(S.number[lang][m[3]]);
  return parts.join(lang === "bn" ? ", " : ", ");
}

function pieces(layers, segments) {
  if (!Array.isArray(segments) || !segments.length || !segments.every((s) => Number.isInteger(s?.from) && Number.isInteger(s?.to) && s.to > s.from)) return null;
  return segments.map((s) => layers.surfaceToken.slice(s.from, s.to));
}

const tagCell = (kind, lang) => sourceTagHtml(kind, lang);

function sarfSection(word, layers, features, ctx) {
  const { lang, formatNumber } = ctx;
  const rows = [];
  const row = (label, value, kind) => rows.push(`<tr data-word-card-morph-row><th scope="row">${esc(label)}</th><td>${value} ${tagCell(kind, lang)}</td></tr>`);
  const pcs = pieces(layers, ctx.segments);
  if (pcs) row(pick("rPieces", lang), AR(pcs.join(" + ")), "data");
  const isVerb = features?.pos === "V";
  const formNo = features?.form > 1 && FORM_NAMES[features.form] ? features.form : 0;
  const formLabel = (n) => fill(pick("formN", lang), { n: lang === "bn" ? formatNumber(n) : FORM_NAMES[n].roman });
  if (features && (isVerb || formNo)) {
    const n = formNo || 1;
    row(pick("rForm", lang), `<b>${esc(formLabel(n))}</b> · ${AR(FORM_NAMES[n].past)}`, "data");
  }
  if (features?.deriv && DERIV_NAMES[features.deriv]) {
    const d = DERIV_NAMES[features.deriv];
    row(lang === "bn" ? "কর্তা/কর্ম/ক্রিয়াবাচক" : "Participle / verbal noun", `<b>${esc(d[lang])}</b> · ${AR(d.ar)}`, "data");
  }
  if (isVerb && features.tense && TENSE_NAMES[features.tense]) {
    const t = TENSE_NAMES[features.tense];
    row(pick("rTense", lang), `<b>${esc(t[lang])}</b> · ${AR(t.ar)}`, "data");
  }
  if (isVerb) {
    const words = personWords(features.pgn, lang);
    const person = personFor(features.pgn);
    if (words) row(pick("rWho", lang), `<b>${esc(words)}</b>${person ? ` · ${AR(person.ar)}` : ""}`, "data");
    const v = VOICE_NAMES[features.pass ? "passive" : "active"];
    row(pick("rVoice", lang), `<b>${esc(v[lang])}</b> · ${AR(v.ar)}`, "data");
    if (features.tense === "IMPF") {
      const mood = features.mood && MOOD_NAMES[features.mood] ? features.mood : "IND";
      const marked = mood !== "IND";
      row(pick("rMood", lang), `<b>${esc(MOOD_NAMES[mood][lang])}</b> · ${AR(MOOD_NAMES[mood].ar)}${marked ? "" : ` ${esc(pick("moodRuleNote", lang))}`}`, marked ? "data" : "rule");
    }
  }
  if (formNo) {
    if (isSoundRoot(layers.root)) {
      const f = FORM_NAMES[formNo];
      const fam = [["famPast", f.past], ["famPresent", f.present], ["famMasdar", f.masdar]]
        .filter(([, p]) => p)
        .map(([k, p]) => `${esc(pick(k, lang))} ${AR(fillPattern(p, layers.root))}`).join(" · ");
      row(fill(pick("rFamily", lang), { n: lang === "bn" ? formatNumber(formNo) : f.roman }), fam, "rule");
    } else if (layers.root) {
      rows.push(`<tr data-word-card-morph-note><td colspan="2" class="word-card-dnote">${esc(pick("weakNote", lang))}</td></tr>`);
    }
  }
  if (!rows.length) return "";
  return `<table class="word-card-morph" data-word-card-morph>${rows.join("")}</table>`;
}

const DOER_ENDINGS = new Set(["subj-waw", "subj-alif", "subj-ya"]);

// كَانَ and its sisters (أَخَوَاتُ كَانَ) by root and Form: كَانَ صَارَ ظَلَّ بَاتَ لَيْسَ
// (مَا) زَالَ (مَا) دَامَ (Form I), أَصْبَحَ أَمْسَى أَضْحَى (Form IV).
const KANA_ROOTS_I = new Set(["كون", "صير", "ظلل", "بيت", "ليس", "زول", "زيل", "دوم"]);
const KANA_ROOTS_IV = new Set(["صبح", "مسي", "ضحي"]);
export function isKanaFamily(root, form) {
  const r = String(root ?? "").replace(/\s/g, "");
  return (!form || form === 1) ? KANA_ROOTS_I.has(r) : form === 4 && KANA_ROOTS_IV.has(r);
}

/** A plain loading / could-not-load line for a fetched section (I15). */
const loadingLine = (lang) => `<p class="word-card-dnote" data-word-card-need-loading>${esc(pick("needLoading", lang))}</p>`;
const failedLine = (lang) => line("needs", lang, esc(pick("needFailed", lang)), "word-card-need");

/** "80–81", or "31" for a one-page entry, in the reader's digits. */
const pageRange = (p, formatNumber) => (Array.isArray(p) ? [...new Set(p)] : [p]).map((n) => formatNumber(n)).join("–");

const linkHtml = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;

/** The OpenITI credit and the no-translation line, shared by al-Furūq and al-Mufradāt. */
function bookCreditHtml(lang, licenceUrl) {
  const credit = esc(fill(pick("bookCredit", lang), { oi: "\u0000", lic: "\u0001" }))
    .replace("\u0000", linkHtml("https://doi.org/10.5281/zenodo.3082463", pick("bookCreditName", lang)))
    .replace("\u0001", linkHtml(licenceUrl || "https://creativecommons.org/licenses/by-nc-sa/4.0/", "CC BY-NC-SA 4.0"));
  return `<p class="word-card-m3" data-word-card-credit="openiti">${credit}</p><p class="word-card-m3" data-word-card-no-translation>${esc(pick("noTranslation", lang))}</p>`;
}

let moreSeq = 0;
/** One book entry: heading, the Arabic collapsed to `lines` lines with a
 *  Show all toggle (a checkbox, so it needs no script), then the reference. */
function bookEntryHtml({ heading, text, lines, ref, lang, kind }) {
  const id = `wc-more-${kind}-${++moreSeq}`;
  const long = String(text).length > lines * 45 || String(text).split("\n").length > lines;
  return `<div class="word-card-book" data-word-card-book="${kind}">` +
    `<div class="word-card-book-h">${sourceTagHtml("book", lang)} <b class="word-card-ar" dir="rtl" lang="ar" data-word-card-book-h>${esc(heading)}</b></div>` +
    `<input type="checkbox" class="word-card-more-cb" id="${id}" data-word-card-more${long ? "" : " hidden"}>` +
    `<div class="word-card-book-t" dir="rtl" lang="ar" style="--lines:${lines}" data-word-card-book-t>${esc(text)}</div>` +
    (long ? `<label class="word-card-more" for="${id}"><span class="word-card-more-on">${esc(pick("showAll", lang))}</span><span class="word-card-more-off">${esc(pick("showLess", lang))}</span></label>` : "") +
    `<div class="word-card-m3" data-word-card-book-ref>${ref}</div></div>`;
}

/** Decision 61: what one word does in the sentence, from the Corpus's treebank. */
function grammarLines(word, features, pcs, ctx, push) {
  const { lang, formatNumber } = ctx;
  const { manifest, data } = ctx.nahw.value;
  const key = `${ctx.ayahNumber}:${word.position}`;
  const graphIdx = data?.words?.[key];
  if (!graphIdx?.length) return false;
  const relName = (rel) => {
    const r = manifest.relations[rel];
    return r ? { ar: r[0], name: lang === "bn" ? (RELATION_BN[rel] ?? r[1]) : r[1] } : { ar: "", name: rel };
  };
  const phraseName = (tag) => {
    const p = manifest.phrases[tag];
    return p ? { ar: p[0], name: lang === "bn" ? (PHRASE_BN[tag] ?? p[1]) : p[1] } : { ar: "", name: tag };
  };
  // The treebank counts a word's pieces with the determiner left out.
  const parts = features?.parts ?? [];
  const aligned = pcs && pcs.length === parts.length;
  const pieceText = (piece) => {
    if (!aligned) return word.arabic;
    const at = parts.map((p, i) => [p, i]).filter(([p]) => p !== "det").map(([, i]) => i)[piece];
    return at === undefined ? word.arabic : pcs[at];
  };
  const wordRef = (k) => {
    const [a, p] = String(k).split(":").map(Number);
    const w = a === ctx.ayahNumber ? (ctx.ayahWords ?? []).find((x) => x.position === p) : null;
    const ar = w?.arabic ?? "";
    const html = esc(fill(pick(a === ctx.ayahNumber ? "gramWord" : "gramWordAyah", lang), { ar: "\u0000", n: formatNumber(p), a: formatNumber(a) })).replace("\u0000", ar ? AR(ar) : "");
    return html;
  };
  const describe = (g, i) => {
    const n = g.n[i];
    if (n[0] === "w" || n[0] === "r") return n[1] ? wordRef(n[1]) : esc(pick("gramUnshown", lang));
    if (n[0] === "h") {
      if (n[1] === "V") return esc(pick("gramHiddenV", lang));
      if (n[1] === "N") return esc(pick("gramHiddenN", lang));
      if (n[1] === "PRON" && n[2]) return esc(fill(pick("gramHiddenPron", lang), { ar: "\u0000" })).replace("\u0000", AR(n[2]));
      return esc(pick("gramHidden", lang));
    }
    const ph = phraseName(n[1]);
    return esc(fill(pick("gramPhrase", lang), { name: ph.name, ar: "\u0000" })).replace("\u0000", AR(ph.ar));
  };
  const mineNode = (n) => (n[0] === "w" || n[0] === "r") && n[1] === key;
  const asDependent = [];
  const asHead = [];
  const seen = new Set();
  for (const gi of graphIdx) {
    const g = data.graphs[gi];
    if (!g) continue;
    for (const [rel, dep, head] of g.e) {
      const dn = g.n[dep];
      const hn = g.n[head];
      if (!dn || !hn) continue;
      if (dn[0] === "r" && hn[0] === "r") continue;
      if (mineNode(dn)) {
        const sig = `d|${rel}|${dn[2]}|${describe(g, head)}`;
        if (!seen.has(sig)) { seen.add(sig); asDependent.push({ rel, piece: dn[2], head: describe(g, head), headNode: hn }); }
      } else if (mineNode(hn)) {
        const sig = `h|${rel}|${describe(g, dep)}`;
        if (!seen.has(sig)) { seen.add(sig); asHead.push({ rel, dep: describe(g, dep) }); }
      }
    }
  }
  if (!asDependent.length && !asHead.length) return false;
  for (const d of asDependent) {
    const r = relName(d.rel);
    const tpl = pick(d.rel === "link" ? "gramLink" : "gramDep", lang);
    const html = esc(fill(tpl, { p: "\u0000", rel: `\u0001${r.name}\u0002`, ar: "\u0003", head: "\u0004" }))
      .replace("\u0000", AR(pieceText(d.piece))).replace("\u0001", "<b>").replace("\u0002", "</b>").replace("\u0003", esc(r.ar)).replace("\u0004", d.head);
    push(`<span data-word-card-gram-rel="${esc(d.rel)}">${html}</span>`, `dep`);
  }
  if (asHead.length) {
    push(`<b>${esc(pick("gramTakes", lang))}</b>`, "takes-head", true);
    for (const h of asHead) {
      const r = relName(h.rel);
      const html = esc(fill(pick("gramTake", lang), { rel: `\u0001${r.name}\u0002`, ar: "\u0003", dep: "\u0004" }))
        .replace("\u0001", "<b>").replace("\u0002", "</b>").replace("\u0003", esc(r.ar)).replace("\u0004", h.dep);
      push(`<span data-word-card-gram-take="${esc(h.rel)}">${html}</span>`, "take");
    }
  }
  return true;
}

function nahwSection(word, layers, features, ctx) {
  const { lang } = ctx;
  const out = [];
  const irab = (kind, body, cls = "") => out.push(`<div class="word-card-irab${cls ? ` ${cls}` : ""}" data-word-card-irab="${kind}">${body} ${sourceTagHtml(kind, lang)}</div>`);
  const pcs = pieces(layers, ctx.segments);
  const parts = features?.parts ?? [];
  const aligned = pcs && pcs.length === parts.length;
  if (features) {
    parts.forEach((id, i) => {
      const n = partName(id);
      if (!n || n.kind !== "prefix" || id === "impf-prefix" || id === "prefix-other") return;
      const mean = PART_NAMES[id]?.mean?.[lang];
      irab("data", `${aligned ? `${AR(pcs[i])} ` : ""}<b>${esc(n[lang])}</b> · ${AR(n.ar)}${mean ? `: ${esc(mean)}` : ""}`);
    });
  }
  if (features?.pos === "V" && features.tense === "IMPF") {
    const mood = features.mood && MOOD_NAMES[features.mood] ? features.mood : "IND";
    const letters = rootLetters(layers.root);
    const weak = letters.length && "وي".includes(letters[letters.length - 1]);
    const doer = parts.some((p) => DOER_ENDINGS.has(p));
    const stemAt = parts.findIndex((p) => String(p).startsWith("stem-"));
    const verbPiece = aligned && stemAt >= 0 ? `${AR(pcs[stemAt])} ` : "";
    let sign = "";
    if (!weak) {
      if (doer) sign = S.signNun[mood][lang];
      else if (!parts.includes("subj-nun")) sign = S.signs[mood][lang];
    }
    const signAr = {
      IND: { sign: doer ? " وَعَلَامَةُ رَفْعِهِ ثُبُوتُ النُّون" : " وَعَلَامَةُ رَفْعِهِ الضَّمَّة" },
      SUBJ: { sign: doer ? " وَعَلَامَةُ نَصْبِهِ حَذْفُ النُّون" : " وَعَلَامَةُ نَصْبِهِ الْفَتْحَة" },
      JUS: { sign: doer ? " وَعَلَامَةُ جَزْمِهِ حَذْفُ النُّون" : " وَعَلَامَةُ جَزْمِهِ السُّكُون" },
    }[mood].sign;
    const base = { IND: "فِعْلٌ مُضَارِعٌ مَرْفُوعٌ", SUBJ: "فِعْلٌ مُضَارِعٌ مَنْصُوبٌ", JUS: "فِعْلٌ مُضَارِعٌ مَجْزُومٌ" }[mood];
    // A present verb with the feminine-plural nūn is built on sukūn, and one
    // carrying the emphatic nūn directly is built on fatḥa: neither is declined
    // for mood, so neither has a sign of raf', naṣb or jazm.
    if (parts.includes("subj-nun")) {
      irab("rule", `${verbPiece}<b>${esc(pick("builtSukun", lang))}</b> · ${AR("فِعْلٌ مُضَارِعٌ مَبْنِيٌّ عَلَى السُّكُونِ لِاتِّصَالِهِ بِنُونِ النِّسْوَة")}`);
    } else if (parts.includes("emph-n") && !doer) {
      irab("rule", `${verbPiece}<b>${esc(pick("builtFath", lang))}</b> · ${AR("فِعْلٌ مُضَارِعٌ مَبْنِيٌّ عَلَى الْفَتْحِ لِاتِّصَالِهِ بِنُونِ التَّوْكِيد")}`);
    } else {
      const arabic = sign ? base + signAr : base;
      const english = fill(pick("verbIs", lang), { mood: S.moodWord[lang][mood] });
      irab("rule",
        `${verbPiece}<b>${esc(english)}</b> · ${AR(arabic)}${sign ? `: ${esc(fill(pick("signIs", lang), { sign }))}` : ""}`);
    }
    const doerAt = parts.findIndex((p) => DOER_ENDINGS.has(p) || p === "subj-nun" || p === "subj-ta" || p === "subj-na");
    if (doerAt >= 0) {
      const person = personWords(features.pp?.[doerAt] ?? features.pgn, lang);
      // The ending of a passive verb stands in for the doer (nāʾib fāʿil); on
      // kāna and its sisters it is their subject (ism), never a doer.
      const kana = isKanaFamily(layers.root, features.form);
      const [label, role, gloss] = features.pass
        ? [pick("deputyDoer", lang), "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ رَفْعِ نَائِبِ فَاعِل", "deputyEnding"]
        : kana
          ? [pick("kanaDoer", lang), "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ رَفْعِ اسْمِهَا", "kanaEnding"]
          : [lang === "bn" ? "কর্তা সর্বনাম" : "Subject pronoun", "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ رَفْعِ فَاعِل", "doerEnding"];
      irab("rule", `${aligned ? `${AR(pcs[doerAt])} ` : ""}<b>${esc(label)}</b> · ${AR(role)}: ${esc(fill(pick(gloss, lang), { person: person ?? "" }))}`);
    }
  }
  // The same-āyah comparison: every OTHER verb in this āyah carrying a different mood.
  const myMood = features?.pos === "V" && features.tense === "IMPF" ? (features.mood || "IND") : null;
  if (myMood && ctx.ayahFeatures) {
    const compare = [];
    for (const w of ctx.ayahWords ?? []) {
      if (w.position === word.position) continue;
      const f = ctx.ayahFeatures[`${ctx.ayahNumber}:${w.position}`];
      if (!f || f.pos !== "V" || f.tense !== "IMPF" || !f.mood || !MOOD_NAMES[f.mood] || f.mood === myMood) continue;
      compare.push({ w, mood: f.mood });
    }
    if (compare.length) {
      out.push(`<div class="word-card-irab-head" data-word-card-compare-head><b>${esc(pick("compare", lang))}</b></div>`);
      for (const { w, mood } of compare) {
        const text = fill(pick("compareLine", lang), { ar: "\u0000", n: ctx.formatNumber(w.position), mood: `${S.moodWord[lang][mood]} (${"\u0001"})` });
        const html = esc(text).replace("\u0000", AR(w.arabic)).replace("\u0001", AR(MOOD_NAMES[mood].ar));
        irab("data", html, "word-card-irab-cmp");
        out[out.length - 1] = out[out.length - 1].replace(`data-word-card-irab="data"`, `data-word-card-irab="data" data-word-card-compare="${w.position}" data-word-card-compare-mood="${mood}"`);
      }
    }
  }
  // Decision 61 -- what the word does in the whole sentence, from the Corpus's treebank.
  const nw = ctx.nahw;
  if (!nw || nw.state === "idle" || nw.state === "loading") out.push(loadingLine(lang));
  else if (nw.state === "failed") out.push(failedLine(lang));
  else {
    const found = grammarLines(word, features, pcs, ctx, (html, kind, head) => {
      if (head) out.push(`<div class="word-card-irab-head" data-word-card-gram-head>${html}</div>`);
      else irab("data", html, `word-card-gram word-card-gram-${kind}`);
    });
    if (found) {
      const credit = esc(fill(pick("gramCredit", lang), { link: "\u0000" })).replace("\u0000", linkHtml("https://corpus.quran.com", pick("gramCreditName", lang)));
      out.push(`<p class="word-card-m3" data-word-card-credit="corpus">${credit}</p>`);
    } else irab("needs", esc(pick("iArab", lang)), "word-card-need");
  }
  return out.join("");
}

function choiceSection(word, layers, features, ctx) {
  const { lang, formatNumber } = ctx;
  const out = [];
  const root = word.morphology?.root;
  const seen = new Map();
  if (root && ctx.ayahFeatures) {
    for (const w of ctx.ayahWords ?? []) {
      if (w.morphology?.root !== root) continue;
      const f = ctx.ayahFeatures[`${ctx.ayahNumber}:${w.position}`];
      if (!f || f.pos !== "V") continue;
      const n = f.form > 0 && FORM_NAMES[f.form] ? f.form : 1;
      if (!seen.has(n)) seen.set(n, w);
    }
  }
  if (seen.size >= 2) {
    const mine = features?.pos === "V" ? (features.form > 0 && FORM_NAMES[features.form] ? features.form : 1) : 0;
    out.push(line("data", lang, `<b>${esc(fill(pick("trioHead", lang), { n: formatNumber(seen.size) }))}</b>`));
    out.push(`<div class="word-card-trio" style="--n:${Math.min(seen.size, 3)}" data-word-card-trio>${[...seen].map(([n, w]) => {
      const gloss = (lang === "bn" ? w.translation?.bn : w.translation?.en) || "";
      const label = fill(pick("formN", lang), { n: lang === "bn" ? formatNumber(n) : FORM_NAMES[n].roman });
      return `<div class="word-card-trio-cell${n === mine ? " word-card-trio-on" : ""}"${n === mine ? ' data-word-card-trio-current' : ""} data-word-card-trio-form="${n}">${AR(w.arabic)}<b>${esc(label)}${gloss ? ` · ${esc(gloss)}` : ""}</b></div>`;
    }).join("")}</div>`);
  }
  const formNo = features?.pos === "V" ? (features.form > 0 && FORM_NAMES[features.form] ? features.form : 1) : (features?.form > 1 && FORM_NAMES[features.form] ? features.form : 0);
  if (formNo) {
    const f = FORM_NAMES[formNo];
    const label = fill(pick("formN", lang), { n: lang === "bn" ? formatNumber(formNo) : f.roman });
    out.push(line("rule", lang, `<b>${esc(label)}</b> (${AR(f.past)}): <span data-word-card-form-sentence lang="${lang}">${esc(f[lang] ?? f.en)}</span>`));
  }
  // Decision 61 -- near-synonyms from al-Furūq.
  const fu = ctx.furuq;
  if (!fu || fu.state === "idle" || fu.state === "loading") out.push(loadingLine(lang));
  else if (fu.state === "failed") out.push(failedLine(lang));
  else {
    const idx = word.morphology?.lemma ? fu.value.lemmas[word.morphology.lemma] : null;
    if (!idx?.length) out.push(line("needs", lang, esc(pick("synonyms", lang)), "word-card-need"));
    else {
      for (const i of idx) {
        const e = fu.value.entries[i];
        if (!e) continue;
        const ref = esc(fill(pick("furuqRef", lang), { work: "\u0000", p: pageRange(e.p, formatNumber) })).replace("\u0000", `<i>${esc(pick("furuqWork", lang))}</i>`);
        out.push(bookEntryHtml({ heading: e.h, text: e.t, lines: 3, ref, lang, kind: "furuq" }));
      }
      out.push(bookCreditHtml(lang, fu.value.source?.licenceUrl));
    }
  }
  return out.join("");
}

function classicalSection(word, layers, ctx) {
  const { lang, formatNumber } = ctx;
  const data = ctx.rootForms;
  const chips = [];
  const chip = (kind, text, ok) => chips.push(`<span class="word-card-c2 ${ok ? "word-card-c2-ok" : "word-card-c2-no"}" data-word-card-dline="${kind}">${esc(text)} ${sourceTagHtml(kind, lang)}</span>`);
  if (data?.forms?.length) chip("data", fill(pick("chipQuran", lang), { n: formatNumber(data.totalOccurrences), f: formatNumber(data.formCount ?? data.forms.length) }), true);
  if (layers.root) chip("data", pick("chipLane", lang), true);
  // Decision 61 -- al-Rāghib's entry for the root.
  const mu = ctx.mufradat;
  const root = String(word.morphology?.root ?? "").replace(/\s/g, "");
  let entries = [];
  if (!mu || mu.state === "idle" || mu.state === "loading") chip("needs", pick("chipMufradatLoading", lang), false);
  else if (mu.state === "failed") chip("needs", pick("chipMufradatFailed", lang), false);
  else {
    entries = (root && mu.value.book?.entries?.[root]) || [];
    if (entries.length) {
      const pages = [...new Set(entries.map((e) => pageRange(e.p?.[0], formatNumber)))].join(", ");
      chips.push(`<span class="word-card-c2 word-card-c2-ok" data-word-card-dline="book" data-word-card-mufradat-chip>${esc(fill(pick("chipMufradat", lang), { p: pages }))} ${sourceTagHtml("book", lang)}</span>`);
    } else chip("needs", pick("chipMufradatNo", lang), false);
  }
  const lane = layers.root ? ctx.laneUrl : null;
  const book = entries.map((e) => {
    const ref = esc(fill(pick("mufRef", lang), { work: "\u0000", p: pageRange(e.p, formatNumber) })).replace("\u0000", `<i>${esc(pick("mufWork", lang))}</i>`);
    return bookEntryHtml({ heading: e.h, text: e.t, lines: 4, ref, lang, kind: "mufradat" });
  }).join("") + (entries.length ? bookCreditHtml(lang, mu.value.manifest?.source?.licenceUrl) : "");
  return `<p class="word-card-m2" data-word-card-classical-intro>${esc(pick("classicalIntro", lang))}</p>` +
    `<div class="word-card-chips2" data-word-card-chips2>${chips.join("")}</div>${book}` +
    (lane ? `<div class="word-card-dlinks"><a class="word-card-dlink" data-word-card-dict-link="lane" href="${esc(lane)}" target="_blank" rel="noopener noreferrer">${esc(pick("laneLink", lang))}</a></div>` : "") +
    `<p class="word-card-m3" data-word-card-classical-note>${esc(pick("noUnattributed", lang))}</p>`;
}

const CONJ_REASON = { "weak-or-hamzated": "conjWeak", doubled: "conjDoubled", "not-triliteral": "conjNotTri" };
const CONJ_TENSE = { PERF: "past", IMPF: "pres", IMPV: "imp" };
const CONJ_KEY = { past: "PERF", imp: "IMPV" };
const CONJ_LEAD = { past: "الْمَاضِي", pres: "الْمُضَارِع", imp: "الْأَمْر" };

/** One of the three tables: 14 rows in PERSONS order, the pronoun on the right
 *  (the grid and the table are right-to-left, as in the demo). */
function conjTable(kind, rows, heading, ctx, here, entry) {
  const { lang, formatNumber } = ctx;
  const head = rows.find((r) => r?.pgn === "3MS") ?? rows.find((r) => r?.pgn === "2MS");
  const body = PERSONS.map((p, i) => {
    const r = rows[i];
    const sep = i === 6 || i === 12 ? " word-card-cj-sep" : "";
    const pr = `<td class="word-card-cj-pr"><span class="word-card-ar" dir="rtl" lang="ar">${esc(p.ar)}</span><small>${esc(p[lang] ?? p.en)}</small></td>`;
    if (!r) return `<tr class="word-card-cj-row${sep}" data-word-card-conj-pgn="${p.pgn}">${pr}<td class="word-card-cj-no" data-word-card-conj-none>✕</td></tr>`;
    const isHere = !!here && here.kind === kind && here.pgn === p.pgn;
    const count = entry?.n?.[kind === "pres" ? `IMPF.${p.pgn}.IND` : `${CONJ_KEY[kind]}.${p.pgn}`];
    const q = count ? `<span class="word-card-cj-q" data-word-card-conj-count="${count}">${esc(fill(pick("conjTimes", lang), { n: formatNumber(count) }))}</span>` : "";
    const mood = isHere && here.mood !== "IND"
      ? `<span class="word-card-cj-mood" data-word-card-conj-mood>${esc(fill(pick("conjHere", lang), { ar: "\u0000", mood: S.moodWord[lang][here.mood] })).replace("\u0000", AR(here.word))}</span>` : "";
    const vb = `<td class="word-card-cj-vb" data-word-card-conj-form="${esc(r.ar)}"><span class="word-card-cj-p">${esc(r.prefix)}</span><span class="word-card-cj-st">${esc(r.stem)}</span><span class="word-card-cj-e">${esc(r.ending)}</span>${q}${mood}</td>`;
    return `<tr class="word-card-cj-row${sep}${isHere ? " word-card-cj-here" : ""}"${isHere ? " data-word-card-conj-here" : ""} data-word-card-conj-pgn="${p.pgn}">${pr}${vb}</tr>`;
  }).join("");
  return `<div class="word-card-cj word-card-cj-${kind}" data-word-card-conj-table="${kind}">` +
    `<h4>${heading}</h4><div class="word-card-cj-lead" dir="rtl" lang="ar">${esc(CONJ_LEAD[kind])} (${esc(head?.ar ?? "")})</div>` +
    `<table>${body}</table></div>`;
}

/** Verb Conjugation · تَصْرِيفُ الْفِعْل. Every form comes from the engine
 *  (verb-conjugation.js) and is never guessed: a root it cannot do safely gets
 *  one plain line saying why. */
function conjSection(word, features, ctx) {
  const { lang, formatNumber } = ctx;
  const lemma = word.morphology?.lemma;
  const need = (key) => line("needs", lang, esc(pick(key, lang)), "word-card-need");
  if (!ctx.verbForms) return ctx.verbFormsFailed ? need("conjFailed") : `<p class="word-card-dnote" data-word-card-conj-loading>${esc(pick("conjLoading", lang))}</p>`;
  const entry = lemma ? ctx.verbForms[lemma] : null;
  if (!entry) return need("conjNotListed");
  const result = conjugate({ root: entry.r, form: entry.f, pastVowel: entry.pv ?? null, presentVowel: entry.sv ?? null });
  if (!result.supported) return need(CONJ_REASON[result.reason] ?? "conjWeak");
  const rootAr = [...toArabic(entry.r)].join(" ");
  const formLabel = lang === "bn" ? formatNumber(entry.f) : (FORM_NAMES[entry.f]?.roman ?? String(entry.f));
  const out = [line("rule", lang, `${esc(fill(pick("conjRule", lang), { n: formLabel, root: "\u0000" })).replace("\u0000", AR(rootAr))} <span class="word-card-m">${esc(pick("conjHelp", lang))}</span>`)];
  const kind = CONJ_TENSE[features.tense];
  const here = kind && !features.pass
    ? { kind, pgn: PGN_ALIASES[features.pgn] || features.pgn, mood: features.tense === "IMPF" ? features.mood || "IND" : "IND", word: String(word.arabic ?? "").replace(/^\u06DE\s*/, "").replace(/\s+[\u06D6-\u06ED]+/g, "").trim() }
    : null;
  if (features.pass) out.push(`<p class="word-card-dnote" data-word-card-conj-passive>${esc(pick("conjPassive", lang))}</p>`);
  // Only the present has a Dictionary meaning to give (the Dictionary word is the present form); the other two get none rather than an invented one.
  const meaning = ctx.dictionaryLookup?.(lemma)?.m;
  // A meaning that already carries brackets ("to learn (something)") is set off
  // with a dot, so the heading never reads "Present (to learn (something))".
  const h4 = (key, gloss) => `${esc(pick(key, lang))}${!gloss ? "" : /[()]/.test(gloss) ? ` <b lang="en">· ${esc(gloss)}</b>` : ` <b lang="en">(${esc(gloss)})</b>`}`;
  const unknown = `<div class="word-card-cj word-card-cj-unknown" data-word-card-conj-unknown><p class="word-card-dnote">${esc(pick("conjUnknownVowel", lang))}</p></div>`;
  const tables = [
    result.pastKnown ? conjTable("past", result.past, h4("conjPast"), ctx, here, entry) : unknown,
    result.presentKnown ? conjTable("pres", result.present, h4("conjPresent", meaning), ctx, here, entry) : unknown,
    result.presentKnown ? conjTable("imp", result.command, h4("conjCommand"), ctx, here, entry) : unknown,
  ];
  out.push(`<div class="word-card-conj-wrap"><div class="word-card-conj" data-word-card-conj-grid>${tables.join("")}</div></div>`);
  return out.join("");
}

function rootSection(word, layers, features, ctx) {
  const { lang, formatNumber } = ctx;
  const out = [];
  const data = ctx.rootForms;
  const table = ctx.lemmaForms ?? null;
  if (layers.root && data?.forms?.length) {
    let forms = data.forms.map((f) => ({ lemma: f.lemma, group: table?.[f.lemma]?.[0] ?? "other", form: table?.[f.lemma]?.[1] ?? 0, count: f.count }));
    if (table) forms = orderDerivedForms(forms);
    out.push(line("rule", lang, `<p class="word-card-fam" dir="rtl" data-word-card-fam><b>${esc(rootLetters(layers.root).join(" "))}</b> ← ${forms.map((f) => esc(f.lemma)).join(" · ")}</p>`));
    // The root's meaning is the Wiktionary meaning of its most frequent Form I verb.
    let meaning = null;
    if (table && ctx.dictionaryLookup) {
      const verbs = forms.filter((f) => f.group === "verb" && f.form === 1).sort((a, b) => (b.count || 0) - (a.count || 0));
      for (const v of verbs) { const e = ctx.dictionaryLookup(v.lemma); if (e?.m) { meaning = e.m; break; } }
    }
    const used = fill(pick(meaning ? "usedTimes" : "usedTimesNoMeaning", lang), { n: formatNumber(data.totalOccurrences), f: formatNumber(data.formCount ?? data.forms.length) });
    out.push(line("data", lang, `${meaning ? `${esc(fill(pick("rootMeans", lang), { m: "\u0000" }).split("\u0000")[0])}<b lang="en" data-word-card-root-meaning>${esc(meaning)}</b>${esc(fill(pick("rootMeans", lang), { m: "\u0000" }).split("\u0000")[1])} <span class="word-card-m">${esc(pick("rootCredit", lang))}</span>. ` : ""}${esc(used)}`));
  }
  if (layers.root) {
    const same = (ctx.ayahWords ?? []).filter((w) => w.morphology?.root === word.morphology?.root);
    if (same.length >= 2) {
      const chips = same.map((w) => {
        const ref = quranWordOccurrenceId(ctx.surahNumber, ctx.ayahNumber, w.position);
        const gloss = (lang === "bn" ? w.translation?.bn : w.translation?.en) || "";
        const on = w.position === word.position;
        return `<button type="button" class="word-card-ar-chip${on ? " word-card-ar-chip-on" : ""}" data-word-card-goto="${ref}"${on ? ' data-word-card-chip-current aria-current="true"' : ""} aria-label="${esc(fill(pick("openWord", lang), { ref: formatNumber(w.position) }))}">` +
          `<b dir="rtl" lang="ar">${esc(w.arabic)}</b><small>${esc(gloss)} · ${esc(pick("word", lang))} ${esc(formatNumber(w.position))}</small></button>`;
      }).join("");
      out.push(line("data", lang, `<b>${esc(fill(pick("inAyah", lang), { k: formatNumber(same.length) }))}</b>`));
      out.push(`<div class="word-card-ayahroot" dir="rtl" data-word-card-ayahroot>${chips}</div>`);
    }
  }
  // Everything the old Depth tab had stays, below the lines above.
  out.push(ctx.dictionaryHtml, ctx.formsHtml);
  return out.join("");
}

/**
 * The whole Depth panel body (legend + five accordions). `open` is the
 * reader's own open/closed choices ({ root: bool, ... }); a section they have
 * never touched follows the default: only Root & Word Family starts open.
 */
export function depthSectionsHtml({ word, layers, features, ctx, open = {} }) {
  const isOpen = (k) => (k in open ? !!open[k] : k === "root");
  const showConj = !!features?.tense;
  const bodies = {
    root: rootSection(word, layers, features, ctx),
    sarf: sarfSection(word, layers, features, ctx),
    conj: showConj ? conjSection(word, features, ctx) : "",
    nahw: nahwSection(word, layers, features, ctx),
    choice: choiceSection(word, layers, features, ctx),
    classical: classicalSection(word, layers, ctx),
  };
  return depthLegendHtml(ctx.lang) + SECTIONS.filter((k) => k !== "conj" || showConj).map((k) => accordion(k, ctx.lang, isOpen(k), bodies[k])).join("");
}
