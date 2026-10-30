// Dua module, build round R1 (PCF MSA J104; docs/governance/dua-module-plan.md): D01 the seven Dua groups, D02 their
// numbers, D21 a group's parts. The Dua page (app/dua-study.html) reads the file this writes:
//   tools/hadith-data-pull/output/dua/groups.json
//
// Made only from data already in the repository:
//   - the 3,126 Dua cards (output/dua/cards-*.json, made by dua-index.mjs; Arabic from OpenITI, CC BY-NC-SA 4.0), their
//     vowelled words (vowels-*.json) and their books (cards.json);
//   - Hisn al-Muslim (al-Qahtani) as typed by Abdellah Sellam: asellam/HisnElMuslim hisn.json, MIT, (c) 2021 Abdellah
//     Sellam, copied to sources/hisn-asellam.json (dua-vowels.mjs);
//   - the Qur'an text and translations already in tools/quran-data-pull/output/surahs.
//
// A Hisn al-Muslim dhikr is tied to a Dua card ONLY where dua-vowels.mjs found the card's whole dua in that dhikr word
// for word (vowels-*.json, s = "hisn:<chapter>:<dhikr>"); every tie is marked to be checked by a person.
// The Sahaba, Salaf and Ulama groups start empty: each dua there needs a checked source (J104 tick 6).
// No existing file under output/dua/ is moved or renamed (QR reads Hadith data).
//
// Usage (repository root): node tools/hadith-data-pull/dua-groups.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { duaWords, duaWordTokens } from "../../app/js/dua-words.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUA = path.join(__dirname, "output", "dua");
const HISN = path.join(__dirname, "sources", "hisn-asellam.json");
const SURAHS = path.join(__dirname, "..", "quran-data-pull", "output", "surahs");
const HADEETHENC = path.join(__dirname, "output", "hadeethenc");
const LINE_WORDS = 8;
// D05 (round R2): a HadeethEnc title is a dua's title only while it is short enough to read as one; a longer one is
// the whole hadith retold, not a title.
export const TITLE_MAX = { en: 90, bn: 110 };

// Hisn al-Muslim's 133 chapters in 15 occasions (0-based chapter positions in hisn.json), as in demo v1.04.
export const OCCASIONS = [
  ["wake", "Waking and sleeping", "ঘুম ও জাগরণ", [0, 28, 29, 30, 31]],
  ["morning", "Morning and evening", "সকাল ও সন্ধ্যা", [26, 27]],
  ["salah", "Adhān and ṣalāh", "আযান ও সালাত", [...range(14, 26), 32, 33]],
  ["worry", "Worry, distress and fear", "দুশ্চিন্তা, কষ্ট ও ভয়", range(34, 47)],
  ["home", "Home and masjid", "ঘর ও মসজিদ", range(9, 14)],
  ["wudu", "Toilet and wuḍūʾ", "শৌচাগার ও ওযু", [5, 6, 7, 8]],
  ["clothes", "Clothes", "পোশাক", [1, 2, 3, 4]],
  ["food", "Food and fasting", "খাবার ও সিয়াম", range(68, 77)],
  ["travel", "Travel and the market", "সফর ও বাজার", range(95, 106)],
  ["ill", "Illness, death and graves", "অসুস্থতা, মৃত্যু ও কবর", range(49, 61)],
  ["weather", "Rain, wind and the new moon", "বৃষ্টি, বাতাস ও নতুন চাঁদ", range(61, 68)],
  ["people", "Family and people", "পরিবার ও মানুষ", [47, 48, ...range(77, 95), ...range(108, 115)]],
  ["forgive", "Forgiveness and dhikr", "ক্ষমা প্রার্থনা ও যিকর", [107, 129, 130, 131]],
  ["hajj", "Ḥajj and ʿUmrah", "হজ্জ ও উমরাহ", range(115, 122)],
  ["other", "Other moments", "অন্যান্য সময়", [106, ...range(122, 129), 132]],
];

// The Qur'an's duas of the Prophets (demo v1.04): who, the āyah, a short title in English and Bangla.
export const PROPHETS = [
  ["Ādam and Ḥawwāʾ", "আদম ও হাওয়া", "7:23", "Forgiveness after the mistake", "ভুলের পর ক্ষমা প্রার্থনা"],
  ["Nūḥ", "নূহ", "71:28", "Forgiveness for parents and believers", "পিতা-মাতা ও মুমিনদের জন্য ক্ষমা"],
  ["Nūḥ", "নূহ", "23:29", "A blessed landing place", "বরকতময় অবতরণস্থল"],
  ["Ibrāhīm and Ismāʿīl", "ইবরাহীম ও ইসমাঈল", "2:127", "Accept this from us", "আমাদের পক্ষ থেকে কবুল করুন"],
  ["Ibrāhīm", "ইবরাহীম", "14:40", "Make me establish the prayer", "আমাকে সালাত কায়েমকারী করুন"],
  ["Ibrāhīm", "ইবরাহীম", "14:41", "Forgive me, my parents and the believers", "আমাকে, পিতা-মাতা ও মুমিনদের ক্ষমা করুন"],
  ["Ibrāhīm", "ইবরাহীম", "26:83", "Wisdom and the company of the righteous", "প্রজ্ঞা ও সৎকর্মশীলদের সঙ্গ"],
  ["Mūsā", "মূসা", "20:25", "Open my chest for me", "আমার বক্ষ প্রশস্ত করে দিন"],
  ["Mūsā", "মূসা", "28:16", "I have wronged myself", "আমি নিজের উপর জুলুম করেছি"],
  ["Mūsā", "মূসা", "28:24", "In need of whatever good You send", "আপনি যে কল্যাণই পাঠান, আমি তার মুখাপেক্ষী"],
  ["Mūsā", "মূসা", "7:151", "Forgive me and my brother", "আমাকে ও আমার ভাইকে ক্ষমা করুন"],
  ["Yūnus", "ইউনুস", "21:87", "From inside the darkness", "অন্ধকারের ভেতর থেকে"],
  ["Ayyūb", "আইয়ুব", "21:83", "Harm has touched me", "আমাকে কষ্ট স্পর্শ করেছে"],
  ["Zakariyyā", "যাকারিয়া", "3:38", "Grant me good offspring", "আমাকে পবিত্র সন্তান দান করুন"],
  ["Zakariyyā", "যাকারিয়া", "21:89", "Do not leave me alone", "আমাকে একা রাখবেন না"],
  ["Sulaymān", "সুলাইমান", "27:19", "Inspire me to be grateful", "আমাকে কৃতজ্ঞ হওয়ার তাওফীক দিন"],
  ["Sulaymān", "সুলাইমান", "38:35", "Forgive me and grant me a kingdom", "আমাকে ক্ষমা করুন ও রাজত্ব দান করুন"],
  ["Yūsuf", "ইউসুফ", "12:101", "Take me as a Muslim", "আমাকে মুসলিম অবস্থায় মৃত্যু দিন"],
  ["Lūṭ", "লূত", "26:169", "Save me and my family", "আমাকে ও আমার পরিবারকে রক্ষা করুন"],
  ["Shuʿayb", "শুআইব", "7:89", "Judge between us with truth", "আমাদের মধ্যে সত্য দিয়ে ফয়সালা করুন"],
  ["ʿĪsā", "ঈসা", "5:114", "Send down a table from heaven", "আসমান থেকে খাদ্য-ভরা দস্তরখান নাযিল করুন"],
];

function range(a, b) { return Array.from({ length: b - a }, (_, i) => a + i); }

/**
 * Pure: the first words of a dua, as its line in a list (vowelled where a checked source holds them). Where no words are
 * picked out of the narration yet, its book's chapter heading stands in, marked as a heading ({ heading }).
 */
export function duaLine(card, vowel) {
  const words = vowel?.v ?? (duaWords(card.text) ? duaWordTokens(duaWords(card.text).words) : null);
  if (!words?.length) return card.heading ? { heading: card.heading } : null;
  return words.slice(0, LINE_WORDS).join(" ") + (words.length > LINE_WORDS ? " …" : "");
}

/**
 * Pure (D05): a dua card's title, English and Bangla, from the first of its HadeethEnc hadiths whose title is short
 * enough (TITLE_MAX); null when none is. `he` maps a HadeethEnc id to { en, bn } titles.
 */
export function duaTitle(card, he) {
  const ok = (s, lang) => typeof s === "string" && s.length > 0 && s.length <= TITLE_MAX[lang];
  for (const id of card.hadeethenc ?? []) {
    const h = he.get(String(id));
    const en = cleanTitle(h?.en), bn = cleanTitle(h?.bn);
    if (ok(en, "en")) return { en, ...(ok(bn, "bn") ? { bn } : {}) };
  }
  return null;
}

/** Pure: a title without the quotation marks and the trailing comma or colon HadeethEnc's titles sometimes carry. */
export function cleanTitle(s) {
  if (typeof s !== "string") return "";
  return s.trim().replace(/^[“”‘’"'«»\s]+/u, "").replace(/[“”‘’"'«»,،:;।.\s]+$/u, "").trim();
}

function readHadeethencTitles() {
  const he = new Map();
  for (const lang of ["en", "bn"]) {
    const dir = path.join(HADEETHENC, lang);
    for (const f of fs.readdirSync(dir).filter((x) => /^cat-\d+\.json$/.test(x))) {
      for (const h of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).hadiths ?? []) {
        if (h?.title) { const e = he.get(String(h.id)) ?? {}; e[lang] ??= h.title; he.set(String(h.id), e); }
      }
    }
  }
  return he;
}

export function build() {
  const summary = JSON.parse(fs.readFileSync(path.join(DUA, "cards.json"), "utf8"));
  const cards = []; const vowels = {};
  for (let p = 1; p <= summary.files; p++) {
    for (const c of JSON.parse(fs.readFileSync(path.join(DUA, `cards-${p}.json`), "utf8")).cards) cards.push({ ...c, page: p });
    Object.assign(vowels, JSON.parse(fs.readFileSync(path.join(DUA, `vowels-${p}.json`), "utf8")).duas);
  }
  if (cards.length !== summary.cards) throw new Error(`cards: ${cards.length} read, ${summary.cards} expected`);
  // duas: one row per card in the cards' own order (most narrated first): [dua, page, places, line].
  // A line that is only the chapter heading is written as [heading, 1].
  const duas = cards.map((c) => { const l = duaLine(c, vowels[c.dua]); return [c.dua, c.page, c.members.length, l?.heading ? [l.heading, 1] : l]; });
  const places = new Map(cards.map((c) => [c.dua, c.members.length]));
  // D05: titles, { "<dua>": { en, bn? } }, for the cards HadeethEnc gives a short title. Until D03 can save titles,
  // they are written here; a dua with none shows its book's chapter heading, or only its number.
  const he = readHadeethencTitles();
  const titles = {};
  for (const c of cards) { const tt = duaTitle(c, he); if (tt) titles[c.dua] = tt; }

  // Hisn ties: "hisn:<chapter>:<dhikr>" (1-based) -> the cards whose whole dua it holds, word for word.
  const ties = {};
  for (const [n, v] of Object.entries(vowels)) if (v.s.startsWith("hisn:")) (ties[v.s.slice(5)] ??= []).push(Number(n));

  const hisn = Object.entries(JSON.parse(fs.readFileSync(HISN, "utf8")));
  if (hisn.length !== 133) throw new Error(`Hisn al-Muslim: ${hisn.length} chapters, 133 expected`);
  const seen = OCCASIONS.flatMap((o) => o[3]).sort((a, b) => a - b);
  if (seen.join() !== range(0, 133).join()) throw new Error("the occasions must hold every Hisn chapter exactly once");
  let tied = 0;
  const occasions = OCCASIONS.map(([id, en, bn, chapters]) => ({ id, en, bn,
    items: chapters.flatMap((ci) => (hisn[ci][1].Adhkar ?? []).map((d, di) => {
      const key = `${ci + 1}:${di + 1}`;
      // Several cards holding the same dua: the most narrated one is the tie.
      const card = ties[key]?.length ? [...ties[key]].sort((a, b) => places.get(b) - places.get(a) || a - b)[0] : null;
      if (card) tied++;
      // D05: a dhikr tied to a Dua card takes that card's title; every dhikr keeps its chapter as its Arabic title.
      return { h: key, chapter: hisn[ci][0], ar: d.Text, count: d.Count ?? 1, ref: d.Reference ?? "", ...(card ? { card } : {}),
        ...(card && titles[card] ? { title: titles[card] } : {}) };
    })) }));

  const books = summary.books.map((b, bi) => ({ id: b.versionUri, en: b.titleEn, ar: b.titleAr, bn: b.short.bn, short: b.short.en,
    // Every dua narrated in this book (not only those it anchors), most narrated first, with its standard number there.
    items: cards.filter((c) => c.members.some((m) => m[0] === bi))
      .map((c) => { const m = c.members.find((x) => x[0] === bi && x[2]) ?? c.members.find((x) => x[0] === bi); return [c.dua, m[2] ?? null]; }) }));

  const prophets = PROPHETS.map(([who, whoBn, ref, en, bn]) => {
    const [s, a] = ref.split(":").map(Number);
    const surah = JSON.parse(fs.readFileSync(path.join(SURAHS, `surah_${String(s).padStart(3, "0")}.json`), "utf8"));
    const ayah = surah.ayahs[a - 1];
    if (ayah?.ayah !== a) throw new Error(`āyah ${ref} not found`);
    return { ref, who: { en: who, bn: whoBn }, title: { en, bn }, surah: { en: surah.surahNameEnglish, ar: surah.surahNameArabic },
      ar: ayah.uthmaniText, en: ayah.translations.en, bn: ayah.translations.bn,
      // D07 / D14 (round R3): the āyah word by word, [Arabic, English, Bangla], for the poster and the shared text.
      words: (ayah.words ?? []).map((w) => [w.arabic, w.translation?.en ?? "", w.translation?.bn ?? ""]) };
  });

  return {
    schemaVersion: 1,
    note: "Generated by tools/hadith-data-pull/dua-groups.mjs (Dua module, rounds R1: D01, D02, D21; R2: D05 titles; R3: the Prophets' duas word by word). The Dua groups and their numbered members.",
    credits: [
      "Dua cards: Arabic from OpenITI (CC BY-NC-SA 4.0), gathered by tools/hadith-data-pull/dua-index.mjs.",
      "Hisn al-Muslim (Sa'id al-Qahtani), typed by Abdellah Sellam: github.com/asellam/HisnElMuslim, MIT licence, (c) 2021 Abdellah Sellam.",
      "Qur'an text and translations: tools/quran-data-pull.",
      "Dua titles (D05): HadeethEnc.com hadith titles where short, English and Bangla.",
    ],
    tiesNote: "A Hisn al-Muslim dhikr's card is the Dua card whose whole dua it holds word for word (dua-vowels.mjs); every tie is to be checked by a person.",
    duas,
    titles,
    groups: [
      { id: "occasions", parts: occasions },
      { id: "books", parts: books },
      { id: "prophets", items: prophets },
      { id: "rasul", items: "duas" },
      { id: "sahaba", items: [] },
      { id: "salaf", items: [] },
      { id: "ulama", items: [] },
    ],
    counts: { duas: duas.length, hisn: occasions.reduce((s, o) => s + o.items.length, 0), hisnTied: tied, prophets: prophets.length,
      titled: Object.keys(titles).length, titledBn: Object.values(titles).filter((x) => x.bn).length },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  fs.writeFileSync(path.join(DUA, "groups.json"), JSON.stringify(out));
  console.log("wrote output/dua/groups.json", out.counts, `${Math.round(fs.statSync(path.join(DUA, "groups.json")).size / 1024)} KB`);
}
