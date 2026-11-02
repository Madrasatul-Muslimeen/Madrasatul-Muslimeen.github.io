// The Owner, 2 Nov 2026 (a screenshot, Mushaf page 1): "Clicking on the 'Tajweed Color' pops up this page sometimes, and the
// corner's cross button doesn't work to take it back." Two causes, measured:
//   1. The surah banner's glyph is drawn at 30cqw in a 14.26cqw button with overflow visible, so the button's invisible line
//      box reached above it and took the taps meant for the page's "Tajweed colours" switch (page 1's header sits just above
//      Al-Fātiḥah's banner), opening the Whole Surah card. Now the banner is clipped to its box (+4px for the focus ring).
//   2. unit-card.js wired only the FIRST [data-unit-card-close] (← Back); the corner × never closed the Unit card.
//   node tools/i18n-verify/qr-mushaf-tajweed-tap-unit-close-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE, repo root)
//   no-clip     the banner is not clipped        -> "the Tajweed switch takes the tap" and "above the banner" FAIL
//   first-only  only the first close is wired    -> "the corner × closes the Unit card" FAILS
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-clip": ["app/quranrevival.html", "  .hifz-surah-header.glyph-loaded { clip-path: inset(-4px); }", ""],
  "first-only": ["app/js/unit-card.js", 'card.querySelectorAll("[data-unit-card-close]").forEach((b) => b.addEventListener("click", () => callbacks.onClose?.()));',
    'card.querySelector("[data-unit-card-close]")?.addEventListener("click", () => callbacks.onClose?.());'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(w, h, lang, surah) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (src.split(a).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(1200);
  if (surah !== "1") { await page.evaluate((s) => { const ss = document.getElementById("surahSelect"); ss.value = s; ss.dispatchEvent(new Event("change", { bubbles: true })); }, surah); await page.waitForTimeout(1500); }
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelector(".hifz-surah-header.glyph-loaded") && document.querySelector(".hifz-tajweed-toggle"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const cardOpen = (page) => page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") && !!document.querySelector("#ayahActionSheetMount [data-unit-card-close]"));
const geo = (page) => page.evaluate(() => {
  const lab = document.querySelector(".hifz-page .hifz-tajweed-toggle"), ban = document.querySelector(".hifz-page .hifz-surah-header.glyph-loaded");
  if (!lab || !ban) return null;
  lab.scrollIntoView({ block: "center" });
  const l = lab.getBoundingClientRect(), b = ban.getBoundingClientRect();
  // Is the switch what a finger meets, at its middle and along its lower edge?
  const pts = [[l.left + l.width / 2, l.top + l.height / 2], [l.left + 6, l.bottom - 3], [l.right - 6, l.bottom - 3]];
  const own = pts.filter(([x, y]) => lab.contains(document.elementFromPoint(x, y))).length;
  // Just above the banner (5-20px), across its width: nothing of the banner.
  let above = 0, tot = 0;
  for (let x = b.left + 10; x < b.right - 10; x += 25) for (const dy of [6, 12, 20]) { tot++; if (ban.contains(document.elementFromPoint(x, b.top - dy))) above++; }
  return { own, pts: pts.length, above, tot, cx: l.left + l.width / 2, cy: l.top + l.height / 2, gap: Math.round(b.top - l.bottom), checked: lab.querySelector("input").checked, disabled: lab.classList.contains("is-disabled") };
});

for (const [w, h] of [[1283, 869], [390, 844], [768, 1024], [320, 640]]) for (const lang of ["en", "bn"]) for (const surah of ["1", "2"]) {
  const tag = `[${lang} ${w}x${h} Mushaf, surah ${surah}'s first page]`;
  const { ctx, page, errors } = await open(w, h, lang, surah);
  const g = await geo(page);
  check(`${tag} POSITIVE CONTROL the page header's Tajweed switch and the surah banner are drawn`, !!g && !g.disabled, JSON.stringify(g));
  if (!g) { await ctx.close(); continue; }
  check(`${tag} the Tajweed switch is what a finger meets (its middle and lower edge)`, g.own === g.pts, JSON.stringify(g));
  check(`${tag} nothing of the banner lies above its own box (${g.tot} points 6-20px above)`, g.above === 0, JSON.stringify(g));
  // A real tap on the switch: it turns on, and no Unit card opens.
  const before = g.checked;
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(1500);
  const after = await page.evaluate(() => document.querySelector(".hifz-page .hifz-tajweed-toggle input")?.checked);
  check(`${tag} tapping "Tajweed colours" turns it ${before ? "off" : "on"} and opens no Unit card`, after === !before && !(await cardOpen(page)), JSON.stringify({ before, after, card: await cardOpen(page) }));
  // The banner itself still opens the Whole Surah card, and the corner × closes it (and ← Back too).
  for (const which of ["corner ×", "← Back"]) {
    await page.evaluate(() => { const b = document.querySelector(".hifz-page .hifz-surah-header.glyph-loaded"); b.scrollIntoView({ block: "center" }); });
    const c = await page.evaluate(() => { const r = document.querySelector(".hifz-page .hifz-surah-header.glyph-loaded").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.click(c[0], c[1]); await page.waitForTimeout(1200);
    const opened = await cardOpen(page);
    check(`${tag} (${which}) POSITIVE CONTROL tapping the surah banner opens the Whole Surah card`, opened);
    const sel = which === "corner ×" ? "#ayahActionSheetMount .ayah-sheet-close[data-unit-card-close]" : "#ayahActionSheetMount [data-unit-card-homeback]";
    const xy = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
    if (opened && xy) { await page.mouse.click(xy[0], xy[1]); await page.waitForTimeout(800); }
    check(`${tag} the ${which} closes the Unit card`, opened && !!xy && !(await cardOpen(page)), JSON.stringify({ opened, xy, stillOpen: await cardOpen(page) }));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Mushaf Tajweed switch and the Unit card's × (the Owner, 2 Nov 2026)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
