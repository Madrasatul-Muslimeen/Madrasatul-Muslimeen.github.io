// Note-pane round 2 (the Owner, 5 Oct 2026: "add all functions of the notepane of Siyagah in the notepane"), items 14-20
// of docs/reference/2026-10-05-siyagah-note-pane-port-list.md: ⋯ Rename, ⋯ Make a copy, right-click / long-press the
// title to edit, 📋 Copy section from a heading, tag chips that list the tag's Notes, Delete asks first, Esc ends editing.
// What was WRITTEN is read from the stub's own data; the clipboard is read back. en and bn, 1280 and 390.
// Run from the repository root with `node serve.js` running.
//   --mutate=esc-noop     Esc while editing does nothing special      -> the Esc checks fail
//   --mutate=no-confirm   Delete goes straight to Trash again          -> the "asks first" checks fail
//   --mutate=copy-nofile  the copy is not filed in the folders          -> the copy's filing check fails
//   --mutate=chip-dead    a tag chip does nothing when tapped           -> the tag list checks fail
//   --mutate=no-swallow   the tap that ends a long press also folds     -> the long-press fold check fails
//   --mutate=rename-body  Rename saves an empty text                    -> the "text unchanged" check fails
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
const SHOTS = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const route = async (glob, file, type, f) => { const body = f(fs.readFileSync(file, "utf8")); await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: type, body })); };
  const js = "text/javascript; charset=utf-8", html = "text/html; charset=utf-8";
  if (MUTATE === "esc-noop") await route("**/js/note-window.js", "app/js/note-window.js", js, (s) => swap(s, 'ev.key === "Escape" && v.ed && ev.target.closest?.', "false && ev.target.closest?."));
  else if (MUTATE === "no-confirm") await route("**/journey-map.html*", "app/journey-map.html", html, (s) => swap(s, "      openSiyagahDialog({\n        title: t('Delete \"{title}\"?'", "      retireNoteFromPane(v, staleNote); if (0) openSiyagahDialog({\n        title: t('Delete \"{title}\"?'"));
  else if (MUTATE === "copy-nofile") await route("**/journey-map.html*", "app/journey-map.html", html, (s) => swap(s, "for (const folderId of folderIds) {", "for (const folderId of []) {"));
  else if (MUTATE === "chip-dead") await route("**/js/note-window.js", "app/js/note-window.js", js, (s) => swap(s, "if (tagChip && host.tagging) { openTagNotes", "if (false) { openTagNotes"));
  else if (MUTATE === "no-swallow") await route("**/js/note-window.js", "app/js/note-window.js", js, (s) => swap(s, "v.swallowClickUntil = Date.now() + 800;", ";"));
  else if (MUTATE === "rename-body") await route("**/js/note-window.js", "app/js/note-window.js", js, (s) => swap(s, 'const bodyHtml = live.bodyHtml ?? "";', 'const bodyHtml = "";'));
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const BODY = "<p>Opening line</p><h2>Alpha</h2><p>Alpha body one.</p><h3>Alpha inner</h3><p>Inner text.</p><h2>Beta</h2><p>Beta body text.</p>";
const BODY2 = "<p>Second body <b>bold</b>.</p>";
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha folder", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  DATA.noteFolders.push(Object.assign({ _id: "t1__fB", folderId: "fB", name: "Beta folder", parentFolderId: null, semanticRole: "user", order: 1, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  function note(id, title, body, rev, when) {
    DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: rev, status: "active", createdAt: ts(when), updatedAt: ts(when) }, own));
    DATA.noteRevisions.push(Object.assign({ _id: "t1__" + rev, revisionId: rev, noteId: id, previousRevisionId: null, title: title, bodyHtml: body, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date(when) }, own));
  }
  note("n1", "Editor Note", ${JSON.stringify(BODY)}, "r1", "2024-09-03T16:45:00Z");
  note("n2", "Second Note", ${JSON.stringify(BODY2)}, "r2", "2024-09-02T16:45:00Z");
  note("n3", "Third Note", "<p>Third.</p>", "r3", "2024-09-01T16:45:00Z");
  DATA.notes[1].pinned = true;
  DATA.notePlacements.push(Object.assign({ _id: "t1__p1", placementId: "p1", noteId: "n1", folderId: "fA", order: 0, status: "active" }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p2", placementId: "p2", noteId: "n2", folderId: "fA", order: 1, status: "active" }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p2b", placementId: "p2b", noteId: "n2", folderId: "fB", order: 0, status: "active" }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p3", placementId: "p3", noteId: "n3", folderId: "fA", order: 2, status: "active" }, own));
  DATA.noteTags.push(Object.assign({ _id: "t1__g1", tagId: "g1", name: "Prayer", color: "#2E8B57", status: "active" }, own));
  DATA.noteTagLinks.push(Object.assign({ _id: "t1__l1", linkId: "l1", tagId: "g1", noteId: "n1", status: "active" }, own));
  DATA.noteTagLinks.push(Object.assign({ _id: "t1__l2", linkId: "l2", tagId: "g1", noteId: "n2", status: "active" }, own));
})();`;
const T = {
  en: { copied: "Section copied.", copySuffix: " (copy)" },
  bn: { copied: "অংশটি কপি হয়েছে।", copySuffix: " (কপি)" },
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"].filter((l) => !ONLY || l === ONLY)) for (const width of [1280, 390]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await routeMutation(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  const { page: P, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await P.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await P.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await P.waitForSelector("#folderNotes [data-note-id='n1'] [data-note-open]", { state: "visible" });
  await P.click("#folderNotes [data-note-id='n1'] [data-note-open]");
  await P.waitForSelector("#notePane [data-pane-title]", { state: "visible" });
  const S = "#notePane", q = (x) => `${S} ${x}`;
  const data = (col) => P.evaluate((c) => JSON.parse(JSON.stringify(window.__DATA[c] || [])), col);
  const lastRev = async (id) => { const r = (await data("noteRevisions")).filter((x) => x.noteId === id); return r[r.length - 1]; };
  const menu = async (scope, item) => { await P.click(`${scope} [data-pane-menu-btn]`); await P.click(`${scope} [data-pane-menu] ${item}`); };
  const center = (sel) => P.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + Math.min(40, r.width / 2), y: r.top + r.height / 2 }; }, sel);
  const editing = (scope) => P.evaluate((s) => !!document.querySelector(s + " [data-edit-body]"), scope);
  const shot = async (name) => { if (SHOTS) await P.screenshot({ path: `${SHOTS}/${tag.replace("/", "-")}-${name}.png` }); };

  // ---- 14. ⋯ Rename ----
  await menu(S, "[data-pane-rename]");
  await P.waitForSelector("[data-note-dialog='rename'] [data-rename-input]", { state: "visible" });
  check(`${tag}: Rename opens with the current title`, (await P.inputValue("[data-rename-input]")) === "Editor Note");
  await shot("rename");
  await P.fill("[data-rename-input]", "Renamed Note");
  await P.click("[data-rename-save]");
  await P.waitForFunction(() => !document.querySelector("[data-note-dialog='rename']"), null, { timeout: 8000 }).catch(() => {});
  let rev = await lastRev("n1");
  check(`${tag}: Rename writes a revision with the new title`, rev?.title === "Renamed Note" && rev?.revisionId !== "r1", JSON.stringify({ t: rev?.title, id: rev?.revisionId }));
  check(`${tag}: Rename leaves the text unchanged`, rev?.bodyHtml === BODY, rev?.bodyHtml);
  check(`${tag}: the pane shows the new title`, (await P.textContent(q("[data-pane-title]"))) === "Renamed Note");
  check(`${tag}: the editor did not open`, !(await editing(S)));

  // ---- 16 + 20. Right-click the title to edit; Esc ends editing ----
  let p = await center(q("[data-pane-title]"));
  await P.mouse.click(p.x, p.y, { button: "right" });
  await P.waitForTimeout(150);
  check(`${tag}: right-click on the title starts editing`, await editing(S));
  check(`${tag}: ...with the cursor in the title box`, await P.evaluate((s) => document.activeElement === document.querySelector(s + " [data-edit-title]"), S));
  await P.click(q("[data-edit-body]"));
  await P.keyboard.press("Control+End");
  await P.keyboard.type(" Esc saved");
  await P.keyboard.press("Escape");
  await P.waitForFunction((s) => !document.querySelector(s + " [data-edit-body]"), S, { timeout: 8000 }).catch(() => {});
  check(`${tag}: Esc in the text ends editing`, !(await editing(S)));
  rev = await lastRev("n1");
  check(`${tag}: Esc saves what was typed, like Done`, /Esc saved/.test(rev?.bodyHtml || ""), rev?.bodyHtml);
  check(`${tag}: the read view shows it`, /Esc saved/.test(await P.textContent(q("[data-pane-body]"))));

  // ---- 16 by long press (touch) ----
  p = await center(q("[data-pane-title]"));
  await P.evaluate(([s, x, y]) => { document.querySelector(s + " [data-pane-title]").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", clientX: x, clientY: y })); }, [S, p.x, p.y]);
  await P.waitForTimeout(800);
  check(`${tag}: a long press on the title starts editing`, await editing(S));
  await P.evaluate(([s]) => document.querySelector(s + " [data-pane-title]")?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })), [S]);
  await P.focus(q("[data-edit-title]"));
  await P.keyboard.press("Escape");
  await P.waitForFunction((s) => !document.querySelector(s + " [data-edit-body]"), S, { timeout: 8000 }).catch(() => {});
  check(`${tag}: Esc in the title box ends editing too`, !(await editing(S)));

  // ---- 17. 📋 Copy section ----
  const alphaH = q('.note-sec[data-heading-text="Alpha"] > .note-sec-h');
  p = await center(alphaH);
  await P.mouse.click(p.x, p.y, { button: "right" });
  await P.waitForSelector("[data-sec-menu]", { state: "visible", timeout: 3000 }).catch(() => {});
  check(`${tag}: right-click on a heading opens the Copy section menu`, await P.isVisible("[data-sec-menu]"));
  check(`${tag}: the menu sits inside the screen`, await P.evaluate(() => { const r = document.querySelector("[data-sec-menu]")?.getBoundingClientRect(); return !!r && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
  check(`${tag}: the heading did not fold`, !(await P.evaluate((s) => document.querySelector(s).closest(".note-sec").classList.contains("collapsed"), alphaH)));
  await shot("section-menu");
  await P.click('[data-sec-copy="with"]');
  await P.waitForTimeout(300);
  let clip = await P.evaluate(() => navigator.clipboard.readText());
  check(`${tag}: Copy section with heading: the heading, its text and the sub-heading`, /^Alpha\s/.test(clip) && /Alpha body one\./.test(clip) && /Alpha inner/.test(clip) && /Inner text\./.test(clip), JSON.stringify(clip));
  check(`${tag}: ...and nothing of the next section`, !/Beta/.test(clip) && !/Opening line/.test(clip), JSON.stringify(clip));
  const clipHtml = await P.evaluate(async () => { const items = await navigator.clipboard.read(); for (const it of items) if (it.types.includes("text/html")) return (await it.getType("text/html")).text(); return ""; });
  check(`${tag}: the copied HTML keeps the headings`, /<h2>Alpha<\/h2>/.test(clipHtml) && /<h3>Alpha inner<\/h3>/.test(clipHtml), clipHtml.slice(0, 200));
  check(`${tag}: the page says it was copied`, (await P.evaluate(() => document.body.innerText)).includes(T[lang].copied));
  check(`${tag}: the menu closed`, !(await P.$("[data-sec-menu]")));
  // without the heading, by long press -- and the tap that ends the press must not fold the section
  p = await center(alphaH);
  await P.evaluate(([s, x, y]) => document.querySelector(s).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", clientX: x, clientY: y })), [alphaH, p.x, p.y]);
  await P.waitForTimeout(800);
  await P.evaluate((s) => { const el = document.querySelector(s + " [data-sec-toggle]"); el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })); el.click(); }, alphaH);
  check(`${tag}: a long press on a heading opens the menu`, await P.isVisible("[data-sec-menu]"));
  check(`${tag}: the tap that ends the long press does not fold the section`, !(await P.evaluate((s) => document.querySelector(s).closest(".note-sec").classList.contains("collapsed"), alphaH)));
  await P.click('[data-sec-copy="without"]');
  await P.waitForTimeout(300);
  clip = await P.evaluate(() => navigator.clipboard.readText());
  check(`${tag}: Copy section (without heading) starts at the text`, /^Alpha body one\./.test(clip) && /Inner text\./.test(clip), JSON.stringify(clip));
  // an ordinary tap on a heading still folds it
  await P.click(alphaH + " [data-sec-toggle]");
  check(`${tag}: an ordinary tap on a heading still folds it`, await P.evaluate((s) => document.querySelector(s).closest(".note-sec").classList.contains("collapsed"), alphaH));
  await P.click(alphaH + " [data-sec-toggle]");

  // ---- 18. Tag chips list the tag's Notes ----
  const chip = q("[data-pane-chips] [data-tag-chip='g1']");
  check(`${tag}: the tag chip is a button`, await P.evaluate((s) => document.querySelector(s)?.tagName === "BUTTON", chip));
  check(`${tag}: the chip is at least 36px tall`, await P.evaluate((s) => document.querySelector(s).getBoundingClientRect().height >= 36, chip));
  await P.click(chip);
  await P.waitForSelector("[data-note-dialog='tag-notes']", { state: "visible", timeout: 3000 }).catch(() => {});
  const listed = await P.$$eval("[data-tag-notes-open]", (els) => els.map((e) => e.dataset.tagNotesOpen));
  check(`${tag}: tapping it lists every Note with that tag, and only those`, JSON.stringify(listed) === JSON.stringify(["n1", "n2"]), JSON.stringify(listed));
  await shot("tag-notes");
  await P.click("[data-tag-notes-open='n2']");
  await P.waitForFunction((s) => document.querySelector(s + " [data-pane-title]")?.textContent === "Second Note", S, { timeout: 5000 }).catch(() => {});
  check(`${tag}: choosing one shows it in the pane`, (await P.textContent(q("[data-pane-title]"))) === "Second Note");
  check(`${tag}: ‹ › now walk the tag's Notes`, await P.evaluate((s) => !document.querySelector(s + " [data-pane-bar] > [data-pane-prev]").disabled && document.querySelector(s + " [data-pane-bar] > [data-pane-next]").disabled, S));

  // ---- 15. ⋯ Make a copy ----
  const notesBefore = (await data("notes")).length;
  await menu(S, "[data-pane-duplicate]");
  await P.waitForFunction((n) => window.__DATA.notes.length > n, notesBefore, { timeout: 8000 }).catch(() => {});
  const notes = await data("notes");
  const copy = notes.find((n) => !["n1", "n2", "n3"].includes(n.noteId));
  check(`${tag}: Make a copy writes a new Note`, notes.length === notesBefore + 1 && !!copy);
  check(`${tag}: ...titled "(copy)", with the same text`, copy?.title === `Second Note${T[lang].copySuffix}` && copy?.bodyHtml === BODY2, JSON.stringify({ t: copy?.title, b: copy?.bodyHtml }));
  check(`${tag}: ...not pinned (a copy starts fresh)`, copy?.pinned !== true);
  await P.waitForTimeout(400);
  const places = (await data("notePlacements")).filter((x) => x.noteId === copy?.noteId && x.status === "active").map((x) => x.folderId).sort();
  check(`${tag}: ...filed in both folders the original is in`, JSON.stringify(places) === JSON.stringify(["fA", "fB"]), JSON.stringify(places));
  const tl = (await data("noteTagLinks")).filter((x) => x.noteId === copy?.noteId && x.status === "active").map((x) => x.tagId);
  check(`${tag}: ...carrying its tag`, JSON.stringify(tl) === JSON.stringify(["g1"]), JSON.stringify(tl));
  await P.waitForFunction(([s, t]) => document.querySelector(s + " [data-pane-title]")?.textContent === t, [S, copy?.title], { timeout: 5000 }).catch(() => {});
  check(`${tag}: the copy opens in the pane`, (await P.textContent(q("[data-pane-title]"))) === copy?.title);
  const orig = (await data("notes")).find((n) => n.noteId === "n2");
  check(`${tag}: the original is untouched`, orig.title === "Second Note" && orig.currentRevisionId === "r2" && orig.status === "active");

  // ---- 19. Delete asks first ----
  await menu(S, "[data-pane-delete]");
  await P.waitForSelector("[data-note-delete-confirm]", { state: "visible", timeout: 3000 }).catch(() => {});
  check(`${tag}: Delete asks "Are you sure?" first`, await P.isVisible("[data-note-delete-confirm]"));
  check(`${tag}: ...and nothing is written yet`, (await data("notes")).find((n) => n.noteId === copy?.noteId)?.status === "active");
  check(`${tag}: the confirm shows no Rules gate sentence`, !(await P.$("#siyagahDialog [data-sections-gate-note]")));
  await shot("delete-confirm");
  if (await P.$("[data-dialog-cancel]")) await P.click("[data-dialog-cancel]");
  check(`${tag}: Cancel keeps the Note`, (await data("notes")).find((n) => n.noteId === copy?.noteId)?.status === "active" && (await P.isVisible(q("[data-pane-title]"))));
  await menu(S, "[data-pane-delete]");
  await P.waitForSelector("[data-note-delete-yes]", { state: "visible", timeout: 3000 }).catch(() => {});
  if (await P.$("[data-note-delete-yes]")) await P.click("[data-note-delete-yes]");
  await P.waitForFunction((id) => window.__DATA.notes.find((n) => n.noteId === id)?.status === "retired", copy?.noteId, { timeout: 8000 }).catch(() => {});
  check(`${tag}: Delete then moves it to Trash`, (await data("notes")).find((n) => n.noteId === copy?.noteId)?.status === "retired");

  // ---- 20 in a window: Esc ends editing and leaves the window open; a second Esc closes it ----
  await P.click('.folder-row[data-folder-id="fA"] [data-folder-name]').catch(() => {});
  await P.waitForSelector("#folderNotes [data-note-id='n3'] [data-note-open]", { state: "visible" }).catch(() => {});
  await P.click("#folderNotes [data-note-id='n3'] [data-note-open]");
  await P.waitForFunction((s) => document.querySelector(s + " [data-pane-title]")?.textContent === "Third Note", S, { timeout: 5000 }).catch(() => {});
  await menu(S, "[data-pane-popout]");
  await P.waitForSelector(".note-win[data-note-id='n3'] [data-pane-title]", { state: "visible", timeout: 5000 }).catch(() => {});
  const W = ".note-win[data-note-id='n3']";
  p = await center(`${W} .nw-bar .nw-title`); // a window shows its title on its bar
  await P.mouse.click(p.x, p.y, { button: "right" });
  await P.waitForTimeout(150);
  check(`${tag}: right-click on a window's title starts editing`, await editing(W));
  await P.click(`${W} [data-edit-body]`);
  await P.keyboard.press("Escape");
  await P.waitForFunction((s) => !document.querySelector(s + " [data-edit-body]"), W, { timeout: 8000 }).catch(() => {});
  check(`${tag}: Esc in a window ends editing and keeps the window`, !(await editing(W)) && !!(await P.$(W)));
  await P.keyboard.press("Escape");
  await P.waitForTimeout(150);
  check(`${tag}: a second Esc closes the window (as before)`, !(await P.$(W)));

  check(`${tag}: no sideways scroll`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
