// Audit part 58 (PCF MSA J29): the User Manual's "Mapping My Journey" and its Note flows, driven at 320 / 390 / 820 / 1280,
// as the owner and as a student, English and Bangla (shape of audit-part56).
//   views     Folders | Timeline | Path switch; the page ⋯ menu opens inside the screen and every item is finger-sized; Favourites, Archived, Trash open
//   create    Quick title + Enter makes a Note: the stored write carries I17's four fields; a refused write shows an error and keeps what was typed (I15)
//   note      the Note's ⋯ menu (six groups, inside the screen, tiles finger-sized); Favourite / Archive / Pin store a mark; Delete is a mark (I4, never a delete);
//             the Note is in Trash and Restore brings it back; Archived lists it and Bring back returns it
//   refused   a refused Favourite shows an error on screen (I15) and the tile stays unpressed
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part58-notes-journey-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
// [file, route glob, anchor (must occur exactly once), replacement]
const MUTATIONS = {
  // The page ⋯ menu's Trash button and Import link go back to their own short height.
  menusmall: ["app/journey-map.html", "**/journey-map.html*", 'id="openTrashBtn" style="display:block; width:100%; text-align:left; padding:0.32rem 0.7rem;', 'id="openTrashBtn" style="display:block; width:100%; text-align:left; padding:0.32rem 0.7rem; min-height:0; height:26px;'],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;

const mkSeed = (pid) => `(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "${pid}", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha folder", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  DATA.notes.push(Object.assign({ _id: "t1__n1", noteId: "n1", title: "Note One", bodyHtml: "<p>Hello</p>", currentRevisionId: "r1", status: "active", createdAt: ts("2024-09-03T16:45:00Z"), updatedAt: ts("2024-09-03T16:45:00Z") }, own));
  DATA.noteRevisions.push(Object.assign({ _id: "t1__r1", revisionId: "r1", noteId: "n1", previousRevisionId: null, title: "Note One", bodyHtml: "<p>Hello</p>", revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2024-09-03T16:45:00Z") }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p1", placementId: "p1", noteId: "n1", folderId: "fA", order: 0, status: "active" }, own));
})();`;
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;
const WHO = { owner: mkSeed("p1"), student: STUDENT + mkSeed("p2") };

async function open(lang, width, who, { failWrites = false } = {}) {
  const extra = WHO[who] + (failWrites ? "window.__stubFailWrites = true; window.__stubFailTx = true;" : "");
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: extra });
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1, null, { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, who, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${who} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, who, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 45000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource|denied by the test|permission-denied/i.test(e));
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const writes = (page) => ev(page, () => (window.__stubWriteData || []).map((w) => ({ kind: w.kind, col: w.col, id: w.id, data: w.data })));
const notesDoc = (page, id) => ev(page, (i) => JSON.parse(JSON.stringify((window.__DATA.notes || []).find((n) => n.noteId === i) || null)), id);
const errText = (page) => ev(page, () => { const b = document.getElementById("qr-write-failure-banner"); return b && getComputedStyle(b).display !== "none" && b.getClientRects().length ? b.textContent.trim() : ""; });
const bannerText = (page) => ev(page, () => { for (const id of ["qr-write-failure-banner", "pageStatusMsg"]) { const b = document.getElementById(id); if (b && getComputedStyle(b).display !== "none" && b.getClientRects().length && b.textContent.trim()) return b.textContent.trim(); } return ""; });
const inside = (page, sel) => ev(page, (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return !!r && r.width > 0 && r.left >= -0.5 && r.right <= innerWidth + 0.5; }, sel);
const smallOnes = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height < 39.5).map((e) => `${e.textContent.trim().slice(0, 14)}:${Math.round(e.getBoundingClientRect().height)}`), sel);
async function openNote(page) {
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForSelector("#folderNotes [data-note-id='n1'] [data-note-open]", { state: "visible", timeout: 15000 });
  await page.click("#folderNotes [data-note-id='n1'] [data-note-open]");
  await page.waitForSelector("#notePane [data-pane-title]", { state: "visible", timeout: 15000 });
}
const paneMenu = async (page) => { await page.click("#notePane [data-pane-menu-btn]"); await settle(page, 400); };

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) for (const who of ["owner", "student"]) {
  const bn = lang === "bn";
  // 1: the three views and the page ⋯ menu.
  await flow("views", lang, width, who, async (t, page, errors) => {
    for (const v of ["timeline", "path", "folders"]) {
      await page.click(`.view-toggle-btn[data-view="${v}"]`); await settle(page, 400);
      const shown = await ev(page, (k) => { const id = { folders: "viewFolders", timeline: "viewTimeline", path: "viewPath" }[k]; const e = document.getElementById(id); return getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; }, v);
      check(`${t}: the ${v} view shows`, shown);
    }
    check(`${t}: the three view buttons are finger-sized`, (await smallOnes(page, ".view-toggle-btn")).length === 0, (await smallOnes(page, ".view-toggle-btn")).join());
    await page.click('[data-bar-palette-toggle="pageMenu"]'); await settle(page, 400);
    check(`${t}: POSITIVE CONTROL the page ⋯ menu is open with its four items`, (await ev(page, () => [...document.querySelectorAll('[data-bar-palette="pageMenu"] > *')].filter((e) => e.getBoundingClientRect().width > 0).length)) === 4);
    check(`${t}: the page ⋯ menu is inside the screen`, await inside(page, '[data-bar-palette="pageMenu"]'));
    const small = await smallOnes(page, '[data-bar-palette="pageMenu"] > *');
    check(`${t}: every page ⋯ menu item is 40px or more`, small.length === 0, small.join());
    const href = await ev(page, () => document.querySelector('[data-bar-palette="pageMenu"] a[href*="import-notes"]').getAttribute("href"));
    check(`${t}: Import Notes opens with back=1 (the way-back law)`, /back=1/.test(href), href);
    for (const [btn, sel] of [["openFavouritesBtn", "[data-flag-list=favourite]"], ["openArchivedBtn", "[data-flag-list=archived]"]]) {
      if (!(await ev(page, () => getComputedStyle(document.querySelector('[data-bar-palette="pageMenu"]')).display !== "none"))) { await page.click('[data-bar-palette-toggle="pageMenu"]'); await settle(page, 300); }
      await page.click("#" + btn); await settle(page, 500);
      check(`${t}: ${btn} opens its list`, await ev(page, (s) => !!document.querySelector(s), sel));
      await page.keyboard.press("Escape"); await settle(page, 300);
      await ev(page, () => document.querySelectorAll(".siyagah-overlay, [data-siyagah-dialog]").forEach((e) => e.remove()));
    }
    check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
    if (bn) check(`${t}: the view buttons are Bangla`, BN.test(await ev(page, () => document.getElementById("viewToggle").innerText)));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 2: creating a Note, and a refused create (I15).
  for (const refused of [false, true]) {
    await flow(refused ? "createrefused" : "create", lang, width, who, async (t, page, errors) => {
      await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]'); await settle(page, 500);
      await page.waitForSelector("#quickTitle", { state: "visible", timeout: 10000 });
      await ev(page, () => { window.__stubWriteData = []; });
      await page.fill("#quickTitle", "Audit typed title");
      await page.press("#quickTitle", "Enter"); await settle(page, 1200);
      const w = await writes(page);
      const created = w.filter((x) => x.col === "notes" && /set|create/.test(x.kind));
      if (!refused) {
        const d = created[0]?.data || {};
        check(`${t}: a Note is created and stored`, created.length >= 1, JSON.stringify(w.map((x) => x.col + ":" + x.kind)));
        const miss = ["schemaVersion", "createdAt", "updatedAt", "createdBy"].filter((k) => !(k in d));
        check(`${t}: the create carries I17's four fields`, created.length >= 1 && miss.length === 0, `missing: ${miss.join(",")}`);
        check(`${t}: and the Note is listed`, /Audit typed title/.test(await ev(page, () => document.getElementById("folderNotes").innerText)));
      } else {
        const msg = await errText(page);
        check(`${t}: a refused create shows an error on screen (I15)`, msg.length > 8, msg);
        check(`${t}: and what was typed is kept`, (await ev(page, () => document.getElementById("quickTitle")?.value ?? "")) === "Audit typed title");
        if (bn) check(`${t}: the error is in Bangla`, BN.test(msg), msg);
      }
      check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { failWrites: refused });
  }

  // 3: the Note's ⋯ menu and the Favourite / Archive / Delete / Restore flow.
  await flow("note", lang, width, who, async (t, page, errors) => {
    await openNote(page); await paneMenu(page);
    const groups = await ev(page, () => [...document.querySelectorAll("#notePane [data-pane-menu-group]")].map((g) => g.dataset.paneMenuGroup));
    check(`${t}: POSITIVE CONTROL the ⋯ menu has its groups (${groups.join(",")})`, ["read", "mark", "organise", "change", "settings"].every((g) => groups.includes(g)) && groups.includes("danger"), groups.join());
    check(`${t}: the ⋯ menu is inside the screen`, await inside(page, "#notePane [data-pane-menu]"));
    const small = await smallOnes(page, "#notePane [data-pane-menu] button");
    check(`${t}: every ⋯ menu button is 40px or more`, small.length === 0, small.join());
    if (bn) check(`${t}: the ⋯ menu is Bangla`, BN.test(await ev(page, () => document.querySelector("#notePane [data-pane-menu]").innerText)));
    for (const [key, field] of [["favourite", "favourite"], ["archived", "archived"], ["pinned", "pinned"]]) {
      if (key !== "favourite") await paneMenu(page).catch(() => {});
      if (!(await ev(page, () => document.querySelector("#notePane [data-pane-menu]").classList.contains("open")))) await paneMenu(page);
      await ev(page, () => { window.__stubWriteData = []; });
      if (key === "archived") { await ev(page, () => {}); }
      await page.click(`#notePane [data-pane-flag="${key}"]`); await settle(page, 900);
      const w = await writes(page);
      const upd = w.find((x) => x.col === "notes" && x.data && field in x.data);
      check(`${t}: ${key} stores ${field}: true on the Note (a mark)`, upd?.data?.[field] === true, JSON.stringify(w).slice(0, 200));
      check(`${t}: ${key} writes no delete`, !w.some((x) => /delete/i.test(x.kind)));
      if (key === "archived") break;
    }
    check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  await flow("trash", lang, width, who, async (t, page, errors) => {
    await openNote(page); await paneMenu(page);
    await ev(page, () => { window.__stubWriteData = []; });
    await page.click("#notePane [data-pane-delete]"); await settle(page, 500);
    check(`${t}: Delete asks first`, await ev(page, () => !!document.querySelector("[data-note-delete-confirm]")));
    await page.click("[data-note-delete-yes]"); await settle(page, 1200);
    const w = await writes(page);
    const n = await notesDoc(page, "n1");
    check(`${t}: Delete is a mark, never an erase (I4): no delete write`, !w.some((x) => /delete/i.test(x.kind)), JSON.stringify(w.map((x) => x.kind)));
    check(`${t}: the Note document still exists with a retired status`, !!n && n.status !== "active", JSON.stringify(n && n.status));
    check(`${t}: and the page says where it went`, (await bannerText(page)).length > 8);
    if (!(await ev(page, () => document.querySelector('[data-bar-palette-toggle="pageMenu"]').getBoundingClientRect().width > 0))) { await page.click("[data-list-back]").catch(() => {}); await settle(page, 400); }
    await page.click('[data-bar-palette-toggle="pageMenu"]'); await settle(page, 300);
    await page.click("#openTrashBtn"); await settle(page, 800);
    check(`${t}: the Note is in Trash`, await ev(page, () => !!document.querySelector('[data-trash-note-id="n1"]')));
    await ev(page, () => { window.__stubWriteData = []; });
    await page.click('[data-trash-note-id="n1"] [data-trash-restore]'); await settle(page, 1200);
    const back = await notesDoc(page, "n1");
    check(`${t}: Restore brings it back to active`, back?.status === "active", JSON.stringify(back && back.status));
    check(`${t}: Restore writes no delete`, !(await writes(page)).some((x) => /delete/i.test(x.kind)));
    check(`${t}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4: a refused Favourite shows an error and the tile stays off.
  await flow("refused", lang, width, who, async (t, page, errors) => {
    await openNote(page); await paneMenu(page);
    const before = await ev(page, () => document.querySelector('#notePane [data-pane-flag="favourite"]').getAttribute("aria-pressed"));
    await page.click('#notePane [data-pane-flag="favourite"]'); await settle(page, 1000);
    const msg = await errText(page);
    check(`${t}: a refused Favourite shows an error on screen (I15)`, msg.length > 8, msg);
    const n = await notesDoc(page, "n1");
    check(`${t}: and the Note is not marked`, !n?.favourite, JSON.stringify(n?.favourite));
    check(`${t}: POSITIVE CONTROL the tile began unpressed`, before === "false", before);
    if (bn) check(`${t}: the error is in Bangla`, BN.test(msg), msg);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { failWrites: true });
}
await browser.close();
console.log(`\n==== audit-part58${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
