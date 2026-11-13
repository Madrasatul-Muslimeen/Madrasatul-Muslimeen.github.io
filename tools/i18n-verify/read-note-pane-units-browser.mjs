// The Owner, 13 Nov 2026 (the empty place after the Notes / Track tabs of the Notes pane circled): "Enable all Study units picker here."
// The pane's tab row carries the Read bar's own Study Unit picker (all seven units); choosing one moves the pane to that unit.
//   --mutate=nopicker ... the page hands the pane no unit choices -> the picker checks fail by name.
// Run from the repository root with serve.js up:  node tools/i18n-verify/read-note-pane-units-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { legacyTools: true, appLang: lang, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE === "nopicker") await ctx.route("**/app/quranrevival.html*", async (r) => {
    const src = fs.readFileSync("app/quranrevival.html", "utf8"), a = "      unitChoices: () =>";
    if (!src.includes(a)) throw new Error("mutation anchor missing");
    await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.replace(a, "      unitChoicesOff: () =>") });
  });
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(800);
  await P.evaluate(() => document.getElementById("readNotesBtn").click());
  await P.waitForFunction(() => { const p = document.getElementById("readNotePane"); return p && !p.hidden; }, null, { timeout: 8000 }).catch(() => {});
  await P.evaluate(() => document.querySelector('[data-rnp-tab="track"]')?.click());
  await P.waitForTimeout(500);
  const sel = async () => P.evaluate(() => { const s = document.querySelector("[data-rnp-unit-select]"); const r = s?.getBoundingClientRect(); const tab = document.querySelector('[data-rnp-tab="track"]').getBoundingClientRect(); return s ? { values: [...s.options].map((o) => o.value), value: s.value, h: Math.round(r.height), shown: r.width > 0, inside: r.right <= innerWidth + 0.5 && r.left >= 0, sameRow: Math.abs(r.top - tab.top) < 12 || r.top < tab.bottom, title: document.querySelector("#readNotePane [data-rnp-title], #readNotePane .rnp-title")?.textContent ?? document.getElementById("readNotePane").getAttribute("aria-label") } : null; });
  const a = await sel();
  check(`${tag} MUTATION TARGET (nopicker): the pane's tab row holds the Study Unit picker with all seven units`, !!a && a.values.join() === "ayah,range,surah,ruku,juz,hizb,page" && a.shown, JSON.stringify(a));
  if (a) {
    check(`${tag} it is at least 40px tall, inside the screen, and the pane's unit (ayah) is selected`, a.h >= 40 && a.inside && a.value === "ayah", JSON.stringify(a));
    for (const [type, want] of [["juz", /juz|জুয/i], ["surah", /Whole Surah|পূর্ণ সূরা|সূরা/i], ["page", /Page|পৃষ্ঠা/i]]) {
      await P.selectOption("[data-rnp-unit-select]", type); await P.waitForTimeout(700);
      const b = await sel();
      check(`${tag} choosing ${type} moves the pane to that unit (picker follows, pane named for it)`, b.value === type && want.test(b.title), JSON.stringify(b));
    }
    await P.selectOption("[data-rnp-unit-select]", "ayah"); await P.waitForTimeout(600);
    check(`${tag} choosing Single Ayah comes back to 2:256`, /256|২৫৬/.test((await sel()).title), JSON.stringify(await sel()));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Notes pane Study Unit picker: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
