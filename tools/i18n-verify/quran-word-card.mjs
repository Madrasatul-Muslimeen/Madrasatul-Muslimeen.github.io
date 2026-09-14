import assert from "node:assert/strict";
import fs from "node:fs";
import { BN } from "../../app/js/i18n/bn.js";
import { quranWordOccurrenceId } from "../../app/js/quran-word-identity.js";
import { closeWordCard, createWordCardState, moveWordCard, openWordCard, renderQuranWordCard, selectWordCardLevel, WORD_CARD_POS_SEGMENTS } from "../../app/js/quran-word-card.js";

const chapter = { surahNumber: 1 };
const ayah = { ayah: 1 };
const word = { position: 1, arabic: "بِسْمِ", transliteration: "bis'mi", translation: { en: "In the name", bn: "নামে" }, morphology: { root: "سمو", lemma: "ٱسْم", pos: "Preposition + Noun" } };
const id = quranWordOccurrenceId(1, 1, 1);
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS  ${name}`); }

check("card starts closed", () => assert.equal(renderQuranWordCard({ state: createWordCardState(), chapter, ayah, word }), ""));
check("opening preserves permanent identity", () => assert.equal(openWordCard(createWordCardState(), id).occurrenceId, id));
check("WbW renders Arabic and both meanings", () => { const html = renderQuranWordCard({ state: openWordCard(createWordCardState(), id), chapter, ayah, word }); assert.match(html, /بِسْمِ/); assert.match(html, /In the name/); assert.match(html, /নামে/); });
check("three level tabs are always present", () => { const html = renderQuranWordCard({ state: openWordCard(createWordCardState(), id), chapter, ayah, word }); assert.equal((html.match(/role="tab"/g) || []).length, 3); });
check("level selection persists while occurrence stays open", () => { const state = selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"); assert.equal(state.level, "basic"); assert.equal(state.open, true); assert.equal(state.occurrenceId, id); });
check("Basic Arabic keeps root and lemma separate", () => { const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: { rootOccurrenceCount: 381 } }); assert.match(html, /سمو/); assert.match(html, /ٱسْم/); assert.match(html, /381 root-linked/); });
// UPDATED v08.21: Basic Arabic is the SUMMARY now -- the owner's own ask,
// "Basic should show the summary only; move the detailed occurrence lists out
// of Basic". So the assertion is inverted rather than dropped: Basic must list
// NO individual occurrences at all. The bounding this check used to guard has
// moved to Arabic in Depth, where one form's own occurrences are capped and
// the cap is stated on screen -- covered by the Depth checks below.
check("Basic Arabic lists no individual occurrences", () => { const refs = Array.from({ length: 25 }, (_, i) => ({ surah: 2, ayah: i + 1, position: 1 })); const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: { rootOccurrences: refs, lemmaOccurrences: refs.slice(0, 2) } }); assert.equal((html.match(/data-word-occurrence-goto/g) || []).length, 0); assert.doesNotMatch(html, /2:19:1/); });

// v08.21 -- the derived-forms summary, and the three honesty rules it carries.
// UPDATED v08.22: the fixture now carries what rootFormsFor() really returns.
// Both forms are Nouns ON PURPOSE -- two distinct written forms sharing one
// grammatical category must stay two rows, which is the owner's own rule.
const formsContext = { rootForms: { root: "سمو", totalOccurrences: 12, formCount: 2, unclassified: 1, forms: [
  { lemma: "ٱسْم", count: 8, refs: [], pos: "Noun", posCounts: [["Noun", 8]], posAmbiguous: false },
  { lemma: "سَمَآء", count: 3, refs: [], pos: "Noun", posCounts: [["Noun", 3]], posAmbiguous: false },
] } };
check("Basic Arabic lists every derived form, in order, with real counts", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: formsContext });
  assert.equal((html.match(/word-card-form-arabic/g) || []).length, 2);
  assert.ok(html.indexOf("ٱسْم") < html.indexOf("سَمَآء"), "forms must render in the order given");
  assert.match(html, /8 occurrences/); assert.match(html, /3 occurrences/);
  assert.match(html, /12 occurrences in 2 derived forms/);
});
check("an unclassified remainder is reported, never hidden", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: formsContext });
  assert.match(html, /1 occurrences of this root are not assigned to a form/);
});
// UPDATED v08.22, with the reason. v08.21 asserted that NO category is shown,
// on the reading that `morphology.pos` classifies a written token rather than
// a dictionary form. That was measured again against the whole packaged
// corpus: the raw string is a " + " chain of clitics + HEAD + pronoun, and its
// HEAD is the word's own category -- 4,416 of 4,832 lemmas then carry exactly
// one. So the category IS available and the card must show it. The check is
// inverted rather than deleted, and now also guards the thing that inverting
// it puts at risk: two forms sharing a category must not be merged.
check("each form carries the category the source actually records", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: formsContext });
  assert.equal((html.match(/word-card-form-pos-name/g) || []).length, 2);
  assert.equal((html.match(/>Noun</g) || []).length, 2);
  assert.match(html, /Each form's category is the one the packaged grammatical analysis records/);
});
check("two distinct written forms sharing a category stay two rows", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: formsContext });
  assert.equal((html.match(/word-card-form-arabic/g) || []).length, 2);
  assert.match(html, /ٱسْم/); assert.match(html, /سَمَآء/);
});
// UPDATED v08.22, with the reason. There is no longer a number to explain:
// "Form 1", "Form 2" are gone from the UI entirely, because the owner read
// them as the traditional Arabic verb forms, which they never were. So the
// check now proves the number is ABSENT rather than proving the note about it
// is present.
check("no form is presented as a numbered Arabic verb form", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: formsContext });
  assert.doesNotMatch(html, /Form 1|Form 2|রূপ 1|not the traditional Arabic verb form/);
});
check("a category the source does not record is said so, never guessed", () => {
  const ctx = { rootForms: { root: "سمو", totalOccurrences: 2, formCount: 1, unclassified: 0, forms: [{ lemma: "ٱسْم", count: 2, refs: [], pos: "", posCounts: [], posAmbiguous: false }] } };
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: ctx });
  assert.match(html, /Category not recorded/);
});
check("a form with more than one recorded category is marked, not flattened", () => {
  const ctx = { rootForms: { root: "رحم", totalOccurrences: 5, formCount: 1, unclassified: 0, forms: [{ lemma: "رَّحِيم", count: 5, refs: [], pos: "Adjective", posCounts: [["Adjective", 4], ["Noun", 1]], posAmbiguous: true }] } };
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: ctx });
  assert.match(html, /Adjective/);
  assert.match(html, /Also recorded as: Noun/);
  assert.match(html, /1 of these forms are recorded with more than one category/);
});
check("the Basic part-of-speech chain keeps every segment the source supplies", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: formsContext });
  assert.match(html, /Preposition \+ Noun/);
});
check("Depth lists the same forms and expands one of them", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "depth"), chapter, ayah, word, context: { ...formsContext, expandedForm: "ٱسْم", formOccurrences: [{ surah: 1, ayah: 1, position: 1, arabic: "بِسْمِ" }], formOccurrencesTotal: 8 } });
  assert.equal((html.match(/word-card-form-arabic/g) || []).length, 2);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /بِسْمِ/);                       // the word AS WRITTEN there
  assert.match(html, /data-word-occurrence-goto="1:1:1"/);
  assert.match(html, /Showing the first 1 of 8 occurrences/); // the cap is stated
});
check("Depth puts the occurrence section before the dictionary detail", () => {
  const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "depth"), chapter, ayah, word, context: formsContext });
  assert.ok(html.indexOf("word-card-forms") < html.indexOf("word-card-depth-rest"));
  assert.match(html, /Dictionary source unavailable/); // preserved, not dropped
});
check("missing root is reported honestly", () => { const noRoot = { ...word, morphology: { pos: "Particle" } }; const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word: noRoot }); assert.match(html, /Root unavailable/); });
check("Depth never invents dictionary or semantic data", () => { const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "depth"), chapter, ayah, word }); assert.match(html, /Semantic range not yet supplied/); assert.match(html, /Dictionary source unavailable/); });
check("supplied HTTPS dictionary links encode unsafe URL characters", () => { const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "depth"), chapter, ayah, word, context: { dictionaryUrl: 'https://example.test/?q="x"' } }); assert.match(html, /q=%22x%22/); assert.match(html, /noopener noreferrer/); });
check("non-HTTPS dictionary URL is never linked", () => { const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "depth"), chapter, ayah, word, context: { dictionaryUrl: 'javascript:alert(1)' } }); assert.doesNotMatch(html, /href=/); assert.match(html, /Dictionary source unavailable/); });
check("previous and next move within the supplied occurrence order", () => { const ids = [id, quranWordOccurrenceId(1, 1, 2)]; assert.equal(moveWordCard(openWordCard(createWordCardState(), id), ids, "next").occurrenceId, ids[1]); assert.equal(moveWordCard(openWordCard(createWordCardState(), ids[1]), ids, "previous").occurrenceId, id); });
check("navigation stops safely at a boundary", () => { const state = openWordCard(createWordCardState(), id); assert.equal(moveWordCard(state, [id], "previous"), state); });
check("mismatched card data is rejected", () => assert.throws(() => renderQuranWordCard({ state: openWordCard(createWordCardState(), quranWordOccurrenceId(1, 1, 2)), chapter, ayah, word })));
check("closing retains selection for a later reopen", () => { const state = closeWordCard(selectWordCardLevel(openWordCard(createWordCardState(), id), "depth")); assert.equal(state.open, false); assert.equal(state.level, "depth"); });

// I11 -- the card printed a dozen hardcoded English strings and the Study
// page passed it no labels at all, so a Bangla reader met an English panel.
// These assert the RENDERED text, not that a labels option merely exists.
check("every printed string follows the supplied language", () => {
  const bn = {
    cardRegion: "কুরআন শব্দ কার্ড", tablist: "আরবি শেখার স্তর",
    previous: "আগের শব্দ", next: "পরের শব্দ", close: "শব্দ কার্ড বন্ধ করুন",
    wbw: "শব্দে শব্দে", basic: "প্রাথমিক আরবি", depth: "গভীরে আরবি",
    lemma: "মূল রূপ", root: "ধাতু", partOfSpeech: "পদ", unknown: "অজানা",
    rootOccurrences: "ধাতু-সম্পর্কিত {count}টি ব্যবহার",
    lemmaOccurrences: "মূল রূপ-সম্পর্কিত {count}টি ব্যবহার",
    rootUnavailable: "অনুমোদিত তথ্যভাণ্ডারে ধাতু পাওয়া যায়নি",
    lemmaUnavailable: "অনুমোদিত তথ্যভাণ্ডারে মূল রূপ পাওয়া যায়নি",
    loadingOccurrences: "ব্যবহারসমূহ লোড হচ্ছে…",
    occurrencesUnavailable: "ব্যবহারের তালিকা পাওয়া যায়নি: {error}",
    semanticRangeMissing: "অর্থের পরিধি এখনো দেওয়া হয়নি",
    openDictionary: "অভিধানের উৎস খুলুন",
    dictionaryUnavailable: "অভিধানের উৎস পাওয়া যায়নি",
  };
  const open = openWordCard(createWordCardState(), id);
  const basic = renderQuranWordCard({ state: selectWordCardLevel(open, "basic"), chapter, ayah, word, context: { rootOccurrenceCount: 381 }, labels: bn });
  assert.match(basic, /ধাতু-সম্পর্কিত ৩81টি ব্যবহার|ধাতু-সম্পর্কিত 381টি ব্যবহার/);
  assert.match(basic, /মূল রূপ/);
  assert.doesNotMatch(basic, /Lemma|Part of speech|root-linked/);
  const depth = renderQuranWordCard({ state: selectWordCardLevel(open, "depth"), chapter, ayah, word, labels: bn });
  assert.match(depth, /অর্থের পরিধি এখনো দেওয়া হয়নি/);
  assert.doesNotMatch(depth, /Semantic range|Dictionary source unavailable/);
  const shell = renderQuranWordCard({ state: open, chapter, ayah, word, labels: bn });
  assert.match(shell, /aria-label="কুরআন শব্দ কার্ড"/);
  assert.match(shell, /শব্দে শব্দে/);
  assert.doesNotMatch(shell, /Previous word|Next word|Close word card|Arabic learning level/);
});

check("an error message is placed by the translation, not appended", () => {
  const html = renderQuranWordCard({
    state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"),
    chapter, ayah, word,
    context: { occurrencesError: "offline" },
    labels: { occurrencesUnavailable: "তালিকা পাওয়া যায়নি: {error}" },
  });
  assert.match(html, /তালিকা পাওয়া যায়নি: offline/);
  assert.doesNotMatch(html, /\{error\}/);
});

check("the page really hands the card its reader's language", () => {
  const page = fs.readFileSync(new URL("../../app/quranrevival.html", import.meta.url), "utf8");
  // UPDATED for MAP Phase 3: the call site now spreads TWO label sets --
  // wordCardLabels() plus the Phase 3 wordProgressLabels() -- so the exact
  // old literal no longer appears. What this check is really about is that
  // the page hands the card labels built from t() rather than typing English
  // at the call site, and that is asserted below, for both sets.
  assert.match(page, /labels:\s*\{[^}]*\.\.\.wordCardLabels\(\)/);
  assert.match(page, /function wordCardLabels\(\)/);
  assert.match(page, /\.\.\.wordProgressLabels\(\)/);
  assert.match(page, /function wordProgressLabels\(\)/);
  // Each label must come from t(), not a literal typed at the call site.
  const body = page.slice(page.indexOf("function wordCardLabels()"));
  const block = body.slice(0, body.indexOf("\n    }"));
  ["Quran word card", "Basic Arabic", "Arabic in Depth", "Open dictionary source"]
    .forEach((k) => assert.ok(block.includes(`t("${k}")`), `${k} is not translated at the call site`));
});

// WIDENED for MAP Phase 3 to cover the progress label set too -- a new set of
// reader-visible strings on the same card is exactly what this check exists
// to catch going untranslated (I11).
for (const fn of ["wordCardLabels", "wordProgressLabels"]) {
  check(`Bangla exists for every string ${fn}() asks for`, () => {
    const page = fs.readFileSync(new URL("../../app/quranrevival.html", import.meta.url), "utf8");
    const body = page.slice(page.indexOf(`function ${fn}()`));
    const block = body.slice(0, body.indexOf("\n    }"));
    const keys = [...block.matchAll(/t\("((?:[^"\\]|\\.)*)"\)/g)].map((m) => JSON.parse(`"${m[1]}"`));
    assert.ok(keys.length >= (fn === "wordCardLabels" ? 20 : 10), `expected the full label set, saw ${keys.length}`);
    const missing = keys.filter((k) => !BN[k]);
    assert.deepEqual(missing, [], `untranslated: ${missing.join(" | ")}`);
  });
}

// v08.22 -- the grammatical categories themselves are user-visible names (I11).
// Every one the packaged data SPELLS OUT must have Bangla; the eleven opaque
// corpus abbreviations, and the one tagging glitch, deliberately must NOT --
// naming them would mean inventing a classification the source never makes.
const OPAQUE_POS = ["RES", "PRO", "PREV", "IMPV", "EXL", "INT", "EXH", "SUR", "AVR", "EQ", "COM", "yaAsiyna"];
check("every spelled-out grammatical category has Bangla", () => {
  const named = WORD_CARD_POS_SEGMENTS.filter((c) => !OPAQUE_POS.includes(c));
  const missing = named.filter((c) => !BN[c]);
  assert.deepEqual(missing, [], `untranslated categories: ${missing.join(" | ")}`);
  assert.equal(named.length, 34);
});
check("no Bangla is invented for an abbreviation the source never expands", () => {
  const invented = OPAQUE_POS.filter((c) => BN[c]);
  assert.deepEqual(invented, [], `fabricated: ${invented.join(" | ")}`);
});
check("the segment list matches the packaged corpus exactly", () => {
  const seen = new Set();
  for (let n = 1; n <= 114; n++) {
    const file = new URL(`../../tools/quran-data-pull/output/surahs/surah_${String(n).padStart(3, "0")}.json`, import.meta.url);
    for (const a of JSON.parse(fs.readFileSync(file, "utf8")).ayahs ?? []) {
      for (const w of a.words ?? []) for (const seg of String(w.morphology?.pos ?? "").split(" + ")) if (seg.trim()) seen.add(seg.trim());
    }
  }
  assert.deepEqual([...seen].sort(), [...WORD_CARD_POS_SEGMENTS].sort());
});

// A COUNT follows the reader's digits; an IDENTIFIER never does. The card
// showed "381" on a Bangla page, against this app's own existing rule.
check("a count uses the reader's digits, references keep plain ones", () => {
  const bnDigits = (v) => String(v).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
  const html = renderQuranWordCard({
    state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"),
    chapter, ayah, word,
    context: { rootOccurrenceCount: 381, rootOccurrences: [{ surah: 2, ayah: 19, position: 4 }] },
    labels: { rootOccurrences: "ধাতু-সম্পর্কিত {count}টি ব্যবহার" },
    formatNumber: bnDigits,
  });
  assert.match(html, /ধাতু-সম্পর্কিত ৩৮১টি ব্যবহার/);
  assert.doesNotMatch(html, /381/);
  // The occurrence reference is an identifier and stays as it is.
  // UPDATED v08.20, again v08.21. v08.20 made an occurrence a real control, so
  // the reference became the button's label. v08.21 moved those occurrences
  // out of Basic into Arabic in Depth (the owner's own ask), so the reference
  // is asserted THERE now. What this check actually guards is unchanged in
  // both rounds and still asserted below: a reference keeps its plain digits
  // and is never run through the reader's number formatter, even on a Bangla
  // page rendering every count in Bengali digits.
  const depthHtml = renderQuranWordCard({
    state: selectWordCardLevel(openWordCard(createWordCardState(), id), "depth"),
    chapter, ayah, word,
    context: { rootForms: { root: "سمو", totalOccurrences: 381, formCount: 1, unclassified: 0, forms: [{ lemma: "ٱسْم", count: 381, refs: [] }] },
               expandedForm: "ٱسْم", formOccurrences: [{ surah: 2, ayah: 19, position: 4, arabic: "ٱسْمِ" }], formOccurrencesTotal: 381 },
    labels: { rootOccurrences: "ধাতু-সম্পর্কিত {count}টি ব্যবহার" },
    formatNumber: bnDigits,
  });
  assert.match(depthHtml, /data-word-occurrence-goto="2:19:4"/);
  assert.match(depthHtml, />2:19:4</);
});

check("without a formatter a count is still printed, unchanged", () => {
  const html = renderQuranWordCard({
    state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"),
    chapter, ayah, word, context: { rootOccurrenceCount: 381 },
  });
  assert.match(html, /381 root-linked/);
});

check("the page passes the app's own number formatter", () => {
  const page = fs.readFileSync(new URL("../../app/quranrevival.html", import.meta.url), "utf8");
  assert.match(page, /formatNumber:\s*num\b/);
});

console.log(`\n==== Persistent Quran Word Card: ${passed} passed, 0 failed ====`);
