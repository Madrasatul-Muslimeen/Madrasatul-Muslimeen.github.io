// The Owner, 9 Oct 2026, with a phone screenshot of the Read view opened from a bookmark:
//   "This screen came from bookmark. It was a listening bookmark. Expected it will auto play, but it didn't.
//    Then, there's no button for attaching this Ayah to QCR."
// (1) A bookmark made while listening carries `listening: true`; opening it starts the recitation at its āyah. Where the
//     browser refuses sound without a tap on this page (a phone, as a rule), one "▶ Continue listening" button is
//     offered instead of an error, and pressing it plays. A bookmark NOT made while listening plays nothing.
// (2) The Read view's ⋮ menu has "📚 QCR collection(s)…" (the Āyah card already had it): the attach ticks open, a tick
//     files the āyah (the write is read back from the stub), and Back returns to the āyah.
// Audio is a generated silent WAV served for every recitation file (this sandbox reaches no audio host).
// Run from the repository root, serve.js on :8080.
//   --mutate=noresume   opening a listening bookmark does not resume   -> the autoplay check fails
//   --mutate=nobutton   a blocked start shows no button                -> the blocked-start checks fail
//   --mutate=noflag     the bookmark does not remember listening       -> the capture check fails
//   --mutate=noqcr      the ⋮ menu's QCR item does nothing             -> the QCR checks fail
//   --mutate=nows       the writing sheet has no 🔖                       -> the writing-sheet bookmark checks fail
//   --mutate=wsreopen   a "writing" bookmark does not reopen the sheet  -> the reopen check fails
// (3) The Owner, 9 Oct 2026, on the writing sheet: "Need a bookmark button here." 🔖 saves a bookmark (the usual naming
//     box, shown ON TOP of the sheet) with view "writing", and opening such a bookmark reopens the writing sheet.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noresume: ["quranrevival.html", "      if (position && settings?.listening) await resumeListeningFromBookmark(settings);\n", "\n"],
  // The button has two ways in (the refusal handler, and a fallback a beat later): the mutation empties the one function
  // both call, so neither can show it.
  nobutton: ["quranrevival.html", "    function showContinueListening() {\n", "    function showContinueListening() { return;\n"],
  noflag: ["quranrevival.html", ', listening: isPlaying() || isPaused() };', " };"],
  nows: ["quranrevival.html", "          onBookmark: () => toggleAyahBookmark(", "          onBookmarkOff: () => toggleAyahBookmark("],
  wsreopen: ["quranrevival.html", '      else if (position && settings?.view === "writing") { openReadingScreen(); await openWritingSheetForCurrentUnit(); }\n', "\n"],
  noqcr: ["js/ayah-note-renderer.js", "      onQcr?.(unitKey);", "      void unitKey;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// Two seconds of silence, 8 kHz mono 16-bit: a real, playable file.
function silentWav(seconds = 2, rate = 8000) {
  const n = seconds * rate, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); return b;
}
const WAV = silentWav();
const bookmarkSeed = (listening) => `
DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {}, folders: [],
  saved: [{ id: "b1", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Listening spot", position: "ayah:1:2", folderId: null, removed: false,
    settings: { view: "read", unitType: "ayah", surahNum: 1, ayahNum: 2, trackableId: "tafsir", ${listening ? "listening: true" : "listening: false"} }, createdAt: "2026-10-09T00:00:00.000Z" }] }];`;
// Every media element's play() is recorded, so "is it playing?" is read off the real element.
const PLAY_SPY = () => {
  const orig = HTMLMediaElement.prototype.play;
  window.__plays = [];
  HTMLMediaElement.prototype.play = function (...a) {
    if (this.src && !this.src.startsWith("data:")) { window.__plays.push(this.src); window.__media = this; }
    return orig.apply(this, a);
  };
  window.__dialogs = 0;
};
const playing = (P) => P.evaluate(() => !!window.__media && !window.__media.paused && !window.__media.error);
const btnState = (P) => P.evaluate(() => { const b = document.getElementById("continueListeningBtn"); return b && !b.hidden ? { text: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) } : null; });

async function start(browser, { lang, width, listening }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 }, extraSeedJs: bookmarkSeed(listening) });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route(/\.(mp3|ogg|m4a|opus)(\?.*)?$/i, (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: WAV }));
  await ctx.addInitScript(PLAY_SPY);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html?bookmark=b1");
  P.on("dialog", (d) => { P.__dialogs = (P.__dialogs ?? 0) + 1; d.dismiss().catch(() => {}); });
  return { ctx, P, errors };
}
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e));

// --- (1a) autoplay allowed (a desktop that has been used before, or the harness default) ---------------------------
{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
  for (const [lang, width] of [["en", 1280], ["bn", 390]]) {
    const tag = `[autoplay allowed, ${lang} ${width}]`;
    const { ctx, P, errors } = await start(browser, { lang, width, listening: true });
    await P.waitForFunction(() => !!window.__media && !window.__media.paused, null, { timeout: 15000 }).catch(() => {});
    const plays = await P.evaluate(() => window.__plays.length);
    check(`${tag} a listening bookmark starts the recitation by itself`, (await playing(P)) && plays > 0, `plays ${plays}`);
    check(`${tag} ...and offers no extra button`, (await btnState(P)) === null, JSON.stringify(await btnState(P)));
    // The capture side: a bookmark made NOW (while playing) remembers it.
    const cap = await P.evaluate(async () => { const m = await import("/app/js/audio-player.js"); return m.isPlaying(); });
    check(`${tag} (the player itself reports playing)`, cap === true, String(cap));
    check(`${tag} no alerts, no page errors`, !(P.__dialogs > 0) && quiet(errors).length === 0, `${P.__dialogs ?? 0} | ${quiet(errors).slice(0, 2).join(" | ")}`);
    await ctx.close();
  }
  // Positive control: a bookmark not made while listening plays nothing.
  const { ctx, P } = await start(browser, { lang: "en", width: 1280, listening: false });
  await P.waitForTimeout(3000);
  check("[autoplay allowed] a bookmark NOT made while listening plays nothing and shows no button", (await P.evaluate(() => window.__plays.length)) === 0 && (await btnState(P)) === null);
  await ctx.close();
  await browser.close();
}

// --- (1b) autoplay refused without a tap (a phone) -------------------------------------------------------------------
{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=user-gesture-required"] });
  for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
    const tag = `[autoplay refused, ${lang} ${width}]`;
    const { ctx, P, errors } = await start(browser, { lang, width, listening: true });
    await P.waitForFunction(() => { const b = document.getElementById("continueListeningBtn"); return b && !b.hidden; }, null, { timeout: 15000 }).catch(() => {});
    const b = await btnState(P);
    check(`${tag} the browser refused: "▶ ${lang === "bn" ? "শোনা চালিয়ে যান" : "Continue listening"}" is offered, at least 44px tall`, !!b && b.text.includes(lang === "bn" ? "শোনা চালিয়ে যান" : "Continue listening") && b.h >= 44, JSON.stringify(b));
    check(`${tag} ...instead of an error dialog`, !(P.__dialogs > 0), String(P.__dialogs ?? 0));
    const top = await P.evaluate(() => { const b = document.getElementById("continueListeningBtn"); if (!b || b.hidden) return false; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && (el === b || b.contains(el)) && r.right <= innerWidth && r.left >= 0; });
    check(`${tag} ...on top and inside the screen`, top);
    if (b) await P.click("#continueListeningBtn");
    await P.waitForFunction(() => !!window.__media && !window.__media.paused, null, { timeout: 15000 }).catch(() => {});
    check(`${tag} pressing it plays, and it goes away`, (await playing(P)) && (await btnState(P)) === null, JSON.stringify(await btnState(P)));
    if (width === 390) await P.screenshot({ path: `/tmp/listen-bookmark-${lang}-${width}.png` });
    check(`${tag} no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
  await browser.close();
}

// --- (1c) the capture: a bookmark saved while listening stores listening: true ---------------------------------------
{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
  const { ctx, P } = await start(browser, { lang: "en", width: 1280, listening: true });
  await P.waitForFunction(() => !!window.__media && !window.__media.paused, null, { timeout: 15000 }).catch(() => {});
  // Corrected at review: the ★ on 1:2 is b1's own, so pressing it REMOVED b1, and the old regex matched b1's flag in
  // that write. Move to 1:3 (not bookmarked), play it, and save a NEW bookmark there while it plays.
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "3"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(800);
  await P.click("#readPlayBtn").catch(() => {});
  await P.waitForFunction(() => !!window.__media && !window.__media.paused, null, { timeout: 8000 }).catch(() => {});
  await P.evaluate(() => { window.__stubWriteData = []; });
  const saved = await P.evaluate(async () => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.getClientRects().length && /★|Bookmark this/.test(b.textContent + (b.title || "") + (b.getAttribute("aria-label") || "")));
    btn?.click();
    return !!btn;
  });
  await P.waitForTimeout(1500);
  // A bookmark form may ask for a name: confirm it with whatever save button it shows.
  await P.evaluate(() => { const s = [...document.querySelectorAll("button")].find((b) => b.getClientRects().length && /^(Save|Save bookmark|Add bookmark)$/i.test(b.textContent.trim())); s?.click(); });
  await P.waitForTimeout(1500);
  // Only the NEW entry counts: the write carries the whole saved list, and the seeded b1 already says listening: true.
  const fresh = await P.evaluate(() => (window.__stubWriteData ?? []).flatMap((w) => w.data?.saved ?? []).filter((e) => e && e.id !== "b1"));
  check("[capture] a bookmark saved while listening carries listening: true", saved && fresh.length > 0 && fresh.every((e) => e.position === "ayah:1:3" && e.settings?.listening === true), JSON.stringify(fresh).slice(0, 300));
  await ctx.close();
  await browser.close();
}

// --- (2) QCR from the Read view's ⋮ menu ----------------------------------------------------------------------------
// The Āyah card already had 📚 QCR (it opens the Note view's QCR panel on Attach); the Read view's ⋮ menu had none. It
// now has the same item: the attach ticks open, a tick files the āyah (the write read back), Back returns to 83:4.
{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [lang, width] of [["en", 390], ["bn", 1280]]) {
    const tag = `[QCR ⋮, ${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
    }
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
    await P.click("#tabReadBtn"); await P.waitForTimeout(400);
    await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "83"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="83:1"]'), null, { timeout: 15000 }).catch(() => {});
    await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "4"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:83:4"]'), null, { timeout: 15000 }).catch(() => {});
    await P.evaluate(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:83:4"] [data-qm-toggle]')?.click());
    await P.waitForTimeout(300);
    const item = await P.evaluate(() => { const b = document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:83:4"] [data-qm-qcr]'); if (!b) return null; const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), shown: r.width > 0 && r.height > 0 }; });
    check(`${tag} the Read view's ⋮ on 83:4 has "📚 ${lang === "bn" ? "QCR সংকলন(সমূহ)…" : "QCR collection(s)…"}"`, !!item && item.shown && item.text.includes(lang === "bn" ? "QCR সংকলন(সমূহ)…" : "QCR collection(s)…"), JSON.stringify(item));
    await P.evaluate(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:83:4"] [data-qm-qcr]')?.click());
    // Updated in place (decision 95, issue #722): the ⋮ QCR item opens the QCR pop-up (#qcrPopup), not the Note view; its
    // way back is the pop-up's own ← Back (nothing was navigated, so closing it IS being back on 83:4).
    await P.waitForFunction(() => [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].some((c) => c.getClientRects().length), null, { timeout: 12000 }).catch(() => {});
    const panel = await P.evaluate(() => ({ boxes: [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].filter((c) => c.getClientRects().length).length }));
    check(`${tag} ...it opens the QCR attach ticks for 83:4`, panel.boxes >= 10, JSON.stringify(panel));
    await P.evaluate(() => { window.__stubWriteData = []; });
    const id = await P.evaluate(() => { const cb = [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].find((c) => c.getClientRects().length && !c.checked); if (!cb) return null; cb.click(); return cb.dataset.noteCollectionToggle; });
    await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => /ayahCollections/.test(w.col ?? "")), null, { timeout: 8000 }).catch(() => {});
    const w1 = await P.evaluate(() => (window.__stubWriteData || []).filter((w) => /ayahCollections/.test(w.col ?? "")).map((w) => JSON.stringify(w.data)).join("|"));
    check(`${tag} ticking a collection files ayah:83:4 into it (the write is read back)`, !!id && w1.includes("ayah:83:4") && w1.includes(id), w1.slice(0, 160));
    if (width === 390) await P.screenshot({ path: `/tmp/qcr-menu-${lang}-${width}.png` });
    const back = await P.evaluate(() => document.querySelector("#qcrPopup [data-qcr-pop-back]")?.textContent.trim() ?? null);
    check(`${tag} a way back is shown`, !!back, String(back));
    if (back) { await P.click("#qcrPopup [data-qcr-pop-back]"); await P.waitForTimeout(1200); }
    const landed = await P.evaluate(() => ({ view: !!document.querySelector('#readView [data-ayah-num-badge="83:4"]')?.getClientRects().length, ayah: document.getElementById("ayahSelect")?.value }));
    check(`${tag} ...and Back returns to 83:4 in the Read view`, landed.view && landed.ayah === "4", JSON.stringify(landed));
    check(`${tag} no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
  await browser.close();
}

// --- (3) the writing sheet's 🔖 ------------------------------------------------------------------------------------
{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
  const FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
  const mushafRoutes = async (ctx) => {
    await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
      const u = r.request().url();
      if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
      if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
      return r.abort();
    });
    await ctx.route(`${FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
    await ctx.route("**/archive.org/**", (r) => r.abort());
  };
  const mut = async (ctx) => { if (!MUTATE) return; const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error("mutation anchor missing"); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); }); };
  for (const [lang, width] of [["en", 390], ["bn", 1280]]) {
    const tag = `[writing sheet, ${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
    await mushafRoutes(ctx); await mut(ctx);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "83"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForTimeout(1500);
    if (!(await P.evaluate(() => document.getElementById("tabWritingBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn").catch(() => {}); await P.waitForTimeout(200); }
    await P.evaluate(() => document.getElementById("tabWritingBtn")?.click());
    await P.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page"), null, { timeout: 15000 }).catch(() => {});
    const b = await P.evaluate(() => { const x = document.querySelector('#writingSheet [data-ws="bookmark"]'); if (!x) return null; const r = x.getBoundingClientRect(); const row2 = document.querySelector("#writingSheet .ws-row2").getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), inRow2: r.top >= row2.top - 1 && r.bottom <= row2.bottom + 1, inside: r.right <= innerWidth + 0.5 && r.left >= -0.5, ox: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    check(`${tag} the writing sheet has a 🔖, in its second row, at least 40px, on screen`, !!b && b.inRow2 && b.w >= 39.5 && b.h >= 39.5 && b.inside && b.ox <= 0, JSON.stringify(b));
    if (b) {
      await P.evaluate(() => { window.__stubWriteData = []; });
      await P.click('#writingSheet [data-ws="bookmark"]');
      await P.waitForFunction(() => !!document.querySelector(".bm-popover [data-bm-pop-save]"), null, { timeout: 8000 }).catch(() => {});
      const onTop = await P.evaluate(() => { const s = document.querySelector(".bm-popover [data-bm-pop-save]"); if (!s) return false; const r = s.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === s || s.contains(el); });
      check(`${tag} 🔖 opens the naming box ON TOP of the sheet`, onTop);
      if (onTop) await P.click(".bm-popover [data-bm-pop-save]");
      await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "bookmarks"), null, { timeout: 8000 }).catch(() => {});
      const wr = await P.evaluate(() => JSON.stringify((window.__stubWriteData || []).filter((w) => w.col === "bookmarks").map((w) => w.data)));
      check(`${tag} ...Save writes a bookmark that reopens on the writing sheet (view "writing")`, /"view":"writing"/.test(wr), wr.slice(0, 200));
      const pressed = await P.evaluate(() => document.querySelector('#writingSheet [data-ws="bookmark"]')?.getAttribute("aria-pressed"));
      check(`${tag} ...and the 🔖 shows it is saved`, pressed === "true", String(pressed));
      if (width === 390) await P.screenshot({ path: `/tmp/ws-bookmark-${lang}-${width}.png` });
    }
    check(`${tag} no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
  // Opening a "writing" bookmark reopens the writing sheet.
  const ctx = await newContext(browser, { appLang: null, banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: `
DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {}, folders: [],
  saved: [{ id: "bw", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "✍ Al-Mutaffifin", position: "surah:83", folderId: null, removed: false,
    settings: { view: "writing", unitType: "surah", surahNum: 83, ayahNum: 1, trackableId: "tafsir" }, createdAt: "2026-10-09T00:00:00.000Z" }] }];` });
  await mushafRoutes(ctx); await mut(ctx);
  const { page: P } = await openPage(ctx, "/app/quranrevival.html?bookmark=bw");
  await P.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page"), null, { timeout: 15000 }).catch(() => {});
  const reopened = await P.evaluate(() => ({ sheet: !!document.querySelector("#writingSheet .ws-page"), unit: document.querySelector('#writingSheet [data-ws="unit"]')?.textContent ?? "" }));
  check("[writing sheet] opening a writing bookmark reopens the writing sheet on Al-Mutaffifin", reopened.sheet && /Mutaffifin/.test(reopened.unit), JSON.stringify(reopened));
  await ctx.close();
  await browser.close();
}
console.log(`\n==== Listening bookmark, QCR from the ⋮ menu, the writing sheet 🔖: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
