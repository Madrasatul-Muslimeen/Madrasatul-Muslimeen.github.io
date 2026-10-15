// Audit part 11 (PCF J29, manual audit, #866): the User Manual's "Qur'an: reading" features, each one WORKING, start to end.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a window), English and Bangla.
// The result is asserted, not the element: a rendered font size, a stored write, a changed class, a computed display.
//   1 Read view      2 Study options     3 Saved settings (presets)   4 Listening (play)    5 Mushaf view   6 Meaning
//   7 Full screen + window               8 Text size (A±)             9 Mark words          10 Al-Fātiḥah count + Mark complete
//   11 Unit card, End-of-unit prompt, Quick buttons          12 Bangla page: no English left on these controls
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
const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const QR = ["app/quranrevival.html", "**/quranrevival.html*"];
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

// ~2 s of silence, so a played clip is still "playing" when the button is read.
const WAV = (() => {
  const rate = 8000, n = rate * 2, b = Buffer.alloc(44 + n, 0x80);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40);
  return b;
})();
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

const browser = await chromium.launch();

async function open(lang, width, { seed = null, mushaf = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: seed });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => (r.request().resourceType() === "media" ? r.fulfill({ status: 200, contentType: "audio/wav", body: WAV }) : r.abort()));
  if (mushaf) {
    await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync(path.join(ROOT, "mushaf/mushaf-madani-v2.json")) }));
    await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => { const f = r.request().url().split("/").pop(); r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync(path.join(ROOT, "mushaf/fonts", f)) }); });
    await ctx.route(SURAH_HEADER_FONT_URL, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync(path.join(ROOT, "mushaf/QCF_SurahHeader_COLOR-Regular.woff2")) }));
  }
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}

async function flow(name, lang, width, opts, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, opts || {}),new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 100000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}

const ev = (page, f, a) => page.evaluate(f, a);
const click = (page, id) => page.evaluate((id) => document.getElementById(id).click(), id);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
async function openRead(page) {
  await click(page, "tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 300);
}
/** Opens Study options the way a reader does: the Study tab, then Options. */
async function openOptions(page) {
  await page.click("#tabStudyBtn"); await settle(page, 200);
  await page.click("#tabStudyOptionsBtn"); await settle(page, 400);
}
const panelOpen = (page) => ev(page, () => { const p = document.getElementById("panelStudyOptions"); const r = p.getBoundingClientRect(); return { hidden: p.hidden, display: getComputedStyle(p).display, top: r.top, left: r.left, right: r.right, bottom: r.bottom, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; });
async function closePanel(page) { await ev(page, () => document.querySelector("#panelStudyOptions [data-close-panel]").click()); await settle(page, 300); }
const setCheck = (page, id, on) => ev(page, ([id, on]) => { const t = document.getElementById(id); if (t.checked !== on) { t.checked = on; t.dispatchEvent(new Event("change", { bubbles: true })); } }, [id, on]);
const setSelect = (page, id, v) => ev(page, ([id, v]) => { const e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const readLen = (page) => ev(page, () => document.getElementById("ayahPanels").textContent.length);
const toolsOpen = (page) => ev(page, () => { const t = document.getElementById("readToolsBtn"); if (t.getBoundingClientRect().width > 0 && t.getAttribute("aria-expanded") !== "true") t.click(); });
const BN = /[ঀ-৿]/;
const flowNames = [];

const WIDTHS = [320, 390, 820, 1440];
for (const lang of ["en", "bn"]) for (const width of WIDTHS) {
  // 1 + 2: the Read view opens and shows the chosen Unit; Study options open, a setting changes, the Read view follows.
  await flow("read+options", lang, width, null, async (t, page) => {
    await openRead(page);
    const s = await ev(page, () => ({ rv: !document.getElementById("readView").hidden, disp: getComputedStyle(document.getElementById("readView")).display, sel: ["readUnitTypeSelect", "readSurahSelect", "readAyahSelect"].map((i) => document.getElementById(i).value), chip: document.getElementById("readUnitChip").textContent.trim(), top: document.getElementById("readView").getBoundingClientRect().top, navBottom: Math.max(0, ...[...document.querySelectorAll("nav, #qrNav, .nav-row, #topNav")].map((e) => e.getBoundingClientRect().bottom)) }));
    if (PROBE) console.log(t, JSON.stringify(s));
    check(`${t}: POSITIVE CONTROL Read view is open and shows āyah text`, s.rv && s.disp !== "none" && (await readLen(page)) > 20);
    check(`${t}: Read view shows the chosen Unit (Ayah, Surah 1, Ayah 1)`, s.sel.join() === "ayah,1,1", s.sel.join());
    await setSelect(page, "readSurahSelect", 112); await settle(page, 1500);
    const after = await ev(page, () => ({ surah: document.getElementById("surahSelect").value, panel: document.getElementById("ayahPanels").textContent }));
    check(`${t}: choosing Surah 112 in the Read view changes the Unit being read`, after.surah === "112" && /قُلْ|قل/.test(after.panel), after.surah);
    // Study options
    await openOptions(page);
    const p = await panelOpen(page);
    check(`${t}: POSITIVE CONTROL Study options open on screen`, !p.hidden && p.display !== "none" && p.w > 0 && p.h > 0, JSON.stringify(p));
    check(`${t}: Study options sit inside the screen (${Math.round(p.left)}..${Math.round(p.right)} of ${p.vw}, bottom ${Math.round(p.bottom)} of ${p.vh})`, p.left >= -1 && p.right <= p.vw + 1 && p.bottom <= p.vh + 1 && p.top >= 0);
    const hasClose = await ev(page, () => { const b = document.querySelector("#panelStudyOptions [data-close-panel]"); const r = b.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1 && r.top >= 0; });
    check(`${t}: Study options have a visible way back (close button on screen)`, hasClose);
    // A setting changes and the Read view follows: English translation off shortens the page, on restores it.
    const withEn = await readLen(page);
    await setCheck(page, "trEnToggle", false); await settle(page, 600);
    const noEn = await readLen(page);
    check(`${t}: English translation off — the Read view follows (${withEn} -> ${noEn})`, noEn < withEn);
    await setCheck(page, "trEnToggle", true); await settle(page, 600);
    check(`${t}: English translation on again — the Read view follows (${await readLen(page)})`, (await readLen(page)) === withEn);
    await closePanel(page);
    check(`${t}: closing Study options leaves the Read view open`, await ev(page, () => document.getElementById("panelStudyOptions").hidden && !document.getElementById("readView").hidden));
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
