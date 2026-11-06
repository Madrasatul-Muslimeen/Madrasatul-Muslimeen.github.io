// PCF MSA J114 (the Owner chose option B, 6 Nov 2026): ONE ⋮ beside the āyah in every view.
//   - The bar's 🔖, 📝 (Notes pane), ✍, 🔗 and 📚 are retired from sight.
//   - The ⋮ is a sheet: four tiles (Play, Note, Bookmark, QCR) and rows (Copy, Share, Writing sheet); inside the screen; tiles >= 40px.
//   - ONE Ayah View: the bar's ⋮ carries Bookmark too. Reading View: each āyah's ⋮ is the sheet. Mushaf: the bar carries a ⋮ for the
//     āyah the ◂ ▸ stopped at.
// At 320, 390, 768, 1280. --mutate=showbar drops the CSS that retires the bar buttons -> FAIL.   Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = process.argv.includes("--mutate=showbar");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const menuInfo = (page, scope) => page.evaluate((sc) => {
  const m = document.querySelector(`${sc} .quick-menu.open`); if (!m) return null; const r = m.getBoundingClientRect();
  const tiles = [...m.querySelectorAll(".qm-tile")].map((b) => ({ k: [...b.attributes].map((x) => x.name).find((n) => n.startsWith("data-qm-") && n !== "data-qm-note-new"), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) }));
  return { tiles, rows: [...m.querySelectorAll(".qm-rows .qm-item")].map((b) => [...b.attributes].map((x) => x.name).find((n) => n.startsWith("data-qm-"))), inside: r.left >= -1 && r.right <= innerWidth + 1, vw: innerWidth, l: Math.round(r.left), r: Math.round(r.right) };
}, scope);
for (const width of [320, 390, 768, 1280]) {
  const tag = `[${width}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = await res.text(); const from = "#readBar #readAttachAsmaBtn, #readBar #readAttachQcrBtn { display: none !important; }"; if (b.split(from).length !== 2) throw new Error("anchor"); r.fulfill({ response: res, body: b.replace(from, "#readBar #zzNone { display: none; }") }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "112"); await page.waitForTimeout(1500);
  const bar = await page.evaluate(() => ["readBookmarkBtn", "readBarBookmarkBtn", "readNotesBtn", "readWritingBtn", "readAttachAsmaBtn", "readAttachQcrBtn"].map((id) => [id, getComputedStyle(document.getElementById(id)).display]));
  check(`${tag} the bar's 🔖 📝 ✍ 🔗 📚 are retired from sight`, bar.every(([, d]) => d === "none"), JSON.stringify(bar));
  // ONE Ayah View: the bar's ⋮
  await page.evaluate(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click()); await page.waitForTimeout(300);
  const one = await menuInfo(page, "#readQuickMenuSlot");
  check(`${tag} ONE Ayah View: the bar's ⋮ is the sheet, with Play, Note, Bookmark and QCR tiles (≥ 40px) and Copy, Share, Writing sheet`, !!one && ["data-qm-play", "data-qm-note", "data-qm-bookmark", "data-qm-qcr"].every((k) => one.tiles.some((t) => t.k === k && t.h >= 40)) && ["data-qm-sub-toggle", "data-qm-writing"].every((k) => one.rows.includes(k)), JSON.stringify(one));
  check(`${tag} ONE Ayah View: the open sheet is inside the screen`, !!one && one.inside, JSON.stringify(one));
  await page.evaluate(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click());
  // Reading View
  for (let i = 0; i < 3; i++) { if (await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)) break; await page.click("#readMeaningBtn"); await page.waitForTimeout(1300); }
  await page.waitForSelector(".meaning-ayah .ayah-quick-btn", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector(".meaning-ayah .ayah-quick-btn")?.click()); await page.waitForTimeout(300);
  const rv = await menuInfo(page, ".meaning-ayah");
  check(`${tag} Reading View: an āyah's ⋮ is the sheet (four tiles) and sits inside the screen`, !!rv && rv.tiles.length === 4 && rv.inside, JSON.stringify(rv));
  await page.evaluate(() => document.querySelector(".meaning-ayah .ayah-quick-btn")?.click());
  // Mushaf: the bar's ⋮ follows ◂ ▸
  await page.click("#readMeaningBtn"); await page.waitForTimeout(1500);
  const isM = await page.evaluate(() => !!document.getElementById("mushafToggle")?.checked);
  if (isM) {
    const before = await page.evaluate(() => document.querySelector("#readQuickMenuSlot .ayah-quick-wrap")?.dataset.unitKey ?? null);
    await page.click("#nextAyahBtn"); await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ key: document.querySelector("#readQuickMenuSlot .ayah-quick-wrap")?.dataset.unitKey ?? null, shown: (document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect().width ?? 0) > 0 }));
    check(`${tag} Mushaf: the bar carries a ⋮ and ▸ moves it to the next āyah (${before} -> ${after.key})`, !!before && after.shown && !!after.key && after.key !== before, JSON.stringify({ before, after }));
  } else check(`${tag} reached the Mushaf`, false);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
