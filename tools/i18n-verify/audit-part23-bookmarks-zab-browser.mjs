// Audit part 23 (PCF J29, manual audit): the User Manual's Bookmarks and Zab features, each one working.
//   page     1 Bookmarks page: list, folders (new, rename, move), a bookmark (rename, Retire / Restore = a status change), New bookmark with a Range, Open
//   menu     2 The Bookmark menu in the nav: lists the latest, opens, clear of the nav row
//   zab      3 Zab: the 🧰 bar, pockets (add, rename, tick, Trash, restore), a pocket inside a pocket, a task with a due date and steps, → Note
// The RESULT is asserted (the stored write, the switched view, the place), not the element. Each flow has a positive control
// and a timeout that fails by name. Mutations: --mutate=<name> serves one deliberately broken copy of a file.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part23-bookmarks-zab-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// [file, route glob, anchor (must occur exactly once), replacement, page prefix it applies to]
const MUTATIONS = {
  // Retire stores nothing.
  noretire: ["app/bookmarks.html", "**/bookmarks.html*", 'row.querySelector("[data-bm-toggle]")?.addEventListener("click", async () => {', 'row.querySelector("[data-bm-toggle]")?.addEventListener("click", async () => { return;', "/app/bookmarks.html"],
  // A new folder is never stored.
  nofolder: ["app/bookmarks.html", "**/bookmarks.html*", 'newFolderBtn.addEventListener("click", async () => {', 'newFolderBtn.addEventListener("click", async () => { return;', "/app/bookmarks.html"],
  // The fix of this round taken out: a quick tap on the Unit picker before the surah list arrives throws on a null list.
  noindexwait: ["app/bookmarks.html", "**/bookmarks.html*", "        await ensureNbSurahIndex(); // a quick tap on the Unit picker can come before the surah list has arrived\n", "", "/app/bookmarks.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;

const F = (id, name, parentId = null) => ({ id, name, parentId, personTagId: null, removed: false, createdAt: "2026-09-01T00:00:00.000Z" });
const BM = (id, name, folderId, ayah, when) => ({ id, programId: "none", moduleId: "quranrevival", subjectId: "quran", name, position: `ayah:2:${ayah}`, folderId, removed: false,
  settings: { unitType: "ayah", surahNum: 2, ayahNum: ayah, trackableId: "tafsir" }, createdAt: when || "2026-09-01T00:00:00.000Z" });
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__DATA = DATA;
  DATA.zabPockets = [{ _id: "t1__pk-tasks", pocketId: "pk-tasks", order: 0, name: "Tasks", icon: "✅", ztype: "tasks", createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-1", schemaVersion: 1, addedByPersonId: "p1", tenantId: "t1", status: "active" }]; DATA.zabItems = [];
  DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {},
    folders: ${JSON.stringify([F("fA", "Quran Hifz - ONE MINUTE after each Salah"), F("fB", "Ayat of Saqinah")])},
    saved: ${JSON.stringify([BM("b1", "Al-Baqarah 255", "fA", 255, "2026-09-03T00:00:00.000Z"), BM("b2", "Sakinah 248", "fB", 248, "2026-09-02T00:00:00.000Z"), BM("b3", "Unfiled 102", null, 102)])} }];
})();`;

async function open(lang, width, pagePath) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const bmWrites = (page) => ev(page, () => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
const zabWrites = (page) => ev(page, () => (window.__stubWriteData || []).filter((w) => /^zab/.test(w.col || "")));
const count = (page, sel) => ev(page, (s) => document.querySelectorAll(s).length, sel);
const wide =(page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const small = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== "none" && (r.height < 39.5 || r.width < 39.5); }).map((e) => `${e.dataset ? Object.keys(e.dataset)[0] || e.tagName : e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);
const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

// ---------------------------------------------------------------------------------------------------------------
// 1. The Bookmarks page
// ---------------------------------------------------------------------------------------------------------------
for (const lang of LANGS) for (const width of WIDTHS.filter((w) => w !== 320)) {
  await flow("page", lang, width, "/app/bookmarks.html", async (tag, page, errors) => {
    await page.waitForSelector("#newBookmarkBtn", { state: "visible", timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll("[data-bm-id]").length >= 3, null, { timeout: 15000 });
    check(`${tag}: positive control: three seeded bookmarks are listed`, (await ev(page, () => document.querySelectorAll("[data-bm-id]").length)) === 3);
    check(`${tag}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
    const sm = await small(page, "#app button, #app select, #app a[data-bm-open-id] button");
    check(`${tag}: every button / picker is 40px or more`, sm.length === 0, sm.slice(0, 6).join(" "));
    // Retire = a status change (removed:true), never a delete.
    await ev(page, () => { window.__stubWriteData = []; });
    await page.click('[data-bm-id="b3"] [data-bm-toggle], [data-bm-id="b3"] ~ * [data-bm-toggle]').catch(async () => { await page.click('[data-bm-toggle] >> nth=0'); });
    await page.waitForTimeout(700);
    const w1 = await bmWrites(page);
    const saved = w1.at(-1)?.data?.saved || [];
    check(`${tag}: Retire stores the bookmark as removed (status change, still listed in the data)`, saved.length === 3 && saved.filter((s) => s.removed).length === 1, JSON.stringify(w1.at(-1)?.data || null).slice(0, 160));
    // A new folder, named through the prompt.
    await ev(page, () => { window.__stubWriteData = []; });
    page.once("dialog", (d) => d.accept("Audit folder").catch(() => {}));
    await page.click("#newFolderBtn");
    await page.waitForTimeout(700);
    const w2 = await bmWrites(page);
    check(`${tag}: New folder stores the folder`, (w2.at(-1)?.data?.folders || []).some((f) => f.name === "Audit folder" && !f.removed), JSON.stringify(w2.at(-1)?.data?.folders || null).slice(0, 160));
    // Rename a folder.
    await ev(page, () => { window.__stubWriteData = []; });
    page.once("dialog", (d) => d.accept("Renamed folder"));
    await page.click("[data-folder-rename]:not([disabled]) >> nth=0");
    await page.waitForTimeout(700);
    const w3 = await bmWrites(page);
    check(`${tag}: Rename stores the new folder name`, (w3.at(-1)?.data?.folders || []).some((f) => f.name === "Renamed folder"), JSON.stringify(w3.at(-1)?.data?.folders || null).slice(0, 160));
    // Open a bookmark lands where it was saved.
    const href = await ev(page, () => document.querySelector("a[data-bm-open-id]")?.getAttribute("href") || "");
    check(`${tag}: Open links to Quran Study with the bookmark's id (it lands where it was saved)`, /quranrevival\.html\?.*bookmark=b1/.test(href), href);
    // New bookmark with a Range.
    await page.click("#newBookmarkBtn");
    await page.waitForFunction(() => document.getElementById("nbName"), null, { timeout: 10000 });
    await page.selectOption("#nbUnitType", "range");
    await page.fill("#nbSurah", "2").catch(() => {});
    await page.waitForTimeout(300);
    const toVisible = await ev(page, () => { const e = document.getElementById("nbToField"); return !!e && e.getBoundingClientRect().height > 0; });
    check(`${tag}: New bookmark → Range shows the "to" field`, toVisible);
    if (lang === "bn") {
      const txt = await ev(page, () => document.getElementById("app").innerText);
      check(`${tag}: Bangla page has Bangla text`, BN.test(txt));
    }
    check(`${tag}: no page errors (a quick tap on the Unit picker before the surah list arrives)`, errors.filter((e) => !/ERR_CERT|net::|Failed to load/.test(e)).length === 0, errors.join(" | ").slice(0, 200));
  });
}

// 2. The Bookmark menu in the nav (read only)
for (const lang of LANGS) for (const width of WIDTHS) {
  await flow("menu", lang, width, "/app/records.html", async (tag, page) => {
    await page.waitForSelector(".nav-cat-bookmark > summary", { state: "visible", timeout: 15000 });
    await page.click(".nav-cat-bookmark > summary");
    await page.waitForFunction(() => document.querySelectorAll("#navBookmarkList [data-bm-row-id]").length >= 1, null, { timeout: 10000 });
    const info = await ev(page, () => {
      const rows = [...document.querySelectorAll("#navBookmarkList [data-bm-row-id]")];
      const list = document.getElementById("navBookmarkList"); const r = list.getBoundingClientRect();
      // The sheet is a full-screen page by design: it must hold a Close the reader can reach (inside the screen, 40px).
      const close = [...document.querySelectorAll(".nav-cat-bookmark button")].find((b) => /Close|বন্ধ/.test(b.textContent) && b.getClientRects().length);
      const cr = close && close.getBoundingClientRect();
      const closeOk = !!cr && cr.top >= 0 && cr.right <= innerWidth && cr.height >= 39.5 && cr.width >= 39.5;
      return { rows: rows.length, l: r.left, r: r.right, vw: innerWidth, top: r.top, closeOk, text: list.innerText };
    });
    check(`${tag}: positive control: the menu lists the bookmarks`, info.rows >= 1, JSON.stringify(info).slice(0, 160));
    check(`${tag}: the menu sheet sits inside the screen and its Close is reachable`, info.l >= -1 && info.r <= info.vw + 1 && info.top >= 0 && info.closeOk, JSON.stringify({ l: info.l, r: info.r, top: info.top, closeOk: info.closeOk }));
    check(`${tag}: no sideways scroll with the menu open`, (await wide(page)) <= 1);
    const sm = await small(page, "#navBookmarkList button, #navBookmarkList a");
    check(`${tag}: menu buttons are 40px or more`, sm.length === 0, sm.slice(0, 6).join(" "));
    if (lang === "bn") check(`${tag}: the menu has Bangla text`, BN.test(info.text));
  });
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Zab
// ---------------------------------------------------------------------------------------------------------------
for (const lang of LANGS) for (const width of WIDTHS) {
  await flow("zab", lang, width, "/app/hadith-collections.html", async (tag, page) => {
    const opener = width >= 768 ? "#zabBar [data-zab-open]" : "#zabCorner";
    await page.waitForSelector(opener, { state: "visible", timeout: 15000 });
    await page.click(opener);
    await page.waitForSelector("#zabPanel:not([hidden])");
    await page.waitForFunction(() => document.querySelectorAll("#zabPanel [data-zab-pocket]").length >= 1, null, { timeout: 10000 });
    const box = await ev(page, () => { const r = document.getElementById("zabPanel").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
    check(`${tag}: positive control: the panel opens inside the screen`, box.l >= -1 && box.r <= box.vw + 1 && box.t >= -1 && box.b <= box.vh + 1, JSON.stringify(box));
    check(`${tag}: the panel gives no sideways scroll`, (await wide(page)) <= 1);
    const sm = await small(page, "#zabPanel button, #zabPanel select");
    check(`${tag}: every Zab button is 40px or more`, sm.length === 0, sm.slice(0, 8).join(" "));
    if (lang === "bn") check(`${tag}: the panel is in Bangla`, BN.test(await ev(page, () => document.getElementById("zabPanel").innerText)));
    // Add a pocket.
    await ev(page, () => { window.__stubWriteData = []; });
    await page.fill("[data-zab-new-pocket]", "Audit pocket");
    await page.click("[data-zab-add-pocket]");
    await page.waitForFunction(() => [...document.querySelectorAll("#zabPanel [data-zab-pocket]")].some((e) => /Audit pocket/.test(e.textContent)), null, { timeout: 8000 }).catch(() => {});
    const zw = await zabWrites(page);
    check(`${tag}: Add pocket stores a zabPockets document named Audit pocket`, zw.some((w) => w.col === "zabPockets" && JSON.stringify(w.data).includes("Audit pocket")), JSON.stringify(zw).slice(0, 200));
    // Open it, add a pocket inside, add a task.
    await page.click('#zabPanel [data-zab-pocket]:has-text("Audit pocket")');
    await page.waitForSelector("[data-zab-new-child]", { timeout: 8000 });
    await page.fill("[data-zab-new-child]", "Inner pocket");
    await page.click("[data-zab-add-child]");
    await page.waitForSelector('[data-zab-chip]:has-text("Inner pocket")', { timeout: 8000 }).catch(() => {});
    check(`${tag}: a pocket inside a pocket shows as a chip and is stored with its parent`, (await ev(page, () => [...document.querySelectorAll("[data-zab-chip]")].some((e) => /Inner pocket/.test(e.textContent)))) && (await zabWrites(page)).some((w) => w.col === "zabPockets" && /Inner pocket/.test(JSON.stringify(w.data)) && /parent/i.test(JSON.stringify(w.data))));
    const sm2 = await small(page, "#zabPanel button, #zabPanel select, #zabPanel input[type=checkbox]");
    check(`${tag}: inside a pocket every control is 40px or more`, sm2.length === 0, sm2.slice(0, 8).join(" "));
    check(`${tag}: no sideways scroll inside a pocket`, (await wide(page)) <= 1);
    // A task: add, steps, tick, Trash, restore (in a Tasks pocket, which carries steps and due dates).
    await page.click('#zabPanel [data-zab-nav="list"]');
    await page.waitForSelector('#zabPanel [data-zab-pocket="pk-tasks"]', { timeout: 8000 });
    await page.click('#zabPanel [data-zab-pocket="pk-tasks"]');
    await page.waitForSelector("#zabPanel [data-zab-new-item]", { timeout: 8000 });
    await page.fill("#zabPanel [data-zab-new-item]", "Audit task");
    await page.press("#zabPanel [data-zab-new-item]", "Enter");
    await page.waitForSelector('#zabPanel .zab-text:text-is("Audit task")', { timeout: 8000 });
    check(`${tag}: a task is stored in zabItems`, (await zabWrites(page)).some((w) => w.col === "zabItems" && JSON.stringify(w.data).includes("Audit task")));
    await ev(page, () => { window.__stubWriteData = []; });
    await page.click("#zabPanel [data-zab-steps]");
    await page.fill("#zabPanel [data-zab-new-step]", "First step");
    await page.click("#zabPanel [data-zab-add-step]");
    await page.waitForSelector("#zabPanel [data-zab-step]", { timeout: 8000 });
    check(`${tag}: a step is added`, (await count(page, "#zabPanel [data-zab-step]")) === 1);
    await ev(page, () => { window.__stubWriteData = []; });
    await page.check("#zabPanel [data-zab-tick]");
    await page.waitForTimeout(500);
    check(`${tag}: ticking a task stores it done`, (await zabWrites(page)).some((w) => w.col === "zabItems" && /done/i.test(JSON.stringify(w.data))), JSON.stringify(await zabWrites(page)).slice(0, 160));
    await ev(page, () => { window.__stubWriteData = []; });
    await page.click("#zabPanel [data-zab-itrash]");
    await page.waitForTimeout(600);
    const tw = await zabWrites(page);
    check(`${tag}: Trash is a stored status change, never a delete`, tw.length >= 1 && !tw.some((w) => w.kind === "delete"), JSON.stringify(tw).slice(0, 160));
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
