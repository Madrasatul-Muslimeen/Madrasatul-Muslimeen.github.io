// The Word card reads a word's lemma-wide progress from the word's OWN surah, never from whatever surah is open by
// the time its reads come back (found 23 Oct 2026: audit-part15's intermittent page error, "read lemma-wide word
// progress ... A valid, bounded Surah ayah range is required"). Reproduced 3/3 on main: Asma's cited word 3:173:17
// opens the card (surah 3 loads), the reader moves to surah 1 while the card's reads are still in flight, and the
// card then asked surah 1 for āyah 173 -- a failed read shown to the reader. A stub latency of 300ms keeps the reads
// in flight; en and bn at 390 and 1280. Run from the repository root, with `node serve.js` running.
//   --mutate=open-surah   after its reads, the card asks the OPEN surah again (the old two lines, routed; app/ is
//                         untouched) -> fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const FIX = "occurrenceIdsForAyah(wordSurahData, ref.ayah);\n          await primeLemmaProgressForOccurrenceScope(wordSurahData,";
const OLD = "occurrenceIdsForAyah(currentSurahData, ref.ayah);\n          await primeLemmaProgressForOccurrenceScope(currentSurahData,";
if (MUTATE && MUTATE !== "open-surah") throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  const ctx = await newContext(browser, { banner: false, appLang: lang, viewport: { width, height: 844 }, latencyMs: 300 });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const html = fs.readFileSync("app/quranrevival.html", "utf8");
    if (html.split(FIX).length !== 2) throw new Error("mutation anchor for open-surah not found exactly once");
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html.replace(FIX, OLD) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => page.evaluate(f, a);
  const tap = (s) => ev((s) => { const e = document.querySelector(s); if (!e) throw new Error(`no ${s}`); e.click(); }, s);
  const step = async (what, p) => { try { await p; return true; } catch (e) { check(`${tag}: ${what} (timed out)`, false, String(e).slice(0, 160)); return false; } };
  await page.waitForTimeout(2500);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await tap("#tabExploreBtn"); await page.waitForTimeout(600);
  await tap("#explorePaletteAsmaBtn");
  if (!await step("Asma opens in Explore", page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 20000 }))) { await ctx.close(); continue; }
  await ev(() => { const s = document.getElementById("asmaXSingleSelect"); s.value = "52"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  if (!await step("Al-Wakil's cited āyāt", page.waitForFunction(() => document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]").length === 2, null, { timeout: 20000 }))) { await ctx.close(); continue; }
  await tap('[data-asmax-cited-word="3:173:17"]');
  const opened = await step("the Word card opens", page.waitForFunction(() => { const m = document.getElementById("quranWordCardMount"); return m && !m.hidden && m.textContent.includes("ٱلْوَكِيلُ"); }, null, { timeout: 20000 }));
  const surahThen = await ev(() => document.getElementById("surahSelect")?.value);
  check(`${tag}: POSITIVE CONTROL the cited word opens its Word card with surah 3 open`, opened && surahThen === "3", `surah ${surahThen}`);
  // The reader moves on at once, while the card's reads are still in flight.
  await ev(() => { const s = document.getElementById("surahSelect"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(4000);
  const bad = errors.filter((e) => /bounded Surah ayah range|lemma-wide word progress/.test(e));
  const shown = await ev(() => document.body.innerText.match(/lemma-wide word progress[^\n]*/)?.[0] ?? null);
  check(`${tag}: moving to another surah while the Word card is still reading raises no failed read (console)`, bad.length === 0, bad.slice(0, 1).join(" ").slice(0, 200));
  check(`${tag}: ...and no failed-read message reaches the screen`, shown === null, shown ?? "");
  const now = await ev(() => document.getElementById("surahSelect")?.value);
  check(`${tag}: the reader really is on surah 1 now (control)`, now === "1", `surah ${now}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
