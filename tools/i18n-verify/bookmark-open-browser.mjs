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
// Two mutations prove the checks can fail: (a) no cover, (b) settings.view
// ignored.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const seedJs = `
  DATA.bookmarks[0].saved.push(
    { id: "bmRead", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Read spot", position: "ayah:3:10", folderId: null, removed: false,
      settings: { view: "read", unitType: "ayah", surahNum: 3, ayahNum: 10, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "bmNote", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Note spot", position: "ayah:2:255", folderId: null, removed: false,
      settings: { view: "note", unitType: "ayah", surahNum: 2, ayahNum: 255, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-03T00:00:00.000Z" }
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
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
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
    check(`${tag} read bookmark opens the Read view at 3:10 (not the Note view)`, rd.readOpen && !rd.noteOpen && rd.surah === "3" && rd.ayah === "10", JSON.stringify(rd));
    check(`${tag} the cover is gone once it is open`, !rd.coverOn);
    if (lang === "bn") check(`${tag} the cover line is translated`, rd.coverText === "আপনার বুকমার্ক খোলা হচ্ছে…", rd.coverText);

    const nt = await run({ lang, width, query: "?bookmark=bmNote" });
    check(`${tag} note bookmark: no landing wheel, no Read view, cover seen`, noFlash(nt, "note"), JSON.stringify(nt.seen));
    check(`${tag} note bookmark opens the Note view at 2:255`, nt.noteOpen && !nt.readOpen && nt.surah === "2" && nt.ayah === "255", JSON.stringify(nt));

    const old = await run({ lang, width, query: "?bookmark=bm1" });
    check(`${tag} old bookmark (no view) opens the Note view, no flashes`, noFlash(old, "note") && old.noteOpen && old.surah === "2" && old.ayah === "255", JSON.stringify(old));

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
  check("mutation (b) settings.view ignored -> the Read-view check FAILS", !(m.readOpen && !m.noteOpen), JSON.stringify(m));
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
