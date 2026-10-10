// The Owner, 10 Oct 2026 (a screenshot of Explore's Asma Name bar, the space after 📂 marked): "A name need to be
// attached with either Essence or Act, Unique or Shared. You can place two buttons for that". Each pair is either/or:
// one tap files the Name in that classification's list and takes it out of the other's; a second tap takes it out; a
// classification with no list yet gets its first one, named after it. The four classifications are seeded here in the
// Owner's own shape (decision 78: ACT, ESSENCE, UNIQUENESS, SHARED, added by the Owner).
// Run from the repository root with serve.js on :8080, at 390px Bangla and 1280px English.
//   --mutate=no-pair   the pairs are not drawn            -> the button checks fail
//   --mutate=no-move   the other half is not emptied      -> the either/or checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-pair": ["${canManage ? asmaXQuickClassHtml(entry.number) : \"\"}", ""],
  "no-move": ["for (const l of asmaXQuickLists(next, other.key)) if ((l.items ?? []).includes(uk)) next = asmaRemoveItemLocal(next, l.id, uk);", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEED = `
window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.asmaCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, schemaVersion: 1,
  classifications: [
    { key: "group", title: { en: "Group", bn: "গ্রুপ" }, order: 10, status: "active" },
    { key: "dual", title: { en: "Dual Names", bn: "জোড়া নাম" }, order: 20, status: "active" },
    { key: "cls_act", title: { en: "ACT" }, order: 30, status: "active" },
    { key: "cls_essence", title: { en: "ESSENCE" }, order: 40, status: "active" },
    { key: "cls_unique", title: { en: "UNIQUENESS" }, order: 50, status: "active" },
    { key: "cls_shared", title: { en: "SHARED" }, order: 60, status: "active" } ],
  collections: [
    { id: "g1", title: { en: "Mercy" }, kind: "group", badge: "", order: 10, status: "active", items: ["name:1", "name:2"] },
    { id: "a1", title: { en: "ACT" }, kind: "cls_act", badge: "", order: 10, status: "active", items: [] },
    { id: "e1", title: { en: "ESSENCE" }, kind: "cls_essence", badge: "", order: 10, status: "active", items: ["name:1"] },
    { id: "u1", title: { en: "UNIQUENESS" }, kind: "cls_unique", badge: "", order: 10, status: "active", items: [] } ],
  extraNames: [], overrides: {}, overridesEn: {}, refOverrides: {} }];`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => { const src = fs.readFileSync("app/quranrevival.html", "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabExploreBtn");
  await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => !document.getElementById("asmaXPanel")?.hidden, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const openName = async (n) => { await ev((x) => { const s = document.getElementById("asmaXSingleSelect"); s.value = String(x); s.dispatchEvent(new Event("change", { bubbles: true })); }, n); await page.waitForTimeout(400); };
  await openName(1);
  const state = () => ev(() => {
    const btns = [...document.querySelectorAll("#asmaXListHeader [data-asmax-quick]")];
    const head = document.getElementById("asmaXListHeader").getBoundingClientRect();
    return { pairs: document.querySelectorAll("#asmaXListHeader .asmax-quick-pair").length,
      on: btns.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.asmaxQuick),
      keys: btns.map((b) => b.dataset.asmaxQuick),
      fits: btns.every((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1 && r.height >= 34; }),
      sideways: document.documentElement.scrollWidth - innerWidth };
  });
  const lastSaved = () => ev(() => { const w = (window.__stubWriteData || []).filter((x) => x.col === "asmaCollections"); const d = w[w.length - 1]?.data; return d?.collections ? d.collections.map((c) => [c.id, c.kind, c.items]) : null; });
  const s0 = await state();
  check(`${tag} 1a two pairs on the Name bar: Essence|Act and Unique|Shared`, s0.pairs === 2 && s0.keys.join() === "cls_essence,cls_act,cls_unique,cls_shared", JSON.stringify(s0));
  check(`${tag} 1b Ar-Rahman is already under Essence: that half is lit`, s0.on.join() === "cls_essence", JSON.stringify(s0.on));
  check(`${tag} 1c the pairs fit the bar, 34px or taller, no sideways scroll`, s0.fits && s0.sideways <= 0, JSON.stringify(s0));
  // Act: filed under ACT, and out of ESSENCE (either/or).
  await ev(() => document.querySelector('#asmaXListHeader [data-asmax-quick="cls_act"]')?.click());
  await page.waitForTimeout(800);
  const s1 = await state(), w1 = await lastSaved();
  const items = (w, id) => (w || []).find((c) => c[0] === id)?.[2] || [];
  check(`${tag} 2a tap Act: saved under ACT`, items(w1, "a1").includes("name:1"), JSON.stringify(w1));
  check(`${tag} 2b ...and taken out of ESSENCE (either one or the other)`, !items(w1, "e1").includes("name:1"), JSON.stringify(w1));
  check(`${tag} 2c the bar shows Act lit, Essence not`, s1.on.join() === "cls_act", JSON.stringify(s1.on));
  check(`${tag} 2d its Group is untouched`, items(w1, "g1").includes("name:1"));
  // Shared has no list yet: its first one is made, named after it.
  await ev(() => document.querySelector('#asmaXListHeader [data-asmax-quick="cls_shared"]')?.click());
  await page.waitForTimeout(800);
  const w2 = await lastSaved();
  const shared = (w2 || []).filter((c) => c[1] === "cls_shared");
  check(`${tag} 3a tap Shared (no list yet): a SHARED list is made and the Name filed in it`, shared.length === 1 && shared[0][2].includes("name:1"), JSON.stringify(w2));
  check(`${tag} 3b Act stays lit beside Shared (two separate pairs)`, (await state()).on.join() === "cls_act,cls_shared");
  // A second tap takes it out again.
  await ev(() => document.querySelector('#asmaXListHeader [data-asmax-quick="cls_shared"]')?.click());
  await page.waitForTimeout(800);
  const w3 = await lastSaved();
  check(`${tag} 4a a second tap on Shared takes it out`, !(w3 || []).filter((c) => c[1] === "cls_shared").some((c) => c[2].includes("name:1")), JSON.stringify(w3));
  // Another Name, in no list: nothing lit.
  await openName(2);
  check(`${tag} 5a As-Sami' style: a Name in neither half shows neither lit`, (await state()).on.length === 0);
  if (lang === "bn") check(`${tag} 5b the tooltip is Bangla`, /রাখুন/.test(await ev(() => document.querySelector("#asmaXListHeader [data-asmax-quick]")?.title ?? "")));
  const navSameLine = await ev(() => { const n = document.getElementById("asmaXNextNameBtn")?.getBoundingClientRect(), t = document.querySelector("#asmaXListHeader .qcr-list-title")?.getBoundingClientRect(); return !!n && !!t && Math.abs(n.top - t.top) < 24; });
  check(`${tag} 5c ‹ › stay on the Name's own line; the pairs take a line of their own`, navSameLine);
  await page.locator("#asmaXListHeader").screenshot({ path: `/tmp/asma-quick-${lang}-${width}.png` }).catch(() => {});
  check(`${tag} 6 no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Asma Name bar: Essence|Act, Unique|Shared: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
