// The Owner, 2 Nov 2026: "When I make entry for a new dual name, why it asks me to put it under a dual name? It shouldn't be
// there." Opened from "+ Create a new Dual Name" the Add-a-Name form shows NO "Dual Names" File-under row (the other rows stay),
// and the Name is still filed in a Dual Names list on Save. Opened as a plain new Name, the Dual Names row is still there.
// Run from the repository root with serve.js on :8080 (QR_BASE for another port).
//   --mutate=show-dual   the Dual row is shown again -> the "no Dual row" checks fail
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
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    let body = fs.readFileSync("app/quranrevival.html", "utf8");
    const a = 'hideKind: fileInto?.kind === "dual" ? "dual" : null';
    if (MUTATE !== "show-dual" || !body.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    body = body.split(a).join("hideKind: null");
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabExploreBtn");
  await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => !document.getElementById("asmaXPanel")?.hidden, null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const rowsShown = () => page.evaluate(() => [...document.querySelectorAll("#asmaXEditFileUnder label.asmaX-file-row")].filter((l) => l.getBoundingClientRect().height > 0).map((l) => l.querySelector("select").dataset.asmaFileKind));
  const closeOverlay = () => page.evaluate(() => document.getElementById("asmaXEditCancelBtn")?.click());

  // Plain new Name: control, the Dual row IS there.
  await page.evaluate(() => document.getElementById("asmaXNewNameBtn").click());
  await page.waitForSelector("#asmaXEditFileUnder", { timeout: 5000 });
  const plain = await rowsShown();
  check(`${tag}: POSITIVE CONTROL a plain new Name still shows all four rows`, plain.join() === "group,dual,by-act,by-essence", plain.join());
  await closeOverlay(); await page.waitForTimeout(300);

  // New DUAL Name.
  await page.evaluate(() => document.getElementById("asmaXAttachNewDualBtn").click());
  await page.waitForSelector("#asmaXEditFileUnder", { timeout: 5000 });
  const dual = await rowsShown();
  check(`${tag}: a new Dual Name shows no "Dual Names" row`, !dual.includes("dual"), dual.join());
  check(`${tag}: ...and still shows Group, By Act, By Essence`, dual.join() === "group,by-act,by-essence", dual.join());
  const hiddenOk = await page.evaluate(() => { const s = document.querySelector('select[data-asma-file-kind="dual"]'); return !!s && s.value === "d1" && s.closest("label").getBoundingClientRect().height === 0; });
  check(`${tag}: its hidden Dual choice holds the first Dual list (d1)`, hiddenOk);
  await page.fill("#asmaXEditTranslit", "Al-Awwal");
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.click("#asmaXEditSaveBtn");
  await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "asmaCollections"), null, { timeout: 8000 }).catch(() => {});
  const saved = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "asmaCollections").pop()?.data ?? null);
  const extra = saved?.extraNames?.find((n) => n.transliteration === "Al-Awwal");
  const key = extra ? `name:${extra.number}` : "(none)";
  check(`${tag}: the new Dual Name is saved into its Dual Names list`, !!extra && (saved.collections || []).some((c) => c.id === "d1" && (c.items || []).includes(key)), JSON.stringify(saved?.collections));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== New Dual Name has no Dual row: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
