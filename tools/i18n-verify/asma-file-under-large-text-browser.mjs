// The Architect's note, 3 Nov 2026: at Bangla 200% text the "Not filed" choice was cut inside the File-under selects (measured
// 152px of text in 151px, on a 390px phone). Every File-under select must show its chosen text whole at 100% and 200%.
// Run from the repository root with serve.js on :8080 (QR_BASE for another port).
//   --mutate=old-padding   the selects and the group get their old side padding back -> the bn 360/390 200% checks fail
// Widths 360 to 1440, text 100/150/200% (the Architect's widening, 3 Nov 2026: bn/360/200% still cut at 134px of 152px).
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SEED = `
DATA.asmaCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, schemaVersion: 1,
  classifications: [
    { key: "group", title: { en: "Group", bn: "গ্রুপ" }, order: 10, status: "active" },
    { key: "dual", title: { en: "Dual Names", bn: "জোড়া নাম" }, order: 20, status: "active" },
    { key: "by-act", title: { en: "By Act" }, order: 30, status: "active" },
    { key: "by-essence", title: { en: "By Essence" }, order: 40, status: "active" } ],
  collections: [
    { id: "g1", title: { en: "Mercy" }, kind: "group", badge: "", order: 10, status: "active", items: ["name:1"] },
    { id: "d1", title: { en: "Al-Awwal wal-Akhir" }, kind: "dual", badge: "", order: 10, status: "active", items: [] },
    { id: "e1", title: { en: "His Essence" }, kind: "by-essence", badge: "", order: 10, status: "active", items: [] } ],
  extraNames: [], overrides: {}, overridesEn: {}, refOverrides: {} }];`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["bn", "en"]) for (const width of [360, 390, 768, 1024, 1440]) for (const pct of [100, 150, 200]) {
  const tag = `${lang}/${width}/${pct}%`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  if (MUTATE) {
    let body = fs.readFileSync("app/quranrevival.html", "utf8");
    const a = "#asmaXEditFileUnder select { padding-left: 0.3rem; padding-right: 0.3rem; }";
    const b = "padding: 0.5rem min(0.7rem, 8px) 0.7rem; margin: 0; display: flex;";
    if (MUTATE !== "old-padding" || !body.includes(a) || !body.includes(b)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    body = body.split(a).join("").split(b).join("padding: 0.5rem 0.7rem 0.7rem; margin: 0; display: flex;");
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  await page.click("#tabExploreBtn"); await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => !document.getElementById("asmaXPanel")?.hidden);
  await page.evaluate(() => document.getElementById("asmaXNewNameBtn").click());
  await page.waitForSelector("#asmaXEditFileUnder");
  // The probe carries the real select's computed font; 24px is the arrow's room.
  const r = await page.evaluate(() => [...document.querySelectorAll("#asmaXEditFileUnder select")].map((s) => { const cs = getComputedStyle(s); const o = s.options[s.selectedIndex]; const pr = document.createElement("span"); pr.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:" + cs.font; pr.textContent = o.textContent; document.body.appendChild(pr); const need = pr.getBoundingClientRect().width; pr.remove(); const avail = s.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24; return { k: s.dataset.asmaFileKind, need: Math.round(need), avail: Math.round(avail), w: s.getBoundingClientRect().width }; }));
  check(`${tag}: POSITIVE CONTROL the four File-under selects are measured`, r.length === 4 && r.every((x) => x.w > 0 && x.need > 0), JSON.stringify(r));
  check(`${tag}: every select shows its chosen text whole`, r.every((x) => x.need <= x.avail), JSON.stringify(r.filter((x) => x.need > x.avail)));
  await ctx.close();
}
await browser.close();
console.log(`\n==== File-under selects at 100/200% text: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
