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
// Issue #407 (Owner, 29 Sep 2026): the seed is now the Owner's REAL eight section
// names and counts, read off their screenshot (was invented names, counts
// 6,5,7,4,5,6,4,3). The badge now shows the section NUMBER (S1..S8), the count
// moved into a square box at the end of the name, so the old assertion
// "badge == count" is replaced in place by the assertions further down.
const SECTIONS = [
  [1, "Building Foundation / Learning Tools", "ভিত্তি গড়া / শেখার সরঞ্জাম", 6],
  [2, "Engagement / Attachment", "সম্পৃক্ততা / সংযুক্তি", 7],
  [3, "Critical Reasoning: Nazar / 'Aql", "সমালোচনামূলক যুক্তি: নজর / আকল", 3],
  [4, "Critical Reasoning: Applied Threads", "সমালোচনামূলক যুক্তি: প্রয়োগের সূত্র", 4],
  [5, "Critical Reasoning: Tafakkur / Tadabbur", "সমালোচনামূলক যুক্তি: তাফাক্কুর / তাদাব্বুর", 4],
  [6, "Critical Reasoning: Judgement / Authority", "সমালোচনামূলক যুক্তি: বিচার / কর্তৃত্ব", 3],
  [7, "Understanding of the Scholars", "আলেমদের বোঝাপড়া", 9],
  [8, "A'mal / Application", "আমল / প্রয়োগ", 4],
];
const TOTAL = 40; // 6+7+3+4+4+3+9+4, written out
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
    btns: btns.map((b) => {
      const nameEl = b.querySelector(".ways-group-name");
      const countEl = b.querySelector(".ways-count");
      const clone = nameEl.cloneNode(true);
      clone.querySelector(".ways-count").remove();
      // geometry: Range rects over the name's own text (not the box's), the last
      // word's rect, and the box's rect
      const cr = countEl.getBoundingClientRect();
      const rects = [];
      const walker = document.createTreeWalker(nameEl, NodeFilter.SHOW_TEXT);
      let lastWordRect = null;
      for (let tn = walker.nextNode(); tn; tn = walker.nextNode()) {
        if (countEl.contains(tn) || !tn.textContent.trim()) continue;
        const r = document.createRange();
        r.selectNodeContents(tn);
        for (const x of r.getClientRects()) if (x.width > 0) rects.push(x);
        lastWordRect = [...r.getClientRects()].filter((x) => x.width > 0).pop() || lastWordRect;
      }
      const badgeEl = b.querySelector(".ways-sec-badge");
      const br = badgeEl && badgeEl.getBoundingClientRect();
      return {
        g: b.dataset.group, expanded: b.getAttribute("aria-expanded"),
        count: countEl.textContent.trim(), countAria: countEl.getAttribute("aria-label"),
        badge: badgeEl ? badgeEl.textContent.trim() : null,
        badgeW: br ? br.width : 0, badgeH: br ? br.height : 0, badgeClip: badgeEl ? badgeEl.scrollWidth > badgeEl.clientWidth + 1 : null,
        name: clone.textContent.trim(),
        // the box is the LAST thing inside the name, and sits on the name's last line
        boxLast: nameEl.lastElementChild.lastElementChild === countEl,
        // last word is on the name's last line, the box's centre is inside that
        // line's height, and the box starts at or after the last word's right edge
        lastWordOnLastLine: Math.abs(lastWordRect.top - Math.max(...rects.map((x) => x.top))) < 3,
        boxOnLastLine: cr.top + cr.height / 2 > lastWordRect.top && cr.top + cr.height / 2 < lastWordRect.bottom,
        boxAfterText: cr.left >= lastWordRect.right - 1,
        boxRadius: parseFloat(getComputedStyle(countEl).borderTopLeftRadius), boxH: cr.height, boxW: cr.width,
        nameLines: new Set(rects.map((x) => Math.round(x.top))).size,
        h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width,
      };
    }),
    shown: [...list.querySelectorAll(".way-row")].filter((r) => getComputedStyle(r).display !== "none").length,
    total: list.querySelectorAll(".way-row").length,
    openGroups: btns.filter((b) => b.getAttribute("aria-expanded") === "true").map((b) => b.dataset.group),
    listW: list.getBoundingClientRect().width,
  };
});

// WCAG contrast of the heading's section name (and count text) against what is
// really painted behind it: hide the text, screenshot the heading, sample every
// pixel of it, and take the WORST ratio against the text colour (the card is a
// gradient, so one background colour would be a guess).
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgbOf = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
async function sectionColour(page) {
  const btn = page.locator(".ways-group-btn").first();
  const info = await page.evaluate(() => {
    const b = document.querySelector(".ways-group-btn");
    return { section: getComputedStyle(b.querySelector(".ways-group-name")).color, approach: getComputedStyle(document.querySelector(".way-row .name")).color,
             box: getComputedStyle(b.querySelector(".ways-count")).color,
             all: getComputedStyle(document.querySelector(".ways-toggle-all")).color,
             secBadge: getComputedStyle(b.querySelector(".ways-sec-badge")).color,
             secBadgeBg: getComputedStyle(b.querySelector(".ways-sec-badge")).backgroundColor,
             numBadgeBg: getComputedStyle(document.querySelector(".way-row .badge")).backgroundColor };
  });
  // hide every glyph AND the box's border, so what is left is the paint behind the text
  await page.addStyleTag({ content: ".ways-group-btn *, .ways-group-btn { color: transparent !important; } .ways-count { border-color: transparent !important; } .ways-toggle-all { color: transparent !important; border-color: transparent !important; } .ways-sec-badge { border-color: transparent !important; }" });
  const shot = async (sel, inset) => {
    const r = await page.locator(sel).first().boundingBox();
    const png = (await page.screenshot({ clip: { x: r.x + inset, y: r.y + inset, width: r.width - 2 * inset, height: r.height - 2 * inset } })).toString("base64");
    return page.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; const out = [];
      for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]);
      return out;
    }, png);
  };
  const namePx = await shot(".ways-group-btn .ways-group-name", 0);
  const boxPx = await shot(".ways-group-btn .ways-count", 2);
  const allPx = await shot(".ways-toggle-all", 2);
  const secPx = await shot(".ways-group-btn .ways-sec-badge", 5);
  await page.evaluate(() => { document.querySelectorAll("style").forEach((s) => s.textContent.startsWith(".ways-group-btn *, .ways-group-btn { color: transparent") && s.remove()); });
  const worstOf = (col, px) => Math.min(...px.map((p) => ratio(rgbOf(col), p)));
  return { section: info.section, approach: info.approach, worst: worstOf(info.section, namePx), boxWorst: worstOf(info.box, boxPx), allWorst: worstOf(info.all, allPx), secWorst: worstOf(info.secBadge, secPx),
           secBadgeBg: info.secBadgeBg, numBadgeBg: info.numBadgeBg };
}

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
    // #407: the round badge is the section NUMBER (S1..S8 / বি১..বি৮); the count is in a square box.
    const badgeText = (n) => (lang === "bn" ? "বি" + bnNum(n) : "S" + n);
    check(`${tag} the round badges read S1..S8 (bn বি১..বি৮), written out by hand`,
      JSON.stringify(s.btns.map((b) => b.badge)) === JSON.stringify(lang === "bn"
        ? ["বি১", "বি২", "বি৩", "বি৪", "বি৫", "বি৬", "বি৭", "বি৮"]
        : ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]), JSON.stringify(s.btns.map((b) => b.badge)));
    check(`${tag} the badge is not squashed: >=28px wide, 30px tall, its text not clipped`,
      s.btns.every((b) => b.badgeW >= 28 && b.badgeH >= 28 && b.badgeClip === false), JSON.stringify(s.btns.map((b) => [b.badgeW, b.badgeH, b.badgeClip])));
    check(`${tag} each box holds the hand-counted number (6,7,3,4,4,3,9,4), in this language's digits`,
      JSON.stringify(s.btns.map((b) => b.count)) === JSON.stringify(lang === "bn"
        ? ["৬", "৭", "৩", "৪", "৪", "৩", "৯", "৪"] : ["6", "7", "3", "4", "4", "3", "9", "4"]), JSON.stringify(s.btns.map((b) => b.count)));
    check(`${tag} each box is labelled ("6 Approaches" / "৬টি পদ্ধতি")`,
      s.btns.every((b, i) => b.countAria === (lang === "bn" ? `${bnNum(SECTIONS[i][3])}টি পদ্ধতি` : `${SECTIONS[i][3]} Approaches`)), JSON.stringify(s.btns.map((b) => b.countAria)));
    check(`${tag} the box is the last thing in the name, after the last word, on the name's last line`,
      s.btns.every((b) => b.boxLast && b.lastWordOnLastLine && b.boxOnLastLine && b.boxAfterText), JSON.stringify(s.btns.map((b) => [b.boxLast, b.lastWordOnLastLine, b.boxOnLastLine, b.boxAfterText])));
    check(`${tag} the box is SQUARE-cornered (radius under half its height), not round`,
      s.btns.every((b) => b.boxRadius > 0 && b.boxRadius <= 6 && b.boxRadius < b.boxH / 2 - 2), JSON.stringify(s.btns.map((b) => [b.boxRadius, b.boxH])));
    // colour: section name vs Approach name, measured, in both looks
    for (const look of ["night", "light"]) {
      await page.evaluate(async (l) => { (await import("/app/js/prefs.js")).setCardLook(l); }, look);
      await page.waitForTimeout(200);
      const c = await sectionColour(page);
      check(`${tag} [${look}] section-name colour differs from the Approach-name colour`, c.section !== c.approach, JSON.stringify(c));
      check(`${tag} [${look}] section name contrast >= 4.5:1 against the heading's real background (worst pixel ${c.worst.toFixed(2)})`, c.worst >= 4.5, JSON.stringify(c));
      check(`${tag} [${look}] the count box text contrast >= 4.5:1 too (${c.boxWorst.toFixed(2)})`, c.boxWorst >= 4.5, JSON.stringify(c));
      // Architect review of #407: the v08.117 Open all button kept the Night gold in Light (about 1.4:1 on white)
      check(`${tag} [${look}] the Open all button text contrast >= 4.5:1 (${c.allWorst.toFixed(2)})`, c.allWorst >= 4.5, JSON.stringify(c));
      // Owner, 30 Sep 2026: "Either the S circles or the Approaches numbers circle should be distinctive in color, not the same."
      check(`${tag} [${look}] the S badge is not filled like the Approach number disc (${c.secBadgeBg} vs ${c.numBadgeBg})`,
        c.secBadgeBg !== c.numBadgeBg && c.numBadgeBg !== "rgba(0, 0, 0, 0)", JSON.stringify([c.secBadgeBg, c.numBadgeBg]));
      check(`${tag} [${look}] the S badge lettering contrast >= 4.5:1 (${c.secWorst.toFixed(2)})`, c.secWorst >= 4.5, JSON.stringify(c));
      if (width === 390 || width === 1280) await page.screenshot({ path: `/tmp/landing-sections-${lang}-${width}-${look}.png` });
    }
    await page.evaluate(async () => { (await import("/app/js/prefs.js")).setCardLook("night"); });
    await page.waitForTimeout(200);
    check(`${tag} each heading reads the section's own name`, s.btns.every((b, i) => b.name === nameOf(i)), JSON.stringify(s.btns.map((b) => b.name)));
    check(`${tag} badges add up to the 40 Approaches`, SECTIONS.reduce((a, x) => a + x[3], 0) === TOTAL);
    check(`${tag} headings are >=40px tall and span the full list width`, s.btns.every((b) => b.h >= 40 && b.w >= s.listW - 8), JSON.stringify(s.btns.map((b) => [b.h, b.w, s.listW])));

    // 3. toggle opens and closes
    await page.click('.ways-group-btn[data-group="s3"]');
    s = await state(page);
    check(`${tag} opening section 3 shows exactly its 3 rows and aria-expanded=true`, s.shown === 3 && JSON.stringify(s.openGroups) === '["s3"]', JSON.stringify([s.shown, s.openGroups]));
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
    check(`${tag} after the redraw sections 1 and 6 are STILL open, the rest closed, 9 rows shown`,
      JSON.stringify(s.openGroups) === '["s1","s6"]' && s.shown === 9, JSON.stringify([s.openGroups, s.shown]));
    await setUnit(page, "ayah");
    await page.waitForTimeout(300);
    s = await state(page);
    check(`${tag} ...and after switching back too`, JSON.stringify(s.openGroups) === '["s1","s6"]' && s.shown === 9, JSON.stringify([s.openGroups, s.shown]));

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
