// The Owner, 9 Oct 2026, with a phone screenshot of the Read view opened from a bookmark:
//   "This screen came from bookmark. It was a listening bookmark. Expected it will auto play, but it didn't.
//    Then, there's no button for attaching this Ayah to QCR."
// (1) A bookmark made while listening carries `listening: true`; opening it starts the recitation at its āyah. Where the
//     browser refuses sound without a tap on this page (a phone, as a rule), one "▶ Continue listening" button is
//     offered instead of an error, and pressing it plays. A bookmark NOT made while listening plays nothing.
// (2) The Āyah card has a 🗂 QCR fold with the Note view's collection ticks; a tick files the āyah (the write is read
//     back from the stub), a second tick unfiles it.
// Audio is a generated silent WAV served for every recitation file (this sandbox reaches no audio host).
// Run from the repository root, serve.js on :8080.
//   --mutate=noresume   opening a listening bookmark does not resume   -> the autoplay check fails
//   --mutate=nobutton   a blocked start shows no button                -> the blocked-start checks fail
//   --mutate=noflag     the bookmark does not remember listening       -> the capture check fails
//   --mutate=noqcr      the Āyah card has no QCR fold                  -> the QCR checks fail
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
  nobutton: ["quranrevival.html", '      if (meta.name === "NotAllowedError") { showContinueListening(); return; }', '      if (meta.name === "NotAllowedError") { return; }'],
  noflag: ["quranrevival.html", ', listening: isPlaying() || isPaused() };', " };"],
  noqcr: ["quranrevival.html", "        qcrHtml: qcrCollections ? renderQcrMembershipPopoverHtml(ayahSheetUnitKey) : null,\n", "\n"],
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
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
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
  // Save a new bookmark through the app's own ★ while it plays, then read the write.
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
  const writes = await P.evaluate(() => JSON.stringify(window.__stubWriteData ?? []));
  check("[capture] a bookmark saved while listening carries listening: true", saved && /"listening":true/.test(writes), writes.slice(0, 300));
  await ctx.close();
  await browser.close();
}

// --- (2) the Āyah card's 🗂 QCR fold ------------------------------------------------------------------------------------
{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [lang, width] of [["en", 390], ["bn", 1280]]) {
    const tag = `[QCR, ${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
    }
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
    await P.click("#tabReadBtn"); await P.waitForTimeout(400);
    await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "83"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="83:4"]'), null, { timeout: 15000 }).catch(() => {});
    await P.evaluate(() => document.querySelector('[data-ayah-num-badge="83:4"]')?.click());
    await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr] [data-note-collection-toggle]"), null, { timeout: 10000 }).catch(() => {});
    const fold = await P.evaluate(() => { const d = document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]"); return d ? { summary: d.querySelector("summary").textContent.trim(), boxes: d.querySelectorAll("[data-note-collection-toggle]").length, h: Math.round(d.querySelector("summary").getBoundingClientRect().height) } : null; });
    check(`${tag} the Āyah card (83:4) has a 🗂 ${lang === "bn" ? "QCR সংকলনসমূহ" : "QCR collections"} fold, with a tick per collection`, !!fold && fold.summary.includes(lang === "bn" ? "QCR সংকলনসমূহ" : "QCR collections") && fold.boxes >= 10 && fold.h >= 44, JSON.stringify(fold));
    await P.evaluate(() => { document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]").open = true; window.__stubWriteData = []; });
    const id = await P.evaluate(() => { const cb = [...document.querySelectorAll("[data-ayah-sheet-qcr] [data-note-collection-toggle]")].find((c) => !c.checked); if (!cb) return null; cb.click(); return cb.dataset.noteCollectionToggle; });
    await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => /ayahCollections/.test(w.col ?? "")), null, { timeout: 8000 }).catch(() => {});
    const w1 = await P.evaluate((id) => (window.__stubWriteData || []).filter((w) => /ayahCollections/.test(w.col ?? "")).map((w) => JSON.stringify(w.data)).join("|"), id);
    check(`${tag} ticking a collection files ayah:83:4 into it (the write is read back)`, !!id && w1.includes("ayah:83:4") && w1.includes(id), w1.slice(0, 200));
    const keptOpen = await P.evaluate(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]")?.open);
    check(`${tag} ...and the fold stays open`, keptOpen === true);
    await P.evaluate(() => { window.__stubWriteData = []; });
    await P.evaluate((id) => document.querySelector(`[data-ayah-sheet-qcr] [data-note-collection-toggle="${id}"]`)?.click(), id);
    await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => /ayahCollections/.test(w.col ?? "")), null, { timeout: 8000 }).catch(() => {});
    const w2 = await P.evaluate((id) => { const col = (window.__stubWriteData || []).filter((w) => /ayahCollections/.test(w.col ?? "")).map((w) => w.data).pop(); const c = (col?.collections ?? []).find((x) => x.id === id); return c ? c.items.includes("ayah:83:4") : null; }, id);
    check(`${tag} unticking it takes ayah:83:4 out again`, w2 === false, String(w2));
    if (width === 390) await P.screenshot({ path: `/tmp/qcr-card-${lang}-${width}.png` });
    check(`${tag} no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
  await browser.close();
}
console.log(`\n==== Listening bookmark, and QCR on the Āyah card: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
