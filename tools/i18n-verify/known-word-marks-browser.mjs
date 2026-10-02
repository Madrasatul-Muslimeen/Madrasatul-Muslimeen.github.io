// Issue #472 -- very light "known word" background mark on the Mushaf page and
// in Word by Word. A word is known when its occurrence is known OR its
// dictionary word (lemma) is -- owner decision A (same lemma, not root).
//
// Rendered, in a real browser, at 390 and 1280, in en and bn. Expected id
// lists are WRITTEN BY HAND from the seed (never computed by the code under
// test). Nothing here proves a write: the feature must write nothing.
//
// Fixture (real surah_001 words; lemmas read off the real file below):
//   p1  1:1:1  known individually (achieved, no confirmation needed)
//   p1  lemma of 1:1:2 (ٱللَّه) known -> 1:1:2 and 1:2:2 are marked though
//       neither was ever marked individually
//   p2  (managed child, confirmation REQUIRED) 1:2:1 achieved, NOT yet
//       approved -> must NOT be marked
//
//   node tools/i18n-verify/known-word-marks-browser.mjs   (from the repo root)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const s1 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_001.json", "utf8"));
const lemmaOf = (ayah, pos) => s1.ayahs.find((a) => a.ayah === ayah).words.find((w) => w.position === pos).morphology.lemma;
const ALLAH = lemmaOf(1, 2);
if (lemmaOf(2, 2) !== ALLAH) throw new Error("fixture assumption broke: 1:1:2 and 1:2:2 no longer share a lemma");
const RAHMAN = lemmaOf(1, 3);
if (lemmaOf(3, 1) !== RAHMAN) throw new Error("fixture assumption broke: 1:1:3 and 1:3:1 no longer share a lemma");

const occ = (a, p) => `quran-word-occurrence:v1:1:${a}:${p}`;
// Hand-written expectations.
const P1_MUSHAF = [occ(1, 1), occ(1, 2), occ(2, 2)].sort();
const P1_AYAH1 = [occ(1, 1), occ(1, 2)].sort();
const P1_AYAH2 = [occ(2, 2)].sort();

const SEED = `
DATA.quranWordProgress = [
  { _id: TENANT_ID + "__p1__wbw__1_1", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner",
    tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 1, entries: { "1": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" } } },
  { _id: TENANT_ID + "__p2__wbw__1_2", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner",
    tenantId: TENANT_ID, personId: "p2", level: "wbw", surah: 1, ayah: 2, entries: { "1": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p2" } } },
];
DATA.quranWordApprovals = [];
DATA.quranLemmaProgress = [
  { _id: TENANT_ID + "__p1__wbw__${ALLAH}", tenantId: TENANT_ID, personId: "p1", level: "wbw", lemmaId: ${JSON.stringify(ALLAH)}, lane: "learner",
    state: "achieved", at: "2026-09-13T10:00:00.000Z", byPersonId: "p1" },
];
DATA.quranLemmaApprovals = [];
`;

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
// Real Arabic glyphs so contrast is measured on real text; a short marker
// glyph per ayah, as the other Mushaf fixtures use.
const w = (a, p, g) => ({ g, loc: `1:${a}:${p}` });
const SYNTHETIC_MUSHAF = {
  "1": [{ type: "ayah", words: [
    w(1, 1, "ٱسْمِ"), w(1, 2, "ٱللَّهِ"), w(1, 3, "ٱلرَّحْمَٰنِ"), w(1, 4, "ٱلرَّحِيمِ"), w(1, 5, "Ⓜ"),
    w(2, 1, "ٱلْحَمْدُ"), w(2, 2, "لِلَّهِ"), w(2, 3, "رَبِّ"), w(2, 4, "ٱلْعَٰلَمِينَ"), w(2, 5, "Ⓜ"),
    w(3, 1, "ٱلرَّحْمَٰنِ"), w(3, 2, "ٱلرَّحِيمِ"), w(3, 3, "Ⓜ"),
  ] }],
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function ctxFor(lang, width, look) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: SEED });
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (r) => r.abort("failed"));
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  return ctx;
}

async function openRead(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
}
async function wbwOnAyah(page, ayah) {
  await page.evaluate((a) => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
    const s = document.getElementById("ayahSelect");
    if (s && s.value !== String(a)) { s.value = String(a); s.dispatchEvent(new Event("change", { bubbles: true })); }
  }, ayah);
  await page.waitForFunction((a) => !!document.querySelector(`.wbw-word-clickable[data-word-occurrence$=":1:${a}:1"]`), ayah, { timeout: 8000 });
}
async function mushafOn(page) {
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForFunction(() => !!document.querySelector(".hifz-word[data-word-occurrence]"), null, { timeout: 12000 });
}
const marked = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(`${s}.is-known-word`)].map((e) => e.dataset.wordOccurrence).sort(), sel);
async function settle(page, sel, n) {
  await page.waitForFunction(([s, k]) => document.querySelectorAll(`${s}.is-known-word`).length === k, [sel, n], { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(150);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Computed tint, contrast of the Arabic over it, and the box with/without the mark.
function measure(page, id, sel) {
  return page.evaluate(([id, sel]) => {
    const el = document.querySelector(`${sel}[data-word-occurrence="${id}"]`);
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
    const lum = ([r, g, b]) => { const l = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
    // Composite every translucent background from the root down, then the tint on top.
    const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n);
    let under = [255, 255, 255];
    for (const n of chain) { const c = parse(getComputedStyle(n).backgroundColor); if (c[3] > 0) under = [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3])); }
    const arabic = el.querySelector(".wbw-arabic") || el;
    const fg = parse(getComputedStyle(arabic).color);
    const a = lum(fg), b = lum(under);
    const rect = () => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
    const had = el.classList.contains("is-known-word");
    const withMark = rect();
    el.classList.remove("is-known-word");
    const without = rect();
    const bgWithout = getComputedStyle(el).backgroundColor;
    if (had) el.classList.add("is-known-word");
    return { bg: getComputedStyle(el).backgroundColor, bgWithout, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), withMark, without, color: getComputedStyle(arabic).color, had };
  }, [id, sel]);
}

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) for (const look of ["light", "night"]) {
  const tag = `[${lang} ${width} ${look}]`;
  console.log(`\n=== known-word marks ${tag} ===`);
  const ctx = await ctxFor(lang, width, look);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  // I9 -- nothing on the landing page reads word/lemma progress.
  const landing = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWord|quranLemma/.test(r.col || "")).length);
  check(`${tag} no word/lemma progress read before the Read view opens`, landing === 0, `saw ${landing}`);

  await openRead(page);
  await wbwOnAyah(page, 1);
  await settle(page, ".wbw-word-clickable", 2);
  const reads = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWord|quranLemma/.test(r.col || "")).length);
  check(`${tag} opening Read DID read progress (positive control for the landing check)`, reads > 0, `saw ${reads}`);
  check(`${tag} WbW ayah 1: exactly 1:1:1 (itself) and 1:1:2 (lemma) are marked`, same(await marked(page, ".wbw-word-clickable"), P1_AYAH1), JSON.stringify(await marked(page, ".wbw-word-clickable")));

  const m = await measure(page, occ(1, 2), ".wbw-word-clickable");
  const u = await measure(page, occ(1, 3), ".wbw-word-clickable");
  check(`${tag} a known word's background is the tint, an unknown word's is not`, /rgba\(/.test(m.bg) && m.bg !== m.bgWithout && u.bg === u.bgWithout && !u.had, JSON.stringify({ m: m.bg, mw: m.bgWithout, u: u.bg }));
  check(`${tag} Arabic contrast over the tint >= 4.5`, m.contrast >= 4.5, m.contrast.toFixed(2));
  check(`${tag} no layout shift: the box is identical with and without the mark`, same(m.withMark, m.without), JSON.stringify(m));
  const label = await page.evaluate((id) => document.querySelector(`.wbw-word-clickable[data-word-occurrence="${id}"]`).getAttribute("aria-label"), occ(1, 2));
  check(`${tag} the accessible name says "known" in the page's language`, lang === "bn" ? /জানা/.test(label) : /known/.test(label), label);

  await wbwOnAyah(page, 2);
  await settle(page, ".wbw-word-clickable", 1);
  check(`${tag} WbW ayah 2: only 1:2:2 (lemma, never marked itself)`, same(await marked(page, ".wbw-word-clickable"), P1_AYAH2), JSON.stringify(await marked(page, ".wbw-word-clickable")));

  // The Mushaf page.
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && t.checked) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await mushafOn(page);
  await settle(page, ".hifz-word", 3);
  check(`${tag} Mushaf page: exactly 1:1:1, 1:1:2, 1:2:2 are marked`, same(await marked(page, ".hifz-word"), P1_MUSHAF), JSON.stringify(await marked(page, ".hifz-word")));
  const mm = await measure(page, occ(1, 2), ".hifz-word");
  const mu = await measure(page, occ(1, 3), ".hifz-word");
  check(`${tag} Mushaf: tint on a known word only`, mm.bg !== mm.bgWithout && mu.bg === mu.bgWithout && !mu.had, JSON.stringify({ mm: mm.bg, mu: mu.bg }));
  check(`${tag} Mushaf: Arabic contrast over the tint >= 4.5`, mm.contrast >= 4.5, mm.contrast.toFixed(2));
  check(`${tag} Mushaf: no layout shift`, same(mm.withMark, mm.without), JSON.stringify(mm));
  check(`${tag} the ayah-end marker is never marked`, await page.evaluate(() => !document.querySelector(".hifz-ayah-marker.is-known-word")));

  if (width === 390 && look === "night") {
    // 4. Achieved on the Word card marks it, and every same-lemma word on the page, no reload.
    await page.evaluate((id) => { window.__noReload = "kept"; document.querySelector(`.hifz-word[data-word-occurrence="${id}"]`).click(); }, occ(1, 3));
    await page.waitForSelector('#quranWordCardMount [data-word-progress-state="achieved"]', { timeout: 6000 });
    await page.waitForTimeout(400);
    const writesBefore = await page.evaluate(() => (window.__stubWriteData || []).length);
    check(`${tag} drawing the marks (and opening the Word card) wrote nothing`, writesBefore === 0, `writes=${writesBefore}`);
    await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await settle(page, ".hifz-word", 5);
    const after = await marked(page, ".hifz-word");
    // UPDATED IN PLACE TWICE, 2 Oct 2026: decision 56 had ar-Raḥmān also
    // mark ar-Raḥīm; decision 58 corrected it the same day -- WbW Achieved
    // counts the SAME word only (same root, same meaning is Basic's). So the
    // expected list is back to the same lemma only. Hand-written.
    check(`${tag} Achieved on 1:1:3 marks it AND its same-lemma 1:3:1 only (never ar-Raḥīm from WbW), without reload`,
      same(after, [...P1_MUSHAF, occ(1, 3), occ(3, 1)].sort()) && await page.evaluate(() => window.__noReload === "kept"), JSON.stringify(after));
    const writes = await page.evaluate(() => (window.__stubWriteData || []).map((x) => x.col));
    check(`${tag} the only writes are the Word card's own claim (word, lemma, counters, evidence) -- none from the marks`,
      writes.length > 0 && writes.every((c) => /^quran(Word|Lemma)|^activity\//.test(c)), JSON.stringify(writes));

    // 5. Switching the selected person removes the first person's marks.
    await page.evaluate(() => { document.getElementById("wordCardClose")?.click(); document.querySelector(".quran-word-card [data-close], .word-card-close")?.click(); });
    await page.evaluate(() => { const s = document.getElementById("personSelect"); s.value = "p2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForFunction(() => document.querySelectorAll(".hifz-word.is-known-word").length === 0, null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(600);
    check(`${tag} switching to p2 removes p1's marks, and p2's pending claim (1:2:1) is NOT marked`,
      same(await marked(page, ".hifz-word"), []), JSON.stringify(await marked(page, ".hifz-word")));
    await page.evaluate(() => { const s = document.getElementById("personSelect"); s.value = "p1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(page, ".hifz-word", 5);
    // UPDATED IN PLACE TWICE (decisions 56 then 58): back to 5 -- WbW spreads to the same lemma only.
    check(`${tag} switching back to p1 brings p1's marks back`, (await marked(page, ".hifz-word")).length === 5, JSON.stringify(await marked(page, ".hifz-word")));
  }

  check(`${tag} no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran|ERR_FAILED|fonts?/i.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
