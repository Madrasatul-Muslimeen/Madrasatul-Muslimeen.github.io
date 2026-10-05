// The Owner, 5 Oct 2026: "As progress claim for Family members can be set here [the Track card's 👥], it is not set
// in other places of 'Record Your Progress'. Check and fix wherever progress is recorded."
// The "This page" card and the Unit Card (and the Ayah Card and end-of-unit prompt, which share the same picker and
// write) carry 👥 under "✅ Record Your Progress". Ticking Maryam too writes the claim for BOTH (read back from the
// stub's records writes); unticking Ahsan writes for Maryam only and leaves Ahsan's card as it was. Expected values
// are written by hand from the fixture (p1 Ahsan, p2 Maryam). en/bn at 390 and 1100.
//   --mutate=self-only   claimApproachStatus writes only for the Student again -> the two-person checks fail
//   --mutate=no-picker   the picker is never mounted                           -> the picker checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_3", tenantId: TENANT_ID, personId: "p1", entries: {} },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", entries: {} },
  { _id: TENANT_ID + "__p2__surah_3", tenantId: TENANT_ID, personId: "p2", entries: {} },
  { _id: TENANT_ID + "__p2__subject_quran", tenantId: TENANT_ID, personId: "p2", entries: {} }
);`;
const NAMES = { en: ["Ahsan", "Maryam"], bn: ["আহসান", "মারইয়াম"] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [390, 1100]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 844 }, extraSeedJs: SEED });
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ "50": [{ type: "ayah", words: [{ g: "Ⓦ", loc: "3:55:1" }, { g: "Ⓜ", loc: "3:55:2" }] }] }) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.abort("failed"));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    let body = fs.readFileSync("app/quranrevival.html", "utf8");
    const swap = (a, b) => { if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a.slice(0, 60)}`); body = body.split(a).join(b); };
    if (MUTATE === "self-only") swap("      const targets = claimTargetIds();\n", "      const targets = [selectedPersonId];\n");
    else if (MUTATE === "no-picker") swap('      const html = renderAssignDropdown(assignableRoster(), claimTargetIds());\n      if (!anchor || !html) return;', "      return;");
    else throw new Error(`unknown mutation ${MUTATE}`);
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; }))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(500);
  await ev(() => { const s = document.getElementById("surahSelect"); s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await P.waitForTimeout(2000);
  await ev(() => { const s = document.getElementById("unitTypeSelect"); s.value = "surah"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await P.waitForTimeout(1000);
  await ev(() => { const m = document.getElementById("mushafToggle"); if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } }); await P.waitForTimeout(800);
  await P.waitForFunction(() => Number.isFinite(Number(document.getElementById("mushafPageRef")?.dataset.page)), null, { timeout: 15000 }).catch(() => {});
  await P.click("#readBarRecordBtn");
  await P.waitForFunction(() => !!document.querySelector("#pageApproachSelect"), null, { timeout: 8000 }).catch(() => {});
  const picker = await ev(() => { const t = document.querySelector("[data-gac-record-title]"), r = document.querySelector("[data-claim-for]"); const b = r?.querySelector("[data-assign-trigger]")?.getBoundingClientRect(); return r ? { after: t?.nextElementSibling === r && t.parentElement.classList.contains("claim-for-line"), label: r.querySelector("[data-assign-trigger-label]")?.textContent, h: b?.height ?? 0, inside: !!b && b.left >= 0 && b.right <= innerWidth, rows: [...r.querySelectorAll("[data-assign-list] input")].map((i) => [i.value, i.checked]) } : null; });
  check(`${tag}: "This page" card: 👥 sits beside "Record Your Progress", on its line`, !!picker?.after, JSON.stringify(picker));
  check(`${tag}: ...naming the Student (${NAMES[lang][0]}), only them ticked`, picker?.label === NAMES[lang][0] && JSON.stringify(picker?.rows) === JSON.stringify([["p1", true], ["p2", false]]), JSON.stringify(picker));
  check(`${tag}: ...a 40px tap target inside the screen`, (picker?.h ?? 0) >= 40 && !!picker?.inside, JSON.stringify(picker));
  // tick Maryam too
  await P.click("[data-claim-for] [data-assign-trigger]");
  await P.waitForTimeout(150);
  check(`${tag}: the list opens and is inside the screen`, await ev(() => { const p = document.querySelector("[data-claim-for] [data-assign-popover]"); const r = p?.getBoundingClientRect(); return !!r && getComputedStyle(p).display !== "none" && r.left >= 0 && r.right <= innerWidth + 1; }));
  await P.click('[data-claim-for] [data-assign-list] input[value="p2"]');
  check(`${tag}: two ticked: the chip shows 2`, (await P.textContent("[data-claim-for] [data-assign-trigger-label]")) === (lang === "bn" ? "২" : "2"));
  await P.click("[data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(100); // close the list again
  await P.selectOption("#pageApproachSelect", "recite"); await P.waitForTimeout(500);
  let n = await ev(() => (window.__stubWriteData || []).length);
  await P.click('[data-approach-stage-btn="learning"]'); await P.waitForTimeout(900);
  let w = await ev((k) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => [x.id, x.data?.["entries.page:madani:50::recite"]?.claimedStatus ?? null]), n);
  check(`${tag}: Learning is written for BOTH Ahsan and Maryam`, w.some(([id, s]) => id === "t1__p1__subject_quran" && s === "learning") && w.some(([id, s]) => id === "t1__p2__subject_quran" && s === "learning"), JSON.stringify(w));
  check(`${tag}: the choice is still ticked after the card redraws`, (await P.textContent("[data-claim-for] [data-assign-trigger-label]")) === (lang === "bn" ? "২" : "2"));
  // only Maryam
  await P.click("[data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(150);
  await P.click('[data-claim-for] [data-assign-list] input[value="p1"]');
  check(`${tag}: only Maryam ticked: the chip names her`, (await P.textContent("[data-claim-for] [data-assign-trigger-label]")) === NAMES[lang][1]);
  await P.click("[data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(100); // close the list again
  n = await ev(() => (window.__stubWriteData || []).length);
  await P.click('[data-approach-stage-btn="practising"]'); await P.waitForTimeout(900);
  w = await ev((k) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => [x.id, x.data?.["entries.page:madani:50::recite"]?.claimedStatus ?? null]), n);
  check(`${tag}: Practising is written for Maryam only`, w.length >= 1 && w.every(([id]) => id === "t1__p2__subject_quran") && w.some(([, s]) => s === "practising"), JSON.stringify(w));
  check(`${tag}: Ahsan's card still shows his Learning (nothing written for him)`, await ev(() => document.querySelector('[data-approach-stage-btn="learning"]')?.getAttribute("aria-pressed") === "true"));
  check(`${tag}: the page says who it was recorded for`, (await ev(() => document.getElementById("qrStudyNotice")?.textContent || "")).includes(NAMES[lang][1]));
  // the Unit Card (text view) carries it too, and remembers Maryam
  await ev(() => { document.querySelector("[data-ayah-sheet-close], .ayah-sheet-close")?.click(); });
  await ev(() => { const m = document.getElementById("mushafToggle"); if (m && m.checked) { m.checked = false; m.dispatchEvent(new Event("change", { bubbles: true })); } }); await P.waitForTimeout(800);
  await P.click("#readBarRecordBtn").catch(() => {});
  await P.waitForFunction(() => !!document.querySelector("#unitCardApproachSelect"), null, { timeout: 8000 }).catch(() => {});
  check(`${tag}: the Unit Card has 👥 too, still on Maryam`, (await ev(() => document.querySelector("[data-claim-for] [data-assign-trigger-label]")?.textContent)) === NAMES[lang][1]);
  check(`${tag}: no sideways scroll`, await ev(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
