// Issue #476 -- the Word card's Arabic in Depth tab: the Dictionary box.
//
// Rendered, in a real browser, at 390 and 1280, in en and bn, in both card looks.
// Every expected value is WRITTEN BY HAND here; none is read from the data file
// through the code under test. The one place the data file is read is the
// God/Lord sweep, which is a check ON the file itself.
//
//   node tools/i18n-verify/word-card-dictionary-browser.mjs   (from the repo root)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import { arabicToBuckwalter, buckwalterToArabic } from "../../app/js/buckwalter.js";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
// `--shots <dir>` also saves a screenshot of each Depth tab for a person to LOOK at.
const SHOTS = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : "";
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ---- buckwalter.js unit checks (hand-written pairs) -------------------------
check("buckwalter: حمد -> Hmd", arabicToBuckwalter("حمد") === "Hmd");
check("buckwalter: رحم -> rHm", arabicToBuckwalter("رحم") === "rHm");
check("buckwalter: a hamza root as the data writes it, امن -> Amn", arabicToBuckwalter("امن") === "Amn");
check("buckwalter: the inverse of BW2AR's hamza, ء -> '", arabicToBuckwalter("ء") === "'");
check("buckwalter: اله -> Alh and ربب -> rbb", arabicToBuckwalter("اله") === "Alh" && arabicToBuckwalter("ربب") === "rbb");
check("buckwalter: qwl round-trips to قول and back", buckwalterToArabic("qwl") === "قول" && arabicToBuckwalter("قول") === "qwl");
check("buckwalter: empty and missing give an empty string", arabicToBuckwalter("") === "" && arabicToBuckwalter(undefined) === "");

// ---- the data file: no God / Lord anywhere ----------------------------------
const dict = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemma-dictionary-en.json", "utf8"));
const bad = Object.entries(dict.entries).filter(([, e]) => /\bGod\b|\b[Ll]ord\b(?!s)/.test(e.m));
check("sweep: no dictionary meaning says God or Lord", bad.length === 0, JSON.stringify(bad.slice(0, 3)));
check("sweep: the file really has entries (positive control)", Object.keys(dict.entries).length > 3000);

// ---- the Word card ----------------------------------------------------------
const occ = (a, p) => `quran-word-occurrence:v1:1:${a}:${p}`;
const REQ = "lemma-dictionary-en.json";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

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
async function openWord(page, a, p) {
  await wbwOnAyah(page, a);
  await page.evaluate((id) => document.querySelector(`.wbw-word-clickable[data-word-occurrence="${id}"]`).click(), occ(a, p));
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ(a, p)}"]`, { timeout: 6000 });
}
async function depth(page) {
  await page.click('[data-word-card-level="depth"]');
  await page.waitForSelector("[data-word-card-dictionary]", { timeout: 6000 });
}
async function goDepth(page, a, p) {
  await openWord(page, a, p);
  await depth(page);
  await page.waitForFunction(() => !!document.querySelector("[data-word-card-dict-meaning], [data-word-card-dict-none]"), null, { timeout: 8000 });
}
const box = (page) => page.evaluate(() => {
  const b = document.querySelector("[data-word-card-dictionary]");
  if (!b) return null;
  const meaning = b.querySelector("[data-word-card-dict-meaning]");
  const pill = b.querySelector("[data-word-card-dict-pill]");
  const corpus = b.querySelector('[data-word-card-dict-link="corpus"]');
  const ejtaal = b.querySelector('[data-word-card-dict-link="ejtaal"]');
  const r = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { top: Math.round(q.top), h: Math.round(q.height), w: Math.round(q.width), left: Math.round(q.left), right: Math.round(q.right) }; };
  return {
    text: b.textContent,
    meaning: meaning?.textContent ?? null, meaningLang: meaning?.getAttribute("lang") ?? null,
    pill: pill?.getAttribute("data-word-card-dict-pill") ?? null, pillText: pill?.textContent ?? null,
    none: b.querySelector("[data-word-card-dict-none]")?.textContent ?? null,
    wbw: b.querySelector(".word-card-dict-wbw")?.textContent ?? null,
    wbwLang: b.querySelector(".word-card-dict-wbw")?.getAttribute("lang") ?? null,
    pending: b.querySelector("[data-word-card-dict-pending]")?.textContent ?? null,
    corpus: corpus && { href: corpus.getAttribute("href"), target: corpus.getAttribute("target"), rel: corpus.getAttribute("rel"), rect: r(corpus) },
    ejtaal: ejtaal && { href: ejtaal.getAttribute("href"), target: ejtaal.getAttribute("target"), rel: ejtaal.getAttribute("rel"), rect: r(ejtaal) },
    credit: b.querySelector(".word-card-dict-credit")?.textContent ?? "",
    wiktionary: b.querySelector(".word-card-dict-credit a")?.getAttribute("href") ?? null,
    labels: [...b.querySelectorAll(".word-card-dict-label")].map((e) => e.textContent),
    heading: b.querySelector("h4")?.textContent ?? "",
    aboveForms: (() => { const f = document.querySelector(".word-card-forms"); return !f || !!(b.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING); })(),
  };
});
// Contrast of each piece against the box's own (solid) background.
const contrast = (page) => page.evaluate(() => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
  const lum = ([r, g, b]) => { const l = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const b = document.querySelector("[data-word-card-dictionary]");
  const bg = parse(getComputedStyle(b).backgroundColor);
  const col = (e, prop = "color") => parse(getComputedStyle(e)[prop]);
  const out = {};
  out.meaning = ratio(col(b.querySelector("[data-word-card-dict-meaning]")), bg);
  out.label = ratio(col(b.querySelector(".word-card-dict-label")), bg);
  out.heading = ratio(col(b.querySelector("h4")), bg);
  out.credit = ratio(col(b.querySelector(".word-card-dict-credit")), bg);
  const pill = b.querySelector("[data-word-card-dict-pill]");
  if (pill) { out.pillText = ratio(col(pill), bg); out.pillBorder = ratio(col(pill, "borderTopColor"), bg); }
  const link = b.querySelector("[data-word-card-dict-link]");
  if (link) { out.linkText = ratio(col(link), bg); out.linkBorder = ratio(col(link, "borderTopColor"), bg); }
  return out;
});

const SEED_LOOK = (l) => { try { localStorage.setItem("mm_card_look", l); } catch {} };
const BANGLA = /[ঀ-৿]/;

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) for (const look of ["light", "night"]) {
  const tag = `[${lang} ${width} ${look}]`;
  console.log(`\n=== dictionary box ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 } });
  await ctx.addInitScript(SEED_LOOK, look);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const requests = [];
  page.on("request", (r) => { if (r.url().includes(REQ)) requests.push(r.url()); });

  check(`${tag} the dictionary file is not requested on the landing page`, requests.length === 0, JSON.stringify(requests));
  await openRead(page);
  await openWord(page, 2, 1); // ٱلْحَمْدُ
  check(`${tag} ...nor when a Word card opens on WbW`, requests.length === 0, JSON.stringify(requests));
  await page.click('[data-word-card-level="basic"]');
  await page.waitForTimeout(400);
  check(`${tag} ...nor on the Basic tab`, requests.length === 0, JSON.stringify(requests));
  await depth(page);
  await page.waitForFunction(() => !!document.querySelector("[data-word-card-dict-meaning]"), null, { timeout: 8000 });
  check(`${tag} opening Depth requests the dictionary exactly once`, requests.length === 1, JSON.stringify(requests));

  // ٱلْحَمْدُ 1:2:1
  const h = await box(page);
  check(`${tag} 1:2:1 meaning is "praise, eulogy, commendation"`, h?.meaning === "praise, eulogy, commendation", h?.meaning);
  check(`${tag} 1:2:1 has no pill`, h?.pill === null, h?.pill);
  check(`${tag} 1:2:1 the meaning is marked lang="en" on this page too`, h?.meaningLang === "en", h?.meaningLang);
  check(`${tag} 1:2:1 word-by-word line is present, in the reader's language`, lang === "bn" ? (h?.wbw === "সকল প্রশংসা" && h?.wbwLang === "bn") : (h?.wbw === "All praises and thanks" && h?.wbwLang === "en"), `${h?.wbw}|${h?.wbwLang}`);
  check(`${tag} 1:2:1 Corpus link is ...qurandictionary.jsp?q=Hmd`, h?.corpus?.href === "https://corpus.quran.com/qurandictionary.jsp?q=Hmd", h?.corpus?.href);
  check(`${tag} 1:2:1 ejtaal link is #q= + the encoded root`, h?.ejtaal?.href === "https://ejtaal.net/aa/#q=" + encodeURIComponent("حمد"), h?.ejtaal?.href);
  check(`${tag} 1:2:1 both links open a new tab safely`, [h?.corpus, h?.ejtaal].every((l) => l?.target === "_blank" && l?.rel === "noopener noreferrer"), JSON.stringify([h?.corpus?.rel, h?.ejtaal?.rel]));
  check(`${tag} 1:2:1 both links are >= 40px tall`, h?.corpus?.rect.h >= 40 && h?.ejtaal?.rect.h >= 40, JSON.stringify([h?.corpus?.rect, h?.ejtaal?.rect]));
  check(`${tag} 1:2:1 the two links sit on ONE row`, Math.abs(h?.corpus?.rect.top - h?.ejtaal?.rect.top) <= 1 && h?.corpus?.rect.right <= h?.ejtaal?.rect.left + 1, JSON.stringify([h?.corpus?.rect, h?.ejtaal?.rect]));
  check(`${tag} 1:2:1 credit names Wiktionary and links its page`, /Wiktionary|উইকশনারি/.test(h?.credit) && /^https:\/\/en\.wiktionary\.org\//.test(h?.wiktionary ?? ""), `${h?.wiktionary}`);
  check(`${tag} 1:2:1 the box is above the derived forms`, h?.aboveForms === true);
  if (lang === "bn") {
    check(`${tag} bn the labels, heading and credit are Bangla`, h.labels.every((t) => BANGLA.test(t)) && BANGLA.test(h.heading) && BANGLA.test(h.credit), JSON.stringify([h.labels, h.heading]));
    check(`${tag} bn the hand-written label texts`, h.labels[0] === "অভিধানের অর্থ (ইংরেজি)" && h.labels[1] === "এই আয়াতে (শব্দে শব্দে অর্থ)", JSON.stringify(h.labels));
    check(`${tag} bn the permission line is present`, h.pending === "বাংলা অভিধানের অর্থ: অনুমতি পেলে যুক্ত হবে", h.pending);
    check(`${tag} bn the meaning itself stays English`, !BANGLA.test(h.meaning));
  } else {
    check(`${tag} en the labels read as written, and no Bangla permission line`, h.labels[0] === "Dictionary meaning" && h.labels[1] === "In this āyah (word by word)" && h.pending === null, JSON.stringify([h.labels, h.pending]));
  }
  const c = await contrast(page);
  check(`${tag} text contrast >= 4.5 (meaning, labels, heading, credit, link text)`, c.meaning >= 4.5 && c.label >= 4.5 && c.heading >= 4.5 && c.credit >= 4.5 && c.linkText >= 4.5, JSON.stringify(c));
  check(`${tag} link border contrast >= 3`, c.linkBorder >= 3, JSON.stringify(c));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/hamd-${lang}-${width}-${look}.png` });

  // لِلَّهِ 1:2:2 -- fixed
  await goDepth(page, 2, 2);
  const f = await box(page);
  check(`${tag} 1:2:2 meaning is exactly "Allah"`, f?.meaning === "Allah", f?.meaning);
  check(`${tag} 1:2:2 carries the "fixed by us" pill`, f?.pill === "fixed" && f?.pillText === (lang === "bn" ? "নির্ধারিত" : "fixed by us"), `${f?.pill}|${f?.pillText}`);
  check(`${tag} 1:2:2 links are for root اله (Alh)`, f?.corpus?.href === "https://corpus.quran.com/qurandictionary.jsp?q=Alh" && f?.ejtaal?.href === "https://ejtaal.net/aa/#q=" + encodeURIComponent("اله"), `${f?.corpus?.href} ${f?.ejtaal?.href}`);
  check(`${tag} 1:2:2 credit is only "links open other websites" (no Wiktionary)`, !/Wiktionary|উইকশনারি/.test(f?.credit) && f?.wiktionary === null, f?.credit);
  const cf = await contrast(page);
  check(`${tag} pill text >= 4.5 and pill border >= 3`, cf.pillText >= 4.5 && cf.pillBorder >= 3, JSON.stringify(cf));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/lillahi-${lang}-${width}-${look}.png` });

  // ٱلرَّحْمَٰنِ 1:3:1 -- likely match
  await goDepth(page, 3, 1);
  const r = await box(page);
  check(`${tag} 1:3:1 carries the "likely match" pill`, r?.pill === "likely" && r?.pillText === (lang === "bn" ? "সম্ভাব্য মিল" : "likely match"), `${r?.pill}|${r?.pillText}`);
  check(`${tag} 1:3:1 meaning contains "(said of Allah)" and not "God"`, /\(said of Allah\)/.test(r?.meaning ?? "") && !/God/.test(r?.meaning ?? ""), r?.meaning);
  check(`${tag} 1:3:1 Corpus link is for rHm`, r?.corpus?.href === "https://corpus.quran.com/qurandictionary.jsp?q=rHm", r?.corpus?.href);

  // A word with NO ROOT: إِيَّاكَ 1:5:1 -- has a meaning, no links.
  await goDepth(page, 5, 1);
  const nr = await box(page);
  check(`${tag} 1:5:1 (no root) shows no links at all`, nr?.corpus === null && nr?.ejtaal === null, JSON.stringify([nr?.corpus, nr?.ejtaal]));
  check(`${tag} 1:5:1 (no root) still shows its meaning`, (nr?.meaning ?? "").length > 0, nr?.meaning);

  // A word with NO ENTRY: نَسْتَعِينُ 1:5:4.
  await goDepth(page, 5, 4);
  const ne = await box(page);
  const noneText = lang === "bn" ? "এই শব্দের অভিধানের অর্থ এখনো নেই।" : "No dictionary meaning yet for this word.";
  check(`${tag} 1:5:4 (no entry) shows the "No dictionary meaning yet" line`, ne?.none === noneText && ne?.meaning === null, `${ne?.none}|${ne?.meaning}`);
  check(`${tag} 1:5:4 (no entry) still shows its root links and the word-by-word line`, !!ne?.corpus && !!ne?.ejtaal && (ne?.wbw ?? "").length > 0);

  check(`${tag} the dictionary was requested once in total (not again for later words)`, requests.length === 1, JSON.stringify(requests));
  check(`${tag} no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran|ERR_FAILED|fonts?/i.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Word card dictionary box: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
