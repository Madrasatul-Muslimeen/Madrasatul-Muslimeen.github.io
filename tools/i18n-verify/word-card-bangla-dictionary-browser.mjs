// Decision 62 (#539) -- the Word card's Dictionary box shows the Bangla meaning
// (AQS Quraniyo Obhidhan) in Bangla. Rendered in a real browser at 320, 390, 768
// and 1280, in en and bn, on the Night and Light cards. Every expected value is
// written by hand; none is read from the data file through the code under test.
//
//   node tools/i18n-verify/word-card-bangla-dictionary-browser.mjs   (from the repo root)
//   --mutate-no-lang-gate   proves the "English never fetches it" check can fail
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const occ = (s, a, p) => `quran-word-occurrence:v1:${s}:${a}:${p}`;
const REQ = "lemma-dictionary-bn.json";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openRead(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
}
async function openWord(page, s, a, p) {
  await page.evaluate((s0) => {
    const sel = document.getElementById("surahSelect");
    if (sel && sel.value !== String(s0)) { sel.value = String(s0); sel.dispatchEvent(new Event("change", { bubbles: true })); }
  }, s);
  await page.waitForTimeout(600);
  await page.evaluate((a0) => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
    const x = document.getElementById("ayahSelect");
    if (x && x.value !== String(a0)) { x.value = String(a0); x.dispatchEvent(new Event("change", { bubbles: true })); }
  }, a);
  await page.waitForFunction((id) => !!document.querySelector(`.wbw-word-clickable[data-word-occurrence="${id}"]`), occ(s, a, p), { timeout: 8000 });
  await page.evaluate((id) => document.querySelector(`.wbw-word-clickable[data-word-occurrence="${id}"]`).click(), occ(s, a, p));
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ(s, a, p)}"]`, { timeout: 6000 });
}
async function depth(page) {
  await page.click('[data-word-card-level="depth"]');
  await page.waitForSelector("[data-word-card-dictionary]", { timeout: 6000 });
}
const box = (page) => page.evaluate(() => {
  const b = document.querySelector("[data-word-card-dictionary]");
  const bnM = b.querySelector("[data-word-card-dict-bn-meaning]");
  const more = b.querySelector("[data-word-card-dict-bn-more]");
  const page0 = b.querySelector(".word-card-dict-credit [data-word-card-dict-bn-page]");
  const en = b.querySelector("[data-word-card-dict-meaning]");
  return {
    bn: bnM?.textContent ?? null, bnLang: bnM?.getAttribute("lang") ?? null,
    none: b.querySelector("[data-word-card-dict-bn-none]")?.textContent ?? null,
    en: en?.textContent ?? null, enLang: en?.getAttribute("lang") ?? null,
    enAfterBn: !!(bnM && en && (bnM.compareDocumentPosition(en) & Node.DOCUMENT_POSITION_FOLLOWING)),
    enSmaller: !!(bnM && en && parseFloat(getComputedStyle(en).fontSize) < parseFloat(getComputedStyle(bnM).fontSize)),
    sizes: bnM && en ? [getComputedStyle(en).fontSize, getComputedStyle(bnM).fontSize] : null,
    more: more ? { summary: more.querySelector("summary").textContent, open: more.open, items: more.querySelectorAll("li").length, links: [...more.querySelectorAll("a")].map((a) => a.getAttribute("href")) } : null,
    credit: b.querySelector(".word-card-dict-credit")?.textContent ?? "",
    creditHref: page0?.getAttribute("href") ?? null, creditTarget: page0?.getAttribute("target") ?? null, creditRel: page0?.getAttribute("rel") ?? null,
    pending: b.querySelector("[data-word-card-dict-pending]")?.textContent ?? null,
    label: b.querySelector(".word-card-dict-label")?.textContent ?? "",
  };
});
const contrast = (page) => page.evaluate(() => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2]]; };
  const lum = ([r, g, b]) => { const l = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const b = document.querySelector("[data-word-card-dictionary]");
  const bg = parse(getComputedStyle(b).backgroundColor);
  const col = (e) => parse(getComputedStyle(e).color);
  const out = { meaning: ratio(col(b.querySelector("[data-word-card-dict-bn-meaning]")), bg), credit: ratio(col(b.querySelector(".word-card-dict-credit")), bg) };
  const sum = b.querySelector("[data-word-card-dict-bn-more] summary");
  if (sum) out.summary = ratio(col(sum), bg);
  const a = b.querySelector(".word-card-dict-credit a");
  if (a) out.creditLink = ratio(col(a), bg);
  return out;
});

const SEED_LOOK = (l) => { try { localStorage.setItem("mm_card_look", l); } catch {} };
const BANGLA = /[ঀ-৿]/;
const MUTATE = process.argv.includes("--mutate-no-lang-gate");

for (const lang of ["en", "bn"]) for (const width of [320, 390, 768, 1280]) for (const look of ["light", "night"]) {
  const tag = `[${lang} ${width} ${look}]`;
  console.log(`\n=== Bangla dictionary ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 } });
  await ctx.addInitScript(SEED_LOOK, look);
  if (MUTATE) await ctx.route("**/" + REQ, (r) => r.continue()); // no-op route keeps request visible
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const requests = [];
  page.on("request", (r) => { if (r.url().includes(REQ)) requests.push(r.url()); });
  if (MUTATE) await page.evaluate(() => fetch("/tools/quran-data-pull/output/lemma-dictionary-bn.json")); // simulates an ungated English fetch

  check(`${tag} the Bangla file is not requested on the landing page`, MUTATE ? requests.length === 0 : requests.length === 0, JSON.stringify(requests));
  await openRead(page);
  await openWord(page, 1, 2, 3); // رَبّ
  check(`${tag} ...nor when a Word card opens on WbW`, requests.length === 0, JSON.stringify(requests));
  await depth(page);
  await page.waitForTimeout(1200);
  if (lang === "en") {
    check(`${tag} English never fetches the Bangla file, even on Depth`, requests.length === 0, JSON.stringify(requests));
    const e = await box(page);
    check(`${tag} English box has no Bangla meaning or Bangla credit`, e.bn === null && e.none === null && e.creditHref === null && e.pending === null && /^Dictionary meaning$/.test(e.label), JSON.stringify(e));
    check(`${tag} English still shows the English meaning`, (e.en ?? "").length > 0, e.en);
    check(`${tag} no page errors`, errors.filter((x) => !/CERT|archive\.org|api\.quran|ERR_FAILED|fonts?/i.test(x)).length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
    continue;
  }
  check(`${tag} Depth in Bangla fetches the Bangla file exactly once`, requests.length === 1, JSON.stringify(requests));
  const r = await box(page);
  check(`${tag} رَبّ meaning starts "প্রতিপালক" with lang=bn`, (r.bn ?? "").startsWith("প্রতিপালক") && r.bnLang === "bn", `${r.bn}|${r.bnLang}`);
  check(`${tag} the label reads "অভিধানের অর্থ" and the old permission line is gone`, r.label === "অভিধানের অর্থ" && r.pending === null, `${r.label}|${r.pending}`);
  check(`${tag} English meaning sits below, smaller, lang=en`, r.enAfterBn && r.enSmaller && r.enLang === "en", JSON.stringify([r.enAfterBn, r.enSmaller, r.enLang, r.sizes]));
  check(`${tag} credit names কুরআনীয় অভিধান and Bangla page 76`, r.credit.includes("কুরআনীয় অভিধান") && r.credit.includes("মুহাম্মদ আবু হেনা") && r.credit.includes("৭৬"), r.credit);
  check(`${tag} credit page link is the PDF #page=76, new tab, noopener`, r.creditHref === "https://archive.org/download/mujammufahras/qab.pdf#page=76" && r.creditTarget === "_blank" && r.creditRel === "noopener noreferrer", `${r.creditHref}|${r.creditRel}`);
  check(`${tag} رَبّ (one entry) shows no "other entries" details`, r.more === null);
  const c = await contrast(page);
  check(`${tag} Bangla meaning, credit and credit link contrast >= 4.5`, c.meaning >= 4.5 && c.credit >= 4.5 && c.creditLink >= 4.5, JSON.stringify(c));
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no sideways scroll`, sw <= 0, String(sw));

  // يَوْم 1:4:2 -- three entries -> two others, closed.
  await openWord(page, 1, 4, 2); await depth(page); await page.waitForSelector("[data-word-card-dict-bn-meaning]", { timeout: 6000 });
  const m = await box(page);
  check(`${tag} يَوْم shows a closed details "এই বানানের অন্য ভুক্তি (২)" with 2 items`, m.more && m.more.open === false && m.more.summary === "এই বানানের অন্য ভুক্তি (২)" && m.more.items === 2, JSON.stringify(m.more));
  check(`${tag} each other entry links its own PDF page`, m.more && m.more.links.length === 2 && m.more.links.every((h) => /^https:\/\/archive\.org\/download\/mujammufahras\/qab\.pdf#page=\d+$/.test(h)), JSON.stringify(m.more?.links));
  const cm = await contrast(page);
  check(`${tag} details summary contrast >= 4.5`, cm.summary >= 4.5, JSON.stringify(cm));

  // 2:2:2 -- كِتَٰب (ٱلْكِتَٰبُ)
  await openWord(page, 2, 2, 2); await depth(page); await page.waitForSelector("[data-word-card-dict-bn-meaning], [data-word-card-dict-bn-none]", { timeout: 6000 });
  const k = await box(page);
  check(`${tag} كِتَٰب meaning starts "বই"`, (k.bn ?? "").startsWith("বই"), k.bn);

  // 1:2:2 -- the Allah word has no Bangla entry.
  await openWord(page, 1, 2, 2); await depth(page); await page.waitForSelector("[data-word-card-dict-bn-meaning], [data-word-card-dict-bn-none]", { timeout: 6000 });
  const n = await box(page);
  check(`${tag} a lemma with no entry shows the no-match line`, n.none === "এই শব্দের বাংলা অর্থ এখনও মেলানো যায়নি" && n.bn === null, `${n.none}|${n.bn}`);
  check(`${tag} ...no Bangla credit for it, English meaning still shown`, n.creditHref === null && !n.credit.includes("কুরআনীয় অভিধান") && (n.en ?? "").length > 0, JSON.stringify([n.credit, n.en]));
  check(`${tag} the Bangla file was requested once in total`, requests.length === 1, JSON.stringify(requests));
  check(`${tag} no page errors`, errors.filter((x) => !/CERT|archive\.org|api\.quran|ERR_FAILED|fonts?/i.test(x)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Word card Bangla dictionary: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
