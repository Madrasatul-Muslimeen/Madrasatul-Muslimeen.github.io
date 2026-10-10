// Asma ul Husna: the ways back the Owner asked for on 10 Oct 2026 (the way-back law, decision 86).
//   1. A Name's poster in Explore: "There should be a back button to go back to the wheel it came from."
//      -> a labelled "← Back to the wheel" above the poster; it returns to the wheel the Name was chosen from.
//   2. The full-size poster: "How to go back to where it came from?" -- its × was 15% white over the
//      description strip's cream, so it could not be seen. -> a solid bar first: "← Back to {Name}" and ×.
//   3. The same bar on asma-study.html's own full-size poster (it had the same faint ×).
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=nowheelback  the "← Back to the wheel" button is not rendered       -> check 1 fails
//   --mutate=faintx       the overlay's bar is gone (the old floating × only)     -> the bar checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nowheelback: ["quranrevival.html", '<button type="button" class="asmax-back-wheel" id="asmaXBackToWheelBtn">← ${escapeHtml(t("Back to the wheel"))}</button>', ""],
  faintx: ["quranrevival.html", '<div id="asmaXPosterBar"><button type="button" id="asmaXPosterBackBtn">← Back</button><button type="button" id="asmaXPosterCloseBtn" aria-label="Close poster">&times;</button></div>', '<button type="button" id="asmaXPosterCloseBtn" aria-label="Close poster">&times;</button><span id="asmaXPosterBackBtn"></span>'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const BN = /[ঀ-৿]/;

async function ctxFor(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width < 600 ? 844 : 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return ctx;
}

// Contrast of a foreground colour over a background colour (WCAG), both "rgb(a)" strings.
const CONTRAST = `(fg, bg) => {
  const p = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const a = L(p(fg)), b = L(p(bg)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}`;

for (const lang of ["en", "bn"]) {
  for (const width of [390, 768, 1300]) {
    const tag = `[${lang} ${width}]`;
    const ctx = await ctxFor(lang, width);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
    await page.click("#tabExploreBtn");
    await page.waitForTimeout(700);
    await page.click("#explorePaletteAsmaBtn");
    await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 }).catch(() => {});
    // From a group's wheel: choose the first group, then a Name on its wheel's list.
    const group = await page.evaluate(() => {
      const s = document.querySelector('select[data-asmax-class-select="group"]');
      const o = [...(s?.options ?? [])].find((x) => x.value && !x.value.startsWith("__"));
      if (!o) return null; s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); return o.value;
    });
    await page.waitForTimeout(600);
    const wheelBefore = await page.evaluate(() => document.querySelectorAll("#asmaXWheelContainer svg, #asmaXWheelContainer .wheel-seg, #asmaXWheelContainer path").length);
    await page.selectOption("#asmaXSingleSelect", "1");
    await page.waitForFunction(() => !!document.getElementById("asmaXPosterPanel"), null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const b = document.getElementById("asmaXBackToWheelBtn"), p = document.getElementById("asmaXPosterPanel");
      const r = b?.getBoundingClientRect(), pr = p?.getBoundingClientRect();
      return { has: !!b, text: b?.textContent.trim() ?? "", h: r ? Math.round(r.height) : 0, inView: !!r && r.top >= 0 && r.bottom <= innerHeight,
        above: !!r && !!pr && r.bottom <= pr.top + 1, posterInside: !!pr && pr.right <= document.getElementById("asmaXWheelContainer").getBoundingClientRect().right + 1,
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(`${tag} a Name's poster has "← Back to the wheel" above it, on screen, at least 40px high`, m.has && m.above && m.inView && m.h >= 40, JSON.stringify(m));
    check(`${tag} ...its words are ${lang === "bn" ? "Bangla" : "English"}`, lang === "bn" ? BN.test(m.text) && !/[A-Za-z]/.test(m.text) : m.text === "← Back to the wheel", m.text);
    check(`${tag} ...the poster still fits its space, no sideways scroll`, m.posterInside && m.over <= 0, JSON.stringify(m));
    if (width === 390 && lang === "bn" || width === 1300 && lang === "en") await page.screenshot({ path: `${SHOT_DIR}/asma-ways-back-${lang}-${width}.png` });

    // 2. The full-size poster's bar.
    await page.click("#asmaXPosterPanel").catch(() => {});
    await page.waitForTimeout(400);
    const f = await page.evaluate(`(() => {
      const contrast = ${CONTRAST};
      const bar = document.getElementById("asmaXPosterBar"), back = document.getElementById("asmaXPosterBackBtn"), x = document.getElementById("asmaXPosterCloseBtn");
      const strip = document.querySelector("#asmaXPosterMount .asma-desc-strip");
      const R = (e) => e?.getBoundingClientRect();
      const hit = (e) => { const r = R(e); if (!r || !r.width) return false; const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && (at === e || e.contains(at)); };
      const barBg = bar ? getComputedStyle(bar).backgroundColor : "rgba(0,0,0,0)";
      return { open: !!document.querySelector("#asmaXPosterOverlay.open .ahp-standalone"), bar: !!bar && R(bar).height > 0,
        backText: back?.textContent.trim() ?? "", backHit: hit(back), xHit: hit(x),
        xContrast: x && bar ? +contrast(getComputedStyle(x).color, barBg).toFixed(2) : 0,
        barAboveStrip: !!bar && !!strip && R(bar).bottom <= R(strip).top + 1, barTop: bar ? Math.round(R(bar).top) : -1,
        xLabel: x?.getAttribute("aria-label") ?? "" };
    })()`);
    check(`${tag} tapping the poster opens it full size, with a bar first`, f.open && f.bar && f.barTop <= 1, JSON.stringify(f));
    check(`${tag} ...the bar sits above the description strip; "← Back to {Name}" and × are both really tappable`, f.barAboveStrip && f.backHit && f.xHit, JSON.stringify(f));
    check(`${tag} ...× can be seen: at least 4.5:1 against the bar (it was 15% white over cream)`, f.xContrast >= 4.5, f.xContrast);
    check(`${tag} ...the way back names the Name, in ${lang === "bn" ? "Bangla" : "English"}; × has a translated name`,
      /^← /.test(f.backText) && f.backText.length > 6 && (lang === "bn" ? BN.test(f.backText) && BN.test(f.xLabel) : /^← Back to /.test(f.backText) && f.xLabel === "Close"), JSON.stringify(f));
    if (width === 390 && lang === "bn" || width === 1300 && lang === "en") await page.screenshot({ path: `${SHOT_DIR}/asma-poster-bar-${lang}-${width}.png` });
    await page.click("#asmaXPosterBackBtn").catch(() => {});
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ closed: !document.querySelector("#asmaXPosterOverlay.open"), stillOnName: !!document.getElementById("asmaXPosterPanel") }));
    check(`${tag} ..."← Back to {Name}" closes it, back on the Name exactly where the reader was`, after.closed && after.stillOnName, JSON.stringify(after));

    // 1 (cont.). Back to the wheel.
    await page.click("#asmaXBackToWheelBtn").catch(() => {});
    await page.waitForTimeout(500);
    const w = await page.evaluate((g) => ({ poster: !!document.getElementById("asmaXPosterPanel"),
      wheel: document.querySelectorAll("#asmaXWheelContainer svg, #asmaXWheelContainer .wheel-seg, #asmaXWheelContainer path").length,
      group: document.querySelector('select[data-asmax-class-select="group"]')?.value === g }), group);
    check(`${tag} "← Back to the wheel" returns to the wheel the Name came from (same group, its wheel drawn again)`, !w.poster && w.wheel > 0 && w.wheel === wheelBefore && w.group, JSON.stringify({ ...w, wheelBefore }));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

// 3. asma-study.html's own full-size poster.
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[asma-study ${lang} ${width}]`;
  const ctx = await ctxFor(lang, width);
  const { page } = await openPage(ctx, "/app/asma-study.html");
  await page.waitForSelector(".asma-card", { timeout: 15000 }).catch(() => {});
  await page.click('.asma-card[data-number="1"]').catch(() => {});
  await page.waitForSelector("#posterAsmaBtn", { timeout: 8000 }).catch(() => {});
  await page.click("#posterAsmaBtn").catch(() => {});
  await page.waitForTimeout(500);
  const s = await page.evaluate(`(() => {
    const contrast = ${CONTRAST};
    const bar = document.getElementById("posterBar"), back = document.getElementById("posterBackBtn"), x = document.getElementById("posterCloseBtn"), pr = document.getElementById("posterPrintBtn");
    const R = (e) => e?.getBoundingClientRect();
    const hit = (e) => { const r = R(e); if (!r || !r.width) return false; const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && (at === e || e.contains(at)); };
    return { open: !!document.querySelector("#posterOverlay.open"), bar: !!bar && R(bar).height > 0 && R(bar).top <= 1,
      back: back?.textContent.trim() ?? "", backHit: hit(back), xHit: hit(x), printHit: hit(pr),
      xContrast: x && bar ? +contrast(getComputedStyle(x).color, getComputedStyle(bar).backgroundColor).toFixed(2) : 0,
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  })()`);
  check(`${tag} the full-size poster opens with its bar first: ← Back to {Name}, 🖨 Print and × all tappable, × readable`,
    s.open && s.bar && /^← /.test(s.back) && s.backHit && s.xHit && s.printHit && s.xContrast >= 4.5 && s.over <= 0 && (lang === "bn" ? BN.test(s.back) : /^← Back to /.test(s.back)), JSON.stringify(s));
  await page.click("#posterBackBtn").catch(() => {});
  await page.waitForTimeout(250);
  check(`${tag} ...← Back closes it`, await page.evaluate(() => !document.querySelector("#posterOverlay.open")));
  await ctx.close();
}

console.log(`\n==== Asma ul Husna ways back (10 Oct 2026): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
