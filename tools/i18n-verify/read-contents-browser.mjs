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
const openList = async (page) => {
  await page.click("#readContentsBtn");
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

// ---- Button: present, same size as neighbours, nothing cut, no sideways scroll
for (const lang of ["en", "bn"]) {
  for (const width of [320, 340, 360, 390, 412, 480, 768, 1280]) {
    const { ctx, page } = await start({ lang, width });
    const m = await page.evaluate(() => {
      const b = document.getElementById("readContentsBtn"), n = document.getElementById("wheelUnitBtn");
      const rb = b.getBoundingClientRect(), rn = n.getBoundingClientRect();
      const de = document.documentElement;
      return { w: rb.width, h: rb.height, nh: rn.height, cut: b.scrollWidth > b.clientWidth + 1, inView: rb.left >= 0 && rb.right <= innerWidth + 0.5, over: de.scrollWidth > de.clientWidth, label: b.textContent.trim() };
    });
    check(`${lang} ${width}px: Read button on screen, ${m.h}px tall, same as neighbour ${m.nh}px`, m.w > 0 && m.inView && Math.abs(m.h - m.nh) < 0.6, JSON.stringify(m));
    check(`${lang} ${width}px: label not cut, no sideways scroll`, !m.cut && !m.over, JSON.stringify(m));
    if (width === 390) check(`${lang}: label is "${lang === "bn" ? "পড়ুন" : "Read"}"`, m.label === (lang === "bn" ? "পড়ুন" : "Read"), m.label);
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
  const tabs = await page.$$eval("#readContentsTabs .rc-tab", (els) => els.map((e) => e.textContent.trim()));
  check("five tabs in order", tabs.join("|") === "Surah|Juz|Hizb|Page|Ruku'", tabs.join("|"));
  const counts = {};
  for (const [k, expected] of [["surah", 114], ["juz", 30], ["hizb", 60], ["page", 604], ["ruku", 556]]) {
    await page.click(`[data-rc-tab="${k}"]`);
    counts[k] = await page.$$eval("#readContentsBody .rc-row", (e) => e.length);
    check(`${k} tab has ${expected} rows`, counts[k] === expected, String(counts[k]));
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
  await page.click("#readContentsBtn");
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
  check("Bangla Surah tab meaning line is present (English fallback when nameTranslationBn is absent)", meaning.length > 0, meaning);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
