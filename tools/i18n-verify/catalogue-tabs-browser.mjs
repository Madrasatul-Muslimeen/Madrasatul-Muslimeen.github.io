// 29 Sep 2026 -- the Owner, on the Catalogue page:
//   "Organise the catalogue page ... (It's getting a long tail)"
//   "The up/ down move button of approaches inside a section doesn't work. Fix."
//   "Why these are taking spaces? ... instead of placing horizontally? Same is
//    everywhere, looks odd."
//
// Rendered, in a real browser:
//   1. ▲▼ moves an Approach INSIDE A LATER SECTION. Read off what is written:
//      the handlers used to pass the Approach's position among ALL Approaches,
//      which only equals its position in its own section in section 1, so
//      anywhere else the move was silently skipped and nothing was written.
//   2. The tabs: four of them, one panel at a time, counts, the choice kept
//      across a reload, #approaches opens that tab, and a module row opens the
//      Subjects tab on that module.
//   3. Every row's action buttons sit on ONE line, in both languages, at phone
//      and PC width, and the page never scrolls sideways.
// Expected values are written out by hand from the fixture below.
//
//   node tools/i18n-verify/catalogue-tabs-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// The shared fixture's ten Quran Approaches, given real sections (as a seeded
// tenant has) in their running order 0..9:
//   section 1: memorise 0, recite 1, tajweed 2
//   section 2: listen 3, read_daily 4
//   section 3: translate 5, tafsir 6, word_by_word 7
//   section 5: reflect 8     section 7: act 9
const GROUPS = `
const G = { memorise: 1, recite: 1, tajweed: 1, listen: 2, read_daily: 2, translate: 3, tafsir: 3, word_by_word: 3, reflect: 5, act: 7 };
for (const tr of DATA.trackables) { const id = tr._id.split("__")[1]; if (G[id]) tr.group = G[id]; }
`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openCatalogue(lang, width, seed = GROUPS) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 }, extraSeedJs: seed });
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0
    && document.querySelectorAll("#subjectsBody tr").length > 0, null, { timeout: 15000 });
  return { ctx, page, errors };
}
// The order each Approach ends with: what the move wrote, or, where nothing
// was written (its number did not change), its starting order from the
// fixture. Only writes made AFTER the click count -- the page's own setup
// writes are cleared first (see press()).
const START = { memorise: 0, recite: 1, tajweed: 2, listen: 3, read_daily: 4, translate: 5, tafsir: 6, word_by_word: 7, reflect: 8, act: 9 };
const finalOrders = async (page) => {
  const written = Object.fromEntries(await page.evaluate(() => (window.__stubWriteData || [])
    .filter((w) => w.col === "trackables" && w.data && "order" in w.data)
    .map((w) => [w.id.split("__")[1], w.data.order])));
  return Object.fromEntries(Object.keys(START).map((k) => [k, k in written ? written[k] : START[k]]));
};
async function press(page, selector) {
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.click(selector);
  await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "trackables"), null, { timeout: 5000 }).catch(() => {});
}

// ------------------------------------------------------------ 1. ▲▼ in section 3
{
  console.log("\n=== ▲▼ inside a later section ===");
  const { ctx, page } = await openCatalogue("en", 1100);
  await page.click('[data-cat-tab="approaches"]');
  await page.click("#openAllSectionsBtn"); // #399: sections start collapsed; these checks click rows inside them
  await press(page, '.trkDownBtn[data-id="translate"]');
  const down = await finalOrders(page);
  // Display order after ▼ on Translate, numbered 1..10:
  // memorise 1, recite 2, tajweed 3, listen 4, read_daily 5, tafsir 6,
  // translate 7, word_by_word 8, reflect 9, act 10.
  check("▼ on Translate (first in section 3) moves it below Tafsir: Tafsir 6, Translate 7, Word by Word 8",
    down.tafsir === 6 && down.translate === 7 && down.word_by_word === 8, JSON.stringify(down));
  check("...and no other section moves (Listen 4, Read daily 5, Reflect 9)", down.listen === 4 && down.read_daily === 5 && down.reflect === 9, JSON.stringify(down));
  await ctx.close();
}
{
  const { ctx, page } = await openCatalogue("en", 1100);
  await page.click('[data-cat-tab="approaches"]');
  await page.click("#openAllSectionsBtn"); // #399
  await press(page, '.trkUpBtn[data-id="word_by_word"]');
  const up = await finalOrders(page);
  // After ▲ on Word by Word: translate 6, word_by_word 7, tafsir 8.
  check("▲ on Word by Word (last in section 3) moves it above Tafsir: Word by Word 7, Tafsir 8",
    up.word_by_word === 7 && up.tafsir === 8 && up.translate === 6, JSON.stringify(up));
  const firstDisabled = await page.$eval('.trkUpBtn[data-id="translate"]', (b) => b.disabled);
  check("▲ is disabled on the first Approach of a section", firstDisabled === true);
  await ctx.close();
}
{
  const { ctx, page } = await openCatalogue("en", 1100);
  await page.click('[data-cat-tab="approaches"]');
  await page.click("#openAllSectionsBtn"); // #399
  await press(page, '.trkDownBtn[data-id="recite"]');
  const s1 = await finalOrders(page);
  check("section 1 still works: ▼ on Recite gives Tajweed 2, Recite 3", s1.tajweed === 2 && s1.recite === 3, JSON.stringify(s1));
  await ctx.close();
}

// ------------------------------------------------------------ 2. tabs
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Tabs, appLang=${lang} ===`);
  const { ctx, page, errors } = await openCatalogue(lang, 390);
  const tabs = await page.evaluate(() => [...document.querySelectorAll("[data-cat-tab]")].map((b) => {
    const r = b.getBoundingClientRect();
    return { id: b.dataset.catTab, label: b.firstElementChild.textContent.trim(), count: b.querySelector(".cat-tab-count").textContent.trim(), h: r.height, pressed: b.getAttribute("aria-pressed") };
  }));
  check(`[${lang}] four tabs in order`, tabs.map((t) => t.id).join() === "modules,subjects,approaches,ladders", JSON.stringify(tabs.map((t) => t.id)));
  check(`[${lang}] every tab is at least 40px tall`, tabs.every((t) => t.h >= 40), JSON.stringify(tabs.map((t) => t.h)));
  const want = lang === "en"
    ? ["Modules", "Subjects", "Approaches", "Ladders & levels"]
    : ["মডিউল", "বিষয়সমূহ", "পদ্ধতিসমূহ", "ধাপ ও স্তর"];
  check(`[${lang}] tab labels read ${want.join(" / ")}`, JSON.stringify(tabs.map((t) => t.label)) === JSON.stringify(want), JSON.stringify(tabs.map((t) => t.label)));
  const approachesCount = tabs.find((t) => t.id === "approaches").count;
  check(`[${lang}] the Approaches tab counts the 10 Approaches`, approachesCount === (lang === "en" ? "10" : "১০"), approachesCount);
  check(`[${lang}] the Modules tab opens first on a first visit`, tabs[0].pressed === "true" && tabs.slice(1).every((t) => t.pressed === "false"));
  const shown = () => page.evaluate(() => ["modules", "subjects", "approaches", "ladders"].filter((n) => !document.getElementById(`catPanel-${n}`).hidden && document.getElementById(`catPanel-${n}`).getBoundingClientRect().height > 0));
  check(`[${lang}] only the Modules panel is on screen`, JSON.stringify(await shown()) === '["modules"]', JSON.stringify(await shown()));
  await page.click('[data-cat-tab="approaches"]');
  check(`[${lang}] pressing Approaches shows only the Approaches panel`, JSON.stringify(await shown()) === '["approaches"]', JSON.stringify(await shown()));
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  check(`[${lang}] after a reload the Approaches tab is still the one open`, JSON.stringify(await shown()) === '["approaches"]', JSON.stringify(await shown()));
  // A module row opens the Subjects tab on that module.
  await page.click('[data-cat-tab="modules"]');
  await page.click('#modulesBody tr[data-module-id="quranrevival"]');
  check(`[${lang}] clicking a module row opens the Subjects tab`, JSON.stringify(await shown()) === '["subjects"]', JSON.stringify(await shown()));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`[${lang}] no sideways scroll at 390px`, overflow <= 1, String(overflow));
  const real = errors.filter((e) => !/Failed to load resource: net::ERR_/.test(e));
  check(`[${lang}] no page errors`, real.length === 0, real.join("; "));
  await ctx.close();
}
{
  const ctx = await newContext(browser, { viewport: { width: 1100, height: 900 }, extraSeedJs: GROUPS });
  const { page } = await openPage(ctx, "/app/catalogue.html#ladders");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  const open = await page.evaluate(() => document.querySelector('[data-cat-tab="ladders"]').getAttribute("aria-pressed"));
  check("#ladders in the address opens the Ladders & levels tab", open === "true", open);
  await ctx.close();
}

// ------------------------------------------------------------ 3. buttons on one line
for (const lang of ["en", "bn"]) {
  for (const width of [390, 1100]) {
    console.log(`\n=== Row buttons on one line, appLang=${lang}, ${width}px ===`);
    const { ctx, page } = await openCatalogue(lang, width);
    for (const tab of ["modules", "subjects", "approaches", "ladders"]) {
      await page.click(`[data-cat-tab="${tab}"]`);
      const cells = await page.evaluate((tab) => [...document.querySelectorAll(`#catPanel-${tab} td.row-actions`)]
        .filter((td) => td.getBoundingClientRect().height > 0)
        .map((td) => {
          const tops = [...td.querySelectorAll("button")].map((b) => b.getBoundingClientRect()).filter((r) => r.height > 0).map((r) => Math.round(r.top + r.height / 2));
          return { n: tops.length, spread: tops.length ? Math.max(...tops) - Math.min(...tops) : 0 };
        }), tab);
      const withButtons = cells.filter((c) => c.n > 0);
      check(`[${lang} ${width}px] ${tab}: every row's buttons share one line (${withButtons.length} rows)`,
        (tab === "ladders" || withButtons.length > 0) && withButtons.every((c) => c.spread <= 2),
        JSON.stringify(withButtons.filter((c) => c.spread > 2).slice(0, 3)));
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`[${lang} ${width}px] the page never scrolls sideways`, overflow <= 1, String(overflow));
    if (width === 1100 && lang === "en") await page.screenshot({ path: "/tmp/claude-0/catalogue-approaches-1100.png", fullPage: false });
    await ctx.close();
  }
}

// ------------------------------------------------------------ 4. numbers close up
// The Owner's screenshot: a wheel of 40 Approaches numbered up to 42. Stored
// orders with GAPS and a removed Approach, as a tenant that has removed and
// added Approaches has: every screen must still number them 1..9.
const GAPS = GROUPS + `
const O = { memorise: 3, recite: 7, tajweed: 8, listen: 12, read_daily: 13, translate: 20, tafsir: 21, word_by_word: 41, reflect: 42, act: 50 };
for (const tr of DATA.trackables) { const id = tr._id.split("__")[1]; if (id in O) tr.order = O[id]; if (id === "tafsir") tr.status = "archived"; }
`;
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Approach numbers close up, appLang=${lang} ===`);
  const digits = (a) => a.map((n) => lang === "bn" ? String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(n));
  const want = digits([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 1100, height: 900 }, extraSeedJs: GAPS });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelectorAll(".ways-list .way-row").length > 0 && document.querySelectorAll("#wheelContainer .wheel-seg-num").length > 0, null, { timeout: 15000 });
  const r = await page.evaluate(() => ({
    wheel: [...document.querySelectorAll("#wheelContainer .wheel-seg-num")].map((e) => e.textContent.trim()),
    side: [...document.querySelectorAll(".ways-list .way-row .badge")].map((e) => e.textContent.trim()),
  }));
  check(`[${lang}] the wheel numbers its 9 Approaches 1..9 (stored orders 3..50, one removed)`, JSON.stringify(r.wheel) === JSON.stringify(want), JSON.stringify(r.wheel));
  check(`[${lang}] the Approach list beside it numbers them 1..9 too`, JSON.stringify(r.side) === JSON.stringify(want), JSON.stringify(r.side));
  const cat = await openPage(ctx, "/app/catalogue.html");
  await cat.page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  const catNums = await cat.page.evaluate(() => [...document.querySelectorAll("#trackablesBody tr[id^='trk-row-']")]
    .filter((tr) => !tr.id.includes("studied") && !tr.id.includes("practised") && !tr.id.includes("approach_"))
    .map((tr) => tr.cells[0].textContent.trim()));
  check(`[${lang}] the Catalogue's # column reads 1..9`, JSON.stringify(catNums) === JSON.stringify(want), JSON.stringify(catNums));
  await ctx.close();
}

// ------------------------------------------------------------ 5. pickers follow the tenant's sections
// Audit #384, item 3: the Study-options Approach picker (and the Note view's
// and My Status's, which share it) and Explore's Approach list grouped by the
// stored \`group\` number and printed the FIRST Approach's copied groupName.
// Now they use the tenant's own section list: a renamed section shows its new
// name, and the order is the tenant's order.
// What the Catalogue saves when the Owner moves Engagement above the first
// section and renames both: the sections are renumbered in their new order and
// every Approach's \`group\` moves with its section (saveApproachSections()).
// The copied \`groupName\` on each Approach is deliberately left STALE here --
// the old picker printed exactly that copy.
const RENAMED = `
const G = { listen: 1, read_daily: 1, memorise: 2, recite: 2, tajweed: 2, translate: 3, tafsir: 3, word_by_word: 3, reflect: 5, act: 7 };
for (const tr of DATA.trackables) { const id = tr._id.split("__")[1]; if (G[id]) tr.group = G[id]; }
DATA.tenants[0].approachSections = [
  { n: 1, name: { en: "Engagement First", bn: "সম্পৃক্ততা আগে" } },
  { n: 2, name: { en: "Preservation Renamed", bn: "সংরক্ষণ নতুন নাম" } },
  { n: 3, name: { en: "Understanding", bn: "উপলব্ধি" } },
  { n: 4, name: { en: "Applied Threads", bn: "প্রয়োগের সূত্র" } },
  { n: 5, name: { en: "Reflection", bn: "প্রতিফলন" } },
  { n: 6, name: { en: "Judgement", bn: "বিচার" } },
  { n: 7, name: { en: "Action", bn: "আমল" } },
];
`;{
  console.log("\n=== The Approach pickers follow the tenant's own sections ===");
  const ctx = await newContext(browser, { viewport: { width: 1100, height: 900 }, extraSeedJs: RENAMED });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackableSelect optgroup").length > 0, null, { timeout: 15000 });
  const groups = await page.evaluate(() => [...document.querySelectorAll("#trackableSelect optgroup")].map((g) => g.label));
  check("the Study-options picker's groups are the tenant's sections, in the tenant's order, renamed",
    JSON.stringify(groups) === JSON.stringify(["Engagement First", "Preservation Renamed", "Understanding", "Reflection", "Action"]), JSON.stringify(groups));
  const wheelFirst = await page.evaluate(() => [...document.querySelectorAll(".ways-list .way-row .badge")].slice(0, 3).map((e) => e.textContent.trim()));
  check("the wheel list is numbered from 1 in that order too (Engagement's two first)", JSON.stringify(wheelFirst) === '["1","2","3"]', JSON.stringify(wheelFirst));
  await ctx.close();
}

console.log(`\n==== Catalogue tabs, row buttons and ▲▼ (29 Sep 2026): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
