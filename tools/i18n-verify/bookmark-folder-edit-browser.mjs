// The Owner, 5 Oct 2026 (phone screenshot of the full-screen Bookmark menu,
// grouped by Folder): "Enable a quick folder edit n handler to move folders
// here."
//
// Each folder row in the Bookmark menu has a drag handle (⠿) and a rename
// pencil (✎), always on. Dragging the handle (or ArrowUp/ArrowDown on it)
// reorders the folder among the folders sharing its parent and saves the new
// order; the pencil renames the folder in place (Enter saves, Escape cancels
// without closing the menu). A refused save is said in words (I15).
// Seeded with real-length folder names. en/bn at 390 and 1280.
// Mutations: --mutate-nosave (the order is never saved: the save and
// persistence checks fail) and --mutate-rename (Enter does nothing: the
// rename checks fail). Run from the repository root with serve.js.
import { chromium, newContext, openPage } from "./harness.mjs";
import { stubFor } from "./firebase-stub.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MNOSAVE = process.argv.includes("--mutate-nosave"), MRENAME = process.argv.includes("--mutate-rename");
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
  if (MNOSAVE || MRENAME) {
    await ctx.route("**/js/bookmark-nav.js", async (r) => {
      const res = await r.fetch(); let body = await res.text();
      const swap = (a, b) => { if (!body.includes(a)) { console.log(`mutation did not apply: ${a.slice(0, 50)}`); process.exit(2); } body = body.split(a).join(b); };
      if (MNOSAVE) swap("const folders = await saveFolderOrder(db, getTenantId(), getPersonId(), parentId, order);", "const folders = null;");
      if (MRENAME) swap('if (ev.key === "Enter") { ev.preventDefault(); finish(true); }', 'if (ev.key === "Enter") { ev.preventDefault(); }');
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
const savedRoot = (data) => (data?.folders ?? []).filter((f) => !f.parentId).map((f) => f.id).join(",");

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const tag = `${lang} ${w}px`;
    const { ctx, page, errors } = await start(lang, w, h);
    await openSheet(page);
    check(`${tag}: POSITIVE CONTROL -- the folders start A,B,C`, (await rootOrder(page)) === "fA,fB,fC", await rootOrder(page));

    const g = await page.evaluate(() => {
      const sheet = document.querySelector(".nav-cat-bookmark > .nav-cat-links").getBoundingClientRect();
      return [...document.querySelectorAll("#navBookmarkList details[data-bm-folder-id]")].map((row) => {
        const h = row.querySelector("[data-bm-folder-handle]").getBoundingClientRect(), r = row.querySelector("[data-bm-folder-rename]").getBoundingClientRect();
        const hit = (b, el) => document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === el;
        return { id: row.dataset.bmFolderId, hh: h.height, rh: r.height, inSheet: h.left >= sheet.left && r.right <= sheet.right + 0.5,
          hitH: hit(h, row.querySelector("[data-bm-folder-handle]")), hitR: row.open || row.parentElement.closest("details")?.open === false ? true : hit(r, row.querySelector("[data-bm-folder-rename]")),
          label: row.querySelector("[data-bm-folder-rename]").getAttribute("aria-label") };
      });
    });
    const roots = g.filter((x) => x.id !== "fD");
    check(`${tag}: every folder row has a ⠿ handle and a ✎ pencil, each >=36px tall, inside the sheet`, roots.length === 3 && roots.every((x) => x.hh >= 35.5 && x.rh >= 35.5 && x.inSheet), JSON.stringify(roots));
    check(`${tag}: ...both tappable (nothing on top of them)`, roots.every((x) => x.hitH && x.hitR), JSON.stringify(roots));
    check(`${tag}: ...named for a screen reader in ${lang === "bn" ? "Bangla" : "English"}`, roots.every((x) => (lang === "bn" ? /^ফোল্ডারের নাম বদলান/ : /^Rename folder/).test(x.label)), roots[0]?.label);

    // Tapping the handle must not open or shut the folder.
    const openBefore = await page.evaluate(() => document.querySelector('[data-bm-folder-id="fB"]').open);
    await page.click('[data-bm-folder-id="fB"] > summary [data-bm-folder-handle]');
    check(`${tag}: tapping the handle does not open or shut its folder`, (await page.evaluate(() => document.querySelector('[data-bm-folder-id="fB"]').open)) === openBefore);

    // Drag C above A.
    let n = await writes(page);
    const hb = await page.locator('[data-bm-folder-id="fC"] > summary [data-bm-folder-handle]').boundingBox();
    const ab = await page.locator('[data-bm-folder-id="fA"] > summary').boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + ((ab.y + 4) - (hb.y + hb.height / 2)) * i / 8);
    await page.mouse.up();
    await page.waitForTimeout(600);
    check(`${tag}: dragging C's handle above A moves it there on screen`, (await rootOrder(page)) === "fC,fA,fB", await rootOrder(page));
    let wd = await lastWrite(page, n);
    check(`${tag}: ...and saves the new order (A's subfolder D stays inside A)`, savedRoot(wd) === "fC,fA,fB" && (wd?.folders ?? []).find((f) => f.id === "fD")?.parentId === "fA", JSON.stringify(wd).slice(0, 200));
    check(`${tag}: ...and the menu stays open`, await page.evaluate(() => document.querySelector(".nav-cat-bookmark").open));

    // ArrowUp on B's handle: B moves above A.
    n = await writes(page);
    await page.focus('[data-bm-folder-id="fB"] > summary [data-bm-folder-handle]');
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(600);
    check(`${tag}: ArrowUp on B's handle moves B above A`, (await rootOrder(page)) === "fC,fB,fA", await rootOrder(page));
    wd = await lastWrite(page, n);
    check(`${tag}: ...and saves it`, savedRoot(wd) === "fC,fB,fA", JSON.stringify(wd).slice(0, 200));

    // Close and reopen: the order stays.
    await page.click("[data-nav-bm-close]");
    await openSheet(page);
    check(`${tag}: closing and reopening the menu keeps the new order`, (await rootOrder(page)) === "fC,fB,fA", await rootOrder(page));

    // Rename B in place.
    n = await writes(page);
    await page.click('[data-bm-folder-id="fB"] > summary [data-bm-folder-rename]');
    const inp = await page.evaluate(() => { const i = document.querySelector('[data-bm-folder-id="fB"] [data-bm-folder-input]'); return i ? { focused: document.activeElement === i, value: i.value } : null; });
    check(`${tag}: ✎ opens an edit box in place, focused, holding the current name`, !!inp && inp.focused && inp.value === "Ayat of Saqinah", JSON.stringify(inp));
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Ayat of Sakinah (calm)");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({ label: document.querySelector('[data-bm-folder-id="fB"] [data-bm-folder-label]').textContent, input: !!document.querySelector("[data-bm-folder-input]"), open: document.querySelector(".nav-cat-bookmark").open }));
    wd = await lastWrite(page, n);
    check(`${tag}: Enter saves the new name (a space typed is kept)`, after.label === "Ayat of Sakinah (calm)" && !after.input && (wd?.folders ?? []).find((f) => f.id === "fB")?.name === "Ayat of Sakinah (calm)", JSON.stringify(after) + JSON.stringify(wd).slice(0, 160));
    // Escape cancels the edit and does NOT close the menu.
    await page.click('[data-bm-folder-id="fC"] > summary [data-bm-folder-rename]');
    await page.keyboard.type("zzz");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const esc = await page.evaluate(() => ({ label: document.querySelector('[data-bm-folder-id="fC"] [data-bm-folder-label]').textContent, open: document.querySelector(".nav-cat-bookmark").open }));
    check(`${tag}: Escape cancels the rename and the menu stays open`, esc.label === "Ruqiyah Ayat" && esc.open, JSON.stringify(esc));

    // A refused save is said in words (I15).
    await page.evaluate(() => { window.__failBookmarkWrites = true; });
    await page.focus('[data-bm-folder-id="fA"] > summary [data-bm-folder-handle]');
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(600);
    const err = await page.evaluate(() => { const e = document.querySelector("[data-bm-nav-error]"); return e && !e.hidden ? e.textContent : ""; });
    check(`${tag}: a refused save says so, in ${lang === "bn" ? "Bangla" : "English"}`, (lang === "bn" ? /সংরক্ষণ করা যায়নি/ : /Couldn't save the folder change/).test(err) && /permission-denied/.test(err), err);
    check(`${tag}: ...and the refused move snaps back (the screen never shows an unsaved order)`, (await rootOrder(page)) === "fC,fB,fA", await rootOrder(page));
    await page.evaluate(() => { window.__failBookmarkWrites = false; });
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/folders-${lang}-${w}.png` });
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
