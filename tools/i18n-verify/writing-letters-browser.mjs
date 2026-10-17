// PCF MSA J35 (17 Oct 2026) -- Letters practice in the writing window: each of the 28 letters alone and in its
// beginning, middle and end forms, to trace over or on blank lines. Run from the repository root with serve.js on :8080.
//   node tools/i18n-verify/writing-letters-browser.mjs [--only=data|ui] [--width=390] [--lang=en|bn] [--mutate=<name>] [--shot]
//
// Expected values (the alphabet, the form names, the Bangla words) are written here by hand, never read from the code
// under test. The data check also runs on a seeded 27-letter list as a POSITIVE CONTROL: it must fail.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
import fs from "fs";
import { ARABIC_LETTERS } from "../../app/js/arabic-letters.js";

const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const WIDTHS = [[320, 700], [390, 800], [820, 1000], [1280, 800], [1440, 900]];
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const ONLY = arg("only"), WIDTH = Number(arg("width")) || 0, LANG = arg("lang"), MUTATE = arg("mutate");
const SHOT = process.argv.includes("--shot");
const ALPHABET = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
const NON_JOINERS = "ادذرزو";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise; await it first`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
// A wait that times out FAILS BY NAME instead of killing the run.
async function must(name, p) {
  try { return await p; } catch (e) { fail++; console.log(`  FAIL  ${name} (timed out / threw: ${String(e.message).split("\n")[0]})`); return null; }
}

const MUTATIONS = {
  "no-letters-button": ["writing-popout.js", 'data-wp-mode="letters"', 'data-wp-mode="lettersX"'],
  "next-dead": ["writing-popout.js", "st.li = n; st.extra = 0;", "st.extra = 0;"],
  "wrap-ends": ["writing-popout.js", "k >= 0 && k < ARABIC_LETTERS.length ? k : null", "(k + ARABIC_LETTERS.length) % ARABIC_LETTERS.length"],
  "way-back": ["writing-popout.js", "st.mode = b.dataset.wpMode; st.extra = 0;", "st.mode = b.dataset.wpMode; st.extra = 0; st.cw = unitList()[0] || st.cw;"],
  "no-model": ["writing-popout.js", 'if (st.mode === "letters") { renderLettersModel(); return; }', 'if (st.mode === "letters") { return; }'],
  "shared-ink": ["writing-popout.js", "`l:${letterNow().id}`", '"l:x"'],
  "one-line": ["writing-popout.js", "if (letters && cur.length) { lines.push([]); cursor = 0; }", "if (false) { lines.push([]); cursor = 0; }"],
  "no-middle": ["arabic-letters.js", 'middle: "ـبـ"', 'middle: ""'],
  "no-bn": ["i18n/bn.js", '"Previous letter": "আগের হরফ"', '"Previous letter": "Previous letter"'],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error("unknown mutation " + MUTATE);

// ---- the data (item 6), once, in node. validate() returns the list of problems.
function validate(list) {
  const bad = [];
  if (list.length !== 28) bad.push(`${list.length} entries, not 28`);
  list.forEach((L, i) => {
    if (L.letter !== ALPHABET[i]) bad.push(`#${i} is ${L.letter}, expected ${ALPHABET[i]}`);
    for (const f of ["alone", "start", "middle", "end"]) {
      if (!L.forms?.[f]) bad.push(`${L.id} has no ${f} form`);
      if (!L.examples?.[f]) bad.push(`${L.id} has no ${f} example`);
      else if (!L.examples[f].includes(L.letter)) bad.push(`${L.id} ${f} example ${L.examples[f]} lacks the letter`);
      if (L.forms?.[f] && !L.forms[f].includes(L.letter)) bad.push(`${L.id} ${f} form lacks the letter`);
    }
    if (!L.name?.en || !L.name?.bn) bad.push(`${L.id} has no en/bn name`);
    if ((NON_JOINERS.includes(L.letter)) === !!L.joinsLeft) bad.push(`${L.id} joinsLeft is wrong`);
  });
  return bad;
}
if (!ONLY || ONLY === "data") {
  const bad = validate(ARABIC_LETTERS);
  check("data: exactly 28 letters in alphabet order, every form and example present, each example holds its letter", bad.length === 0, bad.join("; "));
  check("data: POSITIVE CONTROL -- a seeded 27-letter list fails the same check", validate(ARABIC_LETTERS.slice(0, 27)).length > 0);
  const broken = ARABIC_LETTERS.map((L, i) => (i === 3 ? { ...L, examples: { ...L.examples, middle: "كتب" } } : L));
  check("data: POSITIVE CONTROL -- an example that lacks its letter fails", validate(broken).length > 0);
  check("data: the six non-joining letters (ا د ذ ر ز و) are flagged and only they", ARABIC_LETTERS.filter((L) => !L.joinsLeft).map((L) => L.letter).join("") === NON_JOINERS);
  check("data: joining forms use a tatweel, non-joiners' middle is their end shape", ARABIC_LETTERS.every((L) => (L.joinsLeft ? L.forms.start === L.letter + "ـ" && L.forms.middle === "ـ" + L.letter + "ـ" : L.forms.start === L.letter && L.forms.middle === L.forms.end)));
}

if (ONLY === "data") {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start({ lang, width, height }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_card_look", "night"); localStorage.setItem("mm_fatiha_bismillah_unnumbered", "0"); } catch (e) {} });
  if (MUTATE) await ctx.route(`**/app/js/${MUTATIONS[MUTATE][0]}`, async (r) => {
    const [, a, b] = MUTATIONS[MUTATE];
    const src = await (await r.fetch()).text();
    if (!src.includes(a)) throw new Error("mutation target not found: " + MUTATE);
    r.fulfill({ status: 200, contentType: "application/javascript", body: src.split(a).join(b) });
  });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
    if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
    return r.abort();
  });
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const readBtnSel = (page) => page.evaluate(() => ((document.getElementById("readHeadBtn")?.getBoundingClientRect().width ?? 0) > 0 ? "#readHeadBtn" : "#readContentsBtn"));
async function pickSurah1(page) {
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
const wordPoint = (page, n, loc) => page.evaluate(async ({ n, loc }) => {
  const ws = await import("/app/js/writing-sheet.js");
  const hr = await import("/app/js/hifz-renderer.js");
  const wrap = document.querySelector(`#writingSheet .ws-page[data-page="${n}"]`);
  wrap.scrollIntoView({ block: "start" });
  const r = wrap.querySelector(".ws-ink").getBoundingClientRect();
  const c = document.createElement("canvas").getContext("2d");
  const lay = ws.layoutWritingPage(hr.getMushafPageLines(n), `hifz-p${n}`, r.width, (tx, f, px) => { c.font = `${px}px '${f}'`; return c.measureText(tx).width; }, () => true);
  for (const ln of lay.lines) {
    const w = (ln.words || []).find((q) => q.loc === loc);
    if (w) return { x: r.left + (lay.W - lay.W * 0.07) - ln.scale * (w.offset + w.width / 2), y: r.top + ln.y + lay.pitch * 0.5 };
  }
  return null;
}, { n, loc });
async function popFromWord(page, n, loc) {
  await page.click('#writingSheet [data-ws="popout"]');
  const pt = await wordPoint(page, n, loc);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForFunction(() => { const s = document.querySelector("#writingSheet .wp [data-wp-stage]"); return s && s.dataset.fs; }, null, { timeout: 8000 });
  await page.waitForTimeout(300);
}
const wp = (page, sel) => page.click(`#writingSheet .wp ${sel}`);
const info = (page) => page.evaluate(() => {
  const r = document.querySelector("#writingSheet .wp");
  const s = r?.querySelector("[data-wp-stage]");
  const v = (sel) => r.querySelector(sel);
  const prev = v('[data-wp="prev"]'), next = v('[data-wp="next"]');
  return r ? { loc: r.dataset.loc, glyph: r.dataset.glyph, mode: s.dataset.mode, letter: s.dataset.letter || "", fs: Number(s.dataset.fs), W: Number(s.dataset.canvasW), lines: Number(s.dataset.lines), linesMode: s.dataset.linesMode, glyphs: s.dataset.glyphs.split("|"), font: r.dataset.letterFont === "1",
    prevOff: prev.disabled, nextOff: next.disabled, prevLabel: prev.getAttribute("aria-label"), nextLabel: next.getAttribute("aria-label"),
    modelHidden: v("[data-wp-model]").hidden, modelGlyphs: v("[data-wp-model]").dataset.glyphs || "" } : null;
});
// Is the middle strip of form line k (0..3) of the FIRST copy of the paper inked? Reads the real canvas pixels.
const bandInk = (page, k) => page.evaluate((k) => {
  const c = document.querySelector("#writingSheet .wp .wp-paper");
  const st = document.querySelector("#writingSheet .wp [data-wp-stage]").dataset;
  const dpr = c.width / parseFloat(c.style.width), fs = Number(st.fs), pad = fs * 0.3, lh = fs * 2;
  const cx = c.width / 2, half = fs * 0.12 * dpr;
  const x0 = Math.floor(cx - half), x1 = Math.ceil(cx + half), y0 = Math.floor((pad + k * lh) * dpr), y1 = Math.floor((pad + (k + 1) * lh) * dpr);
  const d = c.getContext("2d").getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 255) + Math.abs(d[i + 1] - 253) + Math.abs(d[i + 2] - 248) > 20) n++;
  return n;
}, k);
const modelInk = (page) => page.evaluate(() => {
  const c = document.querySelector("#writingSheet .wp [data-wp-modelcv]");
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 244) + Math.abs(d[i + 1] - 238) + Math.abs(d[i + 2] - 221) > 40) n++;
  return n;
});
const inkCount = (page) => page.evaluate(() => {
  const c = document.querySelector("#writingSheet .wp .wp-ink");
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
  return n;
});
async function stroke(page, pts) {
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 6 });
  await page.mouse.up();
}
const modeRow = (page) => page.evaluate(() => {
  const bs = [...document.querySelectorAll("#writingSheet .wp [data-wp-mode]")].map((b) => b.getBoundingClientRect());
  const win = document.querySelector("#writingSheet .wp-win").getBoundingClientRect();
  const nav = [...document.querySelectorAll('#writingSheet .wp [data-wp="prev"],#writingSheet .wp [data-wp="next"],#writingSheet .wp [data-wp="close"]')].map((b) => b.getBoundingClientRect());
  const all = [...bs, ...nav];
  return { n: bs.length, sameLine: new Set(bs.map((r) => Math.round(r.top))).size === 1, minH: Math.min(...all.map((r) => r.height)), minW: Math.min(...all.map((r) => r.width)), inside: all.every((r) => r.left >= win.left - 1 && r.right <= win.right + 1), texts: [...document.querySelectorAll("#writingSheet .wp [data-wp-mode]")].map((b) => b.textContent.trim()) };
});

const sets = WIDTHS.filter(([w]) => !WIDTH || w === WIDTH);
for (const [width, height] of MUTATE ? sets.filter(([w]) => w === (WIDTH || 390)) : sets) for (const lang of LANG ? [LANG] : ["en", "bn"]) {
  const tag = `[${width} ${lang}]`;
  const { ctx, page, errors } = await start({ lang, width, height });
  await pickSurah1(page);
  await popFromWord(page, 1, "1:2:1");
  const word0 = await info(page);
  check(`${tag} the window opens on the word 1:2:1 in Word mode`, word0 && word0.mode === "word" && word0.loc === "1:2:1", JSON.stringify(word0));

  // ---- the first row
  const row = await modeRow(page);
  check(`${tag} three mode buttons Word / Ayah / Letters on one line, all in the window, every button >= 40px`, row.n === 3 && row.sameLine && row.minH >= 39.5 && row.minW >= 39.5 && row.inside, JSON.stringify(row));
  check(`${tag} the Letters button reads ${lang === "bn" ? "হরফ" : "Letters"}`, row.texts[2] === (lang === "bn" ? "হরফ" : "Letters"), JSON.stringify(row.texts));

  // ---- into Letters
  await wp(page, '[data-wp-mode="letters"]');
  await must(`${tag} Letters mode loads its font and draws`, page.waitForFunction(() => document.querySelector("#writingSheet .wp").dataset.letterFont === "1", null, { timeout: 8000 }));
  await page.waitForTimeout(200);
  let a = await info(page);
  check(`${tag} Letters is pressed, Word and Ayah are not`, await page.evaluate(() => ["word", "ayah", "letters"].map((m) => document.querySelector(`#writingSheet .wp [data-wp-mode="${m}"]`).getAttribute("aria-pressed")).join()) === "false,false,true");
  check(`${tag} starts on ا with four lines, one per form`, a.mode === "letters" && a.letter === "alif" && a.lines === 4 && a.glyphs.length === 4, JSON.stringify(a));
  check(`${tag} the arrows say Previous letter / Next letter`, a.prevLabel === (lang === "bn" ? "আগের হরফ" : "Previous letter") && a.nextLabel === (lang === "bn" ? "পরের হরফ" : "Next letter"), `${a.prevLabel} | ${a.nextLabel}`);
  check(`${tag} ‹ is off on the first letter and › is on (stops at the ends, does not wrap)`, a.prevOff && !a.nextOff);
  const joins = await page.evaluate(async () => {
    const c = document.createElement("canvas").getContext("2d");
    c.font = "96px 'MMSA Letter Practice'";
    const w = (s) => c.measureText(s).width;
    return { ba: w("ب"), baStart: w("بـ"), baMid: w("ـبـ"), baEnd: w("ـب"), ok: document.fonts.check("96px 'MMSA Letter Practice'") };
  });
  check(`${tag} the bundled font is the one drawing (joins widen the forms)`, joins.ok && joins.baStart < joins.ba && joins.baMid !== joins.baEnd && joins.baMid !== joins.ba, JSON.stringify(joins));

  // ---- all 28, trace over
  const seen = [];
  let allFour = true, lastDetail = "";
  for (let i = 0; i < 28; i++) {
    a = await info(page);
    seen.push(ARABIC_LETTERS[i].id === a.letter);
    const px = [];
    for (let k = 0; k < 4; k++) px.push(await bandInk(page, k));
    if (!px.every((n) => n > 20)) { allFour = false; lastDetail += ` ${a.letter}:${px.join("/")}@W${a.W}fs${a.fs}`; }
    if (!(a.glyphs.join("|") === ARABIC_LETTERS[i].forms.alone + "|" + ARABIC_LETTERS[i].forms.start + "|" + ARABIC_LETTERS[i].forms.middle + "|" + ARABIC_LETTERS[i].forms.end)) { allFour = false; lastDetail += ` ${a.letter}:glyphs`; }
    if (i < 27) { await wp(page, '[data-wp="next"]'); await page.waitForTimeout(40); }
  }
  check(`${tag} › steps all 28 letters in alphabet order (ا to ي)`, seen.every(Boolean), JSON.stringify(seen.map((x, i) => (x ? "" : i)).filter(String)));
  check(`${tag} Trace over: every one of the 28 letters has all four forms drawn (pixels in each form's band)`, allFour, lastDetail);
  a = await info(page);
  check(`${tag} on ي: › is off (no wrap) and ‹ is on`, a.letter === "ya" && a.nextOff && !a.prevOff, JSON.stringify(a));
  await wp(page, '[data-wp="prev"]');
  await page.waitForTimeout(60);
  a = await info(page);
  check(`${tag} ‹ goes back one letter (ي to و)`, a.letter === "waw", a.letter);

  // ---- the writing is kept per letter
  const box = await page.evaluate(() => { const r = document.querySelector("#writingSheet .wp .wp-scroll").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await stroke(page, [[box.x + box.w * 0.4, box.y + 40], [box.x + box.w * 0.6, box.y + 80], [box.x + box.w * 0.5, box.y + 120]]);
  const inked = await inkCount(page);
  check(`${tag} the pen writes over a letter`, inked > 100, String(inked));
  await wp(page, '[data-wp="next"]');
  await page.waitForTimeout(60);
  check(`${tag} the next letter has its own clean paper`, (await inkCount(page)) === 0);
  await wp(page, '[data-wp="prev"]');
  await page.waitForTimeout(60);
  check(`${tag} coming back to the letter finds its writing`, (await inkCount(page)) === inked);
  await wp(page, '[data-wp="undo"]');
  check(`${tag} undo takes it off`, (await inkCount(page)) === 0);

  // ---- Letter style: the three still draw
  for (const shade of ["lighter", "book", "light"]) {
    await page.selectOption("#writingSheet .wp [data-wp-shade]", shade);
    await page.waitForTimeout(60);
    const px = [];
    for (let k = 0; k < 4; k++) px.push(await bandInk(page, k));
    check(`${tag} Letter style ${shade} draws all four forms`, px.every((n) => n > 5), px.join("/"));
  }

  // ---- Blank lines
  await page.selectOption("#writingSheet .wp [data-wp-lines]", "blank");
  await page.waitForTimeout(150);
  a = await info(page);
  const modelN = await modelInk(page);
  const expectForms = ARABIC_LETTERS.find((L) => L.id === a.letter).forms;
  check(`${tag} Blank lines: the four forms are shown once above the lines`, !a.modelHidden && a.modelGlyphs === [expectForms.alone, expectForms.start, expectForms.middle, expectForms.end].join("|") && modelN > 300, `${a.modelHidden} ${a.modelGlyphs} ${modelN}`);
  const blankPx = [];
  for (let k = 0; k < 4; k++) blankPx.push(await bandInk(page, k));
  check(`${tag} Blank lines: the paper has ruled lines and none of the letter drawn on it`, a.linesMode === "blank" && blankPx.every((n) => n > 0 && n < 40), `${a.linesMode} ${blankPx}`);
  await wp(page, '[data-wp="next"]');
  await page.waitForTimeout(60);
  a = await info(page);
  check(`${tag} Blank lines: › still steps (و to ي) and the model follows`, a.letter === "ya" && a.modelGlyphs.startsWith("ي|"), JSON.stringify(a));
  if (SHOT && width === 390 && lang === "en") {
    // handled below (needs ب on Trace over)
  }
  await page.selectOption("#writingSheet .wp [data-wp-lines]", "trace");
  await page.waitForTimeout(100);

  // ---- picture of ب, trace over
  if (SHOT && width === 390 && lang === "en") {
    while ((await info(page)).letter !== "ba") { await wp(page, '[data-wp="prev"]'); await page.waitForTimeout(40); }
    await page.waitForTimeout(200);
    await page.screenshot({ path: "docs/reports/2026-10-17-j35-letter-sheet-ba.png" });
  }

  // ---- the way back (decision 86)
  await wp(page, '[data-wp-mode="ayah"]');
  await page.waitForTimeout(150);
  a = await info(page);
  check(`${tag} Ayah from Letters returns to the Ayah of the word the window opened on`, a.mode === "ayah" && a.loc === "1:2:1", JSON.stringify(a));
  await wp(page, '[data-wp-mode="letters"]');
  await page.waitForTimeout(150);
  await wp(page, '[data-wp-mode="word"]');
  await page.waitForTimeout(150);
  a = await info(page);
  check(`${tag} Word from Letters returns to the word the window opened on (1:2:1)`, a.mode === "word" && a.loc === "1:2:1" && a.glyph === word0.glyph, JSON.stringify(a));
  check(`${tag} Word's ‹ › are the word steppers again`, a.prevLabel === (lang === "bn" ? "আগের শব্দ" : "Previous word"), a.prevLabel);

  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource/.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
