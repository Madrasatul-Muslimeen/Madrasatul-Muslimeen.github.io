// Owner, 3 Oct 2026: "Enable a switch between known/unknown word marking
// (whatever user chooses). Marked words should be always less."
// Demo: https://claude.ai/artifact/N6iuWKx4Rg5uNNy1RAr5kD
//
// The Mark words switch (Study options -> Reading view): Fewer (auto), Known,
// Unknown. Same fixture as known-word-marks-browser.mjs: p1 knows 1:1:1 and,
// through its lemma, 1:1:2 and 1:2:2. Expected id lists are hand-written.
//   node tools/i18n-verify/mark-words-mode-browser.mjs   (from the repo root)
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

const SEED_BASE = `
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

// The words on the synthetic page (the Ⓜ markers are not words). Hand-written.
const PAGE_WORDS = [occ(1, 1), occ(1, 2), occ(1, 3), occ(1, 4), occ(2, 1), occ(2, 2), occ(2, 3), occ(2, 4), occ(3, 1), occ(3, 2)];
const P1_UNKNOWN = PAGE_WORDS.filter((o) => !P1_MUSHAF.includes(o)).sort();
// "You know" totals for p1: under half, and half or more (77,429 words).
const totalsSeed = (known) => `DATA.quranWordTotals = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", level: "wbw", known: ${known}, total: 77429, byJuz: {} }];`;

const marks = (page, cls) => page.evaluate((c) => [...document.querySelectorAll(`.hifz-word.${c}`)].map((e) => e.dataset.wordOccurrence).sort(), cls);
async function settleMarks(page, cls, n) {
  await page.waitForFunction(([c, k]) => document.querySelectorAll(`.hifz-word.${c}`).length === k, [cls, n], { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(200);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
async function pickMode(page, mode) {
  await page.evaluate((m) => document.querySelector(`[data-mark-words-mode="${m}"]`).click(), mode);
}

async function run(lang, width, known) {
  const tag = `[${lang} ${width} known=${known}]`;
  console.log(`\n=== mark words ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: SEED_BASE + totalsSeed(known) });
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (r) => r.abort("failed"));
  const { page } = await openPage(ctx, "/app/quranrevival.html");

  const landing = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWord|quranLemma/.test(r.col || "")).length);
  check(`${tag} I9: nothing read on the landing page`, landing === 0, `saw ${landing}`);

  // The control: three buttons, Fewer pressed by default, in the reader's language.
  const ctl = await page.evaluate(() => [...document.querySelectorAll("[data-mark-words-mode]")].map((b) => [b.dataset.markWordsMode, b.getAttribute("aria-pressed"), b.textContent.trim()]));
  check(`${tag} three choices, Fewer (auto) chosen by default`, ctl.length === 3 && ctl[0][0] === "fewer" && ctl[0][1] === "true" && ctl[1][1] === "false" && ctl[2][1] === "false", JSON.stringify(ctl));
  check(`${tag} the labels are in the page's language`, lang === "bn" ? ctl[0][2] === "যেগুলো কম (স্বয়ংক্রিয়)" && ctl[1][2] === "জানা" && ctl[2][2] === "অজানা" : ctl[0][2] === "Fewer (auto)" && ctl[1][2] === "Known" && ctl[2][2] === "Unknown", JSON.stringify(ctl));

  await openRead(page);
  await mushafOn(page);
  if (known < 38715) {
    await settleMarks(page, "is-known-word", 3);
    check(`${tag} Fewer, under half known: the known words are marked (green), nothing amber`, same(await marks(page, "is-known-word"), P1_MUSHAF) && same(await marks(page, "is-unknown-word"), []), JSON.stringify([await marks(page, "is-known-word"), await marks(page, "is-unknown-word")]));
  } else {
    await settleMarks(page, "is-unknown-word", P1_UNKNOWN.length);
    check(`${tag} Fewer, half or more known: the words still to learn are marked (amber), nothing green`, same(await marks(page, "is-unknown-word"), P1_UNKNOWN) && same(await marks(page, "is-known-word"), []), JSON.stringify([await marks(page, "is-unknown-word"), await marks(page, "is-known-word")]));
  }
  check(`${tag} an āyah-end marker is never marked`, await page.evaluate(() => !document.querySelector(".hifz-ayah-marker.is-known-word, .hifz-ayah-marker.is-unknown-word")));

  // Unknown: always the words still to learn.
  await pickMode(page, "unknown");
  await settleMarks(page, "is-unknown-word", P1_UNKNOWN.length);
  check(`${tag} Unknown: exactly the 7 words still to learn are amber, the 3 known ones are not`, same(await marks(page, "is-unknown-word"), P1_UNKNOWN) && same(await marks(page, "is-known-word"), []), JSON.stringify(await marks(page, "is-unknown-word")));
  const amber = await page.evaluate((id) => { const el = document.querySelector(`.hifz-word[data-word-occurrence="${id}"]`); return [getComputedStyle(el).backgroundColor, el.getAttribute("aria-label")]; }, occ(1, 3));
  check(`${tag} the amber tint is really painted, and the word says "still to learn" to a screen reader`, /rgba\(214, 140, 20|rgba\(255, 193, 94/.test(amber[0]) && (lang === "bn" ? /শেখা বাকি/.test(amber[1]) : /still to learn/.test(amber[1])), JSON.stringify(amber));
  check(`${tag} the choice is remembered on this device`, await page.evaluate(() => localStorage.getItem("mm_mark_words_mode") === "unknown"));

  // Known: always the known words.
  await pickMode(page, "known");
  await settleMarks(page, "is-known-word", 3);
  check(`${tag} Known: exactly 1:1:1, 1:1:2, 1:2:2 are green, nothing amber`, same(await marks(page, "is-known-word"), P1_MUSHAF) && same(await marks(page, "is-unknown-word"), []), JSON.stringify(await marks(page, "is-known-word")));
  const pressed = await page.evaluate(() => document.querySelector('[data-mark-words-mode="known"]').getAttribute("aria-pressed"));
  check(`${tag} the pressed button follows the choice`, pressed === "true");

  // The setting survives a reload.
  await page.reload(); await page.waitForTimeout(800);
  check(`${tag} after a reload the Known choice is still pressed`, await page.evaluate(() => document.querySelector('[data-mark-words-mode="known"]').getAttribute("aria-pressed") === "true"));
  const writes = await page.evaluate(() => (window.__stubWriteData || []).length);
  check(`${tag} the switch writes nothing to the database`, writes === 0, `writes=${writes}`);
  await ctx.close();
}

for (const lang of ["en", "bn"]) {
  await run(lang, 390, 1200);
  await run(lang, 1280, 40000);
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
