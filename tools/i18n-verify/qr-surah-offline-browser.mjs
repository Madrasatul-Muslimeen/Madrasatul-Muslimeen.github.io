// QR Lead (with the MSA Architect, 23 Oct 2026; audit part 46, I15): offline, a reader picks a surah this device never
// kept. The note now comes from the Read path (quranrevival.html's loadSurah()), where the reader asked for it, so the
// generic one in quran-data.js (which also fired for background lookups) can go. And the pickers go back to the surah
// still on screen: before, the new surah's name sat over the previous surah's words.
// At 1280 and 390, en and bn, it fails unless, after choosing surah 114 from the Read bar with no network:
//   - the Read path's note ([data-read-path]) shows, names surah 114 in the page's language, and is a 40px+ target;
//   - Study options' and the Read bar's surah pickers are back on surah 1, the surah the page still shows.
//   node tools/i18n-verify/qr-surah-offline-browser.mjs [--mutate=no-note|no-revert]     (serve.js on :8080, or QR_BASE)
//   --mutate=no-note     the Read path says nothing        -> the note checks FAIL
//   --mutate=no-revert   the pickers keep the unread surah -> the picker checks FAIL
//   --mutate=no-loading  no "Loading…" on a slow line       -> the slow-line checks FAIL
// Also (audit part 46, "the Read view is an empty box ... no loading words"): on a slow line (surah 114 held 2.5 s),
// the Read view says "Loading…" (লোড হচ্ছে…) while it comes, then shows it.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-note": ["if (error instanceof TypeError) announceChosenSurahUnavailable(asked); // no network and no saved copy", "// (mutated)"],
  "no-revert": ["if (currentSurahData && currentSurahData.surahNumber !== asked) {", "if (false) {"],
  "no-loading": ["if (ayahPanels) ayahPanels.innerHTML = `<p class=\"read-loading\"", "if (false) ayahPanels.innerHTML = `<p class=\"read-loading\""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const [w, h] of [[1280, 900], [390, 844]]) for (const lang of ["en", "bn"]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1500);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(800);
  const s0 = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, read: document.getElementById("readSurahSelect").value }));
  check(`${tag} POSITIVE CONTROL: the Read view is on surah 1`, s0.surah === "1" && s0.read === "1", JSON.stringify(s0));
  await ctx.setOffline(true);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.evaluate(() => { const s = document.getElementById("readSurahSelect"); s.value = "114"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => !!document.getElementById("surahOfflineNotice"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const n = document.getElementById("surahOfflineNotice"), r = n?.getBoundingClientRect();
    return { note: !!n, readPath: !!n && n.hasAttribute("data-read-path"), text: n?.textContent ?? "", h: Math.round(r?.height ?? 0), onScreen: !!r && r.top >= 0 && r.bottom <= innerHeight,
      surah: document.getElementById("surahSelect").value, read: document.getElementById("readSurahSelect").value, wheel: document.getElementById("wheelUnitSurahSelect")?.value ?? null };
  });
  check(`${tag} the Read path says so ("${m.text.slice(0, 60)}…")`, m.note && m.readPath, JSON.stringify(m));
  check(`${tag} ...naming surah 114 in ${lang}, 40px+, on screen`, (lang === "bn" ? /১১৪/.test(m.text) && /[ঀ-৿]/.test(m.text.replace(/১১৪/, "")) : /114/.test(m.text) && /not saved/.test(m.text)) && m.h >= 40 && m.onScreen, JSON.stringify(m));
  check(`${tag} both surah pickers are back on surah 1, the surah still shown`, m.surah === "1" && m.read === "1" && (m.wheel === null || m.wheel === "1"), JSON.stringify({ surah: m.surah, read: m.read, wheel: m.wheel }));
  await ctx.setOffline(false);
  // Slow line: surah 114 held 2.5 s.
  await ctx.route("**/surahs/surah_114.json", async (r) => { await new Promise((res) => setTimeout(res, 2500)); await r.continue(); });
  await page.evaluate(() => document.getElementById("surahOfflineNotice")?.remove());
  await page.evaluate(() => { const s = document.getElementById("readSurahSelect"); s.value = "114"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(800);
  const mid = await page.evaluate(() => ({ text: document.getElementById("ayahPanels").innerText.trim().slice(0, 80) }));
  check(`${tag} slow line: while surah 114 comes, the Read view says so ("${mid.text}")`, (lang === "bn" ? /লোড/ : /Loading/).test(mid.text), JSON.stringify(mid));
  const came = await page.waitForFunction(() => document.getElementById("surahSelect").value === "114" && !document.querySelector("#ayahPanels .read-loading") && document.getElementById("ayahPanels").innerText.trim().length > 20, null, { timeout: 15000 }).then(() => true).catch(() => false);
  check(`${tag} slow line: then surah 114 shows, the "Loading…" gone`, came);
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR offline: an unsaved surah from the Read view${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
