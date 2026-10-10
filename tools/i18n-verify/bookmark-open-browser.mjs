// Issue #468 -- a Quran bookmark opens straight where it was made.
//
// Run from the repository root, with serve.js on :8080.
//
// What is proved, at 390 and 1280, in English and Bangla, with latencyMs on
// the stub so the timing is real:
//   - NO IN-BETWEEN SCREENS: an init script samples every animation frame (and
//     every DOM mutation) from the first frame; the landing wheel, or the view
//     of a different target, must never be VISIBLE to the reader before the
//     target is open. The cover must have been.
//   - the right view: Read-view bookmark -> Read view at its place; Note-view
//     bookmark -> Note view; an old bookmark with no `view` -> Note view.
//   - a missing bookmark: landing page + a sentence, no endless cover.
//   - ?goto= opens without flashes too.
//   - creating a bookmark in the Read view writes settings.view === "read".
//   - (2 Oct 2026, the owner: "Bookmark must open to the exact screen ...
//     where it was bookmarked") an old bookmark (no `view`) or a Note-view
//     one on a unit whose text the Note view cannot show -- Page 257, or a
//     surah longer than one page -- opens the Read view at that place, never
//     the "read it on the Read screen" stand-in. A one-page surah's Note
//     bookmark still opens the Note view, where its text IS shown.
//   - (2 Oct 2026, the owner: "With exact settings i meant") a bookmark opens
//     with the reading settings it was made with -- translations, WbW
//     language, Arabic font, page-by-page, and how far the Read view's menus
//     were hidden -- even when the device has since changed them; and a
//     bookmark made in the Read view records them.
// Four mutations prove the checks can fail: (a) no cover, (b) settings.view
// ignored, (c) the Note-view-cannot-show test removed, (d) the bookmark's
// reading settings not applied.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const seedJs = `
  DATA.bookmarks[0].saved.push(
    { id: "bmRead", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Read spot", position: "ayah:3:10", folderId: null, removed: false,
      settings: { view: "read", unitType: "ayah", surahNum: 3, ayahNum: 10, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "bmNote", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Note spot", position: "ayah:2:255", folderId: null, removed: false,
      settings: { view: "note", unitType: "ayah", surahNum: 2, ayahNum: 255, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-03T00:00:00.000Z" },
    { id: "bmPageOld", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Old page", position: "page:madani:257", folderId: null, removed: false,
      settings: { unitType: "page", surahNum: 14, ayahNum: 11, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-04T00:00:00.000Z" },
    { id: "bmPageNote", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Note page", position: "page:madani:257", folderId: null, removed: false,
      settings: { view: "note", unitType: "page", surahNum: 14, ayahNum: 13, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-05T00:00:00.000Z" },
    { id: "bmSurahLong", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Long surah", position: "surah:14", folderId: null, removed: false,
      settings: { view: "note", unitType: "surah", surahNum: 14, ayahNum: 1, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-06T00:00:00.000Z" },
    { id: "bmExact", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Exact", position: "ayah:3:10", folderId: null, removed: false,
      settings: { view: "read", unitType: "ayah", surahNum: 3, ayahNum: 10, trackableId: "tafsir", mushafOn: false, readChrome: 1,
        reading: { translationLangs: ["bn"], wbwLang: "both", quranFont: "amiriquran", sidewaysOn: false, repeat: 3, mode: "each", loop: false } }, createdAt: "2026-01-08T00:00:00.000Z" },
    { id: "bmSurahShort", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Short surah", position: "surah:112", folderId: null, removed: false,
      settings: { view: "note", unitType: "surah", surahNum: 112, ayahNum: 1, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-07T00:00:00.000Z" }
  );
`;

// Samples what the reader could see, from the first frame.
const SAMPLER = `
  (() => {
    const log = window.__seen = { wheel: 0, read: 0, note: 0, cover: 0, frames: 0, firstTarget: null };
    const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const sample = () => {
      log.frames++;
      const wheel = vis(document.getElementById("wheelSection"));
      const read = vis(document.getElementById("readView"));
      const note = vis(document.getElementById("noteView"));
      const cover = vis(document.getElementById("bmCover"));
      if (wheel) log.wheel++;
      if (read) log.read++;
      if (note) log.note++;
      if (cover) log.cover++;
      window.__lastVisible = { wheel, read, note, cover };
    };
    const loop = () => { sample(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    new MutationObserver(sample).observe(document, { subtree: true, attributes: true, childList: true });
  })();
`;

/** Opens `query`, returns what the reader saw and where it ended. */
async function run({ lang, width, query, mutate = null }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, latencyMs: 60, viewport: { width, height: width < 600 ? 844 : 800 }, extraSeedJs: seedJs });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (mutate) {
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const resp = await r.fetch();
      let body = await resp.text();
      body = mutate(body);
      await r.fulfill({ response: resp, body });
    });
  }
  await ctx.addInitScript(SAMPLER);
  const { page } = await openPage(ctx, `/app/quranrevival.html${query}`);
  await page.waitForTimeout(1500);
  const end = await page.evaluate(() => ({
    seen: window.__seen,
    coverOn: document.documentElement.classList.contains("bm-opening"),
    readOpen: document.getElementById("readView")?.hidden === false,
    noteOpen: document.getElementById("noteView")?.hidden === false,
    paneOpen: !!document.getElementById("readNotePane") && document.getElementById("readNotePane").hidden === false,
    paneUnit: decodeURIComponent((document.querySelector("#readNotePane iframe")?.getAttribute("src") ?? "").match(/unit=([^&]+)/)?.[1] ?? ""),
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    unitType: document.getElementById("unitTypeSelect")?.value,
    unitNum: document.getElementById("unitNumSelect")?.value,
    standIn: !!document.querySelector("#noteView:not([hidden]) [data-note-open-read]"),
    readText: (document.getElementById("readScroll")?.innerText ?? "").length,
    trEn: document.getElementById("trEnToggle")?.checked,
    trBn: document.getElementById("trBnToggle")?.checked,
    wbwLang: document.getElementById("wbwLangSelect")?.value,
    font: document.getElementById("quranFontSelect")?.value,
    sideways: document.getElementById("sidewaysToggle")?.checked,
    immersive: document.body.classList.contains("immersive-read"),
    notFound: document.getElementById("bmNotFound")?.textContent ?? null,
    coverText: document.getElementById("bmCoverText")?.textContent ?? null,
  }));
  await page.close();
  await ctx.close();
  return end;
}

const noFlash = (r, target) => r.seen.wheel === 0 && r.seen.cover > 0 && (target === "read" ? r.seen.note === 0 : r.seen.read === 0);

for (const width of [390, 1280]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== ${width}px, ${lang} ===`);
    const tag = `${width}/${lang}`;

    const rd = await run({ lang, width, query: "?bookmark=bmRead" });
    check(`${tag} read bookmark: no landing wheel, no Note view, and the cover was seen`, noFlash(rd, "read"), JSON.stringify(rd.seen));
    check(`${tag} read bookmark opens the Read view at 3:10 (not the Note view, no Notes pane)`, rd.readOpen && !rd.noteOpen && !rd.paneOpen && rd.surah === "3" && rd.ayah === "10", JSON.stringify(rd));
    check(`${tag} the cover is gone once it is open`, !rd.coverOn);
    if (lang === "bn") check(`${tag} the cover line is translated`, rd.coverText === "আপনার বুকমার্ক খোলা হচ্ছে…", rd.coverText);

    // UPDATED IN PLACE (decision 95, round 2b, v10.05): the Note view retires as the place for notes, so a Note-view
    // bookmark (and an older one with no view) opens the Read view with the Notes pane on its unit.
    const nt = await run({ lang, width, query: "?bookmark=bmNote" });
    check(`${tag} note bookmark: no landing wheel, no Note view, cover seen`, noFlash(nt, "read"), JSON.stringify(nt.seen));
    check(`${tag} note bookmark opens the Read view at 2:255 with the Notes pane on ayah:2:255`, nt.readOpen && !nt.noteOpen && nt.paneOpen && nt.paneUnit === "ayah:2:255" && nt.surah === "2" && nt.ayah === "255", JSON.stringify(nt));

    const old = await run({ lang, width, query: "?bookmark=bm1" });
    check(`${tag} old bookmark (no view) opens the Read view with the Notes pane, no flashes`, noFlash(old, "read") && old.readOpen && !old.noteOpen && old.paneOpen && old.surah === "2" && old.ayah === "255", JSON.stringify(old));

    const pg = await run({ lang, width, query: "?bookmark=bmPageOld" });
    check(`${tag} old Page 257 bookmark (no view) opens the Read view at page 257, not the stand-in, no Notes pane`,
      pg.readOpen && !pg.noteOpen && !pg.standIn && !pg.paneOpen && pg.surah === "14" && pg.unitType === "page" && pg.unitNum === "257" && pg.ayah === "11" && pg.readText > 50, JSON.stringify(pg));
    check(`${tag} ...with no landing wheel and no Note view on the way`, pg.seen.wheel === 0 && pg.seen.note === 0 && pg.seen.cover > 0, JSON.stringify(pg.seen));

    const pn = await run({ lang, width, query: "?bookmark=bmPageNote" });
    check(`${tag} Note-view Page 257 bookmark opens the Read view at page 257 (the Note view cannot show a page)`,
      pn.readOpen && !pn.noteOpen && !pn.standIn && pn.surah === "14" && pn.unitNum === "257", JSON.stringify(pn));

    const sl = await run({ lang, width, query: "?bookmark=bmSurahLong" });
    check(`${tag} Note-view bookmark on a many-page surah (14) opens the Read view`, sl.readOpen && !sl.noteOpen && !sl.standIn && sl.surah === "14" && sl.unitType === "surah", JSON.stringify(sl));

    const ss = await run({ lang, width, query: "?bookmark=bmSurahShort" });
    // UPDATED IN PLACE (decision 95, round 2b): it opens the Read view with the Notes pane on the whole surah.
    check(`${tag} Note-view bookmark on a one-page surah (112) opens the Read view with the Notes pane on surah:112`, ss.readOpen && !ss.noteOpen && ss.paneOpen && ss.paneUnit === "surah:112" && ss.surah === "112", JSON.stringify(ss));

    // The device starts on the defaults (English translation, Scheherazade,
    // page by page, menus shown); the bookmark says otherwise.
    const ex = await run({ lang, width, query: "?bookmark=bmExact" });
    check(`${tag} exact settings: the bookmark's translations come back (বাংলা on, English off)`, ex.readOpen && ex.trBn === true && ex.trEn === false, JSON.stringify(ex));
    check(`${tag} exact settings: WbW language "both", Arabic font Amiri Quran, page by page off`, ex.wbwLang === "both" && ex.font === "amiriquran" && ex.sideways === false, JSON.stringify(ex));
    check(`${tag} exact settings: the Read view opens with its menus hidden, as it was made`, ex.immersive === true, JSON.stringify(ex));
    check(`${tag} exact settings: still at 3:10 in the Read view`, ex.readOpen && !ex.noteOpen && ex.surah === "3" && ex.ayah === "10", JSON.stringify(ex));

    const gt = await run({ lang, width, query: "?goto=2:255" });
    check(`${tag} ?goto= opens the Note view with no landing flash`, noFlash(gt, "note") && gt.noteOpen && !gt.coverOn, JSON.stringify(gt));

    const miss = await run({ lang, width, query: "?bookmark=nope" });
    const missing = lang === "bn" ? "সেই বুকমার্কটি পাওয়া যায়নি।" : "That bookmark could not be found.";
    check(`${tag} a missing bookmark: cover removed, landing page shown, sentence shown`,
      !miss.coverOn && miss.notFound === missing && !miss.readOpen && !miss.noteOpen && miss.seen.wheel > 0, JSON.stringify(miss));
  }
}

console.log("\n=== creating a bookmark in the Read view records settings.view ===");
{
  const ctx = await newContext(browser, { appLang: "en", banner: false, latencyMs: 30, viewport: { width: 390, height: 844 }, extraSeedJs: seedJs });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(800);
  await page.click("#tabStudyBtn"); // Read lives inside the Study menu, which starts hidden
  await page.waitForTimeout(150);
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById("readBookmarkBtn").click());
  await page.waitForSelector(".bm-popover-overlay");
  await page.fill("[data-bm-pop-name]", "Made in Read");
  await page.click("[data-bm-pop-save]");
  await page.waitForTimeout(800);
  const writes = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
  const saved = writes.length ? writes[writes.length - 1].data.saved : [];
  const made = saved.find((b) => b.name === "Made in Read");
  check("a bookmark made in the Read view is written with settings.view === \"read\"", made?.settings?.view === "read", JSON.stringify(made));
  check("...and carries the place it reopens at (surah, ayah, unit)", made?.settings?.surahNum === 1 && made?.settings?.ayahNum === 1 && made?.settings?.unitType === "ayah", JSON.stringify(made?.settings));
  // Defaults on this fresh device: English translation, Scheherazade, page by page.
  check("...and records its reading settings (translations, font, WbW language, page by page, menus)",
    JSON.stringify(made?.settings?.reading?.translationLangs) === JSON.stringify(["en"]) && made?.settings?.reading?.quranFont === "scheherazade"
      && made?.settings?.reading?.wbwLang === "auto" && made?.settings?.reading?.sidewaysOn === true && made?.settings?.readChrome === 0
      && !("unit" in (made?.settings?.reading ?? {})) && !("unitType" in (made?.settings?.reading ?? {})), JSON.stringify(made?.settings));
  await page.close();
  await ctx.close();
}

console.log("\n=== mutation proofs (each must make its check FAIL) ===");
{
  // (a) no cover: the landing wheel must then be seen.
  const a = await run({ lang: "en", width: 390, query: "?bookmark=bmRead", mutate: (b) => b.replace('root.classList.add("bm-opening");', "") });
  check("mutation (a) cover removed -> the no-flash check FAILS", !noFlash(a, "read"), JSON.stringify(a.seen));
  // (b) ignore settings.view: the Read bookmark opens the Note view.
  const m = await run({ lang: "en", width: 390, query: "?bookmark=bmRead", mutate: (b) => b.replace('settings?.view === "read"', "false") });
  // Updated in place (decision 95, round 2b): ignoring the view now sends it down the Note-bookmark path, which opens the
  // Read view WITH the Notes pane, so the read-bookmark check (no pane) fails.
  check("mutation (b) settings.view ignored -> the Read-view check FAILS", !(m.readOpen && !m.noteOpen && !m.paneOpen), JSON.stringify(m));
  // (c) never send a Note-unshowable bookmark to the Read view: the old Page 257 bookmark lands on the stand-in.
  const c = await run({ lang: "en", width: 390, query: "?bookmark=bmPageOld", mutate: (b) => b.replace('if (settings?.view && settings.view !== "note") return false;', "return false;") });
  // (d) the bookmark's reading settings are not applied: the device's own stay.
  const d = await run({ lang: "en", width: 390, query: "?bookmark=bmExact", mutate: (b) => b.replace("await applyPresetSettings({ ...settings.reading, unit: null, unitType: null });", "") });
  check("mutation (d) reading settings not applied -> the exact-settings check FAILS", !(d.trBn === true && d.trEn === false && d.font === "amiriquran"), JSON.stringify(d));
  // Updated in place (decision 95, round 2b): without that test the old Page bookmark takes the Note-bookmark path,
  // which is now the Read view WITH the Notes pane (no stand-in exists any more); the plain Page path opens no pane.
  check("mutation (c) Note-view-cannot-show test removed -> the Page 257 bookmark opens the Notes pane (it must not)", c.readOpen && c.paneOpen, JSON.stringify(c));
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
