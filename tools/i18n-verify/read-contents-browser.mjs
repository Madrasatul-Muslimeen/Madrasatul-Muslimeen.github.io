// Issue #415 -- the landing "Read" button and its contents list.
//
// Run from the repository root, with serve.js on :8080.
// Expected values are written BY HAND (from the packaged index files), never
// computed by the code under test.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start({ lang = "en", width = 390, height = 844 } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.addInitScript(() => {
    window.__played = 0;
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) { window.__played++; return orig.apply(this, a); };
  });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const requests = [];
  ctx.on("request", (r) => requests.push(r.url()));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, requests };
}
const dataFetches = (reqs) => reqs.filter((u) => /\/(juz|hizb|page|ruku)-index\.json/.test(u));
const state = (page) => page.evaluate(() => ({
  type: document.getElementById("unitTypeSelect").value,
  surah: document.getElementById("surahSelect").value,
  num: document.getElementById("unitNumSelect").value,
  mushaf: document.getElementById("mushafToggle").checked,
  immersive: document.body.classList.contains("immersive-read"),
  played: window.__played,
  writes: (window.__fsLog || []).filter((x) => /set|add|update|delete|write|commit/i.test(x.kind || "")).length,
}));
// UPDATED IN PLACE, 1 Oct 2026 (Owner decision 46): Read is the capsule
// #readContentsBtn at every width, in the action row under the wheel. The
// heading-line #readHeadBtn is gone.
const readBtnSel = async () => "#readContentsBtn";
const openList = async (page) => {
  await page.click(await readBtnSel(page));
  await page.waitForFunction(() => document.querySelectorAll("#readContentsBody .rc-row").length > 0);
};
const pick = async (page, tab, n) => {
  await openList(page);
  if (tab !== "surah") await page.click(`[data-rc-tab="${tab}"]`);
  await page.waitForFunction((t) => document.querySelector(`#readContentsBody .rc-row[data-rc-kind="${t}"]`), tab);
  await page.click(`#readContentsBody .rc-row[data-rc-kind="${tab}"][data-rc-n="${n}"]`);
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForTimeout(300);
};

// ---- UPDATED IN PLACE, 1 Oct 2026 -- Owner decision 46 (option C of a
// real-screenshot demo): "Mastery Wheel n Approach the Quran in 40 Ways are not
// buttons. Therefore they should be in the same row while Read, Choose a unit
// and Know Your Status are buttons for actions, therefore, should be in the
// same row." ... "Go with C." These checks used to assert the 30 Sep
// arrangement (Read as a heading-line link beside Know Your Status below
// 900px, a fourth capsule from 900px). Expected now, written by hand from the
// decision, at EVERY width:
//   the heading line (below 900px; from 900px the window's title bar) carries
//   the two titles only, on one line, with the line-or-dot between them;
//   Read | Choose a Unit | Know Your Status are one row of 36px capsules, in
//   that order, under the wheel and above its colour key.
for (const lang of ["en", "bn"]) {
  for (const width of [320, 340, 360, 390, 412, 519, 520, 600, 768, 899, 900, 1000, 1280]) {
    const { ctx, page } = await start({ lang, width });
    const m = await page.evaluate(() => {
      const R = (e) => (e ? e.getBoundingClientRect() : { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 });
      const read = document.getElementById("readContentsBtn"), unit = document.getElementById("wheelUnitBtn"), kys = document.getElementById("myStatusWideBtn");
      const row = document.getElementById("wheelIntroSettled"), wheel = document.querySelector("#wheelContainer svg"), legend = document.getElementById("wheelLegendContainer");
      const h = document.querySelector(".wheel-heading"), popup = document.querySelector(".note-popup-title");
      const de = document.documentElement;
      const btns = [read, unit, kys];
      const titleBox = R(h).width > 0 ? h : popup;
      const main = titleBox.querySelector(".wheel-title-main"), appr = titleBox.querySelector("[data-approach-list-title]"), sep = titleBox.querySelector(".wheel-title-sep");
      return {
        shown: btns.map((b) => R(b).width > 0), heights: btns.map((b) => Math.round(R(b).height)),
        tops: [...new Set(btns.map((b) => Math.round(R(b).top)))].length,
        order: R(read).right <= R(unit).left + 0.5 && R(unit).right <= R(kys).left + 0.5,
        inRow: btns.every((b) => row.contains(b)),
        underWheel: R(row).top >= R(wheel).bottom - 1, aboveLegend: R(row).bottom <= R(legend).top + 1,
        cut: btns.some((b) => b.scrollWidth > b.clientWidth + 1), inView: btns.every((b) => R(b).left >= 0 && R(b).right <= innerWidth + 0.5),
        over: de.scrollWidth > de.clientWidth,
        headButtons: h.querySelectorAll("button").length,
        titleWhere: R(h).width > 0 ? "heading" : "window",
        titleText: [main?.textContent.trim(), appr?.textContent.trim()],
        titleOneLine: R(main).height > 0 && Math.abs(R(main).top - R(appr).top) < 6 && !h.classList.contains("wheel-heading-wrapped"),
        sepBetween: R(sep).width > 0 && R(sep).left >= R(main).right - 0.5 && R(sep).right <= R(appr).left + 0.5,
        titleCut: titleBox.scrollWidth > titleBox.clientWidth + 1,
        label: read.textContent.trim(),
      };
    });
    const tag = `${lang} ${width}px`;
    check(`${tag}: Read, Choose a Unit and Know Your Status are all shown, in that order, in the one action row`, m.shown.every(Boolean) && m.order && m.inRow, JSON.stringify(m));
    check(`${tag}: the action row is one line of 36px buttons`, m.tops === 1 && m.heights.every((x) => x === 36), JSON.stringify(m));
    check(`${tag}: the action row sits under the wheel and above its colour key`, m.underWheel && m.aboveLegend, JSON.stringify(m));
    check(`${tag}: no button is cut or off screen, and no sideways scroll`, !m.cut && m.inView && !m.over, JSON.stringify(m));
    check(`${tag}: the heading line holds no buttons`, m.headButtons === 0, JSON.stringify(m));
    check(`${tag}: the two titles are together on one line (${width < 900 ? "heading line" : "window title bar"}), separator between them, nothing cut`,
      m.titleWhere === (width < 900 ? "heading" : "window") && m.titleText.every((x) => x && x.length > 3) && m.titleOneLine && m.sepBetween && !m.titleCut, JSON.stringify(m));
    if (width === 390) check(`${lang}: label is "${lang === "bn" ? "পড়ুন" : "Read"}"`, m.label === (lang === "bn" ? "পড়ুন" : "Read"), m.label);
    await ctx.close();
  }
}

// ---- The separator between the two titles: a thin line or a dot, picked at
// random per page load (decision 36, carried into decision 46's one gap).
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 820]) {
    const { ctx, page } = await start({ lang, width });
    for (const kind of ["line", "dot"]) {
      await page.evaluate((k) => document.documentElement.setAttribute("data-head-sep", k), kind);
      const m = await page.evaluate(() => {
        const e = document.querySelector(".wheel-heading .wheel-title-sep"), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, radius: cs.borderTopLeftRadius, op: cs.opacity, bg: cs.backgroundColor };
      });
      const tag = `${lang} ${width}px ${kind}`;
      check(`${tag}: the separator is drawn as a ${kind}`, kind === "line" ? m.w > 0 && m.w <= 2 && m.h >= 8 : m.w >= 4 && m.w <= 7 && m.radius === "50%", JSON.stringify(m));
      if (lang === "en" && width === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/head-sep-${kind}-${lang}-${width}.png`, clip: { x: 0, y: 0, width, height: 200 } });
    }
    await ctx.close();
  }
}
{
  // Random per load: over 12 openings both kinds appear (chance of a false
  // failure: 2 x 0.5^12, about 1 in 2,000), and nothing else is ever set.
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    const { ctx, page } = await start({ width: 390 });
    seen.add(await page.evaluate(() => document.documentElement.dataset.headSep));
    await ctx.close();
  }
  check("over 12 page loads both the line and the dot appear, and nothing else", seen.size === 2 && seen.has("line") && seen.has("dot"), [...seen].join(","));
}

// ---- The full-screen ⤢ is prominent (Owner, 30 Sep 2026: "Make this button
// (everywhere) prominent, noticeable, bigger", a desktop screenshot, the faint ⤢
// circled beside Note View / Track / Approach). Expected by hand: a 36px square,
// a 2px gold (#B8862F) border, glyph >= 20px; solid gold and NOT faded while the
// screen is bare (it used to drop to 40%).
for (const [lang, width] of [["en", 390], ["bn", 320], ["en", 1280]]) {
  const { ctx, page } = await start({ lang, width });
  await pick(page, "surah", 2);
  const fs = () => page.evaluate(() => {
    const b = document.getElementById("hideChromeBtn"), r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    return { w: Math.round(r.width), h: Math.round(r.height), border: cs.borderTopColor, bw: cs.borderTopWidth, fs: parseFloat(cs.fontSize), op: cs.opacity, bg: cs.backgroundColor, pressed: b.getAttribute("aria-pressed"), inView: r.left >= 0 && r.right <= innerWidth };
  });
  const bare = await fs();
  const gold = "rgb(184, 134, 47)";
  check(`[${lang} ${width}] bare screen: ⤢ is a 36px square, fully visible, solid gold`, bare.w === 36 && bare.h === 36 && bare.op === "1" && bare.bg === gold && bare.pressed === "true" && bare.inView, JSON.stringify(bare));
  check(`[${lang} ${width}] ⤢ glyph is at least 20px (was 15px)`, bare.fs >= 20, JSON.stringify(bare));
  // Press until the menus are back, then check the resting look.
  for (let i = 0; i < 3 && (await fs()).pressed === "true"; i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(200); }
  const rest = await fs();
  check(`[${lang} ${width}] menus shown: ⤢ is a 36px square with a 2px gold border`, rest.pressed === "false" && rest.w === 36 && rest.h === 36 && rest.border === gold && rest.bw === "2px" && rest.op === "1", JSON.stringify(rest));
  await ctx.close();
}

// ---- Tab counts: under the name, in the reader's digits, nothing cut (Owner, 30 Sep 2026)
// Hand-written: 114 Surahs, 30 Juz, 60 Hizb, 604 Pages, 556 Ruku'.
for (const lang of ["en", "bn"]) {
  for (const width of [320, 360, 390, 768, 1280]) {
    const { ctx, page } = await start({ lang, width });
    await openList(page);
    const m = await page.$$eval("#readContentsTabs .rc-tab", (els) => els.map((b) => {
      const n = b.querySelector(".rc-tab-name"), c = b.querySelector(".rc-tab-count");
      const nr = n?.getBoundingClientRect(), cr = c?.getBoundingClientRect(), br = b.getBoundingClientRect();
      return { k: b.dataset.rcTab, count: c?.textContent.trim() ?? null, below: !!(nr && cr) && cr.top >= nr.bottom - 1,
        centred: !!(nr && cr) && Math.abs((nr.left + nr.right) / 2 - (cr.left + cr.right) / 2) < 2,
        cut: b.scrollWidth > b.clientWidth + 1 || (cr && (cr.left < br.left - 0.5 || cr.right > br.right + 0.5)), h: Math.round(br.height) };
    }));
    const tag = `${lang} ${width}px`;
    const want = { surah: 114, juz: 30, hizb: 60, page: 604, ruku: 556 };
    const digits = (v) => lang === "bn" ? String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(v);
    check(`${tag}: every tab shows its count in the reader's digits`, m.length === 5 && m.every((t) => t.count === digits(want[t.k])), JSON.stringify(m.map((t) => t.count)));
    check(`${tag}: each count sits centred under its name`, m.every((t) => t.below && t.centred), JSON.stringify(m));
    check(`${tag}: no tab or count is cut, and the tabs stay one row under 56px`, m.every((t) => !t.cut && t.h <= 56) && new Set(m.map((t) => t.h)).size === 1, JSON.stringify(m));
    check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    if (lang === "bn" && width === 320) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/rc-tabs-bn-320.png` });
    if (lang === "en" && width === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/rc-tabs-en-390.png` });
    await ctx.close();
  }
}

// ---- I9: nothing fetched before the button is pressed
{
  const { ctx, page, requests } = await start({});
  check("no juz/hizb/page/ruku file fetched before the button is pressed", dataFetches(requests).length === 0, dataFetches(requests).join(","));
  await openList(page);
  const got = dataFetches(requests).map((u) => u.match(/(juz|hizb|page|ruku)-index/)[1]).sort().join(",");
  check("pressing it fetches the four tables", got === "hizb,juz,page,ruku", got);
  await ctx.close();
}

// ---- Tabs, counts, Surah 1 row, Escape and close
{
  const { ctx, page } = await start({});
  await openList(page);
  // Updated in place, 30 Sep 2026: each tab now carries its count on a second
  // line (the Owner: "Mention the numbers count in each unit"), so the name is
  // read from .rc-tab-name rather than the whole button's text.
  const tabs = await page.$$eval("#readContentsTabs .rc-tab .rc-tab-name", (els) => els.map((e) => e.textContent.trim()));
  check("five tabs in order", tabs.join("|") === "Surah|Juz|Hizb|Page|Ruku'", tabs.join("|"));
  const counts = {};
  for (const [k, expected] of [["surah", 114], ["juz", 30], ["hizb", 60], ["page", 604], ["ruku", 556]]) {
    await page.click(`[data-rc-tab="${k}"]`);
    counts[k] = await page.$$eval("#readContentsBody .rc-row", (e) => e.length);
    check(`${k} tab has ${expected} rows`, counts[k] === expected, String(counts[k]));
    const shown = await page.$eval(`[data-rc-tab="${k}"] .rc-tab-count`, (e) => e.textContent.trim()).catch(() => null);
    check(`${k} tab shows its count ${expected}, the same as its rows`, shown === String(expected) && counts[k] === expected, String(shown));
  }
  await page.click(`[data-rc-tab="surah"]`);
  const row1 = await page.$eval('.rc-row[data-rc-n="1"]', (e) => ({ text: e.innerText.replace(/\s+/g, " "), ar: e.querySelector(".rc-ar").textContent }));
  check("Surah 1 reads Al-Faatiha / The Opening / 7 verses", /1 Al-Faatiha The Opening 7 verses/.test(row1.text) && row1.ar.includes("ٱلْفَاتِحَةِ"), row1.text);
  await page.fill("#readContentsSearch", "cow");
  check("search 'cow' leaves Al-Baqara only", (await page.$$eval("#readContentsBody .rc-row", (e) => e.length)) === 1);
  await page.fill("#readContentsSearch", "112");
  check("search '112' leaves one row", (await page.$$eval("#readContentsBody .rc-row", (e) => e.length)) === 1);
  await page.keyboard.press("Escape");
  check("Escape closes the panel", await page.$eval("#readContentsMount", (e) => e.hidden));
  await page.click(await readBtnSel(page));
  await page.waitForTimeout(150);
  await page.click("#readContentsCloseBtn");
  check("the X closes the panel", await page.$eval("#readContentsMount", (e) => e.hidden));
  check("closing without picking changed no unit", (await state(page)).type === "ayah");
  await ctx.close();
}

// ---- Picking rows
{
  const { ctx, page } = await start({});
  await pick(page, "surah", 2);
  let s = await state(page);
  check("Surah 2: unit surah, surah 2, Mushaf on, immersive", s.type === "surah" && s.surah === "2" && s.mushaf && s.immersive, JSON.stringify(s));
  check("Surah 2: no audio requested", s.played === 0, String(s.played));
  check("Surah 2: no Firestore write", s.writes === 0, String(s.writes));
  await ctx.close();
}
for (const [tab, n, type, surah, num, label] of [
  ["page", 50, "page", "3", "50", "Page 50"],
  ["juz", 30, "juz", "78", "30", "Juz 30"],
  ["hizb", 1, "hizb", "1", "1", "Hizb 1"],
  ["ruku", 10, "ruku", "2", "9", "Ruku' 10 (surah 2, 9th ruku there)"],
]) {
  const { ctx, page } = await start({});
  await pick(page, tab, n);
  const s = await state(page);
  check(`${label} opens the right unit`, s.type === type && s.surah === surah && s.num === num && s.mushaf && s.immersive && s.played === 0 && s.writes === 0, JSON.stringify(s));
  await ctx.close();
}

// ---- Bangla
{
  const { ctx, page } = await start({ lang: "bn" });
  await openList(page);
  const t = await page.$eval('.rc-row[data-rc-n="1"]', (e) => e.innerText.replace(/\s+/g, " "));
  const hasBnMeaning = /[০-৯]/.test(t) && /টি আয়াত/.test(t);
  check("Bangla Surah tab: Bengali digits and verse word", hasBnMeaning, t);
  const meaning = await page.$eval('.rc-row[data-rc-n="1"] .rc-sub', (e) => e.textContent.trim());
  // Architect, 30 Sep 2026: Part 2 landed (nameTranslationBn from api.quran.com),
  // so the Bangla meaning is asserted exactly. "Present" alone passed with the
  // English fallback too, so it could not tell whether the Bangla was used.
  // Expected words typed by hand from the API response.
  check("Bangla Surah tab: Surah 1's meaning is the Bangla one (সূচনা)", meaning === "সূচনা", meaning);
  const meaning2 = await page.$eval('.rc-row[data-rc-n="2"] .rc-sub', (e) => e.textContent.trim());
  check("Bangla Surah tab: Surah 2's meaning is the Bangla one (বকনা-বাছুর)", meaning2 === "বকনা-বাছুর", meaning2);
  // Architect, 30 Sep 2026: the Mushaf page's own number was the literal
  // "Page 562" in Bangla too. Serve the layout data locally so the page
  // really renders, open Surah 67 (page 562) and read the label. Expected
  // words typed by hand.
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => r.fulfill({ path: r.request().url().split("/main/")[1] }));
  await page.click('#readContentsBody .rc-row[data-rc-kind="surah"][data-rc-n="67"]');
  await page.waitForFunction(() => document.querySelector(".hifz-page-num"), null, { timeout: 15000 }).catch(() => {});
  const pageNum = await page.evaluate(() => document.querySelector(".hifz-page-num")?.textContent.trim() ?? "(no page drawn)");
  check("Bangla Mushaf page number reads পৃষ্ঠা ৫৬২, not Page 562", pageNum === "পৃষ্ঠা ৫৬২", pageNum);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
