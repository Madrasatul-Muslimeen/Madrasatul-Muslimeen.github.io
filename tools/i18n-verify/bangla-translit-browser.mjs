// PCF MSA J58 round 1 -- the Bangla transliteration choice (Latin / Bangla / Both) in the Word card and the word-by-word
// panel, and the Āyah poster menu as ONE line. Real browser, 320/390/768/1280 in English and Bangla (the poster menu also
// at 360). Expected values are written by hand. Run from the repository root with `node serve.js` running:
//   node tools/i18n-verify/bangla-translit-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME changes a source file in flight and must make the named
// check FAIL, exit 1; a missing anchor throws):
//   wcdefault   the Word card ignores the choice it is handed       -> "Word card: default follows the app language"
//   wcnotitle   the Bangla line loses its "made by rules" title     -> "Word card: the Bangla line has lang=bn and the note as its title"
//   wcnolive    changing the choice does not redraw the open card   -> "Word card: Both / Bangla / Latin change the line(s) with no reload"
//   wbwchosen   the panel ignores a stored choice                   -> "WbW panel: a stored choice wins"
//   wbwrule24   the panel's Bangla-only default is gone             -> "WbW panel: Bangla-only translations default to the Bangla line"
//   notecolour  the muted note is too pale                          -> "contrast >= 4.5 on every new text line"
//   wbwcolour   the Bangla WbW line is too pale                     -> "contrast >= 4.5 on every new text line"
//   menuopen    the poster menu starts open                         -> "Poster menu: closed by default"
//   actshide    Print / Save hide with the menu                     -> "Poster menu: Print and Save are always visible"
//   rowwrap     the segmented rows wrap                             -> "Poster menu: no button row wraps"
//   fromto      From / To always show                               -> "Poster menu: From and To only after Choose āyāt…"
//   posterbn    the poster prints no Bangla transliteration         -> "Poster: Transliteration Bangla prints Bangla in every word box"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  wcdefault: ["app/js/quran-word-card.js", 'const script = context.translitScript ?? "latin";', 'const script = "latin";'],
  wcnotitle: ["app/js/quran-word-card.js", ' title="${escapeHtml(text.translitBnNote)}"', ""],
  wcnolive: ["app/quranrevival.html", "      renderStudyScreen();\n      renderPersistentWordCard();\n    });\n    trEnToggle", "      renderStudyScreen();\n    });\n    trEnToggle"],
  wbwchosen: ["app/js/ayah-renderer.js", "const script = isTransliterationScriptChosen()", "const script = false"],
  wbwrule24: ["app/js/ayah-renderer.js", '(!langs.includes("en") || getAppLang() === "bn" ? "bn" : "latin")', '(getAppLang() === "bn" ? "bn" : "latin")'],
  notecolour: ["app/quranrevival.html", "font-size: 0.78rem; color: #555; line-height: 1.35; }", "font-size: 0.78rem; color: #c4c4c4; line-height: 1.35; }"],
  wbwcolour: ["app/quranrevival.html", "font-size: calc(0.76rem * var(--qr-wbw-scale, 1)); color: #555; font-style: normal; }", "font-size: calc(0.76rem * var(--qr-wbw-scale, 1)); color: #cfcfcf; font-style: normal; }"],
  menuopen: ["app/ayah-poster.html", "      $(\"apTools\").hidden = !menuOpen;\n      $(\"apSum\")", "      $(\"apTools\").hidden = false;\n      $(\"apSum\")"],
  actshide: ["app/ayah-poster.html", '<div class="ap-acts" id="apActs"></div>', '<div class="ap-acts" id="apActs" style="display:none"></div>'],
  rowwrap: ["app/ayah-poster.html", ".ap-seg > button { flex: 1 1 0; }", ".ap-seg { flex-wrap: wrap !important; } .ap-seg > button { flex: 0 0 9rem; }"],
  fromto: ["app/ayah-poster.html", "mode === \"custom\" ? ' data-ap-fromto' : ' data-ap-fromto hidden'", "' data-ap-fromto'"],
  posterbn: ["app/js/ayah-poster.js", "${show.trBn && w.trBn ?", "${false && w.trBn ?"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
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
const BENGALI = /[ঀ-৿]/;
const NOTE_EN = "Bangla transliteration is made by rules from the Arabic and is being checked.";
const NOTE_BN = "বাংলা প্রতিবর্ণীকরণ আরবি থেকে নিয়ম অনুযায়ী তৈরি এবং যাচাই করা হচ্ছে।";
const realErrors = (errs) => errs.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));

// WCAG contrast of an element's RENDERED colour against the first non-transparent background behind it.
const CONTRAST_JS = `(sel) => {
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const parse = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
  const out = [];
  for (const e of document.querySelectorAll(sel)) {
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) continue;
    const fg = parse(getComputedStyle(e).color); let bg = null;
    for (let n = e; n && !bg; n = n.parentElement) { const p = parse(getComputedStyle(n).backgroundColor); if (p && p.a > 0.95) bg = p.c; }
    bg = bg || [255, 255, 255];
    const a = lum(fg.c), b = lum(bg), hi = Math.max(a, b), lo = Math.min(a, b);
    out.push(Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100);
  }
  return out;
}`;
const contrast = (page, sel) => page.evaluate(`(${CONTRAST_JS})(${JSON.stringify(sel)})`);

async function openWord(page, surah, ayah, pos) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove())); await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate((s) => { const e = document.getElementById("surahSelect"); e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); }, surah);
  await page.waitForTimeout(2000);
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.querySelector(`option[value="${a}"]`)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await page.waitForTimeout(1200);
  await page.evaluate(([s, a, p]) => { document.querySelector(`#readView [data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(); }, [surah, ayah, pos]);
  await page.waitForFunction(() => document.querySelector(".quran-word-card .word-card-meaning-bar"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const cardLines = (page) => page.evaluate(() => [...document.querySelectorAll(".quran-word-card .word-card-meaning-bar .word-card-transliteration")].map((p) => ({ text: p.textContent.trim(), bn: p.classList.contains("word-card-transliteration-bn"), lang: p.getAttribute("lang"), title: p.getAttribute("title") })));
const wbwLines = (page) => page.evaluate(() => ({ latin: [...document.querySelectorAll("#readView .wbw-translit:not(.wbw-translit-bn)")].length, bn: [...document.querySelectorAll("#readView .wbw-translit-bn")].map((p) => p.textContent.trim()) }));
const setChoice = (page, v) => page.evaluate((x) => { const s = document.getElementById("translitScriptSelect"); s.value = x; s.dispatchEvent(new Event("change", { bubbles: true })); }, v);
const bounce = (page) => page.waitForTimeout(700);

// 112:1 is قُلْ هُوَ ٱللَّهُ أَحَدٌ; the first word قُلْ reads "কুল" (the Owner's approved sample).
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 768, 1280]) {
    const L = `${lang}/${width}`;
    console.log(`\n=== Word card and WbW panel [${L}] ===`);
    const ctx = await context({ appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(800);
    await openWord(page, 112, 1, 1);
    await page.evaluate(() => { window.__noReload = "kept"; });
    const d = await cardLines(page);
    if (lang === "en") check(`${L} Word card: default follows the app language (English app -> the Latin line only)`, d.length === 1 && !d[0].bn && /qul/i.test(d[0].text), JSON.stringify(d));
    else check(`${L} Word card: default follows the app language (Bangla app -> the Bangla line only)`, d.length === 1 && d[0].bn && d[0].text === "কুল", JSON.stringify(d));
    await setChoice(page, "bn"); await bounce(page);
    const b = await cardLines(page);
    check(`${L} Word card: the Bangla line has lang=bn and the note as its title`, b.length === 1 && b[0].bn && b[0].lang === "bn" && b[0].text === "কুল" && b[0].title === (lang === "bn" ? NOTE_BN : NOTE_EN), JSON.stringify(b));
    await setChoice(page, "both"); await bounce(page);
    const both = await cardLines(page);
    await setChoice(page, "latin"); await bounce(page);
    const lat = await cardLines(page);
    check(`${L} Word card: Both / Bangla / Latin change the line(s) with no reload`, both.length === 2 && !both[0].bn && both[1].bn && lat.length === 1 && !lat[0].bn && (await page.evaluate(() => window.__noReload)) === "kept", JSON.stringify({ both, lat }));
    const w = await wbwLines(page);
    check(`${L} WbW panel: a stored choice wins (Latin chosen: Latin lines, no Bangla line)`, w.latin >= 1 && w.bn.length === 0, JSON.stringify(w));
    await setChoice(page, "both"); await bounce(page);
    const w2 = await wbwLines(page);
    check(`${L} WbW panel: Both shows both lines on every word`, w2.latin >= 1 && w2.bn.length === w2.latin && w2.bn.every((x) => BENGALI.test(x) && !/[؀-ۿ]/.test(x)), JSON.stringify(w2));
    await setChoice(page, "bn"); await bounce(page);
    const w3 = await wbwLines(page);
    check(`${L} WbW panel: Bangla shows only the Bangla line`, w3.latin === 0 && w3.bn.length >= 1, JSON.stringify(w3));

    // the control and its note, and contrast on every new text line (light and night looks)
    await page.evaluate(() => { document.getElementById("panelStudyOptions").hidden = false; });
    await page.waitForTimeout(250);
    const ctl = await page.evaluate(() => { const s = document.getElementById("translitScriptSelect"), n = document.getElementById("translitScriptNote"), r = s.getBoundingClientRect(); return { opts: [...s.options].map((o) => o.value).join(), shown: r.width > 0 && r.height > 0, label: document.querySelector('label[for="translitScriptSelect"]').textContent.trim(), note: n.textContent.trim(), noteShown: n.getBoundingClientRect().height > 0, value: s.value }; });
    check(`${L} the Transliteration control sits with the translation choices and keeps the muted note under it`, ctl.shown && ctl.noteShown && ctl.opts === "latin,bn,both" && ctl.value === "bn" && ctl.note === (lang === "bn" ? NOTE_BN : NOTE_EN) && ctl.label === (lang === "bn" ? "প্রতিবর্ণীকরণ" : "Transliteration"), JSON.stringify(ctl));
    await setChoice(page, "both"); await bounce(page);
    for (const look of ["light", "night"]) {
      await page.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look);
      await page.waitForTimeout(200);
      const c1 = await contrast(page, ".translit-script-note"), c2 = await contrast(page, ".wbw-translit-bn"), c3 = await contrast(page, ".quran-word-card .word-card-transliteration-bn");
      const all = [...c1, ...c2, ...c3];
      check(`${L} [${look}] contrast >= 4.5 on every new text line (note ${c1}, WbW ${c2.length ? Math.min(...c2) : "-"}, card ${c3})`, c1.length >= 1 && c2.length >= 1 && all.every((x) => x >= 4.5), JSON.stringify({ c1, c2, c3 }));
    }
    check(`${L} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${L} no page errors`, realErrors(errors).length === 0, realErrors(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
}

{
  console.log("\n=== WbW panel defaults (shell round 24 stays the default) [en 390] ===");
  const ctx = await context({ viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(800);
  await openWord(page, 112, 1, 1);
  const base = await wbwLines(page);
  check("WbW panel: the English app with English meanings shows the Latin line, no Bangla line (the default)", base.latin >= 1 && base.bn.length === 0, JSON.stringify(base));
  await page.evaluate(() => { const en = document.getElementById("trEnToggle"), bn = document.getElementById("trBnToggle"); en.checked = false; bn.checked = true; bn.dispatchEvent(new Event("change", { bubbles: true })); });
  await bounce(page);
  const only = await wbwLines(page);
  check("WbW panel: Bangla-only translations default to the Bangla line (and no Latin line)", only.latin === 0 && only.bn.length >= 1, JSON.stringify(only));
  await setChoice(page, "latin"); await bounce(page);
  const chosen = await wbwLines(page);
  check("WbW panel: a stored choice wins (Latin chosen while only Bangla is ticked)", chosen.latin >= 1 && chosen.bn.length === 0, JSON.stringify(chosen));
  await ctx.close();
}

// ----------------------------------------------------------------------------------------------- the poster
for (const lang of ["en", "bn"]) {
  for (const width of [320, 360, 390, 768]) {
    const L = `${lang}/${width}`;
    console.log(`\n=== Poster menu [${L}] ===`);
    const ctx = await context({ appLang: lang, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://localhost:8080/app/ayah-poster.html?surah=112&ayah=1&kind=study&back=1`);
    await page.waitForFunction(() => document.body.dataset.apReady, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(300);
    const shown = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
    check(`${L} Poster menu: closed by default (one summary button, aria-expanded=false, the choices not on screen)`, (await page.getAttribute("#apSum", "aria-expanded")) === "false" && !(await shown("#apTools")) && await shown("#apSum"));
    const sum = await page.evaluate(() => { const b = document.getElementById("apSum"), r = b.getBoundingClientRect(); return { text: b.textContent, h: r.height, w: r.width, vw: innerWidth }; });
    const want = lang === "bn" ? ["অধ্যয়ন", "১১২:১", "বদলান", "A4"] : ["Study", "112:1", "Change", "A4"];
    check(`${L} Poster menu: the summary says the current choices in one line (${sum.text.trim().replace(/\s+/g, " ")})`, want.every((x) => sum.text.includes(x)) && sum.h >= 44 && sum.w >= sum.vw - 40, JSON.stringify(sum));
    check(`${L} Poster menu: Print and Save are always visible (menu closed)`, await shown("[data-ap-print]") && await shown("[data-ap-picture]"));
    await page.click("#apSum"); await page.waitForTimeout(200);
    check(`${L} Poster menu: tapping opens the choices and sets aria-expanded=true`, (await page.getAttribute("#apSum", "aria-expanded")) === "true" && await shown("#apTools"));
    check(`${L} Poster menu: Print and Save are always visible (menu open)`, await shown("[data-ap-print]") && await shown("[data-ap-picture]"));
    const rows = await page.evaluate(() => [...document.querySelectorAll("#apTools .ap-grp")].filter((g) => g.getBoundingClientRect().height > 0).map((g) => ({ name: g.getAttribute("aria-label"), tops: [...new Set([...g.querySelectorAll(".ap-seg > button")].map((b) => Math.round(b.getBoundingClientRect().top)))].length, n: g.querySelectorAll(".ap-seg > button").length, right: Math.max(...[...g.querySelectorAll("button, select")].map((b) => b.getBoundingClientRect().right)) })));
    check(`${L} Poster menu: no button row wraps (each segmented group has one distinct top), inside the screen`, rows.length >= 5 && rows.every((r) => r.tops <= 1 && r.right <= width), JSON.stringify(rows));
    if (width < 380) {
      const stacked = await page.evaluate(() => { const g = document.querySelector("#apTools .ap-grp"), lab = g.querySelector(".ap-lab").getBoundingClientRect(), seg = g.querySelector(".ap-seg").getBoundingClientRect(); return seg.top >= lab.bottom - 1; });
      check(`${L} Poster menu: below 380px each label sits above its buttons`, stacked);
    }
    const small = await page.evaluate(() => [...document.querySelectorAll(".ap-sum, .ap-grp button, .ap-grp select, .ap-act")].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim()));
    check(`${L} Poster menu: every control 44px+`, small.length === 0, JSON.stringify(small));
    check(`${L} Poster menu: From and To only after Choose āyāt…`, !(await shown("[data-ap-from]")) && await (async () => { await page.selectOption("[data-ap-range-select]", "custom"); await page.waitForTimeout(250); return (await shown("[data-ap-from]")) && (await shown("[data-ap-to]")); })());
    const optionValues = await page.evaluate(() => [...document.querySelectorAll("[data-ap-range-select] option")].map((o) => o.value).join());
    check(`${L} Poster menu: the Āyāt select keeps every option the page had (this āyah, choose; rukūʿ and whole sūrah when they fit)`, optionValues === "ayah,custom" || optionValues === "ayah,surah,custom" || optionValues === "ayah,ruku,surah,custom", optionValues);
    // the summary follows every change
    await page.click("[data-ap-tr=bn]"); await page.waitForTimeout(200);
    const s2 = await page.textContent("#apSumText");
    check(`${L} Poster menu: the summary text updates on every change (Bangla transliteration)`, s2.includes(lang === "bn" ? "বাংলা প্রতিবর্ণ" : "Bangla translit."), s2);
    const bnBoxes = await page.evaluate(() => { const w = [...document.querySelectorAll("#apSheet .ap-kid-word")]; return { words: w.length, bn: w.filter((x) => { const e = x.querySelector(".ap-tr-bn"); return e && e.getAttribute("lang") === "bn" && /[ঀ-৿]/.test(e.textContent) && !/[؀-ۿ]/.test(e.textContent); }).length, latin: document.querySelectorAll("#apSheet .ap-tr:not(.ap-tr-bn)").length, url: new URL(location.href).searchParams.get("tr") }; });
    check(`${L} Poster: Transliteration Bangla prints Bangla in every word box (and no Latin line), kept as tr=bn`, bnBoxes.words === 4 && bnBoxes.bn === 4 && bnBoxes.latin === 0 && bnBoxes.url === "bn", JSON.stringify(bnBoxes));
    await page.click("[data-ap-tr=both]"); await page.waitForTimeout(200);
    const bothBoxes = await page.evaluate(() => ({ bn: document.querySelectorAll("#apSheet .ap-tr-bn").length, latin: document.querySelectorAll("#apSheet .ap-tr:not(.ap-tr-bn)").length }));
    await page.click("[data-ap-tr=off]"); await page.waitForTimeout(200);
    const offBoxes = await page.evaluate(() => document.querySelectorAll("#apSheet .ap-tr").length);
    check(`${L} Poster: Both prints two lines, Off prints none`, bothBoxes.bn === 4 && bothBoxes.latin === 4 && offBoxes === 0, JSON.stringify({ bothBoxes, offBoxes }));
    const c = [...(await contrast(page, ".ap-sum-text")), ...(await contrast(page, ".ap-sum-go")), ...(await contrast(page, "#apTools .ap-lab"))];
    check(`${L} Poster menu: contrast >= 4.5 on every new text line (${Math.min(...c)})`, c.length >= 3 && c.every((x) => x >= 4.5), JSON.stringify(c));
    check(`${L} Poster menu: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${L} Poster menu: no page errors`, realErrors(errors).length === 0, realErrors(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
}

{
  console.log("\n=== Poster address and default (3A) ===");
  const ctx = await context({ appLang: "bn", viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8080/app/ayah-poster.html?surah=112&ayah=1&kind=study&tr=1`);
  await page.waitForFunction(() => document.body.dataset.apReady, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  const old = await page.evaluate(() => ({ bn: document.querySelectorAll("#apSheet .ap-tr-bn").length, latin: document.querySelectorAll("#apSheet .ap-tr:not(.ap-tr-bn)").length }));
  check("an old tr=1 reads as the app-language default (Bangla app -> Bangla line)", old.bn === 4 && old.latin === 0, JSON.stringify(old));
  await page.goto(`http://localhost:8080/app/ayah-poster.html?surah=112&ayah=1&kind=study&tr=0`);
  await page.waitForFunction(() => document.body.dataset.apReady, null, { timeout: 20000 }).catch(() => {});
  check("tr=0 is Off", await page.evaluate(() => document.querySelectorAll("#apSheet .ap-tr").length === 0));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
