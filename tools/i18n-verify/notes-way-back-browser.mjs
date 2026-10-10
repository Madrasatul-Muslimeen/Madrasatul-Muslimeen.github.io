// Way-back sweep (decision 86, "always enable coming back to a view where it came from"): the three links that left
// for another page with no way back now carry back=1, and ← Back lands exactly where the reader was.
//   1. the Note view's ⋯ menu "📔 My Notes for this unit"  -> notes.html  -> ← Back: the SAME āyah, Note view open
//   2. the Āyah card's "Make a poster"                    -> notes.html  -> ← Back: the SAME āyah, Read view
//   3. Mapping My Journey's "Import Notes…"               -> import-notes.html -> ← Back: Mapping My Journey
// Link 2 needs "this āyah has an active Note"; the stub holds none, so that one lookup is pinned true by a route
// override (the only fixture override; it is named in the check text).
// Run from the repository root, serve.js on :8080.
//   --mutate=noback1 / noback2 / noback3   the link loses back=1               -> that link's Back checks fail
//   --mutate=noplace1                      the Note-menu link forgets the place -> its "lands on" check fails
//   --mutate=noplace2                      the poster forgets the place         -> its "lands on" check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noback1: ["quranrevival.html", "&label=${encodeURIComponent(ref)}&back=1`,\n      });", "&label=${encodeURIComponent(ref)}`,\n      });"],
  noback2: ["quranrevival.html", "&dawah=1&back=1`", "&dawah=1`"],
  noback3: ["journey-map.html", 'href="import-notes.html?back=1"', 'href="import-notes.html"'],
  noplace1: ["quranrevival.html", "      if (a) rememberQuranPlace(", "      if (false) rememberQuranPlace("],
  noplace2: ["quranrevival.html", "      rememberQuranPlace(unitKey);\n      location.href", "      location.href"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const FIXTURE = ["quranrevival.html", "ayahSheetHasPosterNote = rows.some((row) => row.note.status !== NOTE_STATUS.RETIRED);", "ayahSheetHasPosterNote = true;"];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width, look) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  const byFile = {};
  for (const [file, a, b] of [FIXTURE, MUTATE && MUT[MUTATE]].filter(Boolean)) (byFile[file] ??= []).push([a, b]);
  for (const [file, subs] of Object.entries(byFile)) {
    await ctx.route(`**/app/${file}*`, async (r) => {
      let src = fs.readFileSync(`app/${file}`, "utf8");
      for (const [a, b] of subs) {
        if (!src.includes(a)) { if (a === FIXTURE[1] || MUTATE) throw new Error(`mutation anchor missing in ${file}: ${a.slice(0, 40)}`); continue; }
        src = src.split(a).join(b);
      }
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src });
    });
  }
  return ctx;
}
const BACK = (bn) => (bn ? "← পেছনে" : "← Back");
const backState = (P) => P.evaluate(() => { const b = document.getElementById("notesBackBtn"); return b && !b.hidden && getComputedStyle(b).display !== "none" ? { text: b.textContent, h: b.getBoundingClientRect().height } : null; });

async function toAyah255(P) {
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await P.evaluate(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
}
const place = (P) => P.evaluate(() => ({ surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value,
  noteOpen: !document.getElementById("noteView")?.hidden && getComputedStyle(document.getElementById("noteView")).display !== "none" && document.getElementById("noteView").getBoundingClientRect().height > 0,
  noteText: document.getElementById("noteView")?.textContent ?? "",
  readOpen: !!document.getElementById("readView") && getComputedStyle(document.getElementById("readView")).display !== "none" && document.getElementById("readView").getBoundingClientRect().height > 0 }));

for (const [lang, width, look] of [["en", 390, "light"], ["bn", 390, "night"], ["en", 1280, "night"]]) {
  const bn = lang === "bn";
  const tag = `[${lang} ${width} ${look}]`;
  const ctx = await context(lang, width, look);

  // ---- 1. the Note view's ⋯ menu -> My Notes for this unit
  {
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await toAyah255(P);
    // UPDATED IN PLACE (decision 95, v10.03): the Āyah card's 📝 Note opens the Notes pane now, so the Note view (whose
    // ⋯ menu this section checks) is opened by its own Study-menu Note tab, on the same āyah.
    await P.evaluate(() => window.__dormantOpenNoteView());
    await P.waitForFunction(() => !document.getElementById("noteView")?.hidden && document.querySelector('#noteView [data-note-menu-toggle="more"]'), null, { timeout: 10000 });
    const before = await place(P);
    check(`${tag} (1) the Note view is open on 2:255 before leaving`, before.noteOpen && before.surah === "2" && before.ayah === "255", JSON.stringify({ ...before, noteText: "" }));
    await P.click('#noteView [data-note-menu-toggle="more"]');
    const href = await P.evaluate(() => document.querySelector('#noteView [data-note-menu="more"] a[href^="notes.html?"]')?.getAttribute("href"));
    check(`${tag} (1) My Notes for this unit: the href carries back=1`, new URLSearchParams((href ?? "").split("?")[1] ?? "").get("back") === "1", String(href));
    let went = true;
    await Promise.all([P.waitForURL(/notes\.html\?/, { timeout: 15000 }), P.click('#noteView [data-note-menu="more"] a[href^="notes.html?"]')]).catch(() => { went = false; });
    check(`${tag} (1) it opens the Notes page`, went);
    if (went) {
      await P.waitForFunction(() => document.getElementById("unitBanner")?.textContent.trim().length > 0, null, { timeout: 15000 }).catch(() => {});
      const b = await backState(P);
      check(`${tag} (1) the Notes page shows ${BACK(bn)}, 40px tall`, b?.text === BACK(bn) && b.h >= 40, JSON.stringify(b));
      if (b) {
        let back = true;
        await Promise.all([P.waitForURL(/quranrevival\.html/, { timeout: 15000 }), P.click("#notesBackBtn")]).catch(() => { back = false; });
        // UPDATED IN PLACE (decision 95, R3b): qpView=note now reopens the Read view with the Notes pane on the same unit.
        await P.waitForFunction(() => document.getElementById("readNotePane")?.hidden === false, null, { timeout: 25000 }).catch(() => {});
        const after = await place(P);
        const paneOn = await P.evaluate(() => document.getElementById("readNotePane")?.hidden === false);
        check(`${tag} (1) ← Back lands on the Qur'an page, 2:255, the Notes pane open on it (the Note view stays hidden)`, back && after.surah === "2" && after.ayah === "255" && after.readOpen && !after.noteOpen && paneOn, JSON.stringify({ ...after, noteText: "", paneOn, url: P.url() }));
      }
    }
    check(`${tag} (1) no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await P.close();
  }

  // ---- 2. the Āyah card's Make a poster
  {
    const { page: P } = await openPage(ctx, "/app/quranrevival.html");
    await toAyah255(P);
    await P.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
    await P.waitForSelector("[data-ayah-sheet] [data-ayah-sheet-poster]", { timeout: 8000 });
    await P.waitForTimeout(500);
    let went = true;
    await Promise.all([P.waitForURL(/notes\.html\?/, { timeout: 15000 }), P.click("[data-ayah-sheet] [data-ayah-sheet-poster]")]).catch(() => { went = false; });
    check(`${tag} (2) Make a poster opens the Notes page with dawah=1 and back=1`, went && /dawah=1/.test(P.url()) && /[?&]back=1\b/.test(P.url()), P.url());
    if (went) {
      await P.waitForFunction(() => document.getElementById("unitBanner")?.textContent.trim().length > 0, null, { timeout: 15000 }).catch(() => {});
      const b = await backState(P);
      check(`${tag} (2) the Notes page shows ${BACK(bn)}, 40px tall`, b?.text === BACK(bn) && b.h >= 40, JSON.stringify(b));
      if (b) {
        let back = true;
        await Promise.all([P.waitForURL(/quranrevival\.html/, { timeout: 15000 }), P.click("#notesBackBtn")]).catch(() => { back = false; });
        await P.waitForFunction(() => document.getElementById("readView")?.getBoundingClientRect().height > 0 && document.getElementById("ayahSelect")?.value === "255", null, { timeout: 25000 }).catch(() => {});
        const after = await place(P);
        check(`${tag} (2) ← Back lands on the Qur'an page at 2:255 in the Read view (no Note view forced open)`, back && after.surah === "2" && after.ayah === "255" && after.readOpen && !after.noteOpen, JSON.stringify({ ...after, noteText: "" }));
      }
    }
    await P.close();
  }

  // ---- 3. Mapping My Journey -> Import Notes…
  {
    const { page: P, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await P.waitForSelector('[data-bar-palette-toggle="pageMenu"]', { timeout: 15000 });
    await P.click('[data-bar-palette-toggle="pageMenu"]');
    const href = await P.evaluate(() => document.querySelector('a[href^="import-notes.html"]')?.getAttribute("href"));
    check(`${tag} (3) Import Notes…: the href carries back=1`, new URLSearchParams((href ?? "").split("?")[1] ?? "").get("back") === "1", String(href));
    let went = true;
    await Promise.all([P.waitForURL(/import-notes\.html/, { timeout: 15000 }), P.click('a[href^="import-notes.html"]')]).catch(() => { went = false; });
    check(`${tag} (3) it opens Import Notes`, went);
    if (went) {
      await P.waitForTimeout(500);
      // UPDATED IN PLACE (Architect review of #672): Import Notes already had a ← back link in its title; the round's
      // second Back button beside it was folded into that one link, which with back=1 goes back by history. One
      // back control on the page, 40px, on screen.
      const b = await P.evaluate(() => { const a = document.getElementById("backLink"); const r = a?.getBoundingClientRect(); return a && r.width > 0 ? { h: r.height, w: r.width, top: r.top, buttons: document.querySelectorAll("#notesBackBtn").length } : null; });
      check(`${tag} (3) Import Notes shows its one ← back link, 40px, on screen`, !!b && b.h >= 40 && b.top >= 0 && b.buttons === 0, JSON.stringify(b));
      if (b) {
        let back = true;
        await Promise.all([P.waitForURL(/journey-map\.html/, { timeout: 15000 }), P.click("#backLink")]).catch(() => { back = false; });
        await P.waitForSelector("#viewToggle", { timeout: 15000 }).catch(() => {});
        check(`${tag} (3) ← Back lands on Mapping My Journey`, back && (await P.evaluate(() => !!document.getElementById("viewToggle") && document.getElementById("viewToggle").getBoundingClientRect().height > 0)));
      }
    }
    check(`${tag} (3) no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await P.close();
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
