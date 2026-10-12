// Issue #786 (the Owner, 12 Oct 2026), at 390 and 1280px, in English and Bangla.
//
// 1. "Mushaf view jumps back to the first page after a bookmark save." Reproduced before any change at 390px:
//    Whole Surah Al-Baqarah, Mushaf on, on Mushaf page 4 (the surah's third page); saving from the 🔖 left the reader
//    on page 2, the surah's first, because renderStudyScreen() redraws the flow and the emptied container clamps
//    its scroll to 0. Proved here: after saving (and after removing) a bookmark from the Read bar's 🔖 and from the
//    Mushaf bar's 🔖, the same page is in view at the same scroll offset, both straight after the save and once the
//    page-by-page Mushaf render has finished, and the view never drifts past it on the way; the flow view (Whole
//    Surah, no Mushaf) and a Range keep the row in view and the offset too.
// 2. "QCR '+ Add āyah' ignores the Al-Fātiḥah count." With the count on (the Bismillah unnumbered, "Al-ḥamdu
//    lillāh" is 1) typing Al-Fātiḥah 1 stored ayah:1:1, the Bismillah. Proved here: the box reads the number the
//    way the Read view prints it -- displayed 1 stores ayah:1:2, 6 stores ayah:1:7 and 7 stores ayah:1:8 (the
//    split āyah's record, FATIHA_SEVEN_RECORD_AYAH, read from fatiha-count.js, never retyped) -- the form shows the
//    chosen āyah's own text (the half of 1:7, from expandAyahsForDisplay) before it is added, the new rows read
//    1:1 / 1:6 / 1:7, a 1:7 row opens the Read view on displayed 7, 8 is refused, the collection's earlier items are
//    untouched; with the count off nothing changes (1 -> ayah:1:1, 7 -> ayah:1:7); another surah is unaffected.
//
// Run from the repository root with serve.js running (QR_BASE for another port). Mutations (--mutate=NAME) each put
// the old or a broken behaviour back; the checks named must FAIL:
//   norestore  the bookmark save restores nothing                    -> every "stays" check
//   jump       the place is restored once, before the redraw lands   -> the Mushaf "stays" checks
//   smooth     the restore scrolls smoothly (#pageViewContainer is   -> "never drifts past it"
//              scroll-behavior: smooth) instead of instantly
// The flow / Range checks are REGRESSION GUARDS, not proof of this fix: with the fix removed (norestore) they passed
// too -- the scrolling flow replaces its rows in one step and never lost its place -- so no mutation of the fix can
// fail them, and the fix holds on to a Mushaf page only. (A "noflow" mutation was tried and could not fail; that is
// how the flow was found not to need it.)
//   nocount    "+ Add āyah" ignores the count                        -> the count-on add checks
//   nopreview  no preview of the āyah before it is added             -> the preview checks
//   countoff   "+ Add āyah" applies the count even when it is off    -> the count-off add checks
import fs from "node:fs";
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";
import { expandAyahsForDisplay, FATIHA_SEVEN_RECORD_AYAH } from "../../app/js/fatiha-count.js";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  norestore: ["function restoreReadViewPlace(place) {\n      if (!place) return false;", "function restoreReadViewPlace(place) {\n      return true;"],
  jump: ["      if (!renderNow) return;\n      let readerMoved = false;", "      return;\n      let readerMoved = false;"],
  smooth: ['const jump = (el, top, left) => el.scrollTo({ top, left, behavior: "instant" });', "const jump = (el, top, left) => { el.scrollTop = top; el.scrollLeft = left; };"],
  nocount: ["internalForDisplayedAyah(surahNum, typed, fatihaOn())", "internalForDisplayedAyah(surahNum, typed, false)"],
  nopreview: ['const el = document.getElementById("qcrAddPreview");\n      if (!el) return;', "return;"],
  countoff: ["internalForDisplayedAyah(surahNum, typed, fatihaOn())", "internalForDisplayedAyah(surahNum, typed, true)"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const digits = (s, bn) => (bn ? String(s).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(s));
const ignorable = (e) => /ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e);
const clean = (s) => String(s ?? "").replace(/﻿/g, "").replace(/\s+/g, " ").trim();

// The expected āyah texts come from the packaged data and the app's own display mapping, never retyped.
const surah1 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_001.json", "utf8"));
const shownOn = expandAyahsForDisplay(1, surah1.ayahs, true);
const TEXT = {
  bismillah: clean(surah1.ayahs.find((a) => a.ayah === 1).uthmaniText),
  d1: clean(shownOn.find((a) => a.displayAyah === 1).uthmaniText), // internal 1:2
  d6: clean(shownOn.find((a) => a.displayAyah === 6).uthmaniText), // first half of internal 1:7
  d7: clean(shownOn.find((a) => a.displayAyah === 7).uthmaniText), // second half of internal 1:7
  i7: clean(surah1.ayahs.find((a) => a.ayah === 7).uthmaniText),
};
if (!TEXT.d1 || !TEXT.d6 || !TEXT.d7 || TEXT.d6 === TEXT.d7 || TEXT.d1 === TEXT.bismillah) throw new Error("fixture texts did not resolve");
const SEVEN = `ayah:1:${FATIHA_SEVEN_RECORD_AYAH}`;

const browser = await chromium.launch();
async function open({ lang, w, h, seed = "" }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      const n = src.split(a).length - 1;
      if (!n) throw new Error(`mutation anchor missing: ${MUTATE}`);
      console.log(`  (mutation ${MUTATE}: ${n} occurrence(s) replaced)`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

// ---------------------------------------------------------------------------------------------------------------
// 1. A bookmark save leaves the reader where they were.
// ---------------------------------------------------------------------------------------------------------------
/** Where the reader is: the Mushaf page (or flow row) showing most inside the Read view's scroller, its on-screen
    left/top, and every scroll offset that can move it. */
const place = (page) => page.evaluate(() => {
  const pv = document.getElementById("pageViewContainer"), rs = document.getElementById("readScroll");
  const root = document.body.classList.contains("read-sideways") ? pv : rs;
  const view = root.getBoundingClientRect();
  const area = (r) => Math.max(0, Math.min(r.right, view.right, innerWidth) - Math.max(r.left, view.left, 0)) * Math.max(0, Math.min(r.bottom, view.bottom, innerHeight) - Math.max(r.top, view.top, 0));
  const pages = [...pv.querySelectorAll(".hifz-page[data-mushaf-page]")];
  const els = pages.length ? pages : [...pv.querySelectorAll(".page-flow-ayah[data-ayah]")];
  if (!els.length) return null;
  const best = els.reduce((a, b) => (area(b.getBoundingClientRect()) > area(a.getBoundingClientRect()) ? b : a));
  const r = best.getBoundingClientRect();
  return { id: Number(best.dataset.mushafPage ?? best.dataset.ayah), kind: pages.length ? "page" : "row", left: Math.round(r.left), pvL: Math.round(pv.scrollLeft), pvT: Math.round(pv.scrollTop), rsT: Math.round(rs.scrollTop), winY: Math.round(scrollY),
    glyph: document.getElementById("readBarBookmarkBtn")?.textContent.trim() || document.getElementById("readBookmarkBtn")?.textContent.trim() };
});
const same = (a, b) => !!a && !!b && a.id === b.id && a.kind === b.kind && Math.abs(a.left - b.left) <= 2 && Math.abs(a.pvL - b.pvL) <= 2 && Math.abs(a.pvT - b.pvT) <= 2 && Math.abs(a.rsT - b.rsT) <= 2 && Math.abs(a.winY - b.winY) <= 2;

async function readView(page, { unit = "surah", mushaf = false, from, to } = {}) {
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", unit); await page.waitForTimeout(800);
  if (unit === "range") { await setSel(page, "rangeFromSelect", String(from)); await page.waitForTimeout(300); await setSel(page, "rangeToSelect", String(to)); await page.waitForTimeout(800); }
  if (mushaf) {
    await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
    // The whole surah's pages, drawn one by one: wait until the render has finished.
    await page.waitForFunction(() => document.querySelectorAll(".hifz-page[data-mushaf-page]").length > 10, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
  } else {
    await page.waitForFunction(() => document.querySelectorAll(".page-flow-ayah[data-ayah]").length > 5, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
}
/** Taps a 🔖 and, when it opens the name dialog, saves; a ★ now asks (issue #797) and "Remove my bookmark" removes it. */
async function tapBookmark(page, sel) {
  if (sel === "#readBarBookmarkBtn") await page.click(sel); else await clickReadTool(page, sel);
  if (await page.waitForSelector(".bm-popover", { timeout: 2500 }).catch(() => null)) {
    if (await page.$("[data-bm-exists-remove]")) await page.click("[data-bm-exists-remove]");
    else await page.click("[data-bm-pop-save]");
  }
  // The ⋯ panel stays open over the reading at 390px; close it the way a reader would, without scrolling.
  await page.evaluate(() => { const b = document.getElementById("bmSavedNotice"); if (b) b.hidden = true; });
}
/** Samples the place every 60ms for `ms`, so a drift on the way (and not just the end state) is seen. */
async function samples(page, ms) {
  const out = [];
  for (let t = 0; t < ms; t += 60) { out.push(await place(page)); await page.waitForTimeout(60); }
  return out;
}

// ONLY=bookmark or ONLY=qcr runs one half (a quicker loop while working); the full run is both.
const ONLY = process.env.ONLY || "";
for (const lang of ONLY === "qcr" ? [] : ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const tag = `[${lang} ${w}]`;
    // (a) Mushaf, Whole Surah: page 4, the surah's third page.
    {
      const { ctx, page, errors } = await open({ lang, w, h });
      await readView(page, { mushaf: true });
      await page.evaluate(() => document.querySelector('.hifz-page[data-mushaf-page="4"]')?.scrollIntoView({ block: "start", inline: "start", behavior: "instant" }));
      await page.waitForTimeout(900);
      const before = await place(page);
      // 390 shows one page (4); 1280 a two-page spread (3 and 4, the larger share counted). Either way, well past page 2.
      check(`${tag} Mushaf precondition: Whole Surah on page ${w < 900 ? 4 : "3–4"}, scrolled away from the surah's first page (2)`, before?.kind === "page" && (w < 900 ? before.id === 4 : before.id >= 3) && Math.abs(before.pvL) > 100, JSON.stringify(before));
      const buttons = (await page.evaluate(() => (document.getElementById("readBookmarkBtn")?.getBoundingClientRect().width ?? 0) > 0 || (document.getElementById("readToolsBtn")?.getBoundingClientRect().width ?? 0) > 0))
        ? ["#readBookmarkBtn", "#readBarBookmarkBtn"] : ["#readBarBookmarkBtn"];
      // 1280: the ⋯ menu's 🔖 steps aside for the Mushaf bar's own (read-bar-bookmark-layers); a second tap removes.
      const plan = buttons.length === 2 ? [["Read bar 🔖 save", buttons[0]], ["Mushaf bar 🔖 remove", buttons[1]]] : [["Mushaf bar 🔖 save", buttons[0]], ["Mushaf bar 🔖 remove", buttons[0]]];
      for (const [what, sel] of plan) {
        const ref = await place(page);
        await tapBookmark(page, sel);
        const way = await samples(page, 1200);
        const soon = way[4];
        await page.waitForTimeout(2500);
        const late = await place(page);
        // POSITIVE CONTROL: the save really re-drew the Read view (the 🔖 changed), so "nothing moved" means something.
        check(`${tag} ${what}: POSITIVE CONTROL -- the 🔖 changed (${ref?.glyph} -> ${late?.glyph})`, !!late && late.glyph !== ref?.glyph, JSON.stringify({ ref: ref?.glyph, late: late?.glyph }));
        check(`${tag} ${what}: the same page (${ref?.id}) at the same scroll offset just after`, same(ref, soon), JSON.stringify({ ref, soon }));
        check(`${tag} ${what}: ...and once the page-by-page render has finished`, same(ref, late), JSON.stringify({ ref, late }));
        const drift = way.filter((p) => p && p.kind === "page" && p.id > ref.id);
        check(`${tag} ${what}: never drifts past page ${ref?.id} on the way`, drift.length === 0, JSON.stringify(drift.slice(0, 3).map((p) => p.id)));
      }
      check(`${tag} Mushaf: no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }
    // (b) The flow view (Whole Surah, no Mushaf) and (c) a Range: the row in view stays.
    for (const [what, opts, row] of [["Whole Surah flow", { unit: "surah" }, 40], ["Range 2:10–60", { unit: "range", from: 10, to: 60 }, 35]]) {
      const { ctx, page, errors } = await open({ lang, w, h });
      await readView(page, opts);
      await page.evaluate((a) => document.querySelector(`.page-flow-ayah[data-ayah="${a}"]`)?.scrollIntoView({ block: "start", inline: "start", behavior: "instant" }), row);
      await page.waitForTimeout(900);
      const ref = await place(page);
      check(`${tag} ${what} precondition: scrolled to row ${row}, far from the start`, ref?.kind === "row" && Math.abs(ref.id - row) <= 1 && (ref.rsT > 300 || Math.abs(ref.pvL) > 300 || ref.winY > 300), JSON.stringify(ref));
      await tapBookmark(page, "#readBookmarkBtn");
      await page.waitForTimeout(400);
      const soon = await place(page);
      await page.waitForTimeout(2000);
      const late = await place(page);
      check(`${tag} ${what}: POSITIVE CONTROL -- the 🔖 changed (${ref?.glyph} -> ${late?.glyph})`, !!late && late.glyph !== ref?.glyph, JSON.stringify({ ref: ref?.glyph, late: late?.glyph }));
      check(`${tag} ${what}: the same row (${ref?.id}) at the same scroll offset after the save`, same(ref, soon) && same(ref, late), JSON.stringify({ ref, soon, late }));
      check(`${tag} ${what}: no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 2. QCR "+ Add āyah" follows the Al-Fātiḥah count.
// ---------------------------------------------------------------------------------------------------------------
const START = ["ayah:65:3", "ayah:2:255"];
const SEED = `DATA.ayahCollections = [{ _id: "t1", tenantId: "t1", collections: [
  { id: "qcrc_786", title: { en: "Fatiha practice" }, badge: "", order: 5, status: "active", items: ${JSON.stringify(START)} } ] }];`;

async function openQcr(page) {
  if (!(await page.evaluate(() => !!document.getElementById("qcrLevelSelect")?.getClientRects().length))) {
    await page.evaluate(() => document.getElementById("tabExploreBtn")?.click());
    await page.waitForTimeout(700);
    await page.evaluate(() => document.getElementById("explorePaletteQcrBtn")?.click());
  }
  await page.waitForFunction(() => document.querySelector("[data-qcr-jump]"), null, { timeout: 15000 }).catch(() => {});
  await page.selectOption("#qcrLevelSelect", "qcrc_786").catch(() => {});
  await page.waitForFunction(() => document.getElementById("qcrAddAyahInput") && document.querySelector('#qcrWaysListContainer [data-qcr-jump="ayah:65:3"]'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}
/** Types `n` for surah `s`; returns the preview as shown, before anything is added. */
async function typeAyah(page, s, n) {
  await page.selectOption("#qcrAddSurahSelect", String(s));
  await page.fill("#qcrAddAyahInput", "");
  await page.fill("#qcrAddAyahInput", String(n));
  await page.waitForFunction(() => { const el = document.getElementById("qcrAddPreview"); return !el || (!el.hidden && el.querySelector(".qcr-add-preview-ar")); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const el = document.getElementById("qcrAddPreview");
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    const tr = el.querySelector(".qcr-add-preview-tr") ?? el.querySelector(".qcr-add-preview-ref");
    // Rendered contrast of the preview's text against the first opaque background behind it.
    const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    let bgEl = el, bg = [255, 255, 255, 0];
    // (Explore's dark panel is painted by a GRADIENT, so a transparent background-colour is no answer: read the
    // gradient's first colour too, or the check measures light text against an imagined white.)
    while (bgEl) {
      const cs = getComputedStyle(bgEl), c = rgb(cs.backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) { bg = c; break; }
      const g = /gradient/.test(cs.backgroundImage) ? cs.backgroundImage.match(/rgba?\([^)]*\)/) : null;
      if (g) { bg = rgb(g[0]); break; }
      bgEl = bgEl.parentElement;
    }
    const lum = ([r0, g0, b0]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r0) + 0.7152 * f(g0) + 0.0722 * f(b0); };
    const fg = rgb(getComputedStyle(tr).color);
    const L1 = lum(fg), L2 = lum(bg);
    return { bgFrom: bgEl?.id || bgEl?.className || "none", bg, ref: el.querySelector(".qcr-add-preview-ref")?.textContent.trim(), ar: el.querySelector(".qcr-add-preview-ar")?.textContent ?? "", tr: el.querySelector(".qcr-add-preview-tr")?.textContent ?? "",
      inside: r.left >= 0 && r.right <= innerWidth + 0.5 && r.width > 0, sx: document.documentElement.scrollWidth - innerWidth, contrast: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) };
  });
}
async function add(page) {
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.click("#qcrAddItemBtn");
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const w = (window.__stubWriteData || []).filter((x) => x.col === "ayahCollections").at(-1);
    const msg = document.getElementById("qcrAddMsg");
    return { items: w?.data?.collections?.find((c) => c.id === "qcrc_786")?.items ?? null, msg: msg && msg.style.display !== "none" ? msg.textContent.trim() : null,
      rows: [...document.querySelectorAll("#qcrWaysListContainer [data-qcr-jump]")].map((b) => `${b.dataset.qcrJump}=${b.querySelector(".badge")?.textContent.trim()}`) };
  });
}

for (const lang of ONLY === "bookmark" ? [] : ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const bn = lang === "bn";
    const tag = `[${lang} ${w} QCR]`;
    const { ctx, page, errors } = await open({ lang, w, h, seed: SEED });
    await openQcr(page);
    const on = await page.evaluate(() => localStorage.getItem("mm_fatiha_bismillah_unnumbered"));
    check(`${tag} POSITIVE CONTROL: the add box is there and the collection lists its ${START.length} āyāt`, await page.evaluate((n) => !!document.getElementById("qcrAddAyahInput") && document.querySelectorAll("#qcrWaysListContainer [data-qcr-jump]").length === n, START.length), String(on));

    // Count ON (the default).
    let items = [...START];
    for (const [n, key, text, label] of [[1, "ayah:1:2", TEXT.d1, "1:1"], [6, "ayah:1:7", TEXT.d6, "1:6"], [7, SEVEN, TEXT.d7, "1:7"]]) {
      const pv = await typeAyah(page, 1, n);
      check(`${tag} count on: typing ${n} previews ${label} with its own text before it is added`, !!pv && pv.ref === digits(label, bn) && clean(pv.ar) === text, JSON.stringify(pv && { ref: pv.ref, ar: clean(pv.ar).slice(0, 40), want: text.slice(0, 40) }));
      if (n === 1) {
        check(`${tag} count on: the preview of 1 is "Al-ḥamdu lillāh", not the Bismillah`, !!pv && clean(pv.ar) !== TEXT.bismillah && pv.tr.length > 0, JSON.stringify(pv && clean(pv.ar).slice(0, 30)));
        console.log(`  info  ${tag} preview contrast ${pv?.contrast?.toFixed(2)} against ${JSON.stringify(pv?.bg)} (from ${pv?.bgFrom})`);
        check(`${tag} the preview sits inside the screen, readable (contrast ≥ 4.5), no sideways scroll`, !!pv && pv.inside && pv.sx <= 0 && pv.contrast >= 4.5, JSON.stringify(pv && { inside: pv.inside, sx: pv.sx, contrast: pv.contrast, bg: pv.bg, bgFrom: pv.bgFrom }));
      }
      const r = await add(page);
      items = [...items, key];
      check(`${tag} count on: adding ${n} stores ${key}, the earlier items untouched`, JSON.stringify(r.items) === JSON.stringify(items), JSON.stringify(r.items));
      check(`${tag} count on: the new row reads ${label}`, r.rows.at(-1) === `${key}=${digits(label, bn)}`, JSON.stringify(r.rows));
    }
    const p8 = await typeAyah(page, 1, 8);
    const r8 = await add(page);
    check(`${tag} count on: 8 is refused ("has 7"), nothing written, no preview`, r8.items === null && !!r8.msg && r8.msg.includes(digits("7", bn)) && p8 === null, JSON.stringify({ r8, p8 }));
    const p255 = await typeAyah(page, 2, 255);
    check(`${tag} another surah is unaffected: 2 / 255 previews 2:255`, !!p255 && p255.ref === digits("2:255", bn), JSON.stringify(p255?.ref));
    // The 1:7 row (ayah:1:8) opens the Read view on displayed 7 -- #ayahSelect's values are RECORD āyāt.
    await page.locator(`[data-qcr-jump="${SEVEN}"]`).click();
    await page.waitForFunction(() => document.getElementById("surahSelect")?.value === "1", null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
    const opened = await page.evaluate(() => ({ surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value }));
    check(`${tag} the 1:7 row opens Al-Fātiḥah on displayed 7 (record ${FATIHA_SEVEN_RECORD_AYAH})`, opened.surah === "1" && opened.ayah === String(FATIHA_SEVEN_RECORD_AYAH), JSON.stringify(opened));

    // Count OFF: the number is the stored āyah, exactly as before.
    await page.evaluate(() => localStorage.setItem("mm_fatiha_bismillah_unnumbered", "0"));
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
    await openQcr(page);
    items = [...START];
    for (const [n, key, text] of [[1, "ayah:1:1", TEXT.bismillah], [7, "ayah:1:7", TEXT.i7]]) {
      const pv = await typeAyah(page, 1, n);
      check(`${tag} count off: typing ${n} previews 1:${n} with its own text`, !!pv && pv.ref === digits(`1:${n}`, bn) && clean(pv.ar) === text, JSON.stringify(pv && { ref: pv.ref, ar: clean(pv.ar).slice(0, 40) }));
      const r = await add(page);
      items = [...items, key];
      check(`${tag} count off: adding ${n} stores ${key}`, JSON.stringify(r.items) === JSON.stringify(items), JSON.stringify(r.items));
    }
    check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== Issue #786: a bookmark save keeps the Read view's place; QCR + Add āyah follows the Al-Fātiḥah count: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
