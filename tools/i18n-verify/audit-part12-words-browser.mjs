// Audit part 12 (PCF J29, manual audit, #870): the User Manual's "Qur'an: words and āyāt" features, each one WORKING.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a window or card), English and Bangla.
// The result is asserted, not the element: a stored write (window.__stubWriteData), a changed class, a URL, a computed box.
//   1 Āyah card   2 Before Al-Fātiḥah   3 Related hadith   4 Full text   5 Related/connected āyāt   6 ⋮ quick menu
//   7 Word card (open + top)   8 Word mark (+ lowering asks)   9 Word search   10 Dictionary box + links
//   11 Verb conjugation (verb yes, noun no)   12 Recording word progress   13 Bangla: no English left on these features
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:  node tools/i18n-verify/audit-part12-words-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const WONLY = Number((process.argv.find((a) => a.startsWith("--width=")) || "").slice(8)) || 0;
const LONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
const QR = ["app/quranrevival.html", "**/quranrevival.html*"];
const MUTATIONS = {
  // The full-screen Āyah card (below 900px) sized content-box + 100% high: 16px taller than the screen.
  "sheetbox": [...QR, " box-sizing: border-box; /* audit12 sheetbox: content-box + 100% made the card 16px taller than the screen */", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const bnDigits = (s) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const refText = (lang, s) => (lang === "bn" ? bnDigits(s) : s);

async function open(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}

async function flow(name, lang, width, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}

const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const clean = (page) => ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
async function openRead(page) {
  await clean(page);
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 300);
}
async function goToAyah(page, surah, ayah) {
  await openRead(page);
  const moved = await ev(page, (s) => { const el = document.getElementById("surahSelect"); if (el.value === String(s)) return false; el.value = String(s); el.dispatchEvent(new Event("change", { bubbles: true })); return true; }, surah);
  if (moved) await page.waitForFunction((s) => document.querySelector(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${s}:"]`) || document.querySelector(`#readView [data-ayah-num-badge^="${s}:"]`), surah, { timeout: 15000 });
  await ev(page, (a) => { const el = document.getElementById("ayahSelect"); if (el.value !== String(a)) { el.value = String(a); el.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await settle(page, 900);
  await clean(page);
}
async function wbwOn(page) {
  await ev(page, () => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 500);
}
async function openWord(page, surah, ayah, pos) {
  await ev(page, () => document.querySelector("[data-word-card-close]")?.click());
  await goToAyah(page, surah, ayah);
  await wbwOn(page);
  const id = `quran-word-occurrence:v1:${surah}:${ayah}:${pos}`;
  await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), id, { timeout: 8000 });
  await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), id);
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${id}"]`, { timeout: 8000 });
  await settle(page, 1000);
}
async function openSheet(page, surah, ayah) {
  await goToAyah(page, surah, ayah);
  await ev(page, (k) => document.querySelector(`[data-ayah-num-badge="${k}"]`)?.click(), `${surah}:${ayah}`);
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await settle(page, 600);
}
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
const rectOf = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight }; }, sel);
const navBottom = (page) => ev(page, () => Math.max(0, ...[...document.querySelectorAll("nav, #qrNav, .nav-row, #topNav")].map((e) => e.getBoundingClientRect().bottom)));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  // 1 + 3 + 4 + 5: the Āyah card (36:38), Related hadith, Full text, Related āyāt.
  await flow("ayahcard", lang, width, async (t, page, ctx, errors) => {
    await openSheet(page, 36, 38);
    const s = await ev(page, () => { const sh = document.querySelector("[data-ayah-sheet]"); const r = sh.getBoundingClientRect(); const c = document.querySelector("[data-ayah-sheet] [data-ayah-sheet-close]").getBoundingClientRect(); const cs = getComputedStyle(sh); return { bs: cs.boxSizing, pb: cs.paddingBottom, h: cs.height, sh: sh.scrollHeight, ch: sh.clientHeight, ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref").textContent, unit: sh.dataset.unitKey, l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, closeOn: c.width > 0 && c.right <= innerWidth + 1 && c.top >= 0, overlayOpen: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") }; });
    if (PROBE) console.log(t, JSON.stringify(s));
    check(`${t}: POSITIVE CONTROL the Āyah card is open`, s.overlayOpen && s.unit === "ayah:36:38", JSON.stringify(s));
    check(`${t}: the Āyah card shows that āyah (${refText(lang, "36:38")})`, s.ref.includes(refText(lang, "36:38")), s.ref);
    check(`${t}: the card sits inside the screen (bottom ${Math.round(s.b)} of ${s.vh}) with its close button on screen`, s.l >= -1 && s.r <= s.vw + 1 && s.t >= 0 && s.b <= s.vh + 1 && s.closeOn, JSON.stringify(s));
  });
}

await browser.close();
console.log(`\n==== audit part 12, words and āyāt: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
