// The Owner, 17 Nov 2026 ("Bookmark Title Style: I gave this job before, but how it was skipped?"): the Bookmarks LIST shows every saved
// Quran bookmark, old ones included, as "Al-Hadid - 57:1-6 - 12.Oct.26" (surah, place, the day it was made). The first build only changed the
// name offered to NEW bookmarks; the list kept the stored names. Display only: the stored name stays as the tooltip, nothing is rewritten.
// Run from the repo root with serve.js on :8080 (QR_BASE). Mutations (--mutate=NAME) must each FAIL:
//   nocaption  the list never paints captions (the stored names stay)  -> the three caption checks fail
//   nodate     the caption loses its day                                -> the date checks fail
//   rewrite    the stored name is overwritten too                       -> "the stored name is kept as the tooltip" fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const NAV = "app/js/bookmark-nav.js", CAP = "app/js/bookmark-caption.js";
const MUT = {
  nocaption: [NAV, "    paintCaptions(listEl, bookmarksDoc);\n  }", "  }"],
  nodate: [CAP, "extra, captionDate(date)].filter", "extra].filter"],
  rewrite: [NAV, 'span.title = b.name ?? ""; span.textContent = cap;', 'span.title = ""; span.textContent = cap; b.name = cap;'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`)); };
const SEED = `DATA.bookmarks[0].saved = [
  { id: "c1", moduleId: "quranrevival", subjectId: "quran", programId: "none", name: "Ayahs 1–6 of Surah 57", position: "range:57:1-6", settings: {}, folderId: null, removed: false, createdAt: "2026-10-12T10:09:00.000Z" },
  { id: "c2", moduleId: "quranrevival", subjectId: "quran", programId: "none", name: "Page 2", position: "page:quran:2", settings: {}, folderId: null, removed: false, createdAt: "2026-10-24T11:05:00.000Z" },
  { id: "c3", moduleId: "quranrevival", subjectId: "quran", programId: "none", name: "At-Taghaabun 1–4", position: "range:64:1-4", settings: {}, folderId: null, removed: false, createdAt: "2026-11-15T05:24:00.000Z" },
  { id: "c4", moduleId: "quranrevival", subjectId: "quran", programId: "none", name: "Ayah 255", position: "ayah:2:255", settings: {}, folderId: null, removed: false, createdAt: "2026-11-16T05:24:00.000Z" },
  { id: "c5", moduleId: "quranrevival", subjectId: "quran", programId: "none", name: "A name nothing can resolve", position: "name:zz", settings: {}, folderId: null, removed: false, createdAt: "2026-11-16T05:24:00.000Z" },
];`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const width of [390, 1280]) {
  console.log(`\n=== Bookmarks list captions [${width}] ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }));
  }
  const { page: P } = await openPage(ctx, "/app/about.html");
  await P.evaluate(() => document.querySelector(".nav-cat-bookmark > summary").click());
  await P.waitForFunction(() => document.querySelectorAll("#navBookmarkList [data-bm-cap]").length >= 4, null, { timeout: 10000 }).catch(() => {});
  await P.waitForTimeout(1200);
  const rows = await P.evaluate(() => Object.fromEntries([...document.querySelectorAll("#navBookmarkList [data-bm-cap]")].map((e) => [e.dataset.bmCap, { text: e.textContent.trim(), title: e.title }])));
  const day = (y, m, d) => new Date(y, m - 1, d).toLocaleDateString("en-AU", { day: "2-digit" });
  check("a range: Al-Hadid - 57:1-6 - 12.Oct.26", rows.c1?.text === "Al-Hadid - 57:1-6 - 12.Oct.26", JSON.stringify(rows.c1));
  check("a page: Al-Baqara - 2:1-5 - Page 2 - 24.Oct.26", rows.c2?.text === "Al-Baqara - 2:1-5 - Page 2 - 24.Oct.26", JSON.stringify(rows.c2));
  check("the range made on 15 Nov: At-Taghaabun - 64:1-4 - 15.Nov.26", rows.c3?.text === "At-Taghaabun - 64:1-4 - 15.Nov.26", JSON.stringify(rows.c3));
  check("one āyah: Al-Baqara - 2:255 - 16.Nov.26", rows.c4?.text === "Al-Baqara - 2:255 - 16.Nov.26", JSON.stringify(rows.c4));
  check("a unit nothing can resolve keeps its stored name", rows.c5?.text === "A name nothing can resolve", JSON.stringify(rows.c5));
  check("the stored name is kept as the tooltip", rows.c1?.title === "Ayahs 1–6 of Surah 57" && rows.c2?.title === "Page 2", JSON.stringify([rows.c1?.title, rows.c2?.title]));
  check("every caption ends with its own day (dd.Mon.yy)", ["c1", "c2", "c3", "c4"].every((k) => /\d{2}\.[A-Z][a-z]{2}\.\d{2}$/.test(rows[k]?.text ?? "")), JSON.stringify(Object.values(rows).map((r) => r.text)));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
