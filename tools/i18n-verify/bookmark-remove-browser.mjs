// The Owner, 7 Oct 2026 (a screenshot of the Bookmark menu grouped by Folder): "Enable bookmark n folder delete here
// (handy)". Every bookmark row and every folder row has a 🗑. Nothing is erased (I4, D6): the item is marked removed,
// the list re-renders without it, "Removed … · Undo" puts it back, and Manage bookmarks can restore it later. A removed
// folder's bookmarks come up unfiled and its live sub-folders come up a level, never hidden. A refused save is said in
// words (I15). en/bn at 390 and 1280, seeded with real-length names.
// Mutations: --mutate-nowrite (nothing is saved), --mutate-hidechild (a removed folder hides its sub-folder),
// --mutate-noundo (Undo does nothing), --mutate-shut (a removal shuts the open folder). Run from the repository root with serve.js.
import { chromium, newContext, openPage } from "./harness.mjs";
import { stubFor } from "./firebase-stub.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MSHUT = process.argv.includes("--mutate-shut"), MNOWRITE = process.argv.includes("--mutate-nowrite"), MHIDE = process.argv.includes("--mutate-hidechild"), MNOUNDO = process.argv.includes("--mutate-noundo");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const F = (id, name, parentId = null) => ({ id, name, parentId, personTagId: null, removed: false, createdAt: "2026-09-01T00:00:00.000Z" });
const BM = (id, name, folderId, ayah) => ({ id, programId: "none", moduleId: "quranrevival", subjectId: "quran", name, position: `ayah:2:${ayah}`, folderId, removed: false,
  settings: { unitType: "ayah", surahNum: 2, ayahNum: ayah, trackableId: "tafsir" }, createdAt: "2026-09-01T00:00:00.000Z" });
const SEED = `
DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {},
  folders: ${JSON.stringify([F("fA", "Quran Hifz - ONE MINUTE after each Salah"), F("fB", "Ayat of Saqinah"), F("fC", "Ruqiyah Ayat"), F("fD", "MyHIFJ - PARTLY Memorized Surah", "fA")])},
  saved: ${JSON.stringify([BM("b1", "Al-Baqarah 255", "fA", 255), BM("b2", "Sakinah 248", "fB", 248), BM("b3", "Ruqyah 102", "fC", 102), BM("b4", "Partly 1", "fD", 1)])} }];
`;
const FAIL_PATCH = 'export async function updateDoc(ref, data) {';
const FAIL_BODY = 'export async function updateDoc(ref, data) { if (window.__failBookmarkWrites && ref && ref.__col === "bookmarks") { const e = new Error("denied"); e.code = "permission-denied"; throw e; }';

async function start(lang, w, h) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h }, extraSeedJs: SEED });
  let stub = stubFor({ banner: true, extraSeedJs: SEED });
  if (!stub.includes(FAIL_PATCH)) { console.log("stub patch did not apply"); process.exit(2); }
  stub = stub.replace(FAIL_PATCH, FAIL_BODY);
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: stub }));
  if (MNOWRITE || MHIDE || MNOUNDO || MSHUT) {
    await ctx.route("**/js/bookmark-nav.js", async (r) => {
      const res = await r.fetch(); let body = await res.text();
      const swap = (a, b) => { if (!body.includes(a)) { console.log(`mutation did not apply: ${a.slice(0, 50)}`); process.exit(2); } body = body.split(a).join(b); };
      if (MNOWRITE) swap("await write(db, getTenantId(), getPersonId(), id, removed);", "");
      if (MHIDE) swap("return all.filter((f) => !f.removed && (!f.parentId || !live(f.parentId)));", "return all.filter((f) => !f.removed && (!f.parentId || !all.some((p) => p.id === f.parentId)));");
      if (MNOUNDO) swap("undo?.act();", "");
      if (MSHUT) swap("if (openIds?.size)", "if (false)");
      await r.fulfill({ response: res, body });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
async function openSheet(page) {
  await page.evaluate(() => { const d = document.querySelector(".nav-cat-bookmark"); if (d.open) d.open = false; });
  await page.evaluate(() => document.querySelector(".nav-cat-bookmark > summary").click());
  await page.waitForFunction(() => !!document.querySelector("#navBookmarkList [data-bm-folder-id]"), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(200);
}
const rootOrder = (page) => page.evaluate(() => [...document.querySelectorAll("#navBookmarkList > details[data-bm-folder-id]")].map((d) => d.dataset.bmFolderId).join(","));
const lastWrite = (page, n) => page.evaluate((n) => (window.__stubWriteData || []).slice(n).filter((x) => x.col === "bookmarks").map((x) => x.data ?? x).at(-1) ?? null, n);
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
const ids = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.dataset.bmRowId || e.dataset.bmFolderId).join(","), sel);
const expandAll = (page) => page.evaluate(() => document.querySelectorAll("#navBookmarkList details").forEach((d) => { d.open = true; }));
const undoText = (page) => page.evaluate(() => document.querySelector("#navBookmarkList [data-bm-undo]")?.textContent.trim() ?? "");
const menuOpen = (page) => page.evaluate(() => document.querySelector(".nav-cat-bookmark").open);
const itemIn = (data, list, id) => (data?.[list] ?? []).find((x) => x.id === id);

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const tag = `${lang} ${w}px`;
    const { ctx, page, errors } = await start(lang, w, h);
    await openSheet(page);
    await expandAll(page);
    check(`${tag}: POSITIVE CONTROL -- four bookmark rows and four folders are shown`, (await ids(page, "#navBookmarkList [data-bm-row-id]")).split(",").sort().join() === "b1,b2,b3,b4" && (await ids(page, "#navBookmarkList details[data-bm-folder-id]")).split(",").length === 4, await ids(page, "#navBookmarkList [data-bm-row-id]"));

    const g = await page.evaluate(() => {
      const sheet = document.querySelector(".nav-cat-bookmark > .nav-cat-links").getBoundingClientRect();
      const one = (b) => { const r = b.getBoundingClientRect(); const c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { w: r.width, h: r.height, inside: r.left >= sheet.left - 0.5 && r.right <= sheet.right + 0.5, hit: c === b || b.contains(c), label: b.getAttribute("aria-label") }; };
      return { bm: [...document.querySelectorAll("[data-bm-remove-bookmark]")].map(one), fo: [...document.querySelectorAll("[data-bm-remove-folder]")].map(one),
        afterPencil: [...document.querySelectorAll("[data-bm-folder-rename]")].every((p) => p.nextElementSibling?.matches("[data-bm-remove-folder]")) };
    });
    check(`${tag}: every bookmark has a 🗑, 36px+ square, inside the sheet, tappable`, g.bm.length === 4 && g.bm.every((b) => b.w >= 36 && b.h >= 36 && b.inside && b.hit), JSON.stringify(g.bm));
    check(`${tag}: every folder has a 🗑 right after its ✎, inside the sheet, tappable`, g.fo.length === 4 && g.afterPencil && g.fo.every((b) => b.h >= 36 && b.inside && b.hit), JSON.stringify(g.fo));
    check(`${tag}: the 🗑 buttons are named for a screen reader in ${lang === "bn" ? "Bangla" : "English"}`, (lang === "bn" ? /^বুকমার্ক সরান: Sakinah 248/ : /^Remove bookmark: Sakinah 248/).test(g.bm.map((b) => b.label).find((l) => /Sakinah/.test(l)) ?? "") && g.fo.every((b) => (lang === "bn" ? /^ফোল্ডার সরান: / : /^Remove folder: /).test(b.label)), JSON.stringify(g.fo.map((b) => b.label)));

    // ---- a bookmark: remove, then Undo. Only its own folder is open first: removing must not shut it.
    await page.evaluate(() => document.querySelectorAll("#navBookmarkList details").forEach((d) => { d.open = d.dataset.bmFolderId === "fB"; }));
    let n = await writes(page);
    await page.click('[data-bm-remove-bookmark="b2"]');
    await page.waitForTimeout(300);
    let wr = await lastWrite(page, n);
    check(`${tag}: 🗑 on a bookmark takes it off the list, and the menu stays open`, !(await ids(page, "#navBookmarkList [data-bm-row-id]")).split(",").includes("b2") && (await menuOpen(page)), await ids(page, "#navBookmarkList [data-bm-row-id]"));
    check(`${tag}: ...the folder it was in stays open, and the others stay shut`, (await page.evaluate(() => [...document.querySelectorAll("#navBookmarkList details[data-bm-folder-id][open]")].map((d) => d.dataset.bmFolderId).join(","))) === "fB", await page.evaluate(() => [...document.querySelectorAll("#navBookmarkList details[data-bm-folder-id][open]")].map((d) => d.dataset.bmFolderId).join(",")));
    check(`${tag}: ...it is saved as removed, not erased (b2.removed true, the other three untouched)`, itemIn(wr, "saved", "b2")?.removed === true && (wr?.saved ?? []).length === 4 && ["b1", "b3", "b4"].every((id) => itemIn(wr, "saved", id)?.removed === false), JSON.stringify(wr?.saved?.map((b) => [b.id, b.removed])));
    check(`${tag}: ...and "Removed … · Undo" names it, in ${lang === "bn" ? "Bangla" : "English"}`, (lang === "bn" ? /“Sakinah 248” সরানো হয়েছে/ : /Removed “Sakinah 248”/).test(await undoText(page)), await undoText(page));
    n = await writes(page);
    await page.click("[data-bm-undo-btn]");
    await page.waitForTimeout(300);
    wr = await lastWrite(page, n);
    await expandAll(page);
    check(`${tag}: Undo brings it back and saves it as not removed`, (await ids(page, "#navBookmarkList [data-bm-row-id]")).split(",").includes("b2") && itemIn(wr, "saved", "b2")?.removed === false && !(await undoText(page)), JSON.stringify(itemIn(wr, "saved", "b2")));

    // ---- a folder with a bookmark and a sub-folder in it: remove, then Undo
    n = await writes(page);
    await page.click('[data-bm-remove-folder="fA"]');
    await page.waitForTimeout(300);
    wr = await lastWrite(page, n);
    await expandAll(page);
    const top = await page.evaluate(() => [...document.querySelector("#navBookmarkList").children].map((e) => e.dataset.bmRowId || e.dataset.bmFolderId).filter(Boolean).join(","));
    check(`${tag}: 🗑 on a folder takes the folder off the list, saved as removed (fA.removed true, nothing else changed)`, !(await ids(page, "#navBookmarkList details[data-bm-folder-id]")).split(",").includes("fA") && itemIn(wr, "folders", "fA")?.removed === true && (wr?.folders ?? []).filter((f) => f.removed).length === 1 && (wr?.saved ?? []).every((b) => !b.removed), JSON.stringify(wr?.folders?.map((f) => [f.id, f.removed])));
    check(`${tag}: ...its bookmark comes up to the top, unfiled, and its sub-folder comes up a level (nothing hidden)`, top.split(",").includes("b1") && top.split(",").includes("fD"), top);
    check(`${tag}: ...and the Undo bar says where its bookmarks went`, (lang === "bn" ? /ফোল্ডারটি সরানো হয়েছে/ : /Removed the folder “Quran Hifz - ONE MINUTE after each Salah”\. Its bookmarks are now at the top\./).test(await undoText(page)), await undoText(page));
    n = await writes(page);
    await page.click("[data-bm-undo-btn]");
    await page.waitForTimeout(300);
    wr = await lastWrite(page, n);
    check(`${tag}: Undo brings the folder back, with its bookmark and sub-folder inside it again`, itemIn(wr, "folders", "fA")?.removed === false && (await rootOrder(page)) === "fA,fB,fC" && (await page.evaluate(() => !!document.querySelector('details[data-bm-folder-id="fA"] [data-bm-row-id="b1"]') && !!document.querySelector('details[data-bm-folder-id="fA"] details[data-bm-folder-id="fD"]'))), await rootOrder(page));

    // ---- a refused save
    await expandAll(page);
    await page.evaluate(() => { window.__failBookmarkWrites = true; });
    await page.click('[data-bm-remove-bookmark="b3"]');
    await page.waitForTimeout(300);
    const err = await page.evaluate(() => { const e = document.querySelector("[data-bm-nav-error]"); return e && !e.hidden ? e.textContent : ""; });
    check(`${tag}: a refused save says so in words and the bookmark stays`, (lang === "bn" ? /সংরক্ষণ করা যায়নি/ : /Couldn't save the change/).test(err) && /permission-denied/.test(err) && (await ids(page, "#navBookmarkList [data-bm-row-id]")).split(",").includes("b3"), err);
    await page.evaluate(() => { window.__failBookmarkWrites = false; });
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
