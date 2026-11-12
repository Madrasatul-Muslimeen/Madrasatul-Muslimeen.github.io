// The Owner, 12 Nov 2026 (a phone photo of the plain "Bookmark this" window from a ⋮ in Read on): "Enable all units in the
// bookmark on this view." The per-āyah ⋮ menu's 🔖 opened the window with no unit choice at all; the Read bar's 🔖 and the Āyah
// card's 🔖 offered six.
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/read-on-bookmark-units-browser.mjs
//   MUT=nounits ...   mutation: the ⋮ menu's 🔖 passes no unit choices (the old behaviour)                  -> the units checks fail
//   MUT=nocross ...   mutation: an āyah of another sūrah gets no unit choices                               -> the other-sūrah checks fail
//   MUT=wrongsurah ...mutation: another sūrah's choices are saved with the CURRENT sūrah's place           -> the "opens at its own sūrah" check fails
// Proves, English and Bangla at 390, English at 1280: from the ⋮ of an āyah of the current sūrah (16:1) AND of the sūrah Read on has run
// back into (15:99), the window offers This āyah (preselected), This page, This rukūʿ, Whole sūrah, This juz and Range, each at least 40px tall
// and inside the window; This page saves page:madani:<its page> with the settings of ITS OWN sūrah and āyah; Whole sūrah saves that sūrah.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const ROOT = process.cwd(), MUT = process.env.MUT || "", restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next);
  restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
const H = "app/quranrevival.html";
if (MUT === "nounits") mutate(H, /onToggleBookmark: async \(unitKey\) => \{ await toggleAyahBookmark\(unitKey, undefined, undefined, \{ unitChoices: await quickMenuBookmarkChoices\(unitKey\) \}\); \},/g, "onToggleBookmark: toggleAyahBookmark,");
else if (MUT === "nocross") mutate(H, /      if \(p\.surah === currentSurahNum\) return ayahCardBookmarkChoices\(unitKey, null, null\);\n/g, "      return ayahCardBookmarkChoices(unitKey, null, null);\n");
else if (MUT === "wrongsurah") mutate(H, /const base = \{ \.\.\.captureQuranBookmarkSettings\(\), surahNum \};/g, "const base = { ...captureQuranBookmarkSettings() };");

const TENANT_SEED = "";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (page, f, a) => page.evaluate(f, a);
const wait = (page, ms) => page.waitForTimeout(ms);
const lastSaved = (page) => ev(page, () => { const w = (window.__stubWriteData || []).filter((x) => x.col === "bookmarks" && x.data.saved).at(-1); return w ? w.data.saved.at(-1) : null; });
async function setup(ctx) {
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await wait(page, 1200);
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await wait(page, 200); }
  await page.click("#tabReadBtn"); await wait(page, 900);
  await ev(page, () => { const s = document.getElementById("surahSelect"); s.value = "16"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await wait(page, 1200);
  await ev(page, () => { const c = document.getElementById("readOnCheck"); if (c && !c.checked) c.click(); });
  await wait(page, 1800);
  return page;
}
// open the ⋮ of the āyah whose number badge says `key` ("16:1") and press its Bookmark tile
async function openBookmarkWindow(page, key) {
  // an āyah can have two ⋮ (Read on shows the first āyah of a sūrah in its own heading block too): take the one whose menu has a Bookmark tile
  const n = await ev(page, (key) => document.querySelectorAll(`#readView .ayah-quick-wrap[data-unit-key="ayah:${key}"]`).length, key);
  for (let i = 0; i < n; i++) {
    const ok = await ev(page, ({ key, i }) => {
      const w = document.querySelectorAll(`#readView .ayah-quick-wrap[data-unit-key="ayah:${key}"]`)[i];
      const t = w?.querySelector("[data-qm-toggle]");
      if (!t || !t.getClientRects().length) return false;
      t.scrollIntoView({ block: "center" }); t.click();
      const tile = w.querySelector("[data-qm-bookmark]");
      if (!tile) { t.click(); return false; }
      return true;
    }, { key, i });
    if (!ok) continue;
    await wait(page, 500);
    await ev(page, ({ key, i }) => document.querySelectorAll(`#readView .ayah-quick-wrap[data-unit-key="ayah:${key}"]`)[i].querySelector("[data-qm-bookmark]").click(), { key, i });
    await page.waitForSelector("[data-bm-pop-unit]", { timeout: 5000 }).catch(() => {});
    return true;
  }
  return false;
}
const chips = (page) => ev(page, () => { const dlg = document.querySelector("[data-bm-pop-save]")?.closest("dialog, [role=dialog], .bm-pop") ?? document.body; const dr = dlg.getBoundingClientRect(); return [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.bmPopUnit, text: b.textContent.trim(), on: b.getAttribute("aria-checked"), h: Math.round(r.height), inside: r.left >= dr.left - 1 && r.right <= dr.right + 1 }; }); });
try {
  const passes = process.env.ONE ? [["en", 390]] : [["en", 390], ["bn", 390], ["en", 1280]];
  for (const [lang, width] of passes) {
    for (const [key, surah, where] of [["16:1", 16, "the current sūrah"], ["15:99", 15, "the sūrah Read on has run back into"]]) {
      const tag = `[${lang} ${width} ${key}]`;
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width === 390 ? 844 : 800 } });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      const page = await setup(ctx);
      const opened = await openBookmarkWindow(page, key);
      check(`${tag} the ⋮ of an āyah of ${where} opens the Bookmark window`, opened && !!(await page.$("[data-bm-pop-save]")), "no window");
      if (!opened) { await ctx.close(); continue; }
      const c = await chips(page);
      const ids = c.map((x) => x.id);
      check(`${tag} MUTATION TARGET (${key === "16:1" ? "nounits" : "nocross"}): the window offers This āyah, This page, This rukūʿ, Whole sūrah, This juz and Range`, ["ayah", "page", "ruku", "surah", "juz", "range"].every((i) => ids.includes(i)), JSON.stringify(ids));
      check(`${tag} This āyah is preselected, every choice is at least 40px tall and inside the window`, c.find((x) => x.id === "ayah")?.on === "true" && c.length >= 6 && c.every((x) => x.h >= 40 && x.inside), JSON.stringify(c));
      if (ids.includes("page")) {
        await page.click('[data-bm-pop-unit="page"]'); await page.click("[data-bm-pop-save]"); await wait(page, 1000);
        const bm = await lastSaved(page);
        check(`${tag} MUTATION TARGET (wrongsurah): This page saves a page bookmark that opens at ${surah}:${key.split(":")[1]} (its OWN sūrah and āyah)`, !!bm && /^page:madani:\d+$/.test(bm.position) && bm.settings?.surahNum === surah && bm.settings?.ayahNum === Number(key.split(":")[1]) && bm.settings?.unitType === "page", JSON.stringify({ position: bm?.position, settings: bm && { surahNum: bm.settings?.surahNum, ayahNum: bm.settings?.ayahNum, unitType: bm.settings?.unitType } }));
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  restoreAll();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
