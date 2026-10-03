// Word card rebuild, round 4 (decision 59, #511) -- the Arabic in Depth tab:
// a legend and five light accordions, every line carrying where it comes from
// (the data / a grammar rule / a source still needed). Pure: the page fetches,
// this prints. Nothing here is generated: a line is either read off the packaged
// data, derived by a fixed written rule, or says plainly that it needs a source.
//
// Round 5 adds the Verb Conjugation section between Morphology and Naḥw.

import { partName, FORM_NAMES, personFor, TENSE_NAMES, MOOD_NAMES, VOICE_NAMES, DERIV_NAMES, SOURCE_TAGS, orderDerivedForms, PART_NAMES } from "./word-grammar-tables.js";

import { quranWordOccurrenceId } from "./quran-word-identity.js";

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Every string this tab prints that is not Arabic (I11). */
const S = {
  secRoot: { en: "Root & Word Family", bn: "মূল ও শব্দ-পরিবার" },
  secSarf: { en: "Morphology (Ṣarf)", bn: "রূপতত্ত্ব (সার্ফ)" },
  secNahw: { en: "Grammar in This Āyah (Naḥw)", bn: "এই আয়াতের ব্যাকরণ (নাহু)" },
  secChoice: { en: "Word Choice & Distinctions", bn: "শব্দচয়ন ও পার্থক্য" },
  secClassical: { en: "Classical Arabic Usage", bn: "ধ্রুপদী আরবি ব্যবহার" },
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
  iArab: { en: "What it does in the whole sentence (iʿrāb) needs the Corpus's sentence data or an approved iʿrāb book.", bn: "পুরো বাক্যে এর ভূমিকা (ইরাব) জানতে কর্পাসের বাক্য-তথ্য বা অনুমোদিত ইরাবের বই লাগবে।" },
  trioHead: { en: "This āyah uses {n} forms of the root side by side:", bn: "এই আয়াত মূলটির {n}টি রূপ পাশাপাশি ব্যবহার করেছে:" },
  formN: { en: "Form {n}", bn: "ফর্ম {n}" },
  synonyms: { en: "Near-synonym distinctions (e.g. عِلْم and مَعْرِفَة) need a recognised book such as al-ʿAskarī's al-Furūq al-Lughawiyya or al-Rāghib's al-Mufradāt.", bn: "প্রায় সমার্থক শব্দের পার্থক্য (যেমন عِلْم ও مَعْرِفَة) জানতে আল-আসকারির আল-ফুরূক আল-লুগাবিয়্যা বা আর-রাগিবের আল-মুফরাদাতের মতো স্বীকৃত বই লাগবে।" },
  classicalIntro: { en: "Attested dictionary expressions, early prose or poetry will be shown with the Arabic quotation, translation, work, author and exact page/reference.", bn: "প্রমাণিত অভিধানের বাক্যাংশ, প্রাচীন গদ্য বা কবিতা দেখানো হবে আরবি উদ্ধৃতি, অনুবাদ, গ্রন্থ, লেখক এবং সঠিক পৃষ্ঠা/সূত্রসহ।" },
  chipQuran: { en: "Qur'anic usage: {n} times, {f} forms ✓", bn: "কুরআনে ব্যবহার: {n} বার, {f}টি রূপ ✓" },
  chipLane: { en: "Classical lexicon: Lane's Lexicon link ✓", bn: "ধ্রুপদী অভিধান: লেনের অভিধানের লিংক ✓" },
  chipCorpus: { en: "Attested corpus example: needs a source", bn: "প্রমাণিত কর্পাস উদাহরণ: উৎস প্রয়োজন" },
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
  return `<div class="word-card-legend" data-word-card-legend>${["data", "rule", "needs"].map((k) => sourceTagHtml(k, lang)).join("")}</div>`;
}

/** One line of a section: its text and the tag saying where it comes from. */
function line(kind, lang, body, cls = "") {
  return `<div class="word-card-dline${cls ? ` ${cls}` : ""}" data-word-card-dline="${kind}">${sourceTagHtml(kind, lang)} ${body}</div>`;
}

const SECTIONS = ["root", "sarf", "nahw", "choice", "classical"];
const ICONS = { root: "ر", sarf: "ص", nahw: "ن", choice: "≠", classical: "ل" };
const TITLES = { root: "secRoot", sarf: "secSarf", nahw: "secNahw", choice: "secChoice", classical: "secClassical" };

function accordion(key, lang, open, body) {
  return `<details class="word-card-acc" data-word-card-sec="${key}"${open ? " open" : ""}>` +
    `<summary><span class="word-card-acc-ico" aria-hidden="true">${ICONS[key]}</span><span class="word-card-acc-t">${esc(pick(TITLES[key], lang))}</span></summary>` +
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
  irab("needs", esc(pick("iArab", lang)), "word-card-need");
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
  out.push(line("needs", lang, esc(pick("synonyms", lang)), "word-card-need"));
  return out.join("");
}

function classicalSection(word, layers, ctx) {
  const { lang, formatNumber } = ctx;
  const data = ctx.rootForms;
  const chips = [];
  const chip = (kind, text, ok) => chips.push(`<span class="word-card-c2 ${ok ? "word-card-c2-ok" : "word-card-c2-no"}" data-word-card-dline="${kind}">${esc(text)} ${sourceTagHtml(kind, lang)}</span>`);
  if (data?.forms?.length) chip("data", fill(pick("chipQuran", lang), { n: formatNumber(data.totalOccurrences), f: formatNumber(data.formCount ?? data.forms.length) }), true);
  if (layers.root) chip("data", pick("chipLane", lang), true);
  chip("needs", pick("chipCorpus", lang), false);
  const lane = layers.root ? ctx.laneUrl : null;
  return `<p class="word-card-m2" data-word-card-classical-intro>${esc(pick("classicalIntro", lang))}</p>` +
    `<div class="word-card-chips2" data-word-card-chips2>${chips.join("")}</div>` +
    (lane ? `<div class="word-card-dlinks"><a class="word-card-dlink" data-word-card-dict-link="lane" href="${esc(lane)}" target="_blank" rel="noopener noreferrer">${esc(pick("laneLink", lang))}</a></div>` : "") +
    `<p class="word-card-m3" data-word-card-classical-note>${esc(pick("noUnattributed", lang))}</p>`;
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
  const bodies = {
    root: rootSection(word, layers, features, ctx),
    sarf: sarfSection(word, layers, features, ctx),
    nahw: nahwSection(word, layers, features, ctx),
    choice: choiceSection(word, layers, features, ctx),
    classical: classicalSection(word, layers, ctx),
  };
  return depthLegendHtml(ctx.lang) + SECTIONS.map((k) => accordion(k, ctx.lang, isOpen(k), bodies[k])).join("");
}
