// Mushaf-mode audio-follow: the recitation moving to an āyah whose page is
// OFF SCREEN must actually scroll #pageViewContainer to it. RENDERED
// acceptance QA in a real browser, committed to this repository (not one of
// this project's own ad-hoc, un-checked-in scripts).
//
// Issue #113, task 5762932654's own Gate B: "Mushaf audio-follow off-screen
// āyah targeting (setActiveAyah() uses inline:'nearest' in the RTL
// scroll-snap container, flagged by #139)". PR #139's own report measured,
// for the SAME #pageViewContainer, that `inline: "nearest"` never moves
// `scrollLeft` at all (`scroll-snap-type: x mandatory` + `direction: rtl`),
// and fixed the word-card jump's own targeting (scrollToAyahIfRendered())
// to `inline: "start"`. `setActiveAyah()` -- the audio/drill "follow the
// recitation" primitive introduced round 28 for exactly this -- was left
// carrying the old `inline: "nearest"`, flagged there as "a plausible
// PRE-EXISTING, LIVE defect for the same container whenever the sounding
// āyah is on a page not already on screen". This suite reproduces that on
// the code as PR #139 left it, and is written against the fix applied here
// (hifz-renderer.js's setActiveAyah(), now `inline: "start"`, marked
// "Issue #113").
//
// THE FIXTURE, and why this reaches setActiveAyah() rather than the
// word-card's own scrollToAyahIfRendered(): setActiveAyah() is driven by
// setAyahChangeHandler()'s callback, which only ever fires from REAL
// playback (audio-player.js's playOneAndWait()/playCurrentRangeAyah(), both
// call onAyahChange() -- read directly, not assumed). Getting there for real
// needs a genuine Play press through the actual drill sequencer, not a
// direct function call (no such test hook exists, and adding one would be
// testing something the app itself cannot reach). So this suite:
//   -- intercepts the Mushaf JSON/font routes exactly as
//      quran-word-card-mushaf-scroll.mjs already does (a SYNTHETIC two-page
//      Mushaf: surah 2 āyah 1 on page 3, āyah 10 on page 45 -- fabricated
//      page numbers, same as that suite's own fabricated TESTGLYPH markers;
//      only the Mushaf GLYPH layer is mocked, real local Quran ayah data is
//      untouched);
//   -- intercepts the Arabic reciter's own perAyahUrl route
//      (archive.org/download/abdullah-ali-basfar.ayahbyayah/**, the same
//      host this project's own standing lessons already record as
//      unreliable from this sandbox) and answers with a genuine, tiny,
//      decodable silent WAV built in this file -- no TLS bypass anywhere:
//      page.route() answers a same-origin-different-host request before it
//      ever leaves the browser's own network stack, exactly the established
//      technique the sibling suite already uses for the Mushaf JSON;
//   -- selects Study Unit "Range of Ayahs", surah 2, āyahs 1-10 (a SHORT
//      real range -- ten REAL local ayahs, not a fabricated count -- kept
//      short only so ten real playOneAndWait() steps finish quickly; āyahs
//      2-9 carry no synthetic glyph entry at all, so setActiveAyah() is a
//      correct, silent no-op for every one of them, exactly as its own
//      doc comment says: "No-op if that ayah isn't part of the
//      currently-rendered page(s)");
//   -- presses the real "▶ Play" button, which is `playCurrentSelection()`
//      -> `playDrill()` -> `playOneAndWait()` per āyah, unmodified. NO
//      PLAYBACK-TIMING CODE IS CHANGED ANYWHERE by this task -- only the
//      scroll TARGET inside setActiveAyah() (see hifz-renderer.js's own
//      comment on that change); mode stays the app's own default ("Each
//      Ayah", repeat ×1), and Range is used exactly as the feature already
//      is -- nothing here assumes or changes what a Range unit means for
//      Mastery/tracking, only that it plays ayah-by-ayah, which it already
//      does.
//
// No write of any kind happens on this path (asserted below) and nothing
// here touches version.js, bn.js, nav.js, records.js, activity.js,
// catalogue-data.js, shell.css, any tools/i18n-verify/{behaviour,harness,
// firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}
// .mjs, docs/governance/, firestore.rules, firebase.json, tests/firestore/,
// tools/firestore-emulator/, or .github/workflows/.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Same splash-interception hardening this whole stack now carries (PR #135's
// own finding, cascaded forward) -- app/js/splash.js is untouched here too.
async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove());
    });
    try {
      await page.click(selector, { timeout: 4000 });
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
const RECITER_AUDIO_BASE = "https://archive.org/download/abdullah-ali-basfar.ayahbyayah/";

const ORIGIN_MARKER = "TESTGLYPH-2-1";
const DEST_MARKER = "TESTGLYPH-2-10";

// Deliberately fabricated page numbers (3 and 45) -- this fixture only needs
// TWO pages that are genuinely far apart in DOM order, not a real Mushaf
// layout. Every āyah in between (2-9) carries no entry at all, on purpose:
// see the module header for why that must be a silent no-op.
const SYNTHETIC_MUSHAF_DATA = {
  "3": [{ type: "ayah", words: [{ g: ORIGIN_MARKER, loc: "2:1:1" }] }],
  "45": [{ type: "ayah", words: [{ g: DEST_MARKER, loc: "2:10:1" }] }],
};

/** A genuinely decodable, genuinely tiny silent WAV (8kHz mono 8-bit PCM,
 *  120ms) -- built here rather than sourced, so serving it needs no network
 *  access of its own and no TLS trust decision at all. 8-bit unsigned PCM
 *  silence is the byte value 128; this project's own unlockAudio() already
 *  ships a zero-length WAV as a data: URI for the same reason (a real,
 *  decodable clip, not a mock object) -- this is the same technique at a
 *  length long enough for 'ended' to be a genuine, sampleable event rather
 *  than an instant no-op. */
function makeSilentWav(durationMs = 120, sampleRate = 8000) {
  const numSamples = Math.round((sampleRate * durationMs) / 1000);
  const buf = Buffer.alloc(44 + numSamples);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + numSamples, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate, 28); // byte rate = sampleRate * channels * bytesPerSample(1)
  buf.writeUInt16LE(1, 32); // block align
  buf.writeUInt16LE(8, 34); // bits per sample
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(numSamples, 40);
  buf.fill(128, 44); // silence, 8-bit unsigned PCM
  return buf;
}
const SILENT_WAV = makeSilentWav();

async function installFixture(ctx) {
  let audioRequests = 0;
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  // The per-page glyph fonts are irrelevant to this suite (scroll targeting,
  // not glyph rendering) -- aborted exactly like the sibling suite's own
  // fixture, which already proved hifz-renderer.js's ensurePageFont()
  // continues correctly without one.
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  await ctx.route(`${RECITER_AUDIO_BASE}**`, (route) => {
    audioRequests++;
    route.fulfill({ status: 200, contentType: "audio/wav", body: SILENT_WAV });
  });
  return { audioRequests: () => audioRequests };
}

async function setupRangeAndMushaf(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "range"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const f = document.getElementById("rangeFromSelect"); if (f.querySelector('option[value="1"]')) { f.value = "1"; f.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const to = document.getElementById("rangeToSelect"); if (to.querySelector('option[value="10"]')) { to.value = "10"; to.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
}

for (const lang of ["en", "bn"]) {
  console.log(`\n=== Mushaf audio-follow, off-screen āyah scroll, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const fixture = await installFixture(ctx);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  await setupRangeAndMushaf(page);

  const bothPagesRendered = await page.waitForFunction(
    ([o, d]) => document.body.textContent.includes(o) && document.body.textContent.includes(d),
    [ORIGIN_MARKER, DEST_MARKER],
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
  check(`${lang} precondition: both the origin and destination synthetic pages rendered (route really intercepted)`, bothPagesRendered);
  if (!bothPagesRendered) { await ctx.close(); continue; }

  const initialGeom = await page.evaluate((marker) => {
    const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
    if (!spans.length) return { found: false };
    const r = spans[0].getBoundingClientRect();
    return { found: true, inViewport: r.left >= -2 && r.right <= window.innerWidth + 2 };
  }, DEST_MARKER);
  check(`${lang} precondition: the destination āyah's own page is genuinely OFF SCREEN before playback starts (real gap for GATE B to close)`, initialGeom.found === true && initialGeom.inViewport === false, JSON.stringify(initialGeom));

  const scrollBefore = await page.evaluate(() => document.getElementById("pageViewContainer")?.scrollLeft ?? null);

  const playBtn = await page.locator("#readPlayBtn").count();
  check(`${lang} the reading screen's Play control is present`, playBtn > 0, String(playBtn));
  if (playBtn === 0) { await ctx.close(); continue; }
  await clickSafely(page, "#readPlayBtn");

  // Ten real playOneAndWait() steps (āyahs 1-10, one reciter, repeat x1) --
  // each a genuine network round trip (through the intercepted route) plus a
  // genuine ~120ms decode+play+ended cycle. Bounded generously rather than
  // guessed: polls real DOM state (the destination word actually marked
  // "playing"), not a fixed sleep.
  const destMarked = await page.waitForFunction(
    (marker) => {
      const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
      return spans.length > 0 && spans[0].classList.contains("playing");
    },
    DEST_MARKER,
    { timeout: 20000 },
  ).then(() => true).catch(() => false);
  check(`${lang} the whole 10-āyah drill reached the destination āyah (setActiveAyah() was called for it, through real playback)`, destMarked);

  // setActiveAyah() calls scrollIntoView({ behavior: "smooth" }), which is
  // asynchronous and animates over real wall-clock time -- reading
  // getBoundingClientRect() the instant the "playing" class lands (the check
  // just above) samples MID-ANIMATION on a genuine fix and would misreport
  // it as failed. Poll for the animation to actually finish (scrollLeft
  // settling), bounded rather than guessed, the same way this stack's own
  // sibling suite waits for an async render rather than sampling once.
  await page.waitForFunction(
    () => {
      const c = document.getElementById("pageViewContainer");
      if (!c) return false;
      if (c.__lastScrollLeft === undefined) { c.__lastScrollLeft = c.scrollLeft; c.__stableTicks = 0; return false; }
      if (c.scrollLeft === c.__lastScrollLeft) { c.__stableTicks = (c.__stableTicks || 0) + 1; }
      else { c.__lastScrollLeft = c.scrollLeft; c.__stableTicks = 0; }
      return c.__stableTicks >= 3;
    },
    { timeout: 3000, polling: 50 },
  ).catch(() => {}); // a genuine "never scrolled" is what GATE B itself must then report, not this wait

  const finalGeom = await page.evaluate((marker) => {
    const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
    if (!spans.length) return { found: false };
    const r = spans[0].getBoundingClientRect();
    const inViewport = r.top >= -2 && r.left >= -2 && r.bottom <= window.innerHeight + 2 && r.right <= window.innerWidth + 2;
    return { found: true, inViewport, rect: { top: r.top, left: r.left, bottom: r.bottom, right: r.right }, win: { w: window.innerWidth, h: window.innerHeight } };
  }, DEST_MARKER);
  check(`${lang} the destination āyah's own word span still exists`, finalGeom.found === true, JSON.stringify(finalGeom));
  check(`${lang} GATE B: the off-screen destination āyah is actually SCROLLED INTO VIEW once the recitation reaches it (this is the fix)`, finalGeom.inViewport === true, JSON.stringify(finalGeom));

  const scrollAfter = await page.evaluate(() => document.getElementById("pageViewContainer")?.scrollLeft ?? null);
  check(`${lang} #pageViewContainer's own scrollLeft genuinely moved (not merely a class toggle with no scroll)`, scrollAfter !== scrollBefore, JSON.stringify({ scrollBefore, scrollAfter }));

  const originStillMarked = await page.evaluate((marker) => {
    const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
    return spans.length > 0 && spans[0].classList.contains("playing");
  }, ORIGIN_MARKER);
  check(`${lang} the origin āyah's own "playing" mark was correctly cleared once a later āyah took it over (setActiveAyah()'s own un-mark path, unmodified)`, originStillMarked === false);

  check(`${lang} a real per-ayah audio request was actually made for every one of the ten āyahs (proves this is genuine playback, not a mocked callback)`, fixture.audioRequests() >= 10, `audioRequests=${fixture.audioRequests()}`);

  const writes = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
  check(`${lang} the whole audio-follow drill writes nothing`, writes === 0, `writes=${writes}`);

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no unexpected page errors across the audio-follow drill`, real.length === 0, real.slice(0, 3).join(" | "));

  await ctx.close();
}

// ---------------------------------------------------------------------------
// Regression control: the SAME "off-screen āyah during playback" scenario
// with Mushaf OFF must be completely unaffected -- setActiveAyah() is only
// ever called when mushafToggle.checked (app/quranrevival.html's own
// setAyahChangeHandler callback), so the ordinary flow-view "now-playing"
// path (markPlayingAyah()) is a structurally different branch this fix
// cannot touch. Checked here anyway, in the SAME file, so a future change
// that breaks one while fixing the other cannot hide behind "that's a
// different suite" -- the same rule quran-word-card-mushaf-scroll.mjs's own
// header already states.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Regression: the ordinary (non-Mushaf) flow-view now-playing path is unaffected ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const fixture = await installFixture(ctx);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "range"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const f = document.getElementById("rangeFromSelect"); if (f.querySelector('option[value="1"]')) { f.value = "1"; f.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const to = document.getElementById("rangeToSelect"); if (to.querySelector('option[value="10"]')) { to.value = "10"; to.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(800);
  // Mushaf toggle left OFF, deliberately -- the ordinary flow view renders.
  const flowRendered = await page.evaluate(() => document.querySelectorAll(".page-flow-ayah").length > 0);
  check("precondition: the ordinary flow view rendered (Mushaf off)", flowRendered);
  if (flowRendered) {
    await clickSafely(page, "#readPlayBtn");
    const advanced = await page.waitForFunction(
      () => document.querySelector('.page-flow-ayah[data-ayah="10"]')?.classList.contains("now-playing"),
      { timeout: 20000 },
    ).then(() => true).catch(() => false);
    check("Mushaf-off: the drill still reaches and marks the destination āyah via the ordinary now-playing path (unaffected by this round's Mushaf-only fix)", advanced);
  }
  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check("no page errors in the Mushaf-off regression control", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
