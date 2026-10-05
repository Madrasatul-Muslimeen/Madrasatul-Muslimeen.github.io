// Decision 68 (the Owner, 5 Oct 2026, on 36:8:9 فَهُم in Basic Arabic: "Since
// this conjugation is not applicable in Basic, should have a n/a button there.
// All words of these types should have n/a button." -- asked, and answered
// "Automatic", "Basic and Depth").
//
// A word with NO dictionary word (lemma) is Not applicable at Basic and Depth,
// automatically: the card shows that line in place of the four buttons, and
// the Basic/Depth totals count only words that have a lemma: 74,122, not
// 77,429. WbW is unchanged. A mark made before the decision is not silently
// changed: the card offers "Clear the earlier mark", which writes not_started.
//
// The word: 2:4:11 هُمْ (Pronoun, no lemma), seeded Achieved at Basic. The
// control: 2:4:12 يُوقِنُونَ in the same ayah (lemma يُوقِنُ). Expected values
// are hand-written: 10000/74122 = 13.49%, 5000/74122 = 6.75%.
// en/bn at 390 and 1280. Mutations: --mutate-na (the card ignores N/A: the N/A
// checks fail) and --mutate-total (Basic/Depth back over 77,429: the total
// checks fail). Run from the repository root with serve.js.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MNA = process.argv.includes("--mutate-na"), MTOTAL = process.argv.includes("--mutate-total");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const SEED = `
DATA.quranWordProgress = [
  { _id: TENANT_ID + "__p1__basic__2_4", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner",
    tenantId: TENANT_ID, personId: "p1", level: "basic", surah: 2, ayah: 4, entries: { "11": { s: "a", at: "2026-10-01T10:00:00.000Z", by: "p1" } } },
];
DATA.quranWordApprovals = [];
DATA.quranWordTotals = [
  { _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", level: "wbw", known: 21805, total: 77429, byJuz: {} },
  { _id: TENANT_ID + "__p1__basic", tenantId: TENANT_ID, personId: "p1", level: "basic", known: 10000, total: 77429, byJuz: {} },
  { _id: TENANT_ID + "__p1__depth", tenantId: TENANT_ID, personId: "p1", level: "depth", known: 5000, total: 77429, byJuz: {} },
];
`;
async function patch(ctx, glob, from, to) {
  await ctx.route(glob, async (r) => {
    const res = await r.fetch(); const body = await res.text();
    if (!body.includes(from)) { console.log(`mutation did not apply: ${from.slice(0, 60)}`); process.exit(2); }
    await r.fulfill({ response: res, body: body.split(from).join(to) });
  });
}
const BN = "০১২৩৪৫৬৭৮৯";
const ascii = (s) => String(s ?? "").replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/,/g, "");

async function openWord(page, s, a, p, level) {
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await page.waitForTimeout(200);
  await page.evaluate(([s, a]) => {
    const ss = document.getElementById("surahSelect");
    if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); }
    setTimeout(() => { const as = document.getElementById("ayahSelect"); if (as.value !== String(a)) { as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); } }, 600);
  }, [s, a]);
  await page.waitForFunction(([s, a, p]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`), [s, a, p], { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await page.waitForSelector("#quranWordCardMount [data-word-card-level]", { timeout: 8000 }).catch(() => {});
  await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`).catch(() => {});
  await page.waitForFunction(() => { const b = document.querySelector("#quranWordCardMount [data-word-progress]"); return !!b && !/Loading|লোড হচ্ছে/.test(b.textContent); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const card = (page) => page.evaluate(() => {
  const m = document.getElementById("quranWordCardMount");
  const clear = m.querySelector(".word-progress-na-clear");
  const r = clear?.getBoundingClientRect();
  const lvl = (l) => ({ known: m.querySelector(`[data-whole-quran-level="${l}"]`)?.textContent ?? "", pct: m.querySelector(`[data-whole-quran-level-percent="${l}"]`)?.textContent ?? "" });
  return {
    buttons: m.querySelectorAll(".word-progress-states [data-word-progress-state]").length,
    na: m.querySelector("[data-word-progress-na]")?.textContent.trim() ?? "",
    clear: clear ? { text: clear.textContent.trim(), h: r.height, w: r.width, at: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === clear } : null,
    basic: lvl("basic"), depth: lvl("depth"), wbw: lvl("wbw"),
  };
});

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const tag = `${lang} ${w}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h }, extraSeedJs: SEED });
    if (MNA) await patch(ctx, "**/js/quran-word-card.js", "notApplicable: !layers.lemma })", "notApplicable: false })");
    if (MTOTAL) await patch(ctx, "**/js/quran-word-total.js", 'return level === "basic" || level === "depth" ? QURAN_LEMMA_WORD_COUNT : QURAN_TOTAL_WORD_COUNT;', "return QURAN_TOTAL_WORD_COUNT;");
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    const reach = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
    if (!reach) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(500);
    await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });

    // POSITIVE CONTROL: a word WITH a lemma keeps the four buttons at Basic.
    await openWord(page, 2, 4, 12, "basic");
    const ctl = await card(page);
    check(`${tag}: POSITIVE CONTROL -- 2:4:12 (has a dictionary word) keeps the four buttons at Basic, no N/A line`, ctl.buttons === 4 && !ctl.na, JSON.stringify(ctl));

    // The N/A word at Basic, carrying an earlier mark.
    await openWord(page, 2, 4, 11, "basic");
    const b = await card(page);
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/na-${lang}-${w}.png` });
    check(`${tag}: 2:4:11 هُمْ at Basic shows no progress buttons`, b.buttons === 0, JSON.stringify(b));
    check(`${tag}: ...and says Not applicable, in ${lang === "bn" ? "Bangla" : "English"}`, lang === "bn" ? /^প্রযোজ্য নয়/.test(b.na) : /^Not applicable/.test(b.na), b.na);
    check(`${tag}: ...offers "Clear the earlier mark" (it was marked Achieved before), a real tap target`, !!b.clear && b.clear.h >= 30 && b.clear.at && (lang === "bn" ? /আগের/.test(b.clear.text) : b.clear.text === "Clear the earlier mark"), JSON.stringify(b.clear));
    check(`${tag}: Basic total is 74,122 (only words with a dictionary word): 10,000 known = 13.49%`, /74122/.test(ascii(b.basic.known)) && /13\.49/.test(ascii(b.basic.pct)), JSON.stringify(b.basic));
    check(`${tag}: Depth total is 74,122 too: 5,000 known = 6.75%`, /74122/.test(ascii(b.depth.known)) && /6\.75/.test(ascii(b.depth.pct)), JSON.stringify(b.depth));
    check(`${tag}: WbW keeps every word: 77,429`, /77429/.test(ascii(b.wbw.known)), JSON.stringify(b.wbw));
    const before = await page.evaluate(() => (window.__stubWriteData || []).length);
    await page.click("#quranWordCardMount .word-progress-na-clear", { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    const wrote = await page.evaluate((n) => (window.__stubWriteData || []).slice(n).filter((x) => x.col === "quranWordProgress" && (x.id || "").includes("__basic__")).map((x) => JSON.stringify(x.data ?? x)), before);
    check(`${tag}: Clear writes not_started for this word at Basic`, wrote.length >= 1 && wrote.some((x) => /"entries\.11"|"11"/.test(x) && /"s":"n"/.test(x)), JSON.stringify(wrote).slice(0, 300));
    const after = await card(page);
    check(`${tag}: ...then the Clear button goes and Not applicable stays`, !after.clear && !!after.na && after.buttons === 0, JSON.stringify(after));

    // Depth: N/A, nothing to clear. WbW: unchanged.
    await page.click(`#quranWordCardMount [data-word-card-level="depth"]`).catch(() => {}); await page.waitForTimeout(900);
    const d = await card(page);
    check(`${tag}: at Depth the same word is Not applicable, with nothing to clear`, d.buttons === 0 && !!d.na && !d.clear, JSON.stringify(d));
    await page.click(`#quranWordCardMount [data-word-card-level="wbw"]`).catch(() => {}); await page.waitForTimeout(900);
    const wb = await card(page);
    check(`${tag}: at WbW the same word keeps its four buttons (every word has a meaning)`, wb.buttons === 4 && !wb.na, JSON.stringify(wb));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
