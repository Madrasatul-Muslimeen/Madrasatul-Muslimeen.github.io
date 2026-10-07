// W2 (6 Oct 2026) -- the Writing sheet's pop-out: tap a word (pick mode), see the word or its whole Ayah,
// make it bigger, and write over it with every tool. Run from the repository root with serve.js on :8080.
//
// Expected values come from the Mushaf JSON by hand (1:2:1 is the first word of Al-Fatiha's 2nd ayah on
// page 1), never from the code under test. Tap positions come from the page's own layout
// (layoutWritingPage), exactly as the sheet itself resolves a tap; every tap is a REAL mouse event.
// No ayah crosses a page in this (QCF v2) data, so the cross-page case serves a copy of the JSON in which
// 1:7's last two words have been moved onto page 2.
// Updated in place 6 Oct 2026 (decision 76): the sheet now follows the reader's Al-Fatiha count, which is ON by
// default and renumbers page 1's markers. This suite proves the pop-out's MECHANICS against the stored text, so it
// runs with the count switched OFF; writing-sheet-fatiha-count-browser.mjs proves the count itself.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const DATA = JSON.parse(REAL);
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";

// the page-1 line holding 1:7, split: its last two words go onto a new line of page 2
const SPLIT = JSON.parse(REAL);
{
  const last = SPLIT["1"].filter((l) => l.type === "ayah" && l.words.some((w) => w.loc.startsWith("1:7:"))).pop();
  const moved = last.words.splice(last.words.length - 2, 2);
  SPLIT["2"].push({ ...last, words: moved });
}
const SPLIT_BODY = JSON.stringify(SPLIT);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
// Decision 83 checks run with --d83-only (and, to prove each can fail, --mutate=<name> which edits the SERVED
// pop-out source so exactly the named behaviour is broken).
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = process.argv.includes("--d83-only") || !!MUTATE;
const MUTATIONS = {
  "full-screen": [".wp-full .wp-win{width:100%;height:100%", ".wp-full .wp-win{width:60%;height:60%"],
  "more-paper": ["st.extra += MORE_BLOCKS;", "st.extra += 0;"],
  "blank-traces": ['if (st.lines === "blank") {\n          ctx.fillStyle = RULE;', 'if (false) {\n          ctx.fillStyle = RULE;'],
  "no-model": ["modelEl.hidden = !blank;", "modelEl.hidden = true;"],
  "next-dead": ['case "next": go(1); break;', 'case "next": break;'],
  "stop-at-ayah": ["if (!all[k].marker) return all[k];", 'if (!all[k].marker) return all[k].loc.split(":")[1] === st.cw.loc.split(":")[1] ? all[k] : null;'],
  "shared-ink": ["`w:${st.cw.loc}`", '"w:x"'],
  "ayah-step-word": ["mine.has(all[k + dir].loc)", "false"],
  "phone-no-ayah": ["@media (max-width:599.98px){.wp-tx{display:none}}", "@media (max-width:599.98px){.wp-tx{display:none}[data-wp-mode=ayah]{display:none}}"],
  "no-end-disable": ["nx.disabled = !neighbour(1);", "nx.disabled = false;"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error("unknown mutation " + MUTATE);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BN = "০১২৩৪৫৬৭৮৯";
const digits = (n, lang) => (lang === "bn" ? String(n).replace(/[0-9]/g, (d) => BN[d]) : String(n));
const firstWord = (loc) => DATA["1"].flatMap((l) => l.words || []).find((w) => w.loc === loc);

async function start({ lang, width, height, body = REAL }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_card_look", "night"); localStorage.setItem("mm_fatiha_bismillah_unnumbered", "0"); } catch (e) {} });
  if (MUTATE) await ctx.route("**/writing-popout.js", async (r) => {
    const [a, b] = MUTATIONS[MUTATE];
    const src = await (await r.fetch()).text();
    if (!src.includes(a)) throw new Error("mutation target not found: " + MUTATE);
    r.fulfill({ status: 200, contentType: "application/javascript", body: src.split(a).join(b) });
  });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body });
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
// Screen point at the middle of word `loc` on page `n`, from the page's own layout.
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
const pop = (page) => page.evaluate(() => {
  const r = document.querySelector("#writingSheet .wp");
  const s = r?.querySelector("[data-wp-stage]");
  return r ? { glyph: r.dataset.glyph, loc: r.dataset.loc, mode: s.dataset.mode, fs: Number(s.dataset.fs), glyphs: s.dataset.glyphs.split("|"), locs: s.dataset.locs.split(","), pages: s.dataset.pages.split(",").map(Number), W: Number(s.dataset.canvasW), size: Number(s.dataset.size) } : null;
});
// bounding box of canvas pixels: kind "paper" = anything unlike the paper colour, "ink" = any alpha
const bbox = (page, kind) => page.evaluate((kind) => {
  const c = document.querySelector(`#writingSheet .wp ${kind === "ink" ? ".wp-ink" : ".wp-paper"}`);
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    const on = kind === "ink" ? d[i + 3] > 20 : (Math.abs(d[i] - 255) + Math.abs(d[i + 1] - 253) + Math.abs(d[i + 2] - 248) > 20);
    if (on) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { n, w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, x1, y1, dpr: c.width / parseFloat(c.style.width) };
}, kind);
const sheetInk = (page) => page.evaluate(() => [...document.querySelectorAll("#writingSheet .ws-ink")].reduce((a, c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) a++; return a; }, 0));
const stageBox = (page) => page.evaluate(() => { const r = document.querySelector("#writingSheet .wp .wp-scroll").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
async function stroke(page, pts) {
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 6 });
  await page.mouse.up();
}
const wp = (page, sel) => page.click(`#writingSheet .wp ${sel}`);

async function popFromWord(page, n, loc) {
  await page.click('#writingSheet [data-ws="popout"]');
  const pt = await wordPoint(page, n, loc);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForFunction(() => { const s = document.querySelector("#writingSheet .wp [data-wp-stage]"); return s && s.dataset.fs; }, null, { timeout: 8000 });
  await page.waitForTimeout(300);
}

for (const [width, height] of ONLY ? [] : [[390, 800], [820, 1000], [1280, 800]]) for (const lang of ["en", "bn"]) {
  const tag = `[${width} ${lang}]`;
  const { ctx, page, errors } = await start({ lang, width, height });
  await pickSurah1(page);
  const expect = firstWord("1:2:1");

  // ---- picking the word
  const noInk0 = await sheetInk(page);
  await page.click('#writingSheet [data-ws="popout"]');
  const hint = await page.evaluate(() => { const h = document.querySelector("#writingSheet [data-ws-pick]"); return { shown: !h.hidden && h.getBoundingClientRect().height > 0, text: h.textContent.trim() }; });
  check(`${tag} Pop out turns pick mode on and the toolbar says so in words`, hint.shown && (lang === "bn" ? hint.text === "আলাদা করে দেখতে একটি শব্দে ট্যাপ করুন" : hint.text === "Tap a word to pop it out"), JSON.stringify(hint));
  const tb = await page.evaluate(() => {
    const cy = [...document.querySelectorAll("#writingSheet .ws-toolbar button,#writingSheet .ws-toolbar select")].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest("[data-ws-menu]")).map((e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
    const tops = new Set(cy.map((y) => Math.round(y / 30)));
    const b = document.querySelector('#writingSheet [data-ws="popout"]');
    const r2 = document.querySelector("#writingSheet .ws-row2").getBoundingClientRect();
    const r = b.getBoundingClientRect();
    return { rows: tops.size, inRow2: r.top >= r2.top - 1 && r.bottom <= r2.bottom + 1, w: r.width, h: r.height };
  });
  check(`${tag} the 🔍 button is in row 2, >= 40px, and the toolbar is still two rows`, tb.rows === 2 && tb.inRow2 && tb.w >= 39.5 && tb.h >= 39.5, JSON.stringify(tb));
  const pt = await wordPoint(page, 1, "1:2:1");
  await page.mouse.click(pt.x, pt.y);
  await page.waitForSelector("#writingSheet .wp [data-wp-stage][data-fs]", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  let p = await pop(page);
  if (!p) { check(`${tag} tapping 1:2:1 opens the pop-out`, false, "no pop-out opened"); await ctx.close(); continue; }
  check(`${tag} tapping 1:2:1 opens the pop-out for THAT word (glyph code from the layout, not position)`, p && p.glyph === expect.g && p.loc === "1:2:1" && p.mode === "word" && p.glyphs.length === 1 && p.glyphs[0] === expect.g, JSON.stringify(p));
  check(`${tag} the tap drew nothing on the sheet`, (await sheetInk(page)) === noInk0);
  const pk = await page.evaluate(() => document.querySelector("#writingSheet [data-ws-pick]").hidden);
  check(`${tag} pick mode switched itself off`, pk === true);

  // ---- the word is drawn, and a neighbour pick gives a different glyph (wrong-word guard)
  const b0 = await bbox(page, "paper");
  check(`${tag} the word is really drawn (glyph pixels on the canvas)`, b0.n > 200, JSON.stringify(b0));

  // ---- size
  const fs0 = p.fs;
  const wBtn = await page.evaluate(() => { const l = document.querySelector("#writingSheet .wp [data-wp=bigger]"); return l.getBoundingClientRect().width; });
  await wp(page, '[data-wp="bigger"]'); await page.waitForTimeout(250);
  p = await pop(page);
  const b1 = await bbox(page, "paper");
  check(`${tag} A+ makes the letters bigger and RE-DRAWS them (font size and glyph box both grow)`, p.fs > fs0 * 1.15 && b1.w > b0.w * 1.15 && b1.h > b0.h * 1.15, `fs ${fs0}->${p.fs} box ${b0.w}x${b0.h}->${b1.w}x${b1.h}`);
  const steps = await page.evaluate(() => 6);
  let count = 1;
  while (!(await page.evaluate(() => document.querySelector("#writingSheet .wp [data-wp=bigger]").disabled)) && count < 12) { await wp(page, '[data-wp="bigger"]'); count++; }
  await page.waitForTimeout(250);
  const pMax = await pop(page);
  check(`${tag} there are five or more sizes, and the largest Word size fills most of a phone's width`, pMax.size >= 4 && pMax.size - 0 >= 4 && (width > 600 || (await bbox(page, "paper")).w / (await bbox(page, "paper")).dpr >= width * 0.7), `${JSON.stringify(pMax)}`);
  while (!(await page.evaluate(() => document.querySelector("#writingSheet .wp [data-wp=smaller]").disabled))) await wp(page, '[data-wp="smaller"]');
  await page.waitForTimeout(250);
  const pMin = await pop(page);
  check(`${tag} A− goes back down through at least five sizes (smallest letters are smaller than the first)`, pMin.fs < fs0 && pMin.size === 0, JSON.stringify(pMin));
  // return to the original step
  for (let i = 0; i < 3; i++) await wp(page, '[data-wp="bigger"]');
  await page.waitForTimeout(250);
  p = await pop(page);
  check(`${tag} A+ and A− return exactly to the same size`, Math.abs(p.fs - fs0) < 0.01, `${p.fs} vs ${fs0}`);

  // ---- writing over it
  const bx = await stageBox(page);
  const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2;
  const ink0 = await bbox(page, "ink");
  await stroke(page, [[cx - 40, cy - 30], [cx + 40, cy + 30], [cx + 40, cy - 30]]);
  const ink1 = await bbox(page, "ink");
  check(`${tag} a pen stroke puts ink on the canvas`, ink0.n === 0 && ink1.n > 50, `${ink0.n} -> ${ink1.n}`);
  check(`${tag} ...and drew nothing on the sheet beneath`, (await sheetInk(page)) === noInk0);
  await wp(page, '[data-wp-tool="eraser"]');
  await stroke(page, [[cx - 60, cy - 30], [cx + 60, cy + 30]]);
  const ink2 = await bbox(page, "ink");
  check(`${tag} the Eraser removes ink`, ink2.n < ink1.n, `${ink1.n} -> ${ink2.n}`);
  await wp(page, '[data-wp-tool="pen"]');
  await wp(page, '[data-wp="undo"]'); await wp(page, '[data-wp="undo"]');
  check(`${tag} Undo takes strokes back (pen and eraser)`, (await bbox(page, "ink")).n === 0);
  await stroke(page, [[cx - 40, cy], [cx + 40, cy]]);
  const w1 = (await bbox(page, "ink"));
  await wp(page, '[data-wp="bigger"]'); await page.waitForTimeout(300);
  const w2 = (await bbox(page, "ink"));
  const p2 = await pop(page);
  check(`${tag} after A+ the stroke is still there and has grown with the letters`, w2.n > 0 && w2.w > w1.w * 1.1 && Math.abs(w2.w / w1.w - p2.fs / p.fs) < 0.25 * (p2.fs / p.fs), `w ${w1.w}->${w2.w}, fs ratio ${p2.fs / p.fs}`);
  // Architect review (#604): a word wider than the window shows its START (the right-hand end of the Arabic).
  const startSeen = await page.evaluate(() => {
    const sc = document.querySelector("#writingSheet .wp [data-wp-scroll]");
    const c = document.querySelector("#writingSheet .wp [data-wp-paper]");
    const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height).data, dpr = c.width / parseFloat(c.style.width);
    let maxX = -1;
    for (let y = 0; y < c.height; y += 2) for (let x = c.width - 1; x > maxX; x--) { const i = (y * c.width + x) * 4; if (d[i] < 235 || d[i + 1] < 235) { maxX = x; break; } }
    return { right: maxX / dpr, viewRight: sc.scrollLeft + sc.clientWidth };
  });
  check(`${tag} after A+ the word's start (its right-hand end) is in view`, startSeen.right >= 0 && startSeen.right <= startSeen.viewRight + 1, JSON.stringify(startSeen));
  await wp(page, '[data-wp="clear"]');
  check(`${tag} Clear removes everything`, (await bbox(page, "ink")).n === 0);

  // ---- Ayah view
  await wp(page, '[data-wp-mode="ayah"]'); await page.waitForTimeout(400);
  p = await pop(page);
  const ayah2 = DATA["1"].flatMap((l) => l.words || []).filter((w) => w.loc.startsWith("1:2:"));
  check(`${tag} Ayah shows every word of 1:2 in order (incl. its end marker), each in its own page font`, p.mode === "ayah" && JSON.stringify(p.glyphs) === JSON.stringify(ayah2.map((w) => w.g)) && JSON.stringify(p.locs) === JSON.stringify(ayah2.map((w) => w.loc)) && p.pages.every((n) => n === 1), JSON.stringify(p));
  const lines = await page.evaluate(() => Number(document.querySelector("#writingSheet .wp [data-wp-stage]").dataset.lines));
  const b = await bbox(page, "paper");
  check(`${tag} the Ayah is drawn, wrapped inside the window width`, b.n > 500 && lines >= 1 && b.x1 / b.dpr <= bx.w + (await pop(page)).W, `${JSON.stringify(b)} lines ${lines}`);
  await stroke(page, [[cx - 30, cy - 20], [cx + 30, cy + 20]]);
  check(`${tag} writing works in the Ayah view`, (await bbox(page, "ink")).n > 30);
  await wp(page, '[data-wp-mode="word"]'); await page.waitForTimeout(300);
  check(`${tag} the Word view keeps its own writing separate (none drawn there yet)`, (await bbox(page, "ink")).n === 0);
  await wp(page, '[data-wp-mode="ayah"]'); await page.waitForTimeout(300);
  check(`${tag} ...and the Ayah's writing is still there when you come back`, (await bbox(page, "ink")).n > 30);

  // ---- layout of the bar, and no sideways scroll
  const lay = await page.evaluate(() => {
    const bar = document.querySelector("#writingSheet .wp-bar");
    const bs = [...bar.querySelectorAll("button,select")].filter((e) => e.getBoundingClientRect().width > 0);
    const tops = new Set(bs.map((e) => { const r = e.getBoundingClientRect(); return Math.round((r.top + r.height / 2) / 30); }));
    const win = document.querySelector("#writingSheet .wp-win").getBoundingClientRect();
    return {
      rows: tops.size, minW: Math.min(...bs.map((e) => e.getBoundingClientRect().width)), minH: Math.min(...bs.map((e) => e.getBoundingClientRect().height)),
      inside: bs.every((e) => { const r = e.getBoundingClientRect(); return r.left >= win.left - 0.5 && r.right <= win.right + 0.5; }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, n: bs.length,
      winInside: win.left >= -0.5 && win.right <= innerWidth + 0.5 && win.top >= -0.5 && win.bottom <= innerHeight + 0.5,
    };
  });
  check(`${tag} the pop-out bar is at most three rows (decision 83), every control >= 40px, all inside the window`, lay.rows <= 3 && lay.minW >= 39.5 && lay.minH >= 39.5 && lay.inside && lay.n >= 14, JSON.stringify(lay));
  check(`${tag} the page never scrolls sideways, and the window is on screen`, lay.overflow <= 0 && lay.winInside, JSON.stringify(lay));

  // ---- window size (PC): the size button makes the window bigger
  const wBefore = (await page.evaluate(() => document.querySelector("#writingSheet .wp-win").getBoundingClientRect().width));
  await wp(page, '[data-wp="win"]'); await page.waitForTimeout(300);
  const wAfter = await page.evaluate(() => { const r = document.querySelector("#writingSheet .wp-win").getBoundingClientRect(); return { w: r.width, h: r.height, ox: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  check(`${tag} the window-size button enlarges the window (to almost the full screen) with no sideways scroll`, wAfter.w >= wBefore - 0.5 && wAfter.w >= width * 0.9 && wAfter.h >= height * 0.9 && wAfter.ox <= 0, `${wBefore} -> ${JSON.stringify(wAfter)}`);
  check(`${tag} ...and the Ayah is still drawn and the writing kept after the window resize`, (await bbox(page, "paper")).n > 500 && (await bbox(page, "ink")).n > 30);

  // ---- Bangla labels
  if (lang === "bn") {
    const labels = await page.evaluate(() => [...document.querySelectorAll("#writingSheet .wp-bar [aria-label]")].map((e) => e.getAttribute("aria-label")));
    const modes = await page.evaluate(() => [...document.querySelectorAll("#writingSheet .wp [data-wp-mode]")].map((e) => e.textContent.trim()));
    check(`${tag} the pop-out's labels are in Bangla`, labels.every((l) => /[ঀ-৿]/.test(l) || /^A[+−]$/.test(l)) && modes.join() === "শব্দ,আয়াত", JSON.stringify({ labels, modes }));
    const lab = await page.evaluate(() => document.querySelector('#writingSheet [data-ws="unit"]').textContent);
    check(`${tag} digits stay in Bangla on the sheet`, /[০-৯]|আল-ফাতিহা/.test(lab) && !/[0-9]/.test(lab), lab);
  } else {
    check(`${tag} English labels`, (await page.evaluate(() => [...document.querySelectorAll("#writingSheet .wp [data-wp-mode]")].map((e) => e.textContent.trim()).join())) === "Word,Ayah");
  }

  // ---- closing
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const asks = await page.evaluate(() => ({ confirm: !document.querySelector("#writingSheet [data-wp-confirm]").hidden, still: !!document.querySelector("#writingSheet .wp"), sheet: !!document.querySelector("#writingSheet") }));
  check(`${tag} Esc with writing asks first ("Close without saving your writing?") and closes nothing`, asks.confirm && asks.still && asks.sheet, JSON.stringify(asks));
  await wp(page, '[data-wp="keep"]');
  check(`${tag} Keep writing keeps the pop-out and the writing`, (await page.evaluate(() => !!document.querySelector("#writingSheet .wp"))) && (await bbox(page, "ink")).n > 30);
  await wp(page, '[data-wp="close"]');
  check(`${tag} ✕ with writing asks first`, await page.evaluate(() => !document.querySelector("#writingSheet [data-wp-confirm]").hidden && !!document.querySelector("#writingSheet .wp")));
  await wp(page, '[data-wp="close-anyway"]'); await page.waitForTimeout(150);
  check(`${tag} Close closes only the pop-out; the sheet stays open and its page is untouched`, await page.evaluate(() => !document.querySelector("#writingSheet .wp") && !!document.querySelector("#writingSheet .ws-page")));
  check(`${tag} the pop-out's writing was never stored on the sheet`, (await sheetInk(page)) === noInk0);
  const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => /stroke|writing/i.test(k) && k !== "writingSheetShade" && k !== "writingSheetTools"));
  check(`${tag} nothing of the writing is in localStorage`, stored.length === 0, stored.join());

  // Esc on a clean pop-out closes it straight away
  await popFromWord(page, 1, "1:2:1");
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  check(`${tag} Esc on an unwritten pop-out closes just it`, await page.evaluate(() => !document.querySelector("#writingSheet .wp") && !!document.querySelector("#writingSheet")));

  // ---- the pick finds the right word at another place too, and a tap off the words does nothing
  await popFromWord(page, 1, "1:2:3");
  p = await pop(page);
  check(`${tag} 1:2:3 gives that word's glyph, not its neighbour`, p.glyph === firstWord("1:2:3").g && p.loc === "1:2:3", JSON.stringify(p));
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);

  check(`${tag} no page errors (sandbox TLS noise excepted)`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource/.test(String(e))).length === 0, errors.join(" | "));
  await ctx.close();
}

// ---- an ayah that crosses a page (served data: 1:7's last two words are on page 2)
if (!ONLY) {
  const { ctx, page } = await start({ lang: "en", width: 390, height: 800, body: SPLIT_BODY });
  await pickSurah1(page);
  await page.click('#writingSheet [data-ws="popout"]');
  const w17 = SPLIT["1"].flatMap((l) => l.words || []).filter((w) => w.loc.startsWith("1:7:"))[0];
  const pt = await wordPoint(page, 1, w17.loc);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForSelector("#writingSheet .wp [data-wp-stage][data-fs]");
  await page.click('#writingSheet .wp [data-wp-mode="ayah"]');
  await page.waitForTimeout(500);
  const p = await pop(page);
  const all = [...SPLIT["1"], ...SPLIT["2"]].flatMap((l) => l.words || []).filter((w) => w.loc.startsWith("1:7:"));
  check("[cross-page] the Ayah view shows the words of BOTH pages", new Set(p.pages).size === 2 && p.pages.includes(1) && p.pages.includes(2) && p.glyphs.length === all.length, JSON.stringify(p));
  check("[cross-page] ...in order, each word with its own page's font", p.locs.join() === all.map((w) => w.loc).join() && p.pages.join() === all.map((w) => (SPLIT["2"].some((l) => (l.words || []).some((x) => x.loc === w.loc)) ? 2 : 1)).join(), JSON.stringify(p));
  check("[cross-page] ...and it is really painted", (await bbox(page, "paper")).n > 500);
  await ctx.close();
}

// ---- decision 83 (7 Oct 2026): full screen, More paper, trace / blank lines, ‹ › word to word
// Expected words come from the Mushaf JSON by hand: the last word of an Ayah in this data is its end marker.
const ayahWords = (n) => DATA["1"].flatMap((l) => l.words || []).filter((w) => w.loc.startsWith(`1:${n}:`));
const plain = (n) => ayahWords(n).slice(0, -1);
// pixels on the paper that are neither the paper colour nor the ruled-line colour = traced letters
const letters = (page) => page.evaluate(() => {
  const c = document.querySelector("#writingSheet .wp .wp-paper");
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  const near = (i, r, g, b) => Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) < 24;
  let glyph = 0, rule = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (near(i, 255, 253, 248)) continue;
    if (near(i, 228, 220, 198)) rule++; else glyph++;
  }
  return { glyph, rule };
});
const rectOf = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(`#writingSheet .wp ${sel}`); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: r.left, y: r.top, w: r.width, h: r.height, shown: cs.display !== "none" && r.width > 0 }; }, sel);
const stageNums = (page) => page.evaluate(() => { const s = document.querySelector("#writingSheet .wp [data-wp-stage]"); const sc = document.querySelector("#writingSheet .wp [data-wp-scroll]"); return { H: Number(s.dataset.canvasH), top: sc.scrollTop, blocks: Number(s.dataset.blocks) }; });
const locNow = async (page) => (await pop(page)).loc;
const dis = (page, which) => page.evaluate((w) => document.querySelector(`#writingSheet .wp [data-wp=${w}]`).disabled, which);
const settle = (page) => page.waitForTimeout(450);

if (ONLY || !MUTATE) {
  // -- the bar at four widths, both languages: three tidy rows, nothing cut, both modes shown, 40px
  for (const [width, height] of [[320, 640], [390, 800], [820, 1000], [1280, 800]]) for (const lang of ["en", "bn"]) {
    const tag = `[d83 ${width} ${lang}]`;
    const { ctx, page } = await start({ lang, width, height });
    await pickSurah1(page);
    await popFromWord(page, 1, "1:2:3");
    const lay = await page.evaluate(() => {
      const win = document.querySelector("#writingSheet .wp-win").getBoundingClientRect();
      const bs = [...document.querySelectorAll("#writingSheet .wp-bar button,#writingSheet .wp-bar select")];
      const rows = {};
      bs.forEach((e) => { const r = e.getBoundingClientRect(); const k = Math.round((r.top + r.height / 2) / 30); (rows[k] ||= []).push(r); });
      const vis = (sel) => { const r = document.querySelector(`#writingSheet .wp ${sel}`).getBoundingClientRect(); return r.width >= 39.5 && r.height >= 39.5 && r.left >= win.left - 0.5 && r.right <= win.right + 0.5; };
      return {
        rows: Object.keys(rows).length, all: bs.every((e) => { const r = e.getBoundingClientRect(); return r.width >= 39.5 && r.height >= 39.5 && r.left >= win.left - 0.5 && r.right <= win.right + 0.5; }),
        word: vis("[data-wp-mode=word]"), ayah: vis("[data-wp-mode=ayah]"), prev: vis("[data-wp=prev]"), next: vis("[data-wp=next]"), more: vis("[data-wp=more]"), move: vis("[data-wp=move]"), full: vis("[data-wp=win]"),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    check(`${tag} bar: three rows, every control >= 40px and inside the window, no sideways scroll`, lay.rows === 3 && lay.all && lay.overflow <= 0, JSON.stringify(lay));
    check(`${tag} Word AND Ayah both show, with ‹ › ⬆ More paper ✋ Move and ⛶ (phone included)`, lay.word && lay.ayah && lay.prev && lay.next && lay.more && lay.move && lay.full, JSON.stringify(lay));
    if (width === 320 || width === 1280) await page.screenshot({ path: `/tmp/d83-${width}-${lang}.png` });
    // the Ayah button really switches the pop-out to the Ayah
    await wp(page, '[data-wp-mode="ayah"]'); await settle(page);
    check(`${tag} the Ayah button switches to the whole Ayah (1:2)`, (await pop(page)).mode === "ayah" && (await pop(page)).locs.every((l) => l.startsWith("1:2:")));
    if (lang === "bn") {
      const lab = await page.evaluate(() => [...document.querySelectorAll("#writingSheet .wp-bar [aria-label],#writingSheet .wp-bar option")].map((e) => e.getAttribute("aria-label") || e.textContent));
      check(`${tag} every bar label is Bangla (or A+/A−)`, lab.every((l) => /[ঀ-৿]/.test(l) || /^A[+−]$/.test(l)), JSON.stringify(lab));
    }
    await ctx.close();
  }

  // -- behaviour, on a phone (English) and a tablet (Bangla)
  for (const [width, height, lang] of [[320, 640, "en"], [820, 1000, "bn"]]) {
    const tag = `[d83 ${width} ${lang}]`;
    const { ctx, page } = await start({ lang, width, height });
    await pickSurah1(page);
    await popFromWord(page, 1, "1:2:3");

    // full screen on / off
    const win0 = await rectOf(page, ".wp-win");
    await wp(page, '[data-wp="win"]'); await settle(page);
    const fsr = await rectOf(page, ".wp-win");
    const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    check(`${tag} ⛶ Full screen: the window equals the viewport`, Math.abs(fsr.w - vp.w) < 1 && Math.abs(fsr.h - vp.h) < 1 && fsr.x < 1 && fsr.y < 1, `${JSON.stringify(fsr)} vs ${JSON.stringify(vp)}`);
    check(`${tag} ...and the button says it is on`, await page.evaluate(() => document.querySelector("#writingSheet .wp [data-wp=win]").getAttribute("aria-pressed") === "true"));
    check(`${tag} ...with no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
    await wp(page, '[data-wp="win"]'); await settle(page);
    const back = await rectOf(page, ".wp-win");
    check(`${tag} ⛶ again puts the window back (smaller than the viewport)`, back.w < vp.w - 2 || back.h < vp.h - 2, JSON.stringify(back));
    await wp(page, '[data-wp="win"]'); await settle(page);   // stay full screen from here

    // More paper
    const s0 = await stageNums(page);
    await wp(page, '[data-wp="more"]'); await settle(page);
    const s1 = await stageNums(page);
    check(`${tag} ⬆ More paper: the paper grows and slides up`, s1.H > s0.H + 20 && s1.blocks > s0.blocks && s1.top > s0.top + 20, JSON.stringify({ s0, s1 }));
    await wp(page, '[data-wp="more"]'); await settle(page);
    check(`${tag} ...and again`, (await stageNums(page)).H > s1.H);

    // ✋ Move slides the paper and writes nothing
    await wp(page, '[data-wp="move"]');
    const sc0 = await stageNums(page);
    const bxm = await stageBox(page);
    const inkBefore = (await bbox(page, "ink")).n;
    await stroke(page, [[bxm.x + bxm.w / 2, bxm.y + bxm.h * 0.8], [bxm.x + bxm.w / 2, bxm.y + bxm.h * 0.3]]);
    const sc1 = await stageNums(page);
    check(`${tag} ✋ Move: a drag slides the paper and writes nothing`, sc1.top > sc0.top + 20 && (await bbox(page, "ink")).n === inkBefore, JSON.stringify({ sc0, sc1 }));
    await wp(page, '[data-wp="move"]');

    // trace vs blank
    await page.selectOption("#writingSheet .wp [data-wp-lines]", "trace"); await settle(page);
    const tr = await letters(page);
    const mTrace = await rectOf(page, ".wp-model");
    check(`${tag} Lines: to trace over: faint letters on the paper and no pinned model`, tr.glyph > 300 && !mTrace.shown, JSON.stringify({ tr, mTrace }));
    await page.selectOption("#writingSheet .wp [data-wp-lines]", "blank"); await settle(page);
    const bl = await letters(page);
    const mBlank = await rectOf(page, ".wp-model");
    const scrollR = await rectOf(page, ".wp-scroll");
    const modelGlyphs = await page.evaluate(() => document.querySelector("#writingSheet .wp [data-wp-model]").dataset.glyphs);
    check(`${tag} Lines: blank: ruled lines only, no traced letters on the paper`, bl.glyph === 0 && bl.rule > 100, JSON.stringify(bl));
    check(`${tag} ...the word is pinned in a strip above the paper (the right word)`, mBlank.shown && mBlank.h > 20 && mBlank.y + mBlank.h <= scrollR.y + 1 && modelGlyphs === firstWord("1:2:3").g, JSON.stringify({ mBlank, scrollR, modelGlyphs }));
    await wp(page, '[data-wp="more"]'); await settle(page);
    check(`${tag} ...More paper in blank mode still works and the model stays pinned`, (await rectOf(page, ".wp-model")).shown && (await letters(page)).glyph === 0);
    // every tool in the blank state
    const bx = await stageBox(page);
    const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2;
    await stroke(page, [[cx - 40, cy - 20], [cx + 40, cy + 20], [cx + 40, cy - 20]]);
    const k1 = (await bbox(page, "ink")).n;
    await wp(page, '[data-wp-tool="eraser"]');
    await stroke(page, [[cx - 60, cy - 20], [cx + 60, cy + 20]]);
    const k2 = (await bbox(page, "ink")).n;
    await wp(page, '[data-wp-tool="pen"]');
    await wp(page, '[data-wp="undo"]'); await wp(page, '[data-wp="undo"]');
    const k3 = (await bbox(page, "ink")).n;
    await stroke(page, [[cx - 40, cy], [cx + 40, cy]]);
    const k4 = (await bbox(page, "ink")).n;
    await wp(page, '[data-wp="clear"]');
    const k5 = (await bbox(page, "ink")).n;
    check(`${tag} pen, eraser, undo and clear work on blank lines`, k1 > 50 && k2 < k1 && k3 === 0 && k4 > 20 && k5 === 0, JSON.stringify([k1, k2, k3, k4, k5]));
    const f0 = (await pop(page)).fs;
    await wp(page, '[data-wp="bigger"]'); await settle(page);
    check(`${tag} A+ works on blank lines (model and paper both redrawn)`, (await pop(page)).fs > f0 * 1.1 && (await letters(page)).glyph === 0);
    await page.selectOption("#writingSheet .wp [data-wp-shade]", "book"); await settle(page);
    check(`${tag} the shade control still works (blank lines unchanged)`, (await letters(page)).glyph === 0);
    await page.selectOption("#writingSheet .wp [data-wp-lines]", "trace"); await settle(page);
    check(`${tag} ...and switching back to trace brings the letters back`, (await letters(page)).glyph > 300);
    await page.selectOption("#writingSheet .wp [data-wp-shade]", "light");
    await wp(page, '[data-wp="smaller"]'); await settle(page);

    // ‹ › word to word, across an Ayah boundary
    check(`${tag} ‹ › start on 1:2:3`, (await locNow(page)) === "1:2:3");
    await wp(page, '[data-wp="next"]'); await settle(page);
    check(`${tag} › goes to the next word (1:2:4)`, (await locNow(page)) === "1:2:4" && (await pop(page)).glyph === firstWord("1:2:4").g, JSON.stringify(await pop(page)));
    await wp(page, '[data-wp="next"]'); await settle(page);
    const across = await pop(page);
    check(`${tag} › at the end of an Ayah goes on to the next Ayah's first word (1:3:1; the end marker is skipped)`, across.loc === plain(3)[0].loc && across.glyph === plain(3)[0].g, JSON.stringify(across));
    await wp(page, '[data-wp="prev"]'); await settle(page);
    check(`${tag} ‹ goes back across the Ayah boundary (to 1:2:4)`, (await locNow(page)) === "1:2:4");

    // each word keeps its own writing
    await wp(page, '[data-wp-tool="pen"]');
    const b2 = await stageBox(page);
    await stroke(page, [[b2.x + 60, b2.y + 40], [b2.x + 140, b2.y + 80]]);
    const mine = (await bbox(page, "ink")).n;
    await wp(page, '[data-wp="prev"]'); await settle(page);
    check(`${tag} the previous word starts blank (ink belongs to 1:2:4 only)`, (await locNow(page)) === "1:2:3" && (await bbox(page, "ink")).n === 0);
    await stroke(page, [[b2.x + 50, b2.y + 50], [b2.x + 150, b2.y + 50]]);
    const mine3 = (await bbox(page, "ink")).n;
    await wp(page, '[data-wp="next"]'); await settle(page);
    check(`${tag} going back to 1:2:4 shows what was written on it`, (await locNow(page)) === "1:2:4" && (await bbox(page, "ink")).n === mine && mine > 20, `${(await bbox(page, "ink")).n} vs ${mine}`);
    await wp(page, '[data-wp="prev"]'); await settle(page);
    check(`${tag} ...and 1:2:3 still has its own`, (await bbox(page, "ink")).n === mine3 && mine3 > 20);

    // Ayah mode: ‹ › step by Ayah, with their own writing
    await wp(page, '[data-wp-mode="ayah"]'); await settle(page);
    check(`${tag} Ayah mode: ‹ › are labelled for the Ayah`, await page.evaluate(() => /Ayah|আয়াত/.test(document.querySelector("#writingSheet .wp [data-wp=next]").getAttribute("aria-label"))));
    await stroke(page, [[b2.x + 60, b2.y + 40], [b2.x + 160, b2.y + 70]]);
    const ay2 = (await bbox(page, "ink")).n;
    await wp(page, '[data-wp="next"]'); await settle(page);
    let pa = await pop(page);
    check(`${tag} Ayah mode: › shows the next Ayah (1:3) whole`, pa.mode === "ayah" && JSON.stringify(pa.locs) === JSON.stringify(ayahWords(3).map((w) => w.loc)), JSON.stringify(pa));
    check(`${tag} ...with no writing of its own yet`, (await bbox(page, "ink")).n === 0);
    await wp(page, '[data-wp="prev"]'); await settle(page);
    pa = await pop(page);
    check(`${tag} Ayah mode: ‹ goes back to 1:2, and its writing is kept`, JSON.stringify(pa.locs) === JSON.stringify(ayahWords(2).map((w) => w.loc)) && (await bbox(page, "ink")).n === ay2 && ay2 > 20);
    await wp(page, '[data-wp="close"]'); await wp(page, '[data-wp="close-anyway"]'); await settle(page);

    // ends of the unit
    await popFromWord(page, 1, "1:1:1");
    check(`${tag} on the first word of the unit ‹ is disabled and › is not`, (await dis(page, "prev")) && !(await dis(page, "next")));
    const pv = await rectOf(page, "[data-wp=prev]");
    check(`${tag} ‹ › are at least 40px`, pv.w >= 39.5 && pv.h >= 39.5 && (await rectOf(page, "[data-wp=next]")).w >= 39.5);
    await page.keyboard.press("Escape"); await settle(page);
    const lastPlain = plain(7).slice(-1)[0];
    await popFromWord(page, 1, lastPlain.loc);
    check(`${tag} on the last word of the unit › is disabled and ‹ is not`, (await dis(page, "next")) && !(await dis(page, "prev")), lastPlain.loc);
    await page.keyboard.press("Escape"); await settle(page);
    await popFromWord(page, 1, "1:7:1");
    await wp(page, '[data-wp-mode="ayah"]'); await settle(page);
    check(`${tag} on the last Ayah › is disabled; ‹ is not`, (await dis(page, "next")) && !(await dis(page, "prev")));
    await page.keyboard.press("Escape"); await settle(page);
    const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => /stroke|writing|popout/i.test(k) && k !== "writingSheetShade" && k !== "writingSheetTools"));
    check(`${tag} nothing is stored (localStorage)`, stored.length === 0, stored.join());
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
