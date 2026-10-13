// PCF J23 (the Owner, 13 Oct 2026) -- each level's total is ONE sentence with a percentage circle:
//   "WbW: Achieved 12,345 and (circle) 54% of 77,777 words".
// Expected values are hand-written: known 0 = 0%, 40026 of 74122 = 54%, 74122 of 74122 = 100%.
// Run from the repository root with `node serve.js` running.
//   MUTATE=fullarc    every circle draws a full ring          -> arc checks must FAIL
//   MUTATE=twolines   restores a second (percent) paragraph   -> one-sentence checks must FAIL
//   MUTATE=nolevelattr drops data-whole-quran-level           -> selector checks must FAIL
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const SEED = `
DATA.quranWordProgress = [];
DATA.quranWordApprovals = [];
DATA.quranWordTotals = [
  { _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", level: "wbw", known: 0, total: 77429, byJuz: {} },
  { _id: TENANT_ID + "__p1__basic", tenantId: TENANT_ID, personId: "p1", level: "basic", known: 40026, total: 74122, byJuz: {} },
  { _id: TENANT_ID + "__p1__depth", tenantId: TENANT_ID, personId: "p1", level: "depth", known: 74122, total: 74122, byJuz: {} },
];
`;
const WANT = { wbw: 0, basic: 54, depth: 100 };
const NAMES = { en: { wbw: "WbW", basic: "Basic", depth: "Depth" }, bn: { wbw: "শব্দে শব্দে", basic: "প্রাথমিক", depth: "গভীরতা" } };
const BN = "০১২৩৪৫৬৭৮৯";
const ascii = (s) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
const CIRC = 2 * Math.PI * 8;

async function mutate(ctx) {
  if (!MUTATE) return;
  await ctx.route("**/js/quran-word-card.js", async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    const before = body;
    if (MUTATE === "fullarc") body = body.replace("(c * n / 100).toFixed(3)", "c.toFixed(3)");
    if (MUTATE === "twolines") body = body.replace("${sentence}</p>`;", "${sentence}</p><p class=\"word-progress-whole-quran-percent\">${pct}%</p>`;");
    if (MUTATE === "nolevelattr") body = body.replace('data-whole-quran-level="${escapeHtml(level)}">${sentence}', 'data-x="${escapeHtml(level)}">${sentence}');
    if (body === before) throw new Error("mutation did not apply: " + MUTATE);
    await route.fulfill({ response: res, body });
  });
}

async function openWord(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s && s.value !== "8") { s.value = "8"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence$=":1:7:6"]'), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":1:7:6"]')?.click());
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-whole-quran-level], #quranWordCardMount .word-progress-whole-quran"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
}

const read = (page) => page.evaluate(() => {
  const m = document.getElementById("quranWordCardMount");
  const box = m.querySelector(".word-progress-whole-quran-box");
  const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bg = box ? getComputedStyle(box).backgroundColor : null;
  const levels = {};
  for (const l of ["wbw", "basic", "depth"]) {
    const p = m.querySelector(`[data-whole-quran-level="${l}"]`);
    const svg = p?.querySelector("svg.word-progress-percent-circle");
    const arc = svg?.querySelector(".word-progress-percent-arc");
    const r = svg?.getBoundingClientRect();
    levels[l] = {
      text: p?.textContent.trim() ?? null,
      nums: p ? [...p.querySelectorAll("strong")].map((e) => e.textContent) : [],
      circle: !!svg, size: r ? [r.width, r.height] : null, label: svg?.getAttribute("aria-label") ?? null,
      dash: arc ? Number(arc.getAttribute("stroke-dasharray").split(" ")[0]) : null,
      overflow: p ? p.scrollWidth - p.clientWidth : null,
      stroke: arc ? getComputedStyle(arc).stroke : null,
    };
  }
  const gold = levels.basic.stroke, L1 = gold && bg ? lum(gold) : null, L2 = bg ? lum(bg) : null;
  return {
    levels, bg, paragraphs: box ? box.querySelectorAll("p").length : 0,
    percentParas: m.querySelectorAll(".word-progress-whole-quran-percent, [data-whole-quran-level-percent]").length,
    contrast: L1 == null ? null : (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05),
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 768, 1280]) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    await mutate(ctx);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(600);
    await openWord(page);
    const d = await read(page);
    check(`${tag} the box holds a sentence for each level, and no separate percent line`, d.paragraphs >= 3 && d.percentParas === 0 && ["wbw", "basic", "depth"].every((l) => d.levels[l].text), JSON.stringify(d.levels));
    for (const l of ["wbw", "basic", "depth"]) {
      const v = d.levels[l];
      const a = ascii(v.text ?? "");
      check(`${tag} ${l}: the sentence starts with the level name "${NAMES[lang][l]}"`, (v.text ?? "").startsWith(NAMES[lang][l]), v.text);
      check(`${tag} ${l}: the percentage ${WANT[l]}% sits in the same sentence`, new RegExp(`(^|\\D)${WANT[l]}%`).test(a), v.text);
      check(`${tag} ${l}: the circle is drawn, at least 20px, labelled "${WANT[l]}%"`, v.circle && v.size[0] >= 20 && v.size[1] >= 20 && ascii(v.label ?? "") === `${WANT[l]}%`, JSON.stringify(v));
      check(`${tag} ${l}: the arc is ${WANT[l]}% of the ring (+-0.5%)`, v.dash != null && Math.abs(v.dash - (WANT[l] / 100) * CIRC) <= CIRC * 0.005, `${v.dash} vs ${(WANT[l] / 100 * CIRC).toFixed(2)}`);
      check(`${tag} ${l}: not clipped`, v.overflow <= 0, String(v.overflow));
    }
    check(`${tag} Basic sentence groups its numbers: 40,026 of 74,122`, /40,026/.test(ascii(d.levels.basic.text ?? "")) && /74,122/.test(ascii(d.levels.basic.text ?? "")), d.levels.basic.text);
    if (lang === "en") check(`${tag} English reads exactly "Basic: Achieved 40,026 and 54% of 74,122 words"`, d.levels.basic.text === "Basic: Achieved 40,026 and 54% of 74,122 words", d.levels.basic.text);
    check(`${tag} the gold arc has contrast >= 3:1 against the card (${d.contrast?.toFixed(2)})`, d.contrast != null && d.contrast >= 3, `${d.contrast} on ${d.bg}`);
    check(`${tag} no sideways scroll on the page`, d.page <= 0, String(d.page));
    await ctx.close();
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
