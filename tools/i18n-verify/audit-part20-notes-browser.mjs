// Audit part 20 (PCF J29, manual audit): the User Manual's "Notes and Mapping My Journey" features, second half.
// THIS RUN REACHED (see the PR for the rest, which is unreached):
//   favs     4 Mapping My Journey ⋯ -> Favourites, Archived, Trash each list the right Notes; Restore writes; no delete call anywhere
//   import   6 ⋯ -> Import Notes…: a small Evernote .enex shows 2. Preview, then 3. Import writes the Notes
//   readbar    the Read bar's ⋯ is NOT on the bar from 900px (the fix of this round) and IS below it
// The RESULT is asserted (the stored write, the switched view), not the element. Each flow has a positive control and a
// timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part20-notes-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
  // The fix of this round taken out: the bare #readToolsBtn rule loses to `#readBar .qr-ico` again, so ⋯ shows at 1440px.
  "readbardots": ["app/quranrevival.html", "**/quranrevival.html*", "    #readBar #readToolsBtn { display: none; }", "    #readToolsBtn { display: none; }", "/app/quranrevival.html"],
  // Restore does nothing.
  "norestore": ["app/journey-map.html", "**/journey-map.html*", "        li.querySelector(\"[data-trash-restore]\")?.addEventListener(\"click\", async () => {\n          const outcome = await runFolderWrite(\n            () => restoreNote(", "        li.querySelector(\"[data-trash-restore]\")?.addEventListener(\"click\", async () => {\n          if (true) return;\n          const outcome = await runFolderWrite(\n            () => restoreNote(", "/app/journey-map.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts() }, own));
  function N(id, title, extra) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body.</p>", currentRevisionId: "rev-" + id, status: "active", createdAt: ts(), updatedAt: ts() }, own, extra || {})); }
  N("n1", "Plain Note"); N("nfav", "Starred Note", { favourite: true }); N("narc", "Shelved Note", { archived: true }); N("ntr", "Binned Note", { status: "retired" });
  ["n1", "nfav", "narc", "ntr"].forEach(function (n, i) { DATA.notePlacements.push(Object.assign({ _id: "t1__p" + i, placementId: "p" + i, noteId: n, folderId: "fA", order: i, status: "active" }, own)); });
})();`;

async function open(lang, width, pagePath) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
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
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writes = (page) => ev(page, () => {
  const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
  const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: (w.kind || "").replace(/^tx-/, ""), data: w.data }));
  return [...tx, ...other];
});
const resetWrites = (page) => ev(page, () => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); });
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const rect = (page, sel) => ev(page, (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; }, sel);
const inside = (r) => !!r && r.l >= -1 && r.r <= r.vw + 1 && r.t >= -1 && r.b <= r.vh + 1;
const jwait = (page) => page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1, null, { timeout: 15000 });
async function pageMenu(page) { await page.click('[data-bar-palette-toggle="pageMenu"]'); await page.waitForSelector("#openTrashBtn", { state: "visible" }); }

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 4: Favourites, Archived, Trash.
  await flow("favs", lang, width, "/app/journey-map.html#folders", async (t, page, errors) => {
    await jwait(page);
    await pageMenu(page);
    const items = await rect(page, "#openFavouritesBtn");
    check(`${t}: POSITIVE CONTROL the ⋯ menu opens with Favourites, Archived, Trash and Import Notes…`, !!items && !!(await rect(page, "#openArchivedBtn")) && !!(await rect(page, "#openTrashBtn")) && !!(await rect(page, '.page-menu-wrap a[href*="import-notes"]')));
    const short = await ev(page, () => [...document.querySelectorAll('[data-bar-palette="pageMenu"] button, [data-bar-palette="pageMenu"] a')].filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height < 39.5).map((e) => e.id || e.textContent.trim()));
    check(`${t}: every item in the menu is 40px or more tall and the menu sits inside the screen`, short.length === 0 && inside(await rect(page, '[data-bar-palette="pageMenu"]')), JSON.stringify(short));
    await page.click("#openFavouritesBtn");
    await page.waitForSelector("[data-flag-list='favourite']");
    const fav = await ev(page, () => [...document.querySelectorAll("[data-flag-list='favourite'] [data-flag-list-open]")].map((b) => b.textContent.trim()));
    check(`${t}: Favourites lists the favourite Note and only it`, fav.length === 1 && fav[0] === "Starred Note", JSON.stringify(fav));
    check(`${t}: ...inside the screen`, inside(await rect(page, "[data-flag-list='favourite']")));
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    if (await page.isVisible("[data-flag-list]")) { await page.evaluate(() => { const b = [...document.querySelectorAll("[role=dialog] button, .siyagah-dialog button")].find((x) => /close|×|✕|Cancel/i.test(x.textContent + x.getAttribute("aria-label"))); b?.click(); }); await page.waitForTimeout(300); }
    await pageMenu(page);
    await page.click("#openArchivedBtn");
    await page.waitForSelector("[data-flag-list='archived']");
    const arc = await ev(page, () => [...document.querySelectorAll("[data-flag-list='archived'] [data-flag-list-open]")].map((b) => b.textContent.trim()));
    check(`${t}: Archived lists the archived Note and only it`, arc.length === 1 && arc[0] === "Shelved Note", JSON.stringify(arc));
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    if (await page.isVisible("[data-flag-list]")) { await page.evaluate(() => { const b = [...document.querySelectorAll("[role=dialog] button, .siyagah-dialog button")].find((x) => /close|×|✕|Cancel/i.test(x.textContent + x.getAttribute("aria-label"))); b?.click(); }); await page.waitForTimeout(300); }
    await pageMenu(page);
    await page.click("#openTrashBtn");
    await page.waitForSelector("[data-trash-note-id]", { timeout: 10000 });
    const tr = await ev(page, () => [...document.querySelectorAll("[data-trash-note-id]")].map((li) => li.dataset.trashNoteId));
    check(`${t}: POSITIVE CONTROL Trash lists the retired Note and only it`, tr.length === 1 && tr[0] === "ntr", JSON.stringify(tr));
    const rb = await rect(page, "[data-trash-note-id] [data-trash-restore]");
    check(`${t}: Restore is on screen and 40px or more tall`, !!rb && inside(rb) && rb.h >= 39.5, JSON.stringify(rb));
    await resetWrites(page);
    await page.click("[data-trash-note-id='ntr'] [data-trash-restore]");
    await page.waitForTimeout(900);
    const w = await writes(page);
    const hit = w.find((x) => /notes$/i.test(x.col) && x.id && /ntr/.test(x.id) && x.data && x.data.status === "active");
    check(`${t}: Restore writes the Note back to status "active" (I4: nothing erased)`, !!hit, JSON.stringify(w).slice(0, 400));
    check(`${t}: ...and no write anywhere is a delete`, !w.some((x) => /delete|remove/i.test(x.op)), JSON.stringify(w.map((x) => x.op)));
    if (bn) check(`${t}: the page menu is in Bangla`, BN.test(await ev(page, () => document.body.innerText)));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

const ENEX = `<?xml version="1.0" encoding="UTF-8"?><en-export><note><title>Audit enex one</title><content><![CDATA[<?xml version="1.0"?><en-note><div>Hello from Evernote</div></en-note>]]></content><created>20260101T000000Z</created><updated>20260102T000000Z</updated></note><note><title>Audit enex two</title><content><![CDATA[<?xml version="1.0"?><en-note><div>Second</div></en-note>]]></content><created>20260103T000000Z</created></note></en-export>`;
for (const lang of LANGS) for (const width of WIDTHS.filter((w) => w !== 320)) {
  await flow("import", lang, width, "/app/import-notes.html", async (t, page, errors) => {
    await page.waitForSelector("#sourceSelect", { state: "visible" });
    await page.selectOption("#sourceSelect", "evernote");
    check(`${t}: POSITIVE CONTROL choosing Evernote shows the Stack name row and a multiple .enex picker`, (await rect(page, "#stackNameInput")) !== null && (await ev(page, () => document.getElementById("fileInput").multiple)));
    await page.fill("#stackNameInput", "Audit Stack");
    await page.setInputFiles("#fileInput", { name: "Audit.enex", mimeType: "application/xml", buffer: Buffer.from(ENEX) });
    await page.waitForFunction(() => getComputedStyle(document.getElementById("previewSection")).display !== "none", null, { timeout: 15000 });
    const stats = await ev(page, () => ({ folders: document.getElementById("statFolders").textContent, notes: document.getElementById("statNotes").textContent }));
    check(`${t}: 2. Preview shows the 2 Notes in the file`, /^(2|২)$/.test(stats.notes.trim()), JSON.stringify(stats));
    const ib = await rect(page, "#importBtn");
    check(`${t}: the Import button is on screen and 40px or more tall`, !!ib && ib.h >= 39.5 && inside({ ...ib, t: 0, b: 0 }), JSON.stringify(ib));
    await resetWrites(page);
    const enabled = await ev(page, () => document.getElementById("importBtn").getAttribute("aria-disabled"));
    if (enabled === "true") { check(`${t}: Import is enabled (gate open)`, false, await ev(page, () => document.getElementById("gateNotice").textContent)); return; }
    await page.click("#importBtn");
    await page.waitForFunction(() => { const r = document.getElementById("resultLine"); return r && getComputedStyle(r).display !== "none" && r.textContent.trim(); }, null, { timeout: 30000 }).catch(() => {});
    const w = await writes(page);
    const noteW = w.filter((x) => /notes$/i.test(x.col));
    const folderW = w.filter((x) => /noteFolders$/i.test(x.col) && x.data && x.data.name === "Audit Stack");
    check(`${t}: 3. Import writes 2 Notes`, noteW.length >= 2, JSON.stringify(w.map((x) => x.col + ":" + x.op)).slice(0, 300));
    check(`${t}: ...and the named Stack folder "Audit Stack"`, folderW.length >= 1, JSON.stringify(w.map((x) => x.col + ":" + (x.data && x.data.name))).slice(0, 300));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

// The Read bar's ⋯: gone from 900px (it replaces tools that sit on the bar there), present below.
for (const lang of LANGS) for (const width of [390, 820, 1440].filter((w) => !WONLY || w === WONLY)) {
  await flow("readbar", lang, width, "/app/quranrevival.html", async (t, page, errors) => {
    if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(700);
    const bar = await ev(page, () => { const b = document.getElementById("readBar"); const r = b?.getBoundingClientRect(); return !!r && r.width > 0; });
    const dots = await ev(page, () => { const e = document.getElementById("readToolsBtn"); return e ? e.getBoundingClientRect().width : -1; });
    const notes = await ev(page, () => { const e = document.getElementById("readNotesBtn"); return e ? e.getBoundingClientRect().width : -1; });
    if (!bar) { check(`${t}: POSITIVE CONTROL the Read bar is on screen`, false, "Read bar not visible; open the Read view"); return; }
    check(`${t}: POSITIVE CONTROL the Read bar is on screen`, bar);
    if (width >= 900) check(`${t}: ⋯ is NOT on the bar and 📝 is (${dots} / ${notes})`, dots === 0 && notes > 0, `dots ${dots} notes ${notes}`);
    else check(`${t}: ⋯ IS on the bar and 📝 is behind it (${dots} / ${notes})`, dots > 0 && notes === 0, `dots ${dots} notes ${notes}`);
  });
}
console.log(`\n==== audit part 20: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
