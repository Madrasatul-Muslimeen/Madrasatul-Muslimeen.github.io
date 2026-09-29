// Issue #400 -- the Owner (29 Sep 2026): "making the sections in Landing page
// load on collapsed by-default having expanding option. Then, approach numbers
// quantity is mention in front of the section names."
//
// Rendered, in a real browser, both languages, at 390 and 1280px, on a tenant
// with the Owner's real shape: 8 sections, 40 Approaches, real-length names.
// Every expected number below is WRITTEN OUT BY HAND from the SECTIONS table --
// never derived from the function under test.
//
//   node tools/i18n-verify/landing-sections-collapse-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// [section number, English name, Bangla name, Approaches in it] -- hand-counted.
const SECTIONS = [
  [1, "Building Foundation / Learning Tools", "ভিত্তি গড়া / শেখার সরঞ্জাম", 6],
  [2, "Engagement with the Text", "পাঠের সাথে সম্পৃক্ততা", 5],
  [3, "Understanding of the Scholars", "আলেমদের বোঝাপড়া", 7],
  [4, "Applied Threads Across Subjects", "বিষয়জুড়ে প্রয়োগের সূত্র", 4],
  [5, "Reflection and Contemplation", "প্রতিফলন ও গভীর চিন্তা", 5],
  [6, "Critical Reasoning: Judgement / Authority", "সমালোচনামূলক যুক্তি: বিচার / কর্তৃত্ব", 6],
  [7, "Action and Living It Out", "আমল ও জীবনে বাস্তবায়ন", 4],
  [8, "Sharing and Teaching Others", "অন্যকে শেখানো ও ভাগ করা", 3],
];
const TOTAL = 40; // 6+5+7+4+5+6+4+3, written out
const BN_DIGITS = { 0: "০", 1: "১", 2: "২", 3: "৩", 4: "৪", 5: "৫", 6: "৬", 7: "৭", 8: "৮", 9: "৯" };
const bnNum = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[d]);

const SEED = `
{
  const T = DATA.tenants[0]._id;
  const SEC = ${JSON.stringify(SECTIONS)};
  DATA.tenants[0].approachSections = SEC.map(([n, en, bn]) => ({ n, name: { en, bn } }));
  const keep = DATA.trackables.filter((x) => x.subjectId !== "quran");
  const made = [];
  let order = 0;
  for (const [n, en, bn, count] of SEC) {
    for (let k = 1; k <= count; k++) {
      made.push({
        _id: T + "__sec" + n + "_a" + k, tenantId: T, subjectId: "quran", order: order++, status: "active", group: n,
        name: { en: "Approach " + n + "." + k + " of " + en.split(" ")[0], bn: "পদ্ধতি " + n + "." + k },
        groupName: { en, bn },
        guide: { what: { en: "What", bn: "কী" }, how: { en: "How", bn: "কীভাবে" }, measure: { en: "Measure", bn: "মাপ" } },
        panels: ["text"],
      });
    }
  }
  DATA.trackables = made.concat(keep);
}
`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// #unitTypeSelect lives in a closed menu (not visible), so set it and fire the
// same change event the app listens for.
const setUnit = (page, v) => page.evaluate((val) => { const el = document.getElementById("unitTypeSelect"); el.value = val; el.dispatchEvent(new Event("change", { bubbles: true })); }, v);

const state = (page) => page.evaluate(() => {
  const list = document.querySelector("#wheelSidebarContainer .ways-list");
  const btns = [...list.querySelectorAll(".ways-group-btn")];
  return {
    btns: btns.map((b) => ({ g: b.dataset.group, expanded: b.getAttribute("aria-expanded"), count: b.querySelector(".ways-count").textContent.trim(),
                              name: b.querySelector(".ways-group-name").textContent.trim(), h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width })),
    shown: [...list.querySelectorAll(".way-row")].filter((r) => getComputedStyle(r).display !== "none").length,
    total: list.querySelectorAll(".way-row").length,
    openGroups: btns.filter((b) => b.getAttribute("aria-expanded") === "true").map((b) => b.dataset.group),
    listW: list.getBoundingClientRect().width,
  };
});

for (const lang of ["en", "bn"]) {
  for (const width of [390, 1280]) {
    const tag = `[${lang} ${width}px]`;
    console.log(`\n=== ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 }, extraSeedJs: SEED });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForFunction(() => document.querySelectorAll("#wheelSidebarContainer .way-row").length >= 40, null, { timeout: 15000 });
    await page.waitForTimeout(500);
    const digits = (n) => (lang === "bn" ? bnNum(n) : String(n));
    const nameOf = (i) => SECTIONS[i][lang === "bn" ? 2 : 1];

    // 1. collapsed on load
    let s = await state(page);
    check(`${tag} 8 section buttons and 40 rows exist`, s.btns.length === 8 && s.total === TOTAL, JSON.stringify([s.btns.length, s.total]));
    check(`${tag} collapsed on load: every section aria-expanded=false, no row displayed (computed)`,
      s.btns.every((b) => b.expanded === "false") && s.shown === 0, JSON.stringify(s));
    // 2. badge = hand count, then the real name; heading is a >=40px full-row button
    check(`${tag} each badge equals the hand-counted number, in this language's digits`,
      s.btns.every((b, i) => b.count === digits(SECTIONS[i][3])), JSON.stringify(s.btns.map((b) => b.count)));
    check(`${tag} each heading reads the section's own name`, s.btns.every((b, i) => b.name === nameOf(i)), JSON.stringify(s.btns.map((b) => b.name)));
    check(`${tag} badges add up to the 40 Approaches`, SECTIONS.reduce((a, x) => a + x[3], 0) === TOTAL);
    check(`${tag} headings are >=40px tall and span the full list width`, s.btns.every((b) => b.h >= 40 && b.w >= s.listW - 8), JSON.stringify(s.btns.map((b) => [b.h, b.w, s.listW])));

    // 3. toggle opens and closes
    await page.click('.ways-group-btn[data-group="s3"]');
    s = await state(page);
    check(`${tag} opening section 3 shows exactly its 7 rows and aria-expanded=true`, s.shown === 7 && JSON.stringify(s.openGroups) === '["s3"]', JSON.stringify([s.shown, s.openGroups]));
    await page.click('.ways-group-btn[data-group="s3"]');
    s = await state(page);
    check(`${tag} tapping again closes it`, s.shown === 0 && s.openGroups.length === 0, JSON.stringify([s.shown, s.openGroups]));

    // 4. state survives a redraw (unit change rebuilds the whole list)
    await page.click('.ways-group-btn[data-group="s1"]');
    await page.click('.ways-group-btn[data-group="s6"]');
    await page.evaluate(() => { document.querySelector("#wheelSidebarContainer .ways-list").dataset.marker = "old"; });
    await setUnit(page, "surah");
    await page.waitForFunction(() => !document.querySelector("#wheelSidebarContainer .ways-list")?.dataset.marker, null, { timeout: 5000 }).catch(() => {});
    const redrawn = await page.evaluate(() => !document.querySelector("#wheelSidebarContainer .ways-list").dataset.marker);
    s = await state(page);
    check(`${tag} (positive control) the unit change really rebuilt the list`, redrawn);
    check(`${tag} after the redraw sections 1 and 6 are STILL open, the rest closed, 12 rows shown`,
      JSON.stringify(s.openGroups) === '["s1","s6"]' && s.shown === 12, JSON.stringify([s.openGroups, s.shown]));
    await setUnit(page, "ayah");
    await page.waitForTimeout(300);
    s = await state(page);
    check(`${tag} ...and after switching back too`, JSON.stringify(s.openGroups) === '["s1","s6"]' && s.shown === 12, JSON.stringify([s.openGroups, s.shown]));

    // 5. Open all / Close all
    const allBtn = await page.evaluate(() => { const b = document.querySelector(".ways-toggle-all"); return { h: b.getBoundingClientRect().height, text: b.textContent.trim() }; });
    check(`${tag} Open all button is >=40px tall and translated`, allBtn.h >= 40 && allBtn.text === (lang === "bn" ? "সব খুলুন" : "Open all"), JSON.stringify(allBtn));
    await page.click(".ways-toggle-all");
    s = await state(page);
    const label = await page.evaluate(() => document.querySelector(".ways-toggle-all").textContent.trim());
    check(`${tag} Open all opens all 8 sections, 40 rows, and the button now says Close all`,
      s.openGroups.length === 8 && s.shown === TOTAL && label === (lang === "bn" ? "সব বন্ধ করুন" : "Close all"), JSON.stringify([s.openGroups.length, s.shown, label]));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${tag} all open: no sideways scroll`, overflow <= 1, String(overflow));
    await page.screenshot({ path: `/tmp/landing-sections-${lang}-${width}-open-all.png` });
    await page.click(".ways-toggle-all");
    s = await state(page);
    check(`${tag} Close all closes them all`, s.openGroups.length === 0 && s.shown === 0, JSON.stringify([s.openGroups.length, s.shown]));

    // 6. (run LAST: the tap opens the Note view, which covers the landing list)
    // a wheel-slice tap opens that Approach's section and shows its row
    const sliceTap = async () => {
    const target = "sec5_a3"; // section 5
    const before = await state(page);
    await page.evaluate((id) => { document.querySelector('#wheelContainer .wheel-seg[data-key="' + id + '"]').dispatchEvent(new MouseEvent("click", { bubbles: true })); }, target);
    await page.waitForTimeout(400);
    const after = await page.evaluate((id) => {
      const row = document.querySelector('#wheelSidebarContainer .way-row[data-key="' + id + '"]');
      return { hidden: row.hidden, group: row.dataset.group, expanded: document.querySelector('.ways-group-btn[data-group="s5"]').getAttribute("aria-expanded"),
               others: [...document.querySelectorAll(".ways-group-btn")].filter((b) => b.getAttribute("aria-expanded") === "true").map((b) => b.dataset.group) };
    }, target);
    check(`${tag} (positive control) sections were all closed before the slice tap`, before.openGroups.length === 0);
    check(`${tag} tapping a wheel slice opens exactly that Approach's section (5) and unhides its row`,
      after.group === "s5" && after.hidden === false && after.expanded === "true" && JSON.stringify(after.others) === '["s5"]', JSON.stringify(after));
    };

    // 7. measurement: the collapsed list against the same list fully open
    if (width === 390) {
      await page.evaluate(() => { document.getElementById("wheelSidebarContainer").querySelectorAll(".ways-group-btn").forEach((b) => b.getAttribute("aria-expanded") === "true" && b.click()); });
      const hClosed = await page.evaluate(() => document.getElementById("wheelSidebarContainer").getBoundingClientRect().height);
      await page.click(".ways-toggle-all");
      const hOpen = await page.evaluate(() => document.getElementById("wheelSidebarContainer").getBoundingClientRect().height);
      console.log(`  INFO  ${tag} list height collapsed ${Math.round(hClosed)}px vs all open (today's list) ${Math.round(hOpen)}px`);
      check(`${tag} the collapsed list is shorter than the fully open one`, hClosed < hOpen / 2, `${hClosed} vs ${hOpen}`);
      await page.click(".ways-toggle-all");
      const cut = await page.evaluate(() => [...document.querySelectorAll(".ways-group-btn")].filter((b) => b.scrollWidth > b.clientWidth + 1).length);
      check(`${tag} no heading is cut sideways`, cut === 0, String(cut));
      await page.screenshot({ path: `/tmp/landing-sections-${lang}-${width}-collapsed.png` });
      await page.click('.ways-group-btn[data-group="s6"]');
      await page.screenshot({ path: `/tmp/landing-sections-${lang}-${width}-one-open.png` });
    } else {
      await page.screenshot({ path: `/tmp/landing-sections-${lang}-${width}-collapsed.png` });
    }
    // Step 7 leaves everything closed except (at 390) section 6 -- close it so the
    // tap's "opens exactly that section" is a real observation.
    await page.evaluate(() => document.querySelectorAll(".ways-group-btn[aria-expanded=true]").forEach((b) => b.click()));
    await sliceTap();
    const real = errors.filter((e) => !/Failed to load resource: net::ERR_/.test(e));
    check(`${tag} no page errors`, real.length === 0, real.join("; "));
    await ctx.close();
  }
}

// Widths that sit between the two above, in both languages: nothing cut, no sideways scroll.
for (const lang of ["en", "bn"]) {
  for (const width of [320, 360, 412, 768]) {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 }, extraSeedJs: SEED });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForFunction(() => document.querySelectorAll("#wheelSidebarContainer .way-row").length >= 40, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    await page.click(".ways-toggle-all");
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      cut: [...document.querySelectorAll(".ways-group-btn")].filter((b) => b.scrollWidth > b.clientWidth + 1).length,
      minH: Math.min(...[...document.querySelectorAll(".ways-group-btn")].map((b) => b.getBoundingClientRect().height)),
    }));
    check(`[${lang} ${width}px] all open: no sideways scroll, no heading cut, every heading >=40px`, m.overflow <= 1 && m.cut === 0 && m.minH >= 40, JSON.stringify(m));
    await ctx.close();
  }
}

console.log(`\n==== Landing sections collapse (#400): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
