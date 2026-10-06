// Decision 76 (the Owner, 6 Oct 2026): the Writing sheet "follows my counting" (decision 55) -- in Al-Fatiha the
// Bismillah is unnumbered, Alhamdulillah is Ayah 1, and Ayah 7 starts at غَيْرِ. The sheet and its pop-out show
// exactly that; with the count switched off they show the stored text as before.
// Run from the repository root with serve.js on :8080. Expected glyphs come from the Mushaf JSON by hand:
// the end marker of stored 1:N is that ayah's last word; the count prints ① on 1:2 (stored 1:1's glyph),
// ⑥ after 1:7's 4th word (stored 1:6's glyph), and no marker on the Bismillah.
//   --mutate=no-count    the sheet ignores the count (fatihaCount: false)     -> the count-on checks fail
//   --mutate=no-half     the Ayah view shows all of stored 1:7               -> the 6/7 checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const DATA = JSON.parse(REAL);
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const words = DATA["1"].flatMap((l) => l.words || []);
const ayahWords = (a) => words.filter((w) => w.loc.startsWith(`1:${a}:`));
const markerOf = (a) => ayahWords(a).at(-1).g; // the stored end marker of 1:a
const bism = ayahWords(1), a2 = ayahWords(2), a7 = ayahWords(7);
check("the data: the Bismillah has 4 words and its marker", bism.length === 5, String(bism.length));
check("the data: stored 1:7 has 9 words and its marker", a7.length === 10, String(a7.length));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start({ lang, width, height, countOn }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.addInitScript((on) => { try { localStorage.setItem("mm_fatiha_bismillah_unnumbered", on ? "1" : "0"); } catch (e) {} }, countOn);
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
    if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
    return r.abort();
  });
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
  if (MUTATE) {
    const swaps = {
      "no-count": ["app/quranrevival.html", "**/app/quranrevival.html*", "fatihaCount: fatihaOn(),", "fatihaCount: false,"],
      "no-half": ["app/js/writing-sheet.js", "**/app/js/writing-sheet.js*", "if (split && half(wp) !== half(p0)) return;", ""],
    }[MUTATE];
    if (!swaps) throw new Error(`unknown mutation ${MUTATE}`);
    const [file, glob, a, b] = swaps;
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a}`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: body.split(a).join(b) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const readBtnSel = (page) => page.evaluate(() => ((document.getElementById("readHeadBtn")?.getBoundingClientRect().width ?? 0) > 0 ? "#readHeadBtn" : "#readContentsBtn"));
async function openSheetOnSurah1(page) {
  await page.click(await readBtnSel(page));
  await page.waitForFunction(() => document.querySelectorAll("#readContentsBody .rc-row").length > 0);
  await page.click('#readContentsBody .rc-row[data-rc-kind="surah"][data-rc-n="1"]');
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForTimeout(400);
  for (let i = 0; i < 4; i++) {
    const bare = await page.evaluate(() => document.body.classList.contains("fs-hide-readbar") && document.body.classList.contains("fs-hide-transport"));
    if (!bare) break;
    await page.click("#hideChromeBtn"); await page.waitForTimeout(150);
  }
  const onBar = await page.evaluate(() => (document.getElementById("readWritingBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (onBar) await page.click("#readWritingBtn");
  else { await page.click("#tabStudyBtn"); await page.click("#tabWritingBtn"); }
  await page.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page[data-painted]"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
// The words the sheet itself lays out on page 1 (its own layout, as a tap resolves), and a screen point for one.
// `drawn` selects the line list: the count's (fatihaPageLines) or the stored one.
const sheetLayout = (page, loc, counted, nth = 0) => page.evaluate(async ({ loc, counted, nth }) => {
  const ws = await import("/app/js/writing-sheet.js");
  const hr = await import("/app/js/hifz-renderer.js");
  const wrap = document.querySelector('#writingSheet .ws-page[data-page="1"]');
  wrap.scrollIntoView({ block: "start" });
  const r = wrap.querySelector(".ws-ink").getBoundingClientRect();
  const c = document.createElement("canvas").getContext("2d");
  const raw = hr.getMushafPageLines(1);
  const lay = ws.layoutWritingPage(counted ? hr.fatihaPageLines(raw) : raw, "hifz-p1", r.width, (tx, f, px) => { c.font = `${px}px '${f}'`; return c.measureText(tx).width; }, () => true);
  let k = 0;
  for (const ln of lay.lines) for (const w of ln.words || []) {
    if (w.loc === loc && k++ === nth) return { x: r.left + (lay.W - lay.W * 0.07) - ln.scale * (w.offset + w.width / 2), y: r.top + ln.y + lay.pitch * 0.5 };
  }
  return null;
}, { loc, counted, nth });
const pop = (page) => page.evaluate(() => {
  const s = document.querySelector("#writingSheet .wp [data-wp-stage]");
  return s ? { mode: s.dataset.mode, glyphs: s.dataset.glyphs.split("|"), locs: s.dataset.locs.split(",") } : null;
});
async function popAyahAt(page, loc, counted) {
  await page.click('#writingSheet [data-ws="popout"]');
  const pt = await sheetLayout(page, loc, counted);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForFunction(() => { const s = document.querySelector("#writingSheet .wp [data-wp-stage]"); return s && s.dataset.fs; }, null, { timeout: 8000 });
  await page.click('#writingSheet .wp [data-wp-mode="ayah"]');
  await page.waitForTimeout(400);
  const p = await pop(page);
  await page.click('#writingSheet .wp [data-wp="close"]').catch(() => {});
  await page.waitForTimeout(200);
  const ok = page.locator("#writingSheet .wp [data-wp-confirm-yes], #writingSheet [data-wp-yes]");
  if (await ok.count()) await ok.first().click().catch(() => {});
  await page.waitForFunction(() => !document.querySelector("#writingSheet .wp"), null, { timeout: 4000 }).catch(() => {});
  return p;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const [width, height] of [[390, 800], [1280, 800]]) for (const lang of ["en", "bn"]) {
  const tag = `[${width} ${lang}]`;
  console.log(`\n=== ${tag} count ON ===`);
  {
    const { ctx, page, errors } = await start({ lang, width, height, countOn: true });
    await openSheetOnSurah1(page);
    let p = await popAyahAt(page, "1:1:2", true);
    check(`${tag} the Bismillah's Ayah view has its 4 words and NO number`, !!p && same(p.locs, bism.slice(0, 4).map((w) => w.loc)) && !p.glyphs.includes(markerOf(1)), JSON.stringify(p));
    p = await popAyahAt(page, "1:2:1", true);
    check(`${tag} Alhamdulillah ends with ① (the number one lower)`, !!p && p.glyphs.at(-1) === markerOf(1) && same(p.locs, a2.map((w) => w.loc)), JSON.stringify(p?.glyphs.slice(-1)));
    p = await popAyahAt(page, "1:7:2", true);
    check(`${tag} a word before غَيْرِ: the Ayah view is Ayah 6 -- words 1-4 and ⑥`, !!p && same(p.locs, [...a7.slice(0, 4).map((w) => w.loc), "1:7:4"]) && p.glyphs.at(-1) === markerOf(6), JSON.stringify(p?.locs));
    p = await popAyahAt(page, "1:7:6", true);
    check(`${tag} a word from غَيْرِ: the Ayah view is Ayah 7 -- words 5-9 and ⑦`, !!p && same(p.locs, a7.slice(4).map((w) => w.loc)) && p.glyphs.at(-1) === markerOf(7), JSON.stringify(p?.locs));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
  console.log(`=== ${tag} count OFF ===`);
  {
    const { ctx, page } = await start({ lang, width, height, countOn: false });
    await openSheetOnSurah1(page);
    let p = await popAyahAt(page, "1:1:2", false);
    check(`${tag} count off: the Bismillah keeps its stored marker`, !!p && same(p.locs, bism.map((w) => w.loc)) && p.glyphs.at(-1) === markerOf(1), JSON.stringify(p?.locs));
    p = await popAyahAt(page, "1:7:2", false);
    check(`${tag} count off: stored 1:7 is one Ayah, all 9 words and its marker`, !!p && same(p.locs, a7.map((w) => w.loc)), JSON.stringify(p?.locs));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Writing sheet follows the Al-Fatiha count: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
