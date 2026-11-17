// The Hadith Books bar (the Owner, 17 Nov 2026, from a phone screenshot): ONE bar instead of two (Chapters | Hadith | Text and the
// pane's own "CHAPTERS" heading row with its two size icons), three icons in it -- ⚙ Settings/choice, ⓘ Info, ⚡ Actions -- that hold
// what used to sprawl above the chapter list (Original/My index; Go to hadith number and Edit names), tighter gaps, and the chapter
// names in English beside the Arabic. Every panel has ← Back, ⛶ Full screen and ✕. Checked on the real page, owner signed in:
//   phone (<= 720px): one bar, no heading row, three tool icons inside it, every control >= 40px, nothing cut or outside the screen;
//   wide: the three icons sit in the Chapters pane heading; each panel opens, goes full screen, and closes by ← Back or ✕ with focus
//   back on its icon; Go closes its panel and opens the hadith; Bukhari's rows carry English; the gaps between the blocks are small.
// Run from the repository root with serve.js on :8080.   --mutate=<name> serves one deliberate break; --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  // (the heading row is removed by the script AND hidden by a phone rule: a second layer, so only the script's half can be proven by a mutation)
  nomove: ["js/hadith-reader.js", "      steps.appendChild(tools);\n      head.remove();", "      head.remove();"],
  noicons: ["js/hadith-reader.js", "  return key === \"chapters\" ? [\"choice\", \"info\", \"actions\"] : [];", "  return [];"],
  nophoneicons: ["js/hadith-reader.js", "  if (phone) return key === \"text\" ? [\"info\"] : [\"choice\", \"info\", \"actions\"];", "  if (phone) return [];"],
  noback: ["js/hadith-reader.js", "  head.append(backBtn, title, full, x);", "  head.append(title, full, x);"],
  nofull: ["js/hadith-reader.js", "  head.append(backBtn, title, full, x);", "  head.append(backBtn, title, x);"],
  nox: ["js/hadith-reader.js", "  head.append(backBtn, title, full, x);", "  head.append(backBtn, title, full);"],
  nofocus: ["js/hadith-reader.js", "    oi.toolFrom = null; oi.toolFocus = def.id;", "    oi.toolFrom = null;"],
  gokeepsopen: ["js/hadith-browser.js", "        ctx.done();\n        localRefresh();\n        return;", "        localRefresh();\n        return;"],
  noenglish: ["js/hadith-browser.js", "        const e = el(\"span\", \"hadith-row-en\", b.en); e.dataset.openitiChapterEn = c.id; e.lang = \"en\";\n        row.insertBefore(e, row.querySelector(\".hadith-row-meta\"));", ""],
  wideheadings: ["css/hadith.css", ".hadith-crumbs { margin: 0.25rem 0 0.2rem; }", ".hadith-crumbs { margin: 1.4rem 0 1.4rem; }"],
  noenter: ["js/hadith-reader.js", "oi.toolEnter = true; // focus moves into the panel once it is drawn", "oi.toolEnter = false;"],
  nofloattools: ["js/hadith-reader.js", "if (def) tools.appendChild(toolButton(def, opts)); } // also in a popped-out pane", "if (def && !oi.float[key]) tools.appendChild(toolButton(def, opts)); } // also in a popped-out pane"],
  nofocusafterback: ["js/minimise.js", "    if (pane) setTimeout(() => document.querySelector(`[data-reader-pop=\"${pane}\"]`)?.focus(), 60);", ""],
  nowayback: ["js/hadith-reader.js", "    oi.toolFrom = oi.phone !== \"chapters\" ? oi.phone : (oi.toolFrom ?? null);", "    oi.toolFrom = null;"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (MUTATE) { const [file, anchor] = MUT[MUTATE]; if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE} (${file})`); process.exit(1); } }
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of (arg("only") ? arg("only").split(",") : Object.keys(MUT))) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff && !/mutation anchor missing/.test(ff)) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-books-bar mutations: ${caught} of ${caught + missed.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BUK = "0256Bukhari.Sahih.JK000110-ara1", MUS = "0261Muslim.Sahih.Shamela0001727-ara1";
async function open(lang, width, book = BUK) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: "window.__stubApplyUpdates = true;" });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); await r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html");
  await page.waitForSelector(`[data-openiti-book="${book}"]`, { state: "attached" });
  await page.click(`[data-openiti-book="${book}"]`);
  await page.waitForSelector("[data-openiti-chapter]", { state: "attached" });
  await page.waitForTimeout(700);
  return { ctx, page, errors };
}
const settle = (p, ms = 250) => p.waitForTimeout(ms);
const press = (p, sel) => p.$eval(sel, (e) => { e.scrollIntoView({ block: "center" }); e.click(); }).catch(() => console.log(`  note: could not press ${sel}`));
const rect = (p, sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }).catch(() => null);
const visible = (p, sel) => p.$$eval(sel, (ns) => ns.filter((n) => n.getClientRects().length > 0).length);

// ---- 1. phone widths: ONE bar ---------------------------------------------------------------------------------------------------
for (const lang of ["en", "bn"]) for (const width of [320, 340, 360, 390, 430, 720]) {
  const tag = `[${lang} ${width} bar]`;
  const { ctx, page: P, errors } = await open(lang, width);
  const info = await P.evaluate(() => {
    const bar = document.querySelector(".hadith-reader-steps"), b = bar.getBoundingClientRect(), cw = document.documentElement.clientWidth;
    const kids = [...bar.querySelectorAll("button")].map((k) => { const r = k.getBoundingClientRect(); return { id: k.dataset.readerShow || k.dataset.readerTool || k.dataset.readerStep || k.textContent.trim(), w: r.width, h: r.height, cut: k.scrollWidth > k.clientWidth + 1, out: r.left < -0.5 || r.right > cw + 0.5 }; });
    const grid = document.querySelector(".hadith-reader-grid").getBoundingClientRect();
    const crumbs = document.querySelector(".hadith-crumbs").getBoundingClientRect();
    return { shown: b.height > 0, kids, side: document.documentElement.scrollWidth - cw, gapBarGrid: grid.top - b.bottom, gapCrumbsBar: b.top - crumbs.bottom, heads: [...document.querySelectorAll(".hadith-reader-grid .hadith-pane-head")].filter((h) => h.getClientRects().length > 0).length };
  });
  check(`${tag} the one bar shows: the three tabs and the three tool icons (⚙ ⓘ ⚡) are all in it`, info.shown && info.kids.filter((k) => ["chapters", "hadiths", "text"].includes(k.id)).length === 3 && ["choice", "info", "actions"].every((id) => info.kids.some((k) => k.id === id)), JSON.stringify(info.kids.map((k) => k.id)));
  check(`${tag} there is NO second heading row (the pane's own "CHAPTERS" bar with its two size icons)`, info.heads === 0, String(info.heads));
  check(`${tag} every button in the bar is >= 40px tall and wide enough to touch, none cut, none outside the screen, no sideways scroll`, info.kids.every((k) => k.h >= 40 && k.w >= 38 && !k.cut && !k.out) && info.side <= 0, JSON.stringify(info.kids.filter((k) => k.h < 40 || k.w < 38 || k.cut || k.out)));
  check(`${tag} the gaps are small: breadcrumb to bar <= 14px, bar to the list <= 12px`, info.gapCrumbsBar <= 14 && info.gapBarGrid <= 12, `${Math.round(info.gapCrumbsBar)} / ${Math.round(info.gapBarGrid)}`);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 2)));
  if (width === 390) await P.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/bar-${lang}-${width}.png` });
  await ctx.close();
}

// ---- 2. the three panels, ← ⛶ ✕, on a phone and on a computer ------------------------------------------------------------------------
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width} panels]`;
  const { ctx, page: P } = await open(lang, width);
  for (const id of ["choice", "info", "actions"]) {
    await press(P, `[data-reader-tool="${id}"]`); await P.waitForSelector(`[data-tool-panel="${id}"]`, { timeout: 8000 }).catch(() => {}); await settle(P);
    const bs = await P.evaluate((i) => { const pn = document.querySelector(`[data-tool-panel="${i}"]`); if (!pn) return null; const q = (s) => { const e = pn.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, r: r.right }; }; const cw = document.documentElement.clientWidth; const pr = pn.getBoundingClientRect(); return { back: q("[data-tool-back]"), full: q("[data-tool-full]"), close: q("[data-tool-close]"), inside: pr.left >= -0.5 && pr.right <= cw + 0.5, expanded: document.querySelector(`[data-reader-tool="${i}"]`).getAttribute("aria-expanded") }; }, id);
    check(`${tag} ${id}: the panel opens with ← Back, ⛶ Full screen and ✕, each >= 40px, inside the screen; its icon says it is open`, !!bs && [bs.back, bs.full, bs.close].every((b) => b && b.w >= 40 && b.h >= 40) && bs.inside && bs.expanded === "true", JSON.stringify(bs));
    if (id === "choice") check(`${tag} ⚙ holds the two index buttons, Original index and My index (Bukhari's choice)`, (await visible(P, '[data-tool-panel="choice"] [data-myindex-mode]')) === 2);
    if (id === "info") check(`${tag} ⓘ names the book in Arabic and English and counts its chapters and hadith`, /صحيح البخاري/.test(await P.$eval('[data-tool-panel="info"]', (n) => n.textContent)) && /Sahih al-Bukhari/.test(await P.$eval('[data-tool-panel="info"]', (n) => n.textContent)) && (await P.$$eval('[data-tool-panel="info"] dd', (d) => d.length)) >= 2);
    if (id === "actions") check(`${tag} ⚡ holds "Go to hadith number" (with its numbering choice and Go) and Edit names`, !!(await P.$('[data-tool-panel="actions"] [data-openiti-goto-input]')) && !!(await P.$('[data-tool-panel="actions"] [data-openiti-goto-mode]')) && !!(await P.$('[data-tool-panel="actions"] [data-openiti-goto-btn]')) && !!(await P.$('[data-tool-panel="actions"] [data-hadith-names-open]')));
    // full screen
    await press(P, `[data-tool-panel="${id}"] [data-tool-full]`); await settle(P);
    const fr = await rect(P, `[data-tool-panel="${id}"]`);
    check(`${tag} ${id}: ⛶ fills the whole screen`, !!fr && fr.l <= 0.5 && fr.t <= 0.5 && Math.abs(fr.w - width) <= 1 && fr.h >= 800, JSON.stringify(fr));
    await press(P, `[data-tool-panel="${id}"] [data-tool-full]`); await settle(P);
    check(`${tag} ${id}: pressing it again brings the panel back in place`, (await rect(P, `[data-tool-panel="${id}"]`))?.h < 700);
    // ✕
    await press(P, `[data-tool-panel="${id}"] [data-tool-close]`); await settle(P, 400);
    check(`${tag} ${id}: ✕ closes the panel and focus is back on its icon (way-back law)`, (await P.$(`[data-tool-panel="${id}"]`)) === null && (await P.evaluate((i) => document.activeElement === document.querySelector(`[data-reader-tool="${i}"]`), id)));
    // ← Back
    await press(P, `[data-reader-tool="${id}"]`); await P.waitForSelector(`[data-tool-panel="${id}"]`); await settle(P);
    await press(P, `[data-tool-panel="${id}"] [data-tool-back]`); await settle(P, 400);
    check(`${tag} ${id}: ← Back closes it too, focus on its icon`, (await P.$(`[data-tool-panel="${id}"]`)) === null && (await P.evaluate((i) => document.activeElement === document.querySelector(`[data-reader-tool="${i}"]`), id)));
  }
  await ctx.close();
}

// ---- 2b. keyboard: opening a tool puts focus inside its panel (a re-draw would otherwise leave it on the page) ----------------------------
{
  const tag = "[en 390 keyboard]";
  const { ctx, page: P } = await open("en", 390);
  await P.focus('[data-reader-tool="info"]'); await P.keyboard.press("Enter"); await P.waitForSelector('[data-tool-panel="info"]', { timeout: 8000 }).catch(() => {}); await settle(P, 300);
  check(`${tag} Enter on ⓘ opens its panel and focus lands inside it, on ← Back`, await P.evaluate(() => document.activeElement?.matches('[data-tool-panel="info"] [data-tool-back]')));
  await P.keyboard.press("Escape"); await settle(P, 400);
  check(`${tag} Escape closes it and focus is back on ⓘ`, (await P.$('[data-tool-panel="info"]')) === null && (await P.evaluate(() => document.activeElement === document.querySelector('[data-reader-tool="info"]'))));
  await ctx.close();
}

// ---- 3. Go closes its panel and opens the hadith; Back from a panel opened on the Text tab returns to the Text tab ------------------
{
  const tag = "[en 390 go and way back]";
  const { ctx, page: P } = await open("en", 390);
  await press(P, '[data-reader-tool="actions"]'); await P.waitForSelector("[data-openiti-goto-input]");
  await P.fill("[data-openiti-goto-input]", "6306");
  await press(P, "[data-openiti-goto-btn]"); await P.waitForSelector("[data-openiti-focused]", { state: "attached", timeout: 15000 }); await settle(P, 500);
  check(`${tag} Go opens the hadith and closes the Actions panel`, (await P.$('[data-tool-panel="actions"]')) === null && (await P.$eval('[data-reader-show="text"]', (n) => n.getAttribute("aria-pressed"))) === "true");
  const bar = await P.$$eval(".hadith-reader-steps [data-reader-step], .hadith-reader-steps [data-reader-tool]", (ns) => ns.map((n) => n.dataset.readerStep ?? n.dataset.readerTool));
  check(`${tag} on the Text tab the one bar carries ‹ › and ⓘ`, JSON.stringify(bar) === JSON.stringify(["-1", "1", "info"]), JSON.stringify(bar));
  await press(P, '[data-reader-tool="info"]'); await P.waitForSelector('[data-tool-panel="info"]'); await settle(P);
  check(`${tag} ⓘ from the Text tab shows its panel at the top of Chapters`, (await P.$eval('[data-reader-show="chapters"]', (n) => n.getAttribute("aria-pressed"))) === "true");
  await press(P, '[data-tool-panel="info"] [data-tool-back]'); await settle(P, 500);
  check(`${tag} ← Back returns to the Text tab it was opened from (the way-back law)`, (await P.$eval('[data-reader-show="text"]', (n) => n.getAttribute("aria-pressed"))) === "true" && (await P.$('[data-tool-panel="info"]')) === null);
  await ctx.close();
}

// ---- 4. wide: the icons sit in the Chapters pane heading; no bar --------------------------------------------------------------------
{
  const tag = "[en 1280 wide]";
  const { ctx, page: P } = await open("en", 1280);
  const inHead = await P.$$eval('.hadith-reader-grid [data-reader-pane="chapters"] .hadith-pane-head [data-reader-tool]', (ns) => ns.map((n) => n.dataset.readerTool));
  check(`${tag} the three icons are in the Chapters pane heading, beside its two size icons`, JSON.stringify(inHead) === JSON.stringify(["choice", "info", "actions"]) && (await visible(P, '[data-reader-pane="chapters"] .hadith-pane-head [data-reader-max], [data-reader-pane="chapters"] .hadith-pane-head [data-reader-pop]')) === 2, JSON.stringify(inHead));
  check(`${tag} the step bar is hidden on a wide screen`, (await rect(P, ".hadith-reader-steps"))?.h === 0 || (await visible(P, ".hadith-reader-steps")) === 0);
  await ctx.close();
}

// ---- 4b. a popped-out pane is a window: ← Back, ⛶ Full screen and ✕ -------------------------------------------------------------------
{
  const tag = "[en 1280 popped-out pane]";
  const { ctx, page: P } = await open("en", 1280);
  await press(P, '[data-reader-pop="chapters"]'); await P.waitForSelector(".hadith-pane-float", { timeout: 8000 }).catch(() => {});
  await P.waitForSelector(".hadith-pane-float .mm-back-btn", { timeout: 5000 }).catch(() => {});
  const ctl = await P.evaluate(() => { const q = (s) => { const e = document.querySelector(`.hadith-pane-float ${s}`); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }; return { back: q(".mm-back-btn"), full: q(".mm-full-btn"), close: q("[data-reader-dock]") }; });
  check(`${tag} the window has ← Back, ⛶ Full screen and ✕, each at least 40px`, [ctl.back, ctl.full, ctl.close].every((c) => c && c.w >= 40 && c.h >= 40), JSON.stringify(ctl));
  check(`${tag} the popped-out Chapters pane still carries ⚙ ⓘ ⚡ (its Go box and index choice are not out of reach)`, (await visible(P, ".hadith-pane-float [data-reader-tool]")) === 3);
  await press(P, '.hadith-pane-float [data-reader-tool="actions"]'); await P.waitForSelector('.hadith-pane-float [data-tool-panel="actions"] [data-openiti-goto-input]', { timeout: 8000 }).catch(() => {});
  check(`${tag} ⚡ in the window opens its panel there, with the Go box`, !!(await P.$('.hadith-pane-float [data-tool-panel="actions"] [data-openiti-goto-input]')));
  await P.click(".hadith-pane-float .mm-back-btn"); await settle(P, 400);
  check(`${tag} after ← Back focus is on the pane's own pop-out button (not lost to the page)`, await P.evaluate(() => document.activeElement === document.querySelector('[data-reader-pop="chapters"]')));
  check(`${tag} ← Back puts the pane back in its place (the window is gone)`, (await P.$(".hadith-pane-float")) === null && !!(await P.$('[data-reader-pane="chapters"] [data-openiti-chapter]')));
  await ctx.close();
}

// ---- 5. English beside the Arabic -------------------------------------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  const tag = `[${lang} 390 English names]`;
  const { ctx, page: P } = await open(lang, 390);
  await settle(P, 600);
  const en = await P.$$eval("[data-openiti-chapter]", (rows) => rows.slice(0, 4).map((r) => [r.dataset.openitiChapter, r.querySelector("[data-openiti-chapter-en]")?.textContent ?? null]));
  check(`${tag} Bukhari's books show their English name under the Arabic (Revelation, Belief, Knowledge...) whatever the app's language`, en.filter((x) => x[1]).length >= 3 && en.some((x) => x[1] === "Revelation") && en.some((x) => x[1] === "Belief"), JSON.stringify(en));
  const lg = await P.$eval("[data-openiti-chapter-en]", (n) => n.lang);
  check(`${tag} ...marked as English text`, lg === "en");
  await ctx.close();
}
{
  const tag = "[en 390 Muslim]";
  const { ctx, page: P } = await open("en", 390, MUS);
  await press(P, '[data-reader-tool="choice"]'); await settle(P);
  check(`${tag} a book with no alternate index says there is nothing to choose in ⚙ (the control explains itself)`, /Nothing to choose/.test(await P.$eval('[data-tool-panel="choice"]', (n) => n.textContent)) && (await P.$("[data-myindex-mode]")) === null);
  await ctx.close();
}
await browser.close();
console.log(`\n==== Hadith Books bar: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
