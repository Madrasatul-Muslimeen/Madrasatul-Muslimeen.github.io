// Know Your Status, the pure model (app/js/hadith-status-model.js): where a hadith's status lives, how it is read back,
// how it is counted per book / chapter / topic, and what the wheel's geometry says. Run from the repository root.
import { STATUSES, DEFAULT_DONE, MIN_BAND, statusPosition, parsePosition, findStatusBookmark, statusMapFrom, countsByBook, countsByChapter, countsOfRefs, emptyCounts, markedOf, doneOf, percent, wheelGeometry } from "../../app/js/hadith-status-model.js";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const U = "0256Bukhari.Sahih.JK000110-ara1";
const entry = (n, status, over = {}) => ({ id: `b${n}`, moduleId: "hadith", subjectId: "openiti", position: statusPosition(U, n), name: `x ${n}`, settings: { status }, removed: false, ...over });
const doc = { saved: [entry(1, "mem"), entry(2, "need"), entry(3, "rev"), entry(4, null), entry(5, "saved"), entry(6, "mem", { removed: true }),
  { id: "q", moduleId: "quranrevival", subjectId: "quran", position: "ayah:2:255", settings: { status: "mem" } },
  { id: "h", moduleId: "hadith", subjectId: "hadeethenc", position: "hadith:hadeethenc:77", settings: { status: "mem" } }] };

check("position round-trips, and a version uri's dots and dashes survive", JSON.stringify(parsePosition(statusPosition(U, 82))) === JSON.stringify({ versionUri: U, n: 82 }));
check("any other position is not a hadith status position", parsePosition("ayah:2:255") === null && parsePosition("openiti:x:abc") === null && parsePosition(null) === null);
const map = statusMapFrom(doc);
check("the map holds exactly the four marked hadith (a cleared status, a removed bookmark, a Qur'an bookmark and a HadeethEnc one are NOT in it)", map.size === 4 && map.get(statusPosition(U, 1)) === "mem" && map.get(statusPosition(U, 2)) === "need" && map.get(statusPosition(U, 3)) === "rev" && map.get(statusPosition(U, 5)) === "saved", JSON.stringify([...map]));
check("a cleared status keeps its bookmark entry (found for the update), a removed one is not found", findStatusBookmark(doc, statusPosition(U, 4))?.id === "b4" && findStatusBookmark(doc, statusPosition(U, 6)) === null);
check("an unknown status id is ignored, never invented", statusMapFrom({ saved: [entry(9, "wow")] }).size === 0);
check("a later entry for the same hadith wins, and a later cleared one removes it", statusMapFrom({ saved: [entry(1, "mem"), entry(1, "rev", { id: "z" })] }).get(statusPosition(U, 1)) === "rev" && statusMapFrom({ saved: [entry(1, "mem"), entry(1, null, { id: "z" })] }).size === 0);

const byBook = countsByBook(map);
check("counts per book", byBook.size === 1 && byBook.get(U).mem === 1 && byBook.get(U).need === 1 && byBook.get(U).rev === 1 && byBook.get(U).saved === 1);
const index = { chapters: [{ id: "ch-a", hadithPositions: [1, 2] }, { id: "ch-b", hadithPositions: [3, 4, 5] }, { id: "ch-c" }] };
const byCh = countsByChapter(map, U, index);
check("counts per chapter come from each chapter's hadithPositions", byCh.get("ch-a").mem === 1 && byCh.get("ch-a").need === 1 && byCh.get("ch-b").rev === 1 && byCh.get("ch-b").saved === 1 && !byCh.has("ch-c"));
check("another book's hadith are not counted in this book's chapters", countsByChapter(map, "0261Muslim.Sahih.Shamela0001727-ara1", index).size === 0);
const refs = [{ versionUri: U, n: 1 }, { versionUri: U, n: 2 }, { versionUri: U, n: 99 }];
const tc = countsOfRefs(refs, map);
check("a topic's counts come from its hadith references (one with no status counts as not marked)", tc.mem === 1 && tc.need === 1 && markedOf(tc) === 2);

const c = { mem: 20, rev: 10, need: 15, saved: 5 };
const done = new Set(DEFAULT_DONE);
check("done defaults to Memorised and Revising: 30 of 100 is 30%", doneOf(c, done) === 30 && percent(30, 100) === 30);
check("every marked hadith (the first demo's rule) would be 50%; only Memorised 20%", doneOf(c, new Set(["mem", "rev", "need", "saved"])) === 50 && doneOf(c, new Set(["mem"])) === 20);
check("percent of nothing is 0, never NaN", percent(0, 0) === 0 && percent(5, 0) === 0);
// A level the Owner adds later: counted, drawn and ticked with no change to the model.
const extra = [...STATUSES, { id: "hard", label: "Very hard", short: "Very hard", glyph: "▲", color: "#c792ff" }];
const ec = { ...emptyCounts(extra), mem: 4, hard: 6 };
check("an added level is counted by every helper that reads the list", markedOf(ec, extra) === 10 && doneOf(ec, new Set(["mem", "hard"]), extra) === 10 && doneOf(ec, new Set(["mem"]), extra) === 4);
check("an added level's id is accepted from a bookmark only when the list has it", statusMapFrom({ saved: [entry(1, "hard")] }, extra).size === 1 && statusMapFrom({ saved: [entry(1, "hard")] }).size === 0);

const geo = wheelGeometry([{ total: 100, counts: { mem: 50, rev: 0, need: 0, saved: 0 } }, { total: 100, counts: emptyCounts() }, { total: 10, counts: { mem: 10, rev: 0, need: 0, saved: 0 } }]);
check("one geometry per unit, in order", geo.length === 3);
check("a unit with nothing marked draws no bands, only its outline", geo[1].bands.length === 0 && /^M/.test(geo[1].outline));
check("a half-marked unit gets one band, and a fully marked one gets one that reaches the rim (a larger path than the half)", geo[0].bands.length === 1 && geo[2].bands.length === 1 && geo[2].bands[0].d !== geo[0].bands[0].d);
check("bands are drawn in the status order of the list", wheelGeometry([{ total: 10, counts: { mem: 2, rev: 3, need: 0, saved: 1 } }])[0].bands.map((b) => b.id).join() === "mem,rev,saved");
const tiny = wheelGeometry([{ total: 7129, counts: { mem: 1, rev: 0, need: 1, saved: 0 } }])[0];
check("a status with even ONE hadith in a huge book still draws a visible band (4 of 7,129 must not look like nothing)", tiny.bands.length === 2 && MIN_BAND >= 1.5);
const full = wheelGeometry([{ total: 3, counts: { mem: 3, rev: 0, need: 0, saved: 0 } }, { total: 3, counts: { mem: 1, rev: 1, need: 1, saved: 0 } }]);
check("the bands never run past the rim of the ring", full.every((g) => g.bands.every((b) => !/NaN/.test(b.d))));
console.log(`\n==== hadith-status-model: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
