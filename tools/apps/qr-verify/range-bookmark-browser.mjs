// QR J03 (the Owner): bookmark a range of āyāt from Quran Study's Read view, through MMSA's popover range kind
// (bookmark-popover.js, MMSA v11.14, pinned). At 390 and 1400, English and Bangla, signed in through MMSA's harness:
//   - the dialog's fourth choice is Range; its Name is "<Surah> <a>–<b>" (Bangla digits and name in Bangla);
//   - Save writes the bookmark into the same bookmarks document, position range:S:A-B, with the settings MMSA's
//     Bookmarks page writes for a range (unitType range, surahNum, ayahNum = from, rangeFrom, rangeTo);
//   - a reversed or out-of-surah range is refused in words, the dialog staying open;
//   - a range bookmark opens at its first āyah as the Range unit, with its settings and with its position only.
//   node tools/apps/qr-verify/range-bookmark-browser.mjs     (serves itself on PORT, default 8105)
//   --mutate=norange   Quran Study passes no range unit: the suite must FAIL
//   --mutate=noposonly a position-only range bookmark is not read: the suite must FAIL
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import { spawn } from "node:child_process";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate="))?.split("=")[1] ?? null;
const PAGE = "app/quranrevival.html";
const MUTATIONS = {
  norange: ['      choices.push({\n        id: "range", label: t("Range"), kind: "range",', '      if (false) choices.push({\n        id: "range", label: t("Range"), kind: "range",'],
  noposonly: ['      if (rangeKey && typeof settings?.surahNum !== "number") {', "      if (false) {"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`Unknown mutation "${MUTATE}"`);
const PORT = Number(process.env.PORT) || 8105;
let server = null;
const base = process.env.QR_BASE;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what, detail = "") => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${!ok && detail ? ` ${detail}` : ""}`);
};
const BN = "০১২৩৪৫৬৭৮৯";
const dg = (lang, s) => (lang === "bn" ? String(s).replace(/\d/g, (d) => BN[d]) : String(s));
const WORDS = {
  en: { range: "Range", order: "The first āyah must not come after the last.", max: "Choose āyāt from 1 to 286.", surah: "Al-Baqara" }, // surah-index.json's English name
  bn: { range: "পরিসর", order: "শুরুর আয়াত শেষ আয়াতের পরে হতে পারে না।", max: "১ থেকে ২৮৬ পর্যন্ত আয়াত বেছে নিন।", surah: null },
};

async function context(width, lang, seed = "") {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: width < 600 ? 844 : 900 }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUTATIONS[MUTATE];
    await ctx.route(/\/app\/quranrevival\.html(\?.*)?$/, (r) => {
      const src = fs.readFileSync(PAGE, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      return r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return ctx;
}
async function ready(page) {
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
}

const browser = await chromium.launch();
try {
  for (const width of [390, 1400]) for (const lang of ["en", "bn"]) {
    try { await dialog(width, lang); } catch (err) { check(false, `@${width} ${lang} dialog stopped early: ${String(err.message).split("\n")[0]}`); }
  }
  for (const width of [390, 1400]) {
    try { await opening(width); } catch (err) { check(false, `@${width} opening stopped early: ${String(err.message).split("\n")[0]}`); }
  }
} finally {
  await browser.close();
  server?.kill();
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

async function openDialog(page) {
  await page.evaluate(() => document.getElementById("readBookmarkBtn").click());
  await page.waitForSelector(".bm-popover-overlay", { timeout: 8000 });
}

async function dialog(width, lang) {
  const tag = `@${width} ${lang}`;
  const ctx = await context(width, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "networkidle" });
  await ready(page);
  // Al-Baqarah, whole Surah, from āyah 1 (its first ruku' runs to 7).
  await page.evaluate(() => { const u = document.getElementById("unitTypeSelect"); u.value = "surah"; u.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => document.getElementById("surahSelect").value === "2" && !!document.querySelector('#ayahSelect option[value="286"]'), null, { timeout: 15000 });
  await page.evaluate(() => { const a = document.getElementById("ayahSelect"); a.value = "1"; a.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.evaluate(() => document.getElementById("tabReadBtn").click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  const surahName = WORDS[lang].surah ?? await page.evaluate(() => document.querySelector("#surahSelect option:checked")?.textContent.replace(/^[\d০-৯.\s]+/, "").trim());

  await openDialog(page);
  const units = await page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => ({ id: b.dataset.bmPopUnit, t: b.textContent.trim() })));
  check(units.length === 4 && units[3].id === "range" && units[3].t === WORDS[lang].range, `${tag} the dialog's fourth choice is Range (${units.map((u) => u.t).join(" · ")})`);
  await page.click('[data-bm-pop-unit="range"]');
  const f = await page.evaluate(() => ({ from: document.querySelector("[data-bm-pop-range-from]")?.value, to: document.querySelector("[data-bm-pop-range-to]")?.value, name: document.querySelector("[data-bm-pop-name]")?.value }));
  const wantName = `${surahName} ${dg(lang, 1)}–${dg(lang, 7)}`;
  check(f.from === "1" && f.to === "7" && f.name === wantName, `${tag} it runs from the āyah on screen to the end of its ruku', named "${wantName}"`, JSON.stringify(f));

  // Refused in words: reversed, then past the surah's last āyah.
  await page.fill("[data-bm-pop-range-from]", "7"); await page.fill("[data-bm-pop-range-to]", "3");
  await page.click("[data-bm-pop-save]");
  const e1 = await page.evaluate(() => ({ open: !!document.querySelector(".bm-popover-overlay"), msg: document.querySelector("[data-bm-pop-range-error]")?.textContent.trim() }));
  check(e1.open && e1.msg === WORDS[lang].order, `${tag} a reversed range is refused in words, the dialog stays open`, JSON.stringify(e1));
  await page.fill("[data-bm-pop-range-from]", "280"); await page.fill("[data-bm-pop-range-to]", "300");
  await page.click("[data-bm-pop-save]");
  const e2 = await page.evaluate(() => ({ open: !!document.querySelector(".bm-popover-overlay"), msg: document.querySelector("[data-bm-pop-range-error]")?.textContent.trim() }));
  check(e2.open && e2.msg === WORDS[lang].max, `${tag} a range past the surah's end is refused in words`, JSON.stringify(e2));

  // Saved: 2:255-257.
  await page.fill("[data-bm-pop-range-from]", "255"); await page.fill("[data-bm-pop-range-to]", "257");
  const name = await page.evaluate(() => document.querySelector("[data-bm-pop-name]").value);
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.click("[data-bm-pop-save]");
  await page.waitForTimeout(1200);
  const w = await page.evaluate(() => (window.__stubWriteData ?? []).map((x) => ({ col: x.col, id: x.id, saved: x.data?.saved })).filter((x) => /bookmark/i.test(x.col ?? "")));
  const all = w.flatMap((x) => (Array.isArray(x.saved) ? x.saved : []));
  const bm = all.find((b) => b.position === "range:2:255-257");
  const s = bm?.settings ?? {};
  check(name === `${surahName} ${dg(lang, 255)}–${dg(lang, 257)}` && !!bm && bm.name === name, `${tag} saved by its name "${name}" at position range:2:255-257`, JSON.stringify(w).slice(0, 300));
  check(!!bm && s.unitType === "range" && s.surahNum === 2 && s.ayahNum === 255 && s.rangeFrom === 255 && s.rangeTo === 257 && bm.moduleId === "quranrevival" && bm.subjectId === "quran",
    `${tag} ...in the bookmarks document, shaped as the others, with MMSA's Range settings`, JSON.stringify({ settings: s, moduleId: bm?.moduleId, doc: w[0]?.id }));
  const others = all.filter((b) => b.position !== "range:2:255-257");
  check(others.every((b) => typeof b.position === "string" && !b.position.startsWith("range:")), `${tag} nothing else saved as a range (${others.length} other bookmarks unchanged)`);
  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

async function opening(width) {
  for (const withSettings of [true, false]) {
    const tag = `@${width} a range bookmark ${withSettings ? "with its settings" : "with only its position"}`;
    const RB = { id: "bmR", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Al-Baqarah 255–257", position: "range:2:255-257", folderId: null, removed: false, createdAt: "2026-10-16T05:00:00.000Z",
      ...(withSettings ? { settings: { unitType: "range", surahNum: 2, ayahNum: 255, rangeFrom: 255, rangeTo: 257, tajweedOn: false, wbwOn: false, rootsOn: false, mushafOn: false } } : {}) };
    const ctx = await context(width, "en", `DATA.bookmarks[0].saved.push(${JSON.stringify(RB)});`);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/app/quranrevival.html?bookmark=bmR`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const end = await page.evaluate(() => ({ surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value, unit: document.getElementById("unitTypeSelect")?.value }));
    check(end.surah === "2" && end.ayah === "255" && end.unit === "range", `${tag} opens at Al-Baqarah 255, as the Range unit`, JSON.stringify(end));
    check(errors.length === 0, `${tag}: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    await ctx.close();
  }
}
