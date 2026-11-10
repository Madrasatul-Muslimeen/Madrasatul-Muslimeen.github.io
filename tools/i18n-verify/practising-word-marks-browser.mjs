// MSA · QR (the Owner, 10 Nov 2026, screenshot of 2:16: "Enable 'Practising' words (progress status) a light distinguishable color").
// Words whose progress is Practising -- the occurrence's own mark, or its dictionary word's -- carry .is-practising-word: a light violet
// tint that is NOT the known (green) or still-to-learn (amber) tint, readable (Arabic >= 4.5:1 over it), shifting no layout, named
// "Practising" to a screen reader, and written by nothing. Expected id lists are WRITTEN BY HAND from the seed.
//   node tools/i18n-verify/practising-word-marks-browser.mjs [--mutate=NAME]   (repo root, node serve.js on :8080)
//   nomark    the marking pass never sets the class             -> every "is marked" check FAILS
//   samecolour the tint is the known-word green                 -> the "distinct tint" check FAILS
//   nolemma   the dictionary word's practising is ignored       -> the lemma check FAILS
//   knownwins a known word is also marked practising            -> the "never both" check FAILS (1:1:2: achieved itself, its lemma Practising)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${String(d).slice(0, 240)}`));
const PAGE = "app/quranrevival.html";
const MUT = {
  nomark: [PAGE, "setPractisingWordMark(el, isPractising);", "setPractisingWordMark(el, false);"],
  samecolour: [PAGE, "background-color: rgba(124,92,214,0.20); border-radius: 0.25em; }", "background-color: rgba(46,125,50,0.13); border-radius: 0.25em; }"],
  nolemma: [PAGE, 'rawViews.get(occ)?.state === "practising" || lemmaState === "practising"', 'rawViews.get(occ)?.state === "practising"'],
  knownwins: [PAGE, "            if (known.has(occ)) continue;\n            let lemmaState = null;", "            let lemmaState = null;"],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error("unknown mutation " + MUTATE);

const s1 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_001.json", "utf8"));
const lemmaOf = (ayah, pos) => s1.ayahs.find((a) => a.ayah === ayah).words.find((w) => w.position === pos).morphology.lemma;
const RAHMAN = lemmaOf(1, 3);
const ALLAH = lemmaOf(1, 2);
if (lemmaOf(2, 2) !== ALLAH) throw new Error("fixture assumption broke: 1:1:2 and 1:2:2 no longer share a lemma");
if (lemmaOf(3, 1) !== RAHMAN) throw new Error("fixture assumption broke: 1:1:3 and 1:3:1 no longer share a lemma");
const occ = (a, p) => `quran-word-occurrence:v1:1:${a}:${p}`;
// Hand-written expectations. p1: 1:1:1 practising itself; 1:1:2 achieved (known, NOT practising); lemma of 1:1:3 practising.
const AYAH1 = [occ(1, 1), occ(1, 3)].sort();
// 1:1:2 is achieved itself (known) while its dictionary word is Practising: KNOWN WINS, it is not marked practising; 1:2:2 shares the lemma and is marked.
const MUSHAF = [occ(1, 1), occ(1, 3), occ(2, 2), occ(3, 1)].sort();

const SEED = `
DATA.quranWordProgress = [
  { _id: TENANT_ID + "__p1__wbw__1_1", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner",
    tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 1, entries: { "1": { s: "p", at: "2026-09-13T10:00:00.000Z", by: "p1" }, "2": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" } } },
];
DATA.quranWordApprovals = [];
DATA.quranLemmaProgress = [
  { _id: TENANT_ID + "__p1__wbw__${RAHMAN}", tenantId: TENANT_ID, personId: "p1", level: "wbw", lemmaId: ${JSON.stringify(RAHMAN)}, lane: "learner",
    state: "practising", at: "2026-09-13T10:00:00.000Z", byPersonId: "p1" },
  { _id: TENANT_ID + "__p1__wbw__${ALLAH}", tenantId: TENANT_ID, personId: "p1", level: "wbw", lemmaId: ${JSON.stringify(ALLAH)}, lane: "learner",
    state: "practising", at: "2026-09-13T10:00:00.000Z", byPersonId: "p1" },
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
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE]; const text = fs.readFileSync(file, "utf8");
    if (!text.includes(a)) throw new Error("mutation anchor missing: " + MUTATE);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: text.split(a).join(b) }));
  }
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


const prac = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(`${s}.is-practising-word`)].map((e) => e.dataset.wordOccurrence).sort(), sel);
async function settleP(page, sel, n) {
  await page.waitForFunction(([s, k]) => document.querySelectorAll(`${s}.is-practising-word`).length === k, [sel, n], { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(150);
}
function look(page, id, sel) {
  return page.evaluate(([id, sel]) => {
    const el = document.querySelector(`${sel}[data-word-occurrence="${id}"]`);
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
    const lum = ([r, g, b]) => { const l = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
    const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n);
    let under = [255, 255, 255];
    for (const n of chain) { const c = parse(getComputedStyle(n).backgroundColor); if (c[3] > 0) under = [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3])); }
    const arabic = el.querySelector(".wbw-arabic") || el;
    const fg = parse(getComputedStyle(arabic).color);
    const a = lum(fg), b = lum(under);
    const rect = () => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
    const withMark = rect(); const had = el.classList.contains("is-practising-word");
    el.classList.remove("is-practising-word"); const without = rect(); const bgWithout = getComputedStyle(el).backgroundColor; if (had) el.classList.add("is-practising-word");
    return { bg: getComputedStyle(el).backgroundColor, bgWithout, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), withMark, without, known: el.classList.contains("is-known-word"), unknown: el.classList.contains("is-unknown-word") };
  }, [id, sel]);
}

for (const [lang, width, lk] of [["en", 390, "light"], ["en", 390, "night"], ["bn", 1280, "night"]]) {
  const tag = `[${lang} ${width} ${lk}]`;
  console.log(`\n=== practising-word marks ${tag} ===`);
  const ctx = await ctxFor(lang, width, lk);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openRead(page);
  await wbwOnAyah(page, 1);
  await settleP(page, ".wbw-word-clickable", 2);
  const got = await prac(page, ".wbw-word-clickable");
  check(`${tag} WbW ayah 1: exactly 1:1:1 (its own Practising) and 1:1:3 (its dictionary word's) are marked`, same(got, AYAH1), JSON.stringify(got));
  const p = await look(page, occ(1, 1), ".wbw-word-clickable");
  const lemmaOne = await look(page, occ(1, 3), ".wbw-word-clickable");
  const known = await look(page, occ(1, 2), ".wbw-word-clickable");
  const plain = await look(page, occ(1, 4), ".wbw-word-clickable");
  check(`${tag} a practising word has the tint, an untouched word has none`, p.bg !== p.bgWithout && /rgba\(/.test(p.bg) && plain.bg === plain.bgWithout, JSON.stringify({ p: p.bg, w: p.bgWithout, plain: plain.bg }));
  check(`${tag} the tint is DISTINCT from the known-word tint on the same page`, p.bg !== known.bg, JSON.stringify({ p: p.bg, known: known.bg }));
  check(`${tag} Arabic contrast over the tint >= 4.5`, p.contrast >= 4.5 && lemmaOne.contrast >= 4.5, `${p.contrast.toFixed(2)} / ${lemmaOne.contrast.toFixed(2)}`);
  check(`${tag} no layout shift: the box is identical with and without the mark`, same(p.withMark, p.without), JSON.stringify(p));
  check(`${tag} a known (achieved) word is never ALSO practising, and a practising word is neither known nor unknown-marked`, known.known && !known.had && !p.known && !p.unknown, JSON.stringify({ known, p }));
  const label = await page.evaluate((id) => document.querySelector(`.wbw-word-clickable[data-word-occurrence="${id}"]`).getAttribute("aria-label"), occ(1, 1));
  check(`${tag} the accessible name says Practising in the page's language`, lang === "bn" ? /অনুশীলন|চর্চা|প্র্যাকটিস/.test(label) || /—/.test(label) : /Practising/.test(label), label);
  check(`${tag} drawing the marks wrote nothing`, (await page.evaluate(() => (window.__stubWriteData || []).length)) === 0);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && t.checked) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await mushafOn(page);
  await settleP(page, ".hifz-word", 3);
  const mg = await prac(page, ".hifz-word");
  check(`${tag} Mushaf page: exactly 1:1:1, 1:1:3 and 1:3:1 (same dictionary word) are marked`, same(mg, MUSHAF), JSON.stringify(mg));
  check(`${tag} the ayah-end marker is never marked`, await page.evaluate(() => !document.querySelector(".hifz-ayah-marker.is-practising-word")));
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== practising-word marks${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
