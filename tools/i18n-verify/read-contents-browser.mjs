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
// Architect, 30 Sep 2026 (Owner: "put Read beside Know Your Status on mobile"):
// below 900px Read is the heading-line #readHeadBtn, from 900px the capsule
// #readContentsBtn. Tap whichever one is showing.
const readBtnSel = (page) => page.evaluate(() => ((document.getElementById("readHeadBtn")?.getBoundingClientRect().width ?? 0) > 0 ? "#readHeadBtn" : "#readContentsBtn"));
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

// ---- Button: where it sits, its look, nothing cut, no sideways scroll
// Expected placement written by hand from the Owner's decision and the measured
// fit (a fourth capsule does not fit the row in English below ~1000px, and from
// 900px the heading line is replaced by the wheel window's title bar):
//   < 520  heading line, right edge, immediately before Know Your Status
//   520-899 heading line, right edge (Know Your Status is a capsule there)
//   >= 900 the fourth capsule, one 36px row with the other three
for (const lang of ["en", "bn"]) {
  for (const width of [320, 340, 360, 390, 412, 479, 480, 500, 519, 520, 600, 768, 899, 900, 940, 1000, 1280]) {
    const { ctx, page } = await start({ lang, width });
    const m = await page.evaluate(() => {
      // A missing button reads as "not shown" so the checks FAIL by name rather than crash.
      const R = (e) => (e ? e.getBoundingClientRect() : { width: 0, height: 0, top: 0, left: 0, right: 0 });
      const head = document.getElementById("readHeadBtn"), cap = document.getElementById("readContentsBtn");
      const title = document.querySelector(".wheel-heading > span"), kys = document.getElementById("myStatusBtn");
      const de = document.documentElement;
      const style = (e) => ["fontFamily", "fontSize", "fontWeight", "color"].map((k) => getComputedStyle(e)[k]).join("|");
      const caps = [...document.querySelectorAll("#wheelIntroSettled > .wheel-intro-capsule, #wheelIntroSettled > .wheel-unit-wrap > .wheel-unit-capsule, #wheelIntroSettled > .wheel-unit-capsule")].filter((e) => R(e).width > 0);
      const shown = R(head).width > 0 ? head : cap;
      const r = R(shown), tr = R(title), kr = R(kys), hr = R(title.parentElement);
      return {
        headShown: R(head).width > 0, capShown: R(cap).width > 0,
        label: shown.textContent.trim(), h: Math.round(r.height), inView: r.left >= 0 && r.right <= innerWidth + 0.5,
        cut: shown.scrollWidth > shown.clientWidth + 1, over: de.scrollWidth > de.clientWidth,
        headStyleIsTitle: R(head).width > 0 ? style(head) === style(title) : null,
        headOnTitleLine: R(head).width > 0 ? Math.abs((tr.top + tr.height / 2) - (r.top + r.height / 2)) < 4 && r.left > tr.right && r.right <= hr.right + 0.5 : null,
        // Updated in place, 30 Sep 2026 -- the Owner moved Read: "Place Read button in the
        // middle of the gap ... put dot or a | like bar in between those buttons". Was:
        // Know Your Status within 24px after Read. Now: Read centred between the title and
        // Know Your Status (the two gaps within 2px), all three on one line, and a
        // visible separator drawn midway between Read and Know Your Status.
        kysAfterCentred: R(head).width > 0 && kr.width > 0 ? kr.left > r.right && Math.abs((r.left - tr.right) - (kr.left - r.right)) <= 2 && Math.abs((kr.top + kr.height / 2) - (r.top + r.height / 2)) < 2 : null,
        gaps: [Math.round(r.left - tr.right), Math.round(kr.left - r.right)],
        titleOneLine: tr.height < 30,
        sep: (() => { const cs = getComputedStyle(title.parentElement, "::after"); return { img: cs.backgroundImage, w: parseFloat(cs.width) || 0, op: cs.opacity, order: cs.order, kind: document.documentElement.dataset.headSep }; })(),
        capTops: [...new Set(caps.map((e) => Math.round(R(e).top)))].length, capHeights: [...new Set(caps.map((e) => Math.round(R(e).height)))],
      };
    });
    const tag = `${lang} ${width}px`;
    if (width < 900) {
      check(`${tag}: Read is on the heading line, not a capsule`, m.headShown && !m.capShown, JSON.stringify(m));
      check(`${tag}: heading Read wears the heading's own face, size, weight and colour`, m.headStyleIsTitle === true, JSON.stringify(m));
      check(`${tag}: heading Read sits on the title's line, to its right, inside the heading`, m.headOnTitleLine === true, JSON.stringify(m));
      if (width < 520) {
        check(`${tag}: Read sits in the middle of the gap, Know Your Status after it on the same line`, m.kysAfterCentred === true, JSON.stringify(m));
        // Updated in place, 30 Sep 2026 -- the Owner: "both dot/ line looks good to me.
        // enable both appears randomly." The mark is a line or a dot (whichever this
        // load picked); the section after this loop checks both, on both sides.
        check(`${tag}: a separator is drawn between Read and Know Your Status`, (m.sep.kind === "dot" ? /radial-gradient/ : /linear-gradient/).test(m.sep.img) && m.sep.w >= 4 && m.sep.order === "3", JSON.stringify(m.sep));
        check(`${tag}: "Mastery Wheel" stays on one line`, m.titleOneLine === true, JSON.stringify(m));
      }
      check(`${tag}: heading Read is a 36px tap target`, m.h === 36, JSON.stringify(m));
    } else {
      check(`${tag}: Read is the fourth capsule`, m.capShown && !m.headShown, JSON.stringify(m));
      check(`${tag}: the four capsules share one row, all 36px`, m.capTops === 1 && m.capHeights.length === 1 && m.capHeights[0] === 36, JSON.stringify(m));
    }
    // Owner, 30 Sep 2026: "fix the tablet wrap too" -- the capsules never wrap, at any width.
    check(`${tag}: the capsule row is one line, every capsule 36px`, m.capTops === 1 && m.capHeights.length === 1 && m.capHeights[0] === 36, JSON.stringify(m));
    check(`${tag}: Read on screen, label not cut, no sideways scroll`, m.inView && !m.cut && !m.over, JSON.stringify(m));
    if (width === 390) check(`${lang}: label is "${lang === "bn" ? "পড়ুন" : "Read"}"`, m.label === (lang === "bn" ? "পড়ুন" : "Read"), m.label);
    await ctx.close();
  }
}

// ---- The heading's separators: a line or a dot on BOTH sides of Read, picked at
// random per page load, and the three words on one baseline (Owner, 30 Sep 2026:
// "it has to be aligned", then "both dot/ line looks good to me. enable both
// appears randomly").
for (const lang of ["en", "bn"]) {
  for (const width of [320, 340, 360, 390, 412, 519]) {
    const { ctx, page } = await start({ lang, width });
    for (const kind of ["line", "dot"]) {
      await page.evaluate((k) => document.documentElement.setAttribute("data-head-sep", k), kind);
      const m = await page.evaluate(() => {
        const h = document.querySelector(".wheel-heading"), title = h.querySelector(":scope > span");
        const read = document.getElementById("readHeadBtn"), kys = document.getElementById("myStatusBtn");
        const textBottom = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().bottom; };
        const pe = (p) => { const cs = getComputedStyle(h, p); return { img: cs.backgroundImage, w: parseFloat(cs.width) || 0, order: cs.order, op: cs.opacity }; };
        const R = (e) => e.getBoundingClientRect();
        return { before: pe("::before"), after: pe("::after"), bottoms: [textBottom(title), textBottom(read), textBottom(kys)].map((x) => Math.round(x * 10) / 10),
          order: R(title).right <= R(read).left && R(read).right <= R(kys).left, over: document.documentElement.scrollWidth > document.documentElement.clientWidth };
      });
      const tag = `${lang} ${width}px ${kind}`;
      const re = kind === "dot" ? /radial-gradient/ : /linear-gradient/;
      check(`${tag}: the same mark on both sides of Read`, re.test(m.before.img) && re.test(m.after.img) && m.before.img === m.after.img && m.before.w >= 6 && m.after.w >= 6 && m.before.order === "1" && m.after.order === "3", JSON.stringify(m));
      check(`${tag}: Mastery Wheel, Read and Know Your Status sit on one baseline`, Math.max(...m.bottoms) - Math.min(...m.bottoms) <= 1, JSON.stringify(m.bottoms));
      check(`${tag}: title, Read, Know Your Status in order on one line, no sideways scroll`, m.order && !m.over, JSON.stringify(m));
      if (lang === "en" && width === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/head-sep-${kind}-${lang}-${width}.png`, clip: { x: 0, y: 0, width, height: 160 } });
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
