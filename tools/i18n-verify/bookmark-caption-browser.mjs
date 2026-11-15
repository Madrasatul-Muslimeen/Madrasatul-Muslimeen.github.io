// The Owner, 15 Nov 2026 (QR Lead): Quran bookmark captions. Three examples, then "enable these ways of writing":
//   a range  "Al-Hadid - 57:1-6 - 12.Oct.26"     a page  "Al-Baqarah - 2:1-5 - Page 2 - 24.Oct.26"     a surah  "At-Taghaabun - 64:1-4 - 15.Nov.26"
// Part 1 pins the pure module (bookmark-caption.js) shape by shape; part 2 opens the real bookmark dialog in the Read view and reads the Name it
// offers for the range, the page and the whole sūrah (and the Range kind's own fields). Run from the repo root with serve.js on :8080 (or QR_BASE).
// Mutations (--mutate=NAME), each must exit 1:
//   nodate    the date is left off the caption               -> the "dd.Mon.yy" checks fail
//   nopage    "Page N" is left out of a page caption          -> the page checks fail
//   oldname   the dialog offers the old "Ayahs 1–4 of Surah 64" -> the dialog checks fail
//   norange   the Range kind keeps the old "Name 1–4"         -> the Range-fields check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import { bookmarkCaption, captionDate, captionForUnit } from "../../app/js/bookmark-caption.js";
import fs from "fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html";
const CAP = "app/js/bookmark-caption.js";
const MUT = {
  nodate: [CAP, "extra, captionDate(date)].filter", "extra].filter"],
  nopage: [HTML, 't("Page {n}", { n: num(Number(String(key).split(":").pop())) })', '""'],
  oldname: [HTML, "if (!capTables || !key ||", "if (true || !capTables || !key ||"],
  norange: [HTML, "captionOf: (from, to) => bookmarkCaption({ name: u.surahName, surah: u.surah, from, to }) }", "captionOf: undefined }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`)); };
const D = (y, m, d) => new Date(y, m - 1, d);
console.log("\n=== pure caption module ===");
check("a date is dd.Mon.yy", captionDate(D(2026, 10, 12)) === "12.Oct.26" && captionDate(D(2026, 11, 15)) === "15.Nov.26" && captionDate(D(2026, 9, 5)) === "05.Sep.26", captionDate(D(2026, 9, 5)));
check("a range: Al-Hadid - 57:1-6 - 12.Oct.26", bookmarkCaption({ name: "Al-Hadid", surah: 57, from: 1, to: 6, date: D(2026, 10, 12) }) === "Al-Hadid - 57:1-6 - 12.Oct.26");
check("a page: Al-Baqarah - 2:1-5 - Page 2 - 24.Oct.26", bookmarkCaption({ name: "Al-Baqarah", surah: 2, from: 1, to: 5, extra: "Page 2", date: D(2026, 10, 24) }) === "Al-Baqarah - 2:1-5 - Page 2 - 24.Oct.26");
check("a surah/range: At-Taghaabun - 64:1-4 - 15.Nov.26", bookmarkCaption({ name: "At-Taghaabun", surah: 64, from: 1, to: 4, date: D(2026, 11, 15) }) === "At-Taghaabun - 64:1-4 - 15.Nov.26");
check("one āyah has no dash: Al-Baqarah - 2:255 - 15.Nov.26", bookmarkCaption({ name: "Al-Baqarah", surah: 2, from: 255, date: D(2026, 11, 15) }) === "Al-Baqarah - 2:255 - 15.Nov.26");
const info = { fromSurah: 2, fromAyah: 1, toSurah: 2, toAyah: 5 };
check("a unit's caption names the surah it starts in", captionForUnit(info, { nameOf: () => "Al-Baqarah", extra: "Page 2", date: D(2026, 10, 24) }) === "Al-Baqarah - 2:1-5 - Page 2 - 24.Oct.26");
check("a page that runs into the next surah stops at the end of the first", captionForUnit({ fromSurah: 63, fromAyah: 9, toSurah: 64, toAyah: 4 }, { nameOf: () => "Al-Munafiqun", ayahCountOf: () => 11, extra: "Page 555", date: D(2026, 11, 15) }) === "Al-Munafiqun - 63:9-11 - Page 555 - 15.Nov.26");
check("an unresolved unit gives null (the caller keeps its old label)", captionForUnit(null) === null);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const today = captionDate(new Date());
for (const width of [390, 1280]) {
  console.log(`\n=== the bookmark dialog [${width}] ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const setSel = (id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel("surahSelect", "64"); await page.waitForTimeout(1500);
  await setSel("unitTypeSelect", "range"); await page.waitForTimeout(800);
  await setSel("rangeFromSelect", "1"); await page.waitForTimeout(300); await setSel("rangeToSelect", "4"); await page.waitForTimeout(800);
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelector(".hifz-page[data-mushaf-page]"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  for (let i = 0; i < 4 && (await page.evaluate(() => document.body.classList.contains("immersive-read"))); i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(500); }
  await page.click("#readQuickMenuSlot .ayah-quick-btn", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300);
  await page.click("#readQuickMenuSlot .quick-menu [data-qm-unit-bookmark]", { timeout: 4000 }).catch(() => {});
  await page.waitForSelector(".bm-popover-overlay", { timeout: 6000 }).catch(() => {});
  const name = () => page.evaluate(() => document.querySelector("[data-bm-pop-name]")?.value ?? null);
  const units = await page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => b.dataset.bmPopUnit));
  check(`${width}: the dialog offers units (precondition)`, units.length >= 3, JSON.stringify(units));
  const re = (mid) => new RegExp(`^.+ - ${mid} - ${today.replace(/\./g, "\\.")}$`);
  const first = await name();
  check(`${width}: the range unit's caption is "<Name> - 64:1-4 - ${today}"`, re("64:1-4").test(first ?? ""), String(first));
  await page.click('[data-bm-pop-unit="page"]').catch(() => {}); await page.waitForTimeout(250);
  const pg = await name();
  check(`${width}: This page's caption is "<Name> - 64:1-N - Page 556 - ${today}"`, new RegExp(`^.+ - 64:1-\\d+ - Page 556 - ${today.replace(/\./g, "\\.")}$`).test(pg ?? ""), String(pg));
  await page.click('[data-bm-pop-unit="surah"]').catch(() => {}); await page.waitForTimeout(250);
  const su = await name();
  check(`${width}: Whole sūrah's caption is "<Name> - 64:1-18 - ${today}"`, re("64:1-18").test(su ?? ""), String(su));
  await page.click('[data-bm-pop-unit="range"]').catch(() => {}); await page.waitForTimeout(250);
  const ra = await name();
  check(`${width}: the Range kind's Name follows its fields in the same way ("<Name> - 64:1-N - ${today}")`, new RegExp(`^.+ - 64:\\d+(-\\d+)? - ${today.replace(/\./g, "\\.")}$`).test(ra ?? ""), String(ra));
  await page.fill("[data-bm-pop-range-to]", "6").catch(() => {}); await page.waitForTimeout(250);
  const ra2 = await name();
  check(`${width}: changing the range's To changes the caption (64:1-6)`, re("64:1-6").test(ra2 ?? ""), String(ra2));
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== Bookmark captions${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
