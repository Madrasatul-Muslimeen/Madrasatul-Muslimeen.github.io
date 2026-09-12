import assert from "node:assert/strict";
import fs from "node:fs";
import { BN } from "../../app/js/i18n/bn.js";
import { quranWordOccurrenceId } from "../../app/js/quran-word-identity.js";
import { closeWordCard, createWordCardState, moveWordCard, openWordCard, renderQuranWordCard, selectWordCardLevel } from "../../app/js/quran-word-card.js";

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
check("Basic Arabic renders bounded root and lemma occurrence references", () => { const refs = Array.from({ length: 25 }, (_, i) => ({ surah: 2, ayah: i + 1, position: 1 })); const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "basic"), chapter, ayah, word, context: { rootOccurrences: refs, lemmaOccurrences: refs.slice(0, 2) } }); assert.equal((html.match(/<li>/g) || []).length, 22); assert.doesNotMatch(html, /2:21:1/); });
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
  assert.match(page, /labels:\s*wordCardLabels\(\)/);
  assert.match(page, /function wordCardLabels\(\)/);
  // Each label must come from t(), not a literal typed at the call site.
  const body = page.slice(page.indexOf("function wordCardLabels()"));
  const block = body.slice(0, body.indexOf("\n    }"));
  ["Quran word card", "Basic Arabic", "Arabic in Depth", "Open dictionary source"]
    .forEach((k) => assert.ok(block.includes(`t("${k}")`), `${k} is not translated at the call site`));
});

check("Bangla exists for every card string the page asks for", () => {
  const page = fs.readFileSync(new URL("../../app/quranrevival.html", import.meta.url), "utf8");
  const body = page.slice(page.indexOf("function wordCardLabels()"));
  const block = body.slice(0, body.indexOf("\n    }"));
  const keys = [...block.matchAll(/t\("((?:[^"\\]|\\.)*)"\)/g)].map((m) => JSON.parse(`"${m[1]}"`));
  assert.ok(keys.length >= 20, `expected the full label set, saw ${keys.length}`);
  const missing = keys.filter((k) => !BN[k]);
  assert.deepEqual(missing, [], `untranslated: ${missing.join(" | ")}`);
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
  assert.match(html, /<li>2:19:4<\/li>/);
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
