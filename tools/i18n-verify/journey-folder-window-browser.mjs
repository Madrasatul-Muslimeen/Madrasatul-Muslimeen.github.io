// The Owner, 5 Oct 2026 ("For Folder, build it"; demo
// docs/reference/2026-10-05-folder-window-and-pinned-demo.html):
//   1. a folder in its own window -- ⋯ → 🗔 Open in its own window: subfolders
//      (tap to go in), ⬆ and the path out, its Notes (tap → a Note window),
//      ✚ New note, a quick title, ➕ New folder; same frame as a Note window.
//   2. the pinned Notes as a side panel in a Note window (📌 Pinned), beside
//      the Note in a wide window, over it in a narrow one or on a phone; a
//      pinned Note opens in the SAME window.
// en and bn, 1280 and 390. Every action through the real controls; the stub's
// write log is the proof. Expected values are written by hand.
// Run from the repository root with `node serve.js` running.
//   --mutate=item     the ⋯ menu loses 🗔 Open in its own window
//   --mutate=newwin   a pinned Note opens in a NEW window instead of the same one
//   --mutate=beside   the panel always slides over the Note (never beside it)
//   --mutate=parent   ➕ New folder makes a top-level folder (no parent)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, day, pinned) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body.</p>", currentRevisionId: "rev-" + id, status: "active", pinned: !!pinned, createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fAk", "AlphaKid", "fA", 0); F("fB", "Beta", null, 1);
  N("n1", "Note One", 1); N("n2", "Note Two", 2); N("n3", "Note Three", 3, true); N("n4", "Note Four", 4, true);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fAk", 0); P("p4", "n4", "fB", 0);
})();`;

function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const route = async (glob, file, f) => { const body = f(fs.readFileSync(file, "utf8")); await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body })); };
  if (MUTATE === "item") await route("**/app/journey-map.html*", "app/journey-map.html", (s) => swap(s, `<button type="button" class="secondary tiny" data-folder-window>🗔 \${t("Open in its own window")}</button>`, ""));
  else if (MUTATE === "newwin") await route("**/js/note-window.js", "app/js/note-window.js", (s) => swap(s, "    if (v.ed) await endEdit(v);\n    v.noteId = noteId;\n    v.order = [noteId];", "    openWindow(noteId, {}); return;\n    v.noteId = noteId;\n    v.order = [noteId];"));
  else if (MUTATE === "beside") await route("**/js/note-window.js", "app/js/note-window.js", (s) => swap(s, "const WIN_PANEL_SIDE_MIN = 560;", "const WIN_PANEL_SIDE_MIN = 99999;"));
  else if (MUTATE === "parent") await route("**/app/journey-map.html*", "app/journey-map.html", (s) => swap(s, "newFolder: async (id, name) => { const n = findNodeByIdOrRole(mergedRoots(), id, null); if (n) await createFolderInside(n, name); },", "newFolder: async (id, name) => { await createFolderInside(mergedRoots().find((r) => r.folderId === \"fB\"), name); },"));
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const hasBn = (s) => /[ঀ-৿]/.test(s || "");
async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(page) {
  return page.evaluate(() => {
    const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, op: w.op || "update", data: w.data || {} }));
    const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, op: w.kind, data: w.data || {} }));
    return [...tx, ...other];
  });
}
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, shown: getComputedStyle(e).display !== "none" && r.width > 0 }; }, sel);
const smallTargets = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== "none" && (r.height < 39.5 || r.width < 39.5); }).map((e) => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const FW = (id) => `.folder-win[data-folder-id="${id}"]`;
const listText = (page, id) => page.evaluate((s) => document.querySelector(s + " [data-fw-list]")?.textContent ?? "", FW(id));
async function backToTree(page) {
  if (await page.isVisible("#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForSelector("#listPane", { state: "visible" }); }
}
async function closeAllWins(page) { await page.evaluate(() => { for (const b of [...document.querySelectorAll(".note-win [data-win-close]")].reverse()) b.click(); }); await page.waitForTimeout(150); }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"].filter((l) => !ONLY || l === ONLY)) for (const width of [1280, 390]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 860 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  const { page } = await openPage(ctx, "/app/journey-map.html");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  const sheet = width < 640;

  // ---------------- 1. the folder window ----------------
  await backToTree(page);
  await page.click('.folder-row[data-folder-id="fA"] .folder-menu-btn');
  const item = await page.$('.folder-row[data-folder-id="fA"] [data-folder-window]');
  check(`${tag}: the folder ⋯ menu offers Open in its own window`, !!item && await item.isVisible());
  if (item && lang === "bn") check(`${tag}: …in Bangla`, hasBn(await item.textContent()), await item.textContent());
  if (item) await item.click();
  const opened = await page.waitForSelector(FW("fA"), { timeout: 4000 }).then(() => true, () => false);
  check(`${tag}: it opens a window on that folder`, opened);
  if (opened) {
    check(`${tag}: the window is titled with the folder`, (await page.textContent(`${FW("fA")} .nw-title`)).includes("Alpha"));
    const lt = await listText(page, "fA");
    check(`${tag}: it lists the subfolder with its count, and the folder's Notes`, /AlphaKid\s*[1১]/.test(lt) && lt.includes("Note One") && lt.includes("Note Two") && !lt.includes("Note Four"), lt);
    check(`${tag}: ⬆ is off at the top level`, await page.isDisabled(`${FW("fA")} [data-fw-up]`));
    const wr = await rect(page, FW("fA"));
    if (sheet) check(`${tag}: on a phone it fills the screen`, wr.l <= 0.5 && wr.t <= 0.5 && wr.w >= width - 1, JSON.stringify(wr));
    else check(`${tag}: on a PC it is a window inside the screen`, wr.l >= 0 && wr.t >= 0 && wr.r <= width && wr.b <= 860 && wr.w < width, JSON.stringify(wr));
    check(`${tag}: its buttons are 40px or more`, (await smallTargets(page, `${FW("fA")} button:not(.fw-crumb), ${FW("fA")} input`)).length === 0, JSON.stringify(await smallTargets(page, `${FW("fA")} button:not(.fw-crumb), ${FW("fA")} input`)));
    // go in, and back out by the path and by ⬆
    await page.click(`${FW("fA")} [data-fw-go="fAk"]`);
    const inKid = await page.waitForSelector(FW("fAk"), { timeout: 3000 }).then(() => true, () => false);
    check(`${tag}: tapping a subfolder goes into it (same window)`, inKid && (await page.$$(".folder-win")).length === 1);
    if (inKid) {
      check(`${tag}: inside it, its pinned Note shows with 📌`, (await listText(page, "fAk")).includes("📌 Note Three"));
      check(`${tag}: the path names the parent`, (await page.textContent(`${FW("fAk")} [data-fw-crumbs]`)).includes("Alpha"));
      await page.click(`${FW("fAk")} [data-fw-up]`);
      check(`${tag}: ⬆ goes back up`, await page.waitForSelector(FW("fA"), { timeout: 3000 }).then(() => true, () => false));
      await page.click(`${FW("fA")} [data-fw-go="fAk"]`);
      await page.waitForSelector(FW("fAk"));
      await page.click(`${FW("fAk")} [data-fw-crumbs] [data-fw-go="fA"]`);
      check(`${tag}: the path's folder name goes back too`, await page.waitForSelector(FW("fA"), { timeout: 3000 }).then(() => true, () => false));
    }
    // asking for the same folder again focuses the open one
    await backToTree(page);
    await page.evaluate(() => { document.querySelector('.folder-row[data-folder-id="fA"] .folder-menu-btn').click(); document.querySelector('.folder-row[data-folder-id="fA"] [data-folder-window]')?.click(); });
    await page.waitForTimeout(200);
    check(`${tag}: the same folder is never opened twice`, (await page.$$(".folder-win")).length === 1);
    // quick title
    await resetWrites(page);
    await page.fill(`${FW("fA")} [data-fw-quick] input`, "Quick one");
    await page.press(`${FW("fA")} [data-fw-quick] input`, "Enter");
    await page.waitForFunction((s) => (document.querySelector(s + " [data-fw-list]")?.textContent ?? "").includes("Quick one"), FW("fA"), { timeout: 6000 }).catch(() => {});
    let w = await writes(page);
    check(`${tag}: a quick title makes a Note filed in THIS folder`, w.some((x) => x.col === "notes" && x.data.title === "Quick one") && w.some((x) => x.col === "notePlacements" && x.data.folderId === "fA"), JSON.stringify(w.map((x) => [x.col, x.op, x.data.folderId ?? x.data.title])));
    check(`${tag}: …and it shows in the window's list`, (await listText(page, "fA")).includes("Quick one"));
    // ✚ New note opens it in a Note window
    await resetWrites(page);
    const before = (await page.$$(".note-win:not(.folder-win)")).length;
    await page.click(`${FW("fA")} [data-fw-new]`);
    await page.waitForFunction((n) => document.querySelectorAll(".note-win:not(.folder-win)").length > n, before, { timeout: 6000 }).catch(() => {});
    w = await writes(page);
    check(`${tag}: ✚ New note files a Note here and opens it in a Note window`, w.some((x) => x.col === "notePlacements" && x.data.folderId === "fA") && (await page.$$(".note-win:not(.folder-win)")).length === before + 1);
    await page.evaluate(() => { for (const b of document.querySelectorAll(".note-win:not(.folder-win) [data-win-close]")) b.click(); });
    // ➕ New folder
    await resetWrites(page);
    await page.evaluate((s) => document.querySelector(s + " [data-fw-newfolder]").click(), FW("fA"));
    await page.fill(`${FW("fA")} [data-fw-newfolder-name]`, "Kid Two");
    await page.press(`${FW("fA")} [data-fw-newfolder-name]`, "Enter");
    await page.waitForFunction((s) => (document.querySelector(s + " [data-fw-list]")?.textContent ?? "").includes("Kid Two"), FW("fA"), { timeout: 6000 }).catch(() => {});
    w = await writes(page);
    check(`${tag}: ➕ New folder makes a folder INSIDE this one`, w.some((x) => x.col === "noteFolders" && x.data.name === "Kid Two" && x.data.parentFolderId === "fA"), JSON.stringify(w.filter((x) => x.col === "noteFolders").map((x) => x.data)));
    check(`${tag}: …and it shows in the window`, (await listText(page, "fA")).includes("Kid Two"));
    // tap a Note -> a Note window
    await page.click(`${FW("fA")} [data-fw-note="n1"]`);
    check(`${tag}: tapping a Note opens it in a Note window`, await page.waitForSelector('.note-win[data-note-id="n1"]', { timeout: 4000 }).then(() => true, () => false));
    if (sheet) {
      check(`${tag}: on a phone the switcher lists the folder and the Note`, await page.evaluate(() => { const t = document.getElementById("noteWinSwitch")?.textContent ?? ""; return t.includes("Alpha") && t.includes("Note One"); }));
    } else {
      // drag the folder window by its bar
      await page.click(`${FW("fA")} .nw-bar .nw-title`);
      const r0 = await rect(page, FW("fA"));
      await page.mouse.move(r0.l + 60, r0.t + 20); await page.mouse.down(); await page.mouse.move(r0.l + 160, r0.t + 90, { steps: 6 }); await page.mouse.up();
      const r1 = await rect(page, FW("fA"));
      check(`${tag}: the folder window drags by its bar`, Math.abs(r1.l - r0.l - 100) < 3 && Math.abs(r1.t - r0.t - 70) < 3, `${JSON.stringify(r0)} -> ${JSON.stringify(r1)}`);
      const sw = await page.evaluate(() => document.getElementById("noteWinSwitch")?.textContent ?? "");
      check(`${tag}: the tab strip lists the folder window too`, sw.includes("Alpha"), sw);
    }
    check(`${tag}: no sideways scroll`, await noSideways(page));
    await closeAllWins(page);
    check(`${tag}: ✕ closes the folder window`, (await page.$$(".folder-win")).length === 0);
  }

  // ---------------- 2. the pinned panel ----------------
  // a wide window on the PC so the panel can sit beside the Note
  await page.evaluate(() => localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 40, y: 40, w: 860, h: 640 })));
  await backToTree(page);
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForSelector('#folderNotes [data-note-leaf][data-note-id="n1"]');
  await page.evaluate(() => { const b = document.querySelector('#folderNotes [data-note-leaf][data-note-id="n1"] [data-note-window]'); if (b) b.click(); });
  const nw = await page.waitForSelector('.note-win[data-note-id="n1"]', { timeout: 4000 }).then(() => true, () => false);
  check(`${tag}: a Note window opened for the pinned panel`, nw);
  if (nw) {
    const W = '.note-win[data-note-id="n1"]';
    const tog = await page.textContent(`${W} [data-win-pins-toggle]`);
    check(`${tag}: the window has a 📌 Pinned button with the count`, /📌/.test(tog) && /[2২]/.test(tog), tog);
    check(`${tag}: the panel starts closed`, !(await rect(page, `${W} [data-win-pinned]`))?.shown);
    await page.click(`${W} [data-win-pins-toggle]`);
    const pr = await rect(page, `${W} [data-win-pinned]`), vr = await rect(page, `${W} .nw-view`);
    check(`${tag}: tapping it opens the pinned Notes`, pr?.shown && (await page.textContent(`${W} [data-win-pinned]`)).includes("Note Three") && (await page.textContent(`${W} [data-win-pinned]`)).includes("Note Four"));
    if (sheet) check(`${tag}: on a phone the panel slides OVER the Note`, pr.r > vr.l + 20, `${JSON.stringify(pr)} ${JSON.stringify(vr)}`);
    else check(`${tag}: in a wide window the panel sits BESIDE the Note`, pr.r <= vr.l + 1, `${JSON.stringify(pr)} ${JSON.stringify(vr)}`);
    check(`${tag}: the panel's buttons are 40px or more`, (await smallTargets(page, `${W} [data-win-pinned] button`)).length === 0, JSON.stringify(await smallTargets(page, `${W} [data-win-pinned] button`)));
    if (lang === "bn") check(`${tag}: the panel heading is in Bangla`, hasBn(await page.textContent(`${W} .nw-pin-head`)));
    const wins0 = (await page.$$(".note-win:not(.folder-win)")).length;
    await page.click(`${W} [data-win-pin-open="n3"]`);
    const same = await page.waitForSelector('.note-win[data-note-id="n3"]', { timeout: 4000 }).then(() => true, () => false);
    check(`${tag}: a pinned Note opens in the SAME window`, same && (await page.$$(".note-win:not(.folder-win)")).length === wins0 && !(await page.$('.note-win[data-note-id="n1"]')));
    if (same) {
      const W3 = '.note-win[data-note-id="n3"]';
      check(`${tag}: the window shows Note Three`, (await page.textContent(`${W3} .nw-title`)).includes("Note Three"));
      if (sheet) check(`${tag}: on a phone the panel closes after the tap`, !(await rect(page, `${W3} [data-win-pinned]`))?.shown);
      else check(`${tag}: in a wide window the panel stays, marking Note Three`, (await rect(page, `${W3} [data-win-pinned]`))?.shown && await page.getAttribute(`${W3} [data-win-pin-open="n3"]`, "aria-current") === "true");
    }
    // ✕ on the panel closes it; the choice is remembered for the next window
    if (!sheet) {
      await page.evaluate(() => document.querySelector(".note-win:not(.folder-win) [data-win-pins-close]")?.click());
      check(`${tag}: ✕ closes the panel`, !(await rect(page, ".note-win:not(.folder-win) [data-win-pinned]"))?.shown);
      await page.evaluate(() => document.querySelector(".note-win:not(.folder-win) [data-win-pins-toggle]")?.click());
    }
    await closeAllWins(page);
    await page.evaluate(() => { const b = document.querySelector('#folderNotes [data-note-leaf][data-note-id="n2"] [data-note-window]'); if (b) b.click(); });
    await page.waitForSelector('.note-win[data-note-id="n2"]', { timeout: 4000 }).catch(() => {});
    check(`${tag}: the next window remembers the panel was ${sheet ? "closed" : "open"}`, !!(await rect(page, '.note-win[data-note-id="n2"] [data-win-pinned]'))?.shown === !sheet);
    check(`${tag}: no sideways scroll (panel)`, await noSideways(page));
    await closeAllWins(page);
  }
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
