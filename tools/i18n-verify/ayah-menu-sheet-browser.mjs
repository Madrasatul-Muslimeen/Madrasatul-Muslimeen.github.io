// PCF MSA J114 (the Owner chose option B, 6 Nov 2026; and on 7 Nov: "Didn't I tell to combine both under one menu button? Also make all buttons like
// the 4 top buttons"): ONE ⋮ beside the āyah in every view, ONE grid of the same round tiles, and no ⋯ beside it.
//   - The bar's 🔖, 📝 (Notes pane), ✍, 🔗, 📚 and ⋯ (More tools) are retired from sight; every button of the sheet is a tile (no rows, no chips).
//   - The bar's ⋮ (ONE Ayah View, Mushaf) also carries Text size and Mark this reading complete, and below 600px the three study buttons.
//     An āyah's own ⋮ in the Reading View carries the āyah's tiles only. Tiles >= 40px; the sheet is inside the screen; words are not cut.
// At 320, 390, 768, 1280. --mutate=showbar drops the CSS that retires the bar buttons; --mutate=showdots brings ⋯ back; --mutate=wide, nowrap, nobn,
// autofit, plain1fr as in the J114 rounds.   Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const has = (m) => process.argv.includes(`--mutate=${m}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const NOWRAP_OLD = ".quick-menu.qm-sheet .qm-tile .qm-label, .quick-menu.qm-sheet .qm-tile .qm-glyph { white-space: normal; }";
const C4 = "grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.4rem; }", C2 = ".qm-sheet .qm-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }";
const mutateCss = (ctx) => {
  const swap = (pairs) => ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); let b = await res.text(); for (const [from, to] of pairs) { if (b.split(from).length !== 2) throw new Error("anchor " + from.slice(0, 40)); b = b.replace(from, to); } r.fulfill({ response: res, body: b }); });
  if (has("showbar")) return swap([["#readBar #readAttachAsmaBtn, #readBar #readAttachQcrBtn { display: none !important; }", "#readBar #zzNone { display: none; }"]]);
  if (has("showdots")) return swap([["#readBar #readToolsBtn, #readToolsMenu { display: none !important; }", "#readBar #zzNone2 { display: none; }"]]);
  if (has("wide")) return swap([["width: min(21rem, calc(100vw - 2rem)); padding: 0.6rem;", "width: 30rem; padding: 0.6rem;"]]);
  if (has("nowrap")) return swap([[NOWRAP_OLD, ".quick-menu.qm-sheet .qm-tile .qm-label, .quick-menu.qm-sheet .qm-tile .qm-glyph { white-space: nowrap; }"]]);
  if (has("plain1fr")) return swap([[C4, "grid-template-columns: repeat(4, 1fr); gap: 0.4rem; }"], [C2, ".qm-sheet .qm-tiles { grid-template-columns: repeat(2, 1fr); } }"], [NOWRAP_OLD, ""]]);
  if (has("autofit")) return swap([[".qm-sheet .qm-tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.4rem; }", ".qm-sheet .qm-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(4.2rem, 1fr)); gap: 0.4rem; } .quick-menu.qm-sheet { container-type: normal; }"]]);
  if (has("cut")) return swap([["font-size: 0.66rem; font-weight: 600; line-height: 1.15; } /* on the span", "font-size: 1.1rem; font-weight: 600; line-height: 1.15; overflow-wrap: anywhere; } /* on the span"]]);
  if (has("nobn")) return ctx.route("**/js/i18n/bn.js*", async (r) => { const res = await r.fetch(); const b = await res.text(); if (!b.includes("নোট নিন")) throw new Error("anchor"); r.fulfill({ response: res, body: b.split("নোট নিন").join("Take Note") }); });
};
// What the open sheet holds: each tile's key and size, the buttons that are NOT tiles, rows of tiles, whether every word is on one line, containment.
const sheetInfo = (page, scope) => page.evaluate((sc) => {
  const m = document.querySelector(`${sc} .quick-menu.open`); if (!m) return null; const mb = m.getBoundingClientRect();
  const key = (b) => [...b.attributes].map((x) => x.name).find((n) => n.startsWith("data-qm-") && n !== "data-qm-note-new") ?? (b.hasAttribute("data-text-size-toggle") ? "text-size" : "?");
  const vis = (b) => b.getBoundingClientRect().width > 0;
  const all = [...m.querySelectorAll("button")].filter((b) => !b.classList.contains("qm-go-btn") && vis(b));
  const tiles = all.filter((b) => b.classList.contains("qm-tile"));
  const rects = tiles.map((t) => t.getBoundingClientRect()); const tops = [...new Set(rects.map((r) => Math.round(r.top)))];
  const oneLine = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getClientRects().length === 1; };
  const word = (k) => { const t = tiles.find((x) => key(x) === k); const l = t?.querySelector(".qm-label"); return l ? oneLine(l) : null; };
  return { open: true, keys: tiles.map(key), notTiles: all.filter((b) => !b.classList.contains("qm-tile")).map(key), hs: rects.map((r) => Math.round(r.height)), ws: rects.map((r) => Math.round(r.width * 10) / 10),
    inside: rects.every((r) => r.left >= mb.left - 0.5 && r.right <= mb.right + 0.5) && mb.left >= -1 && mb.right <= innerWidth + 1, bottomOk: mb.bottom <= innerHeight + 1, vw: innerWidth, rows: tops.length,
    perRow: tops.map((tp) => rects.filter((r) => Math.round(r.top) === tp).length), oldParts: m.querySelectorAll(".qm-rows, .qm-chips, .qm-chip").length,
    words: { play: word("data-qm-play"), bookmark: word("data-qm-bookmark"), qcr: word("data-qm-qcr"), copy: word("data-qm-sub-toggle") },
    labelsWrap: tiles.every((t) => getComputedStyle(t.querySelector(".qm-label")).whiteSpace === "normal"),
    texts: tiles.map((t) => t.querySelector(".qm-label")?.textContent.trim() ?? "") };
}, scope);
const BAR_KEYS = ["data-qm-play", "data-qm-note", "data-qm-bookmark", "data-qm-qcr", "data-qm-sub-toggle", "data-qm-writing", "data-qm-wbw", "data-qm-roots", "data-qm-derivatives", "data-qm-collapse", "text-size", "data-qm-act"];
for (const width of [320, 390, 768, 1280]) {
  const tag = `[${width}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await mutateCss(ctx);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "112"); await page.waitForTimeout(1500);
  const bar = await page.evaluate(() => ["readBookmarkBtn", "readBarBookmarkBtn", "readNotesBtn", "readWritingBtn", "readAttachAsmaBtn", "readAttachQcrBtn", "readToolsBtn", "readToolsMenu"].map((id) => [id, getComputedStyle(document.getElementById(id)).display]));
  check(`${tag} the bar's 🔖 📝 ✍ 🔗 📚 and ⋯ are retired from sight: one menu`, bar.every(([, d]) => d === "none"), JSON.stringify(bar));
  await page.evaluate(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click()); await page.waitForTimeout(300);
  const one = await sheetInfo(page, "#readQuickMenuSlot");
  check(`${tag} ONE Ayah View: the bar's ⋮ holds every button as a tile (Play, Note, Bookmark, QCR, Copy, Share, Writing, Word by Word, Root, Derivatives, Collapse, Text size, Mark complete), each >= 40px`, !!one && BAR_KEYS.every((k) => one.keys.includes(k)) && one.hs.every((h) => h >= 40), JSON.stringify(one));
  check(`${tag} ONE Ayah View: there is no row and no chip, and no button in the sheet that is not a tile`, !!one && one.oldParts === 0 && one.notTiles.length === 0, JSON.stringify(one));
  check(`${tag} ONE Ayah View: the three study buttons are tiles below 600px only (the bar has them from 600px)`, !!one && (one.keys.filter((k) => k === "data-qm-act").length === (width < 600 ? 4 : 1)), JSON.stringify(one));
  check(`${tag} ONE Ayah View: the open sheet is inside the screen`, !!one && one.inside && one.bottomOk, JSON.stringify(one));
  check(`${tag} ONE Ayah View at 100% text: every row is four tiles but the last (never 3+1 in the middle)`, !!one && one.perRow.slice(0, -1).every((n) => n === 4) && one.perRow.at(-1) <= 4, JSON.stringify(one));
  await page.evaluate(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click());
  // Reading View
  for (let i = 0; i < 3; i++) { if (await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)) break; await page.click("#readMeaningBtn"); await page.waitForTimeout(1300); }
  await page.waitForSelector(".meaning-ayah .ayah-quick-btn", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector(".meaning-ayah .ayah-quick-btn")?.click()); await page.waitForTimeout(300);
  const rv = await sheetInfo(page, ".meaning-ayah");
  check(`${tag} Reading View: an āyah's ⋮ is the same tiles (Play, Note, Bookmark, QCR, Copy, Share, Writing) without the bar's Text size and Mark complete, inside the screen`, !!rv && ["data-qm-play", "data-qm-note", "data-qm-bookmark", "data-qm-qcr", "data-qm-sub-toggle", "data-qm-writing"].every((k) => rv.keys.includes(k)) && !rv.keys.includes("text-size") && !rv.keys.includes("data-qm-act") && rv.notTiles.length === 0 && rv.inside, JSON.stringify(rv));
  await page.evaluate(() => document.querySelector(".meaning-ayah .ayah-quick-btn")?.click());
  // Mushaf: the bar's ⋮ follows ◂ ▸
  await page.click("#readMeaningBtn"); await page.waitForTimeout(1500);
  const isM = await page.evaluate(() => !!document.getElementById("mushafToggle")?.checked);
  if (isM) {
    const before = await page.evaluate(() => document.querySelector("#readQuickMenuSlot .ayah-quick-wrap")?.dataset.unitKey ?? null);
    await page.click("#nextAyahBtn"); await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ key: document.querySelector("#readQuickMenuSlot .ayah-quick-wrap")?.dataset.unitKey ?? null, shown: (document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect().width ?? 0) > 0, tiles: document.querySelectorAll("#readQuickMenuSlot [data-qm-act=complete]").length }));
    check(`${tag} Mushaf: the bar carries a ⋮ (with Mark complete) and ▸ moves it to the next āyah (${before} -> ${after.key})`, !!before && after.shown && !!after.key && after.key !== before && after.tiles === 1, JSON.stringify({ before, after }));
  } else check(`${tag} reached the Mushaf`, false);
  await ctx.close();
}
// ONE Ayah View, the BAR's ⋮ at 100/150/200% text, English and Bangla: every tile stays inside the sheet and the screen, equal columns, words not cut,
// the sheet inside the screen (it scrolls inside itself when the screen is short); the three tiles that stand for bar buttons press those buttons.
for (const [lang, width, pct] of [["en", 390, 100], ["en", 360, 100], ["en", 320, 100], ["en", 390, 150], ["en", 390, 200], ["bn", 390, 200], ["en", 360, 200], ["bn", 360, 200], ["en", 360, 150], ["bn", 390, 100]]) {
  const tag = `[bar ⋮ ${lang} ${width} ${pct}%]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await mutateCss(ctx);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "112"); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click()); await page.waitForTimeout(400);
  const g = await sheetInfo(page, "#readQuickMenuSlot");
  check(`${tag} every tile is inside the sheet and the screen, and the sheet is inside the screen`, !!g && g.inside && g.bottomOk && g.keys.length >= 13, JSON.stringify(g));
  check(`${tag} the labels are allowed to wrap`, !!g && g.labelsWrap, JSON.stringify(g));
  const cols = pct >= 150 ? 2 : 4;
  check(`${tag} ${cols} equal columns: every row but the last is ${cols} tiles`, !!g && g.perRow.slice(0, -1).every((n) => n === cols) && g.perRow.at(-1) <= cols && Math.max(...g.ws) - Math.min(...g.ws) <= 1, JSON.stringify(g));
  if (pct === 100 && lang === "en") check(`${tag} the words Play, Bookmark, QCR and Copy are not cut`, !!g && g.words.play && g.words.bookmark && g.words.qcr && g.words.copy, JSON.stringify(g.words));
  if (lang === "bn") check(`${tag} every tile carries Bangla words (QCR and A± are signs)`, !!g && g.texts.every((tx) => /[ঀ-৿]/.test(tx) || /^(QCR|A±)$/.test(tx)), JSON.stringify(g?.texts));
  if (pct === 100 && lang === "en" && width !== 320) {
    // The tiles that stand for bar buttons press those buttons; Text size opens its sliders inside the sheet.
    const r = await page.evaluate(async () => {
      const hits = { complete: 0, approach: 0 };
      document.getElementById("readCompleteBtn").addEventListener("click", () => hits.complete++, true);
      document.getElementById("readBarTakeBtn").addEventListener("click", () => hits.approach++, true);
      const m = document.querySelector("#readQuickMenuSlot .quick-menu.open"); const mb = m.getBoundingClientRect();
      m.querySelector("[data-text-size-toggle]").click(); await new Promise((r) => setTimeout(r, 200));
      const pop = m.querySelector(".text-size-popover"); const pb = pop.getBoundingClientRect();
      const slidersInside = getComputedStyle(pop).display !== "none" && pb.width > 0 && pb.left >= mb.left - 1 && pb.right <= mb.right + 1;
      m.querySelector('[data-qm-act="complete"]').click(); await new Promise((r) => setTimeout(r, 100));
      document.querySelector("#readQuickMenuSlot [data-qm-toggle]").click(); await new Promise((r) => setTimeout(r, 100));
      const ph = document.querySelector('#readQuickMenuSlot [data-qm-act="approach"]'); const phoneVisible = !!ph && ph.getBoundingClientRect().width > 0;
      if (phoneVisible) ph.click();
      return { slidersInside, hits, phoneVisible };
    });
    check(`${tag} Text size opens its sliders inside the sheet; Mark complete presses the bar's ✓${r.phoneVisible ? "; Take an Approach presses the bar's button" : ""}`, r.slidersInside && r.hits.complete === 1 && (!r.phoneVisible || r.hits.approach === 1), JSON.stringify(r));
  }
  await ctx.close();
}
// Larger text and Bangla in the Reading View (the Architect, 6 Nov 2026): an āyah's own ⋮ at 100/150/200%: inside the screen, no sideways scroll, no tile clips
// its label, and in Bangla every tile carries Bangla words.   --mutate=wide, nowrap, nobn, autofit, plain1fr -> FAIL.
for (const [lang, width, pct] of [["bn", 390, 100], ["en", 390, 150], ["en", 390, 200], ["bn", 390, 200], ["en", 360, 200]]) {
  const tag = `[${lang} ${width} ${pct}%]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await mutateCss(ctx);
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
      tiles: [...(m?.querySelectorAll(".qm-tile") ?? [])].map((t) => ({ clipped: (() => { const l = t.querySelector(".qm-label").getBoundingClientRect(), c = t.getBoundingClientRect(), mb = m.getBoundingClientRect(); return l.right > c.right + 1 || l.left < c.left - 1 || c.right > mb.right + 1 || c.left < mb.left - 1 || c.right > innerWidth; })(), text: t.textContent.trim() })) };
  });
  check(`${tag} the open sheet is inside the screen with no sideways scroll`, r.open && r.l >= 0 && r.r <= r.vw && r.over <= 0, JSON.stringify(r));
  check(`${tag} every tile is there and none clips its label`, r.tiles.length >= 8 && r.tiles.every((t) => !t.clipped), JSON.stringify(r.tiles));
  const rows = await page.evaluate(() => { const ts = [...document.querySelectorAll(".quick-menu.open .qm-tile")]; const tops = [...new Set(ts.map((t) => Math.round(t.getBoundingClientRect().top)))]; return { n: ts.length, rows: tops.length, perRow: tops.map((tp) => ts.filter((t) => Math.round(t.getBoundingClientRect().top) === tp).length) }; });
  const cols = pct >= 150 ? 2 : 4;
  check(`${tag} tile layout is ${cols} columns (never 3+1 in the middle, never one column)`, rows.perRow.slice(0, -1).every((n) => n === cols) && rows.perRow.at(-1) <= cols, JSON.stringify(rows));
  if (lang === "bn") check(`${tag} the tiles carry Bangla words (QCR is the acronym alone)`, r.tiles.every((t) => /[ঀ-৿]/.test(t.text) || /QCR$/.test(t.text)), JSON.stringify(r.tiles.map((t) => t.text)));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
