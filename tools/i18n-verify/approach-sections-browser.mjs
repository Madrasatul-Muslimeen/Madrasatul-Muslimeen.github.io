// v08.110 -- the Owner (29 Sep 2026):
//   "'Quran Approaches - 40 Ways' (number could be changed, so make it
//    editable). When a Section is renamed or added it should be added and
//    edited to the Approach list as well."
//
// Rendered, in a real browser, both languages:
//   1. Catalogue: the Approach list's heading reads the Owner's wording by
//      default, and Owner/Prime can edit it (written to the tenant document).
//   2. Catalogue: a section added in Approach Sections appears in the Approach
//      list below at once, with "No Approaches in this section yet", and a
//      section renamed there is renamed in the list as it is typed; Save
//      writes the new list.
//   3. The landing Approach list takes its headings from the tenant's own
//      section list: a renamed section reads its new name and an added,
//      still-empty section is shown with its note.
// Every expected value is written out by hand from the seeds below.
//
//   node tools/i18n-verify/approach-sections-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// The shared fixture's ten Quran trackables carry a groupName but no `group`;
// give them real section numbers, as every seeded tenant has.
const GROUPS = `
const G = { memorise: 1, recite: 1, tajweed: 1, listen: 2, read_daily: 2, translate: 3, tafsir: 3, word_by_word: 3, reflect: 5, act: 7 };
for (const tr of DATA.trackables) { const id = tr._id.split("__")[1]; if (G[id]) tr.group = G[id]; }
`;
// The tenant has taken its sections over: section 1 renamed, and a new,
// empty section 8 added.
const OWNED_SECTIONS = GROUPS + `
DATA.tenants[0].approachSections = [
  { n: 1, name: { en: "Preservation Renamed", bn: "সংরক্ষণ নতুন নাম" } },
  { n: 2, name: { en: "Engagement", bn: "সম্পৃক্ততা" } },
  { n: 3, name: { en: "Understanding", bn: "উপলব্ধি" } },
  { n: 4, name: { en: "Applied Threads", bn: "প্রয়োগের সূত্র" } },
  { n: 5, name: { en: "Reflection", bn: "প্রতিফলন" } },
  { n: 6, name: { en: "Judgement", bn: "বিচার" } },
  { n: 7, name: { en: "Action", bn: "আমল" } },
  { n: 8, name: { en: "Brand New Section", bn: "একদম নতুন বিভাগ" } },
];
`;
const DEFAULT_TITLE = { en: "Quran Approaches - 40 Ways", bn: "কুরআনের পদ্ধতি - ৪০টি উপায়" };
const EMPTY_NOTE = { en: "No Approaches in this section yet.", bn: "এই বিভাগে এখনো কোনো পদ্ধতি নেই।" };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// ---------------------------------------------------------------- Catalogue
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Catalogue: heading and sections, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 390, height: 844 }, extraSeedJs: GROUPS });
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  // 29 Sep 2026: the Catalogue is in tabs now (Modules, Subjects, Approaches,
  // Ladders & levels), so the Approach controls this suite checks sit behind
  // the Approaches tab. Updated in place: open that tab first.
  await page.click('[data-cat-tab="approaches"]');

  const head = await page.evaluate(() => {
    const b = document.getElementById("editApproachListTitleBtn").getBoundingClientRect();
    return { text: document.getElementById("approachListTitle").textContent.trim(), btnH: b.height, btnShown: b.width > 0 };
  });
  check(`[${lang}] the Approach list's heading reads the Owner's wording by default`, head.text === DEFAULT_TITLE[lang], head.text);
  check(`[${lang}] the owner sees an Edit heading button, >=40px tall`, head.btnShown && head.btnH >= 40, JSON.stringify(head));

  await page.click("#editApproachListTitleBtn");
  await page.fill("#approachListTitleEn", "Quran Approaches - 41 Ways");
  await page.fill("#approachListTitleBn", "কুরআনের পদ্ধতি - ৪১টি উপায়");
  await page.click("#saveApproachListTitleBtn");
  await page.waitForTimeout(400);
  const titleWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "tenants" && w.data?.approachListTitle).pop());
  check(`[${lang}] Save writes the heading to the tenant document, both languages`,
    titleWrite?.data?.approachListTitle?.en === "Quran Approaches - 41 Ways" && titleWrite?.data?.approachListTitle?.bn === "কুরআনের পদ্ধতি - ৪১টি উপায়", JSON.stringify(titleWrite));
  const after = await page.evaluate(() => ({ text: document.getElementById("approachListTitle").textContent.trim(), formHidden: document.getElementById("approachListTitleForm").hidden }));
  check(`[${lang}] the heading shows the new wording and the form closes`,
    after.text === (lang === "en" ? "Quran Approaches - 41 Ways" : "কুরআনের পদ্ধতি - ৪১টি উপায়") && after.formHidden, JSON.stringify(after));

  const headings = () => page.evaluate(() => [...document.querySelectorAll("#trackablesBody tr.trk-section-heading strong")].map((s) => s.textContent.trim()));
  const emptyRows = () => page.evaluate(() => [...document.querySelectorAll("#trackablesBody tr.trk-section-empty")].map((r) => r.textContent.trim()));

  // Add a section and name it: it appears in the Approach list below at once.
  await page.click("#addSectionBtn");
  await page.fill('.secNameInput[data-i="7"][data-lang="en"]', "Brand New Section");
  await page.fill('.secNameInput[data-i="7"][data-lang="bn"]', "একদম নতুন বিভাগ");
  const h1 = await headings();
  const newName = lang === "en" ? "Brand New Section" : "একদম নতুন বিভাগ";
  check(`[${lang}] an added section appears in the Approach list at once, named as typed`, h1.includes(newName), JSON.stringify(h1));
  const e1 = await emptyRows();
  check(`[${lang}] ...with "No Approaches in this section yet" under it`, e1.some((x) => x.startsWith(EMPTY_NOTE[lang])), JSON.stringify(e1));

  // Rename section 1 as it is typed.
  await page.fill('.secNameInput[data-i="0"][data-lang="en"]', "Building Foundation (edited)");
  await page.fill('.secNameInput[data-i="0"][data-lang="bn"]', "ভিত্তি গড়া (সম্পাদিত)");
  const h2 = await headings();
  const renamed = lang === "en" ? "Building Foundation (edited)" : "ভিত্তি গড়া (সম্পাদিত)";
  check(`[${lang}] a section renamed above is renamed in the Approach list as it is typed`, h2[0] === renamed, JSON.stringify(h2));
  const firstRows = await page.evaluate(() => {
    const out = []; let inFirst = false;
    for (const tr of document.querySelectorAll("#trackablesBody tr")) {
      if (tr.classList.contains("trk-section-heading")) { if (inFirst) break; inFirst = true; continue; }
      if (inFirst && !tr.classList.contains("trk-section-empty")) out.push(tr.dataset.id || tr.querySelector("[data-id]")?.dataset.id || tr.cells[1]?.textContent.trim());
    }
    return out.length;
  });
  check(`[${lang}] section 1 still holds its 3 Approaches (memorise, recite, tajweed) under the new name`, firstRows === 3, String(firstRows));

  await page.click("#saveSectionsBtn");
  await page.waitForTimeout(600);
  const secWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "tenants" && w.data?.approachSections).pop());
  const saved = secWrite?.data?.approachSections ?? [];
  check(`[${lang}] Save sections writes 8 sections, the new one last and the renamed first`,
    saved.length === 8 && saved[7]?.name?.en === "Brand New Section" && saved[0]?.name?.en === "Building Foundation (edited)", JSON.stringify(saved.map((x) => x.name?.en)));
  const trWrites = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "trackables" && w.data?.groupName?.en === "Building Foundation (edited)").map((w) => w.id).sort());
  check(`[${lang}] ...and carries the new name onto exactly section 1's three Approaches`,
    JSON.stringify(trWrites) === JSON.stringify(["t1__memorise", "t1__recite", "t1__tajweed"]), JSON.stringify(trWrites));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`[${lang}] no sideways scroll at 390px`, overflow <= 1, String(overflow));
  const real = errors.filter((e) => !/Failed to load resource: net::ERR_/.test(e));
  check(`[${lang}] no page errors`, real.length === 0, real.join("; "));
  await ctx.close();
}

// ------------------------------------------------------------ Landing list
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Landing Approach list follows the tenant's sections, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 1100, height: 900 }, extraSeedJs: OWNED_SECTIONS });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelectorAll("#wheelSidebar .way-row, .ways-list .way-row").length > 0, null, { timeout: 15000 });
  const list = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".ways-list > *")) {
      if (el.classList.contains("ways-group")) out.push({ h: el.textContent.trim(), rows: 0, empty: "" });
      else if (el.classList.contains("way-row")) { if (out.length) out[out.length - 1].rows++; }
      else if (el.classList.contains("ways-group-empty")) { if (out.length) out[out.length - 1].empty = el.textContent.trim(); }
    }
    return out;
  });
  const expect = lang === "en"
    ? [["Preservation Renamed", 3], ["Engagement", 2], ["Understanding", 3], ["Reflection", 1], ["Action", 1], ["Brand New Section", 0]]
    : [["সংরক্ষণ নতুন নাম", 3], ["সম্পৃক্ততা", 2], ["উপলব্ধি", 3], ["প্রতিফলন", 1], ["আমল", 1], ["একদম নতুন বিভাগ", 0]];
  // Sections 4 and 6 hold no Approach in this seed and are ALSO shown empty,
  // in their own place.
  const expectAll = lang === "en"
    ? [["Preservation Renamed", 3], ["Engagement", 2], ["Understanding", 3], ["Applied Threads", 0], ["Reflection", 1], ["Judgement", 0], ["Action", 1], ["Brand New Section", 0]]
    : [["সংরক্ষণ নতুন নাম", 3], ["সম্পৃক্ততা", 2], ["উপলব্ধি", 3], ["প্রয়োগের সূত্র", 0], ["প্রতিফলন", 1], ["বিচার", 0], ["আমল", 1], ["একদম নতুন বিভাগ", 0]];
  check(`[${lang}] the landing list's headings are the tenant's own sections, in order, each with its Approaches`,
    JSON.stringify(list.map((x) => [x.h, x.rows])) === JSON.stringify(expectAll), JSON.stringify(list));
  const newSec = list.find((x) => x.h === expect[5][0]);
  check(`[${lang}] the added, empty section says so under its heading`, newSec?.empty === EMPTY_NOTE[lang], JSON.stringify(newSec));
  const notRows = await page.evaluate(() => document.querySelectorAll(".ways-group-empty.way-row").length);
  check(`[${lang}] the empty note is not a .way-row (layout.mjs counts that class)`, notRows === 0, String(notRows));
  // The card behind the list is a gradient, so the note is measured against
  // every colour stop of the nearest painted ancestor and the WORST is taken.
  const contrast = await page.evaluate(() => {
    const el = document.querySelector(".ways-group-empty"); if (!el) return null;
    const nums = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const L = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    let stops = null;
    for (let n = el; n && !stops; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage.includes("gradient")) stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => nums(m[0]));
      else { const c = nums(cs.backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] === 1)) stops = [c]; }
    }
    if (!stops) stops = [[255, 255, 255]];
    const fg = nums(getComputedStyle(el).color);
    return Math.min(...stops.map((b) => { const a = L(fg), c = L(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); }));
  });
  check(`[${lang}] the empty note is readable (>=4.5:1)`, contrast != null && contrast >= 4.5, String(contrast));
  const real = errors.filter((e) => !/Failed to load resource: net::ERR_/.test(e));
  check(`[${lang}] no page errors`, real.length === 0, real.join("; "));
  await ctx.close();
}

// A tenant that has NOT taken its sections over shows no empty sections (the
// platform's seven all carry Approaches): the shared fixture, unchanged.
{
  const ctx = await newContext(browser, { viewport: { width: 1100, height: 900 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelectorAll(".ways-list .way-row").length > 0, null, { timeout: 15000 });
  const n = await page.evaluate(() => ({ empty: document.querySelectorAll(".ways-group-empty").length, heads: [...document.querySelectorAll(".ways-list .ways-group")].map((h) => h.textContent.trim()) }));
  check(`[en] with no tenant section list, no empty section is shown and the headings are unchanged`,
    n.empty === 0 && JSON.stringify(n.heads) === JSON.stringify(["Preservation", "Engagement", "Understanding", "Reflection", "Action"]), JSON.stringify(n));
  await ctx.close();
}

// v08.112 -- the Owner: "40 ways should reflect Everywhere." The landing
// capsule reads the same heading: the default in each language, and a
// tenant's own saved heading once it has one. Checked at 320 and 390px,
// where the capsule shares its line with "Choose a Unit".
const OWN_TITLE = { en: "Quran Approaches - 41 Ways", bn: "কুরআনের পদ্ধতি - ৪১টি উপায়" };
for (const lang of ["en", "bn"]) {
  for (const own of [false, true]) {
    for (const width of [320, 390, 1100]) {
      const seed = own ? `DATA.tenants[0].approachListTitle = ${JSON.stringify(OWN_TITLE)};` : "";
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: seed });
      const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
      await page.waitForFunction(() => document.querySelectorAll(".ways-list .way-row").length > 0, null, { timeout: 15000 });
      const cap = await page.evaluate(() => {
        const el = document.getElementById("approachListCapsule");
        const r = el.getBoundingClientRect();
        const row = el.parentElement.getBoundingClientRect();
        return { text: el.textContent.trim(), h: r.height, left: r.left, right: r.right, rowLeft: row.left, rowRight: row.right,
                 overflow: document.documentElement.scrollWidth - innerWidth, cut: el.scrollWidth > el.clientWidth + 1 };
      });
      const want = own ? OWN_TITLE[lang] : DEFAULT_TITLE[lang];
      check(`[${lang} ${width}px ${own ? "own heading" : "default"}] the landing capsule reads "${want}"`, cap.text === want, cap.text);
      check(`[${lang} ${width}px ${own ? "own heading" : "default"}] ...uncut, inside its row, no sideways scroll`,
        !cap.cut && cap.left >= cap.rowLeft - 1 && cap.right <= cap.rowRight + 1 && cap.overflow <= 1 && cap.h >= 36, JSON.stringify(cap));
      const real = errors.filter((e) => !/Failed to load resource: net::ERR_/.test(e));
      if (real.length) check(`[${lang} ${width}px] no page errors`, false, real.join("; "));
      await ctx.close();
    }
  }
}

console.log(`\n==== Approach sections and heading (v08.110): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
