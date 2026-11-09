// MSA · QR J121 -- the Owner's Sūrah al-Wāqiʿah recording as a reciter. Run from the repository root.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RECITERS, reciterIsReady, reciterSupportsSingleAyah, reciterOffersSurah } from "../../app/js/audio-player.js";

let pass = 0, fail = 0;
function check(label, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
    pass++; console.log("PASS", label);
  } catch (e) { fail++; console.log("FAIL", label, "-", e.message); }
}

const times = JSON.parse(readFileSync("tools/quran-data-pull/output/waqiah-timestamps.json", "utf8"));
const rows = times["56"];

check("96 rows, in order, 56:1..56:96", () => {
  assert.equal(rows.length, 96);
  rows.forEach((r, i) => assert.equal(r.verse_key, `56:${i + 1}`));
});
check("every āyah has from < to, inside the 776.85 s recording", () => {
  for (const r of rows) { assert.ok(r.timestamp_from >= 0 && r.timestamp_to > r.timestamp_from, r.verse_key); assert.ok(r.timestamp_to <= 776850, r.verse_key); }
});
check("starts never go backwards (only joined pairs share a span)", () => {
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].timestamp_from >= rows[i - 1].timestamp_from, rows[i].verse_key);
});
check("the four joined pairs share ONE span, so either āyah plays both", () => {
  for (const [a, b] of [[22, 23], [28, 29], [30, 31], [93, 94]]) {
    assert.equal(rows[a - 1].timestamp_from, rows[b - 1].timestamp_from, `${a}/${b} from`);
    assert.equal(rows[a - 1].timestamp_to, rows[b - 1].timestamp_to, `${a}/${b} to`);
  }
});
check("no other neighbours share a span", () => {
  const joined = new Set([23, 29, 31, 94]);
  for (let i = 1; i < rows.length; i++) if (!joined.has(i + 1)) assert.notEqual(rows[i].timestamp_from, rows[i - 1].timestamp_from, rows[i].verse_key);
});
check("the reciter covers sūrah 56 only", () => {
  assert.equal(reciterOffersSurah("waqiah", 56), true);
  assert.equal(reciterOffersSurah("waqiah", 55), false);
  assert.equal(reciterOffersSurah("waqiah", 1), false);
  assert.equal(reciterOffersSurah("ar", 1), true, "positive control: an all-sūrah reciter is offered everywhere");
  assert.equal(reciterOffersSurah("nobody", 56), false);
});
check("its audio URL exists for 56 and for no other sūrah", () => {
  assert.ok(RECITERS.waqiah.surahUrl(56));
  assert.equal(RECITERS.waqiah.surahUrl(2), null);
});
check("it is a segmented reciter with its own timing file and no byte map", () => {
  assert.equal(RECITERS.waqiah.kind, "segmented");
  assert.ok(RECITERS.waqiah.timestampsUrl.endsWith("waqiah-timestamps.json"));
  assert.equal(RECITERS.waqiah.byteMapUrl, undefined);
});
check("the picker never offers it while the audio file is not in the repository", () => {
  const present = (() => { try { readFileSync("tools/quran-data-pull/output/audio/waqiah.webm"); return true; } catch { return false; } })();
  assert.equal(reciterIsReady("waqiah"), present);
  assert.equal(reciterSupportsSingleAyah("waqiah"), present);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
