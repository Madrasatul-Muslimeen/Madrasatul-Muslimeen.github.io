// PCF MSA J52 -- the Āyah posters (the Owner, 20 Oct 2026: "1-4: A, 5. B, 6. A print button in note prints the note.
// The same button in poster prints the Poster."), real data (Al-Ikhlāṣ 112, Āyat al-Kursī 2:255, Yā-Sīn 36).
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/ayah-poster-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME must make the named check FAIL, exit 1; a missing anchor throws):
//   PURE (app/js/ayah-poster.js changed in memory and re-imported):
//     norange    a range is not kept inside the sūrah            -> "a range stays inside the sūrah and at most 40 āyāt"
//     noruku     the rukūʿ range is just the āyah                -> "the rukūʿ of 2:255 is 2:254–257"
//     nowords    the model drops the last word of each āyah      -> "the model keeps every word of every āyah"
//   BROWSER (page source changed in flight):
//     hiddenask  the chooser's [hidden] fix is gone              -> "after a choice the chooser is gone"
//     notranslit transliteration ignores Off                    -> "Transliteration Off removes every transliteration"
//     langleak   the Bangla choice still shows English meanings  -> "Bangla alone: no English meaning"
//     nofit      the poster is never scaled to its sheet        -> "a long range is scaled down until it fits"
//     nopage     A3 does not reach the printer's page size       -> "A3 sets the printed page to A3"
//     noprintcut the print view keeps the buttons               -> "Print shows the sheet alone"
//     pngdpi     the picture is drawn at screen size             -> "the picture is A4 at 150 dpi"
//     pngblank   the picture is drawn without its words          -> "the picture carries the words"
//     dawahpale  the Dawah poster's Arabic is washed out         -> "the Dawah Arabic EQUALS its colour"
//     cardnotes  the Āyah card's Poster still opens the Notes page -> "the Āyah card's 🖨 Poster opens the posters page"
//     bnleak     one Bangla string is missing                    -> "Bangla: no English in the page's own words"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PURE_MUT = {
  norange: ["  if (b - a + 1 > MAX_AYAHS) b = a + MAX_AYAHS - 1;", ""],
  noruku: ["  const same = list.filter((a) => a.ruku === here.ruku).map((a) => a.ayah);", "  const same = [ayah];"],
  nowords: ["words: (x.words ?? []).map(", "words: (x.words ?? []).slice(0, -1).map("],
};
const MUT = {
  hiddenask: ["app/ayah-poster.html", "  .ap-choose[hidden], #apEditor[hidden] { display: none; }", "  .ap-x[hidden] { display: none; }"],
  notranslit: ["app/js/ayah-poster.js", "return { tr: !!translit,", "return { tr: true,"],
  langleak: ["app/js/ayah-poster.js", "en: lang !== \"bn\", bn: lang !== \"en\" };", "en: true, bn: lang !== \"en\" };"],
  nofit: ["app/ayah-poster.html", "      if (at(1)) return { k: 1, fits: true };\n      let lo = 0.3", "      if (true) return { k: 1, fits: true };\n      let lo = 0.3"],
  nopage: ["app/ayah-poster.html", "size: ${state.paper === \"a3\" ? \"A3\" : \"A4\"} portrait", "size: A4 portrait"],
  noprintcut: ["app/ayah-poster.html", "    .ap-bar, .ap-tools, .ap-acts, .ap-status, .ap-choose, #zabRoot", "    .ap-status, .ap-choose, #zabRoot"],
  pngdpi: ["app/js/ayah-poster-image.js", "export const PICTURE_DPI = 150;", "export const PICTURE_DPI = 96;"],
  pngblank: ["app/js/ayah-poster-image.js", "          ctx.fillText(l.t, it.x + it.w / 2, ly + (l.px * l.lh) / 2); ly += l.px * l.lh;", "          ly += l.px * l.lh;"],
  dawahpale: ["app/ayah-poster.html", "line-height: 1.85; color: #fff8e7; }", "line-height: 1.85; color: #c9c3b0; }"],
  cardnotes: ["app/quranrevival.html", "location.href = `ayah-poster.html?surah=", "location.href = `notes.html?dawah=1&surah="],
  bnleak: ["app/js/i18n/bn.js", "  \"Which poster?\": \"কোন পোস্টার?\",\n", ""],
};
if (MUTATE && !MUT[MUTATE] && !PURE_MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const surah = (n) => JSON.parse(fs.readFileSync(`tools/quran-data-pull/output/surahs/surah_${String(n).padStart(3, "0")}.json`, "utf8"));

// ---------------------------------------------------------------- PURE
console.log("\n=== pure: app/js/ayah-poster.js ===");
{
  let src = fs.readFileSync("app/js/ayah-poster.js", "utf8");
  if (PURE_MUT[MUTATE]) {
    const [a, b] = PURE_MUT[MUTATE];
    if (!src.includes(a)) throw new Error(`pure mutation anchor missing: ${MUTATE}`);
    src = src.split(a).join(b);
  }
  const tmp = `/tmp/ayah-poster-under-test-${process.pid}.mjs`;
  fs.writeFileSync(tmp, src);
  const P = await import(tmp + "?" + Date.now());
  const s2 = surah(2), s112 = surah(112);
  const r1 = P.clampRange(286, 250, 400), r2 = P.clampRange(4, 3, 1), r3 = P.clampRange(286, 1, 286);
  check("a range stays inside the sūrah and at most 40 āyāt", r1.from === 250 && r1.to === 286 && r2.from === 1 && r2.to === 3 && r3.to - r3.from + 1 === 40, JSON.stringify({ r1, r2, r3 }));
  const ru = P.rukuRange(s2, 255);
  check("the rukūʿ of 2:255 is 2:254–257 (the pulled per-āyah rukūʿ numbers)", ru.from === 254 && ru.to === 257, JSON.stringify(ru));
  const m = P.posterModel(s112, 1, 4);
  const wordsOk = m.ayahs.length === 4 && m.ayahs.every((a, i) => a.words.length === s112.ayahs[i].words.length && a.words.every((w, j) => w.ar === s112.ayahs[i].words[j].arabic && w.bn === s112.ayahs[i].words[j].translation.bn));
  check("the model keeps every word of every āyah (Arabic and meanings as the data has them)", wordsOk, JSON.stringify(m.ayahs.map((a) => a.words.length)));
  check("the Dawah Arabic closes each āyah with its number mark ﴿١﴾…﴿٤﴾", ["١", "٢", "٣", "٤"].every((d) => P.dawahArabic(m).includes(`﴿${d}﴾`)));
  check("the reference reads 112 : 1–4 and 2 : 255", P.rangeRef(m) === "112 : 1–4" && P.rangeRef(P.posterModel(s2, 255, 255)) === "2 : 255");
  fs.unlinkSync(tmp);
}
if (PURE_MUT[MUTATE]) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

// ---------------------------------------------------------------- BROWSER
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
async function context(opts) {
  const ctx = await newContext(browser, { banner: false, ...opts });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT[MUTATE]) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
async function poster(ctx, q) {
  const { page, errors } = await openPage(ctx, `/app/ayah-poster.html?${q}`);
  await page.waitForFunction(() => document.body.dataset.apReady, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(250);
  return { page, errors };
}
const shown = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0; }, sel);
const realErrors = (errs) => errs.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));

{
  console.log("\n=== the page, English, 390 ===");
  const ctx = await context({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await poster(ctx, "surah=112&ayah=1&back=1");
  check("1A: with no kind chosen the page asks \"Which poster?\" with the two kinds", await shown(page, "#apChoose") && (await page.$$("[data-ap-choose]")).length === 2 && !(await shown(page, "#apEditor")));
  await page.click("[data-ap-choose=study]"); await page.waitForTimeout(300);
  check("after a choice the chooser is gone (computed display none) and the poster is on screen", !(await shown(page, "#apChoose")) && await shown(page, "#apSheet .ap-kid"));
  check("the choice is kept in the address (a reload or ← Back returns to it)", new URL(page.url()).searchParams.get("kind") === "study" && new URL(page.url()).searchParams.get("back") === "1");
  // 2A: one āyah, or a range
  check("2A: it opens on this āyah alone (112:1, 4 words)", await page.evaluate(() => document.querySelectorAll("#apSheet .ap-kid-ayah").length === 1 && document.querySelectorAll("#apSheet .ap-kid-word").length === 4));
  await page.click("[data-ap-range=surah]"); await page.waitForTimeout(300);
  check("2A: Whole sūrah gives 112:1–4, all 15 words, each āyah closed by its number", await page.evaluate(() => document.querySelectorAll("#apSheet .ap-kid-ayah").length === 4 && document.querySelectorAll("#apSheet .ap-kid-word").length === 15 && document.querySelectorAll("#apSheet .ap-kid-num").length === 4));
  await page.selectOption("[data-ap-from]", "2"); await page.waitForTimeout(300);
  check("2A: From 2 gives 112:2–4", await page.evaluate(() => document.querySelectorAll("#apSheet .ap-kid-ayah").length === 3) && /112 : 2–4/.test(await page.textContent("#apTitle")), await page.textContent("#apTitle"));
  await page.click("[data-ap-range=surah]"); await page.waitForTimeout(300);
  // 3A: meanings and transliteration
  const lines = () => page.evaluate(() => ({ tr: document.querySelectorAll("#apSheet .ap-tr").length, en: document.querySelectorAll("#apSheet .ap-m-en").length, bn: document.querySelectorAll("#apSheet .ap-m-bn").length }));
  const both = await lines();
  check("3A: Both + transliteration On: every word box has transliteration, English and Bangla", both.tr === 15 && both.en === 15 && both.bn === 15, JSON.stringify(both));
  await page.click("[data-ap-tr='0']"); await page.waitForTimeout(250);
  check("3A: Transliteration Off removes every transliteration", (await lines()).tr === 0, JSON.stringify(await lines()));
  await page.click("[data-ap-lang=bn]"); await page.waitForTimeout(250);
  const bnOnly = await lines();
  check("3A: Bangla alone: no English meaning, every Bangla meaning", bnOnly.en === 0 && bnOnly.bn === 15, JSON.stringify(bnOnly));
  await page.click("[data-ap-lang=en]"); await page.waitForTimeout(250);
  check("3A: English alone: no Bangla meaning", (await lines()).bn === 0 && (await lines()).en === 15);
  // 4A: the Dawah poster
  await page.click("[data-ap-kind=dawah]"); await page.waitForTimeout(300);
  const dawah = () => page.evaluate(() => ({ en: !!document.querySelector("#apSheet .ap-t-en"), bn: !!document.querySelector("#apSheet .ap-t-bn"), ar: document.querySelector("#apSheet .ap-dawah .ap-ar")?.textContent ?? "", trGroup: getComputedStyle(document.querySelector("[data-ap-tr]").closest(".ap-grp")).display }));
  const d1 = await dawah();
  check("4A: the Dawah poster with English: the Arabic of 112:1–4 and the English translation only; no transliteration choice", d1.en && !d1.bn && d1.ar.includes("﴿٤﴾") && d1.trGroup === "none", JSON.stringify(d1));
  await page.click("[data-ap-lang=both]"); await page.waitForTimeout(250);
  const d2 = await dawah();
  check("4A: Both gives the English and the Bangla translation", d2.en && d2.bn, JSON.stringify(d2));
  const col = await page.evaluate(() => { const a = document.querySelector("#apSheet .ap-dawah .ap-ar"); return getComputedStyle(a).color; });
  check(`the Dawah Arabic EQUALS its colour (#fff8e7 on the navy sheet): ${col}`, col === "rgb(255, 248, 231)", col);
  // 44px and no sideways scroll
  const fit = await page.evaluate(() => ({ side: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll(".ap-grp button, .ap-grp select, .ap-act, .ap-back")].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim()) }));
  check("no sideways scroll, every control 44px+ (390)", fit.side <= 0 && fit.small.length === 0, JSON.stringify(fit));
  check("no page errors", realErrors(errors).length === 0, realErrors(errors).slice(0, 2).join(" | "));
  await ctx.close();
}

{
  console.log("\n=== fit, print and the picture (1280) ===");
  const ctx = await context({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const { page } = await poster(ctx, "surah=36&ayah=1&from=1&to=12&kind=study");
  const f = await page.evaluate(() => { const s = document.getElementById("apSheet"), p = s.firstElementChild, a = p.querySelector(".ap-kid-ayahs"); return { k: Number(s.style.getPropertyValue("--k")), over: p.scrollHeight - p.clientHeight, ayOver: a.scrollHeight - a.clientHeight, status: document.getElementById("apStatus").textContent }; });
  check("a long range is scaled down until it fits: Yā-Sīn 1–12 at --k below 1, nothing cut, no warning", f.k < 1 && f.k >= 0.3 && f.over <= 1 && f.ayOver <= 1 && f.status === "", JSON.stringify(f));
  const { page: big } = await poster(ctx, "surah=2&ayah=1&from=1&to=40&kind=study");
  const w = await big.evaluate(() => ({ text: document.getElementById("apStatus").textContent, warn: document.getElementById("apStatus").classList.contains("ap-warn") }));
  check("too much for one sheet says so in words (2:1–40), never cuts silently", w.warn && /too much for one sheet/.test(w.text), JSON.stringify(w));
  await big.close();
  // print
  await page.click("[data-ap-paper=a3]"); await page.waitForTimeout(250);
  check("A3 sets the printed page to A3 (the @page rule) and is kept in the address", /size: A3 portrait/.test(await page.textContent("#apPageSize")) && new URL(page.url()).searchParams.get("paper") === "a3");
  await page.click("[data-ap-paper=a4]"); await page.waitForTimeout(250);
  await page.emulateMedia({ media: "print" });
  const pr = await page.evaluate(() => ({ chrome: [".ap-bar", ".ap-tools", ".ap-acts"].map((s) => getComputedStyle(document.querySelector(s)).display), w: document.getElementById("apSheet").getBoundingClientRect().width, h: document.getElementById("apSheet").getBoundingClientRect().height, bg: getComputedStyle(document.querySelector("#apSheet .ap-kid")).backgroundColor }));
  check("Print shows the sheet alone, A4 (210 × 297 mm), its paper colour kept", pr.chrome.every((d) => d === "none") && Math.abs(pr.w - 793.7) < 2 && Math.abs(pr.h - 1122.5) < 2 && pr.bg === "rgb(255, 253, 247)", JSON.stringify(pr));
  await page.emulateMedia({ media: "screen" });
  check("the 🖨 Print button calls the browser's own Print", await page.evaluate(() => { let n = 0; const o = window.print; window.print = () => { n++; }; document.querySelector("[data-ap-print]").click(); window.print = o; return n === 1; }));
  // the picture (5B)
  const pic = async (q) => {
    const { page: p } = await poster(ctx, q);
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }).catch(() => null), p.click("[data-ap-picture]")]);
    if (!dl) { await p.close(); return null; }
    const file = await dl.path(), name = dl.suggestedFilename();
    const b64 = fs.readFileSync(file).toString("base64");
    const info = await p.evaluate(async (src) => {
      const img = new Image(); img.src = `data:image/png;base64,${src}`; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
      const px = (a, b) => Array.from(x.getImageData(a, b, 1, 1).data.slice(0, 3));
      // ink in the word area: pixels much darker than the paper, in the box band under the header
      const d = x.getImageData(0, Math.round(img.height * 0.2), img.width, Math.round(img.height * 0.3)).data; let ink = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 250) ink++;
      return { w: img.width, h: img.height, corner: px(5, 5), ink };
    }, b64);
    await p.close();
    return { name, ...info };
  };
  const s = await pic("surah=112&ayah=1&from=1&to=4&kind=study");
  check("5B: Save as picture gives a PNG named after the poster", s?.name === "ayah-poster-study-112-1-4.png", JSON.stringify(s));
  check("the picture is A4 at 150 dpi (1240 × 1754)", s?.w === 1240 && s?.h === 1754, JSON.stringify(s));
  check("the picture carries the words (dark ink across the word area) on the study poster's paper colour", !!s && s.ink > 4000 && s.corner.join() === "255,253,247", JSON.stringify(s));
  const d = await pic("surah=2&ayah=255&kind=dawah&lang=both");
  check("the Dawah picture is navy at the corner", !!d && d.corner[2] > d.corner[0] && d.corner[0] < 60, JSON.stringify(d));
  await ctx.close();
}

{
  console.log("\n=== the Āyah card's 🖨 Poster (390) ===");
  const ctx = await context({ viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  await page.evaluate(() => { const ss = document.getElementById("surahSelect"); ss.value = "112"; ss.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => !!document.querySelector('[data-ayah-num-badge="112:1"]'), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="112:1"]')?.click());
  await page.waitForSelector("[data-ayah-sheet] [data-ayah-sheet-poster]", { timeout: 10000 }).catch(() => {});
  let went = true;
  await Promise.all([page.waitForURL(/ayah-poster\.html\?/, { timeout: 15000 }), page.click("[data-ayah-sheet] [data-ayah-sheet-poster]")]).catch(() => { went = false; });
  const u = went ? new URL(page.url()) : null;
  check("the Āyah card's 🖨 Poster opens the posters page for 112:1 with back=1 (no Note needed)", !!u && u.searchParams.get("surah") === "112" && u.searchParams.get("ayah") === "1" && u.searchParams.get("back") === "1", page.url());
  if (went) {
    await page.waitForFunction(() => document.body.dataset.apReady, null, { timeout: 15000 }).catch(() => {});
    check("…and asks \"Which poster?\"", await shown(page, "#apChoose"));
    let back = true;
    await Promise.all([page.waitForURL(/quranrevival\.html/, { timeout: 15000 }), page.click("#apBack")]).catch(() => { back = false; });
    await page.waitForFunction(() => document.getElementById("surahSelect")?.value === "112", null, { timeout: 20000 }).catch(() => {});
    check("← Back returns to the Qur'an at Sūrah 112", back && await page.evaluate(() => document.getElementById("surahSelect")?.value === "112"));
  }
  await ctx.close();
}

for (const [lang, width] of [["en", 320], ["en", 768], ["en", 1280], ["bn", 390]]) {
  console.log(`\n=== fit and words [${lang} ${width}] ===`);
  const ctx = await context({ viewport: { width, height: 900 }, appLang: lang === "bn" ? "bn" : null });
  const { page } = await poster(ctx, "surah=2&ayah=255&back=1");
  const ownWords = () => page.evaluate(() => [...document.querySelectorAll(".ap-bar, .ap-choose, .ap-tools .ap-lab, .ap-tools button, .ap-acts")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.textContent).join(" ").replace(/A4|A3|MSA/g, "").match(/[A-Za-z]{3,}/g) || []);
  const leakAsk = lang === "bn" ? await ownWords() : [];
  await page.click("[data-ap-choose=study]"); await page.waitForTimeout(300);
  const fit = await page.evaluate(() => ({ side: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll(".ap-grp button, .ap-grp select, .ap-act, .ap-back")].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim()), sheetW: document.getElementById("apSheet").getBoundingClientRect().width }));
  check(`[${lang} ${width}] no sideways scroll, every control 44px+, the sheet on screen`, fit.side <= 0 && fit.small.length === 0 && fit.sheetW > 200, JSON.stringify(fit));
  if (lang === "bn") {
    const leak = [...leakAsk, ...(await ownWords())];
    check("Bangla: no English in the page's own words (bar, chooser, choices, buttons)", leak.length === 0, JSON.stringify(leak.slice(0, 8)));
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
