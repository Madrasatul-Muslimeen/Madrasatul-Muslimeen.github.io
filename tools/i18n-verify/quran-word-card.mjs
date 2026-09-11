import assert from "node:assert/strict";
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
check("supplied dictionary links are safely escaped", () => { const html = renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), "depth"), chapter, ayah, word, context: { dictionaryUrl: 'https://example.test/?q="x"' } }); assert.match(html, /&quot;x&quot;/); assert.match(html, /noopener noreferrer/); });
check("previous and next move within the supplied occurrence order", () => { const ids = [id, quranWordOccurrenceId(1, 1, 2)]; assert.equal(moveWordCard(openWordCard(createWordCardState(), id), ids, "next").occurrenceId, ids[1]); assert.equal(moveWordCard(openWordCard(createWordCardState(), ids[1]), ids, "previous").occurrenceId, id); });
check("navigation stops safely at a boundary", () => { const state = openWordCard(createWordCardState(), id); assert.equal(moveWordCard(state, [id], "previous"), state); });
check("mismatched card data is rejected", () => assert.throws(() => renderQuranWordCard({ state: openWordCard(createWordCardState(), quranWordOccurrenceId(1, 1, 2)), chapter, ayah, word })));
check("closing retains selection for a later reopen", () => { const state = closeWordCard(selectWordCardLevel(openWordCard(createWordCardState(), id), "depth")); assert.equal(state.open, false); assert.equal(state.level, "depth"); });

console.log(`\n==== Persistent Quran Word Card: ${passed} passed, 0 failed ====`);
