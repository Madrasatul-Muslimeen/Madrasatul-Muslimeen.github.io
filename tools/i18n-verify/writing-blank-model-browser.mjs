// PCF MSA J34 (17 Oct 2026) -- Blank lines: the word or Ayah above the paper looks like Trace over (same size, Letter style),
// with a choice A "As traced" (default) or B "Dark ink". Run from the repository root with serve.js on :8080.
//   node tools/i18n-verify/writing-blank-model-browser.mjs [--width=390] [--lang=en|bn] [--mutate=<name>] [--shot]
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const WIDTHS = [[320, 700], [390, 800], [820, 1000], [1280, 800], [1440, 900]];
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const WIDTH = Number(arg("width")) || 0, LANG = arg("lang"), MUTATE = arg("mutate");
const SHOT = process.argv.includes("--shot");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise; await it first`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
async function must(name, p) {
  try { return await p; } catch (e) { fail++; console.log(`  FAIL  ${name} (timed out / threw: ${String(e.message).split("\n")[0]})`); return null; }
}

const MUTATIONS = {
  "old-size": ["writing-popout.js", "const fs = fsNow();\n    const pad = 8;", "const fs = Math.min(56, fsNow());\n    const pad = 8;"],
  "ignore-style": ["writing-popout.js", '(st.model === "dark" ? "model" : st.shade)', '(st.model === "dark" ? "model" : "light")'],
  "b-hollow": ["writing-sheet.js", 'const MODEL = { mode: "fill"', 'const MODEL = { mode: "stroke"'],
  "long-labels": ["writing-popout.js", '${t("As traced")}</option>', '${t("Like Trace over")}</option>'],
  "no-remember": ["writing-popout.js", "localStorage.setItem(MODEL_KEY, v);", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error("unknown mutation " + MUTATE);

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
const waitOpen = (page) => page.waitForFunction(() => { const s = document.querySelector("#writingSheet .wp [data-wp-stage]"); return s && s.dataset.fs; }, null, { timeout: 8000 });
async function popFromWord(page, n, loc) {
  await page.click('#writingSheet [data-ws="popout"]');
  const pt = await wordPoint(page, n, loc);
  await page.mouse.click(pt.x, pt.y);
  await waitOpen(page);
  await page.waitForTimeout(300);
}
async function reopen(page, n, loc) {
  await page.click("#writingSheet .wp [data-wp=\"close\"]");
  await page.waitForFunction(() => !document.querySelector("#writingSheet .wp"), null, { timeout: 4000 });
  const pt = await wordPoint(page, n, loc);
  await page.mouse.click(pt.x, pt.y);
  const ok = await page.waitForSelector("#writingSheet .wp", { timeout: 1500 }).then(() => true, () => false);
  if (!ok) { await page.click('#writingSheet [data-ws="popout"]'); const p2 = await wordPoint(page, n, loc); await page.mouse.click(p2.x, p2.y); }
  await waitOpen(page);
  await page.waitForTimeout(300);
}
const wp = (page, sel) => must(`click ${sel}`, page.click(`#writingSheet .wp ${sel}`, { timeout: 4000 }));
const sizes = (page) => page.evaluate(() => {
  const r = document.querySelector("#writingSheet .wp");
  const m = r.querySelector("[data-wp-model]");
  return { stageFs: Number(r.querySelector("[data-wp-stage]").dataset.fs), modelFs: Number(m.dataset.fs || 0), hidden: m.hidden, glyphs: m.dataset.glyphs || "" };
});
// The model canvas: how many pixels differ from its background, how many are the B ink, and the darkest ink pixel's brightness.
const modelPx = (page) => page.evaluate(() => {
  const c = document.querySelector("#writingSheet .wp [data-wp-modelcv]");
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let ink = 0, dark = 0, min = 999;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - 244) + Math.abs(d[i + 1] - 238) + Math.abs(d[i + 2] - 221) <= 20) continue;
    ink++;
    if (Math.abs(d[i] - 0x3b) + Math.abs(d[i + 1] - 0x30) + Math.abs(d[i + 2] - 0x20) <= 40) dark++;
    min = Math.min(min, (d[i] + d[i + 1] + d[i + 2]) / 3);
  }
  return { ink, dark, min };
});
const selects = (page) => page.evaluate(() => {
  const r = document.querySelector("#writingSheet .wp");
  const s = r.querySelector("[data-wp-model-style]");
  const win = r.querySelector("[data-wp-win]").getBoundingClientRect();
  const q = s.getBoundingClientRect();
  const row = (el) => Math.round(el.getBoundingClientRect().top);
  const peers = [...r.querySelectorAll("[data-wp-lines],[data-wp-shade]")];
  return { shown: q.width > 0 && !s.hidden, h: q.height, w: q.width, inside: q.left >= win.left - 1 && q.right <= win.right + 1,
    sharedLine: peers.some((p) => row(p) === row(s)), aria: s.getAttribute("aria-label"), opts: [...s.options].map((o) => o.textContent.trim()),
    stored: (() => { try { return localStorage.getItem("writingModelStyle"); } catch { return null; } })() };
});

// POSITIVE CONTROL: the pixel reader tells light from dark on a seeded canvas.
{
  const page = await (await browser.newContext()).newPage();
  const r = await page.evaluate(() => {
    const read = (col) => {
      const c = document.createElement("canvas"); c.width = c.height = 20;
      const x = c.getContext("2d"); x.fillStyle = "#f4eedd"; x.fillRect(0, 0, 20, 20); x.fillStyle = col; x.fillRect(4, 4, 8, 8);
      const d = x.getImageData(0, 0, 20, 20).data; let min = 999;
      for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 244) + Math.abs(d[i + 1] - 238) + Math.abs(d[i + 2] - 221) > 20) min = Math.min(min, (d[i] + d[i + 1] + d[i + 2]) / 3);
      return min;
    };
    return { dark: read("#3b3020"), light: read("#b4ab96") };
  });
  check("positive control: the colour reader tells #3b3020 (dark) from #b4ab96 (light) on a seeded canvas", r.dark < 80 && r.light > 150 && r.light - r.dark > 80, JSON.stringify(r));
  await page.context().close();
}

const sets = WIDTHS.filter(([w]) => !WIDTH || w === WIDTH);
for (const [width, height] of MUTATE ? sets.filter(([w]) => w === (WIDTH || 390)) : sets) for (const lang of LANG ? [LANG] : ["en", "bn"]) {
  const tag = `[${width} ${lang}]`;
  const { ctx, page, errors } = await start({ lang, width, height });
  await pickSurah1(page);
  await popFromWord(page, 1, "1:2:1");

  let s = await selects(page);
  check(`${tag} Trace over: the example select is not shown`, !s.shown, JSON.stringify(s));
  await page.selectOption("#writingSheet .wp [data-wp-lines]", "blank");
  await page.waitForTimeout(200);
  s = await selects(page);
  check(`${tag} Blank lines: the select is shown, >= 40px tall, inside the window, on a line with another list box`, s.shown && s.h >= 39.5 && s.inside && s.sharedLine, JSON.stringify(s));
  check(`${tag} select label and options are ${lang === "bn" ? "Bangla" : "English"}`, lang === "bn"
    ? s.aria === "কাগজের উপরের উদাহরণ" && s.opts[0] === "হালকা উদাহরণ" && s.opts[1] === "গাঢ় উদাহরণ"
    : s.aria === "Example above the paper" && s.opts[0] === "As traced" && s.opts[1] === "Dark ink", JSON.stringify(s));
  // Architect review of #941: the first labels were cut at 390px ("Like Trace ov"). With Blank lines on, every list box
  // on the bar must hold its LONGEST option, measured in the box's own font, inside its own padding and arrow.
  const cut = await page.evaluate(() => [...document.querySelectorAll("#writingSheet .wp-bar select")].filter((sel) => !sel.hidden).map((sel) => {
    const cs = getComputedStyle(sel); const c = document.createElement("canvas").getContext("2d"); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const need = Math.max(...[...sel.options].map((o) => c.measureText(o.textContent).width));
    const room = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 18;
    return { box: sel.getAttribute("aria-label"), need: Math.round(need), room: Math.round(room) };
  }).filter((b) => b.need > b.room));
  check(`${tag} Blank lines: every list box shows its longest option whole`, cut.length === 0, JSON.stringify(cut));
  check(`${tag} default is A (nothing stored yet)`, (await page.inputValue("#writingSheet .wp [data-wp-model-style]")) === "like" && s.stored === null, JSON.stringify(s));

  // ---- size: word and Ayah
  let z = await sizes(page);
  check(`${tag} Word: the model's font size equals Trace over's (${z.stageFs})`, !z.hidden && z.modelFs === z.stageFs && z.modelFs > 56, JSON.stringify(z));
  // ---- A follows the Letter style
  const px = {};
  for (const sh of ["light", "lighter", "book"]) {
    await page.selectOption("#writingSheet .wp [data-wp-shade]", sh);
    await page.waitForTimeout(100);
    px[sh] = await modelPx(page);
  }
  check(`${tag} A: ink is light (#b4ab96-ish) for Light, lighter still for Lighter, and changes with the Letter style`, px.light.ink > 300 && px.light.min > 120 && px.lighter.min > px.light.min + 5 && px.book.min !== px.light.min, JSON.stringify(px));
  await page.selectOption("#writingSheet .wp [data-wp-shade]", "light");
  await page.waitForTimeout(100);
  const aLight = await modelPx(page);
  // ---- B: dark, solid
  await page.selectOption("#writingSheet .wp [data-wp-model-style]", "dark");
  await page.waitForTimeout(150);
  const b = await modelPx(page);
  check(`${tag} B: dark ink (#3b3020 within tolerance), many such pixels`, b.min < 90 && b.dark > 300, JSON.stringify(b));
  check(`${tag} B: solid strokes, not outlines (far more ink than A's hollow Light)`, b.ink > aLight.ink * 1.5, `${b.ink} vs ${aLight.ink}`);
  check(`${tag} B ignores the Letter style (Lighter makes no difference)`, await (async () => { await page.selectOption("#writingSheet .wp [data-wp-shade]", "lighter"); await page.waitForTimeout(100); const q = await modelPx(page); await page.selectOption("#writingSheet .wp [data-wp-shade]", "light"); return q.dark > 300; })());

  // ---- Ayah
  await wp(page, '[data-wp-mode="ayah"]');
  await page.waitForTimeout(250);
  z = await sizes(page);
  check(`${tag} Ayah: the model's font size equals Trace over's (${z.stageFs})`, !z.hidden && z.modelFs === z.stageFs && z.modelFs > 24, JSON.stringify(z));
  const band = await page.evaluate(() => { const m = document.querySelector("#writingSheet .wp [data-wp-model]"); return { h: m.getBoundingClientRect().height, ov: getComputedStyle(m).overflowY, win: document.querySelector("#writingSheet .wp-win").getBoundingClientRect().height }; });
  check(`${tag} Ayah: the model band stays within 34% of the window and scrolls inside itself (overflow auto)`, band.h <= band.win * 0.35 + 1 && band.ov === "auto", JSON.stringify(band));
  await wp(page, '[data-wp-mode="word"]');
  await page.waitForTimeout(150);

  // ---- Letters follows A/B
  await wp(page, '[data-wp-mode="letters"]');
  await must(`${tag} Letters font`, page.waitForFunction(() => document.querySelector("#writingSheet .wp").dataset.letterFont === "1", null, { timeout: 8000 }));
  await page.waitForTimeout(250);
  const lb = await modelPx(page);
  await page.selectOption("#writingSheet .wp [data-wp-model-style]", "like");
  await page.waitForTimeout(150);
  const la = await modelPx(page);
  check(`${tag} Letters: B is dark, A follows the Letter style (lighter than B)`, lb.dark > 150 && la.dark < lb.dark / 3, JSON.stringify({ lb, la }));
  await page.selectOption("#writingSheet .wp [data-wp-model-style]", "dark");
  await wp(page, '[data-wp-mode="word"]');
  await page.waitForTimeout(150);

  // ---- remembered
  const keep = await selects(page);
  check(`${tag} the choice is stored`, keep.stored === "dark", JSON.stringify(keep));
  await reopen(page, 1, "1:2:1");
  s = await selects(page);
  await page.selectOption("#writingSheet .wp [data-wp-lines]", "blank");
  await page.waitForTimeout(200);
  const after = await modelPx(page);
  check(`${tag} the choice survives closing and reopening the window (B still dark)`, (await page.inputValue("#writingSheet .wp [data-wp-model-style]")) === "dark" && after.min < 90, JSON.stringify(after));

  if (SHOT && width === 390 && lang === "en") await page.screenshot({ path: "docs/reports/2026-10-17-j34-blank-model.png" });

  // ---- bar geometry: every control >= 40px, all inside the window
  const bar = await page.evaluate(() => {
    const win = document.querySelector("#writingSheet .wp-win").getBoundingClientRect();
    const els = [...document.querySelectorAll("#writingSheet .wp-bar button, #writingSheet .wp-bar select")].filter((e) => e.getBoundingClientRect().width > 0);
    return { n: els.length, minH: Math.min(...els.map((e) => e.getBoundingClientRect().height)), inside: els.every((e) => { const r = e.getBoundingClientRect(); return r.left >= win.left - 1 && r.right <= win.right + 1; }) };
  });
  check(`${tag} Blank lines bar: every control >= 40px tall and inside the window`, bar.minH >= 39.5 && bar.inside, JSON.stringify(bar));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource/.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
