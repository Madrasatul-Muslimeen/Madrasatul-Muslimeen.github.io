// The Owner, 5 Oct 2026: "Yes, fix the small ones" -- the Siyagah plan items an
// audit found partly built:
//   * S10/S12 "change folders and tags while editing, kept until saved": folder
//     ticks were held until Done, but TAG ticks saved at once mid-edit. Now held
//     too, in both the 📎 sheet and ⋯ → 🏷 Tags…, and written on Done.
//   * S13 "the Details line with the version": windows only. Now the inline
//     pane shows "Version n of m" too.
//   * S8/S11 "✚ New note": the pane's bar only. Now a pop-up window has it,
//     and its new Note opens in a window of its own.
// en/bn at 390 and 1280. MUTATE=tags-at-once | no-pane-version | no-window-new
// runs a deliberately broken build (each fails its own checks).
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, cur, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>Body of " + id + ".</p>", currentRevisionId: cur, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  function R(id, note, day, prev) { DATA.noteRevisions.push(Object.assign({ _id: "t1__" + id, revisionId: id, noteId: note, previousRevisionId: prev, title: "v" + day, bodyHtml: "<p>Body of " + note + ".</p>", revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2026-09-0" + day + "T0" + day + ":15:00Z") }, own)); }
  F("fSys", "Personal Journey Map", null, 0);
  F("fA", "Alpha", null, 0);
  N("n1", "Note One", "r1b", 1); N("n2", "Note Two", "r2a", 2);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
  R("r1a", "n1", 1, null); R("r1b", "n1", 2, "r1a"); R("r2a", "n2", 3, null);
  DATA.noteTags.push(Object.assign({ _id: "t1__g1", tagId: "g1", name: "Prayer", color: "#2E8B57", status: "active" }, own));
})();`;
const browser = await chromium.launch();
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const leafTitle = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-open]`;
const leafToggle = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-toggle]`;
const leafWindowBtn = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-window]`;
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, data: w.data })));
const tagLinkWrites = async (page, n) => (await writes(page)).slice(n).filter((w) => w.col === "noteTagLinks");
const chips = (page) => page.$$eval("#notePane [data-tag-chip]", (els) => els.map((e) => e.textContent.trim()));
async function openMenu(page) { await page.click("#notePane [data-pane-menu-btn]"); await page.waitForSelector("#notePane [data-pane-menu]", { state: "visible" }); }
async function toggleEdit(page) {
  if (await vis(page, "#notePane [data-pane-bar] > [data-pane-edit-toggle]")) await page.click("#notePane [data-pane-bar] > [data-pane-edit-toggle]");
  else { await openMenu(page); await page.click("#notePane [data-pane-menu] [data-pane-edit-toggle]"); }
}
async function openTagPicker(page) { await openMenu(page); await page.click("#notePane [data-pane-menu] [data-pane-tags]"); await page.waitForSelector(".tag-picker"); }
async function closeTagPicker(page) { await page.click("[data-tag-close]"); await page.waitForFunction(() => !document.querySelector(".tag-picker")); }

for (const lang of ["en", "bn"]) {
  for (const width of [390, 1280]) {
    const tag = `${lang} ${width}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    if (MUTATE) {
      await ctx.route("**/js/note-window.js", async (route) => {
        const res = await route.fetch(); let body = await res.text(); const before = body;
        if (MUTATE === "tags-at-once") body = body.replace("if (!isEditingNote(noteId)) return false;", "return false;");
        if (MUTATE === "no-pane-version") body = body.replace('const btn = (v.win ?? v.el)?.querySelector("[data-win-ver]");', 'const btn = v.win?.querySelector("[data-win-ver]");');
        if (MUTATE === "no-window-new") body = body.replace("newBtn.hidden = !(own && host.newNote);", 'newBtn.hidden = !(own && host.newNote && v.kind === "pane");');
        if (body === before) { console.log(`  (mutation ${MUTATE} did not apply)`); process.exit(2); }
        await route.fulfill({ response: res, body });
      });
    }
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
    const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
    await page.click(leafTitle("n1"));
    await page.waitForSelector("#notePane [data-pane-title]", { state: "visible" });

    // --- the version line, in the inline pane ---
    await page.waitForFunction(() => { const b = document.querySelector("#notePane [data-win-ver]"); return b && !b.hidden; }, null, { timeout: 6000 }).catch(() => {});
    const ver = await page.evaluate(() => { const b = document.querySelector("#notePane [data-win-ver]"); const r = b?.getBoundingClientRect(); return b && !b.hidden ? { text: b.textContent.trim(), h: r.height } : null; });
    check(`${tag}: the inline pane shows "Version 2 of 2" (it was in pop-up windows only)`, !!ver && (lang === "bn" ? /সংস্করণ ২ \/ ২/.test(ver.text) : /Version 2 of 2/.test(ver.text)), JSON.stringify(ver));
    check(`${tag}: ...as a real tap target (>=40px)`, !!ver && ver.h >= 39.5, JSON.stringify(ver));
    if (ver) await page.click("#notePane [data-win-ver]");
    await page.waitForSelector(".note-versions", { timeout: 4000 }).catch(() => {});
    const verOpen = await page.evaluate(() => !!document.querySelector(".note-versions"));
    check(`${tag}: ...and tapping it opens Versions`, verOpen);
    await page.evaluate(() => document.querySelector("[data-ver-close]")?.click());
    await page.waitForFunction(() => !document.querySelector(".note-versions"), null, { timeout: 4000 }).catch(() => {});
    check(`${tag}: ...and closes again (so the tag pickers below are the real ones)`, await page.evaluate(() => !document.querySelector(".note-versions")));

    // --- not editing: a tag tick saves at once (POSITIVE CONTROL) ---
    let n = (await writes(page)).length;
    await openTagPicker(page);
    check(`${tag}: POSITIVE CONTROL -- not editing, no "saved when you press Done" note`, !(await vis(page, "[data-tag-staged]")));
    await page.check('[data-tag-pick="g1"]'); await page.waitForTimeout(400);
    check(`${tag}: POSITIVE CONTROL -- not editing, ticking a tag saves at once`, (await tagLinkWrites(page, n)).length >= 1);
    await closeTagPicker(page);
    check(`${tag}: ...and its chip shows`, (await chips(page)).some((c) => /Prayer/.test(c)), JSON.stringify(await chips(page)));

    // --- editing: an untick is HELD until Done ---
    await toggleEdit(page);
    await page.waitForSelector("#notePane [data-edit-body]");
    n = (await writes(page)).length;
    await openTagPicker(page);
    const note = await page.evaluate(() => { const e = document.querySelector("[data-tag-staged]"); return e && !e.hidden ? e.textContent.trim() : ""; });
    check(`${tag}: while editing, the 🏷 picker says the change waits for Done, in ${lang === "bn" ? "Bangla" : "English"}`, lang === "bn" ? /সম্পন্ন/.test(note) : /saved when you press Done/.test(note), note);
    await page.uncheck('[data-tag-pick="g1"]'); await page.waitForTimeout(400);
    check(`${tag}: ...unticking writes nothing yet`, (await tagLinkWrites(page, n)).length === 0, JSON.stringify(await tagLinkWrites(page, n)));
    check(`${tag}: ...and the box stays unticked (held)`, await page.evaluate(() => !document.querySelector('[data-tag-pick="g1"]').checked));
    await closeTagPicker(page);
    // The 📎 sheet shows the held state too.
    const attach = await page.evaluate(() => !!document.querySelector("#notePane [data-pane-attach]"));
    if (attach) {
      await page.evaluate(() => document.querySelector("#notePane [data-pane-attach]").click());
      await page.waitForSelector("[data-at-pick]", { timeout: 4000 }).catch(() => {});
      const held = await page.evaluate(() => { const b = document.querySelector('[data-at-pick="g1"]'); const m = document.querySelector("[data-at-staged]"); return b ? { checked: b.checked, note: m && !m.hidden } : null; });
      check(`${tag}: the 📎 sheet shows the same held (unticked) state and the same note`, !!held && held.checked === false && held.note, JSON.stringify(held));
      await page.keyboard.press("Escape"); await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelector("[data-fp-close], .filing-picker [data-close], [data-fp-done]")?.click());
      await page.waitForTimeout(200);
    }
    n = (await writes(page)).length;
    await toggleEdit(page); // Done
    await page.waitForFunction(() => !document.querySelector("#notePane [data-edit-body]"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
    const done = await tagLinkWrites(page, n);
    check(`${tag}: Done writes the held untick`, done.length >= 1 && done.some((w) => JSON.stringify(w.data).includes("retired")), JSON.stringify(done).slice(0, 300));
    check(`${tag}: ...and the chip is gone`, !(await chips(page)).some((c) => /Prayer/.test(c)), JSON.stringify(await chips(page)));

    // --- ✚ New note in a pop-up window ---
    if (width >= 640) {
      await page.evaluate((s) => document.querySelector(s).click(), leafToggle("n2"));
      await page.evaluate((s) => document.querySelector(s).click(), leafWindowBtn("n2"));
      await page.waitForSelector('.note-win[data-note-id="n2"]');
      const newBtn = '.note-win[data-note-id="n2"] [data-pane-new]';
      const nb = await page.evaluate((s) => { const b = document.querySelector(s); if (!b) return null; const r = b.getBoundingClientRect(); return { shown: !b.hidden && r.width > 0, label: b.getAttribute("aria-label"), h: r.height }; }, newBtn);
      check(`${tag}: a pop-up window has ✚ New note (it was the pane's only)`, !!nb && nb.shown && (lang === "bn" ? /[ঀ-৿]/.test(nb.label) : nb.label === "New note"), JSON.stringify(nb));
      const wins0 = await page.evaluate(() => document.querySelectorAll(".note-win").length);
      n = (await writes(page)).length;
      if (nb?.shown) await page.click(newBtn);
      await page.waitForFunction((w0) => document.querySelectorAll(".note-win").length > w0, wins0, { timeout: 8000 }).catch(() => {});
      const ws = (await writes(page)).slice(n);
      const winsNow = await page.evaluate(() => document.querySelectorAll(".note-win").length);
      check(`${tag}: ...pressing it makes a new Note in the window's folder (Alpha) and opens it in a window of its own`,
        ws.some((w) => w.col === "notes") && ws.some((w) => w.col === "notePlacements" && JSON.stringify(w.data).includes('"fA"')) && winsNow === wins0 + 1, JSON.stringify({ cols: ws.map((w) => w.col), winsNow, wins0 }));
    }
    check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (MUTATE=${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
