// Issue #789: the Bookmarks page's "+ New bookmark" form saves through bookmark-assign.js's
// saveBookmarkForAssignees (v10.33), like the four "Bookmark this" dialogs. Before, its own loop handed the
// selected person's folder ID to a single child, whose document has no such folder -> Unfiled.
// Proved here (390 and 1280, en and bn): a child-only save writes the child's own document, tagged for the
// child ("For" follows the single tick); an Owner's folder is filed by NAME in the child's document (created
// there when missing, reused when present); a "Saved for ..." notice names who it was saved for; two ticks write
// one document each with no folder; the Owner alone gets no notice.
// Run from the repository root with serve.js running. Mutations (--mutate=NAME) must each FAIL the checks named:
//   folderid   the Owner's folder id passed straight through   -> the folder-by-name checks
//   silent     no notice after the save                        -> the notice checks
//   nofollow   "For" does not follow a single tick             -> "For follows"
//   ownloop    the old per-person loop is back (id straight, no notice) -> folder-by-name + notice checks
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  folderid: ["app/js/bookmark-assign.js", "if (pid === selectedPersonId || !choice.folderName) {", "if (true) {"],
  silent: ["app/js/bookmark-popover.js", "if (!savedFor.some((pid) => pid !== selectedPersonId)) return null;", "return null;"],
  nofollow: ["app/bookmarks.html", "if (n === 1) {", "if (false) {"],
  ownloop: ["app/bookmarks.html", "const outcome = await saveBookmarkForAssignees(db, {", "const outcome = await (async (db, o) => { const ids = o.choice.assigneeIds.length ? o.choice.assigneeIds : [o.selectedPersonId]; const results = await Promise.all(ids.map(async (pid) => { const r = await saveBookmark(db, { tenantId: o.tenantId, personId: pid, ...o.bookmark, folderId: ids.length > 1 ? null : o.choice.folderId, personTagId: o.choice.personTagId, uid: o.uid }); return { personId: pid, ok: true, bookmark: r, folders: [] }; })); return { results, savedFor: [] }; })(db, {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const OWNER_FOLDER = `DATA.bookmarks[0].folders.push({ id: "fOwn", name: "Children - Bedtime", parentId: null, personTagId: null, removed: false, createdAt: "2026-01-01T00:00:00.000Z" });`;
const KID_DOC = (folders) => `DATA.bookmarks.push({ _id: "t1__p2", tenantId: "t1", personId: "p2", resume: {}, folders: ${JSON.stringify(folders)}, saved: [] });`;

async function open({ lang, w, seed }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: 844 }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/bookmarks.html");
  await page.waitForSelector("#newBookmarkBtn", { state: "visible", timeout: 15000 });
  await page.waitForFunction(() => document.getElementById("personSelect")?.value, null, { timeout: 15000 });
  return { ctx, page, errors };
}
const tick = (page, ids) => page.evaluate((list) => {
  for (const c of document.querySelectorAll("#nbAssignees input")) { if (c.checked !== list.includes(c.value)) c.click(); }
}, ids);
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
const lastSaved = (ws, docId) => { const w = ws.filter((x) => x.id === docId && x.data.saved).at(-1); return w ? w.data.saved.at(-1) : null; };
const notice = (page) => page.evaluate(() => {
  const el = document.getElementById("bmSavedNotice");
  if (!el || el.hidden) return null;
  const r = el.getBoundingClientRect();
  return { text: el.querySelector("[data-bm-saved-text]").textContent, inside: r.left >= 0 && r.right <= innerWidth + 0.5, sx: document.documentElement.scrollWidth - innerWidth };
});
async function openForm(page) {
  await page.evaluate(() => { window.__stubWriteData = []; const n = document.getElementById("bmSavedNotice"); if (n) n.hidden = true; });
  await page.click("#newBookmarkBtn");
  await page.waitForFunction(() => document.getElementById("nbName")?.value, null, { timeout: 10000 });
}
async function create(page) { await page.click("#nbCreateBtn"); await page.waitForTimeout(900); }

for (const lang of ["en", "bn"]) {
  for (const w of [390, 1280]) {
    const tag = `[${lang} ${w}]`;
    const { ctx, page } = await open({ lang, w, seed: OWNER_FOLDER + KID_DOC([]) });
    // POSITIVE CONTROL: both people offered, the selected one ticked, the Owner's folder offered.
    await openForm(page);
    const ticks0 = await page.evaluate(() => [...document.querySelectorAll("#nbAssignees input")].map((c) => `${c.value}:${c.checked}`).join(","));
    check(`${tag} positive control: Assign to lists the selected person (ticked) and Maryam`, /p1:true/.test(ticks0) && /p2:false/.test(ticks0), ticks0);
    check(`${tag} positive control: the Owner's folder is offered, and no notice yet`, await page.evaluate(() => !![...document.querySelectorAll("#nbFolder option")].find((o) => o.value === "fOwn")) && (await notice(page)) === null);

    // One child only.
    await tick(page, ["p2"]);
    check(`${tag} child only: "For" follows the tick to Maryam`, (await page.evaluate(() => document.getElementById("nbPersonTag").value)) === "p2");
    await create(page);
    let ws = await writes(page);
    const kid = lastSaved(ws, "t1__p2");
    check(`${tag} child only: written to Maryam's own document, nothing to the Owner's`, !!kid && !ws.some((x) => x.id === "t1__p1" && x.data.saved), JSON.stringify(ws.map((x) => x.id)));
    check(`${tag} child only: Maryam's copy is tagged for Maryam`, kid?.personTagId === "p2", JSON.stringify(kid));
    let n = await notice(page);
    check(`${tag} child only: a notice says who it was saved for`, !!n && n.inside && n.sx <= 0 && (lang === "bn" ? n.text === "মারইয়াম-এর জন্য সংরক্ষিত হয়েছে" : n.text === "Saved for Maryam"), JSON.stringify(n));

    // One child + the Owner's folder (Maryam has none of that name).
    await openForm(page);
    await tick(page, ["p2"]);
    await page.selectOption("#nbFolder", "fOwn");
    await create(page);
    ws = await writes(page);
    const made = ws.filter((x) => x.id === "t1__p2" && x.data.folders).flatMap((x) => x.data.folders).find((f) => f.name === "Children - Bedtime");
    const filed = lastSaved(ws, "t1__p2");
    check(`${tag} child + Owner's folder: a folder of the same NAME is created in Maryam's document`, !!made && made.id !== "fOwn", JSON.stringify(made));
    check(`${tag} child + Owner's folder: Maryam's copy is filed in it, never under the Owner's folder id`, !!filed && !!made && filed.folderId === made.id && filed.folderId !== "fOwn", JSON.stringify(filed));

    // Two ticks: one write each, no folder.
    await openForm(page);
    await tick(page, ["p1", "p2"]);
    await create(page);
    ws = await writes(page);
    const a = lastSaved(ws, "t1__p1"), b = lastSaved(ws, "t1__p2");
    check(`${tag} both: one write to each person's own document, in no folder`, !!a && !!b && a.folderId == null && b.folderId == null, JSON.stringify(ws.map((x) => x.id)));
    n = await notice(page);
    check(`${tag} both: the notice names both`, !!n && (lang === "bn" ? n.text === "আহসান ও মারইয়াম-এর জন্য সংরক্ষিত হয়েছে" : n.text === "Saved for Ahsan and Maryam"), JSON.stringify(n));

    // Owner alone: saved, no notice.
    await openForm(page);
    await tick(page, ["p1"]);
    await create(page);
    check(`${tag} Owner alone: saved to the Owner's document, and no notice`, !!lastSaved(await writes(page), "t1__p1") && (await notice(page)) === null);
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
