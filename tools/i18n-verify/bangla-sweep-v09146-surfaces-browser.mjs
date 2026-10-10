// Bangla sweep of the surfaces added in v09.143-v09.146 (issue #697): Explore -> Asma ul Husna with a Name open (cited
// āyāt, cited hadith, the "Back to <Name>" ways back), a listening bookmark opened where sound is refused, the Read
// view's ⋮ menu and its QCR ticks, and the writing sheet (🔖, the naming popover, the pop-out and its bar).
//
// Same method and the SAME scanner as the other sweeps (bangla-sweep-lib.mjs): each surface is opened for real in Bangla
// at 390px and 1280px, every visible text node and aria-label/title/placeholder is read for Latin-script interface
// words, and the suite asserts none. Qur'an and hadith text, transliteration and names are data (the lib's isData).
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/bangla-sweep-v09146-surfaces-browser.mjs
//   --list               print every Latin-script string found on each screen (READ it)
//   --mutate="<phrase>"  make the page's bn lookup miss that phrase (the sweep must fail and name it)
//   --shots=<dir>        save a screenshot of each surface into <dir>
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SCAN, leaksOf, DATA_ALLOWED } from "./bangla-sweep-lib.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const LIST = process.argv.includes("--list");
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), SHOTS = arg("shots");

// "Aa" is the text-size glyph on the Note bar (its aria-label is read separately and is translated).
DATA_ALLOWED.push(/^Aa$/);
async function sweep(P, screen, width) {
  // The QCR collection titles on the Note view's ticks are the catalogue's own names (qcr-data.js, scholarly
  // transliterations), data and not interface: marked lang="en" so the scanner treats them as data, like .qcr-list-title.
  await P.evaluate(() => document.querySelectorAll("#qcrPopup [data-note-collection-toggle]").forEach((c) => c.parentElement?.querySelectorAll("span").forEach((s) => s.setAttribute("lang", "en"))));
  const bnChars = await P.evaluate(() => (document.body.innerText.match(/[ঀ-৿]/g) || []).length);
  check(`bn ${width}: "${screen}" is rendered in Bangla (positive control)`, bnChars >= 10, `Bangla characters: ${bnChars}`);
  const leaks = leaksOf(await P.evaluate(SCAN));
  if (LIST) console.log(`[${width} ${screen}] ${leaks.length} Latin-script strings:\n` + leaks.map((l) => `    ${l.kind} <${l.where}> ${JSON.stringify(l.text)}`).join("\n"));
  check(`bn ${width}: "${screen}" shows no English interface text`, leaks.length === 0, JSON.stringify(leaks.slice(0, 8).map((l) => `${l.kind}:${l.text}`)));
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await P.screenshot({ path: `${SHOTS}/${width}-${screen.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png` }); }
}

const settle = (P, ms = 400) => P.waitForTimeout(ms);
const noSplash = (P) => P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
function silentWav(seconds = 2, rate = 8000) {
  const n = seconds * rate, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); return b;
}
const WAV = silentWav();
const LISTEN_SEED = `
DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {}, folders: [],
  saved: [{ id: "b1", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Listening spot", position: "ayah:1:2", folderId: null, removed: false,
    settings: { view: "read", unitType: "ayah", surahNum: 1, ayahNum: 2, trackableId: "tafsir", listening: true }, createdAt: "2026-10-09T00:00:00.000Z" }] }];`;

async function mk(br, width, extra = {}) {
  const ctx = await newContext(br, { appLang: "bn", banner: false, viewport: { width, height: 860 }, ...extra });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route(/\.(mp3|ogg|m4a|opus)(\?.*)?$/i, (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: WAV }));
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
    if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
    return r.abort();
  });
  await ctx.route(`${FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
  if (MUTATE) {
    await ctx.route("**/app/js/i18n/bn.js*", async (r) => {
      const src = fs.readFileSync("app/js/i18n/bn.js", "utf8");
      const key = JSON.stringify(MUTATE);
      if (!src.includes(key + ":")) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(key + ":").join(JSON.stringify("\u0000" + MUTATE) + ":") });
    });
  }
  return ctx;
}
async function openName(P, value, waitSel) {
  await noSplash(P);
  if (!(await P.evaluate(() => !!document.getElementById("asmaXSingleSelect")?.getClientRects().length))) {
    await P.evaluate(() => document.getElementById("tabExploreBtn")?.click()); await settle(P, 900);
    await P.evaluate(() => document.getElementById("explorePaletteAsmaBtn")?.click()); await settle(P, 1200);
  }
  await P.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 10000 }).catch(() => {});
  await P.selectOption("#asmaXSingleSelect", value).catch(() => {});
  await P.waitForFunction((s) => !!document.querySelector(s), waitSel, { timeout: 12000 }).catch(() => {});
  await settle(P, 500);
}
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const width of [390, 1280]) {
  // ---- 1. Explore -> Asma: Al-Wakil (āyāt + hadith), the Name's ways back ----
  {
    const ctx = await mk(browser, width);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openName(P, "52", "#asmaXCitedAyat [data-asmax-cited]");
    await sweep(P, "Asma: a Name open, cited ayat", width);
    await P.evaluate(() => document.querySelector("#asmaXCitedHadith")?.scrollIntoView({ block: "start" })); await settle(P, 200);
    await sweep(P, "Asma: a Name open, cited hadith (scrolled)", width);
    await P.evaluate(() => document.querySelector("[data-asmax-cited-word]")?.click());
    await P.waitForFunction(() => { const m = document.getElementById("quranWordCardMount"); return m && !m.hidden && m.textContent.trim().length > 20; }, null, { timeout: 12000 }).catch(() => {});
    await settle(P, 500);
    await sweep(P, "Asma: the Word card with Back to the Name", width);
    check(`bn ${width}: the Word card's way back is shown`, await P.evaluate(() => !!document.querySelector("[data-word-card-app-back]")?.getClientRects().length));
    await P.evaluate(() => document.querySelector("[data-word-card-app-back]")?.click()); await settle(P, 1200);
    await P.evaluate(() => document.querySelector("[data-asmax-cited-card]")?.click());
    await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 12000 }).catch(() => {});
    await settle(P, 500);
    await sweep(P, "Asma: the Ayah card opened from a Name", width);
    await P.click("#ayahActionSheetMount [data-ayah-sheet-close]").catch(() => {}); await settle(P, 500);
    check(`bn ${width}: the "Back to <Name>" pill is shown`, await P.evaluate(() => { const p = document.getElementById("ayahCardBackPill"); return !!p && !p.hidden && !!p.querySelector("[data-ayah-card-back]")?.getClientRects().length; }));
    await sweep(P, "Asma: the Back to Name pill", width);
    await P.evaluate(() => document.querySelector("#ayahCardBackPill [data-ayah-card-back]")?.click()); await settle(P, 1200);
    await openName(P, "104", "#asmaXCitedHadith [data-asmax-hadith]");
    await P.evaluate(() => document.querySelector("#asmaXCitedHadith")?.scrollIntoView({ block: "start" })); await settle(P, 200);
    await sweep(P, "Asma: Name 104, cited hadith", width);
    await openName(P, "120", "#asmaXCitedHadith [data-asmax-hadith]");
    await P.evaluate(() => document.querySelector("#asmaXCitedHadith")?.scrollIntoView({ block: "start" })); await settle(P, 200);
    await sweep(P, "Asma: Name 120, hadith not in the library", width);
    check(`bn ${width}: Asma: no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
  // ---- 2. A listening bookmark where sound is refused ----
  {
    const b2 = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=user-gesture-required"] });
    const ctx = await mk(b2, width, { extraSeedJs: LISTEN_SEED });
    const { page: P } = await openPage(ctx, "/app/quranrevival.html?bookmark=b1");
    await P.waitForFunction(() => { const b = document.getElementById("continueListeningBtn"); return b && !b.hidden; }, null, { timeout: 15000 }).catch(() => {});
    await settle(P, 400);
    check(`bn ${width}: "Continue listening" is offered`, await P.evaluate(() => { const b = document.getElementById("continueListeningBtn"); return !!b && !b.hidden && b.textContent.trim().length > 0; }));
    await sweep(P, "a listening bookmark, sound refused", width);
    await ctx.close(); await b2.close();
  }
  // ---- 3. The Read view's menu, its QCR ticks, the way back ----
  {
    const ctx = await mk(browser, width);
    const { page: P } = await openPage(ctx, "/app/quranrevival.html");
    await noSplash(P);
    if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await settle(P, 150); }
    await P.click("#tabReadBtn"); await settle(P);
    await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "83"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="83:1"]'), null, { timeout: 15000 }).catch(() => {});
    await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "4"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:83:4"]'), null, { timeout: 15000 }).catch(() => {});
    await P.evaluate(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:83:4"] [data-qm-toggle]')?.click()); await settle(P);
    await sweep(P, "the Read view menu", width);
    await P.evaluate(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:83:4"] [data-qm-qcr]')?.click());
    // Updated in place (decision 95, issue #722): the ⋮ QCR item opens the QCR pop-up (#qcrPopup), not the Note view.
    await P.waitForFunction(() => [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].some((c) => c.getClientRects().length), null, { timeout: 12000 }).catch(() => {});
    await settle(P, 500);
    check(`bn ${width}: the QCR ticks are open`, await P.evaluate(() => [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].some((c) => c.getClientRects().length)));
    await sweep(P, "the QCR pop-up, with its Back", width);
    await ctx.close();
  }
  // ---- 4. The writing sheet: bookmark button, the naming popover, the pop-out ----
  {
    const ctx = await mk(browser, width);
    await ctx.addInitScript(() => { try { localStorage.setItem("mm_fatiha_bismillah_unnumbered", "0"); } catch (e) {} });
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await noSplash(P);
    await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(P, 1500);
    if (!(await P.evaluate(() => document.getElementById("tabWritingBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn").catch(() => {}); await settle(P, 200); }
    await P.evaluate(() => document.getElementById("tabWritingBtn")?.click());
    await P.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page[data-painted]"), null, { timeout: 15000 }).catch(() => {});
    await settle(P, 400);
    await sweep(P, "the writing sheet", width);
    await P.click('#writingSheet [data-ws="bookmark"]').catch(() => {});
    await P.waitForFunction(() => !!document.querySelector(".bm-popover [data-bm-pop-save]"), null, { timeout: 8000 }).catch(() => {});
    await settle(P, 300);
    check(`bn ${width}: the bookmark naming popover is open on the sheet`, await P.evaluate(() => !!document.querySelector(".bm-popover [data-bm-pop-save]")));
    await sweep(P, "the writing sheet, bookmark name popover", width);
    await P.click(".bm-popover [data-bm-pop-save]").catch(() => {}); await settle(P, 800);
    check(`bn ${width}: after Save the bookmark button reads pressed`, await P.evaluate(() => document.querySelector('#writingSheet [data-ws="bookmark"]')?.getAttribute("aria-pressed") === "true"));
    await sweep(P, "the writing sheet, bookmark pressed", width);
    await P.click('#writingSheet [data-ws="popout"]').catch(() => {}); await settle(P, 600);
    await sweep(P, "the pop-out, choosing a word", width);
    // Tap word 1:2:1 for real, the way the pop-out's own suite does.
    const pt = await P.evaluate(async () => {
      const ws = await import("/app/js/writing-sheet.js"), hr = await import("/app/js/hifz-renderer.js");
      const wrap = document.querySelector('#writingSheet .ws-page[data-page="1"]'); wrap.scrollIntoView({ block: "start" });
      const r = wrap.querySelector(".ws-ink").getBoundingClientRect(), c = document.createElement("canvas").getContext("2d");
      const lay = ws.layoutWritingPage(hr.getMushafPageLines(1), "hifz-p1", r.width, (tx, f, px) => { c.font = `${px}px '${f}'`; return c.measureText(tx).width; }, () => true);
      for (const ln of lay.lines) { const w = (ln.words || []).find((q) => q.loc === "1:2:1"); if (w) return { x: r.left + (lay.W - lay.W * 0.07) - ln.scale * (w.offset + w.width / 2), y: r.top + ln.y + lay.pitch * 0.5 }; }
      return null;
    });
    if (pt) await P.mouse.click(pt.x, pt.y);
    await P.waitForFunction(() => { const s = document.querySelector("#writingSheet .wp [data-wp-stage]"); return s && s.dataset.fs; }, null, { timeout: 8000 }).catch(() => {});
    await settle(P, 400);
    check(`bn ${width}: the pop-out is open on a word`, await P.evaluate(() => !!document.querySelector("#writingSheet .wp [data-wp-stage]")));
    await sweep(P, "the pop-out, full screen with its bar", width);
    await P.click('#writingSheet .wp [data-wp="win"]').catch(() => {}); await settle(P, 400);
    await sweep(P, "the pop-out, after the window toggle", width);
    check(`bn ${width}: writing sheet: no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Bangla sweep of the v09.143-v09.146 surfaces: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
