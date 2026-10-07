// The Owner, 7 Oct 2026: a screenshot of At-Takwir's page with the gaps around the Surah banner circled, then
// "Page gap: go ahead" on the demo docs/reference/2026-10-07-page-gaps-demo.html. Every line of a Mushaf page is now
// ONE text line tall, as in the printed 15-line Mushaf: the banner's line and the Bismillah's line are the same
// height as a line of text, with the banner still edge to edge (28 Sep) and centred in its line.
// The page is drawn by the app's own renderer (app/js/hifz-renderer.js) inside the real page, with the repository's
// own layout data and banner font. The per-page Qur'an fonts come from an outside site the sandbox cannot reach; the
// line heights are set by the page's CSS, not by those fonts, so they are measured without them.
// Run from the repository root with serve.js on :8080.
//   --mutate=old-banner  the banner's line goes back to its own height -> the banner checks fail
//   --mutate=old-bism    the Bismillah's line goes back                -> the Bismillah checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let body = null;
if (MUTATE) {
  body = fs.readFileSync("app/quranrevival.html", "utf8");
  const swap = (a, b) => { const n = body.split(a).length - 1; if (!n) throw new Error(`mutation anchor missing: ${a.slice(0, 70)}`); console.log(`(mutation ${MUTATE}: ${n} replaced)`); body = body.split(a).join(b); };
  if (MUTATE === "old-banner") swap("  .hifz-surah-header.glyph-loaded { height: 14.26cqw; padding: 0; line-height: 1; align-items: center; overflow: visible; }\n", "");
  else if (MUTATE === "old-bism") swap("  .hifz-basmallah { height: 14.26cqw; padding: 0; line-height: 1; align-items: center; font-size: 5.6cqw; }\n", "");
  else throw new Error(`unknown mutation ${MUTATE}`);
}
const local = (file, type) => (r) => r.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file), headers: { "access-control-allow-origin": "*" } });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const width of [390, 820, 1280]) for (const [pageNum, label] of [[586, "At-Takwir"], [2, "Al-Baqarah"]]) {
  const tag = `${width}px p${pageNum}`;
  console.log(`\n=== ${tag} (${label}) ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 1300 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/verses.quran.foundation/**", (r) => r.abort());
  await ctx.route("**/raw.githubusercontent.com/**/mushaf-madani-v2.json", local("mushaf/mushaf-madani-v2.json", "application/json"));
  await ctx.route("**/raw.githubusercontent.com/**/QCF_SurahHeader_COLOR-Regular.woff2", local("mushaf/QCF_SurahHeader_COLOR-Regular.woff2", "font/woff2"));
  if (body) await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const m = await page.evaluate(async (pageNum) => {
    document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove());
    const r = await import("/app/js/hifz-renderer.js");
    await r.ensureMushafData();
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;inset:0;z-index:99999;background:#fff;overflow:auto;padding:12px 8px";
    document.body.appendChild(host);
    const headerOk = await r.loadSurahHeaderFont();
    await r.renderMushafPages(host, [pageNum], null, () => "سورة", {});
    await new Promise((res) => setTimeout(res, 600));
    const pageEl = host.querySelector(".hifz-page");
    const rect = (e) => e.getBoundingClientRect();
    const lines = [...host.querySelectorAll(".hifz-line")];
    const text = lines.filter((l) => !l.classList.contains("hifz-surah-header") && !l.classList.contains("hifz-basmallah")).map((l) => rect(l).height);
    const banner = host.querySelector(".hifz-surah-header"), bism = host.querySelector(".hifz-basmallah");
    const inner = pageEl ? rect(pageEl).width - parseFloat(getComputedStyle(pageEl).paddingLeft) - parseFloat(getComputedStyle(pageEl).paddingRight) : 0;
    // The banner's drawing: one glyph, measured as a text range so the measure is the glyph's own box, not its line's.
    let ink = null;
    if (banner) { const rg = document.createRange(); rg.selectNodeContents(banner); const b = rg.getBoundingClientRect(); ink = { w: b.width, mid: b.top + b.height / 2 }; }
    const bRect = banner ? rect(banner) : null, sRect = bism ? rect(bism) : null;
    // What is drawn just above the banner: the previous line must end where the banner's line starts (no extra band).
    const prev = banner?.previousElementSibling?.classList.contains("hifz-line") ? rect(banner.previousElementSibling) : null;
    return {
      headerOk: !!headerOk, glyph: !!banner?.classList.contains("glyph-loaded"),
      textH: text.length ? text.reduce((a, b) => a + b, 0) / text.length : 0, textMin: Math.min(...text), textMax: Math.max(...text),
      bannerH: bRect?.height ?? 0, bismH: sRect?.height ?? 0, inner, inkW: ink?.w ?? 0,
      inkOffset: ink && bRect ? Math.abs(ink.mid - (bRect.top + bRect.height / 2)) : null,
      gapAbove: prev && bRect ? bRect.top - prev.bottom : null, gapBelow: sRect && bRect ? sRect.top - bRect.bottom : null,
    };
  }, pageNum);
  check(`${tag}: the banner glyph font loaded (otherwise the banner is the plain-name fallback)`, m.headerOk && m.glyph, JSON.stringify(m));
  check(`${tag}: text lines are one even height (${m.textH.toFixed(1)}px)`, m.textMax - m.textMin <= 1.5, JSON.stringify({ min: m.textMin, max: m.textMax }));
  check(`${tag}: the banner's line is ONE text line tall (${m.bannerH.toFixed(1)}px vs ${m.textH.toFixed(1)}px)`, Math.abs(m.bannerH - m.textH) <= 1.5, JSON.stringify(m));
  check(`${tag}: the Bismillah's line is ONE text line tall (${m.bismH.toFixed(1)}px)`, Math.abs(m.bismH - m.textH) <= 1.5, JSON.stringify(m));
  check(`${tag}: the banner is still edge to edge (${Math.round((100 * m.inkW) / m.inner)}% of the text width, 28 Sep)`, m.inkW >= m.inner * 0.9, JSON.stringify({ inkW: m.inkW, inner: m.inner }));
  check(`${tag}: the banner is centred in its line (off by ${m.inkOffset?.toFixed(1)}px)`, m.inkOffset != null && m.inkOffset <= m.textH * 0.2, JSON.stringify(m));
  check(`${tag}: no extra band above or below the banner`, (m.gapAbove == null || Math.abs(m.gapAbove) <= 1.5) && (m.gapBelow == null || Math.abs(m.gapBelow) <= 1.5), JSON.stringify({ above: m.gapAbove, below: m.gapBelow }));
  if (width === 390 && pageNum === 586) { fs.mkdirSync("/tmp/even-lines", { recursive: true }); await page.screenshot({ path: "/tmp/even-lines/p586-390.png" }); }
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Mushaf page: every line one even height: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
