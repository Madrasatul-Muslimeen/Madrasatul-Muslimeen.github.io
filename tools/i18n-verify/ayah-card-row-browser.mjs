// The Āyah card's ONE row and ONE ⋮ menu (the Owner, 11 Nov 2026, phone-layout demo v3, "yes build now"): [📍 Location ▾][📖 Ayah][‹ ▶ ›][⋮].
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/ayah-card-row-browser.mjs
//   MUT=menuopen ... mutation: the ⋮ menu is open from the start           -> "the tiles are put away until ⋮ is pressed"
//   MUT=locopen ...  mutation: the Location card is open from the start    -> "the six unit buttons are put away until Location is pressed"
//   MUT=oldlabel ... mutation: the button reads "Full text" again          -> the "Ayah" label check
//   MUT=playtile ... mutation: Play is a tile again, not in the row        -> the Play-in-the-row and no-Play-tile checks
//   MUT=nowriting .. mutation: the Writing sheet tile is missing           -> the nine-tile order check
//   MUT=wrap ...     mutation: the row may wrap onto a second line         -> the "one line" check
//   MUT=nowritingcb  mutation: the Writing sheet tile does nothing         -> the "opens the Writing sheet for this āyah" check
// Rendered and measured at 320, 360, 390, 768 and 1280, English and Bangla.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const ROOT = process.cwd();
const MUT = process.env.MUT || "";
const restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next);
  restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
const SHEET = "app/js/ayah-action-sheet.js";
if (MUT === "menuopen") mutate(SHEET, /data-ayah-sheet-menu\$\{uiOpen\.menu \? "" : " hidden"\}/g, "data-ayah-sheet-menu");
else if (MUT === "locopen") mutate(SHEET, /data-ayah-sheet-location\$\{uiOpen\.loc \? "" : " hidden"\}/g, "data-ayah-sheet-location");
else if (MUT === "oldlabel") mutate(SHEET, /\$\{escapeHtml\(t\("Ayah"\)\)\}<\/button>/g, '${escapeHtml(t("Full text"))}</button>');
else if (MUT === "playtile") mutate(SHEET, /    \{ attr: "data-ayah-sheet-copy"/g, '    { attr: "data-ayah-sheet-play", icon: "▶", short: t("Play"), label: t("Play this āyah") },\n    { attr: "data-ayah-sheet-copy"');
else if (MUT === "nowriting") mutate(SHEET, /    \{ attr: "data-ayah-sheet-writing"[^\n]*\n/g, "");
else if (MUT === "wrap") { mutate("app/quranrevival.html", /flex-wrap: nowrap; align-items: stretch; justify-content: stretch/g, "flex-wrap: wrap; align-items: stretch; justify-content: stretch"); mutate("app/quranrevival.html", /\.ayah-sheet-loc, \.ayah-sheet-head-tools \.ayah-sheet-noteview \{ flex: 1 1 0;/g, ".ayah-sheet-loc, .ayah-sheet-head-tools .ayah-sheet-noteview { flex: 1 0 140px;"); }
else if (MUT === "nowritingcb") mutate("app/quranrevival.html", /        onWriting: \(unitKey\) => \{[^\n]*\n/g, "        onWriting: () => {},\n");

const TENANT = "t1";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
async function open(ctx) {
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(1200);
  return page;
}
async function openRead(page) {
  if (await ev(page, () => !document.getElementById("readView").hidden)) return;
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 300);
}
const shown = (sel) => `(() => { const e = document.querySelector('[data-ayah-sheet] ${sel}'); return !!e && e.getClientRects().length > 0; })()`;
const WIDTHS = process.env.ONE ? [[390, 844]] : [[320, 640], [360, 740], [390, 844], [768, 1024], [1280, 800]];
const LANGS = process.env.ONE ? ["en"] : ["en", "bn"];
const TILES = ["note", "writing", "qcr", "bookmark", "poster", "asma", "file-folder", "copy", "share"];
try {
  for (const lang of LANGS) for (const [width, height] of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: "window.__stubApplyBatches = true;" });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const page = await open(ctx);
    await openRead(page);
    await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(page, 900);
    await ev(page, () => document.querySelector('[data-ayah-num-badge="1:2"]')?.click());
    await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
    await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .unit-ladder"), null, { timeout: 8000 }).catch(() => {});
    await settle(page, 500);

    const row = await ev(page, () => {
      const sheet = document.querySelector("[data-ayah-sheet]"), sr = sheet.getBoundingClientRect();
      const pick = (s) => sheet.querySelector(s);
      const parts = { loc: pick("[data-ayah-sheet-location-btn]"), ayah: pick("[data-ayah-sheet-noteview]"), prev: pick('[data-ayah-sheet-step="-1"]'), play: pick("[data-ayah-sheet-play]"), next: pick('[data-ayah-sheet-step="1"]'), more: pick("[data-ayah-sheet-more]") };
      const boxes = Object.fromEntries(Object.entries(parts).map(([k, e]) => [k, e && e.getClientRects().length ? e.getBoundingClientRect() : null]));
      const vals = Object.values(boxes);
      const all = vals.every(Boolean);
      const centres = all ? vals.map((b) => b.top + b.height / 2) : [];
      return { all, oneLine: all && Math.max(...centres) - Math.min(...centres) < 4, inside: all && vals.every((b) => b.left >= sr.left - 1 && b.right <= sr.right + 1),
        minH: all ? Math.min(...vals.map((b) => b.height)) : 0, ayahText: parts.ayah?.textContent.trim() ?? "", locW: boxes.loc?.width ?? 0, ayahW: boxes.ayah?.width ?? 0,
        locText: parts.loc?.textContent ?? "", locCut: parts.loc ? parts.loc.scrollWidth > parts.loc.clientWidth + 1 : true, ayahCut: parts.ayah ? parts.ayah.scrollWidth > parts.ayah.clientWidth + 1 : true,
        playInPair: !!parts.play?.closest(".ayah-sheet-nav-pair"), ref: pick(".ayah-sheet-ref")?.textContent ?? "", pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(`${tag} MUTATION TARGET (wrap): Location, Ayah, ‹ ▶ › and ⋮ are all on screen on ONE line, inside the card`, row.all && row.oneLine && row.inside, JSON.stringify(row).slice(0, 300));
    check(`${tag} every button in the row is 40px or more tall`, row.minH >= 39.5, String(row.minH));
    check(`${tag} MUTATION TARGET (oldlabel): the 📖 button says "${lang === "bn" ? "আয়াত" : "Ayah"}", not "Full text"`, row.ayahText.includes(lang === "bn" ? "আয়াত" : "Ayah") && !/Full text|পূর্ণ পাঠ/.test(row.ayahText), row.ayahText);
    check(`${tag} MUTATION TARGET (playtile): ▶ sits in the ‹ ▶ › group of the row`, row.playInPair);
    check(`${tag} neither Location nor Ayah is cut${width < 360 ? " (Location may keep only 📍 ▾ on a very narrow phone)" : ""}`, !row.locCut && !row.ayahCut, JSON.stringify({ locCut: row.locCut, ayahCut: row.ayahCut, locW: row.locW, ayahW: row.ayahW }));
    check(`${tag} the page does not scroll sideways`, row.pageOverflow <= 0, String(row.pageOverflow));
    check(`${tag} the reference line is still "Quran 1:n — Surah …"`, /[\d০-৯]+:[\d০-৯]+/.test(row.ref) && row.ref.length > 8, row.ref);

    const closed = await ev(page, () => { const s = document.querySelector("[data-ayah-sheet]"); const vis = (q) => [...s.querySelectorAll(q)].some((e) => e.getClientRects().length > 0);
      return { tiles: vis(".ayah-sheet-act"), rungs: vis("[data-unit-ladder-rung]"), more: s.querySelector("[data-ayah-sheet-more]").getAttribute("aria-expanded"), loc: s.querySelector("[data-ayah-sheet-location-btn]").getAttribute("aria-expanded") }; });
    check(`${tag} MUTATION TARGET (menuopen): the tiles are put away until ⋮ is pressed`, !closed.tiles && closed.more === "false", JSON.stringify(closed));
    check(`${tag} MUTATION TARGET (locopen): the six unit buttons are put away until Location is pressed`, !closed.rungs && closed.loc === "false", JSON.stringify(closed));

    await ev(page, () => document.querySelector("[data-ayah-sheet-more]").click());
    await settle(page, 300);
    const menu = await ev(page, () => { const s = document.querySelector("[data-ayah-sheet]");
      const tiles = [...s.querySelectorAll(".ayah-sheet-act")].filter((e) => e.getClientRects().length).map((e) => [...e.attributes].map((a) => a.name).find((n) => n.startsWith("data-ayah-sheet-")).replace("data-ayah-sheet-", ""));
      const rects = [...s.querySelectorAll(".ayah-sheet-act")].filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect()); const sr = s.getBoundingClientRect();
      const cols = new Set(rects.map((r) => Math.round(r.left))).size;
      return { tiles, inside: rects.every((r) => r.left >= sr.left - 1 && r.right <= sr.right + 1), cols, minH: Math.min(...rects.map((r) => r.height)), expanded: s.querySelector("[data-ayah-sheet-more]").getAttribute("aria-expanded") }; });
    check(`${tag} MUTATION TARGET (nowriting): ⋮ shows the nine tiles in order Note, Writing sheet, QCR, Bookmark, Poster, Asma, Folder, Copy, Share`, JSON.stringify(menu.tiles.map((x) => x.replace(/^note-new$/, "note"))) === JSON.stringify(TILES), JSON.stringify(menu.tiles));
    check(`${tag} the tiles are three to a line, all inside the card, ⋮ says it is open`, menu.cols === 3 && menu.inside && menu.expanded === "true", JSON.stringify(menu));
    check(`${tag} MUTATION TARGET (playtile): there is no Play tile`, !menu.tiles.includes("play"));
    if (width === 390 && lang === "en") await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/ayah-card-row-menu-${lang}-${width}.png` });

    await ev(page, () => document.querySelector("[data-ayah-sheet-location-btn]").click());
    await settle(page, 300);
    const loc = await ev(page, () => { const s = document.querySelector("[data-ayah-sheet]"); const vis = [...s.querySelectorAll("[data-unit-ladder-rung]")].filter((e) => e.getClientRects().length);
      const sr = s.getBoundingClientRect();
      return { n: vis.length, inside: vis.every((e) => { const r = e.getBoundingClientRect(); return r.left >= sr.left - 1 && r.right <= sr.right + 1; }), menuOff: ![...s.querySelectorAll(".ayah-sheet-act")].some((e) => e.getClientRects().length), exp: s.querySelector("[data-ayah-sheet-location-btn]").getAttribute("aria-expanded") }; });
    check(`${tag} Location opens the unit buttons (${loc.n}, all inside the card) and puts the ⋮ menu away`, loc.n >= 3 && loc.inside && loc.menuOff && loc.exp === "true", JSON.stringify(loc));
    if (width === 390 && lang === "en") await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/ayah-card-row-location-${lang}-${width}.png` });
    await ev(page, () => document.querySelector("[data-ayah-sheet-location-btn]").click());
    await settle(page, 200);
    check(`${tag} pressing Location again puts them away`, await ev(page, () => ![...document.querySelectorAll("[data-ayah-sheet] [data-unit-ladder-rung]")].some((e) => e.getClientRects().length)));

    // the Writing sheet tile: closes the card and opens the Writing sheet for THIS āyah (Study Unit = Ayah 1:2)
    await ev(page, () => document.querySelector("[data-ayah-sheet-more]").click());
    await settle(page, 200);
    await ev(page, () => document.querySelector("[data-ayah-sheet-writing]")?.click());
    const ws = await page.waitForFunction(() => document.querySelector(".ws-page, .ws-page-canvas"), null, { timeout: 8000 }).then(() => true).catch(() => false);
    const unit = await ev(page, () => ({ type: document.getElementById("unitTypeSelect")?.value, ayah: document.getElementById("ayahSelect")?.value, cardGone: !document.querySelector("[data-ayah-sheet]") }));
    check(`${tag} MUTATION TARGET (nowritingcb): the Writing sheet tile closes the card and opens the Writing sheet for Ayah 1:2`, ws && unit.type === "ayah" && unit.ayah === "2" && unit.cardGone, JSON.stringify({ ws, ...unit }));
    await ctx.close();
  }
} finally {
  await browser.close();
  restoreAll();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
