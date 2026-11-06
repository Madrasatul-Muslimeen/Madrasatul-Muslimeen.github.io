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
// Larger text and Bangla (the Architect, 6 Nov 2026: v13.41's two open items). The root text size is set to 100/150/200% (it enlarges the whole app,
// so this proves the SHEET, not the rest of the screen). The Reading View's first āyah ⋮ is opened; the sheet must sit inside the screen, the page must
// not scroll sideways, no tile may clip its label, and in Bangla the tiles and rows carry Bangla words.   --mutate=wide widens the sheet, --mutate=nowrap stops labels wrapping, --mutate=nobn drops a Bangla word -> FAIL.
const BN = /[ঀ-৿]/;
for (const [lang, width, pct] of [["bn", 390, 100], ["en", 390, 150], ["en", 390, 200], ["bn", 390, 200], ["en", 360, 200]]) {
  const tag = `[${lang} ${width} ${pct}%]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (process.argv.includes("--mutate=wide")) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = await res.text(); const from = "width: min(19rem, calc(100vw - 3rem)); padding: 0.6rem;"; if (b.split(from).length !== 2) throw new Error("anchor"); r.fulfill({ response: res, body: b.replace(from, "width: 30rem; padding: 0.6rem;") }); });
  if (process.argv.includes("--mutate=nowrap")) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = await res.text(); const from = ".qm-sheet .qm-label { overflow-wrap: anywhere; }"; if (b.split(from).length !== 2) throw new Error("anchor"); r.fulfill({ response: res, body: b.replace(from, ".qm-sheet .qm-label { white-space: nowrap; }") }); });
  if (process.argv.includes("--mutate=nobn")) await ctx.route("**/js/i18n/bn.js*", async (r) => { const res = await r.fetch(); const b = await res.text(); if (!b.includes("নোট নিন")) throw new Error("anchor"); r.fulfill({ response: res, body: b.split("নোট নিন").join("Take Note") }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(600);
  await setSel(page, "surahSelect", "112"); await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) { if (await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)) break; await page.click("#readMeaningBtn"); await page.waitForTimeout(1300); }
  await page.evaluate(() => document.querySelector(".meaning-ayah .ayah-quick-btn")?.click()); await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const m = document.querySelector(".quick-menu.open"); const b = m?.getBoundingClientRect();
    return { open: !!m, l: Math.round(b?.left ?? 0), r: Math.round(b?.right ?? 0), vw: innerWidth, over: document.documentElement.scrollWidth - innerWidth,
      tiles: [...(m?.querySelectorAll(".qm-tile") ?? [])].map((t) => ({ clipped: (() => { const l = t.querySelector(".qm-label").getBoundingClientRect(), c = t.getBoundingClientRect(), mb = m.getBoundingClientRect(); return l.right > c.right + 1 || l.left < c.left - 1 || c.right > mb.right + 1 || c.left < mb.left - 1 || c.right > innerWidth; })(), text: t.textContent.trim() })),
      rows: [...(m?.querySelectorAll(".qm-rows > .qm-item") ?? [])].map((t) => t.textContent.trim()) };
  });
  check(`${tag} the open sheet is inside the screen with no sideways scroll`, r.open && r.l >= 0 && r.r <= r.vw && r.over <= 0, JSON.stringify(r));
  check(`${tag} the four tiles are there and none clips its label`, r.tiles.length === 4 && r.tiles.every((t) => !t.clipped), JSON.stringify(r.tiles));
  if (lang === "bn") check(`${tag} the tiles and rows carry Bangla words (QCR is the acronym alone)`, r.tiles.every((t) => BN.test(t.text) || /QCR$/.test(t.text)) && r.rows.slice(0, 2).every((t) => BN.test(t)), JSON.stringify({ tiles: r.tiles.map((t) => t.text), rows: r.rows }));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
