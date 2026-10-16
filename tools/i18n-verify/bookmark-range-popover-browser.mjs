// The bookmark dialog's āyah RANGE (the Owner, 16 Oct 2026, PCA J76, for QR J03 "Bookmark a range of āyāt").
// bookmark-popover.js is a shared MMSA tool: a caller may pass a unit { kind: "range", surah, ayahCount, from, to }
// and gets two āyah fields, checked, and back `range` + `unitKey` = range:S:A-B (buildUnitKey.range, I5).
// Proved here, at 320 / 390 / 820 / 1440px in English and Bangla:
//   - INERT: a caller passing no units, or units with no range (the Quran Read view's unit / This āyah / This page),
//     sees no range field and gets no `range` or `unitKey` back (positive control: the same dialog with a range
//     unit does show the fields);
//   - a lone range unit shows From / To (40px), the Name follows the range ("Al-Baqarah 255–257") until typed,
//     and Save returns range { surah, from, to } with unitKey range:2:255-257;
//   - an invalid range (From after To, or past the surah's last āyah) is refused in words, the dialog stays open;
//   - among other units the range fields show only when the range is picked, and picking another unit returns no
//     range;
//   - a saved range:2:255-257 bookmark shows its name in bookmarks.html and in the Bookmark menu, and opening it
//     lands on 2:255 as the Range unit 255–257.
// Run from the repository root with serve.js running (QR_BASE for another port).
// Mutations (--mutate=NAME), each must FAIL the checks named:
//   notinert   every unit is read as a range           -> the INERT checks
//   nocheck    rangeProblem() accepts anything          -> the invalid-range checks
//   nokey      Save returns no unitKey                  -> the saved-key checks
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const POP = "app/js/bookmark-popover.js";
const MUT = {
  notinert: [POP, "const isRangeUnit = (u) => u?.kind === \"range\";", "const isRangeUnit = (u) => !!u;"],
  nocheck: [POP, "  const max = Number(u?.ayahCount) || 0;\n", "  return null;\n"],
  nokey: [POP, ", unitKey: buildUnitKey.range(pickedUnit.surah, from, to) };", " };"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const dg = (lang, s) => (lang === "bn" ? String(s).replace(/\d/g, (d) => BN_DIGITS[d]) : String(s));
const T = {
  en: { from: "From āyah", to: "To āyah", order: "The first āyah must not come after the last.", max: "Choose āyāt from 1 to 286." },
  bn: { from: "শুরুর আয়াত", to: "শেষ আয়াত", order: "শুরুর আয়াত শেষ আয়াতের পরে হতে পারে না।", max: "১ থেকে ২৮৬ পর্যন্ত আয়াত বেছে নিন।" },
};
const RANGE = { id: "range", label: "Āyāt", kind: "range", surah: 2, ayahCount: 286, from: 255, to: 257, surahName: "Al-Baqarah" };

async function open({ lang = "en", w = 390, seed = "", path = "/app/bookmarks.html" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: w > 600 ? 900 : 844 }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file.replace(/^app\//, "app/")}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, path);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
/** Opens the dialog with `opts` and leaves its promise on window.__bmRes. */
const openDialog = (page, opts) => page.evaluate(async (o) => {
  const m = await import("./js/bookmark-popover.js");
  window.__bmRes = undefined;
  m.openBookmarkNamePopover(o).then((r) => { window.__bmRes = r; });
  await new Promise((r) => setTimeout(r, 150));
}, opts);
const state = (page) => page.evaluate(() => {
  const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, r: r.right, t: r.top, b: r.bottom, shown: !!(e.offsetParent || e.getClientRects().length) }; };
  const lab = (sel) => document.querySelector(sel)?.closest("label")?.firstChild?.textContent?.trim() ?? null;
  const err = document.querySelector("[data-bm-pop-range-error]");
  return {
    open: !!document.querySelector(".bm-popover"), row: box("[data-bm-pop-range]"), from: box("[data-bm-pop-range-from]"), to: box("[data-bm-pop-range-to]"),
    fromLabel: lab("[data-bm-pop-range-from]"), toLabel: lab("[data-bm-pop-range-to]"), pop: box(".bm-popover"),
    name: document.querySelector("[data-bm-pop-name]")?.value ?? null, error: err && !err.hidden ? err.textContent : "",
    vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth,
  };
});
const setRange = (page, from, to) => page.evaluate(([a, b]) => {
  for (const [sel, v] of [["[data-bm-pop-range-from]", a], ["[data-bm-pop-range-to]", b]]) { const e = document.querySelector(sel); e.value = String(v); e.dispatchEvent(new Event("input", { bubbles: true })); }
}, [from, to]);
const save = async (page) => { await page.click("[data-bm-pop-save]"); await page.waitForTimeout(200); return page.evaluate(() => window.__bmRes); };

for (const lang of ["en", "bn"]) for (const w of [320, 390, 820, 1440]) {
  const tag = `[${lang} ${w}]`;
  const { ctx, page, errors } = await open({ lang, w });
  try {
    // INERT 1: no units at all (Asma, topics, Hadith, routines).
    await openDialog(page, { defaultName: "Ayat al-Kursi" });
    let s = await state(page);
    check(`${tag} INERT: a dialog with no units has no range field`, s.open && !s.row && !s.from, JSON.stringify(s.row));
    let res = await save(page);
    check(`${tag} INERT: ...and its result carries no range and no unitKey`, !!res && !("range" in res) && !("unitKey" in res) && res.name === "Ayat al-Kursi", JSON.stringify(res));
    // INERT 2: the Quran Read view's three units, none a range.
    await openDialog(page, { defaultName: "Al-Baqarah", units: [{ id: "unit", label: "Surah", defaultName: "Al-Baqarah" }, { id: "ayah", label: "This āyah", defaultName: "2:255" }, { id: "page", label: "This page", defaultName: "Page 42" }] });
    s = await state(page);
    check(`${tag} INERT: units without a range draw no range field`, s.open && !s.row, JSON.stringify(s.row));
    await page.click('[data-bm-pop-unit="ayah"]');
    res = await save(page);
    check(`${tag} INERT: ...picking This āyah returns unitId "ayah" and no range or unitKey`, !!res && res.unitId === "ayah" && !("range" in res) && !("unitKey" in res), JSON.stringify(res));

    // A lone range unit.
    await openDialog(page, { defaultName: "x", units: [RANGE] });
    s = await state(page);
    check(`${tag} POSITIVE CONTROL: a range unit shows From and To`, !!s.row && s.row.shown && !!s.from && !!s.to, JSON.stringify(s.row));
    check(`${tag} the fields are labelled "${T[lang].from}" / "${T[lang].to}"`, s.fromLabel === T[lang].from && s.toLabel === T[lang].to, `${s.fromLabel} | ${s.toLabel}`);
    check(`${tag} both are finger-sized (>= 40px) and inside the screen; the dialog too, no sideways scroll`, !!s.from && s.from.h >= 39.5 && s.to.h >= 39.5 && s.from.l >= 0 && s.to.r <= s.vw + 0.5 && s.pop.l >= 0 && s.pop.r <= s.vw + 0.5 && s.pop.t >= 0 && s.pop.b <= s.vh + 0.5 && s.sw <= s.vw, JSON.stringify({ from: s.from, to: s.to, pop: s.pop, sw: s.sw }));
    check(`${tag} the Name starts as the range: "Al-Baqarah ${dg(lang, "255–257")}"`, s.name === `Al-Baqarah ${dg(lang, "255–257")}`, s.name);
    await setRange(page, 255, 260);
    s = await state(page);
    check(`${tag} changing To changes the Name (not typed yet)`, s.name === `Al-Baqarah ${dg(lang, "255–260")}`, s.name);
    // Invalid: From after To.
    await setRange(page, 260, 255);
    res = await save(page);
    s = await state(page);
    check(`${tag} From after To is refused in words, the dialog stays open`, res === undefined && s.open && s.error === T[lang].order, `${s.error} | ${JSON.stringify(res)}`);
    // Invalid: past the surah's last āyah.
    await setRange(page, 280, 290);
    res = await save(page);
    s = await state(page);
    check(`${tag} past the last āyah (286) is refused in words`, res === undefined && s.open && s.error === T[lang].max, `${s.error} | ${JSON.stringify(res)}`);
    // Valid save.
    await setRange(page, 255, 257);
    s = await state(page);
    check(`${tag} correcting the range clears the message`, s.error === "", s.error);
    res = await save(page);
    check(`${tag} Save returns range { surah 2, from 255, to 257 } and unitKey range:2:255-257`, !!res && res.unitId === "range" && res.range?.surah === 2 && res.range?.from === 255 && res.range?.to === 257 && res.unitKey === "range:2:255-257", JSON.stringify(res));
    // A typed Name is kept.
    await openDialog(page, { units: [RANGE] });
    await page.fill("[data-bm-pop-name]", "My range");
    await setRange(page, 1, 5);
    s = await state(page);
    check(`${tag} a typed Name is kept when the range changes`, s.name === "My range", s.name);
    res = await save(page);
    check(`${tag} ...and saved with that range (range:2:1-5)`, !!res && res.name === "My range" && res.unitKey === "range:2:1-5", JSON.stringify(res));

    // Among other units: hidden until picked.
    await openDialog(page, { defaultName: "Al-Baqarah", units: [{ id: "unit", label: "Surah", defaultName: "Al-Baqarah" }, RANGE] });
    s = await state(page);
    check(`${tag} among other units the range fields are hidden until the range is picked`, !!s.row && !s.row.shown, JSON.stringify(s.row));
    await page.click('[data-bm-pop-unit="range"]');
    s = await state(page);
    check(`${tag} ...picking the range shows them and names the range`, !!s.row && s.row.shown && s.name === `Al-Baqarah ${dg(lang, "255–257")}`, `${JSON.stringify(s.row)} ${s.name}`);
    await page.click('[data-bm-pop-unit="unit"]');
    res = await save(page);
    check(`${tag} ...picking the surah again hides them and returns no range`, !!res && res.unitId === "unit" && !("range" in res) && !("unitKey" in res), JSON.stringify(res));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|fonts\.g/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) { check(`${tag} flow ran`, false, String(e).split("\n")[0]); }
  await ctx.close();
}

// A saved range bookmark: listed by name, in the Bookmark menu, and opened at its first āyah as the Range unit.
const RB = { id: "bmR", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Al-Baqarah 255–257", position: "range:2:255-257", folderId: null, removed: false,
  settings: { unitType: "range", surahNum: 2, ayahNum: 255, rangeFrom: 255, rangeTo: 257, tajweedOn: false, wbwOn: false, rootsOn: false, mushafOn: false }, createdAt: "2026-10-16T05:00:00.000Z" };
const SEED = `DATA.bookmarks[0].saved.push(${JSON.stringify(RB)});`;
for (const w of [390, 1440]) {
  const tag = `[en ${w}] saved range`;
  {
    const { ctx, page } = await open({ w, seed: SEED, path: "/app/bookmarks.html" });
    await page.waitForTimeout(800);
    const row = await page.evaluate(() => { const a = [...document.querySelectorAll("a")].find((x) => /bookmark=bmR\b/.test(x.getAttribute("href") || "")); if (!a) return null; let r = a.parentElement; while (r && r !== document.body && !/Al-Baqarah 255–257/.test(r.textContent) && r.querySelectorAll("a[href*='bookmark=']").length <= 1) r = r.parentElement; return { link: a.textContent.trim(), href: a.getAttribute("href"), row: r ? r.textContent.replace(/\s+/g, " ").trim().slice(0, 120) : null, own: !!r && r.querySelectorAll("a[href*='bookmark=']").length === 1 }; });
    // The row's link says "Open"; its name is in the same row (and only this bookmark's link is in that row).
    check(`${tag}: bookmarks.html lists it by name, with an Open link to ?bookmark=bmR`, !!row && row.own && /Al-Baqarah 255–257/.test(row.row), JSON.stringify(row));
    await page.click("details.nav-cat-bookmark > summary").catch(() => {});
    await page.waitForTimeout(400);
    const nav = await page.evaluate(() => { const a = document.querySelector('[data-bm-open-id="bmR"]'); return a ? { name: a.querySelector(".nav-bm-name")?.textContent.trim(), href: a.getAttribute("href") } : null; });
    check(`${tag}: the Bookmark menu shows its name and opens ?bookmark=bmR`, !!nav && nav.name === "Al-Baqarah 255–257" && /bookmark=bmR\b/.test(nav.href), JSON.stringify(nav));
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ w, seed: SEED, path: "/app/quranrevival.html?bookmark=bmR" });
    await page.waitForTimeout(1800);
    const end = await page.evaluate(() => ({ surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value, unit: document.getElementById("unitTypeSelect")?.value }));
    check(`${tag}: opening it lands on Al-Baqarah, āyah 255, as the Range unit`, end.surah === "2" && end.ayah === "255" && end.unit === "range", JSON.stringify(end));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Bookmark a range of āyāt (dialog, list, open): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
