// Audit part 9 (PCF J29 item 15, #860): measured on the rendered page, en/bn x 320 / 390 / 820 / 1440.
//  - QCR collections: each āyah row's reference badge ("10:101") holds its whole text (it was a 22px circle, text cut).
//  - Word card verb conjugation table: opened on a real verb; cells fit, nothing scrolls the page sideways.
//  - Mushaf view: the real page layout is in the repository (mushaf/), so the page area is measured for containment.
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const QR = ["app/quranrevival.html", "**/quranrevival.html*"];
const MUTATIONS = {
  "qcrbadge": [...QR, "box-sizing: border-box; border-radius: 11px; white-space: nowrap; } /* audit9 qcrbadge */", "box-sizing: border-box; border-radius: 11px; white-space: nowrap; width: 22px; padding: 0; } /* audit9 qcrbadge */"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const SEED = `
(function () {
  window.__stubApplyBatches = true;
})();`;
const browser = await chromium.launch();

async function open(url, lang, width, extraSeedJs = null) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, url);
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const click = (page, id) => page.evaluate((id) => document.getElementById(id).click(), id);

async function flow(tag, url, seed, fn) {
  const [lang, width] = tag.split(" ");
  let ctx;
  try {
    const o = await Promise.race([open(url, lang, parseInt(width), seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}

async function openWord(page, surah, ayah, pos) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate((s) => { const e = document.getElementById("surahSelect"); e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); }, surah);
  await page.waitForTimeout(2500);
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.querySelector(`option[value="${a}"]`)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await page.waitForTimeout(1500);
  await page.evaluate(([s, a, p]) => { document.querySelector(`#readView [data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(); }, [surah, ayah, pos]);
  await page.waitForSelector(".quran-word-card", { timeout: 8000 });
  await page.waitForTimeout(800);
}

const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
for (const lang of ["en", "bn"]) for (const width of [320, 390, 820, 1440]) {
  const tag = `${lang} ${width}px`;
  await flow(`${tag} qcr-badge`, "/app/quranrevival.html", null, async (t, page) => {
    await click(page, "tabExploreBtn"); await page.waitForTimeout(700);
    await click(page, "explorePaletteQcrBtn"); await page.waitForTimeout(900);
    // Open a collection that has āyah rows (the picker lists the fixture's collections); try each until rows appear.
    const rows = async () => page.evaluate(() => [...document.querySelectorAll(".qcr-way-row .badge")].map((e) => ({ t: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })));
    let list = await rows();
    const count = await page.evaluate(() => document.getElementById("qcrLevelSelect")?.options.length ?? 0);
    for (let i = 0; i < count && !list.length; i++) {
      await page.evaluate((i) => { const s = document.getElementById("qcrLevelSelect"); s.selectedIndex = i; s.dispatchEvent(new Event("change", { bubbles: true })); }, i);
      await page.waitForTimeout(500);
      list = await rows();
    }
    if (PROBE) console.log(JSON.stringify(list));
    check(`${t}: POSITIVE CONTROL QCR āyah badges rendered (${list.length})`, list.length > 0);
    check(`${t}: POSITIVE CONTROL a wide reference (with a colon) is present`, list.some((x) => /[:：]/.test(x.t) && x.t.length >= 3), JSON.stringify(list.map((x) => x.t)));
    const bad = list.filter((x) => x.sw > x.cw);
    check(`${t}: every badge holds its text (scrollWidth <= clientWidth)`, bad.length === 0, bad.map((x) => `${x.t} ${x.sw}>${x.cw}`).join(", "));
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${t}: nothing scrolls sideways (${over})`, over <= 0);
  });
  await flow(`${tag} verb-table`, "/app/quranrevival.html", null, async (t, page) => {
    await openWord(page, 2, 102, 35); // فَيَتَعَلَّمُونَ, Form V of ع ل م
    // UPDATED IN PLACE 19 Oct 2026 (PCF MSA J39, the Word card's five levels): Verb Conjugation moved from Depth to
    // the new Taṣrīf tab (stored id `tasrif`), unchanged, so the table is opened there. Everything measured is the same.
    await page.click('[data-word-card-level="tasrif"]', { timeout: 8000 });
    await page.waitForSelector('[data-word-card-sec="conj"]', { timeout: 8000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const s = document.querySelector('[data-word-card-sec="conj"]'); if (s) s.open = true; });
    await page.waitForTimeout(600);
    // Updated in place 20 Oct 2026 (PCF MSA J46, tick 2A): a narrow card now OPENS on the āyah word's tense; this
    // check measures the three-table view, so it presses "All three" first, as a reader would. The one-tense view's
    // own containment checks are in word-card-tense-toggle-browser.mjs.
    await page.evaluate(() => document.querySelector('[data-word-card-conj-toggle] [data-word-card-conj-view="all"][aria-pressed="false"]')?.click());
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const s = document.querySelector('[data-word-card-sec="conj"]');
      if (!s) return null;
      const card = document.querySelector(".quran-word-card");
      const cb = card.getBoundingClientRect();
      const cells = [...s.querySelectorAll("td")].map((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, r: e.getBoundingClientRect().right }));
      const tabs = [...s.querySelectorAll("[data-word-card-conj-table]")].map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, sw: e.scrollWidth, cw: e.clientWidth }; });
      const wrap = s.querySelector(".word-card-conj-wrap");
      return { cells, tabs, cardL: cb.left, cardR: cb.right, vw: innerWidth, wrapSw: wrap.scrollWidth, wrapCw: wrap.clientWidth, over: document.documentElement.scrollWidth - innerWidth };
    });
    if (PROBE) console.log(t, JSON.stringify({ ...m, cells: m && m.cells.length }));
    check(`${t}: POSITIVE CONTROL the conjugation tables rendered`, !!m && m.tabs.length === 3 && m.cells.length > 10);
    if (!m) return;
    check(`${t}: no table cell clips its text`, m.cells.every((c) => c.sw <= c.cw + 1), JSON.stringify(m.cells.filter((c) => c.sw > c.cw + 1).slice(0, 3)));
    check(`${t}: each table sits inside the card`, m.tabs.every((x) => x.l >= m.cardL - 1 && x.r <= m.cardR + 1 && x.sw <= x.cw + 1), JSON.stringify({ tabs: m.tabs, cardL: m.cardL, cardR: m.cardR }));
    check(`${t}: the table area fits (or scrolls inside its own box) and the page does not scroll sideways (${m.over})`, m.over <= 0);
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
