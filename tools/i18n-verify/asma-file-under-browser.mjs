// The Owner, 6 Oct 2026: "'File under' should have option to file a single/ dual name under which Group, by Act,
// by Essence. Build it." "By Act" and "By Essence" are classifications the Owner adds (Manage → + New
// classification); they are seeded here with exactly that shape. Add a new Name now has one File-under row per
// active classification, each "Not filed" unless chosen, so one Name is filed under several in one Save.
// Run from the repository root with serve.js on :8080. Expected lists and titles are written by hand.
//   --mutate=no-filing   the save files nothing           -> the "filed under" checks fail
//   --mutate=one-row     only the first classification row  -> the row checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const W = {
  en: { fileUnder: "File under", rows: ["Group", "Dual Names", "By Act", "By Essence"], notFiled: "Not filed" },
  bn: { fileUnder: "যেখানে রাখবেন", rows: ["গ্রুপ", "জোড়া নাম", "By Act", "By Essence"], notFiled: "কোথাও রাখা হয়নি" },
};
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
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    let body = fs.readFileSync("app/quranrevival.html", "utf8");
    const swap = (a, b) => { if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a.slice(0, 60)}`); body = body.split(a).join(b); };
    if (MUTATE === "no-filing") swap("for (const f of filings) {", "for (const f of []) {");
    else if (MUTATE === "one-row") swap("const rows = activeClasses.map((c) => {", "const rows = activeClasses.slice(0, 1).map((c) => {");
    else throw new Error(`unknown mutation ${MUTATE}`);
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const clear = () => page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
  await clear();
  await page.click("#tabExploreBtn");
  await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => !document.getElementById("asmaXPanel")?.hidden, null, { timeout: 10000 });
  await page.waitForTimeout(300);
  // "+N" (Add Name) lives on the bar or inside its ⋯ palette; open whichever holds it, as a reader would.
  const visible = await page.evaluate(() => (document.getElementById("asmaXNewNameBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!visible) { await page.click("#asmaXPaletteBtn"); await page.waitForTimeout(250); }
  await page.click("#asmaXNewNameBtn");
  await page.waitForFunction(() => document.getElementById("asmaXEditOverlay")?.classList.contains("open") || !!document.querySelector("#asmaXEditBody input"), null, { timeout: 5000 });
  const form = await page.evaluate(() => {
    const fs = document.getElementById("asmaXEditFileUnder");
    if (!fs) return null;
    const r = fs.getBoundingClientRect();
    return {
      legend: fs.querySelector("legend")?.textContent.trim(),
      rows: [...fs.querySelectorAll("label.asmaX-file-row")].map((l) => ({ text: l.firstChild.textContent.trim(), value: l.querySelector("select").value, first: l.querySelector("select").options[0].textContent, w: l.getBoundingClientRect().width })),
      newTitlesShown: [...fs.querySelectorAll(".asmaX-file-newtitle")].filter((l) => getComputedStyle(l).display !== "none").length,
      inside: r.left >= -1 && r.right <= innerWidth + 1, w: r.width,
    };
  });
  check(`${tag}: the form has a "${W[lang].fileUnder}" group`, form?.legend === W[lang].fileUnder, JSON.stringify(form?.legend));
  check(`${tag}: one row for each classification: ${W[lang].rows.join(", ")}`, JSON.stringify(form?.rows.map((r) => r.text)) === JSON.stringify(W[lang].rows), JSON.stringify(form?.rows.map((r) => r.text)));
  check(`${tag}: every row starts "${W[lang].notFiled}"`, form?.rows.length === 4 && form.rows.every((r) => r.value === "" && r.first === W[lang].notFiled), JSON.stringify(form?.rows));
  check(`${tag}: no "New list title" field shows until "+ New list…" is chosen`, form?.newTitlesShown === 0, String(form?.newTitlesShown));
  check(`${tag}: the group fits the screen`, !!form?.inside, JSON.stringify(form && { w: form.w }));

  // Fill it in as a reader: a Dual Name, filed under its Dual list, a NEW By Act list, and an existing By Essence list.
  await page.fill("#asmaXEditTranslit", "Al-Awwal");
  await page.selectOption('select[data-asma-file-kind="dual"]', "d1", { timeout: 3000 }).catch(() => {});
  await page.selectOption('select[data-asma-file-kind="by-act"]', "__new__", { timeout: 3000 }).catch(() => {});
  const newTitleShown = await page.evaluate(() => { const l = document.querySelector('[data-asma-file-new-for="by-act"]'); return !!l && getComputedStyle(l).display !== "none"; });
  check(`${tag}: "+ New list…" on By Act shows its own title field`, newTitleShown);
  await page.fill('[data-asma-file-new-title="by-act"]', "Acts of Creating", { timeout: 3000 }).catch(() => {});
  await page.selectOption('select[data-asma-file-kind="by-essence"]', "e1", { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.click("#asmaXEditSaveBtn");
  await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "asmaCollections"), null, { timeout: 8000 }).catch(() => {});
  const saved = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "asmaCollections").pop()?.data ?? null);
  const extra = saved?.extraNames?.find((n) => n.transliteration === "Al-Awwal");
  const key = extra ? `name:${extra.number}` : "(none)";
  const cols = saved?.collections ?? [];
  const inList = (pred) => cols.filter(pred).some((c) => (c.items || []).includes(key));
  check(`${tag}: the new Name is saved`, !!extra, JSON.stringify(saved?.extraNames));
  check(`${tag}: ...filed under its Dual Names list`, inList((c) => c.id === "d1"));
  check(`${tag}: ...filed under a NEW By Act list titled "Acts of Creating"`, inList((c) => c.kind === "by-act" && c.title?.en === "Acts of Creating"));
  check(`${tag}: ...filed under the By Essence list`, inList((c) => c.id === "e1"));
  check(`${tag}: ...and NOT under a Group (that row was left "${W[lang].notFiled}")`, !!extra && !inList((c) => c.kind === "group"));
  check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  if (width === 390) {
    if (!(await page.evaluate(() => (document.getElementById("asmaXNewNameBtn")?.getBoundingClientRect().width ?? 0) > 0))) await page.click("#asmaXPaletteBtn").catch(() => {});
    await page.click("#asmaXNewNameBtn").catch(() => {});
    await page.waitForTimeout(300);
    fs.mkdirSync("/tmp/asma-shots", { recursive: true });
    await page.screenshot({ path: `/tmp/asma-shots/file-under-${lang}-${width}.png` }).catch(() => {});
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Asma "File under" by every classification: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
